import { isStopwatch, timerSeconds, creditFocus } from "../domain/focus-timer.js";
export function backupSnapshot(source, now) {
  const copy = JSON.parse(JSON.stringify(source)),
    t = copy.timer;
  if (t?.running && (isStopwatch(copy) || Number.isFinite(t.endAt)) && Number.isFinite(t.startedAt)) {
    creditFocus(copy, now);
    t.remaining = timerSeconds(copy, now);
    t.running = false;
    t.endAt = null;
    t.startedAt = null;
    t.credited = 0;
  }
  const prayer = copy.prayerTimer;
  if (
    prayer?.running &&
    Number.isFinite(prayer.endAt) &&
    Number.isFinite(prayer.segmentStartedAt)
  ) {
    prayer.elapsed =
      (prayer.elapsed || 0) +
      Math.max(
        0,
        (Math.min(now, prayer.endAt) - prayer.segmentStartedAt) / 1000,
      );
    prayer.remaining = Math.max(0, (prayer.endAt - now) / 1000);
    prayer.running = false;
    prayer.endAt = null;
    prayer.segmentStartedAt = null;
  }
  return copy;
}
