Webex Log Viewer
================

A local web app for viewing, filtering, and visualizing Webex client logs.

<img src="3827_1881_2.png" alt="Alt text" height="400">
<img src="1033_1707_2.png" alt="Alt text" height="400">

REQUIREMENTS
------------
- Python 3.9 or later
- pip


INSTALLATION
------------
1. Clone or copy the project folder to your machine.

2. Install dependencies:

   pip install -r requirements.txt


RUNNING THE APP (development)
------------------------------
Start the server:

   python3 app.py

Then open your browser at:

   http://localhost:8098

To run in the background (macOS / Linux):

   python3 app.py > /tmp/flask.log 2>&1 & disown

To stop a background server:

   lsof -ti:8098 | xargs kill -9

To run tests:

   pytest tests/


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


LOADING LOGS
------------
Click **"Upload Log…"** in the toolbar and select a `.txt` Webex log file.
The file is sent to the server, parsed, and displayed immediately.

To clear the loaded log, click **"Clear Log"** in the toolbar.
Your uploaded log persists for your browser session until you clear it or
the server-side TTL (default 24 hours) expires.


FEATURES
--------
- Full-text search, level filter, PID / TID / source filters
- Topic-based regex filtering with named color-coded groups
- Events within topics:
    - Dot mode      — start_keywords match individual log lines (shown as dots)
    - Gantt mode    — start_keywords + end_keywords define lifecycle spans
    - Metric mode   — start_keywords + value_regex extract numeric values and
                      render as a line chart in the Topic Visualization panel
- Topic Visualization panel — timeline showing all events for enabled topics
- Drag-and-drop topic groups; collapsible sidebar


DATA PERSISTENCE
----------------
Topic and event configuration is stored in:

   <project folder>/topics.json

This file is created automatically on first run. Back it up to preserve your
topic/event setup across machines.


PROJECT STRUCTURE
-----------------
app.py            Flask backend — log parsing, topics/events/groups CRUD API,
                  per-session file handling, background session cleanup
templates/
  index.html      Single-page frontend (vanilla JS, no build step required)
requirements.txt  Python dependencies (flask, filelock, gunicorn, python-dotenv)
.env.example      Example environment variable file (copy to .env for local use)
topics.json       Saved topics, groups, and events (auto-created on first run)
tests/
  test_app.py     pytest test suite — run with: pytest tests/
