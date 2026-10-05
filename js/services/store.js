import { normalizeDock } from "../core/dock.js";
import { normalizeAnki, normalizeAnkiGoal } from "../core/anki.js";
import { fresh } from "../core/default-state.js";
import { newId } from "../shared/format.js";
export const STORAGE_KEY = "mahir-focus-v1";
export const SCHEMA_VERSION = 1;

export function migrateState(input, now = Date.now()) {
  const valid =
    input && input.timer && input.durations && Array.isArray(input.sessions);
  const state = { ...fresh(), ...(valid ? structuredClone(input) : {}) };
  state.schemaVersion = SCHEMA_VERSION;
  state.dock = normalizeDock(state.dock);
  state.ankiGoal = normalizeAnkiGoal(state.ankiGoal);
  try { state.anki = normalizeAnki(state.anki); } catch { state.anki = null; }
  // Licensing is deliberately outside study data, including legacy/imported payloads.
  for (const key of ["isPro", "plan", "entitlements", "license"])
    delete state[key];
  state.durations = { ...fresh().durations, ...state.durations };
  // Older versions treated the clock as a timer mode and cleared its timer.
  if (state.mode === "clock") {
    state.mode = "focus";
    state.clockView = true;
    state.timer = { ...fresh().timer, remaining: state.durations.focus * 60 };
  }
  state.clockView = !!state.clockView;
  state.subjectColors ||= {};
  for (const key of ["tasks", "sessions", "prayers"]) {
    state[key] = (Array.isArray(state[key]) ? state[key] : []).map((item) => ({
      ...item,
      id: item.id ?? newId(),
    }));
  }
  state.subjects = Array.isArray(state.subjects) ? state.subjects : [];
  state.archivedSubjects = Array.isArray(state.archivedSubjects)
    ? state.archivedSubjects
    : [];
  if (!state.subjects.includes(state.subject))
    state.subject = state.subjects[0] || "";
  state.prayerPeek = false;
  state.prayerView = !!state.prayerTimer;
  if(state.prayerTimer && !state.prayerTimer.untimed){state.prayerTimer=null;state.prayerView=false;}
  if(state.prayerTimer?.untimed){state.prayerTimer.paused=true;state.prayerTimer.immersed=false;}
  if (!["light", "dark", "nature"].includes(state.theme))
    state.theme = state.theme === "rose" ? "light" : "dark";
  return state;
}
function freeze(value) {
  if (value && typeof value === "object" && !Object.isFrozen(value)) {
    Object.freeze(value);
    Object.values(value).forEach(freeze);
  }
  return value;
}
export function createStore({ storage, now = Date.now, onError = () => {} }) {
  const listeners = new Set();
  let initial;
  try {
    initial = JSON.parse(storage.getItem(STORAGE_KEY));
  } catch {}
  let state = freeze(migrateState(initial, now()));
  function commit(
    next,
    { persist = true, notify = true, backup = false } = {},
  ) {
    if (persist) {
      // Persist before publishing new state: failed writes never partially replace it.
      if (backup)
        storage.setItem(STORAGE_KEY + "-before-import", JSON.stringify(state));
      storage.setItem(STORAGE_KEY, JSON.stringify(next));
    }
    state = freeze(next);
    if (notify) for (const listener of listeners) listener(state);
  }
  return Object.freeze({
    get state() {
      return state;
    },
    update(mutator, options) {
      const next = structuredClone(state);
      const result = mutator(next);
      commit(next, options);
      return result;
    },
    previewTimer(field, mutator) {
      if (!["timer", "prayerTimer"].includes(field))
        throw Error("Unknown timer");
      const timer = structuredClone(state[field]);
      mutator(timer);
      // Reuse frozen history arrays on every tick; no cloning entire study history.
      commit({ ...state, [field]: timer }, { persist: false, notify: false });
    },
    replace(next, options) {
      commit(migrateState(next, now()), options);
    },
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    attempt(action) {
      try {
        return action();
      } catch (error) {
        onError(error);
        return false;
      }
    },
  });
}
