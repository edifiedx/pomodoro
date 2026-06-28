const DEFAULT_LABEL = 'what are you working on...';

const COLORS = {
  'work':        '#F0A030',  // accretion disk amber-gold
  'short-break': '#5BA8D4',  // pulsar blue
  'long-break':  '#4AA870',  // nebula green
};

const LABELS = {
  'work':        'Work',
  'short-break': 'Short Break',
  'long-break':  'Long Break',
};

const RING_R    = 115;
const RING_CIRC = 2 * Math.PI * RING_R;

const CFG = {
  workMins:           25,
  shortBreakMins:     5,
  longBreakMins:      15,
  sessionsBeforeLong: 4,
  snoozeIntervalSec:  60,
  dotMode:            'cycle',
  toastsEnabled:      true,
};

const S = {
  phase:           'work',
  cycleWorkDone:   0,
  totalWorkEver:   0,
  running:         false,
  alarmPending:    false,
  phaseEndTime:    null,
  remainingSec:    25 * 60,
  totalSec:        25 * 60,
  phaseStartTime:  null,
  alarmStartTime:  null,
  currentLabel:    DEFAULT_LABEL,
  advanceMode:     'manual',
  alarmStyle:      'snooze',
  _notifRequested: false,
};
