/* BIG BALLIN: the app's own tunable values (the pipeline's live in pipeline/config.py;
   the browser can't read that file). Change a number here, push, and it's live. */

/* Tab names shown in the app. The world board's may become 'WORLD HIGH SCORES'. */
export const LABELS = { build: 'BUILD LINEUP', stats: 'PLAYERS', score: 'MY TEAM', world: 'TOP WORLD RANKINGS', worldShort: 'WORLD' };

/* How many rows the World Rankings board shows (plus your own row if you're further down). */
export const WORLD_ROWS = 100;

/* Live games: how often the app checks for new points (the server sends them about every minute). */
export const LIVE_REFRESH_MS = 60000;

/* Sound: most are made in the browser (Web Audio); a few are short audio files in app/sounds/. */
export const SOUND = {
  volume: 0.35,          // default volume, 0–1 (each device can change it in the SOUND panel)
  master: 0.12,          // overall loudness at volume 1 (keeps even "full" volume gentle)
  cooldownMs: 3000,      // after a reward/alert sound, others wait this long (quick taps don't start it)
  style: 'classic',      // 'classic' (plain beeps) or 'fun' (slides, swish, echo, crowd) for every sound
  pick: {},              // per-sound override, e.g. { sign: 'fun', fanfare: 'fun' } (hear both at #soundtest)
  // Sounds that play an audio file instead (both classic and fun). Keep ?v=7425f06 so phones fetch new versions.
  files: { cut: 'sounds/cut.mp3?v=7425f06', point: 'sounds/point.mp3?v=7425f06', heat: 'sounds/heat.mp3?v=7425f06',
    fire: 'sounds/fire.mp3?v=7425f06', insane: 'sounds/insane.mp3?v=7425f06', nightwin: 'sounds/nightwin.mp3?v=7425f06' },
  fileGain: 1.5,         // file loudness vs the made-in-browser sounds (raise if the files sound quieter)
};

/* Live shouts for a player in my lineup, each once a night: FP ≥ projection + over.
   The highest level reached on a check wins (one shout per check). */
export const HOT_LEVELS = [
  { over: 0, sound: 'heat', text: (n) => n + ' IS HEATING UP!' },
  { over: 10, sound: 'fire', text: (n) => n + ' IS ON FIRE!' },
  { over: 20, sound: 'insane', text: (n) => 'THIS IS INSANE! ' + n },
];

/* Pace: projected finish = FP so far ÷ minutes played × usual minutes (season average).
   Shown only after he's played this many minutes, so 1 minute of play doesn't project 150 FP. */
export const PACE_MIN_MINUTES = 4;
