# Architecture Overview

The Webex log viewer is built as a **static-first** platform shell with
independent tools loaded in iframes.

## Design Principles

- **Zero build step** for the platform shell
- **Tool isolation** via iframes
- **Each tool** can use its own tech stack (React, vanilla JS, etc.)
- **Static deployment** on Vercel — no backend required

## Platform Shell

The shell (`shell.html`) provides:

- Left rail navigation on desktop
- Bottom bar navigation on mobile
- Tool routing via query parameters (`?tool=log-viewer`)

## Tool Registry

`tools.json` defines all available tools. Adding a new tool means:

1. Create the tool's entrypoint (e.g., `knowledge-hub/dist/index.html`)
2. Add an entry to `tools.json`
3. Deploy — the shell discovers it automatically
