# TODO

---

## Visual / Animation

- **Overflow timer display**: Add post-zero overflow handling so the timer keeps counting visually after the session ends instead of freezing at `00:00`. Likely treatment: switch to a red accent and count upward without needing a minus sign, plus a compact visual indicator that the session is now past timer.

- **Extract stats helpers**: Refactor the remaining stats-rendering logic out of `ui.js` into a dedicated file/module, similar to the recent `stars.js` extraction, so `index.html` stays thin and the stats/metrics code is easier to evolve.

- **Session control state redesign**: Revisit the `New` / `Stop` / `Reset` / `Next` button states and layout. Candidate options already discussed: contextual left/right buttons, `Reset` becoming `New` when idle, or repurposing both side buttons while paused/alarm-pending without breaking the current visual balance.

- **Old ellipse disk rings**: The original `<ellipse>` disk rings are still in the HTML inside `<g display="none">`. Remove that dead markup once the fan+arc layout is confirmed final.

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

---

## Backend / Accounts (Low Priority)

- **Cloud sync exploration**: Evaluate a free/cheap backend option (`Firebase`, `Supabase`, `Heroku`-style hosting, etc.) for optional OAuth login + cloud-persisted user data.

---

## Memory / Performance

- **Audio node accumulation** (`audio.js`): `beep()` creates an `OscillatorNode` + `GainNode` on every call and schedules `.stop()` but never calls `.disconnect()`. Nodes accumulate in the AudioContext graph. Fix: attach an `osc.onended` handler that calls `osc.disconnect()` and `gain.disconnect()`.

- **Stars RAF gradient allocs** (`stars.js`): Per-frame particle mutation is in-place (no array churn). However, during the eruption flash window the loop calls `ctx.createRadialGradient(...)` and two `.toFixed(3)` string coercions every frame. These are short-lived but worth noting if GC spikes are observed during the erupt phase. Longer-term heap growth (50 MB → 300 MB) is more likely the audio node accumulation above.

- **Alarm interval safety** (`app.js`): `armAlarm()` calls `clearInterval(alarmId)` before arming, and `dismissAlarm()` clears it when `alarmPending` is true. Verify there is no path where `armAlarm()` is called while `alarmId` is already set and `alarmPending` is false (e.g. rapid setAlarmStyle toggle during idle) — the existing guard looks adequate but should be audited.

- **Notification object cleanup** (`ui.js`): `fireNotification()` creates a `Notification` and schedules `n.close()` after 30 s, but does not store `n` for explicit close on `visibilitychange` or page unload. If the page is backgrounded long-term, stale notifications can pile up. Consider storing the last notification reference and closing it before creating a new one.

---

## Notes / Status

- **Semantic versioning**: Start project versioning at `0.1.0` and maintain future updates via semver.

- **Notification policy**: Keep `silent: true`; no background/browser-close alarm sound behavior.

- **Dot persistence**: Keep cycle progress persisted across accidental refresh/reload.

- **GitHub Pages**: Already configured and live; no deployment blocker here.
