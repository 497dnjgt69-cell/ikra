import { datekey } from "../shared/format.js";
import { prayerNames } from "../domain/prayer-timer.js";

// Session timestamps are segment ends. Split elapsed time at real hour boundaries
// instead of attributing a whole session to the hour when it finished.
export function focusDistribution(records, start, end) {
  const cells = Array.from({ length: 7 }, () => Array(24).fill(0));
  let excluded = 0;
  for (const record of records) {
    const finish = Date.parse(record.at), duration = Number(record.seconds) * 1000;
    if (!Number.isFinite(finish) || !Number.isFinite(duration) || duration <= 0) continue;
    if (record.manual && record.timeKnown !== true) {
      if (finish >= +start && finish < +end) excluded += duration / 1000;
      continue;
    }
    let cursor = Math.max(finish - duration, +start);
    const limit = Math.min(finish, +end);
    while (cursor < limit) {
      const local = new Date(cursor);
      // Advance by elapsed minutes: also handles a repeated hour on DST fallback.
      const boundary = cursor + (60 - local.getMinutes()) * 60000 - local.getSeconds() * 1000 - local.getMilliseconds();
      const next = Math.min(boundary, limit);
      cells[(local.getDay() + 6) % 7][local.getHours()] += (next - cursor) / 1000;
      cursor = next;
    }
  }
  const hours = Array.from({ length: 24 }, (_, h) => cells.reduce((sum, day) => sum + day[h], 0));
  const total = hours.reduce((a, b) => a + b, 0);
  const peak = Math.max(...hours);
  return { cells, hours, total, excluded, peakHours: peak ? hours.flatMap((v, h) => v === peak ? [h] : []) : [] };
}

export function prayerWeek(prayers, checks, anchor, now = new Date()) {
  const start = new Date(anchor);
  start.setHours(0, 0, 0, 0);
  start.setDate(start.getDate() - (start.getDay() + 6) % 7);
  const recorded = new Set(prayers.filter(p => p.seconds > 0 && prayerNames.includes(p.name))
    .map(p => datekey(p.at) + ":" + p.name));
  const today = datekey(now), counts = Object.fromEntries(prayerNames.map(n => [n, 0]));
  let total = 0, fullDays = 0;
  const days = Array.from({ length: 7 }, (_, i) => {
    const date = new Date(start); date.setDate(date.getDate() + i);
    const key = datekey(date), future = key > today;
    const values = prayerNames.map(name => !future &&
      (typeof checks?.[key]?.[name] === "boolean" ? checks[key][name] : recorded.has(key + ":" + name)));
    values.forEach((done, i) => { if (done) { counts[prayerNames[i]]++; total++; } });
    if (values.every(Boolean)) fullDays++;
    return { date, key, future, values };
  });
  return { days, counts, total, fullDays };
}
