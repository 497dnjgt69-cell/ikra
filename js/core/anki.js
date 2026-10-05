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

export const normalizeAnkiGoal = value => [10,25,50,100].includes(value) ? value : 25;

// Rewards are derived from unique imported reviews, never from sync clicks.
export function ankiJourney(snapshot, goal = 25, now = new Date()) {
  goal = normalizeAnkiGoal(goal);
  const reviews = [...new Map((snapshot?.reviews || []).filter(r=>r.id<=+now).map(r=>[r.id,r])).values()];
  const counts = new Map();
  for (const r of reviews) { const day=datekey(r.id); counts.set(day,(counts.get(day)||0)+1); }
  const today=datekey(now), keys=[...counts.keys()].sort();
  const previousDay=key=>{const d=new Date(key+'T12:00:00');d.setDate(d.getDate()-1);return datekey(d);};
  let longest=0, run=0, previous=null;
  for(const key of keys){run=previous===previousDay(key)?run+1:1;longest=Math.max(longest,run);previous=key;}
  let cursor=counts.has(today)?today:previousDay(today), streak=0;
  while(counts.has(cursor)){streak++;cursor=previousDay(cursor);}
  const days=Array.from({length:28},(_,i)=>{const date=new Date(now);date.setHours(12,0,0,0);date.setDate(date.getDate()-27+i);const key=datekey(date);return {key,count:counts.get(key)||0};});
  const total=reviews.length, xp=total*10, level=Math.floor(xp/1000)+1;
  return {goal,today:counts.get(today)||0,streak,longest,days,total,xp,level,levelXP:xp%1000,
    badges:[total>=1,total>=100,total>=500,longest>=3,longest>=7,longest>=30]};
}
