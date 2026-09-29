import { handleAction } from "../shared/actions.js";
import { $, $$ } from "../shared/dom.js";

export function bindPlanner({ planner, render, renderTasks }) {
  $("#addsubject").onclick = handleAction(() => {
    const button = $("#addsubject"),
      show = button.getAttribute("aria-expanded") !== "true";
    button.setAttribute("aria-expanded", String(show));
    window.animatePanel($("#new-subject-row"), show);
    if (show) $("#new-subject-name").focus();
  });
  $("#save-subject").onclick = handleAction(() => {
    const name = $("#new-subject-name").value.trim();
    if (!name) return;
    planner.addSubject(name, $("#new-subject-color").value);
    $("#new-subject-name").value = "";
    $("#addsubject").setAttribute("aria-expanded", "false");
    window.animatePanel($("#new-subject-row"), false);
    render();
  });
  $("#new-subject-name").onkeydown = handleAction((e) => {
    if (e.key === "Enter") $("#save-subject").click();
  });
  $$("[data-taskfilter]").forEach(
    (b) =>
      (b.onclick = handleAction(() => {
        planner.setFilter(b.dataset.taskfilter);
        renderTasks();
      })),
  );
  function addTask() {
    let x = $("#task").value.trim();
    if (!x) return;
    planner.addTask(x, $("#task-date").value);
    $("#task").value = "";
    $("#task-date").value = "";
    renderTasks();
  }
  $("#addtask").onclick = handleAction(addTask);
  $("#task").onkeydown = handleAction((e) => {
    if (e.key === "Enter") addTask();
  });
  $("#subject").onchange = handleAction((e) => planner.select(e.target.value));
  return {};
}
