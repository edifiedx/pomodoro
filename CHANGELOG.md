# Changelog

All notable changes to this project will be documented in this file.

## [Unreleased]

### Planned
- Timer recovery and stale-session boundary flow improvements
- Session controls redesign (`New` / `Stop` / `Reset` / `Next`)

## [0.6.1] - 2026-07-01

### Changed
- What's New now groups highlights by release version and date instead of showing one flat dated list
- Curated updates header now shows the latest release version/date as a single release line

## [0.6.0] - 2026-07-01

### Added
- Star field FPS control in Settings (`60`/`30`) persisted via `CFG.starsFps`
- Data transparency notice in Settings plus a destructive `Clear all data` action (IndexedDB + relevant localStorage keys)
- Date-stamped What's New highlights and a "since last visit" badge on the header button

### Changed
- 24h timeline day ordering now renders Today first (top row), then previous days below

### Fixed
- What's New panel open state now clears badge by recording last-visit date and immediately removing indicator

## [0.5.1] - 2026-06-30

### Fixed
- SVG accretion disk `disk-glow` filter now applied once per group instead of per path, reducing GPU filter operations from ~40 to 4 per frame — eliminates video playback interference in other browser tabs when multiple instances are visible simultaneously
- Canvas star field animation now pauses when the tab is hidden

## [0.5.0] - 2026-06-30

### Added
- New stacked `7-Day Overview` chart for state-based daily comparison

### Changed
- Stats panel order updated so the `24h State Timeline` appears above the 7-day overview
- Stats cards/layout refined for better scanning density

## [0.4.0] - 2026-06-29

### Changed
- Long break default increased from 15 to 30 minutes
- "Open Full What's New" action now opens `CHANGELOG.md` as the full history source

## [0.3.0] - 2026-06-28

### Added
- Notification onboarding modal shown on first Start, explaining permissions before requesting them
- Idle alarm auto-end defaulted to 30 minutes
- Data transparency / ownership groundwork in the backlog

### Changed
- `Reset` now resets the session cycle, while `Stop` handles the timer only
- Main alarm/status UI now uses phase-aware labels and snooze countdown text
- Status line and button chrome tightened for better contrast over the accretion disk

## [0.2.0] - 2026-06-28

### Added
- Timer state persists across refresh/reload (running, paused, alarm-pending all restored)
- Overflow clock counts negative time during alarm-pending state
- Notification onboarding modal shown on first Start (explains before requesting)
- Snooze schedule preserved across refresh; first chime syncs to saved schedule

### Changed
- Status text shows Working / Breaking while timer runs
- Status shows live snooze countdown (e.g. `Snooze 00:42`) during alarm-pending
- Main alarm button label replaced with next phase name (Work / Break)
- Skip button tooltip updated to next phase name
- Star cursor influence cleared on window blur, visibility change, and pagehide
- `user-select: none` on body; inputs remain selectable
- Status pill has dark background + text-shadow for legibility over accretion disk
- Notification permission no longer auto-prompted on Start
- Notification status in Settings shows contextual help text per permission state

## [0.1.0] - 2026-06-28

### Added
- Initial pomodoro app with work/short/long phases, cycle dots, and timer controls
- Manual/auto advance modes and alarm style options
- Stats panel, charting, session export, and local persistence
- Animated starfield background and ring-based timer visualization

### Changed
- Refactored starfield animation into standalone file (`stars.js`)
- Added expanded metrics groundwork for past-timer and pause analysis
