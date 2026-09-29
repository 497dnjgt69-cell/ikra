import { createStore } from "../services/store.js";
import { createAccess } from "../services/access.js";
import { createFocusTimer } from "../services/focus-timer.js";
import { createPrayerTimer } from "../services/prayer-timer.js";
import { createPrayerTimes } from "../services/prayer-times.js";
import { createPrayerAPI } from "../platform/prayer-api.js";
import { createPlanner } from "../services/planner.js";
import { createRecords } from "../services/records.js";
import { createSettings } from "../services/settings.js";
import { createBackup } from "../services/backup.js";
import { createAudio } from "../features/audio.js";
import { createClockView } from "../ui/clock.js";
import { createTimerView } from "../ui/timer.js";
import { createPlannerView } from "../ui/planner.js";
import { createStatisticsView } from "../ui/statistics.js";
import { createPrayerView } from "../ui/prayer.js";
import { bindTimer } from "../controllers/timer.js";
import { bindPlanner } from "../controllers/planner.js";
import { bindSettings } from "../controllers/settings.js";
import { bindStatistics } from "../controllers/statistics.js";
import { bindManualSession } from "../controllers/manual-session.js";
import { bindPrayerTimes } from "../controllers/prayer-times.js";
import { bindBackup } from "../controllers/backup.js";
import { datekey } from "../shared/format.js";

// Composition root: dependencies and browser lifecycle only; no business rules.
export default function initialize({
  storage = localStorage,
  commerce,
  prayerAPI = createPrayerAPI(),
} = {}) {
  const toast = (message) => window.ikraNotify(message);
  const store = createStore({
    storage,
    onError: () =>
      toast("Kaydetme başarısız. Tarayıcı depolamasını kontrol et."),
  });
  const access = createAccess(commerce ? { provider: commerce } : {});
  const playSound = createAudio(() => store.state);
  const focus = createFocusTimer({
    store,
    access,
    onComplete: (event) => {
      playSound("finish");
      if (event.mode === "focus")
        window.ikraNotify(
          (event.subject || "Çalışma") +
            " · " +
            event.minutes +
            " dk. " +
            (event.auto ? "Mola başladı." : "Molan hazır."),
          {
            completion: true,
            title: event.count + ". çalışma oturumu tamamlandı",
          },
        );
      else
        window.ikraNotify(
          event.auto
            ? "Odak sayacı başladı."
            : "Hazır olduğunda yeni bir çalışma başlatabilirsin.",
          { completion: true, title: "Mola tamamlandı" },
        );
    },
  });
  const prayer = createPrayerTimer({
    store,
    access,
    focus,
    onComplete: (event) => {
      playSound("finish");
      window.ikraNotify(
        event.name +
          " · " +
          Math.round(event.seconds / 60) +
          " dakika kaydedildi.",
        { completion: true, title: "Namaz oturumu tamamlandı" },
      );
    },
  });
  let queued = false,
    disposed = false;
  function scheduleRender() {
    if (queued || disposed) return;
    queued = true;
    queueMicrotask(() => {
      queued = false;
      if (!disposed) render();
    });
  }
  const times = createPrayerTimes({
    store,
    access,
    api: prayerAPI,
    onChange: scheduleRender,
  });
  const planner = createPlanner({ store, access, focus });
  const records = createRecords({ store, access });
  const settings = createSettings({ store, access });
  const backup = createBackup({ store, access, focus, prayer });
  const clock = createClockView({ store });
  const timerView = createTimerView({ store });
  const plannerView = createPlannerView({
    store,
    planner,
    render: scheduleRender,
  });
  const statsView = createStatisticsView({ store, planner, records, access });
  const prayerView = createPrayerView({ store, times });
  function render() {
    plannerView.renderSubjectChoices();
    timerView.render();
    statsView.render();
    plannerView.renderTasks();
    prayerView.render();
    prayerView.updateNextPrayer();
    clock.render();
    document.dispatchEvent(new Event("focus-render"));
  }
  bindTimer({ store, focus, prayer, render: scheduleRender });
  bindPlanner({
    planner,
    render: scheduleRender,
    renderTasks: plannerView.renderTasks,
  });
  bindSettings({ store, settings, focus, render: scheduleRender, playSound });
  bindStatistics({ store, settings, renderAllStats: statsView.render });
  bindManualSession({ store, records, render, playSound });
  bindPrayerTimes({ times, render, toast });
  bindBackup({ backup, times, render, toast });
  const unsubscribe = store.subscribe(scheduleRender);
  const unsubscribeAccess = access.subscribe(scheduleRender);
  const tick = () =>
    store.attempt(() => {
      focus.settle();
      prayer.settle();
      prayerView.updateNextPrayer();
      clock.render();
    });
  let day = datekey(Date.now());
  const heartbeat = setInterval(tick, 1000);
  const refresh = setInterval(() => {
    const today = datekey(Date.now());
    if (today !== day) {
      day = today;
      times.clearMessage();
      scheduleRender();
    }
    void times.refresh();
  }, 60000);
  const online = () => void times.refresh(true);
  const visible = () => {
    if (!document.hidden) {
      tick();
      scheduleRender();
      void times.refresh();
    }
  };
  window.addEventListener("online", online);
  document.addEventListener("visibilitychange", visible);
  document.addEventListener("ikra-language", scheduleRender);
  document.addEventListener("ikra-action-failed", scheduleRender);
  void access.refresh().catch(() => {});
  tick();
  render();
  const initialFetch = setTimeout(() => {
    void times.refresh();
    void times.fetchTomorrow();
  }, 0);
  return {
    store,
    access,
    focus,
    prayer,
    planner,
    records,
    settings,
    backup,
    times,
    render,
    dispose() {
      disposed = true;
      clearInterval(heartbeat);
      clearInterval(refresh);
      clearTimeout(initialFetch);
      times.invalidate();
      document.removeEventListener("ikra-action-failed", scheduleRender);
      unsubscribe();
      unsubscribeAccess();
      window.removeEventListener("online", online);
      document.removeEventListener("visibilitychange", visible);
      document.removeEventListener("ikra-language", scheduleRender);
    },
  };
}
