import { datekey } from "../shared/format.js";
import { prayerWallNow, getNextPrayer } from "../domain/prayer-times.js";
import { FEATURES } from "../config/features.js";
export function createPrayerTimes({
  store,
  access,
  api,
  now = Date.now,
  onChange = () => {},
}) {
  let generation = 0,
    controller = null,
    loading = false,
    attempt = 0,
    message = "";
  function invalidate() {
    generation++;
    controller?.abort();
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
    if (!source || source.type === "manual") return;
    const wall = prayerWallNow(d, new Date(now())),
      tomorrow = new Date(wall.date + "T12:00:00");
    tomorrow.setDate(tomorrow.getDate() + 1);
    const date = datekey(tomorrow);
    if (d.prayerTomorrow?.date === date) return;
    const token = generation,
      method = d.method,
      abort = new AbortController(),
      timer = setTimeout(() => abort.abort(), 12000);
    try {
      const data = await request(date, source, method, abort.signal);
      if (token !== generation) return;
      store.update((next) => {
        next.prayerTomorrow = { date, times: data.times };
      });
    } catch {
    } finally {
      clearTimeout(timer);
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
    const date = datekey(now()),
      method = store.state.method;
    loading = true;
    attempt = now();
    message = "Vakitler yenileniyor…";
    onChange();
    try {
      const result = await request(date, source, method, abort.signal);
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
      message = "";
      void fetchTomorrow();
    } catch {
      if (token !== generation) return;
      message =
        "Yenilenemedi. " +
        (store.state.prayerDate
          ? store.state.prayerDate +
            " tarihli kayıt korunuyor; bugünün vakitleri değildir."
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
    const d = store.state;
    if (
      !force &&
      (now() - attempt < 300000 ||
        (d.prayerDate === datekey(now()) &&
          (!d.prayerMethod || d.prayerMethod === d.method)))
    )
      return;
    let source = d.prayerSource;
    if (
      !source &&
      d.prayerLocation &&
      !["Konumum", "Elle girildi"].includes(d.prayerLocation)
    )
      source = { type: "address", address: d.prayerLocation };
    if (source && source.type !== "manual") return fetchForSource(source);
  }
  return Object.freeze({
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
        (date && date !== datekey(now())
          ? date +
            " tarihli kayıt gösteriliyor; güncel vakitler henüz alınmadı."
          : date
            ? "Güncel · " + date
            : "")
      );
    },
    next: () => getNextPrayer(store.state, now()),
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
        !["Sabah", "Öğle", "İkindi", "Akşam", "Yatsı"].includes(name) ||
        (time && !/^([01]\d|2[0-3]):[0-5]\d$/.test(time))
      )
        return;
      invalidate();
      store.update((d) => {
        d.prayerSource = { type: "manual" };
        d.prayerTimes[name] = time;
        d.prayerDate = datekey(now());
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
