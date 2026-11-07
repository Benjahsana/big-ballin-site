/* BIG BALLIN: stat windows, sorting, filters and "what fits my cap". */
import { S } from './state.js?v=659b60b';
import { POS, slotsFor, matches } from './util.js?v=659b60b';
import { slotOf, maxForSlot, fits } from './lineup.js?v=659b60b';

export const WINDOWS = [['l5', 'L5'], ['l10', 'L10'], ['season', 'SEASON']];
export const winLabel = () => ({ l5: 'Last 5', l10: 'Last 10', season: 'Season' })[S.win] || 'Season';

/* A player's per-game numbers for the chosen window (falls back to the old season block). */
export function W(p) {
  const w = p.windows && p.windows[S.win];
  if (w) return w;
  return { ...(p.stats || {}), fp: p.avg_fp, g: null };
}
/* FG% / FT% from window totals: makes / attempts (not an average of percentages). */
const ratio = (m, a) => (a > 0 && m != null ? m / a : null);
export const fgPct = (p) => { const w = W(p); return ratio(w.fgm, w.fga); };
export const ftPct = (p) => { const w = W(p); return ratio(w.ftm, w.fta); };
export const fmtPct = (v) => (v == null ? '–' : (v * 100).toFixed(1) + '%');
const one = (v) => (v == null ? '–' : Number(v).toFixed(1));

/* Sort options. low: true means "lower is better" (sorted low-first by default). */
export const SORTS = [
  { k: 'proj', l: 'Projection', s: 'PROJ', v: (p) => p.proj, f: (p) => p.proj.toFixed(1) },
  { k: 'price', l: 'Price', s: 'PRICE', v: (p) => p.price, f: (p) => '$' + p.price.toFixed(1) + 'M' },
  { k: 'value', l: 'Value (FP per $1M)', s: 'FP/$M', v: (p) => p.value, f: (p) => p.value.toFixed(2) },
  { k: 'fp', l: 'Avg fantasy points', s: 'AVG FP', v: (p) => W(p).fp, f: (p) => one(W(p).fp) },
  { k: 'pts', l: 'Points', s: 'PTS', v: (p) => W(p).pts, f: (p) => one(W(p).pts) },
  { k: 'reb', l: 'Rebounds', s: 'REB', v: (p) => W(p).reb, f: (p) => one(W(p).reb) },
  { k: 'ast', l: 'Assists', s: 'AST', v: (p) => W(p).ast, f: (p) => one(W(p).ast) },
  { k: 'stl', l: 'Steals', s: 'STL', v: (p) => W(p).stl, f: (p) => one(W(p).stl) },
  { k: 'blk', l: 'Blocks', s: 'BLK', v: (p) => W(p).blk, f: (p) => one(W(p).blk) },
  { k: 'fg3m', l: '3-pointers made', s: '3PM', v: (p) => W(p).fg3m, f: (p) => one(W(p).fg3m) },
  { k: 'tov', l: 'Turnovers', s: 'TOV', low: true, v: (p) => W(p).tov, f: (p) => one(W(p).tov) },
  { k: 'fgpct', l: 'Field goal %', s: 'FG%', v: fgPct, f: (p) => fmtPct(fgPct(p)) },
  { k: 'ftpct', l: 'Free throw %', s: 'FT%', v: ftPct, f: (p) => fmtPct(ftPct(p)) },
  { k: 'min', l: 'Minutes', s: 'MIN', v: (p) => W(p).min, f: (p) => one(W(p).min) },
  { k: 'chg', l: 'Price change', s: '+/−', v: (p) => p.price_change || 0, f: (p) => (p.price_change ? (p.price_change > 0 ? '+' : '') + p.price_change.toFixed(1) : '–') },
];
export const sortDef = () => SORTS.find((s) => s.k === S.poolSort) || SORTS[0];
export const defaultDir = (k) => ((SORTS.find((s) => s.k === k) || {}).low ? 1 : -1);

export const PRICE_BANDS = [
  ['ALL', 'Any price'], ['u5', 'Under $5M', 0, 5], ['5-10', '$5M – $10M', 5, 10],
  ['10-20', '$10M – $20M', 10, 20], ['20+', '$20M and up', 20, 1e9],
];

export { maxForSlot, fits };

export function filteredPool() {
  const band = PRICE_BANDS.find((b) => b[0] === S.poolPrice) || PRICE_BANDS[0];
  const sort = sortDef();
  const list = S.slate.players.filter((p) =>
    (S.poolPos === 'ALL' || slotsFor(p).includes(S.poolPos))
    && (S.poolGame === 'ALL' || p.game_id === S.poolGame)
    && (band[0] === 'ALL' || (p.price >= band[2] && p.price < band[3]))
    && (!S.hideOut || p.injury !== 'OUT' || slotOf(p.id))
    && (!S.poolFits || fits(p))
    && matches(p, S.poolQuery));
  list.sort((a, b) => {
    const va = sort.v(a), vb = sort.v(b);
    if (va == null && vb == null) return b.proj - a.proj;
    if (va == null) return 1;
    if (vb == null) return -1;
    return S.poolDir * (va - vb) || b.proj - a.proj;
  });
  return list;
}

export function injuryTag(p) {
  if (p.injury === 'OUT') return '<span class="inj inj-out" title="Ruled out tonight">OUT</span>';
  if (p.injury === 'GTD') return '<span class="inj inj-gtd" title="Game-time decision">GTD</span>';
  return '';
}
