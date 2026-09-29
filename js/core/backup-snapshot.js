export function backupSnapshot(source, now) {
  const copy = JSON.parse(JSON.stringify(source)),
    t = copy.timer;
  if (t?.running && Number.isFinite(t.endAt) && Number.isFinite(t.startedAt)) {
    const end = Math.min(now, t.endAt),
      seconds = Math.max(0, (end - t.startedAt) / 1000);
    if (copy.mode === "focus" && seconds > 0 && Array.isArray(copy.sessions))
      copy.sessions.push({
        id: globalThis.crypto?.randomUUID?.() || String(now) + Math.random(),
        at: new Date(end).toISOString(),
        subject: copy.subject || "Derssiz",
        seconds,
        complete: end >= t.endAt,
      });
    t.remaining = Math.max(0, (t.endAt - now) / 1000);
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
