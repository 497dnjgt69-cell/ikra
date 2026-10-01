import { datekey } from '../shared/format.js';

// Records are elapsed segments; only segments sharing an explicit timer session
// can be combined. Legacy records remain independent because their grouping is unknown.
export function focusStreak(records, now = new Date()) {
  const groups = new Map();
  for (const record of records) {
    const at = new Date(record.at), seconds = Number(record.seconds);
    if (!Number.isFinite(+at) || at > now || !Number.isFinite(seconds) || seconds <= 0) continue;
    const key = record.focusSessionId || record;
    const group = groups.get(key) || { seconds: 0, completion: null };
    group.seconds += seconds;
    if (record.complete === true && (!group.completion || at > group.completion)) group.completion = at;
    groups.set(key, group);
  }
  const days = new Set();
  for (const group of groups.values()) {
    if (group.completion && group.seconds >= 900) days.add(datekey(group.completion));
  }
  const previous = key => {
    const day = new Date(key + 'T12:00:00');
    day.setDate(day.getDate() - 1);
    return datekey(day);
  };
  const today = datekey(now);
  let current = 0, longest = 0, run = 0, last = null;
  for (const day of [...days].sort()) {
    run = last === previous(day) ? run + 1 : 1;
    longest = Math.max(longest, run);
    last = day;
  }
  let cursor = days.has(today) ? today : previous(today);
  while (days.has(cursor)) { current++; cursor = previous(cursor); }
  return { current, longest, today: days.has(today) };
}
