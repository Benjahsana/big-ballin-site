/* BIG BALLIN: sounds, made with Web Audio. A few (SOUND.files: cut, point, the announcer clips) play short mp3 files from
   app/sounds/ instead, loaded after the first tap; until a file has loaded, the built-in version plays.
   Every sound has two versions: "classic" (plain beeps) and "fun" (pitch slides, net swish,
   two-voice tunes, echo, crowd roar). app-config.js SOUND.style picks one for everything,
   SOUND.pick can choose per sound, and #soundtest plays both side by side.
   Rules: nothing plays before the first tap on the page; one sound at a time; after a
   reward/alert sound, others wait SOUND.cooldownMs (quick taps don't start that wait, and
   are simply skipped if something is playing). On/off and volume are remembered per device. */
import { S } from './state.js?v=ef8d999';
import { SOUND } from './app-config.js?v=ef8d999';

let ctx = null;
let noiseBuf = null;
const fileBuf = {};      // name → decoded audio from SOUND.files
let busyUntil = 0;       // ms: a sound is playing until then
let coolUntil = 0;       // ms: reward/alert sounds wait until then

/* ---------- Building blocks ---------- */
/* A note: waveform, start pitch (and optional slide to f1), length, loudness, vibrato. */
function tone(out, t, { type = 'square', f, f1, dur, vol = 1, vib = 0, vibRate = 7, attack = 0.005 }) {
  const o = ctx.createOscillator(), g = ctx.createGain();
  o.type = type;
  o.frequency.setValueAtTime(f, t);
  if (f1) o.frequency.exponentialRampToValueAtTime(f1, t + dur);
  if (vib) {
    const lfo = ctx.createOscillator(), lg = ctx.createGain();
    lfo.frequency.value = vibRate; lg.gain.value = vib;
    lfo.connect(lg); lg.connect(o.frequency); lfo.start(t); lfo.stop(t + dur + 0.05);
  }
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(vol, t + attack);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g); g.connect(out); o.start(t); o.stop(t + dur + 0.05);
}
/* Filtered noise: net swish, sneaker squeak, crowd. Optional filter sweep and a slow swell. */
function noise(out, t, { dur, freq = 2000, freq1, q = 1, type = 'bandpass', vol = 0.6, swell = 0 }) {
  if (!noiseBuf) {
    noiseBuf = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
    const d = noiseBuf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  }
  const src = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain();
  src.buffer = noiseBuf;
  f.type = type; f.Q.value = q; f.frequency.setValueAtTime(freq, t);
  if (freq1) f.frequency.exponentialRampToValueAtTime(freq1, t + dur);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(vol, t + (swell || 0.01));
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  src.connect(f); f.connect(g); g.connect(out); src.start(t); src.stop(t + dur + 0.05);
}
/* Arena echo: a short feedback delay on its own output. */
function echo(out, time = 0.16, fb = 0.32) {
  const d = ctx.createDelay(1), g = ctx.createGain(), mix = ctx.createGain();
  d.delayTime.value = time; g.gain.value = fb; mix.gain.value = 0.5;
  d.connect(g); g.connect(d); d.connect(mix); mix.connect(out);
  const input = ctx.createGain(); input.connect(out); input.connect(d);
  return input;
}
const notes = (out, t, type, seq, vol = 1) => { let x = t; seq.forEach(([f, dur]) => { tone(out, x, { type, f, dur, vol }); x += dur; }); return x - t; };

/* ---------- Every sound: [label, quick tap?, classic(out, t) → seconds, fun(out, t) → seconds] ---------- */
export const SOUNDS = {
  tap: ['Tab / button tap', true,
    (o, t) => notes(o, t, 'square', [[988, 0.04]]),
    (o, t) => { tone(o, t, { f: 1400, f1: 900, dur: 0.045, vol: 0.8 }); return 0.05; }],
  sign: ['Sign a player', false,
    (o, t) => notes(o, t, 'square', [[784, 0.05], [1175, 0.08]]),
    (o, t) => {   // coin "ka-ching" + net swish
      tone(o, t, { f: 988, dur: 0.06, vol: 0.8 });
      tone(o, t + 0.06, { f: 1319, f1: 1568, dur: 0.22, vol: 0.8 });
      noise(o, t + 0.02, { dur: 0.22, freq: 5000, freq1: 1800, q: 0.8, vol: 0.35 });
      return 0.3;
    }],
  cut: ['Cut a player', false,
    (o, t) => notes(o, t, 'square', [[392, 0.06], [262, 0.1]]),
    (o, t) => { tone(o, t, { type: 'triangle', f: 660, f1: 140, dur: 0.3, vol: 1 }); tone(o, t, { type: 'square', f: 330, f1: 70, dur: 0.3, vol: 0.25 }); return 0.32; }],
  locked: ['Locked (game started)', false,
    (o, t) => notes(o, t, 'triangle', [[147, 0.18]]),
    (o, t) => {   // door-thud
      tone(o, t, { type: 'sine', f: 160, f1: 55, dur: 0.2, vol: 1 });
      noise(o, t, { dur: 0.06, freq: 900, q: 1.5, vol: 0.4 });
      return 0.22;
    }],
  buzz: ['Over the cap / no room', false,
    (o, t) => notes(o, t, 'sawtooth', [[110, 0.22], [98, 0.28]]),
    (o, t) => {   // backboard clang + arena horn
      noise(o, t, { dur: 0.12, freq: 2400, q: 6, vol: 0.5 });
      tone(o, t, { type: 'square', f: 523, dur: 0.15, vol: 0.35 });
      tone(o, t, { type: 'square', f: 554, dur: 0.15, vol: 0.3 });
      tone(o, t + 0.08, { type: 'sawtooth', f: 185, dur: 0.42, vol: 0.55, attack: 0.02 });
      tone(o, t + 0.08, { type: 'sawtooth', f: 191, dur: 0.42, vol: 0.45, attack: 0.02 });
      return 0.52;
    }],
  complete: ['Lineup complete', false,
    (o, t) => notes(o, t, 'square', [[523, 0.08], [659, 0.08], [784, 0.08], [1047, 0.22]]),
    (o, t) => {   // end-of-level tune: melody + bass, last note wobbles
      const e = echo(o, 0.12, 0.25);
      notes(e, t, 'square', [[523, 0.09], [659, 0.09], [784, 0.09]], 0.8);
      tone(e, t + 0.27, { f: 1047, dur: 0.38, vol: 0.8, vib: 14 });
      notes(o, t, 'triangle', [[131, 0.18], [196, 0.09], [262, 0.38]], 0.9);
      return 0.7;
    }],
  league: ['League created / joined', false,
    (o, t) => notes(o, t, 'square', [[660, 0.07], [880, 0.07], [1320, 0.14]]),
    (o, t) => {   // power-up: rising slide, then sparkle
      tone(o, t, { f: 330, f1: 1320, dur: 0.28, vol: 0.7, vib: 30, vibRate: 18 });
      [1760, 2093, 2637].forEach((f, i) => tone(o, t + 0.28 + i * 0.06, { type: 'sine', f, dur: 0.12, vol: 0.5 }));
      return 0.5;
    }],
  climb: ['Rank up during live games', false,
    (o, t) => notes(o, t, 'triangle', [[659, 0.06], [784, 0.06], [988, 0.06], [1319, 0.14]]),
    (o, t) => {   // quick climb + crowd "ooh"
      const e = echo(o, 0.1, 0.2);
      notes(e, t, 'square', [[659, 0.05], [784, 0.05], [988, 0.05], [1319, 0.05], [1568, 0.16]], 0.6);
      noise(o, t + 0.1, { dur: 0.6, freq: 900, q: 0.7, vol: 0.18, swell: 0.3 });
      return 0.7;
    }],
  fanfare: ['Badge (week / month / season)', false,
    (o, t) => notes(o, t, 'square', [[523, 0.1], [523, 0.1], [523, 0.1], [698, 0.32], [880, 0.12], [1047, 0.42]]),
    (o, t) => {   // victory tune in the arena: two voices, echo, crowd roar
      const e = echo(o, 0.18, 0.3);
      notes(e, t, 'square', [[523, 0.1], [523, 0.1], [523, 0.1], [698, 0.3], [880, 0.12]], 0.7);
      tone(e, t + 0.72, { f: 1047, dur: 0.6, vol: 0.7, vib: 12 });
      notes(o, t, 'triangle', [[131, 0.3], [175, 0.42], [262, 0.6]], 0.8);
      noise(o, t + 0.3, { dur: 1.4, freq: 1100, q: 0.6, vol: 0.28, swell: 0.6 });
      return 1.7;
    }],
};

// My team scored during live games (checked about once a minute). Only a file version; silent until it loads.
SOUNDS.point = ['My team scores (live)', false, () => 0, () => 0];

// Heating up (a player passes his projection): the hesheatingup voice clip; built-in fallback = lineup complete.
SOUNDS.heat = ['Heating up (projection reached)', false, SOUNDS.complete[2], SOUNDS.complete[3]];
// Voice clips with no built-in version (silent until the file loads), and the night-win clip (fallback: fanfare).
SOUNDS.fire = ['On fire (projection +10)', false, SOUNDS.complete[2], SOUNDS.complete[3]];
SOUNDS.insane = ['This is insane (projection +20)', false, SOUNDS.fanfare[2], SOUNDS.fanfare[3]];
SOUNDS.nightwin = ['Won the night (badge)', false, SOUNDS.fanfare[2], SOUNDS.fanfare[3]];
// Announcer callouts when signing (fallback: the sign blip) and on the 5th signing (fallback: lineup-complete jingle).
SOUNDS.signed = ['Announcer: SIGNED!', false, SOUNDS.sign[2], SOUNDS.sign[3]];
SOUNDS.maxcontract = ['Announcer: MAX CONTRACT! ($40M+)', false, SOUNDS.sign[2], SOUNDS.sign[3]];
SOUNDS.capcrusher = ['Announcer: CAP CRUSHER! (great value)', false, SOUNDS.sign[2], SOUNDS.sign[3]];
SOUNDS.bigballin = ['Announcer: BIG BALLIN! (lineup complete)', false, SOUNDS.complete[2], SOUNDS.complete[3]];

/* Browsers only allow audio after a tap; until then every sound is skipped (not queued). */
function unlock() {
  if (ctx) return;
  try {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (AC) ctx = new AC();
  } catch (e) { ctx = null; }
  if (ctx) loadFiles();
}
/* Fetch and decode the mp3s once (about 15 KB in all). A failure just leaves the built-in sound. */
function loadFiles() {
  Object.entries(SOUND.files || {}).forEach(([name, url]) => {
    fetch(url).then((r) => (r.ok ? r.arrayBuffer() : Promise.reject(new Error(r.status))))
      .then((b) => new Promise((ok, bad) => ctx.decodeAudioData(b, ok, bad)))
      .then((buf) => { fileBuf[name] = buf; })
      .catch((e) => console.warn('BIG BALLIN sound file:', url, e));
  });
}
function playFile(out, t, buf) {
  const src = ctx.createBufferSource(), g = ctx.createGain();
  src.buffer = buf; g.gain.value = SOUND.fileGain || 1;
  src.connect(g); g.connect(out); src.start(t);
  return buf.duration;
}
['pointerdown', 'keydown', 'touchstart'].forEach((ev) => window.addEventListener(ev, unlock, { passive: true, capture: true }));

export const styleFor = (name) => (SOUND.pick && SOUND.pick[name]) || SOUND.style || 'classic';

/* play('sign'); opts.force (sound test: skip the cooldown), opts.style ('classic' | 'fun'). */
export function play(name, opts) {
  const snd = SOUNDS[name];
  if (!snd || !S.sound || !ctx || S.volume <= 0) return;
  const now = performance.now();
  const quick = snd[1];
  const force = opts && opts.force;
  if (now < busyUntil) return;
  if (!quick && !force && now < coolUntil) return;
  try {
    if (ctx.state === 'suspended') ctx.resume();
    const out = ctx.createGain();
    out.gain.value = Math.max(0.0001, SOUND.master * S.volume);
    out.connect(ctx.destination);
    const fn = ((opts && opts.style) || styleFor(name)) === 'fun' ? snd[3] : snd[2];
    const buf = fileBuf[name];
    const len = (buf ? playFile(out, ctx.currentTime + 0.01, buf) : fn(out, ctx.currentTime + 0.01)) * 1000;
    if (!len) { out.disconnect(); return; }
    setTimeout(() => { try { out.disconnect(); } catch (e) {} }, len + 2500);   // let echoes ring out, then tidy up
    busyUntil = now + len + 30;
    if (!quick) coolUntil = now + Math.max(len, SOUND.cooldownMs);
  } catch (e) { console.warn('BIG BALLIN sound:', name, e); }   // stay silent, but say why in the console
}
