import { handleAction } from "../shared/actions.js";
import { $, $$ } from "../shared/dom.js";
import { datekey } from "../shared/format.js";

export function createPlannerView({ store, planner, render }) {
  const subjectColor = planner.subjectColor;
  function renderSubjectChoices() {
    const select = $("#subject");
    select.replaceChildren();
    if (!store.state.subjects.length) {
      const option = new Option("İlk dersini ekle", "");
      option.disabled = true;
      select.add(option);
    } else
      store.state.subjects.forEach((name) =>
        (() => {
          const option = new Option(name, name);
          option.dataset.userText = "";
          select.add(option);
        })(),
      );

    select.value = store.state.subject;
    select.style.borderInlineStart =
      "4px solid " +
      (store.state.subject ? subjectColor(store.state.subject) : "var(--line)");
    $("#subject-options").replaceChildren(
      ...store.state.subjects.map((name) => new Option(name, name)),
    );
    const manager = $("#course-colors");
    manager.replaceChildren();
    store.state.subjects.forEach((name) => {
      const label = document.createElement("div"),
        text = document.createElement("span"),
        input = document.createElement("input");
      label.className = "course-row";
      text.dataset.userText = "";
      text.textContent = name;
      input.type = "color";
      input.value = subjectColor(name);
      input.setAttribute("aria-label", name + " rengi");
      input.onchange = handleAction(() => {
        planner.ensureSubject(name, input.value);
        render();
      });
      const remove = document.createElement("button");
      remove.type = "button";
      remove.className = "session-delete";
      remove.textContent = "Sil";
      remove.setAttribute("aria-label", "Dersi sil");
      remove.onclick = handleAction(() => deleteSubject(name));
      label.append(text, input, remove);
      manager.append(label);
    });
    if (!store.state.subjects.length)
      manager.textContent = "Henüz ders eklenmedi.";
  }
  function renderTasks() {
    const el = $("#tasklist");
    el.replaceChildren();
    const filter = store.state.taskFilter || "active",
      done = store.state.tasks.filter((t) => t.done).length;
    $("#plan-count").textContent = store.state.tasks.length
      ? done + " / " + store.state.tasks.length + " görev tamamlandı"
      : "İlk görevini ekle";
    $("#plan-progress").value = store.state.tasks.length
      ? (done / store.state.tasks.length) * 100
      : 0;
    $$("[data-taskfilter]").forEach((b) =>
      b.classList.toggle("active", b.dataset.taskfilter === filter),
    );
    const tasks = store.state.tasks.filter(
      (t) => filter === "all" || (filter === "done" ? t.done : !t.done),
    );
    for (const t of tasks) {
      const li = document.createElement("li"),
        check = document.createElement("input"),
        content = document.createElement("div"),
        name = document.createElement("span"),
        meta = document.createElement("small"),
        edit = document.createElement("button"),
        del = document.createElement("button");
      check.type = "checkbox";
      check.checked = !!t.done;
      check.setAttribute("aria-label", t.text + " tamamlandı");
      check.onchange = handleAction(() => {
        planner.editTask(t.id, { done: check.checked });
        li.animate([{ opacity: 1 }, { opacity: 0.3 }], {
          duration: 140,
        }).finished.then(renderTasks);
      });
      content.className = "task-content";
      name.dataset.userText = "";
      name.textContent = t.text;
      name.className = "task-name" + (t.done ? " done" : "");
      meta.dataset.userText = "";
      meta.textContent =
        (t.subject || "Genel") +
        (t.due
          ? " · " +
            new Date(t.due + "T12:00:00").toLocaleDateString(
              window.ikraLocale(),
              { day: "numeric", month: "short" },
            )
          : "");
      if (t.due && t.due < datekey(Date.now()) && !t.done)
        meta.className = "overdue";
      content.append(name, meta);
      edit.className = "task-action";
      edit.textContent = "✎";
      edit.setAttribute("aria-label", "Görevi düzenle");
      edit.title = "Düzenle";
      edit.onclick = handleAction(() => {
        const input = document.createElement("input");
        input.className = "field task-edit";
        input.value = t.text;
        input.maxLength = 160;
        input.setAttribute("aria-label", "Görev metni");
        name.replaceWith(input);
        input.focus();
        input.select();
        let finished = false;
        const commit = () => {
          if (finished) return;
          finished = true;
          if (input.value.trim()) planner.editTask(t.id, { text: input.value });
          renderTasks();
        };
        input.onblur = handleAction(commit);
        input.onkeydown = handleAction((e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            commit();
          }
          if (e.key === "Escape") {
            finished = true;
            renderTasks();
          }
        });
      });
      del.className = "task-action";
      del.textContent = "×";
      del.title = "Sil";
      del.setAttribute("aria-label", "Görevi sil");
      del.onclick = handleAction(() => {
        li.animate(
          [
            { opacity: 1, transform: "translateX(0)" },
            { opacity: 0, transform: "translateX(8px)" },
          ],
          { duration: 160 },
        ).finished.then(() => {
          planner.deleteTask(t.id);
          renderTasks();
        });
      });
      li.style.borderInlineStart = "3px solid " + subjectColor(t.subject);
      li.append(check, content, edit, del);
      el.append(li);
    }
    if (!tasks.length) {
      const li = document.createElement("li");
      li.className = "task-empty";
      li.textContent =
        filter === "done"
          ? "Tamamladığın görevler burada görünecek."
          : filter === "active" && store.state.tasks.length
            ? "Planındaki görevler tamamlandı."
            : "Görev ekleyerek planını oluşturmaya başla.";
      el.append(li);
    }
  }
  function deleteSubject(name) {
    try {
      const undoAction = planner.deleteSubject(name);
      if (!undoAction) return;
      render();
      const notice = window.ikraNotify(
        "Çalışma geçmişin ve görevlerin korundu.",
        { title: "Ders silindi", duration: 8000 },
      );
      const undo = document.createElement("button");
      undo.type = "button";
      undo.className = "button notice-undo";
      undo.textContent = "Geri al";
      undo.onclick = handleAction(() => {
        try {
          undoAction();
          notice.dismissNotice();
          render();
        } catch {
          window.ikraNotify("Geri yüklenemedi.");
        }
      });
      notice.querySelector(".notice-content").append(undo);
    } catch {
      window.ikraNotify("Ders silinemedi. Lütfen tekrar dene.");
    }
  }
  return { renderSubjectChoices, renderTasks };
}
