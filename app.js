/* ── Timer engine ── */

let tickId  = null;
let alarmId = null;
let alarmAutoEndId = null;
let _firstStart = true;

function settlePausedTime() {
  if (!S.pauseStartedAt) return;
  S.pausedMs += Date.now() - S.pauseStartedAt;
  S.pauseStartedAt = null;
}

function startTimer() {
  if (S.running || S.alarmPending) return;
  if (!S._notifRequested && 'Notification' in window && Notification.permission === 'default') {
    S._notifRequested = true;
    Notification.requestPermission().then(updateNotifStatus);
  }
  settlePausedTime();
  if (!S.phaseStartTime) S.phaseStartTime = Date.now();
  S.phaseEndTime = Date.now() + S.remainingSec * 1000;
  S.running = true;
  scheduleTick();
  refreshUI();
}

function pauseTimer() {
  if (!S.running) return;
  S.remainingSec = Math.max(0, Math.ceil((S.phaseEndTime - Date.now()) / 1000));
  S.phaseEndTime = null;
  S.running = false;
  S.pauseStartedAt = Date.now();
  clearTimeout(tickId);
  tickId = null;
  refreshUI();
}

function scheduleTick() {
  clearTimeout(tickId);
  const msLeft      = S.phaseEndTime - Date.now();
  const msToNextSec = msLeft % 1000;
  tickId = setTimeout(tick, msToNextSec > 0 ? msToNextSec : 500);
}

function tick() {
  if (!S.running) return;
  S.remainingSec = Math.max(0, Math.ceil((S.phaseEndTime - Date.now()) / 1000));
  refreshUI();
  if (S.remainingSec <= 0) phaseComplete();
  else scheduleTick();
}

function clearAlarmAutoEnd() {
  clearTimeout(alarmAutoEndId);
  alarmAutoEndId = null;
}

function armAlarmAutoEnd() {
  clearAlarmAutoEnd();
  if (!S.alarmPending || CFG.alarmAutoEndMins <= 0) return;
  alarmAutoEndId = setTimeout(() => {
    if (!S.alarmPending) return;
    dismissAlarm();
    advancePhase();
    refreshUI();
    showToast('Session ended');
  }, CFG.alarmAutoEndMins * 60 * 1000);
}

function recordPartialPhase() {
  if (!S.phaseStartTime) return;
  const elapsed = Math.round((Date.now() - S.phaseStartTime) / 1000);
  if (S.phase === 'work' && elapsed >= 120) {
    dbAdd({
      type: S.phase,
      startTime: S.phaseStartTime,
      endTime: Date.now(),
      plannedDuration: S.totalSec,
      actualDuration: elapsed,
      pausedDuration: Math.round(S.pausedMs / 1000),
      completed: false,
      snoozedFor: 0,
      label: S.currentLabel,
    }).catch(() => {});
  }
}

function endSession() {
  pauseTimer();
  settlePausedTime();

  if (S.alarmPending) {
    dismissAlarm();
    advancePhase();
    refreshUI();
    playClick();
    showToast('Session ended');
    return;
  }

  recordPartialPhase();
  S.phaseStartTime = null;
  S.pauseStartedAt = null;
  S.pausedMs       = 0;
  S.remainingSec   = S.totalSec;
  refreshUI();
  playClick();
  showToast('Session ended');
}

async function phaseComplete() {
  clearTimeout(tickId);
  tickId = null;
  S.running = false;
  S.remainingSec = 0;
  settlePausedTime();
  refreshUI();

  const now   = Date.now();
  const start = S.phaseStartTime || (now - S.totalSec * 1000);
  await dbAdd({
    type:            S.phase,
    startTime:       start,
    endTime:         now,
    plannedDuration: S.totalSec,
    actualDuration:  Math.round((now - start) / 1000),
    pausedDuration:  Math.round(S.pausedMs / 1000),
    completed:       true,
    snoozedFor:      0,
    label:           S.phase === 'work' ? S.currentLabel : '',
  }).catch(() => {});
  S.phaseStartTime = null;
  S.pausedMs = 0;
  S.pauseStartedAt = null;

  if (S.phase === 'work') {
    S.cycleWorkDone++;
    S.totalWorkEver++;
    savePrefs();
    resetLabel();
  }

  if (S.phase === 'work') {
    const isLong = S.cycleWorkDone >= CFG.sessionsBeforeLong;
    fireNotification('🍅 Work session complete!',
      isLong ? 'Time for a long break — you earned it.' : 'Time for a short break.');
  } else {
    fireNotification('⏰ Break over!', 'Ready to get back to it?');
  }

  if (S.advanceMode === 'auto') {
    advancePhase();
    setTimeout(startTimer, 700);
  } else {
    S.alarmPending   = true;
    S.alarmStartTime = Date.now();
    refreshUI();
    playAlarm();
    armAlarm();
    armAlarmAutoEnd();
  }
}

function armAlarm() {
  clearInterval(alarmId);
  const interval = S.alarmStyle === 'snooze' ? CFG.snoozeIntervalSec * 1000 : 2800;
  alarmId = setInterval(() => {
    if (S.alarmPending) playAlarm();
    else { clearInterval(alarmId); alarmId = null; }
  }, interval);
}

function dismissAlarm() {
  if (!S.alarmPending) return;
  S.alarmPending = false;
  clearInterval(alarmId);
  alarmId = null;
  clearAlarmAutoEnd();
  if (S.alarmStartTime) {
    dbPatchLastSnoozed(Math.round((Date.now() - S.alarmStartTime) / 1000));
    S.alarmStartTime = null;
  }
}

/* ── Phase state machine ── */

function advancePhase() {
  if (S.phase === 'work') {
    if (S.cycleWorkDone >= CFG.sessionsBeforeLong) setPhase('long-break');
    else setPhase('short-break');
  } else if (S.phase === 'short-break') {
    setPhase('work');
  } else {
    S.cycleWorkDone = 0;
    setPhase('work');
  }
}

function setPhase(phase) {
  S.phase          = phase;
  S.phaseStartTime = null;
  S.pauseStartedAt = null;
  S.pausedMs       = 0;
  S.alarmStartTime = null;
  clearAlarmAutoEnd();
  S.totalSec       = { 'work': CFG.workMins, 'short-break': CFG.shortBreakMins, 'long-break': CFG.longBreakMins }[phase] * 60;
  S.remainingSec   = S.totalSec;
  refreshUI();
}

/* ── Button handlers ── */

function triggerStarTransition() {
  if (!window.starCollapse) return;
  window.starCollapse();
  setTimeout(() => {
    if (window.starErupt) window.starErupt();
  }, 2650);
}

function onMainBtn() {
  if (S.alarmPending) {
    dismissAlarm();
    advancePhase();
    startTimer();
    playClick();
    triggerStarTransition();
    return;
  }
  if (S.running) { pauseTimer(); playClick(); }
  else {
    startTimer(); playClick();
    if (_firstStart) { _firstStart = false; if (window.starErupt) window.starErupt(); }
  }
}

function resetTimer() {
  pauseTimer();
  settlePausedTime();
  dismissAlarm();
  S.phaseStartTime = null;
  S.pauseStartedAt = null;
  S.pausedMs       = 0;
  S.remainingSec   = S.totalSec;
  refreshUI();
  playClick();
}

function onAuxBtn() {
  if (S.running || S.alarmPending || S.remainingSec < S.totalSec) endSession();
  else resetTimer();
}

function skipPhase() {
  pauseTimer();
  settlePausedTime();
  dismissAlarm();

  recordPartialPhase();
  S.phaseStartTime = null;
  S.pauseStartedAt = null;
  S.pausedMs       = 0;

  if (S.phase === 'work' && S.remainingSec < S.totalSec / 2) {
    S.cycleWorkDone++;
    S.totalWorkEver++;
    savePrefs();
    resetLabel();
  }

  advancePhase();
  startTimer();
  refreshUI();
  playClick();
  triggerStarTransition();
}

/* ── Toggle handlers ── */

function setMode(mode) {
  S.advanceMode = mode;
  document.getElementById('modeManualEl').classList.toggle('on', mode === 'manual');
  document.getElementById('modeAutoEl').classList.toggle('on', mode === 'auto');
  savePrefs();
}

function setAlarmStyle(style) {
  S.alarmStyle = style;
  document.getElementById('alarmSnoozeEl').classList.toggle('on', style === 'snooze');
  document.getElementById('alarmContinuousEl').classList.toggle('on', style === 'continuous');
  if (S.alarmPending) armAlarm();
  savePrefs();
}

function setDotMode(mode) {
  CFG.dotMode = mode;
  document.getElementById('dotCycleEl').classList.toggle('on', mode === 'cycle');
  document.getElementById('dotAllEl').classList.toggle('on', mode === 'all');
  savePrefs();
  renderDots();
}

function setToasts(on) {
  CFG.toastsEnabled = on;
  document.getElementById('toastOnEl').classList.toggle('on',  on);
  document.getElementById('toastOffEl').classList.toggle('on', !on);
  savePrefs();
}

function resetDotCount() {
  S.totalWorkEver = 0;
  S.cycleWorkDone = 0;
  savePrefs();
  renderDots();
  showToast('Dot count reset');
}

/* ── Settings ── */

function applySettings() {
  const clamp = (id, lo, hi) =>
    Math.max(lo, Math.min(hi, parseInt(document.getElementById(id).value) || lo));

  CFG.workMins           = clamp('cfgWork',     1, 120);
  CFG.shortBreakMins     = clamp('cfgShort',    1,  60);
  CFG.longBreakMins      = clamp('cfgLong',     1, 120);
  CFG.sessionsBeforeLong = clamp('cfgSessions', 2,   8);
  CFG.snoozeIntervalSec  = clamp('cfgSnooze',  10, 300);
  CFG.alarmAutoEndMins   = clamp('cfgAutoEnd',  0, 240);

  pauseTimer();
  dismissAlarm();
  S.phaseStartTime = null;
  S.totalSec     = { 'work': CFG.workMins, 'short-break': CFG.shortBreakMins, 'long-break': CFG.longBreakMins }[S.phase] * 60;
  S.remainingSec = S.totalSec;

  savePrefs();
  togglePanel(null);
  refreshUI();
  showToast('Settings applied');
}

/* ── Prefs (localStorage) ── */

function savePrefs() {
  try {
    localStorage.setItem('pomo-prefs-v2', JSON.stringify({
      ...CFG,
      advanceMode:   S.advanceMode,
      alarmStyle:    S.alarmStyle,
      totalWorkEver: S.totalWorkEver,
      cycleWorkDone: S.cycleWorkDone,
    }));
  } catch(e) {}
}

function loadPrefs() {
  try {
    const p = JSON.parse(localStorage.getItem('pomo-prefs-v2') || 'null');
    if (!p) return;
    if (p.workMins != null)           CFG.workMins           = p.workMins;
    if (p.shortBreakMins != null)     CFG.shortBreakMins     = p.shortBreakMins;
    if (p.longBreakMins != null)      CFG.longBreakMins      = p.longBreakMins;
    if (p.sessionsBeforeLong != null) CFG.sessionsBeforeLong = p.sessionsBeforeLong;
    if (p.snoozeIntervalSec != null)  CFG.snoozeIntervalSec  = p.snoozeIntervalSec;
    if (p.alarmAutoEndMins != null)   CFG.alarmAutoEndMins   = p.alarmAutoEndMins;
    if (p.dotMode != null)            CFG.dotMode            = p.dotMode;
    if (p.toastsEnabled != null)      CFG.toastsEnabled      = p.toastsEnabled;
    if (p.totalWorkEver != null)      S.totalWorkEver        = p.totalWorkEver;
    if (p.cycleWorkDone != null)      S.cycleWorkDone        = p.cycleWorkDone;
    if (p.advanceMode)                setMode(p.advanceMode);
    if (p.alarmStyle)                 setAlarmStyle(p.alarmStyle);
    setDotMode(CFG.dotMode);
    setToasts(CFG.toastsEnabled);

    document.getElementById('cfgWork').value     = CFG.workMins;
    document.getElementById('cfgShort').value    = CFG.shortBreakMins;
    document.getElementById('cfgLong').value     = CFG.longBreakMins;
    document.getElementById('cfgSessions').value = CFG.sessionsBeforeLong;
    document.getElementById('cfgSnooze').value   = CFG.snoozeIntervalSec;
    document.getElementById('cfgAutoEnd').value  = CFG.alarmAutoEndMins;
  } catch(e) {}
}

/* ── Keyboard ── */

document.addEventListener('keydown', e => {
  if (e.target.tagName === 'INPUT') return;
  switch (e.key) {
    case ' ': case 'Enter':  e.preventDefault(); onMainBtn(); break;
    case 'n': case 'N':
    case 'ArrowRight':
      if (S.alarmPending) onMainBtn(); else skipPhase(); break;
    case 'r': case 'R':      resetTimer(); break;
    case 'Escape':
      if (S.alarmPending) { endSession(); } break;
  }
});

/* ── Page visibility ── */

document.addEventListener('visibilitychange', () => {
  if (document.hidden) return;
  if (S.running && S.phaseEndTime) {
    S.remainingSec = Math.max(0, Math.ceil((S.phaseEndTime - Date.now()) / 1000));
    if (S.remainingSec <= 0) phaseComplete();
    else { refreshUI(); scheduleTick(); }
  }
  if (S.alarmPending) playAlarm();
});

/* ── Init ── */

async function init() {
  db = await openDB().catch(() => null);
  loadPrefs();
  const labelEl = document.getElementById('sessionLabelEl');
  labelEl.value = DEFAULT_LABEL;
  S.currentLabel = DEFAULT_LABEL;
  setPhase('work');
  updateNotifStatus();
}

init();
