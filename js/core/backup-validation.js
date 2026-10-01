import { backupSnapshot } from "./backup-snapshot.js";
export function normalizeBackup(payload, { fresh, isDateKey, names }) {
  if (!payload || typeof payload !== "object")
    throw Error("Geçerli bir yedek seç.");
  if (payload.format && !["mahir-focus-v1", "ikra-v1"].includes(payload.format))
    throw Error("Bu yedek biçimi desteklenmiyor.");
  const source = payload.data || payload;
  const at = Date.parse(payload.exportedAt);
  const raw = backupSnapshot(source, Number.isFinite(at) ? at : Date.now());
  if (
    !Array.isArray(raw.sessions) ||
    !Array.isArray(raw.tasks) ||
    !Array.isArray(raw.subjects)
  )
    throw Error("Yedekte çalışma, görev veya ders listesi eksik.");
  const clean = fresh();
  const finite = (n, min, max) => Number.isFinite(n) && n >= min && n <= max;
  const validString = (x) => typeof x === "string" && x.length <= 200;
  let derived = new Set();
  clean.sessions = raw.sessions.map((item, index) => {
    if (
      !item ||
      !finite(item.seconds, 0, 31536000) ||
      typeof item.at !== "string" ||
      isNaN(Date.parse(item.at)) ||
      !validString(item.subject)
    )
      throw Error(
        "Çalışma kaydı " +
          (index + 1) +
          " geçersiz. Hiçbir veri değiştirilmedi.",
      );
    const subject = item.subject.trim() || "Derssiz";
    derived.add(subject);
    return { ...item, subject, at: new Date(item.at).toISOString() };
  });
  clean.tasks = raw.tasks.map((t, index) => {
    if (
      !t ||
      !validString(t.text) ||
      typeof t.done !== "boolean" ||
      (t.subject !== undefined && !validString(t.subject)) ||
      (t.due && !isDateKey(t.due))
    )
      throw Error("Görev " + (index + 1) + " geçersiz.");
    if (t.subject) derived.add(t.subject);
    return { ...t };
  });
  if (raw.subjects.some((x) => !validString(x)))
    throw Error("Ders listesi geçersiz.");
  clean.archivedSubjects = Array.isArray(raw.archivedSubjects)
    ? raw.archivedSubjects.filter(validString)
    : [];
  clean.subjects = [
    ...new Set([...raw.subjects.filter(Boolean), ...derived]),
  ].filter((name) => !clean.archivedSubjects.includes(name));
  clean.subject = clean.subjects.includes(raw.subject)
    ? raw.subject
    : clean.subjects[0] || "";
  clean.subjectColors = Object.fromEntries(
    [...new Set([...clean.subjects, ...clean.archivedSubjects])].map(
      (name, i) => [
        name,
        /^#[0-9a-f]{6}$/i.test(raw.subjectColors?.[name] || "")
          ? raw.subjectColors[name]
          : ["#6d91c7", "#b887c4", "#65a69b", "#c49b61", "#cf8390", "#8189bd"][
              i % 6
            ],
      ],
    ),
  );
  if (raw.prayers !== undefined && !Array.isArray(raw.prayers))
    throw Error("Namaz kayıtları geçersiz.");
  clean.prayers = (raw.prayers || []).map((p) => {
    if (
      !p ||
      !validString(p.name) ||
      !finite(p.seconds, 0, 31536000) ||
      isNaN(Date.parse(p.at))
    )
      throw Error("Namaz kayıtlarından biri geçersiz.");
    return { ...p };
  });
  if (raw.prayerChecks != null) {
    if (typeof raw.prayerChecks !== "object" || Array.isArray(raw.prayerChecks))
      throw Error("Namaz takip kayıtları geçersiz.");
    for (const [date, values] of Object.entries(raw.prayerChecks)) {
      if (!isDateKey(date) || !values || typeof values !== "object" || Array.isArray(values))
        throw Error("Namaz takip kayıtları geçersiz.");
      clean.prayerChecks[date] = {};
      for (const [name, done] of Object.entries(values)) {
        if (!names.includes(name) || typeof done !== "boolean") throw Error("Namaz takip kayıtları geçersiz.");
        clean.prayerChecks[date][name] = done;
      }
    }
  }
  for (const mode of ["focus", "break", "long"]) {
    const n = raw.durations?.[mode];
    if (n !== undefined && !finite(n, 1, 240))
      throw Error("Sayaç süresi geçersiz.");
    if (n !== undefined) clean.durations[mode] = n;
  }
  clean.theme = ["light", "dark", "nature"].includes(raw.theme)
    ? raw.theme
    : raw.theme === "cream" || raw.theme === "rose"
      ? "light"
      : "dark";
  clean.mode = ["focus", "break", "long", "clock"].includes(raw.mode)
    ? raw.mode
    : "focus";
  clean.clockView = !!raw.clockView;
  clean.auto = !!raw.auto;
  clean.sound = raw.sound !== false;
  clean.soundVolume = finite(raw.soundVolume, 0, 1) ? raw.soundVolume : 0.22;
  clean.longEvery = finite(raw.longEvery, 0, 24) ? raw.longEvery : 0;
  clean.round = finite(raw.round, 0, 1000000) ? raw.round : 0;
  clean.prayerDuration = finite(raw.prayerDuration, 1, 99)
    ? raw.prayerDuration
    : 10;
  clean.timer = {
    running: false,
    remaining: clean.mode === "clock" ? 0 : clean.durations[clean.mode] * 60,
    endAt: null,
    startedAt: null,
    credited: 0,
  };
  if (finite(raw.timer?.remaining, 0, 14400))
    clean.timer.remaining = raw.timer.remaining;
  if (validString(raw.timer?.focusSessionId) && raw.timer.focusSessionId)
    clean.timer.focusSessionId = raw.timer.focusSessionId;
  const pt = raw.prayerTimer;
  if (pt) {
    if (
      !names.includes(pt.name) ||
      !finite(pt.remaining, 0, 14400) ||
      !finite(pt.elapsed, 0, 31536000) ||
      !finite(pt.duration, 1, 14400)
    )
      throw Error("Namaz sayacı geçersiz.");
    clean.prayerTimer = {
      name: pt.name,
      remaining: pt.remaining,
      elapsed: pt.elapsed,
      duration: pt.duration,
      running: false,
      endAt: null,
      segmentStartedAt: null,
      recorded: !!pt.recorded,
    };
    clean.prayerView = true;
  }
  clean.prayerLocation = validString(raw.prayerLocation)
    ? raw.prayerLocation
    : "";
  clean.prayerDate = isDateKey(raw.prayerDate) ? raw.prayerDate : "";
  clean.method = ["2", "3", "13"].includes(String(raw.method))
    ? String(raw.method)
    : "2";
  clean.prayerTimes = Object.fromEntries(
    names
      .filter((n) =>
        /^([01]\d|2[0-3]):[0-5]\d$/.test(raw.prayerTimes?.[n] || ""),
      )
      .map((n) => [n, raw.prayerTimes[n]]),
  );
  const src = raw.prayerSource;
  if (src?.type === "manual") clean.prayerSource = { type: "manual" };
  else if (src?.type === "address" && validString(src.address))
    clean.prayerSource = { type: "address", address: src.address };
  else if (
    src?.type === "coords" &&
    finite(src.lat, -90, 90) &&
    finite(src.lon, -180, 180)
  )
    clean.prayerSource = { type: "coords", lat: src.lat, lon: src.lon };
  if (typeof raw.prayerTimeZone === "string") {
    try {
      new Intl.DateTimeFormat("en", { timeZone: raw.prayerTimeZone });
      clean.prayerTimeZone = raw.prayerTimeZone;
    } catch {}
  }
  clean.widgetPositions = Object.fromEntries(
    Object.entries(raw.widgetPositions || {}).filter(
      ([name, pos]) =>
        ["heatmap", "prayer"].includes(name) &&
        pos &&
        finite(pos.x, 0, 1) &&
        finite(pos.y, 0, 1),
    ),
  );
  clean.view = ["week", "month"].includes(raw.view) ? raw.view : "week";
  clean.statsView = "all";
  clean.taskFilter = ["active", "done", "all"].includes(raw.taskFilter)
    ? raw.taskFilter
    : "active";
  return clean;
}
