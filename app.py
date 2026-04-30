import re
import os
import json
import uuid
import shutil
import threading
from datetime import datetime, timezone

from flask import Flask, render_template, jsonify, request
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
    key = os.environ.get("SECRET_KEY", _SECRET_KEY)
    if key in ("dev-secret", "", None):
        print(
            "ERROR: SECRET_KEY is not set or is the default 'dev-secret'. "
            "Set the SECRET_KEY environment variable before starting with gunicorn.",
            file=__import__("sys").stderr,
        )
        return False
    return True


app = Flask(__name__)

app.config["SECRET_KEY"] = _SECRET_KEY
app.config["MAX_CONTENT_LENGTH"] = MAX_UPLOAD_MB * 1024 * 1024
os.makedirs(SESSION_DIR, exist_ok=True)
_sessions_lock = FileLock(os.path.join(SESSION_DIR, ".sessions.lock"))

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


# Enforce SECRET_KEY when running under gunicorn (not as __main__, not in pytest)
_in_pytest = "pytest" in __import__("sys").modules
if not _in_pytest and not _check_secret_key(is_main=(__name__ == "__main__")):
    raise SystemExit(1)

# Start cleanup thread in each worker process; lock ensures only one sweeps at a time.
# Skipped when running under pytest (no background threads during testing).
if not _in_pytest:
    _start_cleanup_thread()


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


# Pattern: timestamp <Level> [pid:tid][]SourceFile.cpp:line Class::Method::message
LOG_PATTERN = re.compile(
    r"^(\S+)\s+<(\w+)>\s+\[(\d+):(0x[\da-fA-F]+|\d+)\]\[[^\]]*\]([^\s:]+):(\d+)\s+(.*)"
)


def parse_line(raw: str, index: int) -> dict:
    m = LOG_PATTERN.match(raw)
    if not m:
        return {
            "index": index,
            "timestamp": "",
            "level": "UNKNOWN",
            "pid": "",
            "tid": "",
            "source_file": "",
            "line_num": "",
            "class_method": "",
            "message": raw.strip(),
            "raw": True,
        }

    timestamp, level, pid, tid, source_file, line_num, rest = m.groups()

    # rest is like "Class::method::message" but message itself may contain "::"
    # Split only on the first two "::" separators
    parts = rest.split("::", 2)
    if len(parts) == 3:
        class_name, method, message = parts
        class_method = f"{class_name}::{method}"
    elif len(parts) == 2:
        class_method = parts[0] + "::" + parts[1]
        message = ""
    else:
        class_method = ""
        message = rest

    return {
        "index": index,
        "timestamp": timestamp,
        "level": level,
        "pid": pid,
        "tid": tid,
        "source_file": source_file,
        "line_num": line_num,
        "class_method": class_method,
        "message": message.strip(),
        "raw": False,
    }


@app.route("/")
def index():
    return render_template("index.html", max_upload_mb=MAX_UPLOAD_MB)


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


# ── Topics CRUD ─────────────────────────────────────────────────────────
TOPICS_FILE = os.path.join(os.path.dirname(__file__), "topics.json")
_TOPICS_LOCK = FileLock(TOPICS_FILE + ".lock")


def _load_data_raw() -> dict:
    """Load and migrate topics data. Caller must hold _TOPICS_LOCK."""
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
            # Migrate legacy flat keywords → start_keywords / end_keywords
            if "keywords" in ev and "start_keywords" not in ev:
                ev["start_keywords"] = ev.pop("keywords")
                ev.setdefault("end_keywords", [])
            else:
                ev.setdefault("start_keywords", [])
                ev.setdefault("end_keywords", [])
            ev.setdefault("value_regex", "")
    return raw


def _save_data_raw(data: dict) -> None:
    """Save data atomically. Caller must hold _TOPICS_LOCK."""
    tmp = TOPICS_FILE + ".tmp"
    with open(tmp, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2)
    os.replace(tmp, TOPICS_FILE)


def load_data() -> dict:
    """Load {groups, topics} under the topics file lock."""
    with _TOPICS_LOCK:
        return _load_data_raw()


def save_data(data: dict) -> None:
    """Save {groups, topics} atomically under the topics file lock."""
    with _TOPICS_LOCK:
        _save_data_raw(data)


@app.route("/api/topics", methods=["GET"])
def get_topics():
    return jsonify(load_data())


@app.route("/api/topics", methods=["POST"])
def create_topic():
    data_req = request.get_json(force=True)
    name = (data_req.get("name") or "").strip()
    pattern = (data_req.get("pattern") or "").strip()
    color = (data_req.get("color") or "#4db6e8").strip()
    group_id = data_req.get("group_id", None)
    if not name:
        return jsonify({"error": "name is required"}), 400
    try:
        re.compile(pattern)
    except re.error as e:
        return jsonify({"error": f"invalid regex: {e}"}), 400
    topic = {"id": str(uuid.uuid4()), "name": name, "pattern": pattern,
             "color": color, "enabled": True, "group_id": group_id}
    with _TOPICS_LOCK:
        data = _load_data_raw()
        data["topics"].append(topic)
        _save_data_raw(data)
    return jsonify(topic), 201


@app.route("/api/topics/<topic_id>", methods=["PUT"])
def update_topic(topic_id):
    data_req = request.get_json(force=True)
    with _TOPICS_LOCK:
        data = _load_data_raw()
        topic = next((t for t in data["topics"] if t["id"] == topic_id), None)
        if not topic:
            return jsonify({"error": "not found"}), 404
        if "name" in data_req:
            topic["name"] = (data_req["name"] or "").strip()
        if "pattern" in data_req:
            pattern = (data_req["pattern"] or "").strip()
            try:
                re.compile(pattern)
            except re.error as e:
                return jsonify({"error": f"invalid regex: {e}"}), 400
            topic["pattern"] = pattern
        if "color" in data_req:
            topic["color"] = (data_req["color"] or "").strip()
        if "enabled" in data_req:
            topic["enabled"] = bool(data_req["enabled"])
        if "group_id" in data_req:
            topic["group_id"] = data_req["group_id"]
        _save_data_raw(data)
    return jsonify(topic)


@app.route("/api/topics/<topic_id>", methods=["DELETE"])
def delete_topic(topic_id):
    with _TOPICS_LOCK:
        data = _load_data_raw()
        data["topics"] = [t for t in data["topics"] if t["id"] != topic_id]
        _save_data_raw(data)
    return jsonify({"ok": True})


# ── Events CRUD ─────────────────────────────────────────────────────────

@app.route("/api/topics/<topic_id>/events", methods=["POST"])
def create_event(topic_id):
    data_req = request.get_json(force=True)
    name = (data_req.get("name") or "").strip()
    start_kw_raw = (data_req.get("start_keywords") or "").strip()
    end_kw_raw   = (data_req.get("end_keywords")   or "").strip()
    color = (data_req.get("color") or "#4db6e8").strip()
    if not name:
        return jsonify({"error": "name is required"}), 400
    start_keywords = [k.strip() for k in start_kw_raw.split(",") if k.strip()]
    end_keywords   = [k.strip() for k in end_kw_raw.split(",")   if k.strip()]
    value_regex    = (data_req.get("value_regex") or "").strip()
    event = {"id": str(uuid.uuid4()), "name": name, "start_keywords": start_keywords, "end_keywords": end_keywords, "value_regex": value_regex, "color": color}
    with _TOPICS_LOCK:
        data = _load_data_raw()
        topic = next((t for t in data["topics"] if t["id"] == topic_id), None)
        if not topic:
            return jsonify({"error": "topic not found"}), 404
        topic.setdefault("events", [])
        topic["events"].append(event)
        _save_data_raw(data)
    return jsonify(event), 201


@app.route("/api/topics/<topic_id>/events/<event_id>", methods=["PUT"])
def update_event(topic_id, event_id):
    data_req = request.get_json(force=True)
    with _TOPICS_LOCK:
        data = _load_data_raw()
        topic = next((t for t in data["topics"] if t["id"] == topic_id), None)
        if not topic:
            return jsonify({"error": "topic not found"}), 404
        event = next((e for e in topic.get("events", []) if e["id"] == event_id), None)
        if not event:
            return jsonify({"error": "event not found"}), 404
        if "name" in data_req:
            event["name"] = (data_req["name"] or "").strip()
        if "start_keywords" in data_req:
            raw = (data_req["start_keywords"] or "").strip()
            event["start_keywords"] = [k.strip() for k in raw.split(",") if k.strip()]
        if "end_keywords" in data_req:
            raw = (data_req["end_keywords"] or "").strip()
            event["end_keywords"] = [k.strip() for k in raw.split(",") if k.strip()]
        if "value_regex" in data_req:
            event["value_regex"] = (data_req["value_regex"] or "").strip()
        event.pop("keywords", None)  # remove legacy field if present
        if "color" in data_req:
            event["color"] = (data_req["color"] or "").strip()
        _save_data_raw(data)
    return jsonify(event)


@app.route("/api/topics/<topic_id>/events/<event_id>", methods=["DELETE"])
def delete_event(topic_id, event_id):
    with _TOPICS_LOCK:
        data = _load_data_raw()
        topic = next((t for t in data["topics"] if t["id"] == topic_id), None)
        if not topic:
            return jsonify({"error": "topic not found"}), 404
        topic["events"] = [e for e in topic.get("events", []) if e["id"] != event_id]
        _save_data_raw(data)
    return jsonify({"ok": True})


# ── Groups CRUD ──────────────────────────────────────────────────────────

@app.route("/api/groups", methods=["POST"])
def create_group():
    data_req = request.get_json(force=True)
    name = (data_req.get("name") or "").strip()
    if not name:
        return jsonify({"error": "name is required"}), 400
    group = {"id": str(uuid.uuid4()), "name": name, "collapsed": False}
    with _TOPICS_LOCK:
        data = _load_data_raw()
        data["groups"].append(group)
        _save_data_raw(data)
    return jsonify(group), 201


@app.route("/api/groups/<group_id>", methods=["PUT"])
def update_group(group_id):
    data_req = request.get_json(force=True)
    with _TOPICS_LOCK:
        data = _load_data_raw()
        group = next((g for g in data["groups"] if g["id"] == group_id), None)
        if not group:
            return jsonify({"error": "not found"}), 404
        if "name" in data_req:
            group["name"] = (data_req["name"] or "").strip()
        if "collapsed" in data_req:
            group["collapsed"] = bool(data_req["collapsed"])
        _save_data_raw(data)
    return jsonify(group)


@app.route("/api/groups/<group_id>", methods=["DELETE"])
def delete_group(group_id):
    with _TOPICS_LOCK:
        data = _load_data_raw()
        data["groups"] = [g for g in data["groups"] if g["id"] != group_id]
        # Orphan topics → ungrouped
        for t in data["topics"]:
            if t.get("group_id") == group_id:
                t["group_id"] = None
        _save_data_raw(data)
    return jsonify({"ok": True})


if __name__ == "__main__":
    #app.run(debug=True, port=8098)
    app.run(debug=True, port=8098, host='10.72.209.80')
