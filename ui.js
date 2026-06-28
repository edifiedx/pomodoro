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
  const auxBtn = document.getElementById('auxBtnEl');
  if (S.alarmPending) {
    btn.textContent = '→ Next';
    btn.classList.add('alarm');
  } else {
    btn.classList.remove('alarm');
    btn.textContent = S.running ? 'Pause'
      : S.remainingSec < S.totalSec ? 'Resume'
      : 'Start';
  }

  if (auxBtn) {
    if (S.running || S.alarmPending || S.remainingSec < S.totalSec) {
      auxBtn.textContent = '■';
      auxBtn.title = S.alarmPending ? 'End session' : 'Stop session';
    } else {
      auxBtn.textContent = '↺';
      auxBtn.title = 'Reset (R)';
    }
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
let whatsNewCache = null;

function pushListItem(listEl, text) {
  if (!listEl) return;
  const li = document.createElement('li');
  li.className = 'wn-item';
  li.textContent = text;
  listEl.appendChild(li);
}

function renderWhatsNew(data) {
  const versionEl = document.getElementById('wnVersion');
  const highlightsEl = document.getElementById('wnHighlights');
  const nextUpEl = document.getElementById('wnNextUp');
  if (!versionEl || !highlightsEl || !nextUpEl) return;

  versionEl.textContent = `v${data.version || '0.1.0'}`;
  highlightsEl.innerHTML = '';
  nextUpEl.innerHTML = '';

  if (!data.highlights.length) {
    const msg = document.createElement('div');
    msg.className = 'wn-empty';
    msg.textContent = 'No highlights yet.';
    highlightsEl.appendChild(msg);
  } else {
    data.highlights.forEach(item => pushListItem(highlightsEl, item));
  }

  if (!data.nextUp.length) {
    const msg = document.createElement('div');
    msg.className = 'wn-empty';
    msg.textContent = 'No upcoming items listed.';
    nextUpEl.appendChild(msg);
  } else {
    data.nextUp.forEach(item => pushListItem(nextUpEl, item));
  }
}

function parseWhatsNewMarkdown(md) {
  const lines = md.split(/\r?\n/);
  const parsed = { version: '0.1.0', highlights: [], nextUp: [] };
  let section = '';

  for (const raw of lines) {
    const line = raw.trim();
    if (!line) continue;
    if (line.startsWith('## ')) {
      const head = line.slice(3).toLowerCase();
      if (head === 'current version') section = 'version';
      else if (head === 'highlights') section = 'highlights';
      else if (head === 'next up') section = 'nextUp';
      else section = '';
      continue;
    }
    if (section === 'version' && !line.startsWith('-')) {
      parsed.version = line.replace(/^v/i, '');
      continue;
    }
    if (line.startsWith('- ')) {
      const item = line.slice(2).trim();
      if (!item) continue;
      if (section === 'highlights') parsed.highlights.push(item);
      if (section === 'nextUp') parsed.nextUp.push(item);
    }
  }

  return parsed;
}

async function loadWhatsNew() {
  if (whatsNewCache) {
    renderWhatsNew(whatsNewCache);
    return;
  }
  try {
    const res = await fetch('WHATS_NEW.md', { cache: 'no-store' });
    if (!res.ok) throw new Error('fetch failed');
    const md = await res.text();
    whatsNewCache = parseWhatsNewMarkdown(md);
  } catch (e) {
    whatsNewCache = {
      version: '0.1.0',
      highlights: ['Could not load WHATS_NEW.md in this environment.'],
      nextUp: ['Open the WHATS_NEW.md file directly for details.'],
    };
  }
  renderWhatsNew(whatsNewCache);
}

function togglePanel(name) {
  const same = activePanel === name;
  ['stats', 'settings', 'whatsnew'].forEach(n => document.getElementById(n + 'Panel').classList.remove('open'));
  document.getElementById('whatsNewBtnEl').classList.remove('on');
  document.getElementById('statsBtnEl').classList.remove('on');
  document.getElementById('settingsBtnEl').classList.remove('on');
  activePanel = null;
  if (same || !name) return;
  activePanel = name;
  document.getElementById(name + 'Panel').classList.add('open');
  if (name === 'stats') document.getElementById('statsBtnEl').classList.add('on');
  if (name === 'settings') document.getElementById('settingsBtnEl').classList.add('on');
  if (name === 'whatsnew') document.getElementById('whatsNewBtnEl').classList.add('on');
  if (name === 'stats')    loadStats();
  if (name === 'settings') updateNotifStatus();
  if (name === 'whatsnew') loadWhatsNew();
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

function formatDelay(secs) {
  if (!secs) return '0s';
  if (secs < 60) return `${secs}s`;
  const mins = Math.floor(secs / 60);
  const rem  = secs % 60;
  if (!rem) return `${mins}m`;
  return `${mins}m ${rem}s`;
}

function formatPhaseLabel(type) {
  return type === 'work' ? 'Work'
    : type === 'short-break' ? 'Short'
    : 'Long';
}

function renderDelayBreakdown(sessions) {
  const el = document.getElementById('delayBreakdownEl');
  if (!el) return;
  el.innerHTML = '';

  const rows = ['work', 'short-break', 'long-break'];

  rows.forEach(key => {
    const label = formatPhaseLabel(key);
    const phaseSessions = sessions.filter(s => s.type === key);
    const total = phaseSessions.length;
    const pastTimer = phaseSessions.filter(s => (s.snoozedFor || 0) > 0).length;
    const onTime = Math.max(0, total - pastTimer);
    const pastTimerPct = total ? (pastTimer / total) * 100 : 0;
    const onTimePct = total ? (onTime / total) * 100 : 0;

    const row = document.createElement('div');
    row.className = 'delay-row';

    const phase = document.createElement('div');
    phase.className = 'delay-phase';
    phase.textContent = label;

    const track = document.createElement('div');
    track.className = 'delay-track';
    track.title = total
      ? `${label}: ${pastTimer} past timer / ${total} total`
      : `${label}: no completed sessions yet`;

    const onTimeFill = document.createElement('div');
    onTimeFill.className = 'delay-fill-ontime';
    onTimeFill.style.width = `${onTimePct}%`;

    const delayedFill = document.createElement('div');
    delayedFill.className = 'delay-fill-delayed';
    delayedFill.style.width = `${pastTimerPct}%`;

    track.appendChild(onTimeFill);
    track.appendChild(delayedFill);

    const meta = document.createElement('div');
    meta.className = 'delay-meta';
    meta.textContent = total ? `${pastTimer}/${total}` : '0/0';

    row.appendChild(phase);
    row.appendChild(track);
    row.appendChild(meta);
    el.appendChild(row);
  });
}

function renderPauseBreakdown(sessions) {
  const el = document.getElementById('pauseBreakdownEl');
  if (!el) return;
  el.innerHTML = '';

  const rows = ['work', 'short-break', 'long-break'];
  const totals = rows.map(key =>
    sessions
      .filter(s => s.type === key)
      .reduce((sum, s) => sum + (s.pausedDuration || 0), 0)
  );
  const maxTotal = Math.max(1, ...totals);

  rows.forEach((key, index) => {
    const label = formatPhaseLabel(key);
    const pausedSec = totals[index];
    const widthPct = (pausedSec / maxTotal) * 100;

    const row = document.createElement('div');
    row.className = 'delay-row';

    const phase = document.createElement('div');
    phase.className = 'delay-phase';
    phase.textContent = label;

    const track = document.createElement('div');
    track.className = 'delay-track';
    track.title = `${label}: ${formatDelay(pausedSec)} paused`;

    const fill = document.createElement('div');
    fill.className = 'pause-fill';
    fill.style.width = `${widthPct}%`;
    track.appendChild(fill);

    const meta = document.createElement('div');
    meta.className = 'delay-meta';
    meta.textContent = formatDelay(pausedSec);

    row.appendChild(phase);
    row.appendChild(track);
    row.appendChild(meta);
    el.appendChild(row);
  });
}

/* ── Stats ── */

async function loadStats() {
  const sessions  = await dbGetAll();
  const workDone  = sessions.filter(s => s.type === 'work' && s.completed);
  const completed = sessions.filter(s => s.completed);
  const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0);
  const ts         = todayStart.getTime();
  const todaySess  = workDone.filter(s => s.startTime >= ts);
  const focusSec   = todaySess.reduce((a, s) => a + s.plannedDuration, 0);
  const todayCompleted = completed.filter(s => s.startTime >= ts);
  const pastTimerTodaySec = todayCompleted.reduce((a, s) => a + (s.snoozedFor || 0), 0);
  const pastTimerSessions = completed.filter(s => (s.snoozedFor || 0) > 0);
  const avgPastTimerSec   = pastTimerSessions.length
    ? Math.round(pastTimerSessions.reduce((a, s) => a + s.snoozedFor, 0) / pastTimerSessions.length)
    : 0;
  const todaySessions = sessions.filter(s => s.startTime >= ts);
  const pauseTodaySec = todaySessions.reduce((a, s) => a + (s.pausedDuration || 0), 0);
  const pausedSessions = sessions.filter(s => (s.pausedDuration || 0) > 0);
  const avgPauseSec    = pausedSessions.length
    ? Math.round(pausedSessions.reduce((a, s) => a + s.pausedDuration, 0) / pausedSessions.length)
    : 0;

  document.getElementById('sToday').textContent  = todaySess.length;
  document.getElementById('sTotal').textContent  = workDone.length;
  document.getElementById('sFocus').textContent  = focusSec >= 3600
    ? `${(focusSec / 3600).toFixed(1)}h`
    : `${Math.floor(focusSec / 60)}m`;
  document.getElementById('sStreak').textContent = calcStreak(workDone);
  document.getElementById('sPastTimerToday').textContent = formatDelay(pastTimerTodaySec);
  document.getElementById('sPastTimerAvg').textContent   = formatDelay(avgPastTimerSec);
  document.getElementById('sPauseToday').textContent     = formatDelay(pauseTodaySec);
  document.getElementById('sPauseAvg').textContent       = formatDelay(avgPauseSec);

  renderChart(workDone);
  renderDelayBreakdown(completed);
  renderPauseBreakdown(sessions);
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
