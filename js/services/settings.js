import { FEATURES } from "../config/features.js";
export function createSettings({ store, access }) {
  return Object.freeze({
    setTheme(theme) {
      access.require(FEATURES.THEMES);
      if (["light", "dark", "nature", "neumorphism"].includes(theme))
        store.update((d) => {
          d.theme = theme;
        });
    },
    setAuto(value) {
      store.update((d) => {
        d.auto = !!value;
      });
    },
    setLongEvery(value) {
      if (!Number.isInteger(value) || value < 0 || value > 24) return false;
      store.update((d) => {
        d.longEvery = value;
        d.round = 0;
      });
      return true;
    },
    setSound(value) {
      store.update((d) => {
        d.sound = !!value;
      });
    },
    setVolume(value) {
      if (Number.isFinite(value) && value >= 0 && value <= 1)
        store.update((d) => {
          d.soundVolume = value;
        });
    },
    setWidget({ reset, id, position }) {
      if (!reset && !["heatmap", "prayer"].includes(id)) return;
      store.update((d) => {
        if (reset) d.widgetPositions = {};
        else d.widgetPositions[id] = position;
      });
    },
    setStats(view, anchor) {
      access.require(FEATURES.STATISTICS);
      if (["week", "month", "year", "all"].includes(view))
        store.update((d) => {
          d.statsView = view;
          d.statsAnchor = anchor;
        });
    },
    setHeatmap(view) {
      if (["week", "month"].includes(view))
        store.update((d) => {
          d.view = view;
        });
    },
  });
}
