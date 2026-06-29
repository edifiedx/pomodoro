# Pomodoro

A focused, no-nonsense Pomodoro timer with a black-hole aesthetic.

**[Live app →](https://edifiedx.github.io/pomodoro/)**

---

## Why this exists

This project is built around an ADHD-first workflow.

Typical pomodoro tools often assume strong task-list coupling (pick task, run timer, check off task, repeat). That model does not always fit how focus actually works for me, so this timer is designed to support attention and re-entry first, with task metadata optional.

The visuals are intentional, not decorative:

- They make the tool rewarding to keep open while working.
- They increase return-to-tool behavior between focus blocks.
- They provide a small, positive incentive loop so the timer feels like part of the workflow instead of friction.

---

## Features

- **Work / short break / long break** phases with configurable durations
- **Cycle tracking** — dots mark your progress through each work cycle
- **Manual and auto-advance** modes
- **Session labels** — tag what you're working on
- **Alarm styles** — snooze (repeating reminder) or continuous
- **End idle alarm** — configurable timeout to auto-advance when you're away
- **Stats panel** — streak, focus time, past-timer overrun, pause totals, 7-day chart
- **Phase-level metrics** — per-phase breakdown of on-time vs past-timer and pause duration
- **Session export** — download your history as JSON
- **What's New panel** — curated in-app changelog
- **Animated starfield** — cursor-interactive star orbits; collapse/erupt on phase transitions
- **Persistent state** — settings and cycle progress survive accidental page refresh

---

## Files

| File | Purpose |
|---|---|
| `index.html` | Markup, styles, SVG ring/disk |
| `state.js` | Shared runtime state (`S`) and config (`CFG`) |
| `app.js` | Timer engine, phase state machine, button handlers |
| `ui.js` | Display refresh, stats panel, panels, toast |
| `audio.js` | Web Audio alarm and click sounds |
| `db.js` | IndexedDB session persistence |
| `stars.js` | Canvas starfield animation |
| `CHANGELOG.md` | Full version history |
| `WHATS_NEW.md` | Curated in-app update feed |

---

## Running locally

No build step — open `index.html` directly in a browser, or serve with any static file server:

```bash
npx serve .
# or
python -m http.server
```

---

## Keyboard shortcuts

| Key | Action |
|---|---|
| `Space` / `Enter` | Start / Pause / Resume |
| `N` / `→` | Next phase (or dismiss alarm) |
| `R` | Reset current phase |
| `Escape` | End session (during alarm) |

---

## Versioning

This project uses [semantic versioning](https://semver.org). See [CHANGELOG.md](CHANGELOG.md) for the full history.

Current version: **0.3.0**
