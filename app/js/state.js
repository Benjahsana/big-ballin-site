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
  sound: true, volume: 0.35, crushLine: 99,   // volume: 0–1, remembered per device (bb-vol)
  // Phase 4 (Supabase): account, sync, live points, leagues and leaderboards.
  user: null, profile: null, cloudOk: false,
  sync: 'local',        // 'local' (this device only) | 'saving' | 'saved' | 'error'
  live: null,           // { at, games: {game_id: {s, t, a, h}}, p: {player id: {fp, pts, ...}} }
  hotSeen: {},          // players we already shouted HEATING UP for tonight
  // Leagues tab: my leagues (with invite codes), every league (public list), the one being viewed.
  leagues: [], allLeagues: null, lbLeague: null, lbPeriod: 'night', lbRows: null, lbNight: null, lbWinners: null, lbErr: null,
  inviteOpen: false,
  // World Rankings tab, and my season world rank for the header ({rank, prev_rank, total, nights, players}).
  tRanks: null,        // Scoreboard: my rank tonight [{id (null = world), name, rank, of, move}]
  wPeriod: 'season', wRows: null, wNight: null, wWinners: null, wErr: null, rank: null,
  modal: null           // { kind: 'signin' | 'code' | 'name' | 'create' | 'join' | 'account', ... }
};

export const ui = { renderAll: () => {} };
