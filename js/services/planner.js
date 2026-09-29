import { subjectColor, ensureSubject } from "../domain/subjects.js";
import { newId } from "../shared/format.js";
import { FEATURES } from "../config/features.js";
export function createPlanner({ store, access, focus }) {
  const change = (fn) => {
    access.require(FEATURES.PLANNER);
    return store.update(fn);
  };
  return Object.freeze({
    subjectColor: (name) => subjectColor(store.state, name),
    ensureSubject: (name, color) =>
      change((d) => ensureSubject(d, name, color)),
    select(name) {
      access.require(FEATURES.PLANNER);
      if (!store.state.subjects.includes(name)) return;
      focus.credit();
      change((d) => {
        d.subject = name;
      });
    },
    addSubject(name, color) {
      access.require(FEATURES.PLANNER);
      focus.pause();
      change((d) => {
        d.subject = ensureSubject(d, name, color) || d.subject;
      });
    },
    deleteSubject(name) {
      access.require(FEATURES.PLANNER);
      if (!store.state.subjects.includes(name)) return;
      const selected = store.state.subject === name;
      if (selected) focus.pause();
      const color = store.state.subjectColors[name];
      change((d) => {
        d.subjects = d.subjects.filter((x) => x !== name);
        d.archivedSubjects = [...new Set([...d.archivedSubjects, name])];
        if (selected) d.subject = d.subjects[0] || "";
      });
      return () =>
        change((d) => {
          ensureSubject(d, name, color);
          if (selected && !d.timer.running) d.subject = name;
        });
    },
    addTask(text, due) {
      text = String(text).trim().slice(0, 160);
      if (!text) return;
      change((d) => {
        d.tasks.push({
          id: newId(),
          text,
          due,
          subject: d.subject,
          done: false,
        });
        d.taskFilter = "active";
      });
    },
    editTask(id, patch) {
      change((d) => {
        const task = d.tasks.find((t) => t.id === id);
        if (!task) return;
        if (typeof patch.done === "boolean") task.done = patch.done;
        if (typeof patch.text === "string" && patch.text.trim())
          task.text = patch.text.trim().slice(0, 160);
      });
    },
    deleteTask(id) {
      change((d) => {
        d.tasks = d.tasks.filter((t) => t.id !== id);
      });
    },
    setFilter(value) {
      if (["active", "done", "all"].includes(value))
        change((d) => {
          d.taskFilter = value;
        });
    },
  });
}
