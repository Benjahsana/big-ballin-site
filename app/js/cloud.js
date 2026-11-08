/* BIG BALLIN: Supabase: accounts, saved lineups, leagues, leaderboards, live points.
   Everything here is optional: with no project set in cloud-config.js (or if Supabase
   can't be reached) the app plays locally exactly as before. */
import { S } from './state.js?v=e026dd1';
import { POS } from './util.js?v=e026dd1';
import { SUPABASE_URL, SUPABASE_KEY } from './cloud-config.js?v=e026dd1';

export const CLOUD = !!(SUPABASE_URL && SUPABASE_KEY);
const LIB = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.115.0/+esm';
let sb = null;

export const signedIn = () => !!(S.user && S.profile);

/* Start the client, pick up a session (including one arriving from a sign-in link). */
export async function initCloud(onChange) {
  if (!CLOUD) return;
  try {
    const { createClient } = await import(LIB);
    sb = createClient(SUPABASE_URL, SUPABASE_KEY, {
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true, flowType: 'implicit' },
    });
    const { data } = await sb.auth.getSession();
    S.user = data.session ? data.session.user : null;
    if (S.user) await loadProfile();
    sb.auth.onAuthStateChange((_ev, session) => {
      const was = S.user ? S.user.id : null;
      S.user = session ? session.user : null;
      // Don't call Supabase inside this callback (it can deadlock); do it right after.
      if ((S.user ? S.user.id : null) !== was) setTimeout(async () => { S.profile = null; if (S.user) await loadProfile(); onChange(); }, 0);
    });
    S.cloudOk = true;
  } catch (e) {
    S.cloudOk = false;   // offline or CDN blocked: local play only
  }
}

/* Database error → short arcade callout + plain sentence. The database's own rules
   start their messages with a tag (LOCKED:, OVER CAP:, ...), see supabase/schema.sql. */
export function friendly(err) {
  const msg = (err && (err.message || err.error_description || String(err))) || 'Something went wrong';
  const m = msg.match(/^([A-Z][A-Z ]+):\s*(.*)$/);
  if (m) return { title: m[1] + '!', text: m[2] };
  if (/duplicate key.*profiles_name/i.test(msg)) return { title: 'NAME TAKEN!', text: 'Someone already has that name. Try another.' };
  if (/rate limit|too many/i.test(msg)) return { title: 'SLOW DOWN!', text: 'Too many tries. Wait a minute and try again.' };
  if (/failed to fetch|network/i.test(msg)) return { title: 'OFFLINE!', text: 'Couldn’t reach the server. Your lineup is saved on this device.' };
  return { title: 'OOPS!', text: msg };
}

/* ---------- Sign-in ---------- */
export async function sendLink(email) {
  const redirect = location.origin + location.pathname;
  const { error } = await sb.auth.signInWithOtp({ email, options: { emailRedirectTo: redirect, shouldCreateUser: true } });
  if (error) throw error;
}
export async function verifyCode(email, token) {
  const { error } = await sb.auth.verifyOtp({ email, token, type: 'email' });
  if (error) throw error;
}
export async function signOut() { if (sb) await sb.auth.signOut(); S.user = null; S.profile = null; }

export async function loadProfile() {
  const { data } = await sb.from('profiles').select('display_name,avatar').eq('id', S.user.id).maybeSingle();
  S.profile = data || null;
}
export async function saveProfile(name, avatar) {
  const row = { id: S.user.id, display_name: name.trim(), avatar: Number(avatar) || 0 };
  const { error } = await sb.from('profiles').upsert(row);
  if (error) throw error;
  S.profile = { display_name: row.display_name, avatar: row.avatar };
}

/* ---------- Lineups ---------- */
const COLS = { PG: 'pg', SG: 'sg', SF: 'sf', PF: 'pf', C: 'c' };

export async function loadLineup(date) {
  const { data, error } = await sb.from('lineups').select('pg,sg,sf,pf,c,spent,final_score').eq('slate_date', date).maybeSingle();
  if (error) throw error;
  if (!data) return null;
  const lu = {};
  POS.forEach((pos) => { lu[pos] = data[COLS[pos]] ?? null; });
  return lu;
}

/* Saves run one at a time, in order, so quick sign/cut taps can't race each other. */
let chain = Promise.resolve();
export function pushLineup(date, lineup) {
  const row = { user_id: S.user.id, slate_date: date };
  POS.forEach((pos) => { row[COLS[pos]] = lineup[pos] ?? null; });
  const run = chain.then(async () => {
    const { error } = await sb.from('lineups').upsert(row, { onConflict: 'user_id,slate_date' });
    if (error) throw error;
  });
  chain = run.catch(() => {});
  return run;
}

/* ---------- Leagues ---------- */
export async function myLeagues() {
  const { data, error } = await sb.from('leagues').select('id,name,code,owner').order('name');
  if (error) throw error;
  return data || [];
}
export async function createLeague(name) {
  const { data, error } = await sb.rpc('create_league', { p_name: name });
  if (error) throw error;
  return data;
}
export async function joinLeague(code) {
  const { data, error } = await sb.rpc('join_league', { p_code: code });
  if (error) throw error;
  return data;
}
export async function leaveLeague(id) {
  const { error } = await sb.rpc('leave_league', { p_league: id });
  if (error) throw error;
}

/* Every league (public list: names, member counts, tonight's leader; no invite codes). */
export async function leagueList(date) {
  const { data, error } = await sb.rpc('league_list', { p_date: date });
  if (error) throw error;
  return data || [];
}

/* ---------- Leaderboards ---------- */
export async function leaderboard(period, date, league) {
  const { data, error } = await sb.rpc('leaderboard', { p_period: period, p_date: date, p_league: league || null });
  if (error) throw error;
  return data || [];
}
export async function nightLineups(date, league) {
  const { data, error } = await sb.rpc('night_lineups', { p_date: date, p_league: league || null });
  if (error) throw error;
  return data || [];
}

/* ---------- Live points (written by the server's live job about every minute) ---------- */
export async function liveFeed(date) {
  const { data, error } = await sb.from('live_feed').select('data,updated_at').eq('slate_date', date).maybeSingle();
  if (error) throw error;
  if (!data) return null;
  const f = data.data, keys = f.keys || ['fp', 'pts', 'reb', 'ast', 'stl', 'blk', 'tov', 'fg3m', 'min'];
  const p = {};
  Object.entries(f.p || {}).forEach(([id, arr]) => { const o = {}; keys.forEach((k, i) => { o[k] = arr[i]; }); p[id] = o; });
  return { at: f.at || data.updated_at, games: f.games || {}, p };
}

/* My season world rank after the latest scored night, and the night before (for ▲/▼). */
export async function myWorldRank() {
  const { data, error } = await sb.rpc('my_world_rank');
  if (error) throw error;
  return (data && data[0]) || null;
}

/* My own badges (for the fanfare the first time I see a new one). */
export async function myBadges() {
  const { data, error } = await sb.from('badges').select('id,kind,period,league_id').eq('user_id', S.user.id).order('id');
  if (error) throw error;
  return data || [];
}

/* Most recent badge of each kind for a league, or the world (league null). */
export async function latestWinners(league) {
  let q = sb.from('badges').select('kind,period,score,user_id,profiles(display_name)')
    .order('period', { ascending: false }).limit(40);
  q = league ? q.eq('league_id', league) : q.is('league_id', null);
  const { data, error } = await q;
  if (error) throw error;
  const out = {};
  (data || []).forEach((b) => {
    const cur = out[b.kind];
    if (!cur || cur.period === b.period) {
      if (!cur) out[b.kind] = { period: b.period, score: b.score, names: [] };
      out[b.kind].names.push(b.profiles ? b.profiles.display_name : '?');
    }
  });
  return out;
}
