import { newId } from "../shared/format.js";
export const prayerNames = Object.freeze([
  "Sabah",
  "Öğle",
  "İkindi",
  "Akşam",
  "Yatsı",
]);
export function newPrayerTimer(name, minutes) {
  return {
    name,
    remaining: minutes * 60,
    duration: minutes * 60,
    elapsed: 0,
    running: false,
    endAt: null,
    segmentStartedAt: null,
    recorded: false,
  };
}
export function creditPrayer(d, now) {
  const t = d.prayerTimer;
  if (!t?.running || t.segmentStartedAt === null) return;
  const end = Math.min(now, t.endAt);
  t.elapsed += Math.max(0, (end - t.segmentStartedAt) / 1000);
  t.segmentStartedAt = end;
}
export function recordPrayer(d, now) {
  const t = d.prayerTimer;
  if (!t || t.recorded) return;
  if (t.elapsed > 0)
    d.prayers.push({
      id: newId(),
      name: t.name,
      at: new Date(now).toISOString(),
      seconds: Math.round(t.elapsed),
    });
  t.recorded = true;
}
export function settlePrayer(d, now) {
  const t = d.prayerTimer;
  if (!t?.running) return null;
  if (now < t.endAt) {
    t.remaining = (t.endAt - now) / 1000;
    return null;
  }
  creditPrayer(d, t.endAt);
  Object.assign(t, {
    running: false,
    remaining: 0,
    endAt: null,
    segmentStartedAt: null,
  });
  recordPrayer(d, now);
  return { name: t.name, seconds: t.elapsed };
}
