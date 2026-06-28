let audioCtx = null;

function getAudio() {
  if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  return audioCtx;
}

function beep(freq, dur, vol, delay) {
  try {
    const ctx  = getAudio();
    const osc  = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = 'sine';
    osc.frequency.value = freq;
    const t = ctx.currentTime + (delay || 0);
    gain.gain.setValueAtTime(vol, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + dur);
    osc.onended = () => {
      try { osc.disconnect(); } catch (e) {}
      try { gain.disconnect(); } catch (e) {}
    };
    osc.start(t);
    osc.stop(t + dur + 0.02);
  } catch(e) {}
}

/* ── Phase alarms ── */

function playWorkAlarm() {
  /* Two-tone alternating — urgent, classic alarm-clock feel */
  [0, 0.30, 0.60, 0.90, 1.20, 1.50].forEach((t, i) =>
    beep(i % 2 === 0 ? 1047 : 784, 0.25, 0.80, t)
  );
}

function playShortBreakAlarm() {
  /* Quick 3-note ascending chime × 2 — light, "go stretch" */
  [0, 0.80].forEach(t => {
    beep( 880, 0.13, 0.74, t + 0.00);
    beep(1108, 0.13, 0.74, t + 0.17);
    beep(1320, 0.22, 0.74, t + 0.34);
  });
}

function playLongBreakAlarm() {
  /* Triumphant 4-note fanfare with held top notes — "you earned it" */
  beep( 660, 0.11, 0.72, 0.00);
  beep( 880, 0.11, 0.74, 0.14);
  beep(1108, 0.11, 0.74, 0.28);
  beep(1320, 0.42, 0.86, 0.42);
  beep(1047, 0.13, 0.64, 1.04);
  beep(1320, 0.52, 0.82, 1.20);
}

function playAlarm() {
  /* Dispatch by current phase (S/CFG are globals from state.js). */
  if (typeof S === 'undefined') { playWorkAlarm(); return; }
  if (S.phase === 'work') {
    (S.cycleWorkDone >= CFG.sessionsBeforeLong) ? playLongBreakAlarm() : playShortBreakAlarm();
  } else {
    playWorkAlarm();
  }
}

function playClick() { beep(900, 0.06, 0.2, 0); }
