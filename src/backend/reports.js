// Shared citizen reports (PRD §22.5) — Supabase table `reports` + `report_votes`, live via Realtime.
// Converts DB rows <-> Pin contract (src/engine/pin.js). Scenario/simulated pins are NEVER written here.
import { supabase } from './client.js';
import { makePin } from '../engine/pin.js';
import { CONFIG } from '../../config.js';

const LOOKBACK_H = 24; // fetch window; lifecycle/expiry is decided by the engine, not here

/** DB row (+ vote tallies) → Pin */
export function rowToPin(r, votes = []) {
  const mine = votes.filter((v) => v.report_id === r.id);
  return makePin({
    id: r.id,
    type: r.type,
    lat: r.lat,
    lng: r.lng,
    depth: r.depth,
    inUnderpass: r.in_underpass,
    passable: { bike: r.passable_bike, car: r.passable_car },
    cause: r.cause,
    source: { kind: 'citizen', name: 'Citizen report', url: null },
    photo: r.photo,
    createdAt: r.created_at,
    confirmations: mine.filter((v) => v.vote === 'still').length,
    clearedVotes: mine.filter((v) => v.vote === 'cleared').length,
    simulated: false,
    ...(r.name ? { name: r.name } : {}),
    ...(r.amenities ? { amenities: r.amenities } : {}),
  });
}

/** Pin draft → DB row (user_id is filled by the DB default auth.uid()) */
function pinToRow(p) {
  return {
    city: CONFIG.CITY, type: p.type, lat: p.lat, lng: p.lng, depth: p.depth ?? 'none',
    in_underpass: !!p.inUnderpass, passable_bike: p.passable?.bike ?? true, passable_car: p.passable?.car ?? true,
    cause: p.cause ?? 'unknown', amenities: p.amenities ?? null, name: p.name ?? null, photo: p.photo ?? null,
  };
}

/** Load recent reports + votes for the current city. */
export async function fetchReports(now = new Date()) {
  if (!supabase) return [];
  const since = new Date(now - LOOKBACK_H * 36e5).toISOString();
  const { data: rows, error } = await supabase.from('reports')
    .select('id,type,lat,lng,depth,in_underpass,passable_bike,passable_car,cause,amenities,name,photo,created_at')
    .eq('city', CONFIG.CITY).gte('created_at', since).order('created_at', { ascending: false }).limit(500);
  if (error) throw error;
  if (!rows.length) return [];
  const { data: votes, error: vErr } = await supabase.from('report_votes')
    .select('report_id,vote').in('report_id', rows.map((r) => r.id));
  if (vErr) throw vErr;
  return rows.map((r) => rowToPin(r, votes));
}

/** Insert a report (caller must have checked requireUser()). Throws {code:'rate_limited'} on the DB limit. */
export async function submitReport(pinDraft) {
  if (!supabase) throw new Error('backend_unavailable');
  if (pinDraft.simulated) throw new Error('simulated pins are never stored');
  const { data, error } = await supabase.from('reports').insert(pinToRow(pinDraft))
    .select('id,type,lat,lng,depth,in_underpass,passable_bike,passable_car,cause,amenities,name,photo,created_at').single();
  if (error) {
    if (String(error.message).includes('rate_limited')) throw Object.assign(new Error('rate_limited'), { code: 'rate_limited' });
    throw error;
  }
  return rowToPin(data);
}

/** "Still there" / "Cleared" — one vote per user per report (changeable). */
export async function vote(reportId, value /* 'still' | 'cleared' */) {
  if (!supabase) throw new Error('backend_unavailable');
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('not_signed_in');
  const { error } = await supabase.from('report_votes')
    .upsert({ report_id: reportId, user_id: user.id, vote: value }, { onConflict: 'report_id,user_id' });
  if (error) throw error;
}

/** Live updates: calls onChange() whenever a report or vote is added/changed. Returns unsubscribe. */
export function watchReports(onChange) {
  if (!supabase) return () => {};
  const ch = supabase.channel(`reports-${CONFIG.CITY}`)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'reports', filter: `city=eq.${CONFIG.CITY}` }, onChange)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'report_votes' }, onChange)
    .subscribe();
  return () => supabase.removeChannel(ch);
}
