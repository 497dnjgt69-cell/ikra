import { handleAction } from "../shared/actions.js";
import { $, $$ } from "../shared/dom.js";
import { datekey } from "../shared/format.js";

export function bindStatistics({ store, settings, renderAllStats }) {
  $$("[data-stats]").forEach(
    (b) =>
      (b.onclick = handleAction(() => {
        settings.setStats(b.dataset.stats, datekey(Date.now()));
        renderAllStats();
      })),
  );
  function shiftStats(direction) {
    let x = store.state.statsAnchor
      ? new Date(store.state.statsAnchor + "T12:00:00")
      : new Date();
    if (store.state.statsView === "year") {
      x.setMonth(0, 1);
      x.setFullYear(x.getFullYear() + direction);
    } else if (store.state.statsView === "month") {
      x.setDate(1);
      x.setMonth(x.getMonth() + direction);
    } else x.setDate(x.getDate() + 7 * direction);
    settings.setStats(store.state.statsView, datekey(x));
    renderAllStats();
  }
  $("#stats-prev").onclick = handleAction(() => shiftStats(-1));
  $("#stats-next").onclick = handleAction(() => shiftStats(1));
  $("#weekly").onclick = handleAction(() => settings.setHeatmap("week"));
  $("#monthly").onclick = handleAction(() => settings.setHeatmap("month"));
  return {};
}
