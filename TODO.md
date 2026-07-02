# TODO

---

## Visual / Animation

- **Overflow timer display**: Add post-zero overflow handling so the timer keeps counting visually after the session ends instead of freezing at `00:00`. Likely treatment: switch to a red accent and count upward without needing a minus sign, plus a compact visual indicator that the session is now past timer.

- **Extract stats helpers**: Refactor the remaining stats-rendering logic out of `ui.js` into a dedicated file/module, similar to the recent `stars.js` extraction, so `index.html` stays thin and the stats/metrics code is easier to evolve.

- **Session control state redesign**: Revisit the `New` / `Stop` / `Reset` / `Next` button states and layout. Candidate options already discussed: contextual left/right buttons, `Reset` becoming `New` when idle, or repurposing both side buttons while paused/alarm-pending without breaking the current visual balance.

- **Device/window adaptive visuals (low priority)**: Add viewport/device-aware animation tiers. Keep full visuals for desktop skinny-window use, but reduce expensive SVG/filter animation on mobile/small screens to avoid flicker.

---

## Session Recovery / Flow

- **Refresh-safe timer continuity**: Treat refresh/tab reload as a continuation of the same active timer (do not delete progress). Persist enough runtime state (`phase`, `phaseEndTime`, cycle progress, label, etc.) to recover accurately.

- **Expired-while-away behavior**: If a recovered timer is already past zero, do not immediately blast alarm on load. Recover into overflow mode (post-zero counter) and let user resolve through controls.

- **Session boundary control**: Reopening after a configurable timeout should present a clear choice in controls: continue existing cycle progress (short/short/short/long chain) or start a new session cycle.

- **Tie boundary logic to timeout setting**: Reuse/align with the existing timeout concept so one setting defines when an inactive/recovered context is considered stale.

- **Controls redesign pass**: Keep iterating on `New` / `Stop` / `Reset` / `Next` semantics after recovery rules are finalized. Current direction: minimize control sprawl while supporting explicit continue-vs-new decisions.

---

## UI Layout / Structure

- **Stats + settings fit in 1080 without page scrollbar**: Prefer compact layout over browser scroll. Candidate approaches: denser cards, internal sub-tabs/sections (session/day/overall), or split presentation. Avoid global page growth.

- **Changelog visibility**: Use two files: full history in `CHANGELOG.md` + curated rolling feed in `WHATS_NEW.md` for the in-app “What’s New” view.
- **What's New enhancements**: Add per-highlight date stamps and a "since last visit" badge on the header button so users know when new items have appeared since they last opened the panel.
- **Rethink current pause/past-timer visuals**: Current `Pause By Phase` and `Past Timer` implementation is temporary. Redesign after recovery/session-boundary decisions are finalized.

- **Capture pad**: See dedicated spec section below.

- **Data transparency & ownership**: Add a brief visible statement (Settings panel or Stats footer) explaining what is stored locally: session records in IndexedDB, preferences in localStorage, no external servers, no accounts. User owns their data and can export or clear it at any time. Export already exists (JSON); clearing is not yet surfaced in the UI.

---

## Stats Tracking / Analytics

- **Canonical tracked states**: Track and aggregate time in these explicit buckets: `Work`, `Work overflow`, `Break`, `Break overflow`, `Long break`, `Long break overflow`, `Paused`, `Idle`.

- **Current tracking baseline (implemented)**:
	- Persist explicit `overflowType` on session records (going forward)
	- Persist pause intervals as timestamp ranges (`pauseSessions`) in runtime and saved session records
	- Keep legacy `snoozedFor` for duration math and compatibility
	- One-off migration path exists to backfill `overflowType` on old records

- **24h timeline strips**: Add a full-day timeline (00:00 to 24:00) rendered as contiguous colored segments by state. Support per-day view and a rolling 7-day stack of daily strips.

- **Break debt**: Track cumulative break entitlement vs break time actually taken, using configured work:break ratios and session history. Overflow work time (past-timer on work sessions) accrues extra debt. Phase 1 — surface as a stat (e.g. "+14 min owed"). Phase 2 — let the user cash it in: manually extend an upcoming break, or an auto-claim option that silently adds the owed time to the next break's duration. Debt should reset or decay on a configurable boundary (end of day, new session cycle) to avoid it becoming a guilt spiral.

- **Distribution donuts**: Add donut charts for state distribution with ranges: current day and rolling 7 days first; keep room for 30 and 365 day ranges later.

- **Idle visibility toggle**: Add toggle to include/exclude `Idle` time in distribution charts and percentages.

- **Stacked 7-day comparison bars**: Add a stacked bar chart for the rolling 7-day window where each bar is one day and each stack segment is one tracked state bucket (planned replacement for retired legacy "Last 7 Days" bar chart).

- **Overflow-focused chart (exploratory)**: Prototype a dedicated overflow chart comparing base vs overflow load for work/break/long-break (evaluate mirrored-above/below or grouped alternatives).

- **Key summary cards (lightweight)**: Keep cards minimal but include at least:
	- Today's focus minutes (`Work + Work overflow`)
	- Overflow rate (percent of sessions and/or overflow volume; test both)
	- Current session minutes (any active session state excluding idle)

- **Data model prep for analytics**: Ensure session/event records can be segmented into the state buckets above with accurate timestamps for timeline rendering.

- **Retired legacy charts**: Keep the old `Last 7 Days` count bars and `Past Timer By Phase` chart removed while timeline-driven and stacked-state views are being built.

- **Maybe: historical correction tools**: Consider lightweight edit controls for past sessions (especially pause windows) so users can correct accidental long pauses/timeouts after the fact. Keep this optional and explicit.

## Capture Pad

Lightweight scratch list for capturing distractions and follow-ups without breaking flow. Completely opt-in — users who never open it never see it.

### Access

- **`Shift+Enter`** toggles the panel open when no capture pad input is focused. When focused inside an item's text field, `Shift+Enter` inserts a newline instead.
- **Header button** (icon + hover label). Header is getting crowded — icon-only buttons with tooltips is the planned direction; a dedicated pass on the header is needed.

### Panel placement

First tab in the panel system: **Capture Pad → Stats → Settings → What's New**.

### List items

- Each item: checkbox + single-line text input. Hover or focus expands to multiline.
- Typing grows the input to fit content.
- **Enter** → save + create new empty row below + autofocus it (enables rapid-fire entry).
- **Shift+Enter** (when inside item) → insert newline within the item.
- Gripper on the right edge for drag-to-reorder.
- Always one blank row at the bottom for quick capture.
- Context menu per item: **Set as active task** | **Archive** | **Delete**
  - "Set as active task" copies the first line of the item text into `S.currentLabel` (the session label).

### Checkbox and archive behavior

- Checking an item marks it done (strikethrough / dimmed) but it **stays in the active list** — it does not auto-move. Archive is an explicit action.
- Bulk action footer (bottom of panel): **Archive completed** | **Delete completed** | **View archive**
- **Archive view**: replaces the active list, items sorted most-recent-first, context menu per item: **Restore** | **Delete**.

### Persistence

- IndexedDB (reuses existing `pomodoro-v1` infrastructure). Two record states: `active` and `archived`.
- Not intended as long-term storage — auto-purge deferred until usage patterns are clearer.

### Deferred

- **Markdown rendering** in expanded view (plain text first, markdown later).
- **Auto-purge** of old archived items.

---

## Backend / Accounts (Low Priority)

- **Cloud sync exploration**: Evaluate a free/cheap backend option (`Firebase`, `Supabase`, `Heroku`-style hosting, etc.) for optional OAuth login + cloud-persisted user data.

---

## Memory / Performance

- **Stars RAF gradient allocs** (`stars.js`): Per-frame particle mutation is in-place (no array churn). However, during the eruption flash window the loop calls `ctx.createRadialGradient(...)` and two `.toFixed(3)` string coercions every frame. These are short-lived but worth noting if GC spikes are observed during the erupt phase.

- **Alarm interval safety** (`app.js`): `armAlarm()` calls `clearInterval(alarmId)` before arming, and `dismissAlarm()` clears it when `alarmPending` is true. Verify there is no path where `armAlarm()` is called while `alarmId` is already set and `alarmPending` is false (e.g. rapid setAlarmStyle toggle during idle) — the existing guard looks adequate but should be audited.

---

## Notes / Status

- **Semantic versioning**: Start project versioning at `0.1.0` and maintain future updates via semver.

- **Done**: `user-select: none` applied body-wide with input carve-out; drag-selection artifacts resolved.

- **Done**: Removed hidden legacy ellipse disk markup from `index.html`.

- **Done**: Added audio node cleanup in `audio.js` (`osc.disconnect()` / `gain.disconnect()` on ended).

- **Done**: Added notification lifecycle cleanup in `ui.js` (close prior notification, close on visibility return/unload).

- **Done**: Notification permission explainer modal (`ui.js` + `index.html`) — shown on first Start, explains why before requesting browser permission.

- **Done**: Star field FPS cap — 60/30 toggle in Settings, wired to `CFG.starsFps` + timestamp gate in `stars.js`.

- **Done**: Data transparency notice + "Clear all data" button in Settings — explains local-only storage, wipes IndexedDB + localStorage keys on confirm.

- **Done**: What's New date stamps — highlights carry `**YYYY-MM-DD**` dates; "since last visit" amber dot badge on the header button fades once panel is opened.

- **Notification policy**: Keep `silent: true`; no background/browser-close alarm sound behavior.

- **Dot persistence**: Keep cycle progress persisted across accidental refresh/reload.

- **GitHub Pages**: Already configured and live; no deployment blocker here.
