# Changelog

All notable changes to this project will be documented in this file.

## [Unreleased]

### Planned
- Timer recovery and stale-session boundary flow improvements
- Session controls redesign (`New` / `Stop` / `Reset` / `Next`)

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
