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
  sound: true, crushLine: 99
};

export const ui = { renderAll: () => {} };
