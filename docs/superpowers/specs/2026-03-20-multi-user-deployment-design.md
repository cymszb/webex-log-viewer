# Webex Log Viewer — Multi-User Deployment Design

**Date:** 2026-03-20
**Status:** Approved

---

## 1. Goal

Refactor the Webex Log Viewer from a single-user local tool into a server-deployable web app that supports multiple simultaneous users. Each user works with their own uploaded log file; the topics/events/groups configuration is shared across all users.

---

## 2. Constraints and Non-Goals

- **No authentication** — sessions are anonymous; anyone with the URL can use the app.
- **No database** — flat files only; keeps deployment simple.
- **No framework rewrite** — vanilla JS frontend, Flask backend, no build step.
- **No drag & drop** — removed in favor of server-side upload (simplifies frontend, eliminates duplicate parser).
- **`topics.json` format unchanged** — existing config carries over with no migration. Note: the old single-user workflow of placing a file at `current_log.txt` and clicking "Load from Server" is intentionally removed; users now upload via the browser.
- **Local dev unchanged** — `python app.py` still works with zero config.

---

## 3. Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Browser (per user)                        │
│                                                             │
│  index.html  (vanilla JS, no build step)                    │
│  • Upload panel  →  POST /api/upload                        │
│  • Log table     →  GET  /api/logs                          │
│  • Topics sidebar→  CRUD /api/topics + /api/groups          │
│  • Timeline viz  →  canvas (unchanged)                      │
│                                                             │
│                  HTTP + session cookie                       │
└─────────────────────┬───────────────────────────────────────┘
                      │
┌─────────────────────▼───────────────────────────────────────┐
│               Flask  (gunicorn workers)                      │
│                                                             │
│  Session cookie  →  identifies user                         │
│  before_request hook → updates meta.json last_seen          │
│                                                             │
│  POST /api/upload      parse + save to session log dir      │
│  GET  /api/logs        read from session log dir            │
│  DELETE /api/session/log  clear user's log                  │
│  CRUD /api/topics      read/write topics.json (filelock)    │
│  CRUD /api/groups      same file, same lock                 │
│                                                             │
│  Background TTL cleaner (thread, one worker at a time       │
│    via .cleanup.lock filelock)                              │
│    → deletes session dirs idle > SESSION_TTL_H hours        │
└──────────┬──────────────────────┬───────────────────────────┘
           │                      │
  ┌────────▼────────┐    ┌────────▼──────────────────────┐
  │   topics.json   │    │  sessions/                    │
  │  (shared, all   │    │    .cleanup.lock               │
│   │    │    .sessions.lock              │
  │   users)        │    │    <session_id>/               │
  │  filelock for   │    │      log.txt   (uploaded file) │
  │  concurrent     │    │      meta.json (last-seen ts)  │
  │  reads/writes   │    │                               │
  └─────────────────┘    │  cleaned up after TTL expiry  │
                         └───────────────────────────────┘
```

---

## 4. Backend (`app.py`)

### 4.1 New Dependencies

| Package | Purpose |
|---------|---------|
| `filelock>=3.13.0` | Safe concurrent reads and writes to `topics.json` |
| `gunicorn>=21.0.0` | Production WSGI server (not needed for local dev) |

`gunicorn` is only needed for production deployment. Local development uses `python app.py` as before and does not require it.

### 4.2 Configuration (environment variables)

| Variable | Default | Description |
|----------|---------|-------------|
| `SECRET_KEY` | `dev-secret` (dev only) | Flask session signing key. The check runs only when the app is started via gunicorn (i.e. **not** via `if __name__ == "__main__"`). If `SECRET_KEY` equals `dev-secret` or is unset at gunicorn startup, the app exits with a non-zero code and prints an error to stderr. Local development (`python app.py`) always skips the check — no env var needed. |
| `SESSION_DIR` | `./sessions` | Root directory for per-user session dirs. Must be writable by the server process. Created automatically at startup if it does not exist. |
| `SESSION_TTL_H` | `24` | Hours of inactivity before a session dir is deleted by the cleanup thread. |
| `MAX_UPLOAD_MB` | `200` | Maximum log file size. Sets Flask's `MAX_CONTENT_LENGTH`. Provision at least `MAX_SESSIONS × MAX_UPLOAD_MB` of disk for `SESSION_DIR`. |
| `MAX_SESSIONS` | `50` | Maximum number of concurrent session directories. `POST /api/upload` returns 503 when this limit is reached. |

### 4.3 Session Management

**Session directory lifecycle:**
- A session directory `SESSION_DIR/<session_id>/` is created only when the user first uploads a file (`POST /api/upload`). It is not created on page load or any other request.
- Before the first upload, `GET /api/logs` finds no directory and returns `{"error": "no_log", "logs": []}` with HTTP 404 — this is handled identically to "directory exists but `log.txt` is absent."
- The directory contains:
  - `log.txt` — the uploaded raw log file, overwritten on each new upload. The file is re-parsed on every `GET /api/logs` call using the same `parse_line()` function already in `app.py`. No intermediate parsed representation is cached to disk.
  - `meta.json` — `{"last_seen": "<ISO timestamp>"}`.

**`last_seen` update:**
`meta.json` is updated via a Flask `before_request` hook that runs on **every** incoming request that carries a valid session cookie. The hook writes using an **atomic rename**: write to `SESSION_DIR/<session_id>/meta.json.tmp`, then call `os.replace(tmp_path, meta_path)`. This makes concurrent writes safe — each write is atomic and the last writer wins, which is acceptable since the value is only a timestamp. Failures (e.g. full disk) are logged and silently ignored so they never surface as 500 errors. If the session directory does not yet exist (pre-upload), the hook skips writing entirely. This does not require changes to individual endpoint handlers.

**Cleanup thread:**
- A background daemon thread starts at app startup in each gunicorn worker. It sleeps for one hour first, then runs the sweep, then sleeps again (i.e. no sweep at startup).
- Before sweeping, the thread attempts a **non-blocking `filelock` acquire** (`timeout=0`) on `SESSION_DIR/.cleanup.lock`, catching the `Timeout` exception raised by the `filelock` library. Only the worker that holds the lock performs the sweep; all others skip silently. The lock is held only for the duration of the sweep (inside a `with` block) and released immediately after — it is not held until process exit.
- The thread sweeps any session dir where `last_seen < now - SESSION_TTL_H`. Session dirs to sweep are identified as: subdirectories of `SESSION_DIR` whose names do not start with `.`. A missing or unparseable `meta.json` is treated as `last_seen = epoch` (i.e. immediately eligible for deletion). Deletion uses `shutil.rmtree`; `FileNotFoundError` is caught and ignored.
- Sessions may persist up to `SESSION_TTL_H + 1 hour` in the worst case (TTL expiry between sweeps).

### 4.4 API Changes

#### New endpoints

| Method | Route | Description |
|--------|-------|-------------|
| `POST` | `/api/upload` | Accepts `multipart/form-data` with a single file field `log`. Validation: file extension must be `.txt` (case-insensitive; MIME type is not checked). If the caller already has a session directory, the `MAX_SESSIONS` check is skipped — re-uploads by existing sessions are always permitted. For new sessions, the check and directory creation are performed together under a `filelock` on `SESSION_DIR/.sessions.lock` (counting all non-dotfile subdirectories of `SESSION_DIR`): if count ≥ `MAX_SESSIONS`, return 503; otherwise create the directory and release the lock. The uploaded file is written atomically: saved to `SESSION_DIR/<session_id>/log.txt.tmp`, then renamed to `log.txt` via `os.replace()`. `log.txt.tmp` is a transient file that exists only during the upload and is always renamed or cleaned up before the request completes; it is never a permanent resident of the session directory. Returns `{"lines": N, "size_mb": F}`. Returns 400 if no file is provided or extension is not `.txt`; 413 if over `MAX_UPLOAD_MB`; 503 if `MAX_SESSIONS` is reached. After a successful upload the frontend immediately calls `GET /api/logs` to populate the table. |
| `DELETE` | `/api/session/log` | Deletes `SESSION_DIR/<session_id>/log.txt` if it exists. Idempotent — returns `{"ok": true}` whether or not the file existed. |

#### Changed endpoints

| Method | Route | Change |
|--------|-------|--------|
| `GET` | `/api/logs` | Reads from `SESSION_DIR/<session_id>/log.txt` and re-parses using `parse_line()`. Returns `{"error": "no_log", "logs": [], "total": 0}` with HTTP 404 if the session directory does not exist or `log.txt` is absent. |

#### Unchanged endpoints

All `/api/topics` and `/api/groups` CRUD endpoints retain the same request/response shape. All reads and writes now go through a `filelock` on `topics.json` to prevent torn reads under concurrent access.

### 4.5 File Size Limit

- `app.config["MAX_CONTENT_LENGTH"]` is set from `MAX_UPLOAD_MB`.
- Flask returns HTTP 413 if the upload exceeds this limit. Note: if nginx's `client_max_body_size` is set lower than `MAX_UPLOAD_MB`, the user receives an nginx 413 with an HTML body (not JSON). The frontend 413 handler must handle non-JSON responses gracefully and still show a clear error message.

---

## 5. Frontend (`templates/index.html`)

### 5.1 Removed

- Drag & drop overlay and `dragover`/`drop` event handlers
- `FileReader` client-side file reading
- Client-side `parseLine()` function (duplicate of the Python parser)
- "Load from Server" button

### 5.2 Added — Upload Panel

Replaces the "Load from Server" button in the toolbar:

```
[ No log loaded ]  [ Upload Log… ]  [████████░░ 60%]  [ Processing… ]  [ ✓ 42,310 lines ]  [ Clear Log ]
```

- **"Upload Log…"** — `<input type="file" accept=".txt">` wrapped in a styled label. On file selection, sends `POST /api/upload` via XHR (not `fetch` — XHR is used for broad compatibility with `upload.onprogress`). XHR timeout is set to **120 seconds**; if exceeded, shows "Upload timed out. Please try again."
- **Progress bar** — shown during upload, hidden otherwise. Advances from 0–100% as bytes are transferred.
- **"Processing…" state** — once all bytes have been transferred (progress = 100%) but before the server response arrives, the progress bar stays at 100% and a "Processing…" label replaces the percentage. This covers server-side parsing time for large files.
- **On success** — status shows `✓ N lines loaded`; the frontend immediately calls `GET /api/logs` to populate the table.
- **On error**:
  - 413 (JSON or non-JSON): "File too large. Maximum is N MB." — `MAX_UPLOAD_MB` is injected into the page as `window.MAX_UPLOAD_MB` via an inline `<script>` tag in `index.html`: `<script>window.MAX_UPLOAD_MB = {{ max_upload_mb }};</script>`, where `max_upload_mb` is passed to `render_template()` from the `/` route. This ensures N is always available even when the 413 response body is HTML from nginx.
  - 400: "Please upload a .txt log file."
  - 503: "Server is at capacity. Please try again later."
  - Timeout or network error: "Upload failed. Please try again."
- **"Clear Log"** — disabled when no log is loaded; calls `DELETE /api/session/log` when active, resets `allLogs`, clears the table, and reverts status to "No log loaded".

### 5.3 Session Awareness

- On page load, `GET /api/logs` is called immediately.
  - If it returns `{error: "no_log"}`: show empty-state message "Upload a log file to get started". "Clear Log" button is disabled.
  - If it returns logs: populate `allLogs` and render the table as normal. "Clear Log" button is enabled.
- No login UI; the session cookie is managed transparently by the browser.
- If a user refreshes the page within their session TTL, their previously uploaded log is still available.

### 5.4 Unchanged

Everything else is identical to the current implementation:
- Log table columns, row coloring, pagination
- Level / PID / TID / source filters, full-text search
- Error navigation (Prev Error / Next Error)
- Topics sidebar (list view, edit view, groups, drag-and-drop reordering)
- Events editor (dot / Gantt / metric modes)
- Topic Visualization timeline (canvas rendering)
- All keyboard shortcuts

---

## 6. File Structure

```
WebexApp_Log_Viewer/
├── app.py                  # Flask backend (modified)
├── requirements.txt        # + filelock, gunicorn
├── .env.example            # documents env vars
├── sessions/               # created at runtime, gitignored
│   ├── .cleanup.lock       # filelock: one cleanup worker at a time
│   ├── .sessions.lock      # filelock: MAX_SESSIONS check + dir creation
│   └── <session_id>/
│       ├── log.txt
│       └── meta.json
├── templates/
│   └── index.html          # frontend (modified)
├── topics.json             # shared config (format unchanged)
├── .gitignore              # add: sessions/, current_log*.txt
├── README.md               # updated
└── USER_GUIDE.md           # updated
```

Note: `.gitignore` uses the glob `current_log*.txt` to cover the existing `current_log.txt` and `current_log1.txt` files and any future numbered variants.

---

## 7. Deployment

### Development (unchanged)

```sh
pip install -r requirements.txt
python app.py
# → http://localhost:8098
# SECRET_KEY defaults to "dev-secret"; set FLASK_DEBUG=1 to suppress the startup check.
```

`gunicorn` is not needed locally and does not need to be installed for development.

### Production

```sh
export SECRET_KEY="<random-secret>"
export SESSION_DIR="/var/lib/webex-log-viewer/sessions"
export SESSION_TTL_H=24
export MAX_UPLOAD_MB=200
export MAX_SESSIONS=50

# Use sync workers (default). Avoid gevent/eventlet — the cleanup thread
# assumes sync worker semantics and uses os.kill() for PID liveness checks.
gunicorn -w 4 -b 0.0.0.0:8098 app:app
```

- Put **nginx** in front for SSL termination.
- Set nginx `client_max_body_size` to match or exceed `MAX_UPLOAD_MB` (e.g. `client_max_body_size 200m`). If nginx's limit is lower, the user receives an HTML 413 instead of the JSON error — the frontend handles this gracefully.
- `SESSION_DIR` must be writable by the gunicorn process (including its root, for the `.cleanup.pid` file); it is created automatically at startup.
- `SECRET_KEY` is required — app **exits with error** if it is unset or equals `dev-secret`. There is no bypass; `python app.py` direct invocation skips this check, but gunicorn always enforces it.
- Provision disk: at minimum `(MAX_SESSIONS + number_of_workers) × MAX_UPLOAD_MB` (e.g. with 4 workers: 54 × 200 MB ≈ 11 GB) for `SESSION_DIR`. The extra `number_of_workers` accounts for in-flight `.tmp` files during simultaneous uploads.

---

## 8. Error Handling

| Scenario | Backend response | Frontend behaviour |
|----------|-----------------|-------------------|
| No log uploaded yet | `GET /api/logs` → 404 `{"error":"no_log","logs":[],"total":0}` | Empty state: "Upload a log file to get started"; "Clear Log" disabled |
| Session dir missing on `GET /api/logs` | Same 404 as above | Same |
| Upload too large (Flask) | 413 JSON `{"error":"..."}` | "File too large. Maximum is N MB." |
| Upload too large (nginx) | 413 HTML | Same message — frontend handles non-JSON body |
| Upload wrong extension | 400 `{"error":"..."}` | "Please upload a .txt log file." |
| Server at `MAX_SESSIONS` | 503 `{"error":"..."}` | "Server is at capacity. Please try again later." |
| Upload XHR timeout (>120 s) | — | "Upload timed out. Please try again." |
| Upload other error | 500 | "Upload failed. Please try again." |
| `topics.json` concurrent write | Filelock serialises callers | Transparent (brief wait) |
| `GET /api/logs` server error | 500 | Show inline error: "Failed to load log. Please try again." |
| `DELETE /api/session/log` with no log | `{"ok": true}` (idempotent) | Table cleared, status reset, "Clear Log" disabled |

---

## 9. Known Limitations

- **No per-user topic isolation** — all users share `topics.json`. One user's changes are immediately visible to all others.
- **Disk usage** — large log files are stored on the server until the TTL expires or the user clears them. `MAX_SESSIONS` caps concurrent usage but does not prevent a single user uploading many times within a TTL window (each upload overwrites the previous `log.txt`).
- **No authentication** — intended for trusted internal networks only.
- **Cleanup thread uses sync gunicorn workers** — the pidfile-based single-worker cleanup assumes the default `sync` worker type. Using `gevent` or `eventlet` workers is unsupported and may require an external cron job for cleanup instead.
- **Re-parse on every GET /api/logs** — log files are parsed fresh on each request. For very large files (>100 MB) this adds latency. Caching parsed output is a future optimisation outside the scope of this refactor.
- **`current_log.txt`** — the old hardcoded file is no longer used by the app. The single-user workflow of dropping a file into the project directory is intentionally removed in favour of browser upload.
