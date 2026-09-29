import {
  newPrayerTimer,
  creditPrayer,
  recordPrayer,
  settlePrayer,
  prayerNames,
} from "../domain/prayer-timer.js";
import { FEATURES } from "../config/features.js";
export function createPrayerTimer({
  store,
  access,
  focus,
  now = Date.now,
  onComplete = () => {},
}) {
  function settle() {
    if (!store.state.prayerTimer?.running) return;
    const time = now(),
      finished = time >= store.state.prayerTimer.endAt;
    if (!finished) {
      store.previewTimer("prayerTimer", (timer) => {
        timer.remaining = Math.max(0, (timer.endAt - time) / 1000);
      });
      return;
    }
    const event = store.update((d) => settlePrayer(d, time), {
      persist: finished,
      notify: finished,
    });
    if (event) onComplete(event);
  }
  function pause() {
    settle();
    if (!store.state.prayerTimer?.running) return;
    store.update((d) => {
      const t = d.prayerTimer;
      creditPrayer(d, now());
      t.remaining = Math.max(0, (t.endAt - now()) / 1000);
      Object.assign(t, { running: false, endAt: null, segmentStartedAt: null });
    });
  }
  function leave() {
    pause();
    return store.update((d) => {
      const t = d.prayerTimer;
      const result =
        t && !t.recorded && t.elapsed > 0
          ? { name: t.name, seconds: t.elapsed }
          : null;
      recordPrayer(d, now());
      d.prayerTimer = null;
      d.prayerView = false;
      return result;
    });
  }
  return Object.freeze({
    pause,
    settle,
    leave,
    enter() {
      access.require(FEATURES.PRAYER);
      focus.pause();
      store.update((d) => {
        d.prayerView = true;
      });
    },
    begin(name) {
      access.require(FEATURES.PRAYER);
      if (!store.state.prayerView || !prayerNames.includes(name)) return;
      focus.pause();
      settle();
      if (store.state.prayerTimer?.running) return pause();
      store.update((d) => {
        if (!d.prayerTimer || d.prayerTimer.recorded)
          d.prayerTimer = newPrayerTimer(name, d.prayerDuration);
        const t = d.prayerTimer,
          time = now();
        Object.assign(t, {
          running: true,
          segmentStartedAt: time,
          endAt: time + t.remaining * 1000,
        });
      });
    },
    reset(name) {
      pause();
      store.update((d) => {
        recordPrayer(d, now());
        d.prayerTimer = newPrayerTimer(
          prayerNames.includes(name) ? name : prayerNames[0],
          d.prayerDuration,
        );
      });
    },
    select(name) {
      if (prayerNames.includes(name))
        store.update((d) => {
          if (d.prayerTimer && !d.prayerTimer.recorded)
            d.prayerTimer.name = name;
        });
    },
    setDuration(minutes) {
      if (!Number.isInteger(minutes) || minutes < 1 || minutes > 99)
        return false;
      pause();
      store.update((d) => {
        recordPrayer(d, now());
        d.prayerDuration = minutes;
        d.prayerTimer = null;
      });
      return true;
    },
  });
}
