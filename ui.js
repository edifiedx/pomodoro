/* ── Ring ── */

function updateRing() {
  const el  = document.getElementById('ringProgEl');
  el.style.strokeDasharray  = RING_CIRC;
  const pct = S.totalSec > 0 ? S.remainingSec / S.totalSec : 0;
  el.style.strokeDashoffset = RING_CIRC * (1 - pct);
  el.style.stroke           = COLORS[S.phase];
}

/* ── Main display ── */

function p2(n) { return String(n).padStart(2, '0'); }

function refreshUI() {
  const m       = Math.floor(S.remainingSec / 60);
  const s       = S.remainingSec % 60;
  const timeStr = `${p2(m)}:${p2(s)}`;

  document.getElementById('timeDisplayEl').textContent = timeStr;

  let status = 'Ready';
  if (S.alarmPending)                       status = 'Click NEXT ↑';
  else if (S.running)                       status = 'Running';
  else if (S.remainingSec < S.totalSec)     status = 'Paused';
  document.getElementById('timeStatusEl').textContent = status;

  const phaseEl = document.getElementById('phaseNameEl');
  phaseEl.textContent = S.phase === 'work'
    ? `Work — Session ${S.cycleWorkDone + 1} / ${CFG.sessionsBeforeLong}`
    : LABELS[S.phase];
  phaseEl.style.color = COLORS[S.phase];

  document.documentElement.style.setProperty('--accent', COLORS[S.phase]);
  document.getElementById('ringWrapEl').classList.toggle('alarm-active', S.alarmPending);
  document.getElementById('mainEl').classList.toggle('running', S.running);

  const btn = document.getElementById('mainBtnEl');
  if (S.alarmPending) {
    btn.textContent = '→ Next';
    btn.classList.add('alarm');
  } else {
    btn.classList.remove('alarm');
    btn.textContent = S.running ? 'Pause'
      : S.remainingSec < S.totalSec ? 'Resume'
      : 'Start';
  }

  renderDots();
  updateRing();

  document.title = (S.running || S.alarmPending)
    ? `${timeStr} · ${LABELS[S.phase]}`
    : 'Pomodoro';
}

function renderDots() {
  const el = document.getElementById('cycleDotsEl');
  el.innerHTML = '';
  const N = CFG.sessionsBeforeLong;

  const mkDot = cls => {
    const d = document.createElement('div');
    d.className = 'dot' + (cls ? ' ' + cls : '');
    return d;
  };
  const mkSep = () => {
    const s = document.createElement('div');
    s.className = 'dot-sep';
    return s;
  };

  if (CFG.dotMode === 'all') {
    const prevComplete = S.totalWorkEver - S.cycleWorkDone;
    for (let i = 0; i < prevComplete; i++) {
      if (i > 0 && i % N === 0) el.appendChild(mkSep());
      el.appendChild(mkDot('done'));
    }
    if (prevComplete > 0) el.appendChild(mkSep());
    for (let i = 0; i < N; i++) {
      if      (i < S.cycleWorkDone)                         el.appendChild(mkDot('done'));
      else if (i === S.cycleWorkDone && S.phase === 'work') el.appendChild(mkDot('active'));
      else                                                   el.appendChild(mkDot());
    }
  } else {
    for (let i = 0; i < N; i++) {
      if      (i < S.cycleWorkDone)                         el.appendChild(mkDot('done'));
      else if (i === S.cycleWorkDone && S.phase === 'work') el.appendChild(mkDot('active'));
      else                                                   el.appendChild(mkDot());
    }
  }
}

/* ── Session label ── */

function onLabelFocus() {
  const el = document.getElementById('sessionLabelEl');
  if (el.value === DEFAULT_LABEL) {
    el.value = '';
    el.classList.remove('is-default');
  }
  el.select();
}

function onLabelBlur() {
  const el  = document.getElementById('sessionLabelEl');
  const val = el.value.trim();
  if (!val) {
    el.value = DEFAULT_LABEL;
    el.classList.add('is-default');
    S.currentLabel = DEFAULT_LABEL;
  } else {
    S.currentLabel = val;
    el.classList.remove('is-default');
  }
}

function resetLabel() {
  const el = document.getElementById('sessionLabelEl');
  el.value = DEFAULT_LABEL;
  el.classList.add('is-default');
  S.currentLabel = DEFAULT_LABEL;
}

/* ── Inline timer editor ── */

function startTimeEdit() {
  if (S.running) return;
  const disp  = document.getElementById('timeDisplayEl');
  const input = document.getElementById('timeInputEl');
  input.value = disp.textContent;
  disp.style.display  = 'none';
  input.style.display = 'block';
  input.focus();
  input.select();
}

function confirmTimeEdit() {
  const disp  = document.getElementById('timeDisplayEl');
  const input = document.getElementById('timeInputEl');
  const secs  = parseTimeStr(input.value);

  if (secs > 0) {
    const maxSec  = S.phase === 'short-break' ? 3600 : 7200;
    const clamped = Math.min(Math.max(secs, 60), maxSec);
    S.totalSec     = clamped;
    S.remainingSec = clamped;
    const mins = Math.round(clamped / 60);
    if (S.phase === 'work') {
      CFG.workMins = mins;
      document.getElementById('cfgWork').value = mins;
    } else if (S.phase === 'short-break') {
      CFG.shortBreakMins = mins;
      document.getElementById('cfgShort').value = mins;
    } else {
      CFG.longBreakMins = mins;
      document.getElementById('cfgLong').value = mins;
    }
    savePrefs();
    showToast(`${LABELS[S.phase]} set to ${formatMins(clamped)}`);
  }

  input.style.display = 'none';
  disp.style.display  = '';
  refreshUI();
}

function timeInputKey(e) {
  if (e.key === 'Enter')  { e.target.blur(); }
  if (e.key === 'Escape') {
    document.getElementById('timeInputEl').style.display  = 'none';
    document.getElementById('timeDisplayEl').style.display = '';
  }
}

function parseTimeStr(str) {
  const parts = str.trim().split(':').map(s => parseInt(s, 10));
  if (parts.some(isNaN)) return 0;
  if (parts.length === 1) return parts[0] * 60;
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  return 0;
}

function formatMins(secs) {
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return s ? `${m}m ${s}s` : `${m}m`;
}

/* ── Browser notifications ── */

async function requestNotifications() {
  if (!('Notification' in window)) {
    showToast('Notifications not supported in this browser');
    return;
  }
  if (Notification.permission === 'granted') {
    showToast('Notifications already enabled');
    updateNotifStatus();
    return;
  }
  const result = await Notification.requestPermission();
  updateNotifStatus();
  if (result === 'granted') showToast('Notifications enabled');
  else showToast('Notifications blocked — check browser settings');
}

function updateNotifStatus() {
  const el = document.getElementById('notifStatusEl');
  if (!('Notification' in window)) {
    el.textContent = 'Not supported';
    el.className   = 'notif-status denied';
    return;
  }
  const p = Notification.permission;
  if (p === 'granted') {
    el.textContent = '✓ Enabled';
    el.className   = 'notif-status granted';
  } else if (p === 'denied') {
    el.textContent = '✗ Blocked';
    el.className   = 'notif-status denied';
  } else {
    el.textContent = 'Enable';
    el.className   = 'notif-status';
  }
}

function fireNotification(title, body) {
  if (!('Notification' in window) || Notification.permission !== 'granted') return;
  const n = new Notification(title, { body, silent: true });
  n.onclick = () => {
    window.focus();
    if (S.alarmPending) { dismissAlarm(); advancePhase(); refreshUI(); }
    n.close();
  };
  setTimeout(() => n.close(), 30000);
}

/* ── Panels ── */

let activePanel = null;

function togglePanel(name) {
  const same = activePanel === name;
  ['stats', 'settings'].forEach(n => document.getElementById(n + 'Panel').classList.remove('open'));
  document.getElementById('statsBtnEl').classList.remove('on');
  document.getElementById('settingsBtnEl').classList.remove('on');
  activePanel = null;
  if (same || !name) return;
  activePanel = name;
  document.getElementById(name + 'Panel').classList.add('open');
  document.getElementById(name === 'stats' ? 'statsBtnEl' : 'settingsBtnEl').classList.add('on');
  if (name === 'stats')    loadStats();
  if (name === 'settings') updateNotifStatus();
}

/* ── Toast ── */

let toastTimer = null;

function showToast(msg, ms = 2500) {
  if (!CFG.toastsEnabled) return;
  const el = document.getElementById('toast');
  el.textContent = msg;
  el.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('show'), ms);
}

/* ── Stats ── */

async function loadStats() {
  const sessions  = await dbGetAll();
  const workDone  = sessions.filter(s => s.type === 'work' && s.completed);
  const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0);
  const ts         = todayStart.getTime();
  const todaySess  = workDone.filter(s => s.startTime >= ts);
  const focusSec   = todaySess.reduce((a, s) => a + s.plannedDuration, 0);

  document.getElementById('sToday').textContent  = todaySess.length;
  document.getElementById('sTotal').textContent  = workDone.length;
  document.getElementById('sFocus').textContent  = focusSec >= 3600
    ? `${(focusSec / 3600).toFixed(1)}h`
    : `${Math.floor(focusSec / 60)}m`;
  document.getElementById('sStreak').textContent = calcStreak(workDone);

  renderChart(workDone);
}

function calcStreak(sessions) {
  if (!sessions.length) return 0;
  const key = ts => { const d = new Date(ts); return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`; };
  const set  = new Set(sessions.map(s => key(s.startTime)));
  let streak = 0;
  for (let i = 0; i < 365; i++) {
    const d = new Date(); d.setDate(d.getDate() - i);
    if (set.has(key(d.getTime()))) streak++;
    else if (i > 0) break;
  }
  return streak;
}

function renderChart(sessions) {
  const el  = document.getElementById('chartBarsEl');
  el.innerHTML = '';
  const DAY = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
  let max    = 1;
  const cols = [];
  for (let i = 6; i >= 0; i--) {
    const d     = new Date(); d.setDate(d.getDate() - i);
    const start = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
    const count = sessions.filter(s => s.startTime >= start && s.startTime < start + 86400000).length;
    if (count > max) max = count;
    cols.push({ count, day: DAY[d.getDay()], today: i === 0 });
  }
  cols.forEach(({ count, day, today }) => {
    const col  = document.createElement('div'); col.className = 'chart-col';
    const area = document.createElement('div'); area.className = 'chart-bar-area';
    const bar  = document.createElement('div'); bar.className = `chart-bar${today ? ' today' : ''}`;
    bar.style.height = `${(count / max) * 100}%`;
    bar.title        = `${count} session${count !== 1 ? 's' : ''}`;
    const lbl  = document.createElement('div'); lbl.className = 'chart-day'; lbl.textContent = day;
    area.appendChild(bar); col.appendChild(area); col.appendChild(lbl);
    el.appendChild(col);
  });
}

async function exportJSON() {
  const sessions = await dbGetAll();
  const blob = new Blob([JSON.stringify(sessions, null, 2)], { type: 'application/json' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href = url; a.download = `pomodoro-${new Date().toISOString().slice(0, 10)}.json`;
  a.click(); URL.revokeObjectURL(url);
}
