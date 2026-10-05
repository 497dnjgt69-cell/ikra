import { datekey } from "../shared/format.js";
import { prayerNames as names } from "./prayer-timer.js";
export function prayerWallNow(d, now = new Date()) {
  const zone =
    d.prayerTimeZone || Intl.DateTimeFormat().resolvedOptions().timeZone;
  let parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-CA", {
      timeZone: zone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hourCycle: "h23",
    })
      .formatToParts(now)
      .map((x) => [x.type, x.value]),
  );
  return {
    date: parts.year + "-" + parts.month + "-" + parts.day,
    seconds: +parts.hour * 3600 + +parts.minute * 60 + +parts.second,
    zone,
  };
}
function wallEpoch(date, time, zone) {
  const [y, m, day] = date.split("-").map(Number),
    [h, min] = time.split(":").map(Number);
  const desired = Date.UTC(y, m - 1, day, h, min);
  let epoch = desired;
  for (let i = 0; i < 3; i++) {
    const parts = Object.fromEntries(
      new Intl.DateTimeFormat("en-CA", {
        timeZone: zone,
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hourCycle: "h23",
      })
        .formatToParts(new Date(epoch))
        .map((x) => [x.type, x.value]),
    );
    const actual = Date.UTC(
      +parts.year,
      +parts.month - 1,
      +parts.day,
      +parts.hour,
      +parts.minute,
      +parts.second,
    );
    epoch += desired - actual;
  }
  return epoch;
}
export function getNextPrayer(d, now) {
  const wall = prayerWallNow(d, new Date(now));
  if (d.prayerDate !== wall.date) return null;
  for (const name of names) {
    const time = d.prayerTimes[name];
    if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(time || "")) continue;
    const epoch = wallEpoch(wall.date, time, wall.zone);
    if (epoch > now)
      return {
        name,
        time,
        minutes: Math.ceil((epoch - now) / 60000),
        tomorrow: false,
      };
  }
  const tomorrow = new Date(wall.date + "T12:00:00");
  tomorrow.setDate(tomorrow.getDate() + 1);
  const key = datekey(tomorrow);
  if (d.prayerTomorrow?.date === key && d.prayerTomorrow.times?.Sabah) {
    const time = d.prayerTomorrow.times.Sabah,
      epoch = wallEpoch(key, time, wall.zone);
    return {
      name: "Sabah",
      time,
      minutes: Math.max(0, Math.ceil((epoch - now) / 60000)),
      tomorrow: true,
    };
  }
  return null;
}

// Only notify near an actual start, never replay old times after opening the app.
export function getStartedPrayer(d, now, since) {
  if (since == null || now <= since) return null;
  const wall = prayerWallNow(d, new Date(now));
  const times = d.prayerDate === wall.date ? d.prayerTimes
    : d.prayerTomorrow?.date === wall.date ? d.prayerTomorrow.times : null;
  if (!times) return null;
  const threshold = Math.max(since, now - 60000);
  for (const name of names) {
    const time = times[name];
    if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(time || "")) continue;
    const epoch = wallEpoch(wall.date, time, wall.zone);
    if (epoch > threshold && epoch <= now)
      return { name, key: wall.zone + ":" + wall.date + ":" + name };
  }
  return null;
}

export function getFajrEnd(d, now) {
  const wall=prayerWallNow(d,new Date(now));
  const time=d.prayerTimes?.['Güneş'],start=d.prayerTimes?.Sabah;
  if(d.prayerDate!==wall.date || !/^([01]\d|2[0-3]):[0-5]\d$/.test(time||'') || !/^([01]\d|2[0-3]):[0-5]\d$/.test(start||'')) return null;
  const end=wallEpoch(wall.date,time,wall.zone),begin=wallEpoch(wall.date,start,wall.zone);
  if(end<=begin) return null;
  return {time,active:now>=begin&&now<end,ended:now>=end,minutes:Math.max(0,Math.ceil((end-now)/60000))};
}
