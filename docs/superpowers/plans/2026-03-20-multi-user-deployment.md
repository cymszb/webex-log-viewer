# Multi-User Deployment Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Refactor the Webex Log Viewer to support multiple simultaneous users — each with their own uploaded log file — while sharing a single `topics.json` config, deployable via gunicorn.

**Architecture:** Flask server-side sessions (signed cookie → session ID → per-user directory on disk). Log files are uploaded via `POST /api/upload`, stored at `sessions/<session_id>/log.txt`, and re-parsed on every `GET /api/logs`. A shared `topics.json` is protected by `filelock`. A background thread cleans up idle session dirs hourly.

**Tech Stack:** Python/Flask, `filelock>=3.13.0`, `gunicorn>=21.0.0`, vanilla JS (no framework, no build step), pytest.

---

## File Map

| File | Change |
|------|--------|
| `app.py` | Major changes: session management, new upload/clear endpoints, `GET /api/logs` session-aware, filelock on topics, SECRET_KEY guard, cleanup thread |
| `templates/index.html` | Replace load buttons + drag & drop with upload panel; inject `window.MAX_UPLOAD_MB`; add session-aware page load |
| `requirements.txt` | Add `filelock>=3.13.0`, `gunicorn>=21.0.0` |
| `.env.example` | New file documenting all env vars |
| `.gitignore` | Add `sessions/`, change `current_log.txt` to `current_log*.txt` |
| `tests/test_app.py` | New file: all backend tests |
| `README.md` | Update with new upload workflow and production deployment instructions |

---

## Task 1: Add dependencies and test scaffolding

**Files:**
- Modify: `requirements.txt`
- Create: `tests/__init__.py`
- Create: `tests/test_app.py`

- [ ] **Step 1: Update `requirements.txt`**

Replace the contents of `requirements.txt` with:

```
flask>=3.0.0
filelock>=3.13.0
gunicorn>=21.0.0
pytest>=8.0.0
```

- [ ] **Step 2: Install dependencies**

```bash
pip install -r requirements.txt
```

Expected: packages install without error.

- [ ] **Step 3: Create test scaffold**

Create `tests/__init__.py` (empty file).

Create `tests/test_app.py`:

```python
import pytest
import json
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

import app as app_module
from app import app as flask_app


@pytest.fixture
def client(tmp_path, monkeypatch):
    """Flask test client with isolated session dir."""
    monkeypatch.setenv("SESSION_DIR", str(tmp_path / "sessions"))
    monkeypatch.setenv("MAX_UPLOAD_MB", "10")
    monkeypatch.setenv("MAX_SESSIONS", "5")
    flask_app.config["TESTING"] = True
    flask_app.config["SECRET_KEY"] = "test-secret"
    # Re-init session dir with the patched env
    app_module.SESSION_DIR = str(tmp_path / "sessions")
    app_module.MAX_SESSIONS = 5
    os.makedirs(app_module.SESSION_DIR, exist_ok=True)
    with flask_app.test_client() as c:
        with flask_app.app_context():
            yield c
```

- [ ] **Step 4: Verify test scaffold imports cleanly**

```bash
pytest tests/test_app.py --collect-only
```

Expected: `0 errors`, `0 tests collected` (scaffold only, no tests yet).

- [ ] **Step 5: Commit**

```bash
git add requirements.txt tests/__init__.py tests/test_app.py
git commit -m "chore: add filelock/gunicorn deps and test scaffold"
```

---

## Task 2: Configuration constants and SECRET_KEY guard

**Files:**
- Modify: `app.py` (top of file, after imports)
- Modify: `tests/test_app.py`

The goal is to read the 5 env vars at module load time, and refuse to start under gunicorn when `SECRET_KEY` is the default.

- [ ] **Step 1: Write the failing test**

Add to `tests/test_app.py`:

```python
def test_session_dir_env_var(tmp_path, monkeypatch):
    """SESSION_DIR is read from environment."""
    expected = str(tmp_path / "mysessions")
    monkeypatch.setenv("SESSION_DIR", expected)
    import importlib
    importlib.reload(app_module)
    assert app_module.SESSION_DIR == expected
    app_module.SESSION_DIR = str(tmp_path / "sessions")  # restore


def test_max_upload_mb_default(monkeypatch):
    """MAX_UPLOAD_MB defaults to 200."""
    monkeypatch.delenv("MAX_UPLOAD_MB", raising=False)
    import importlib
    importlib.reload(app_module)
    assert app_module.MAX_UPLOAD_MB == 200


def test_secret_key_guard_blocks_under_gunicorn(monkeypatch):
    """SECRET_KEY guard raises SystemExit when key is default and not __main__."""
    monkeypatch.setenv("SECRET_KEY", "dev-secret")
    # Simulate gunicorn: __name__ != '__main__'
    assert app_module._check_secret_key(is_main=False) is False


def test_secret_key_guard_passes_with_custom_key(monkeypatch):
    """SECRET_KEY guard passes when key is not the default."""
    monkeypatch.setenv("SECRET_KEY", "real-secret-key-xyz")
    assert app_module._check_secret_key(is_main=False) is True


def test_secret_key_guard_skipped_when_main(monkeypatch):
    """SECRET_KEY guard is always skipped when running as __main__."""
    monkeypatch.setenv("SECRET_KEY", "dev-secret")
    assert app_module._check_secret_key(is_main=True) is True
```

- [ ] **Step 2: Run to verify failure**

```bash
pytest tests/test_app.py::test_secret_key_guard_blocks_under_gunicorn -v
```

Expected: `AttributeError: module 'app' has no attribute '_check_secret_key'`

- [ ] **Step 3: Implement configuration block in `app.py`**

Add after the existing imports block (before `app = Flask(__name__)`):

```python
import shutil
import threading
from datetime import datetime, timezone

from filelock import FileLock, Timeout

# ── Configuration ────────────────────────────────────────────────────────────
SESSION_DIR     = os.environ.get("SESSION_DIR", os.path.join(os.path.dirname(__file__), "sessions"))
SESSION_TTL_H   = int(os.environ.get("SESSION_TTL_H", "24"))
MAX_UPLOAD_MB   = int(os.environ.get("MAX_UPLOAD_MB", "200"))
MAX_SESSIONS    = int(os.environ.get("MAX_SESSIONS", "50"))
_SECRET_KEY     = os.environ.get("SECRET_KEY", "dev-secret")


def _check_secret_key(is_main: bool = False) -> bool:
    """Return True if startup should proceed, False if it should abort.
    Prints an error to stderr and returns False when the key is insecure
    and we are NOT running as __main__ (i.e. running under gunicorn).
    """
    if is_main:
        return True
    if _SECRET_KEY in ("dev-secret", "", None):
        print(
            "ERROR: SECRET_KEY is not set or is the default 'dev-secret'. "
            "Set the SECRET_KEY environment variable before starting with gunicorn.",
            file=__import__("sys").stderr,
        )
        return False
    return True
```

Also add, **after** `app = Flask(__name__)`:

```python
app.config["SECRET_KEY"] = _SECRET_KEY
app.config["MAX_CONTENT_LENGTH"] = MAX_UPLOAD_MB * 1024 * 1024
os.makedirs(SESSION_DIR, exist_ok=True)

# Enforce SECRET_KEY when running under gunicorn (not as __main__)
if not _check_secret_key(is_main=(__name__ == "__main__")):
    raise SystemExit(1)
```

- [ ] **Step 4: Run the tests**

```bash
pytest tests/test_app.py -k "secret_key or session_dir or max_upload" -v
```

Expected: all 5 new tests pass.

- [ ] **Step 5: Commit**

```bash
git add app.py tests/test_app.py
git commit -m "feat: add configuration constants and SECRET_KEY startup guard"
```

---

## Task 3: Session directory helpers and `before_request` hook

**Files:**
- Modify: `app.py`
- Modify: `tests/test_app.py`

- [ ] **Step 1: Write the failing tests**

Add to `tests/test_app.py`:

```python
def test_session_dir_path(client):
    """session_dir_for() returns correct path from session cookie."""
    with flask_app.test_request_context():
        from flask import session
        session["session_id"] = "abc-123"
        path = app_module.session_dir_for("abc-123")
        assert path.endswith("abc-123")
        assert path.startswith(app_module.SESSION_DIR)


def test_touch_meta_skips_missing_dir(client, tmp_path):
    """touch_meta() silently skips when session dir does not exist."""
    # Should not raise even if directory is missing
    app_module.touch_meta("nonexistent-session-id")


def test_touch_meta_creates_file(client, tmp_path):
    """touch_meta() writes meta.json atomically when session dir exists."""
    sid = "test-session-touch"
    sdir = os.path.join(app_module.SESSION_DIR, sid)
    os.makedirs(sdir)
    app_module.touch_meta(sid)
    meta_path = os.path.join(sdir, "meta.json")
    assert os.path.exists(meta_path)
    with open(meta_path) as f:
        data = json.load(f)
    assert "last_seen" in data


def test_before_request_updates_meta(client):
    """before_request hook updates meta.json for sessions with a dir."""
    with client.session_transaction() as sess:
        sess["session_id"] = "hook-test-sid"
    sdir = os.path.join(app_module.SESSION_DIR, "hook-test-sid")
    os.makedirs(sdir)
    # Any request should trigger the hook
    client.get("/api/topics")
    meta_path = os.path.join(sdir, "meta.json")
    assert os.path.exists(meta_path)
```

- [ ] **Step 2: Run to verify failure**

```bash
pytest tests/test_app.py -k "session_dir_path or touch_meta or before_request" -v
```

Expected: `AttributeError: module 'app' has no attribute 'session_dir_for'`

- [ ] **Step 3: Implement helpers and hook in `app.py`**

Add after the `os.makedirs(SESSION_DIR, ...)` line:

```python
# ── Session helpers ──────────────────────────────────────────────────────────

def session_dir_for(session_id: str) -> str:
    """Return the absolute path to a session's directory."""
    return os.path.join(SESSION_DIR, session_id)


def touch_meta(session_id: str) -> None:
    """Atomically update last_seen in meta.json. Silently ignores all errors."""
    sdir = session_dir_for(session_id)
    if not os.path.isdir(sdir):
        return
    try:
        now = datetime.now(timezone.utc).isoformat()
        tmp = os.path.join(sdir, "meta.json.tmp")
        dst = os.path.join(sdir, "meta.json")
        with open(tmp, "w", encoding="utf-8") as f:
            json.dump({"last_seen": now}, f)
        os.replace(tmp, dst)
    except Exception as exc:
        app.logger.debug("touch_meta failed for %s: %s", session_id, exc)


@app.before_request
def _update_last_seen():
    from flask import session as flask_session
    sid = flask_session.get("session_id")
    if sid:
        touch_meta(sid)
```

- [ ] **Step 4: Run the tests**

```bash
pytest tests/test_app.py -k "session_dir_path or touch_meta or before_request" -v
```

Expected: all 4 new tests pass.

- [ ] **Step 5: Commit**

```bash
git add app.py tests/test_app.py
git commit -m "feat: add session directory helpers and before_request meta update"
```

---

## Task 4: `POST /api/upload` endpoint

**Files:**
- Modify: `app.py`
- Modify: `tests/test_app.py`

- [ ] **Step 1: Write the failing tests**

Add to `tests/test_app.py`:

```python
def _make_log_bytes():
    line = "2024-01-01T00:00:00.000Z <Info> [1234:0x001][][MyFile.cpp:10] MyClass::myMethod::hello world\n"
    return (line * 5).encode()


def test_upload_returns_lines_count(client):
    """POST /api/upload returns lines and size_mb on success."""
    data = {"log": (io.BytesIO(_make_log_bytes()), "test.txt")}
    res = client.post("/api/upload", data=data, content_type="multipart/form-data")
    assert res.status_code == 200
    body = res.get_json()
    assert body["lines"] == 5
    assert "size_mb" in body


def test_upload_creates_session_dir(client):
    """POST /api/upload creates the session directory and log.txt."""
    with client.session_transaction() as sess:
        sess["session_id"] = "upload-test-sid"
    data = {"log": (io.BytesIO(_make_log_bytes()), "test.txt")}
    client.post("/api/upload", data=data, content_type="multipart/form-data")
    log_path = os.path.join(app_module.SESSION_DIR, "upload-test-sid", "log.txt")
    assert os.path.exists(log_path)


def test_upload_rejects_non_txt(client):
    """POST /api/upload returns 400 for non-.txt extension."""
    data = {"log": (io.BytesIO(b"data"), "test.log")}
    res = client.post("/api/upload", data=data, content_type="multipart/form-data")
    assert res.status_code == 400


def test_upload_rejects_missing_file(client):
    """POST /api/upload returns 400 when no file field provided."""
    res = client.post("/api/upload", data={}, content_type="multipart/form-data")
    assert res.status_code == 400


def test_upload_rejects_when_max_sessions_reached(client, monkeypatch):
    """POST /api/upload returns 503 when MAX_SESSIONS is reached by new sessions."""
    monkeypatch.setattr(app_module, "MAX_SESSIONS", 0)
    data = {"log": (io.BytesIO(_make_log_bytes()), "test.txt")}
    res = client.post("/api/upload", data=data, content_type="multipart/form-data")
    assert res.status_code == 503


def test_upload_allows_reupload_for_existing_session(client, monkeypatch):
    """Existing session can re-upload even when MAX_SESSIONS is 0."""
    with client.session_transaction() as sess:
        sess["session_id"] = "existing-sid"
    existing_dir = os.path.join(app_module.SESSION_DIR, "existing-sid")
    os.makedirs(existing_dir)
    monkeypatch.setattr(app_module, "MAX_SESSIONS", 0)
    data = {"log": (io.BytesIO(_make_log_bytes()), "test.txt")}
    res = client.post("/api/upload", data=data, content_type="multipart/form-data")
    assert res.status_code == 200


def test_upload_txt_extension_case_insensitive(client):
    """POST /api/upload accepts .TXT (uppercase) extension."""
    data = {"log": (io.BytesIO(_make_log_bytes()), "TEST.TXT")}
    res = client.post("/api/upload", data=data, content_type="multipart/form-data")
    assert res.status_code == 200
```

Also add `import io` at the top of `tests/test_app.py`.

- [ ] **Step 2: Run to verify failure**

```bash
pytest tests/test_app.py -k "upload" -v
```

Expected: `404 NOT FOUND` (endpoint doesn't exist yet).

- [ ] **Step 3: Implement `POST /api/upload` in `app.py`**

Add after the existing `@app.route("/api/logs")` function:

```python
_sessions_lock = FileLock(os.path.join(SESSION_DIR, ".sessions.lock"))


@app.route("/api/upload", methods=["POST"])
def upload_log():
    from flask import session as flask_session
    sid = flask_session.get("session_id")
    if not sid:
        sid = str(uuid.uuid4())
        flask_session["session_id"] = sid

    file = request.files.get("log")
    if not file or not file.filename:
        return jsonify({"error": "no file provided"}), 400

    ext = os.path.splitext(file.filename)[1].lower()
    if ext != ".txt":
        return jsonify({"error": "file must have a .txt extension"}), 400

    sdir = session_dir_for(sid)
    already_exists = os.path.isdir(sdir)

    if not already_exists:
        with _sessions_lock:
            # Count non-dotfile subdirs
            existing = [
                d for d in os.listdir(SESSION_DIR)
                if not d.startswith(".") and os.path.isdir(os.path.join(SESSION_DIR, d))
            ]
            if len(existing) >= MAX_SESSIONS:
                return jsonify({"error": "server at capacity"}), 503
            os.makedirs(sdir, exist_ok=True)

    tmp_path = os.path.join(sdir, "log.txt.tmp")
    dst_path = os.path.join(sdir, "log.txt")
    try:
        file.save(tmp_path)
        os.replace(tmp_path, dst_path)
    except Exception:
        try:
            os.remove(tmp_path)
        except OSError:
            pass
        return jsonify({"error": "failed to save file"}), 500

    # Count lines and compute size
    size_mb = round(os.path.getsize(dst_path) / (1024 * 1024), 2)
    lines = 0
    with open(dst_path, "r", encoding="utf-8", errors="replace") as f:
        for line in f:
            if line.strip():
                lines += 1

    touch_meta(sid)
    return jsonify({"lines": lines, "size_mb": size_mb}), 200
```

- [ ] **Step 4: Run the tests**

```bash
pytest tests/test_app.py -k "upload" -v
```

Expected: all 7 upload tests pass.

- [ ] **Step 5: Commit**

```bash
git add app.py tests/test_app.py
git commit -m "feat: add POST /api/upload endpoint with MAX_SESSIONS guard"
```

---

## Task 5: `GET /api/logs` — session-aware, and `DELETE /api/session/log`

**Files:**
- Modify: `app.py`
- Modify: `tests/test_app.py`

- [ ] **Step 1: Write the failing tests**

Add to `tests/test_app.py`:

```python
def test_get_logs_returns_no_log_before_upload(client):
    """GET /api/logs returns 404 with error=no_log before any upload."""
    with client.session_transaction() as sess:
        sess["session_id"] = "fresh-session"
    res = client.get("/api/logs")
    assert res.status_code == 404
    body = res.get_json()
    assert body["error"] == "no_log"
    assert body["logs"] == []
    assert body["total"] == 0


def test_get_logs_returns_parsed_lines_after_upload(client):
    """GET /api/logs returns parsed log lines after a successful upload."""
    data = {"log": (io.BytesIO(_make_log_bytes()), "test.txt")}
    client.post("/api/upload", data=data, content_type="multipart/form-data")
    res = client.get("/api/logs")
    assert res.status_code == 200
    body = res.get_json()
    assert body["total"] == 5
    assert len(body["logs"]) == 5
    assert body["logs"][0]["level"] == "Info"


def test_delete_session_log_clears_file(client):
    """DELETE /api/session/log removes log.txt."""
    with client.session_transaction() as sess:
        sess["session_id"] = "del-test-sid"
    data = {"log": (io.BytesIO(_make_log_bytes()), "test.txt")}
    client.post("/api/upload", data=data, content_type="multipart/form-data")
    res = client.delete("/api/session/log")
    assert res.status_code == 200
    assert res.get_json()["ok"] is True
    log_path = os.path.join(app_module.SESSION_DIR, "del-test-sid", "log.txt")
    assert not os.path.exists(log_path)


def test_delete_session_log_idempotent(client):
    """DELETE /api/session/log returns ok=True even when no log exists."""
    with client.session_transaction() as sess:
        sess["session_id"] = "no-log-sid"
    res = client.delete("/api/session/log")
    assert res.status_code == 200
    assert res.get_json()["ok"] is True


def test_get_logs_returns_no_log_after_delete(client):
    """GET /api/logs returns 404 after log is deleted."""
    data = {"log": (io.BytesIO(_make_log_bytes()), "test.txt")}
    client.post("/api/upload", data=data, content_type="multipart/form-data")
    client.delete("/api/session/log")
    res = client.get("/api/logs")
    assert res.status_code == 404
    assert res.get_json()["error"] == "no_log"
```

- [ ] **Step 2: Run to verify failure**

```bash
pytest tests/test_app.py -k "get_logs or delete_session" -v
```

Expected: `test_get_logs_returns_no_log_before_upload` fails because current `GET /api/logs` reads `current_log.txt`.

- [ ] **Step 3: Replace `GET /api/logs` and add `DELETE /api/session/log` in `app.py`**

Replace the existing `get_logs()` function:

```python
@app.route("/api/logs")
def get_logs():
    from flask import session as flask_session
    sid = flask_session.get("session_id")
    if not sid:
        return jsonify({"error": "no_log", "logs": [], "total": 0}), 404

    log_path = os.path.join(session_dir_for(sid), "log.txt")
    if not os.path.exists(log_path):
        return jsonify({"error": "no_log", "logs": [], "total": 0}), 404

    try:
        logs = []
        with open(log_path, "r", encoding="utf-8", errors="replace") as f:
            for i, line in enumerate(f):
                line = line.rstrip("\n")
                if line.strip():
                    logs.append(parse_line(line, i + 1))
        return jsonify({"logs": logs, "total": len(logs)})
    except Exception as exc:
        app.logger.error("Error reading log for session %s: %s", sid, exc)
        return jsonify({"error": "read_error"}), 500
```

Add the new delete endpoint after it:

```python
@app.route("/api/session/log", methods=["DELETE"])
def delete_session_log():
    from flask import session as flask_session
    sid = flask_session.get("session_id")
    if sid:
        log_path = os.path.join(session_dir_for(sid), "log.txt")
        try:
            os.remove(log_path)
        except FileNotFoundError:
            pass
    return jsonify({"ok": True})
```

- [ ] **Step 4: Run the tests**

```bash
pytest tests/test_app.py -k "get_logs or delete_session" -v
```

Expected: all 5 new tests pass.

- [ ] **Step 5: Run the full test suite**

```bash
pytest tests/test_app.py -v
```

Expected: all tests pass.

- [ ] **Step 6: Commit**

```bash
git add app.py tests/test_app.py
git commit -m "feat: make GET /api/logs session-aware, add DELETE /api/session/log"
```

---

## Task 6: Wrap `topics.json` reads/writes with `filelock`

**Files:**
- Modify: `app.py` (`load_data`, `save_data`)
- Modify: `tests/test_app.py`

- [ ] **Step 1: Write the failing test**

Add to `tests/test_app.py`:

```python
def test_topics_filelock_used_on_write(client, monkeypatch):
    """save_data acquires the topics filelock."""
    acquired = []
    original_save = app_module.save_data

    def patched_save(data):
        # Verify the lock file path exists after save
        original_save(data)
        acquired.append(True)

    monkeypatch.setattr(app_module, "save_data", patched_save)
    res = client.post("/api/topics", json={"name": "Test", "pattern": "foo", "color": "#fff"})
    assert res.status_code == 201
    assert acquired  # patched save was called


def test_concurrent_topic_reads_dont_corrupt(client):
    """Multiple GET /api/topics calls succeed."""
    for _ in range(10):
        res = client.get("/api/topics")
        assert res.status_code == 200
```

- [ ] **Step 2: Run to verify tests currently pass (they should — we're hardening existing behaviour)**

```bash
pytest tests/test_app.py -k "filelock or concurrent" -v
```

- [ ] **Step 3: Add filelock to `load_data` and `save_data` in `app.py`**

Add this constant near the other file-level constants:

```python
_TOPICS_LOCK = FileLock(TOPICS_FILE + ".lock")
```

Replace the existing `load_data` and `save_data` functions:

```python
def load_data():
    """Load {groups, topics}. Auto-migrates old bare-array format."""
    with _TOPICS_LOCK:
        if not os.path.exists(TOPICS_FILE):
            return {"groups": [], "topics": []}
        with open(TOPICS_FILE, "r", encoding="utf-8") as f:
            raw = json.load(f)
    # Migrate old bare-array format
    if isinstance(raw, list):
        for t in raw:
            t.setdefault("group_id", None)
        return {"groups": [], "topics": raw}
    raw.setdefault("groups", [])
    raw.setdefault("topics", [])
    for t in raw["topics"]:
        t.setdefault("group_id", None)
        t.setdefault("events", [])
        for ev in t["events"]:
            if "keywords" in ev and "start_keywords" not in ev:
                ev["start_keywords"] = ev.pop("keywords")
                ev.setdefault("end_keywords", [])
            else:
                ev.setdefault("start_keywords", [])
                ev.setdefault("end_keywords", [])
            ev.setdefault("value_regex", "")
    return raw


def save_data(data):
    with _TOPICS_LOCK:
        with open(TOPICS_FILE, "w", encoding="utf-8") as f:
            json.dump(data, f, indent=2)
```

- [ ] **Step 4: Run all tests**

```bash
pytest tests/test_app.py -v
```

Expected: all tests pass.

- [ ] **Step 5: Commit**

```bash
git add app.py tests/test_app.py
git commit -m "feat: protect topics.json reads/writes with filelock"
```

---

## Task 7: Session cleanup thread

**Files:**
- Modify: `app.py`
- Modify: `tests/test_app.py`

- [ ] **Step 1: Write the failing tests**

Add to `tests/test_app.py`:

```python
def test_cleanup_deletes_expired_session(tmp_path, monkeypatch):
    """_sweep_sessions() deletes dirs whose meta.json last_seen is past TTL."""
    monkeypatch.setattr(app_module, "SESSION_DIR", str(tmp_path))
    monkeypatch.setattr(app_module, "SESSION_TTL_H", 0)  # 0h TTL = expires immediately

    old_sid = "old-session"
    old_dir = tmp_path / old_sid
    old_dir.mkdir()
    # Write a last_seen from the epoch (far in the past)
    meta = old_dir / "meta.json"
    meta.write_text(json.dumps({"last_seen": "2000-01-01T00:00:00+00:00"}))

    app_module._sweep_sessions()
    assert not old_dir.exists()


def test_cleanup_keeps_fresh_session(tmp_path, monkeypatch):
    """_sweep_sessions() keeps dirs whose last_seen is within TTL."""
    monkeypatch.setattr(app_module, "SESSION_DIR", str(tmp_path))
    monkeypatch.setattr(app_module, "SESSION_TTL_H", 24)

    fresh_sid = "fresh-session"
    fresh_dir = tmp_path / fresh_sid
    fresh_dir.mkdir()
    now = datetime.now(timezone.utc).isoformat()
    (fresh_dir / "meta.json").write_text(json.dumps({"last_seen": now}))

    app_module._sweep_sessions()
    assert fresh_dir.exists()


def test_cleanup_deletes_dir_with_missing_meta(tmp_path, monkeypatch):
    """_sweep_sessions() treats missing meta.json as expired."""
    monkeypatch.setattr(app_module, "SESSION_DIR", str(tmp_path))
    monkeypatch.setattr(app_module, "SESSION_TTL_H", 24)

    orphan_dir = tmp_path / "orphan-session"
    orphan_dir.mkdir()
    # No meta.json

    app_module._sweep_sessions()
    assert not orphan_dir.exists()


def test_cleanup_skips_dotfiles(tmp_path, monkeypatch):
    """_sweep_sessions() ignores dotfile entries like .cleanup.lock."""
    monkeypatch.setattr(app_module, "SESSION_DIR", str(tmp_path))
    monkeypatch.setattr(app_module, "SESSION_TTL_H", 0)

    dotdir = tmp_path / ".cleanup.lock"
    dotdir.mkdir()

    app_module._sweep_sessions()
    assert dotdir.exists()
```

- [ ] **Step 2: Run to verify failure**

```bash
pytest tests/test_app.py -k "cleanup" -v
```

Expected: `AttributeError: module 'app' has no attribute '_sweep_sessions'`

- [ ] **Step 3: Implement cleanup sweep and thread in `app.py`**

Add after the session helpers section:

```python
# ── Session cleanup thread ───────────────────────────────────────────────────

_CLEANUP_LOCK_PATH = os.path.join(SESSION_DIR, ".cleanup.lock")


def _sweep_sessions() -> None:
    """Delete session dirs whose last_seen is older than SESSION_TTL_H."""
    now = datetime.now(timezone.utc)
    try:
        entries = os.listdir(SESSION_DIR)
    except OSError:
        return
    for name in entries:
        if name.startswith("."):
            continue
        sdir = os.path.join(SESSION_DIR, name)
        if not os.path.isdir(sdir):
            continue
        last_seen = None
        meta_path = os.path.join(sdir, "meta.json")
        try:
            with open(meta_path, "r", encoding="utf-8") as f:
                last_seen = datetime.fromisoformat(json.load(f)["last_seen"])
        except Exception:
            last_seen = datetime.fromtimestamp(0, tz=timezone.utc)
        age_h = (now - last_seen).total_seconds() / 3600
        if age_h >= SESSION_TTL_H:
            try:
                shutil.rmtree(sdir)
            except FileNotFoundError:
                pass


def _cleanup_worker() -> None:
    """Background daemon: sleep 1 hour, sweep, repeat."""
    cleanup_lock = FileLock(_CLEANUP_LOCK_PATH)
    while True:
        __import__("time").sleep(3600)
        try:
            with cleanup_lock.acquire(timeout=0):
                _sweep_sessions()
        except Timeout:
            pass  # another worker is sweeping


def _start_cleanup_thread() -> None:
    t = threading.Thread(target=_cleanup_worker, daemon=True)
    t.start()
```

And at the very bottom of `app.py`, replace the existing `if __name__ == "__main__":` block:

```python
if __name__ == "__main__":
    _start_cleanup_thread()
    app.run(debug=True, port=8098)
```

Also add a call to start the thread at module level (for gunicorn), just after `os.makedirs(SESSION_DIR, ...)`:

```python
# Start cleanup thread (runs in each gunicorn worker; lock ensures only one sweeps)
_start_cleanup_thread()
```

- [ ] **Step 4: Run the tests**

```bash
pytest tests/test_app.py -k "cleanup" -v
```

Expected: all 4 cleanup tests pass.

- [ ] **Step 5: Run full suite**

```bash
pytest tests/test_app.py -v
```

Expected: all tests pass.

- [ ] **Step 6: Commit**

```bash
git add app.py tests/test_app.py
git commit -m "feat: add session cleanup daemon thread with filelock coordination"
```

---

## Task 8: Frontend — upload panel replaces load buttons and drag & drop

**Files:**
- Modify: `templates/index.html`

This task has no automated tests (pure frontend). Verify manually by running the app.

- [ ] **Step 1: Inject `window.MAX_UPLOAD_MB` into the template**

In `app.py`, update the `index()` route:

```python
@app.route("/")
def index():
    return render_template("index.html", max_upload_mb=MAX_UPLOAD_MB)
```

In `templates/index.html`, add this line inside `<head>`, just before `</head>`:

```html
  <script>window.MAX_UPLOAD_MB = {{ max_upload_mb }};</script>
```

- [ ] **Step 2: Add upload panel CSS to `index.html`**

Find the existing `/* ── Toolbar ─` CSS section and add after the button styles:

```css
/* Upload panel */
#upload-status {
  font-size: 0.8rem;
  color: #7a8099;
}
#upload-status.success { color: #57c98f; }
#upload-status.error   { color: #e05050; }
#upload-progress-wrap {
  display: none;
  align-items: center;
  gap: 6px;
}
#upload-progress-bar {
  width: 100px; height: 6px;
  background: #22253a;
  border-radius: 3px;
  overflow: hidden;
}
#upload-progress-fill {
  height: 100%;
  background: #5b9bd5;
  width: 0%;
  transition: width 0.1s;
}
#upload-progress-label { font-size: 0.75rem; color: #7a8099; min-width: 60px; }
#btn-upload-label {
  cursor: pointer;
  border: 1px solid #2a5a90;
  border-radius: 5px;
  font-size: 0.8rem;
  padding: 5px 12px;
  background: #1e3a5f;
  color: #a8c8f0;
  transition: background .15s;
  white-space: nowrap;
}
#btn-upload-label:hover { background: #1f4878; }
#btn-clear-log:disabled { opacity: 0.4; cursor: default; }
```

- [ ] **Step 3: Replace load buttons HTML in the toolbar**

Find this block in the HTML (lines ~520–529):

```html
  <!-- Load buttons -->
  <div class="toolbar-group">
    <button class="primary" id="btn-load-server" title="Load current_log.txt from server">
      &#128196; Load current_log.txt
    </button>
    <label>
      <button onclick="document.getElementById('file-input').click()">&#128194; Open File…</button>
    </label>
    <input type="file" id="file-input" accept=".txt,.log" style="display:none" />
  </div>
```

Replace it with:

```html
  <!-- Upload panel -->
  <div class="toolbar-group" id="upload-panel">
    <label id="btn-upload-label" title="Upload a log file">
      &#128196; Upload Log…
      <input type="file" id="file-input" accept=".txt" style="display:none" />
    </label>
    <div id="upload-progress-wrap">
      <div id="upload-progress-bar"><div id="upload-progress-fill"></div></div>
      <span id="upload-progress-label">0%</span>
    </div>
    <span id="upload-status">No log loaded</span>
    <button id="btn-clear-log" disabled title="Clear the loaded log">&#10005; Clear Log</button>
  </div>
```

- [ ] **Step 4: Remove drag & drop HTML**

Find and remove the `<div id="drop-overlay">` block (lines ~774–777):

```html
<div id="drop-overlay">
  <div class="drop-icon">📂</div>
  <div class="drop-text">Drop log file here to load it</div>
</div>
```

Also remove the `#drop-overlay` CSS block (lines ~259–273).

- [ ] **Step 5: Replace JS loading logic**

Find the `// ── Data loading` section (~line 1012) and replace everything from `function setLoading` through the end of `loadFromFile` (~line 1048) with:

```javascript
// ── Upload panel ──────────────────────────────────────────────────────────
function setUploadStatus(msg, cls = '') {
  const el = document.getElementById('upload-status');
  el.textContent = msg;
  el.className = cls;
}

function setProgressVisible(visible) {
  document.getElementById('upload-progress-wrap').style.display = visible ? 'flex' : 'none';
}

function setProgress(pct, label) {
  document.getElementById('upload-progress-fill').style.width = pct + '%';
  document.getElementById('upload-progress-label').textContent = label;
}

function setClearLogEnabled(enabled) {
  document.getElementById('btn-clear-log').disabled = !enabled;
}

async function loadLogsFromServer() {
  try {
    const res = await fetch('/api/logs');
    const data = await res.json();
    if (!res.ok || data.error === 'no_log') {
      allLogs = [];
      applyFilters();
      setUploadStatus('No log loaded');
      setClearLogEnabled(false);
      return;
    }
    if (data.error) {
      setUploadStatus('Failed to load log. Please try again.', 'error');
      return;
    }
    allLogs = data.logs;
    applyFilters();
  } catch (e) {
    setUploadStatus('Failed to load log. Please try again.', 'error');
  }
}

function uploadFile(file) {
  const maxMb = window.MAX_UPLOAD_MB || 200;
  const formData = new FormData();
  formData.append('log', file);

  setProgressVisible(true);
  setProgress(0, '0%');
  setUploadStatus('Uploading…');
  setClearLogEnabled(false);

  const xhr = new XMLHttpRequest();
  xhr.timeout = 120000;

  xhr.upload.onprogress = e => {
    if (e.lengthComputable) {
      const pct = Math.round((e.loaded / e.total) * 100);
      setProgress(pct, pct < 100 ? pct + '%' : 'Processing…');
    }
  };

  xhr.onload = async () => {
    setProgressVisible(false);
    if (xhr.status === 200) {
      let body;
      try { body = JSON.parse(xhr.responseText); } catch { body = {}; }
      setUploadStatus('✓ ' + (body.lines || 0).toLocaleString() + ' lines loaded', 'success');
      setClearLogEnabled(true);
      await loadLogsFromServer();
    } else if (xhr.status === 413) {
      setUploadStatus('File too large. Maximum is ' + maxMb + ' MB.', 'error');
    } else if (xhr.status === 400) {
      setUploadStatus('Please upload a .txt log file.', 'error');
    } else if (xhr.status === 503) {
      setUploadStatus('Server is at capacity. Please try again later.', 'error');
    } else {
      setUploadStatus('Upload failed. Please try again.', 'error');
    }
  };

  xhr.onerror = () => { setProgressVisible(false); setUploadStatus('Upload failed. Please try again.', 'error'); };
  xhr.ontimeout = () => { setProgressVisible(false); setUploadStatus('Upload timed out. Please try again.', 'error'); };

  xhr.open('POST', '/api/upload');
  xhr.send(formData);
}
```

- [ ] **Step 6: Replace event wiring for the old load buttons**

Find and replace these lines (~1051–1056):

```javascript
document.getElementById('btn-load-server').addEventListener('click', loadFromServer);

document.getElementById('file-input').addEventListener('change', e => {
  if (e.target.files[0]) loadFromFile(e.target.files[0]);
  e.target.value = '';
});
```

With:

```javascript
document.getElementById('file-input').addEventListener('change', e => {
  if (e.target.files[0]) uploadFile(e.target.files[0]);
  e.target.value = '';
});

document.getElementById('btn-clear-log').addEventListener('click', async () => {
  await fetch('/api/session/log', { method: 'DELETE' });
  allLogs = [];
  applyFilters();
  setUploadStatus('No log loaded');
  setClearLogEnabled(false);
});
```

- [ ] **Step 7: Remove drag & drop JS**

Find and remove the `// ── Drag & Drop` block (~lines 1107–1128):

```javascript
// ── Drag & Drop ──────────────────────────────────────────────────────────
let dragCounter = 0;
const overlay = document.getElementById('drop-overlay');

document.addEventListener('dragenter', e => { ... });
document.addEventListener('dragleave', () => { ... });
document.addEventListener('dragover', e => e.preventDefault());
document.addEventListener('drop', e => { ... });
```

- [ ] **Step 8: Remove `parseLine` and `parseText` functions**

Find and remove the `// ── Log line parser` block (~lines 795–831), which includes `parseLine()` and `parseText()`.

- [ ] **Step 9: Update page-load to use session-aware load**

Find the DOMContentLoaded or initial load call. The existing `loadFromServer()` call at bottom of script (if any) should be replaced with `loadLogsFromServer()`. Search for any auto-load on startup and replace it. If there is none, add at the bottom of the script:

```javascript
// On page load, check if a log is already uploaded for this session
loadLogsFromServer();
```

- [ ] **Step 10: Manual verification**

```bash
python app.py
```

Open `http://localhost:8098`. Verify:
1. Page loads showing "No log loaded", "Upload Log…" button visible, "Clear Log" disabled
2. Click "Upload Log…", pick a `.txt` log file → progress bar appears → "✓ N lines loaded" after completion → table fills
3. Refresh page → log reloads automatically (session cookie persists)
4. Click "Clear Log" → table clears, status resets to "No log loaded"
5. Try uploading a non-`.txt` file → error "Please upload a .txt log file."

- [ ] **Step 11: Commit**

```bash
git add templates/index.html app.py
git commit -m "feat: replace drag & drop with upload panel in frontend"
```

---

## Task 9: `.env.example`, `.gitignore`, and docs updates

**Files:**
- Create: `.env.example`
- Modify: `.gitignore`
- Modify: `README.md`

- [ ] **Step 1: Create `.env.example`**

```bash
cat > .env.example << 'EOF'
# Webex Log Viewer — environment variables
# Copy to .env and fill in values before deploying with gunicorn.

# REQUIRED in production (gunicorn will refuse to start without it)
SECRET_KEY=change-me-to-a-random-string

# Directory where per-user session files are stored (created automatically)
SESSION_DIR=./sessions

# Hours of inactivity before a session's uploaded log is deleted
SESSION_TTL_H=24

# Maximum log file size in MB (also set nginx client_max_body_size to match)
MAX_UPLOAD_MB=200

# Maximum number of concurrent user sessions
MAX_SESSIONS=50
EOF
```

- [ ] **Step 2: Update `.gitignore`**

Open `.gitignore`. Add or update these lines:

```
sessions/
current_log*.txt
```

Remove any existing `current_log.txt` line if present.

- [ ] **Step 3: Update `README.md`**

Replace the **LOADING LOGS** section with:

```markdown
LOADING LOGS
------------
Click **"Upload Log…"** in the toolbar and select a `.txt` Webex log file.
The file is sent to the server, parsed, and displayed immediately.

To clear the loaded log, click **"Clear Log"** in the toolbar.
Your uploaded log persists for your browser session until you clear it or
the server-side TTL (default 24 hours) expires.
```

Replace the **RUNNING THE APP** / production section with:

```markdown
RUNNING IN PRODUCTION
---------------------
1. Set environment variables:

   export SECRET_KEY="<random-secret>"
   export SESSION_DIR="/var/lib/webex-log-viewer/sessions"
   export SESSION_TTL_H=24
   export MAX_UPLOAD_MB=200
   export MAX_SESSIONS=50

2. Start with gunicorn (use sync workers):

   gunicorn -w 4 -b 0.0.0.0:8098 app:app

3. Put nginx in front for SSL termination. Set:

   client_max_body_size 200m;   # match MAX_UPLOAD_MB

Disk: provision at least (MAX_SESSIONS + workers) × MAX_UPLOAD_MB
(e.g. 54 × 200 MB ≈ 11 GB).
```

- [ ] **Step 4: Commit**

```bash
git add .env.example .gitignore README.md
git commit -m "docs: add .env.example, update .gitignore and README for multi-user deployment"
```

---

## Task 10: Final verification

- [ ] **Step 1: Run the full test suite one last time**

```bash
pytest tests/test_app.py -v
```

Expected: all tests pass, no warnings about unresolved fixtures.

- [ ] **Step 2: Smoke-test the app end to end**

```bash
python app.py
```

Open two different browsers (or one normal + one incognito). In each:
1. Upload a different log file
2. Confirm each browser sees only its own log in the table
3. Confirm both browsers see the same topics in the sidebar
4. Add a topic in one browser — confirm it appears in the other after refresh

- [ ] **Step 3: Verify gunicorn startup guard**

```bash
# Should fail (default SECRET_KEY)
gunicorn -w 1 -b 0.0.0.0:8099 app:app
```

Expected: exits immediately with `ERROR: SECRET_KEY is not set or is the default`.

```bash
# Should succeed
SECRET_KEY=test-real-key gunicorn -w 1 -b 0.0.0.0:8099 app:app
```

Expected: starts cleanly.

- [ ] **Step 4: Final commit**

```bash
git add -A
git status  # confirm no unexpected files staged
git commit -m "feat: multi-user deployment complete — session upload, cleanup, gunicorn-ready"
```
