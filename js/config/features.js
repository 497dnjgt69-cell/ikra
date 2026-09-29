// Existing capabilities stay available. Change commercial policy only here.
export const FEATURES = Object.freeze({
  TIMER: "timer",
  PLANNER: "planner",
  HISTORY: "history",
  STATISTICS: "statistics",
  PRAYER: "prayer",
  THEMES: "themes",
  BACKUP: "backup",
  FOCUS_VIEW: "focus-view",
  CUSTOM_PRESETS: "custom-presets",
});
export const featureCatalog = Object.freeze(
  Object.fromEntries(
    Object.values(FEATURES).map((id) => [
      id,
      Object.freeze({
        minimumPlan: id === FEATURES.CUSTOM_PRESETS ? "pro" : "free",
        // Reserved capability; there is no purchase UI or preset implementation yet.
        implemented: id !== FEATURES.CUSTOM_PRESETS,
      }),
    ]),
  ),
);
