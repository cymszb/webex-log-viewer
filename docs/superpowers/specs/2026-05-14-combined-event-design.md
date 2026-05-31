# Combined Event Type Design

**Date:** 2026-05-14
**Status:** Reviewed

## Overview

Add a `combined` event type to the Topic Visualization system. A `combined` event is a Gantt span that owns child dot events — single-moment occurrences that are rendered as labeled dots overlaid on the span bar. This allows a topic like "Call/Meeting" to show both the duration of the call (span) and individual moments within it (muted, screen share, network drop) in a single timeline row.

## Data Model

A `combined` event lives in `topic.events[]` alongside existing `dot`, `gantt`, and `metric` entries. It is distinguished by the presence of a non-empty `child_events` array.

```json
{
  "id": "ev-abc",
  "name": "Call / Meeting",
  "start_keywords": ["call started", "meeting start"],
  "end_keywords": ["call ended", "meeting end"],
  "color": "#4db6e8",
  "child_events": [
    { "id": "cev-1", "name": "Muted",        "start_keywords": ["mute on"],         "color": "#f59e0b" },
    { "id": "cev-2", "name": "Screen share", "start_keywords": ["sharing started"], "color": "#a78bfa" },
    { "id": "cev-3", "name": "Network drop", "start_keywords": ["network lost"],    "color": "#f87171" }
  ]
}
```

**Type detection** (extends existing logic in `getEventMode`):
- `child_events` present and non-empty → `combined` (checked first, takes priority over all others)
- `value_regex` set → `metric`
- `end_keywords` non-empty → `gantt`
- otherwise → `dot`

`combined` takes priority even if `value_regex` or other fields are also set (those fields are ignored for a combined event).

**Child event fields:**
| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `id` | string | yes | Unique within the topic |
| `name` | string | yes | Display label above dot |
| `start_keywords` | string[] | yes | Keywords that match a log line |
| `color` | string | yes | Dot color (hex) |

Children have no `end_keywords` or `value_regex` — they are always single-moment dots.

**IDs:** Child event IDs use `'cev-' + Date.now() + '-' + Math.floor(Math.random() * 10000)` to avoid collisions when multiple children are added in quick succession.

## Modal UI

The event inline form (inside the topic edit modal) gains a **"Combined"** option in the event type selector, displayed with a teal badge. When selected:

1. Shows **Name**, **Start keywords**, **End keywords**, **Color** — same as Gantt.
2. Shows a **"Child dot events"** sub-section:
   - Header row with label and **"+ Add child"** button
   - Each child row: colored dot indicator · Name input · Start keywords input · Color swatch · Delete (✕) button
   - "+ Add child" appends a new empty child row
   - Child rows are ordered by insertion order; no drag-to-reorder in v1
   - Deleting all children does not auto-downgrade the type in the UI — the type selector remains "Combined". On save, if `child_events` is empty the event is stored without the `child_events` field (absent, not `[]`), which causes it to be detected as `gantt` on next load.

**No nested modals** — child rows are inline within the existing event form, consistent with current UI patterns.

**Event type badge** in the event list: `combined` shown in teal (`#2dd4bf` on `#062020` background).

## Rendering in Topic Visualization

A `combined` timeline row renders identically to a `gantt` row, with dots overlaid:

1. **Bar** — drawn at the same height, color, and border-radius as a Gantt bar.
2. **Child dot matching** — for each child event, scan **all parsed log lines** (not just lines within a span) for `start_keywords` matches (case-insensitive, same matching logic as existing events). Each match produces a dot at that log line's timestamp. Scanning all lines (not filtering by span containment) is intentional — it keeps the implementation simple and avoids needing to correlate child timestamps to specific span instances.
3. **Dot position** — mapped to the timeline's time axis (same `timeToX` calculation used for gantt/dot events).
4. **Dot appearance** — colored circle (10px, `border: 2px solid` background color for contrast) with the child's `name` as a mini label floating above (8px font, muted color). No overlap avoidance in v1 — dots at nearly identical timestamps may overlap.
5. **Multiple span instances** — when the log contains multiple span instances (multiple start/end pairs), dots from child events are drawn on every span instance at the same relative position. This is a deliberate simplification for v1.
6. **Row label** — the combined event's own `name` (e.g. "Call/Meeting"), same as a Gantt row.

## Export / Import

`child_events` is part of the topic JSON structure and round-trips through the existing export (`topics.json`) and import flow with no special handling. No schema migration needed for existing topics — absent `child_events` is treated as `gantt`/`dot`/`metric` as before.

## Testing

One new Playwright test in `tests/specs/topics.spec.js`:

- **Create combined event** — open topic modal, add a `combined` event with name, start/end keywords, and two child events (each with name, keywords, color). Save. Reopen the modal and verify the combined event appears in the event list with its child events intact (names and keywords preserved).

Timeline rendering is not covered by Playwright tests (visual output only); the modal persistence test is sufficient for regression coverage.

Existing gantt/dot/metric tests are unaffected.

## Files Changed

| File | Change |
|------|--------|
| `index.html` | Add `combined` type detection in `getEventMode`; update modal form to render child event UI when type is `combined`; update timeline rendering to draw labeled dots on `combined` bars; add `combined` badge style |
| `tests/specs/topics.spec.js` | Add combined event create+persist test |

## Out of Scope

- Child events with their own end keywords (nested Gantt spans)
- Child events shared across multiple parent topics
- Clicking a dot to jump to the matching log line (follow-up)
- Dot overlap avoidance when multiple child events fire at the same timestamp (follow-up)
- Drag-to-reorder child events within the modal (follow-up)
