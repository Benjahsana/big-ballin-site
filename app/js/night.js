/* BIG BALLIN: LAST NIGHT. The scoreboard and the league/world boards can show the previous
   slate's night while TODAY'S build tab stays on today.
   "Last night" = the latest slate dated before today (New York). Before the morning slate
   posts, that is the slate already loaded, so nothing extra is fetched.
   Rendering code reads S.slate / S.byId / S.games / S.results / S.live / S.lineup, so asLast()
   swaps last night's copies in for one synchronous render, then puts today's back. */
import { S } from './state.js?v=bf76d6b';
import { POS, recall } from './util.js?v=bf76d6b';
import { CLOUD, signedIn, loadLineup, liveFeed, prevSlateDate } from './cloud.js?v=bf76d6b';

const LOOKBACK_DAYS = 10;      // without the database: how far back to look for a slate file

export const L = { state: 'idle', date: null, slate: null, byId: {}, games: {}, results: null, live: null, lineup: null, tRanks: null };
const SWAP = ['slate', 'byId', 'games', 'results', 'live', 'lineup', 'tRanks'];

export const nyToday = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'America/New_York' }).format(new Date());
/* True from midnight until the morning slate posts: the loaded slate is already last night. */
export const lastIsCurrent = () => !!(S.slate && S.slate.date < nyToday());
export const lastDate = () => (lastIsCurrent() ? S.slate.date : L.date);
export const hasLast = () => lastIsCurrent() || L.state === 'ready';
export const anyStarted = () => !!(S.slate && (S.slate.games || []).some((g) => Date.parse(g.tip_utc) <= Date.now()));

/* Run fn with last night's data in S (no-op swap when the loaded slate is last night). */
export function asLast(fn) {
  if (lastIsCurrent() || L.state !== 'ready') return fn();
  const keep = {};
  SWAP.forEach((k) => { keep[k] = S[k]; S[k] = L[k]; });
  try { return fn(); } finally { SWAP.forEach((k) => { L[k] = S[k]; S[k] = keep[k]; }); }
}

const shift = (iso, days) => { const d = new Date(iso + 'T12:00:00Z'); d.setUTCDate(d.getUTCDate() + days); return d.toISOString().slice(0, 10); };
async function getJson(url) {
  try { const r = await fetch(url, { cache: 'no-store' }); return r.ok ? await r.json() : null; } catch (e) { return null; }
}

let loading = null;
/* Load last night once (again with force, e.g. CHECK FOR SCORES before the official scores post). */
export function loadLast(force) {
  if (lastIsCurrent()) return Promise.resolve();
  if (loading) return loading;
  if (L.state === 'ready' && !force) return Promise.resolve();
  loading = (async () => {
    try {
      let date = L.date, slate = L.slate;
      if (!slate) {
        if (CLOUD && S.cloudOk) { try { date = await prevSlateDate(S.slate.date); } catch (e) { date = null; } }
        if (date) slate = await getJson(`../data/slates/slate-${date}.json`);
        for (let i = 1; !slate && i <= LOOKBACK_DAYS; i++) {     // no database: look for the newest older slate file
          const d = shift(S.slate.date, -i);
          slate = await getJson(`../data/slates/slate-${d}.json`);
          if (slate) date = d;
        }
      }
      if (!slate) { L.state = 'none'; return; }
      const byId = {}, games = {};
      slate.players.forEach((p) => { byId[p.id] = p; });
      (slate.games || []).forEach((g) => { games[g.game_id] = g; });
      const res = await getJson(`../data/results/results-${date}.json`);
      let live = null;
      // The live feed also when official results exist: it has the game scores for MY TEAM's game strip.
      if (CLOUD && S.cloudOk) { try { live = await liveFeed(date); } catch (e) { live = null; } }
      let lu = null;
      if (signedIn()) { try { lu = await loadLineup(date); } catch (e) { lu = null; } }
      if (!lu) lu = recall('bb-lineup-' + date);
      const lineup = {};
      POS.forEach((pos) => { lineup[pos] = lu && lu[pos] && byId[lu[pos]] ? lu[pos] : null; });
      Object.assign(L, { state: 'ready', date, slate, byId, games, results: res ? res.players : null, live, lineup });
    } finally { loading = null; }
  })();
  return loading;
}
/* After sign-in/out the saved lineup for last night may differ. */
export function resetLastLineup() { if (L.state === 'ready') { L.state = 'idle'; L.tRanks = null; } }
