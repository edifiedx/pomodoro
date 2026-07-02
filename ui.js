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
  const overflowSec = S.alarmPending && S.alarmStartTime
    ? Math.max(0, Math.floor((Date.now() - S.alarmStartTime) / 1000))
    : 0;
  const signedSec = S.alarmPending ? -overflowSec : S.remainingSec;
  const absSec = Math.abs(signedSec);
  const m = Math.floor(absSec / 60);
  const s = absSec % 60;
  const timeStr = `${signedSec < 0 ? '-' : ''}${p2(m)}:${p2(s)}`;

  document.getElementById('timeDisplayEl').textContent = timeStr;

  const nextName = S.phase === 'work' ? 'Break' : 'Work';
  let status = 'Ready';
  if (S.alarmPending) {
    if (S.alarmStyle === 'snooze') {
      const secToSnooze = Math.max(0, Math.ceil(((S.nextAlarmAt || Date.now()) - Date.now()) / 1000));
      status = `Snooze ${p2(Math.floor(secToSnooze / 60))}:${p2(secToSnooze % 60)}`;  
    } else {
      status = 'Alarm sounding';
    }
  }
  else if (S.running)                       status = S.phase === 'work' ? 'Working' : 'Breaking';
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
  const skipBtn = document.getElementById('skipBtnEl');

  if (skipBtn) {
    skipBtn.title = `${nextName} (N / →)`;
  }

  if (S.alarmPending) {
    btn.textContent = nextName;
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
      auxBtn.title = 'Reset sessions (R)';
    }
  }

  renderDots();
  updateRing();

  document.title = (S.running || S.alarmPending)
    ? `${timeStr} · ${LABELS[S.phase]}`
    : 'Pomodoro';

  if (typeof persistRuntimeState === 'function') persistRuntimeState();
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

/* ── Notification onboarding modal ── */

const NOTIF_PROMPTED_KEY = 'pomo-notif-prompted';

function shouldShowNotifModal() {
  if (!('Notification' in window)) return false;
  if (!window.isSecureContext) return false;
  if (Notification.permission !== 'default') return false;
  return !localStorage.getItem(NOTIF_PROMPTED_KEY);
}

function showNotifModal() {
  document.getElementById('notifModalEl').classList.add('open');
}

async function dismissNotifModal(enable) {
  document.getElementById('notifModalEl').classList.remove('open');
  localStorage.setItem(NOTIF_PROMPTED_KEY, '1');
  if (enable) {
    const result = await Notification.requestPermission();
    updateNotifStatus();
    if (result === 'granted') showToast('Notifications enabled');
    else showToast('Notifications blocked — check browser settings');
  }
}

/* ── Browser notifications ── */

async function requestNotifications() {
  if (!('Notification' in window)) {
    showToast('Notifications not supported in this browser');
    updateNotifStatus();
    return;
  }
  if (!window.isSecureContext) {
    showToast('Notifications require https:// or localhost');
    updateNotifStatus();
    return;
  }
  if (Notification.permission === 'granted') {
    showToast('Notifications already enabled');
    updateNotifStatus();
    return;
  }
  if (Notification.permission === 'denied') {
    showToast('Notifications blocked in browser site settings');
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
  const help = document.getElementById('notifHelpEl');
  if (!('Notification' in window)) {
    el.textContent = 'Not supported';
    el.className   = 'notif-status denied';
    el.disabled = true;
    if (help) help.textContent = 'This browser does not support desktop notifications.';
    return;
  }
  if (!window.isSecureContext) {
    el.textContent = 'Unavailable';
    el.className = 'notif-status denied';
    el.disabled = true;
    if (help) help.textContent = 'Desktop notifications require https:// or localhost. file:// pages cannot keep notification permission.';
    return;
  }
  el.disabled = false;
  const p = Notification.permission;
  if (p === 'granted') {
    el.textContent = '✓ Enabled';
    el.className   = 'notif-status granted';
    if (help) help.textContent = 'Allowed for this site in your browser settings and should persist across refreshes.';
  } else if (p === 'denied') {
    el.textContent = '✗ Blocked';
    el.className   = 'notif-status denied';
    if (help) help.textContent = 'Blocked by browser site settings. Re-enable it there to receive desktop alerts.';
  } else {
    el.textContent = 'Enable';
    el.className   = 'notif-status';
    if (help) help.textContent = 'Not enabled yet. Click Enable to allow desktop alerts for completed sessions.';
  }
}

let lastNotification = null;

function closeLastNotification() {
  if (!lastNotification) return;
  try { lastNotification.close(); } catch (e) {}
  lastNotification = null;
}

function fireNotification(title, body) {
  if (!('Notification' in window) || Notification.permission !== 'granted') return;
  closeLastNotification();
  const n = new Notification(title, { body, silent: true });
  lastNotification = n;
  n.onclick = () => {
    window.focus();
    if (S.alarmPending) { dismissAlarm(); advancePhase(); refreshUI(); }
    if (lastNotification === n) lastNotification = null;
    n.close();
  };
  setTimeout(() => {
    if (lastNotification === n) lastNotification = null;
    n.close();
  }, 30000);
}

document.addEventListener('visibilitychange', () => {
  if (!document.hidden) closeLastNotification();
});

window.addEventListener('beforeunload', closeLastNotification);

/* ── Panels ── */

let activePanel = null;
let whatsNewCache = null;

const WN_LAST_VISIT_KEY = 'pomo-wn-last-visit';

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
    data.highlights.forEach(item => {
      const li = document.createElement('li');
      li.className = 'wn-item';
      if (item.date) {
        const d = document.createElement('span');
        d.className = 'wn-date';
        d.textContent = item.date;
        li.appendChild(d);
      }
      li.appendChild(document.createTextNode(item.text));
      highlightsEl.appendChild(li);
    });
  }

  if (!data.nextUp.length) {
    const msg = document.createElement('div');
    msg.className = 'wn-empty';
    msg.textContent = 'No upcoming items listed.';
    nextUpEl.appendChild(msg);
  } else {
    data.nextUp.forEach(text => {
      const li = document.createElement('li');
      li.className = 'wn-item';
      li.textContent = text;
      nextUpEl.appendChild(li);
    });
  }
}

function parseWhatsNewMarkdown(md) {
  const DATE_RE = /^\*\*(\d{4}-\d{2}-\d{2})\*\*\s*/;
  const lines = md.split(/\r?\n/);
  const parsed = { version: '0.1.0', highlights: [], nextUp: [], latestDate: null };
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
      const rawItem = line.slice(2).trim();
      if (!rawItem) continue;
      if (section === 'highlights') {
        const m = rawItem.match(DATE_RE);
        const date = m ? m[1] : null;
        const text = m ? rawItem.slice(m[0].length) : rawItem;
        parsed.highlights.push({ date, text });
        if (date && (!parsed.latestDate || date > parsed.latestDate)) parsed.latestDate = date;
      }
      if (section === 'nextUp') parsed.nextUp.push(rawItem);
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
      version: '0.1.0', latestDate: null,
      highlights: [{ date: null, text: 'Could not load WHATS_NEW.md in this environment.' }],
      nextUp: ['Open the WHATS_NEW.md file directly for details.'],
    };
  }
  renderWhatsNew(whatsNewCache);
}

async function checkWhatsNewBadge() {
  try {
    if (!whatsNewCache) {
      const res = await fetch('WHATS_NEW.md', { cache: 'no-store' });
      if (!res.ok) return;
      whatsNewCache = parseWhatsNewMarkdown(await res.text());
    }
    const lastVisit = localStorage.getItem(WN_LAST_VISIT_KEY);
    if (whatsNewCache.latestDate && (!lastVisit || lastVisit < whatsNewCache.latestDate)) {
      document.getElementById('whatsNewBtnEl').classList.add('has-badge');
    }
  } catch (e) {}
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
  if (name === 'whatsnew') {
    localStorage.setItem(WN_LAST_VISIT_KEY, new Date().toISOString().slice(0, 10));
    document.getElementById('whatsNewBtnEl').classList.remove('has-badge');
    loadWhatsNew();
  }
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

/* ── Stats ── */

async function loadStats() {
  const sessions  = await dbGetAll();
  const workDone  = sessions.filter(s => s.type === 'work' && s.completed);
  const completed = sessions.filter(s => s.completed);
  const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0);
  const ts         = todayStart.getTime();
  const todaySess  = workDone.filter(s => s.startTime >= ts);
  const focusSec   = todaySess.reduce((a, s) => a + (s.actualDuration || 0) + (s.snoozedFor || 0), 0);
  const pastTimerSessions = completed.filter(s => (s.snoozedFor || 0) > 0);
  const overflowRatePct = completed.length
    ? Math.round((pastTimerSessions.length / completed.length) * 100)
    : 0;

  let currentSessionSec = 0;
  if (S.phaseStartTime) {
    currentSessionSec = Math.max(0, Math.round((Date.now() - S.phaseStartTime) / 1000));
  } else if (S.alarmPending && S.alarmStartTime) {
    currentSessionSec = Math.max(0, Math.round((Date.now() - S.alarmStartTime) / 1000));
  }

  document.getElementById('sFocus').textContent         = focusSec >= 3600
    ? `${(focusSec / 3600).toFixed(1)}h`
    : `${Math.floor(focusSec / 60)}m`;
  document.getElementById('sOverflowRate').textContent  = `${overflowRatePct}%`;
  document.getElementById('sCurrentSession').textContent = currentSessionSec >= 3600
    ? `${(currentSessionSec / 3600).toFixed(1)}h`
    : `${Math.floor(currentSessionSec / 60)}m`;
  document.getElementById('sToday').textContent         = todaySess.length;
  document.getElementById('sStreak').textContent        = calcStreak(workDone);
  document.getElementById('sTotal').textContent         = workDone.length;

  renderSevenDayBars(sessions);
  renderTimelineStrips(sessions);
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

function formatClock(ts) {
  const d = new Date(ts);
  return `${p2(d.getHours())}:${p2(d.getMinutes())}`;
}

function normalizeStateClass(state) {
  return `s-${state.replace(/[^a-z0-9]+/g, '-')}`;
}

function timelineStateLabel(state) {
  if (state === 'work') return 'Work';
  if (state === 'work-overflow') return 'Work Overflow';
  if (state === 'short-break') return 'Break';
  if (state === 'short-break-overflow') return 'Break Overflow';
  if (state === 'long-break') return 'Long Break';
  if (state === 'long-break-overflow') return 'Long Break Overflow';
  if (state === 'paused') return 'Paused';
  return 'Idle';
}

let timelineIncludeIdle = true;
let timelineSessionsCache = [];

function updateTimelineIdleToggle() {
  const btn = document.getElementById('timelineIdleToggleEl');
  if (!btn) return;
  btn.textContent = timelineIncludeIdle ? 'Hide Idle' : 'Show Idle';
  btn.classList.toggle('off', !timelineIncludeIdle);
}

function toggleTimelineIdle() {
  timelineIncludeIdle = !timelineIncludeIdle;
  updateTimelineIdleToggle();
  renderTimelineStrips(timelineSessionsCache);
}

function buildDayTimelineSegments(sessions, dayStart, dayEnd) {
  const raw = [];

  sessions.forEach(s => {
    const start = s.startTime;
    const end = s.endTime;
    if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) return;
    if (end <= dayStart || start >= dayEnd) return;

    raw.push({
      state: s.type,
      start: Math.max(start, dayStart),
      end: Math.min(end, dayEnd),
      session: s,
    });

    const overflowSec = s.snoozedFor || 0;
    if (overflowSec > 0 && Number.isFinite(s.endTime)) {
      const ovStart = s.endTime;
      const ovEnd = s.endTime + overflowSec * 1000;
      if (ovEnd > dayStart && ovStart < dayEnd) {
        raw.push({
          state: s.overflowType || `${s.type}-overflow`,
          start: Math.max(ovStart, dayStart),
          end: Math.min(ovEnd, dayEnd),
          session: s,
        });
      }
    }
  });

  raw.sort((a, b) => a.start - b.start || a.end - b.end);

  const out = [];
  let cursor = dayStart;
  for (const seg of raw) {
    if (seg.start > cursor) {
      out.push({ state: 'idle', start: cursor, end: seg.start, session: null });
    }
    const start = Math.max(cursor, seg.start);
    if (seg.end > start) {
      out.push({ state: seg.state, start, end: seg.end, session: seg.session });
      cursor = seg.end;
    }
  }
  if (cursor < dayEnd) out.push({ state: 'idle', start: cursor, end: dayEnd, session: null });

  return out;
}

function renderSevenDayBars(sessions) {
  const barsEl   = document.getElementById('sevenDayBarsEl');
  const labelsEl = document.getElementById('sevenDayLabelsEl');
  if (!barsEl || !labelsEl) return;
  barsEl.innerHTML   = '';
  labelsEl.innerHTML = '';

  const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const DAY_MS    = 24 * 60 * 60 * 1000;
  const TRACK_H   = 64;

  const STATE_ORDER = [
    'work', 'work-overflow',
    'short-break', 'short-break-overflow',
    'long-break', 'long-break-overflow',
    'paused',
  ];
  const STATE_COLORS = {
    'work':                 '#F0A030',
    'work-overflow':        '#A66E16',
    'short-break':          '#5BA8D4',
    'short-break-overflow': '#3D7394',
    'long-break':           '#4AA870',
    'long-break-overflow':  '#326E49',
    'paused':               '#8C7BBF',
  };

  const days = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const dayStart = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
    const segs     = buildDayTimelineSegments(sessions, dayStart, dayStart + DAY_MS);
    const totals   = {};
    let totalSec   = 0;
    for (const seg of segs) {
      if (seg.state === 'idle') continue;
      const sec = Math.max(0, Math.round((seg.end - seg.start) / 1000));
      totals[seg.state] = (totals[seg.state] || 0) + sec;
      totalSec += sec;
    }
    days.push({ label: DAY_NAMES[d.getDay()], totals, totalSec, isToday: i === 0 });
  }

  const maxSec = Math.max(...days.map(d => d.totalSec), 1);

  const tipEl   = document.getElementById('timelineTipEl');
  const showTip = (ev, text) => {
    if (!tipEl) return;
    tipEl.textContent  = text;
    tipEl.style.display = 'block';
    const x = Math.min(window.innerWidth  - tipEl.offsetWidth  - 10, ev.clientX + 14);
    const y = Math.min(window.innerHeight - tipEl.offsetHeight - 10, ev.clientY + 14);
    tipEl.style.left = `${Math.max(10, x)}px`;
    tipEl.style.top  = `${Math.max(10, y)}px`;
  };
  const hideTip = () => { if (tipEl) tipEl.style.display = 'none'; };

  for (const day of days) {
    const barH = Math.round((day.totalSec / maxSec) * TRACK_H);

    const wrap = document.createElement('div');
    wrap.className = 'sevenday-bar-wrap' + (day.isToday ? ' today' : '');

    if (barH > 0) {
      const bar = document.createElement('div');
      bar.className    = 'sevenday-bar';
      bar.style.height = barH + 'px';

      let bottom = 0;
      for (const state of STATE_ORDER) {
        const sec = day.totals[state] || 0;
        if (!sec) continue;
        const segH = Math.max(1, Math.round((sec / day.totalSec) * barH));
        const seg  = document.createElement('div');
        seg.className       = 'sevenday-seg';
        seg.style.background = STATE_COLORS[state];
        seg.style.bottom    = bottom + 'px';
        seg.style.height    = segH + 'px';
        const tipText = `${timelineStateLabel(state)}\n${formatDelay(sec)}`;
        seg.addEventListener('mouseenter', e => showTip(e, tipText));
        seg.addEventListener('mousemove',  e => showTip(e, tipText));
        seg.addEventListener('mouseleave', hideTip);
        bar.appendChild(seg);
        bottom += segH;
      }

      wrap.appendChild(bar);
    }

    barsEl.appendChild(wrap);

    const lbl = document.createElement('div');
    lbl.className   = 'sevenday-day' + (day.isToday ? ' today' : '');
    lbl.textContent = day.label;
    labelsEl.appendChild(lbl);
  }
}

function renderTimelineStrips(sessions) {
  timelineSessionsCache = Array.isArray(sessions) ? sessions : [];
  const wrap = document.getElementById('timelineStripsEl');
  const tip = document.getElementById('timelineTipEl');
  if (!wrap || !tip) return;

  wrap.innerHTML = '';
  tip.style.display = 'none';
  updateTimelineIdleToggle();

  const DAY = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const DAY_MS = 24 * 60 * 60 * 1000;

  const showTip = (ev, text) => {
    tip.textContent = text;
    tip.style.display = 'block';
    const x = Math.min(window.innerWidth - tip.offsetWidth - 10, ev.clientX + 14);
    const y = Math.min(window.innerHeight - tip.offsetHeight - 10, ev.clientY + 14);
    tip.style.left = `${Math.max(10, x)}px`;
    tip.style.top = `${Math.max(10, y)}px`;
  };
  const hideTip = () => { tip.style.display = 'none'; };

  for (let i = 0; i <= 6; i++) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const dayStart = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
    const dayEnd = dayStart + DAY_MS;

    const row = document.createElement('div');
    row.className = 'timeline-row';

    const day = document.createElement('div');
    day.className = 'timeline-day';
    day.textContent = DAY[d.getDay()];

    const track = document.createElement('div');
    track.className = 'timeline-track';

    const segments = buildDayTimelineSegments(timelineSessionsCache, dayStart, dayEnd);
    const renderSegments = timelineIncludeIdle
      ? segments
      : segments.filter(seg => seg.state !== 'idle');

    const activeTotalMs = !timelineIncludeIdle
      ? renderSegments.reduce((sum, seg) => sum + Math.max(0, seg.end - seg.start), 0)
      : 0;
    let activeCursor = 0;

    renderSegments.forEach(seg => {
      const segEl = document.createElement('div');
      segEl.className = `timeline-seg ${normalizeStateClass(seg.state)}`;

      let leftPct;
      let widthPct;
      if (!timelineIncludeIdle && activeTotalMs > 0) {
        const segMs = Math.max(0, seg.end - seg.start);
        leftPct = (activeCursor / activeTotalMs) * 100;
        widthPct = (segMs / activeTotalMs) * 100;
        activeCursor += segMs;
      } else {
        leftPct = ((seg.start - dayStart) / DAY_MS) * 100;
        widthPct = ((seg.end - seg.start) / DAY_MS) * 100;
      }
      segEl.style.left = `${leftPct}%`;
      segEl.style.width = `${Math.max(0.15, widthPct)}%`;

      const sec = Math.max(0, Math.round((seg.end - seg.start) / 1000));
      const sessionTxt = seg.session && seg.session.id ? `session #${seg.session.id}` : 'session n/a';
      const tipText = `${timelineStateLabel(seg.state)} - ${sessionTxt} - ${formatDelay(sec)}\n${formatClock(seg.start)} - ${formatClock(seg.end)}`;

      segEl.addEventListener('mouseenter', e => showTip(e, tipText));
      segEl.addEventListener('mousemove', e => showTip(e, tipText));
      segEl.addEventListener('mouseleave', hideTip);

      track.appendChild(segEl);
    });

    row.appendChild(day);
    row.appendChild(track);
    wrap.appendChild(row);
  }
}

async function exportJSON() {
  const sessions = await dbGetAll();
  const blob = new Blob([JSON.stringify(sessions, null, 2)], { type: 'application/json' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href = url; a.download = `pomodoro-${new Date().toISOString().slice(0, 10)}.json`;
  a.click(); URL.revokeObjectURL(url);
}
