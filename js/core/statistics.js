export function aggregateStats(records, view, anchor) {
  const at = new Date(anchor),
    start = new Date(at.getFullYear(), at.getMonth(), at.getDate()),
    end = new Date(start);
  let unit = "day";
  if (view === "week") {
    start.setDate(start.getDate() - ((start.getDay() + 6) % 7));
    end.setTime(start.getTime());
    end.setDate(end.getDate() + 7);
  } else if (view === "month") {
    start.setDate(1);
    end.setTime(start.getTime());
    end.setMonth(end.getMonth() + 1);
  } else if (view === "year") {
    start.setMonth(0, 1);
    end.setTime(start.getTime());
    end.setFullYear(end.getFullYear() + 1);
    unit = "month";
  } else {
    start.setTime(0);
    end.setTime(8640000000000000);
    unit = "year";
  }
  const rows = records.filter(
      (s) =>
        Number.isFinite(+s.seconds) &&
        s.seconds > 0 &&
        new Date(s.at) >= start &&
        new Date(s.at) < end,
    ),
    days = new Set(),
    subjects = {},
    buckets = {};
  let total = 0,
    completed = 0;
  for (const s of rows) {
    const x = new Date(s.at),
      day =
        x.getFullYear() +
        "-" +
        String(x.getMonth() + 1).padStart(2, "0") +
        "-" +
        String(x.getDate()).padStart(2, "0"),
      key =
        unit === "year"
          ? day.slice(0, 4)
          : unit === "month"
            ? day.slice(0, 7)
            : day;
    days.add(day);
    subjects[s.subject] = (subjects[s.subject] || 0) + +s.seconds;
    buckets[key] = (buckets[key] || 0) + +s.seconds;
    total += +s.seconds;
    if (s.complete) completed++;
  }
  return {
    total,
    completed,
    days: days.size,
    subjects,
    buckets,
    start,
    end,
    unit,
  };
}
