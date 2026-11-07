/* BIG BALLIN: sounds. Short synth tones made with Web Audio (no files, no voice).
   Rules: nothing plays before the first tap on the page; one sound at a time; after a
   reward/alert sound, others wait SOUND.cooldownMs (quick taps don't start that wait, and
   are simply skipped if something is playing). On/off and volume are remembered per device. */
import { S } from './state.js?v=6739afe';
import { SOUND } from './app-config.js?v=6739afe';

/* name: [label for the sound test, waveform, [[frequency Hz, seconds], ...], quick tap?] */
export const SOUNDS = {
  tap:      ['Tab / button tap', 'square', [[988, 0.04]], true],
  sign:     ['Sign a player', 'square', [[784, 0.05], [1175, 0.08]]],
  cut:      ['Cut a player', 'square', [[392, 0.06], [262, 0.1]]],
  locked:   ['Locked (game started)', 'triangle', [[147, 0.18]]],
  buzz:     ['Over the cap / no room', 'sawtooth', [[110, 0.22], [98, 0.28]]],
  complete: ['Lineup complete', 'square', [[523, 0.08], [659, 0.08], [784, 0.08], [1047, 0.22]]],
  league:   ['League created / joined', 'square', [[660, 0.07], [880, 0.07], [1320, 0.14]]],
  heat:     ['Heating up (passed projection)', 'triangle', [[523, 0.07], [784, 0.07], [1047, 0.14]]],
  climb:    ['Rank up during live games', 'triangle', [[659, 0.06], [784, 0.06], [988, 0.06], [1319, 0.14]]],
  fanfare:  ['Badge / won the night', 'square', [[523, 0.1], [523, 0.1], [523, 0.1], [698, 0.32], [880, 0.12], [1047, 0.42]]],
};

let ctx = null;
let busyUntil = 0;       // ms: a sound is playing until then
let coolUntil = 0;       // ms: reward/alert sounds wait until then

/* Browsers only allow audio after a tap; until then every sound is skipped (not queued). */
function unlock() {
  if (ctx) return;
  try {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (AC) ctx = new AC();
  } catch (e) { ctx = null; }
}
['pointerdown', 'keydown', 'touchstart'].forEach((ev) => window.addEventListener(ev, unlock, { once: false, passive: true, capture: true }));

export function play(name, opts) {
  const snd = SOUNDS[name];
  if (!snd || !S.sound || !ctx || S.volume <= 0) return;
  const now = performance.now();
  const quick = !!snd[3];
  const force = opts && opts.force;               // sound test: ignore the cooldown, never overlap
  if (now < busyUntil) return;
  if (!quick && !force && now < coolUntil) return;
  try {
    if (ctx.state === 'suspended') ctx.resume();
    const level = Math.max(0.0001, SOUND.master * S.volume);
    let t = ctx.currentTime + 0.01;
    snd[2].forEach(([freq, dur]) => {
      const o = ctx.createOscillator(), g = ctx.createGain();
      o.type = snd[1]; o.frequency.value = freq;
      g.gain.setValueAtTime(level, t);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      o.connect(g); g.connect(ctx.destination); o.start(t); o.stop(t + dur + 0.02); t += dur;
    });
    const len = snd[2].reduce((a, [, d]) => a + d, 0) * 1000;
    busyUntil = now + len + 30;
    if (!quick) coolUntil = now + Math.max(len, SOUND.cooldownMs);
  } catch (e) { /* audio unavailable: stay silent */ }
}
