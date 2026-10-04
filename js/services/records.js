import { prayerNames } from "../domain/prayer-timer.js";
import { ensureSubject } from "../domain/subjects.js";
import { datekey, isDateKey, newId } from "../shared/format.js";
import { FEATURES } from "../config/features.js";
export function createRecords({ store, access, now = Date.now }) {
  return Object.freeze({
    setPrayerCheck(date, name, done) {
      access.require(FEATURES.PRAYER);
      if (!isDateKey(date) || date > datekey(now()) || !prayerNames.includes(name) || typeof done !== "boolean")
        throw Error("Geçerli bir tarih ve vakit seç.");
      store.update(d => {
        d.prayerChecks ||= {};
        d.prayerChecks[date] ||= {};
        d.prayerChecks[date][name] = done;
      });
    },
    addManual({ subject, minutes, date, time = "12:00" }) {
      access.require(FEATURES.HISTORY);
      subject = String(subject).trim().slice(0, 60);
      if (!subject) throw Error("Bir ders seç veya dersin adını yaz.");
      if (!Number.isInteger(minutes) || minutes < 1 || minutes > 1440)
        throw Error("1–1440 arasında tam sayı olarak dakika gir.");
      if (!isDateKey(date) || date > datekey(now()))
        throw Error("Bugün veya geçmişte geçerli bir tarih seç.");
      if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(time)) throw Error("Geçerli bir saat seç.");
      const at = new Date(date + "T" + time + ":00");
      if (at.getTime() > now()) throw Error("Geleceğe oturum eklenemez.");
      const record = {
        id: newId(),
        subject,
        seconds: minutes * 60,
        at: at.toISOString(),
        complete: true,
        manual: true,
        timeKnown: true,
      };
      store.update((d) => {
        ensureSubject(d, subject);
        d.sessions.push(record);
        d.statsView = "all";
      });
      return record;
    },
    remove(id, type) {
      access.require(FEATURES.HISTORY);
      const field = type === "prayer" ? "prayers" : "sessions",
        index = store.state[field].findIndex((r) => r.id === id);
      if (index < 0) return;
      const record = structuredClone(store.state[field][index]);
      store.update((d) => {
        d[field].splice(index, 1);
      });
      return () => {
        store.update((d) => {
          if (!d[field].some((r) => r.id === record.id))
            d[field].splice(Math.min(index, d[field].length), 0, record);
        });
      };
    },
  });
}
