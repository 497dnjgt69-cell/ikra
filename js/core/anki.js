import { datekey } from '../shared/format.js';

// Compact, validated snapshot. Anki logs use milliseconds for both ID and time.
export function normalizeAnki(value) {
  if (value == null) return null;
  if (!value || typeof value.profile !== 'string' || value.profile.length > 200 ||
      !Number.isFinite(Date.parse(value.syncedAt)) || !Array.isArray(value.reviews) || value.reviews.length > 1000000)
    throw Error('Invalid Anki data');
  const unique = new Map();
  for (const r of value.reviews) {
    if (!r || !Number.isSafeInteger(r.id) || r.id <= 0 || !Number.isFinite(new Date(r.id).getTime()) ||
        !Number.isSafeInteger(r.card) || r.card <= 0 || !Number.isFinite(r.seconds) || r.seconds < 0 || r.seconds > 86400 ||
        !Number.isInteger(r.ease) || r.ease < 1 || r.ease > 4)
      throw Error('Invalid Anki review');
    unique.set(r.id, {id:r.id, card:r.card, seconds:r.seconds, ease:r.ease});
  }
  return {profile:value.profile, syncedAt:new Date(value.syncedAt).toISOString(), reviews:[...unique.values()].sort((a,b)=>a.id-b.id)};
}

export function summarizeAnki(snapshot, start = new Date(0), end = new Date(8640000000000000)) {
  const reviews = (snapshot?.reviews || []).filter(r => r.id >= +start && r.id < +end);
  const days = new Map();
  for (const r of reviews) {
    const day = datekey(r.id);
    days.set(day, (days.get(day) || 0) + 1);
  }
  return {count:reviews.length, cards:new Set(reviews.map(r=>r.card)).size,
    seconds:reviews.reduce((sum,r)=>sum+r.seconds,0), days:days.size,
    again:reviews.filter(r=>r.ease===1).length, daily:[...days].sort(([a],[b])=>a.localeCompare(b))};
}
