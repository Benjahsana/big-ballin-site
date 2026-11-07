/* BIG BALLIN: shared state. ui.* hooks are filled in by main.js (avoids circular imports). */
export const S = {
  slate: null, byId: {}, games: {}, results: null,
  tab: 'build', lineup: { PG: null, SG: null, SF: null, PF: null, C: null },
  // Free agents: position, search, sort (+ direction: -1 high first), filters, view.
  poolPos: 'PG', poolQuery: '', poolSort: 'proj', poolDir: -1, poolLimit: 36,
  poolGame: 'ALL', poolPrice: 'ALL', poolFits: false, hideOut: true,
  filtersOpen: false,  // phones: filter panel folded away until FILTERS is tapped
  view: 'cards',        // 'cards' | 'list' (remembered)
  win: 'season',        // stats window: 'l5' | 'l10' | 'season' (remembered)
  statsPos: 'ALL', statsQuery: '', sortKey: 'proj', sortDir: -1, selId: null,
  sound: true, crushLine: 99,
  // Phase 4 (Supabase): account, sync, live points, leagues and leaderboards.
  user: null, profile: null, cloudOk: false,
  sync: 'local',        // 'local' (this device only) | 'saving' | 'saved' | 'error'
  live: null,           // { at, games: {game_id: {s, t, a, h}}, p: {player id: {fp, pts, ...}} }
  hotSeen: {},          // players we already shouted HEATING UP for tonight
  leagues: [], lbScope: 'ALL', lbPeriod: 'night', lbRows: null, lbNight: null, lbWinners: null, lbErr: null,
  modal: null           // { kind: 'signin' | 'code' | 'name' | 'create' | 'join' | 'account', ... }
};

export const ui = { renderAll: () => {} };
