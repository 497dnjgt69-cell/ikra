import { datekey } from "../shared/format.js";
import { prayerWallNow, getNextPrayer, getStartedPrayer, getFajrEnd } from "../domain/prayer-times.js";
import { FEATURES } from "../config/features.js";
export function createPrayerTimes({
  store,
  access,
  api,
  now = Date.now,
  onChange = () => {},
  onPrayerStart = () => {},
}) {
  let lastCheck = now();
  const notified = new Set();
  let generation = 0,
    controller = null,
    loading = false,
    attempt = -Infinity,
    tomorrowAttempt = -Infinity,
    tomorrowController = null,
    retrySource = null,
    message = "";
  function invalidate() {
    lastCheck = now();
    generation++;
    controller?.abort();
    tomorrowController?.abort();
    tomorrowController = null;
    tomorrowAttempt = -Infinity;
    retrySource = null;
    controller = null;
    loading = false;
    message = "";
  }
  async function request(date, source, method, signal) {
    return api.load({ date, source, method, signal });
  }
  async function fetchTomorrow() {
    const d = store.state,
      source = d.prayerSource;
    if (!source || source.type === "manual" || tomorrowController || now() - tomorrowAttempt < 300000) return;
    const wall = prayerWallNow(d, new Date(now())),
      tomorrow = new Date(wall.date + "T12:00:00");
    tomorrow.setDate(tomorrow.getDate() + 1);
    const date = datekey(tomorrow);
    if (d.prayerTomorrow?.date === date) return;
    const token = generation,
      method = d.method,
      abort = new AbortController(),
      timer = setTimeout(() => abort.abort(), 12000);
    tomorrowController = abort;
    tomorrowAttempt = now();
    try {
      const data = await request(date, source, method, abort.signal);
      if (token !== generation) return;
      store.update((next) => {
        next.prayerTomorrow = { date, times: data.times };
      });
    } catch {
    } finally {
      clearTimeout(timer);
      if (tomorrowController === abort) tomorrowController = null;
    }
  }
  async function fetchForSource(source) {
    access.require(FEATURES.PRAYER);
    if (!["address", "coords"].includes(source.type)) return;
    invalidate();
    const token = generation;
    controller = new AbortController();
    const abort = controller,
      timer = setTimeout(() => abort.abort(), 12000);
    let date = prayerWallNow(store.state, new Date(now())).date;
    const method = store.state.method;
    loading = true;
    attempt = now();
    message = "Vakitler yenileniyor…";
    onChange();
    try {
      let result = await request(date, source, method, abort.signal);
      if (token !== generation) return;
      // A newly selected location can be on a different calendar day.
      const localDate = prayerWallNow({prayerTimeZone: result.timezone || store.state.prayerTimeZone}, new Date(now())).date;
      if (localDate !== date) {
        date = localDate;
        result = await request(date, source, method, abort.signal);
      }
      if (token !== generation) return;
      store.update((d) => {
        if (
          JSON.stringify(d.prayerSource) !== JSON.stringify(source) ||
          d.prayerMethod !== method
        )
          d.prayerTomorrow = null;
        d.prayerTimes = result.times;
        d.prayerTimeZone =
          result.timezone ||
          d.prayerTimeZone ||
          Intl.DateTimeFormat().resolvedOptions().timeZone;
        d.prayerDate = date;
        d.prayerSource = source;
        d.prayerMethod = method;
        d.prayerLocation =
          source.type === "address"
            ? source.address
            : d.prayerLocation || "Konumum";
      });
      retrySource = null;
      message = "";
      void fetchTomorrow();
    } catch {
      if (token !== generation) return;
      retrySource = source;
      message =
        "Yenilenemedi. " +
        (store.state.prayerDate
          ? store.state.prayerDate +
            " tarihli kayıt korunuyor. Otomatik olarak tekrar denenecek."
          : "İnternet bağlantısını kontrol et.");
    } finally {
      clearTimeout(timer);
      if (token === generation) {
        loading = false;
        controller = null;
        onChange();
      }
    }
  }
  function refresh(force = false) {
    if (loading) return;
    let d = store.state;
    const today = prayerWallNow(d, new Date(now())).date;
    let source = retrySource || d.prayerSource;
    if (!source && d.prayerLocation && !["Konumum", "Elle girildi"].includes(d.prayerLocation))
      source = {type: "address", address: d.prayerLocation};
    if (!source || source.type === "manual") return;
    // Promote prefetched times at local midnight, including while offline.
    if (!retrySource && d.prayerDate !== today && d.prayerTomorrow?.date === today &&
        d.prayerMethod === d.method && d.prayerTomorrow.times?.["Güneş"]) {
      store.update(next => {
        next.prayerTimes = next.prayerTomorrow.times;
        next.prayerDate = today;
        next.prayerTomorrow = null;
      });
      d = store.state;
      message = "";
      tomorrowAttempt = -Infinity;
      onChange();
    }
    const current = d.prayerDate === today &&
      ["Sabah", "Güneş", "Öğle", "İkindi", "Akşam", "Yatsı"].every(name => d.prayerTimes[name]) &&
      (!d.prayerMethod || d.prayerMethod === d.method);
    if (!force && current && !retrySource) return fetchTomorrow();
    if (!force && now() - attempt < 300000) return;
    return fetchForSource(source);
  }
  return Object.freeze({
    checkStarted() {
      const time = now();
      const event = getStartedPrayer(store.state, time, lastCheck);
      lastCheck = time;
      if (!event || notified.has(event.key)) return;
      notified.add(event.key);
      if (notified.size > 20) notified.delete(notified.values().next().value);
      onPrayerStart(event);
    },
    fetchForSource,
    fetchTomorrow,
    refresh,
    invalidate,
    get loading() {
      return loading;
    },
    status() {
      const date = store.state.prayerDate;
      return (
        message ||
        (date && date !== prayerWallNow(store.state, new Date(now())).date
          ? date +
            " tarihli kayıt gösteriliyor; güncel vakitler henüz alınmadı."
          : date
            ? "Güncel · " + date
            : "")
      );
    },
    next: () => getNextPrayer(store.state, now()),
    fajrEnd: () => getFajrEnd(store.state, now()),
    wall: () => prayerWallNow(store.state, new Date(now())),
    setMethod(method) {
      if (!["2", "3", "13"].includes(String(method))) return;
      invalidate();
      store.update((d) => {
        d.method = String(method);
      });
      return refresh(true);
    },
    setManual(name, time, location) {
      access.require(FEATURES.PRAYER);
      if (
        !["Sabah", "Güneş", "Öğle", "İkindi", "Akşam", "Yatsı"].includes(name) ||
        (time && !/^([01]\d|2[0-3]):[0-5]\d$/.test(time))
      )
        return;
      invalidate();
      store.update((d) => {
        d.prayerSource = { type: "manual" };
        d.prayerTimes[name] = time;
        d.prayerDate = prayerWallNow(d, new Date(now())).date;
        d.prayerLocation = location || d.prayerLocation || "Elle girildi";
        d.prayerTomorrow = null;
      });
    },
    togglePeek() {
      store.update((d) => {
        d.prayerPeek = !d.prayerPeek;
      });
    },
    clearMessage() {
      message = "";
    },
  });
}
