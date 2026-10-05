import { prayerNames } from "../domain/prayer-timer.js";
const apiNames = ["Fajr", "Dhuhr", "Asr", "Maghrib", "Isha"];
export function createPrayerAPI({ fetcher = globalThis.fetch } = {}) {
  return {
    async load({ date, source, method, signal }) {
      const path = source.type === "coords" ? "timings" : "timingsByAddress";
      const params = new URLSearchParams({ method: String(method) });
      if (source.type === "coords") {
        params.set("latitude", source.lat);
        params.set("longitude", source.lon);
      } else params.set("address", source.address);
      const response = await fetcher(
        `https://api.aladhan.com/v1/${path}/${date.split("-").reverse().join("-")}?${params}`,
        { signal },
      );
      if (!response.ok) throw Error("Namaz vakitleri alınamadı.");
      const json = await response.json(),
        times = {};
      prayerNames.forEach((name, i) => {
        const time = String(json?.data?.timings?.[apiNames[i]] || "").match(
          /\b([01]\d|2[0-3]):[0-5]\d\b/,
        );
        if (!time) throw Error("Namaz vakti geçersiz.");
        times[name] = time[0];
      });
      const sunrise = String(json?.data?.timings?.Sunrise || '').match(/\b([01]\d|2[0-3]):[0-5]\d\b/);
      if(sunrise) times['Güneş']=sunrise[0];
      const timezone = json.data.meta?.timezone;
      if (timezone) new Intl.DateTimeFormat("en", { timeZone: timezone });
      return { times, timezone };
    },
  };
}
