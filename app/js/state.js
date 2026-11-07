/* BIG BALLIN: shared state. ui.* hooks are filled in by main.js (avoids circular imports). */
export const S = {
  slate: null, byId: {}, games: {}, results: null,
  tab: 'build', lineup: { PG: null, SG: null, SF: null, PF: null, C: null },
  poolPos: 'PG', poolQuery: '', poolSort: 'proj', poolLimit: 36,
  statsPos: 'ALL', statsQuery: '', sortKey: 'proj', sortDir: -1, selId: null,
  sound: true, crushLine: 99
};

export const ui = { renderAll: () => {} };
