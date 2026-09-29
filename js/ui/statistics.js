import { handleAction } from "../shared/actions.js";
import { $, $$ } from "../shared/dom.js";
import { datekey, display } from "../shared/format.js";
import { aggregateStats } from "../core/statistics.js";
export function createStatisticsView({ store, planner, records, access }) {
  const subjectColor = planner.subjectColor;
  let historyLimit = 20;
  function renderStats() {
    let sums = {},
      today = datekey(Date.now());
    for (let s of store.state.sessions) {
      let k = datekey(s.at);
      sums[k] = (sums[k] || 0) + (+s.seconds || 0);
    }
    $("#today").textContent = display(sums[today] || 0);
    let past = 0,
      day = new Date();
    day.setHours(12, 0, 0, 0);
    for (let i = 0; i < 7; i++) {
      past += sums[datekey(day)] || 0;
      day.setDate(day.getDate() - 1);
    }
    $("#week").textContent = display(past);
    $("#sessions").textContent = store.state.sessions.filter(
      (s) => s.complete,
    ).length;
    let streak = 0;
    day = new Date();
    day.setHours(12, 0, 0, 0);
    if (!sums[today]) day.setDate(day.getDate() - 1);
    while (sums[datekey(day)] > 0) {
      streak++;
      day.setDate(day.getDate() - 1);
    }
    $("#streak").textContent = streak + " gün seri";
    let subjects = {};
    for (let s of store.state.sessions)
      subjects[s.subject] = (subjects[s.subject] || 0) + (+s.seconds || 0);
    let el = $("#subjectstats");
    el.replaceChildren();
    Object.entries(subjects)
      .sort((a, b) => b[1] - a[1])
      .forEach(([n, v]) => {
        let r = document.createElement("div"),
          a = document.createElement("span"),
          b = document.createElement("strong");
        a.textContent = n;
        a.dataset.userText = "";
        a.className = "subject-dot-label";
        a.style.setProperty("--subject-color", subjectColor(n));
        b.textContent = display(v);
        r.append(a, b);
        el.append(r);
      });
    $("#total").textContent =
      "Toplam " +
      display(store.state.sessions.reduce((a, s) => a + (+s.seconds || 0), 0));
    let h = $("#history");
    h.replaceChildren();
    let records = [
      ...store.state.sessions.map((x) => ({ ...x, record: x, type: "study" })),
      ...store.state.prayers.map((x) => ({ ...x, record: x, type: "prayer" })),
    ].sort((a, b) => new Date(b.at) - new Date(a.at));
    for (let s of records.slice(0, historyLimit)) {
      let li = document.createElement("li"),
        a = document.createElement("span"),
        b = document.createElement("strong");
      a.textContent =
        (s.type === "prayer" ? "Namaz · " + s.name : s.subject) +
        (s.complete ? " · tamamlandı" : "") +
        " · " +
        new Date(s.at).toLocaleString(window.ikraLocale(), {
          dateStyle: "medium",
          timeStyle: "short",
        });
      b.textContent = display(s.seconds);
      if (s.type === "study") {
        li.style.borderInlineStart = "3px solid " + subjectColor(s.subject);
        li.style.paddingInlineStart = "9px";
      }
      const remove = document.createElement("button");
      remove.type = "button";
      remove.className = "session-delete";
      remove.textContent = "Sil";
      remove.setAttribute(
        "aria-label",
        (s.type === "prayer" ? s.name : s.subject) +
          " · " +
          display(s.seconds) +
          " oturumunu sil",
      );
      remove.onclick = handleAction(() => deleteSession(s.record, s.type));
      li.append(a, b, remove);
      h.append(li);
    }
    if (records.length > historyLimit) {
      const li = document.createElement("li"),
        more = document.createElement("button");
      more.type = "button";
      more.className = "button";
      more.textContent =
        "Daha eski kayıtlar (" + (records.length - historyLimit) + ")";
      more.onclick = handleAction(() => {
        historyLimit += 20;
        renderStats();
      });
      li.append(more);
      h.append(li);
    }
    if (!records.length) {
      let li = document.createElement("li");
      li.textContent = "Henüz kayıt yok.";
      h.append(li);
    }
    renderHeat(sums);
    renderAllStats();
  }
  function renderHeat(sums) {
    $("#weekly").classList.toggle("active", store.state.view === "week");
    $("#monthly").classList.toggle("active", store.state.view === "month");
    let map = $("#heatmap");
    map.replaceChildren();
    let now = new Date(),
      days = [];
    if (store.state.view === "week") {
      let start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      start.setDate(start.getDate() - ((start.getDay() + 6) % 7));
      for (let i = 0; i < 7; i++) {
        let x = new Date(start);
        x.setDate(start.getDate() + i);
        days.push(x);
      }
      $("#periodlabel").textContent = "Bu hafta";
    } else {
      let start = new Date(now.getFullYear(), now.getMonth(), 1),
        len = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate(),
        offset = (start.getDay() + 6) % 7;
      for (let i = 0; i < offset; i++) {
        let e = document.createElement("div");
        e.className = "heatcell blank";
        map.append(e);
      }
      for (let i = 1; i <= len; i++)
        days.push(new Date(now.getFullYear(), now.getMonth(), i));
      $("#periodlabel").textContent = now.toLocaleDateString(
        window.ikraLocale(),
        { month: "long", year: "numeric" },
      );
    }
    map.className = "heatgrid" + (store.state.view === "month" ? " month" : "");
    let total = 0;
    for (let x of days) {
      let k = datekey(x),
        v = sums[k] || 0;
      total += v;
      let c = document.createElement("div");
      c.className = "heatcell" + (k === datekey(now) ? " today" : "");
      c.dataset.level =
        v === 0 ? 0 : v < 1800 ? 1 : v < 3600 ? 2 : v < 7200 ? 3 : 4;
      c.textContent =
        store.state.view === "month"
          ? x.getDate()
          : x.toLocaleDateString(window.ikraLocale(), { weekday: "short" });
      c.title = `${x.toLocaleDateString(window.ikraLocale())}: ${display(v)}`;
      c.setAttribute("aria-label", c.title);
      map.append(c);
    }
    $("#heattotal").textContent = display(total);
  }
  function renderAllStats() {
    if (!access.can("statistics")) {
      $("#stats-bars").textContent = "Bu özellik IKRA Pro gerektiriyor.";
      $("#stats-subjects").replaceChildren();
      for (const id of [
        "stats-duration",
        "stats-count",
        "stats-days",
        "stats-period",
      ])
        $("#" + id).textContent = "—";
      return;
    }
    const view = store.state.statsView || "all",
      anchor = store.state.statsAnchor
        ? new Date(store.state.statsAnchor + "T12:00:00")
        : new Date(),
      result = aggregateStats(store.state.sessions, view, anchor);
    $$("[data-stats]").forEach((b) =>
      b.classList.toggle("active", b.dataset.stats === view),
    );
    $("#stats-duration").textContent = display(result.total);
    $("#stats-count").textContent = result.completed;
    $("#stats-days").textContent = result.days;
    $("#stats-prev").hidden = view === "all";
    $("#stats-next").hidden = view === "all";
    const now = new Date();
    $("#stats-next").disabled =
      view === "year"
        ? anchor.getFullYear() >= now.getFullYear()
        : view === "month"
          ? new Date(anchor.getFullYear(), anchor.getMonth()) >=
            new Date(now.getFullYear(), now.getMonth())
          : result.end > now;
    const final = new Date(result.end);
    if (view !== "all") final.setDate(final.getDate() - 1);
    $("#stats-period").textContent =
      view === "all"
        ? "Tüm zamanlar"
        : view === "year"
          ? String(anchor.getFullYear())
          : view === "month"
            ? anchor.toLocaleDateString(window.ikraLocale(), {
                month: "long",
                year: "numeric",
              })
            : result.start.toLocaleDateString(window.ikraLocale(), {
                day: "numeric",
                month: "short",
              }) +
              " – " +
              final.toLocaleDateString(window.ikraLocale(), {
                day: "numeric",
                month: "short",
                year: "numeric",
              });
    let keys = [];
    if (view === "all") keys = Object.keys(result.buckets).sort();
    else {
      let x = new Date(result.start);
      while (x < result.end) {
        keys.push(datekey(x).slice(0, result.unit === "month" ? 7 : 10));
        if (result.unit === "month") x.setMonth(x.getMonth() + 1);
        else x.setDate(x.getDate() + 1);
      }
    }
    const bars = $("#stats-bars");
    bars.replaceChildren();
    const max = Math.max(60, ...Object.values(result.buckets));
    keys.forEach((key) => {
      let col = document.createElement("div"),
        bar = document.createElement("div"),
        label = document.createElement("span");
      col.className = "stats-col";
      bar.className = "stats-bar";
      bar.style.height =
        Math.max(3, ((result.buckets[key] || 0) / max) * 92) + "px";
      col.title = key + " · " + display(result.buckets[key] || 0);
      col.setAttribute("aria-label", col.title);
      label.textContent =
        result.unit === "year"
          ? key
          : result.unit === "month"
            ? new Date(key + "-01T12:00:00").toLocaleDateString(
                window.ikraLocale(),
                { month: "short" },
              )
            : String(Number(key.slice(-2)));
      col.append(bar, label);
      bars.append(col);
    });
    if (!keys.length)
      bars.textContent = "İlk çalışma kaydınla istatistikler oluşacak.";
    const subjects = $("#stats-subjects");
    subjects.replaceChildren();
    Object.entries(result.subjects)
      .sort((a, b) => b[1] - a[1])
      .forEach(([name, seconds]) => {
        let row = document.createElement("div"),
          text = document.createElement("span"),
          amount = document.createElement("strong");
        text.textContent = name;
        text.dataset.userText = "";
        text.className = "subject-dot-label";
        text.style.setProperty("--subject-color", subjectColor(name));
        amount.textContent = display(seconds);
        row.append(text, amount);
        subjects.append(row);
      });
  }
  function deleteSession(record, type) {
    try {
      const restore = records.remove(record.id, type);
      if (!restore) return;
      renderStats();
      const notice = window.ikraNotify(
        (record.subject || record.name) +
          " · " +
          display(record.seconds) +
          " silindi.",
        { title: "Oturum silindi", duration: 8000 },
      );
      const undo = document.createElement("button");
      undo.type = "button";
      undo.className = "button notice-undo";
      undo.textContent = "Geri al";
      undo.onclick = handleAction(() => {
        try {
          restore();
          notice.dismissNotice();
          renderStats();
          window.ikraNotify("Oturum geri yüklendi.");
        } catch {
          window.ikraNotify("Geri yüklenemedi.");
        }
      });
      notice.querySelector(".notice-content").append(undo);
    } catch {
      window.ikraNotify("Kayıt silinemedi. Tarayıcı depolamasını kontrol et.");
    }
  }
  return { render: renderStats };
}
