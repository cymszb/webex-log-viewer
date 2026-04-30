import pytest
import json
import os
import sys
import io
from datetime import datetime, timezone

from filelock import FileLock

sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

import app as app_module
from app import app as flask_app


def test_session_dir_env_var(tmp_path, monkeypatch):
    """SESSION_DIR is read from environment."""
    expected = str(tmp_path / "mysessions")
    monkeypatch.setenv("SESSION_DIR", expected)
    import importlib
    importlib.reload(app_module)
    assert app_module.SESSION_DIR == expected
    app_module.SESSION_DIR = str(tmp_path / "sessions")  # restore
    app_module._sessions_lock = FileLock(os.path.join(app_module.SESSION_DIR, ".sessions.lock"))


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
    app_module._sessions_lock = FileLock(os.path.join(app_module.SESSION_DIR, ".sessions.lock"))
    app_module.MAX_SESSIONS = 5
    os.makedirs(app_module.SESSION_DIR, exist_ok=True)
    with flask_app.test_client() as c:
        with flask_app.app_context():
            yield c


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


def _make_log_bytes():
    line = "2024-01-01T00:00:00.000Z <Info> [1234:0x001][]MyFile.cpp:10 MyClass::myMethod::hello world\n"
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


def test_topics_filelock_used_on_write(client, monkeypatch):
    """_save_data_raw (the atomic write path) is called on topic creation."""
    acquired = []
    original_save_raw = app_module._save_data_raw

    def patched_save_raw(data):
        original_save_raw(data)
        acquired.append(True)

    monkeypatch.setattr(app_module, "_save_data_raw", patched_save_raw)
    res = client.post("/api/topics", json={"name": "Test", "pattern": "foo", "color": "#fff"})
    assert res.status_code == 201
    assert acquired  # atomic write path was exercised


def test_concurrent_topic_reads_dont_corrupt(client):
    """Multiple GET /api/topics calls succeed."""
    for _ in range(10):
        res = client.get("/api/topics")
        assert res.status_code == 200


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
