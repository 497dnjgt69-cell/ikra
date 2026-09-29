import { normalizeBackup } from "./backup-validation.js";
import { fresh } from "./default-state.js";
import { createAudio } from "../features/audio.js";
import { backupSnapshot } from "./backup-snapshot.js";
import { aggregateStats } from "./statistics.js";

export default function initialize() {
  (() => {
    "use strict";
    const KEY = "mahir-focus-v1",
      $ = (s) => document.querySelector(s),
      $$ = (s) => [...document.querySelectorAll(s)],
      names = ["Sabah", "Öğle", "İkindi", "Akşam", "Yatsı"],
      apiNames = ["Fajr", "Dhuhr", "Asr", "Maghrib", "Isha"];
    const validateBackup = (payload) =>
      normalizeBackup(payload, { fresh, isDateKey, names });
    let d;
    try {
      d = JSON.parse(localStorage.getItem(KEY)) || fresh();
      if (!d.timer || !d.durations || !Array.isArray(d.sessions)) throw Error();
    } catch {
      d = fresh();
    }
    d = { ...fresh(), ...d };
    d.prayerPeek = false;
    d.prayerView = !!d.prayerTimer;
    if (d.prayerTimer && !Number.isFinite(d.prayerTimer.remaining)) {
      const elapsed = Math.max(
        0,
        (Date.now() - d.prayerTimer.startedAt) / 1000,
      );
      d.prayerTimer = {
        ...d.prayerTimer,
        elapsed,
        remaining: Math.max(0, d.prayerDuration * 60 - elapsed),
        duration: d.prayerDuration * 60,
        running: false,
        endAt: null,
        segmentStartedAt: null,
        recorded: false,
      };
    }
    if (!["light", "dark", "nature"].includes(d.theme))
      d.theme = d.theme === "rose" ? "light" : "dark";
    d.prayers = Array.isArray(d.prayers) ? d.prayers : [];
    d.subjects = Array.isArray(d.subjects) ? d.subjects : fresh().subjects;
    d.tasks = Array.isArray(d.tasks) ? d.tasks : [];
    let clockPrev = "";
    const save = () => {
      try {
        localStorage.setItem(KEY, JSON.stringify(d));
      } catch {
        toast("Kaydetme başarısız. Tarayıcı depolamasını kontrol et.");
      }
    };
    function toast(s) {
      window.ikraNotify(s);
    }
    const datekey = (x) => {
        let a = new Date(x);
        return (
          a.getFullYear() +
          "-" +
          String(a.getMonth() + 1).padStart(2, "0") +
          "-" +
          String(a.getDate()).padStart(2, "0")
        );
      },
      pad = (n) => String(n).padStart(2, "0"),
      fmt = (s) => {
        s = Math.max(0, Math.floor(s));
        return pad(Math.floor(s / 60)) + ":" + pad(s % 60);
      },
      dur = (m) => d.durations[m] * 60,
      display = (value) => {
        const total = Math.max(0, Math.round(Number(value) || 0)),
          hours = Math.floor(total / 3600),
          minutes = Math.floor((total % 3600) / 60),
          seconds = total % 60;
        return (
          [
            hours ? hours + " sa" : "",
            minutes ? minutes + " dk" : "",
            seconds ? seconds + " sn" : "",
          ]
            .filter(Boolean)
            .join(" ") || "0 dk"
        );
      };
    function credit(now, complete = false) {
      const t = d.timer;
      if (d.mode !== "focus" || !t.running || !Number.isFinite(t.startedAt))
        return;
      const end = Math.min(now, Number.isFinite(t.endAt) ? t.endAt : now);
      const seconds = Math.max(0, (end - t.startedAt) / 1000);
      if (seconds > 0) {
        d.sessions.push({
          id: globalThis.crypto?.randomUUID?.() || String(now) + Math.random(),
          at: new Date(end).toISOString(),
          subject: d.subject,
          seconds,
          complete,
        });
        t.startedAt = end;
        t.credited = 0;
      }
    }
    const playSound = createAudio(() => d);
    function chime() {
      playSound("finish");
    }
    function settle() {
      let t = d.timer;
      if (!t.running || !t.endAt) return;
      let now = Date.now();
      if (now < t.endAt) {
        t.remaining = (t.endAt - now) / 1000;
        return;
      }
      const completedMode = d.mode;
      credit(t.endAt, true);
      t.running = false;
      t.remaining = 0;
      t.endAt = null;
      t.startedAt = null;
      t.credited = 0;
      if (d.mode === "focus") {
        d.round++;
        d.mode =
          d.longEvery > 0 && d.round % d.longEvery === 0 ? "long" : "break";
      } else d.mode = "focus";
      t.remaining = dur(d.mode);
      if (d.auto) {
        t.running = true;
        t.endAt = now + t.remaining * 1000;
        t.startedAt = now;
      }
      save();
      chime();
      render();
      if (completedMode === "focus") {
        const count = d.sessions.filter((s) => s.complete).length;
        window.ikraNotify(
          (d.subject || "Çalışma") +
            " · " +
            d.durations.focus +
            " dk. " +
            (d.auto ? "Mola başladı." : "Molan hazır."),
          { completion: true, title: count + ". çalışma oturumu tamamlandı" },
        );
      } else
        window.ikraNotify(
          d.auto
            ? "Odak sayacı başladı."
            : "Hazır olduğunda yeni bir çalışma başlatabilirsin.",
          { completion: true, title: "Mola tamamlandı" },
        );
    }
    function pause() {
      let t = d.timer;
      if (!t.running) return;
      settle();
      if (!t.running) return;
      credit(Date.now());
      t.running = false;
      t.endAt = null;
      t.startedAt = null;
      t.credited = 0;
      save();
      render();
    }
    function start() {
      if (!d.subject) {
        toast("Önce Planım bölümünden bir ders ekle.");
        document.querySelector("#panel-tasks")?.showModal();
        return;
      }
      if (d.mode === "clock" || d.prayerTimer) return;
      settle();
      if (d.timer.running) {
        pause();
        return;
      }
      let t = d.timer;
      if (t.remaining <= 0) t.remaining = dur(d.mode);
      t.running = true;
      t.endAt = Date.now() + t.remaining * 1000;
      t.startedAt = Date.now();
      t.credited = 0;
      save();
      render();
    }
    function reset() {
      if (d.timer.running) credit(Date.now());
      d.timer = {
        running: false,
        remaining: d.mode === "clock" ? 0 : dur(d.mode),
        endAt: null,
        startedAt: null,
        credited: 0,
      };
      save();
      render();
    }
    function changeMode(m) {
      if (d.prayerView) {
        pausePrayer();
        recordPrayer();
        d.prayerTimer = null;
        d.prayerView = false;
      }
      if (!["focus", "break", "long", "clock"].includes(m)) return;
      if (d.timer.running) credit(Date.now());
      d.mode = m;
      d.timer = {
        running: false,
        remaining: m === "clock" ? 0 : dur(m),
        endAt: null,
        startedAt: null,
        credited: 0,
      };
      save();
      render();
    }
    function tick() {
      settle();
      settlePrayer();
      updateNextPrayer();
      let value = d.prayerView
        ? fmt(d.prayerTimer ? d.prayerTimer.remaining : d.prayerDuration * 60)
        : d.mode === "clock"
          ? new Date().toLocaleTimeString("en-GB", {
              hour: "2-digit",
              minute: "2-digit",
            })
          : fmt(d.timer.remaining);
      if (value !== clockPrev) {
        const clock = $("#bigclock"),
          characters = [...value];
        if (clock.children.length !== characters.length) {
          clock.replaceChildren(
            ...characters.map((char) => {
              const span = document.createElement("span");
              span.className = char === ":" ? "colon" : "digit";
              span.textContent = char;
              return span;
            }),
          );
        }
        clock.setAttribute("aria-label", value);
        [...clock.children].forEach((e, i) => {
          if (e.textContent !== characters[i]) {
            e.textContent = characters[i];
            if (!matchMedia("(prefers-reduced-motion: reduce)").matches) {
              e.getAnimations().forEach((a) => a.cancel());
              e.animate(
                [
                  { opacity: 0.55, transform: "translateY(4px)" },
                  { opacity: 1, transform: "translateY(0)" },
                ],
                { duration: 230, easing: "cubic-bezier(.22,1,.36,1)" },
              );
            }
          }
        });
        clockPrev = value;
      }
      const title = value + " · IKRA";
      if (document.title !== title) document.title = title;
      const prayerValue = d.prayerTimer
        ? fmt(d.prayerTimer.remaining)
        : fmt(d.prayerDuration * 60);
      if ($("#prayerelapsed").textContent !== prayerValue)
        $("#prayerelapsed").textContent = prayerValue;
    }
    const quotes = [
      {
        text: "“Biliniz ki, kalpler ancak Allah’ı anmakla huzur bulur.”",
        source: "Ra’d 13:28 · Diyanet meali",
        url: "https://kuran.diyanet.gov.tr/tefsir/Ra%27d-suresi/1734/27-28-ayet-tefsiri",
      },
      {
        text: "“Şüphesiz güçlükle beraber bir kolaylık vardır.”",
        source: "İnşirâh 94:5 · Diyanet meali",
        url: "https://kuran.diyanet.gov.tr/mushaf/kuran-meal-2/insirah-suresi-94/ayet-1/diyanet-isleri-baskanligi-meali-1",
      },
      {
        text: "“Allah katında en sevimli amel, az da olsa devamlı olanıdır.”",
        source: "Sahih al-Bukhari 6464 · Türkçe anlamı",
        url: "https://sunnah.com/bukhari:6464",
      },
      {
        text: "“Namaz bir nurdur.”",
        source: "Sahih Muslim 223 · Türkçe anlamı",
        url: "https://sunnah.com/muslim:223",
      },
    ];
    function renderQuote() {
      let show = ["break", "long"].includes(d.mode),
        q =
          quotes[
            (d.round + (["long"].includes(d.mode) ? 1 : 0)) % quotes.length
          ];
      $("#quote").classList.toggle("hidden", !show);
      $("#quotetext").textContent = q.text;
      $("#quotesource").textContent = q.source;
      $("#quotesource").href = q.url;
    }

    function isDateKey(value) {
      if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value))
        return false;
      const x = new Date(value + "T12:00:00");
      return !isNaN(x) && datekey(x) === value;
    }
    function subjectColor(name) {
      const found = d.subjectColors?.[name];
      if (typeof found === "string" && /^#[0-9a-f]{6}$/i.test(found))
        return found;
      const palette = [
        "#6d91c7",
        "#b887c4",
        "#65a69b",
        "#c49b61",
        "#cf8390",
        "#8189bd",
      ];
      return palette[Math.max(0, d.subjects.indexOf(name)) % palette.length];
    }
    function ensureSubject(name, color) {
      name = String(name).trim().slice(0, 60);
      if (!name) return;
      d.archivedSubjects = (d.archivedSubjects || []).filter((x) => x !== name);
      if (!d.subjects.includes(name)) d.subjects.push(name);
      d.subjectColors = {
        ...d.subjectColors,
        [name]: /^#[0-9a-f]{6}$/i.test(color || "")
          ? color
          : subjectColor(name),
      };
    }
    function renderSubjectChoices() {
      const select = $("#subject");
      select.replaceChildren();
      if (!d.subjects.length) {
        const option = new Option("İlk dersini ekle", "");
        option.disabled = true;
        select.add(option);
      } else
        d.subjects.forEach((name) =>
          (() => {
            const option = new Option(name, name);
            option.dataset.userText = "";
            select.add(option);
          })(),
        );
      if (!d.subjects.includes(d.subject)) d.subject = d.subjects[0] || "";
      select.value = d.subject;
      select.style.borderInlineStart =
        "4px solid " + (d.subject ? subjectColor(d.subject) : "var(--line)");
      $("#subject-options").replaceChildren(
        ...d.subjects.map((name) => new Option(name, name)),
      );
      const manager = $("#course-colors");
      manager.replaceChildren();
      d.subjects.forEach((name) => {
        const label = document.createElement("div"),
          text = document.createElement("span"),
          input = document.createElement("input");
        label.className = "course-row";
        text.dataset.userText = "";
        text.textContent = name;
        input.type = "color";
        input.value = subjectColor(name);
        input.setAttribute("aria-label", name + " rengi");
        input.onchange = () => {
          ensureSubject(name, input.value);
          save();
          render();
        };
        const remove = document.createElement("button");
        remove.type = "button";
        remove.className = "session-delete";
        remove.textContent = "Sil";
        remove.setAttribute("aria-label", "Dersi sil");
        remove.onclick = () => deleteSubject(name);
        label.append(text, input, remove);
        manager.append(label);
      });
      if (!d.subjects.length) manager.textContent = "Henüz ders eklenmedi.";
    }
    function deleteSubject(name) {
      if (!d.subjects.includes(name)) return;
      const selected = d.subject === name;
      if (selected && d.timer.running) pause();
      const next = {
        ...d,
        subjects: d.subjects.filter((x) => x !== name),
        archivedSubjects: [...new Set([...(d.archivedSubjects || []), name])],
      };
      if (selected) next.subject = next.subjects[0] || "";
      try {
        localStorage.setItem(KEY, JSON.stringify(next));
      } catch {
        toast("Ders silinemedi. Lütfen tekrar dene.");
        return;
      }
      d = next;
      render();
      const notice = window.ikraNotify(
        "Çalışma geçmişin ve görevlerin korundu.",
        { title: "Ders silindi", duration: 8000 },
      );
      const undo = document.createElement("button");
      undo.type = "button";
      undo.className = "button notice-undo";
      undo.textContent = "Geri al";
      undo.onclick = () => {
        ensureSubject(name, d.subjectColors[name]);
        if (selected && !d.timer.running) d.subject = name;
        save();
        render();
        notice.dismissNotice();
        toast("Ders geri eklendi.");
      };
      notice.querySelector(".notice-content").append(undo);
    }
    function prayerWallNow(now = new Date()) {
      const zone =
        d.prayerTimeZone || Intl.DateTimeFormat().resolvedOptions().timeZone;
      let parts = Object.fromEntries(
        new Intl.DateTimeFormat("en-CA", {
          timeZone: zone,
          year: "numeric",
          month: "2-digit",
          day: "2-digit",
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
          hourCycle: "h23",
        })
          .formatToParts(now)
          .map((x) => [x.type, x.value]),
      );
      return {
        date: parts.year + "-" + parts.month + "-" + parts.day,
        seconds: +parts.hour * 3600 + +parts.minute * 60 + +parts.second,
        zone,
      };
    }
    function wallEpoch(date, time, zone) {
      const [y, m, day] = date.split("-").map(Number),
        [h, min] = time.split(":").map(Number);
      const desired = Date.UTC(y, m - 1, day, h, min);
      let epoch = desired;
      for (let i = 0; i < 3; i++) {
        const parts = Object.fromEntries(
          new Intl.DateTimeFormat("en-CA", {
            timeZone: zone,
            year: "numeric",
            month: "2-digit",
            day: "2-digit",
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit",
            hourCycle: "h23",
          })
            .formatToParts(new Date(epoch))
            .map((x) => [x.type, x.value]),
        );
        const actual = Date.UTC(
          +parts.year,
          +parts.month - 1,
          +parts.day,
          +parts.hour,
          +parts.minute,
          +parts.second,
        );
        epoch += desired - actual;
      }
      return epoch;
    }
    function getNextPrayer(now) {
      const wall = prayerWallNow(new Date(now));
      if (d.prayerDate !== wall.date) return null;
      for (const name of names) {
        const time = d.prayerTimes[name];
        if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(time || "")) continue;
        const epoch = wallEpoch(wall.date, time, wall.zone);
        if (epoch > now)
          return {
            name,
            time,
            minutes: Math.ceil((epoch - now) / 60000),
            tomorrow: false,
          };
      }
      const tomorrow = new Date(wall.date + "T12:00:00");
      tomorrow.setDate(tomorrow.getDate() + 1);
      const key = datekey(tomorrow);
      if (d.prayerTomorrow?.date === key && d.prayerTomorrow.times?.Sabah) {
        const time = d.prayerTomorrow.times.Sabah,
          epoch = wallEpoch(key, time, wall.zone);
        return {
          name: "Sabah",
          time,
          minutes: Math.max(0, Math.ceil((epoch - now) / 60000)),
          tomorrow: true,
        };
      }
      return null;
    }
    function updateNextPrayer() {
      const el = $("#next-prayer");
      if (!el) return;
      const next = getNextPrayer(Date.now());
      const wall = prayerWallNow();
      let text = next
        ? (next.tomorrow ? "Yarın " : "") +
          next.name +
          " · " +
          next.minutes +
          " dk kaldı"
        : d.prayerDate !== wall.date
          ? "Güncel vakitleri getirerek kalan süreyi gör."
          : "Bugünün vakitleri tamamlandı. Yarın için vakit bekleniyor.";
      if (el.textContent !== text) el.textContent = text;
      $("#peek-times")
        ?.querySelectorAll(".prayer")
        .forEach((card) =>
          card.classList.toggle(
            "next-up",
            !!next &&
              !next.tomorrow &&
              window.ikraOriginal(card.querySelector("b")?.textContent) ===
                next.name,
          ),
        );
    }
    async function fetchTomorrowPrayer() {
      const source = d.prayerSource;
      if (!source || source.type === "manual") return;
      const wall = prayerWallNow(),
        tomorrow = new Date(wall.date + "T12:00:00");
      tomorrow.setDate(tomorrow.getDate() + 1);
      const key = datekey(tomorrow);
      if (d.prayerTomorrow?.date === key) return;
      const date = key.split("-").reverse().join("-"),
        query =
          source.type === "coords"
            ? `latitude=${source.lat}&longitude=${source.lon}`
            : `address=${encodeURIComponent(source.address)}`;
      try {
        const controller = new AbortController(),
          timer = setTimeout(() => controller.abort(), 12000);
        let response;
        try {
          response = await fetch(
            `https://api.aladhan.com/v1/${source.type === "coords" ? "timings" : "timingsByAddress"}/${date}?${query}&method=${d.method}`,
            { signal: controller.signal },
          );
        } finally {
          clearTimeout(timer);
        }
        if (!response.ok) return;
        const json = await response.json(),
          times = json.data?.timings;
        if (!times) return;
        const result = {};
        names.forEach((n, i) => {
          const match = String(times[apiNames[i]] || "").match(
            /\b(\d{2}:\d{2})\b/,
          );
          if (match) result[n] = match[1];
        });
        d.prayerTomorrow = { date: key, times: result };
        save();
        updateNextPrayer();
      } catch {}
    }

    let historyLimit = 20;
    function deleteSession(record, type) {
      const field = type === "prayer" ? "prayers" : "sessions",
        index = d[field].indexOf(record);
      if (index < 0) return;
      const next = { ...d, [field]: d[field].filter((_, i) => i !== index) };
      try {
        localStorage.setItem(KEY, JSON.stringify(next));
      } catch {
        toast("Kayıt silinemedi. Tarayıcı depolamasını kontrol et.");
        return;
      }
      d = next;
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
      undo.onclick = () => {
        const restored = { ...d, [field]: [...d[field]] };
        restored[field].splice(
          Math.min(index, restored[field].length),
          0,
          record,
        );
        try {
          localStorage.setItem(KEY, JSON.stringify(restored));
        } catch {
          toast("Geri yüklenemedi.");
          return;
        }
        d = restored;
        notice.dismissNotice();
        renderStats();
        toast("Oturum geri yüklendi.");
      };
      notice.querySelector(".notice-content").append(undo);
    }
    function renderStats() {
      let sums = {},
        today = datekey(Date.now());
      for (let s of d.sessions) {
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
      $("#sessions").textContent = d.sessions.filter((s) => s.complete).length;
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
      for (let s of d.sessions)
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
        display(d.sessions.reduce((a, s) => a + (+s.seconds || 0), 0));
      let h = $("#history");
      h.replaceChildren();
      let records = [
        ...d.sessions.map((x) => ({ ...x, record: x, type: "study" })),
        ...d.prayers.map((x) => ({ ...x, record: x, type: "prayer" })),
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
        remove.onclick = () => deleteSession(s.record, s.type);
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
        more.onclick = () => {
          historyLimit += 20;
          renderStats();
        };
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
      $("#weekly").classList.toggle("active", d.view === "week");
      $("#monthly").classList.toggle("active", d.view === "month");
      let map = $("#heatmap");
      map.replaceChildren();
      let now = new Date(),
        days = [];
      if (d.view === "week") {
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
      map.className = "heatgrid" + (d.view === "month" ? " month" : "");
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
          d.view === "month"
            ? x.getDate()
            : x.toLocaleDateString(window.ikraLocale(), { weekday: "short" });
        c.title = `${x.toLocaleDateString(window.ikraLocale())}: ${display(v)}`;
        c.setAttribute("aria-label", c.title);
        map.append(c);
      }
      $("#heattotal").textContent = display(total);
    }
    function renderTasks() {
      const el = $("#tasklist");
      el.replaceChildren();
      const filter = d.taskFilter || "active",
        done = d.tasks.filter((t) => t.done).length;
      $("#plan-count").textContent = d.tasks.length
        ? done + " / " + d.tasks.length + " görev tamamlandı"
        : "İlk görevini ekle";
      $("#plan-progress").value = d.tasks.length
        ? (done / d.tasks.length) * 100
        : 0;
      $$("[data-taskfilter]").forEach((b) =>
        b.classList.toggle("active", b.dataset.taskfilter === filter),
      );
      const tasks = d.tasks.filter(
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
        check.onchange = () => {
          t.done = check.checked;
          save();
          li.animate([{ opacity: 1 }, { opacity: 0.3 }], {
            duration: 140,
          }).finished.then(renderTasks);
        };
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
        edit.onclick = () => {
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
            if (input.value.trim()) t.text = input.value.trim();
            save();
            renderTasks();
          };
          input.onblur = commit;
          input.onkeydown = (e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              commit();
            }
            if (e.key === "Escape") {
              finished = true;
              renderTasks();
            }
          };
        };
        del.className = "task-action";
        del.textContent = "×";
        del.title = "Sil";
        del.setAttribute("aria-label", "Görevi sil");
        del.onclick = () => {
          li.animate(
            [
              { opacity: 1, transform: "translateX(0)" },
              { opacity: 0, transform: "translateX(8px)" },
            ],
            { duration: 160 },
          ).finished.then(() => {
            d.tasks = d.tasks.filter((x) => x !== t);
            save();
            renderTasks();
          });
        };
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
            : filter === "active" && d.tasks.length
              ? "Planındaki görevler tamamlandı."
              : "Görev ekleyerek planını oluşturmaya başla.";
        el.append(li);
      }
    }
    function renderPrayer() {
      let expired = d.prayerDate !== datekey(Date.now());
      $("#city").value = d.prayerLocation;
      $("#method").value = d.method;
      $("#prayerplace").textContent = d.prayerLocation || "Konum ekle";
      $("#prayerstatus").textContent = prayerStatusText();
      let grid = $("#prayergrid");
      grid.replaceChildren();
      names.forEach((n) => {
        let e = document.createElement("div"),
          b = document.createElement("b"),
          v = document.createElement("span");
        e.className = "prayer";
        b.textContent = n;
        v.textContent = d.prayerTimes[n] || "—";
        e.append(b, v);
        grid.append(e);
      });
      let fields = $("#prayerfields");
      fields.replaceChildren();
      names.forEach((n) => {
        let l = document.createElement("label"),
          i = document.createElement("input");
        l.textContent = n;
        i.type = "time";
        i.value = d.prayerTimes[n] || "";
        i.dataset.prayer = n;
        i.className = "field";
        l.append(i);
        fields.append(l);
      });
      $("#prayerstart").classList.remove("hidden");
      $("#prayerstart").textContent = "Namaz";
      $("#prayerstart").classList.toggle("active", !!d.prayerView);
      $("#prayerstart").setAttribute("aria-pressed", String(!!d.prayerView));
      $("#prayerfinish").classList.toggle("hidden", !d.prayerTimer);
      $("#prayerselect").disabled = false;
      if (d.prayerTimer) $("#prayerselect").value = d.prayerTimer.name;
      renderPeek();
      tick();
    }
    function render() {
      const activeRunning = d.prayerView
        ? !!d.prayerTimer?.running
        : d.timer.running;
      $("#prayermin").value = d.prayerDuration;
      document.body.classList.toggle("prayer-active", !!d.prayerView);
      document.body.classList.toggle(
        "focus-running",
        d.mode === "focus" && d.timer.running && !d.prayerView,
      );
      document.body.dataset.theme = d.theme;
      $("#theme").value = d.theme;
      renderSubjectChoices();
      for (let k of ["focus", "break", "long"])
        $("#" + k + "min").value = d.durations[k];
      $("#autonext").checked = !!d.auto;
      $("#longevery").value = d.longEvery;
      $("#soundenabled").checked = !!d.sound;
      $("#soundvolume").value = Math.round(d.soundVolume * 100);
      if (!$("#manual-subject").value) $("#manual-subject").value = d.subject;
      if (!$("#manual-date").value)
        $("#manual-date").value = datekey(Date.now());
      $$("[data-mode]").forEach((b) =>
        b.classList.toggle("active", b.dataset.mode === d.mode),
      );
      $("#overline").textContent =
        d.mode === "clock"
          ? "Şu an"
          : d.mode === "focus"
            ? "Çalışma zamanı"
            : d.mode === "long"
              ? "Uzun mola"
              : "Kısa mola";
      $("#title").textContent =
        d.mode === "focus"
          ? "Odağını topla."
          : d.mode === "clock"
            ? "Şimdiki an."
            : "Biraz nefes al.";
      $("#timerinfo").toggleAttribute(
        "data-user-text",
        d.mode === "focus" && !d.prayerView,
      );
      $("#timerinfo").textContent =
        d.mode === "clock" ? "" : d.mode === "focus" ? d.subject : "Dinlenme";
      $("#start").innerHTML = activeRunning
        ? '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 5v14M15 5v14"/></svg><span>Duraklat</span>'
        : '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m8 5 11 7-11 7Z"/></svg><span>Başlat</span>';
      $("#start").setAttribute(
        "aria-label",
        activeRunning ? "Duraklat" : "Başlat",
      );
      $("#start").disabled = false;
      for (let id of ["start", "reset", "skip"])
        $("#" + id).classList.toggle(
          "hidden",
          d.mode === "clock" && !d.prayerView,
        );
      if (d.prayerView) {
        $("#overline").textContent = "Namaz vakti";
        $("#title").textContent = "Rabbine yönel.";
        $("#timerinfo").textContent =
          (d.prayerTimer?.name || $("#prayerselect").value) +
          " · " +
          d.prayerDuration +
          " dk";
        $$("[data-mode]").forEach((b) => b.classList.remove("active"));
      }
      renderQuote();
      renderStats();
      renderTasks();
      renderPrayer();
      tick();
      document.dispatchEvent(new Event("focus-render"));
    }
    let prayerLoading = false,
      prayerAttempt = 0,
      prayerMessage = "";
    function prayerStatusText() {
      if (prayerMessage) return prayerMessage;
      if (d.prayerDate && d.prayerDate !== datekey(Date.now()))
        return (
          d.prayerDate +
          " tarihli kayıt gösteriliyor; güncel vakitler henüz alınmadı."
        );
      return d.prayerDate ? "Güncel · " + d.prayerDate : "";
    }
    function apiBase() {
      let x = new Date(),
        date = `${pad(x.getDate())}-${pad(x.getMonth() + 1)}-${x.getFullYear()}`;
      return { date, method: encodeURIComponent(d.method) };
    }
    async function fetchPrayer(url, location, source) {
      if (prayerLoading) return;
      prayerLoading = true;
      prayerAttempt = Date.now();
      const requestedDate = datekey(Date.now());
      const method = d.method;
      const btn = $("#cityfetch"),
        controller = new AbortController(),
        timeout = setTimeout(() => controller.abort(), 12000);
      btn.disabled = true;
      prayerMessage = "Vakitler yenileniyor…";
      $("#prayerstatus").textContent = prayerMessage;
      try {
        const resp = await fetch(url, { signal: controller.signal });
        if (!resp.ok) throw Error();
        const json = await resp.json(),
          times = json?.data?.timings;
        if (!times) throw Error();
        const result = {};
        names.forEach((n, i) => {
          const match = String(times[apiNames[i]] || "").match(
            /\b(\d{2}:\d{2})\b/,
          );
          if (!match) throw Error();
          result[n] = match[1];
        });
        if (
          JSON.stringify(d.prayerSource) !==
            JSON.stringify(source || d.prayerSource) ||
          d.prayerMethod !== method
        )
          d.prayerTomorrow = null;
        d.prayerTimeZone =
          json.data.meta?.timezone ||
          d.prayerTimeZone ||
          Intl.DateTimeFormat().resolvedOptions().timeZone;
        d.prayerTimes = result;
        d.prayerDate = requestedDate;
        d.prayerLocation = location;
        d.prayerSource = source || d.prayerSource;
        d.prayerMethod = method;
        prayerMessage = "";
        save();
        renderPrayer();
        fetchTomorrowPrayer();
      } catch {
        prayerMessage =
          "Yenilenemedi. " +
          (d.prayerDate
            ? d.prayerDate +
              " tarihli kayıt korunuyor; bugünün vakitleri değildir."
            : "İnternet bağlantısını kontrol et.");
        $("#prayerstatus").textContent = prayerMessage;
        renderPeek();
      } finally {
        clearTimeout(timeout);
        prayerLoading = false;
        btn.disabled = false;
      }
    }
    function fetchForSource(source) {
      const { date, method } = apiBase();
      if (source.type === "coords")
        return fetchPrayer(
          `https://api.aladhan.com/v1/timings/${date}?latitude=${source.lat}&longitude=${source.lon}&method=${method}`,
          d.prayerLocation || "Konumum",
          source,
        );
      if (source.type === "address")
        return fetchPrayer(
          `https://api.aladhan.com/v1/timingsByAddress/${date}?address=${encodeURIComponent(source.address)}&method=${method}`,
          source.address,
          source,
        );
    }
    function refreshPrayer(force = false) {
      if (prayerLoading) return;
      if (!force && Date.now() - prayerAttempt < 300000) return;
      if (
        !force &&
        d.prayerDate === datekey(Date.now()) &&
        (!d.prayerMethod || d.prayerMethod === d.method)
      )
        return;
      let source = d.prayerSource;
      if (
        !source &&
        d.prayerLocation &&
        !["Konumum", "Elle girildi"].includes(d.prayerLocation)
      )
        source = { type: "address", address: d.prayerLocation };
      if (source && source.type !== "manual") fetchForSource(source);
      else renderPrayer();
    }
    $("#cityfetch").onclick = () => {
      const address = $("#city").value.trim();
      if (!address) {
        toast("Şehir ve ülke yaz.");
        return;
      }
      fetchForSource({ type: "address", address });
    };
    $("#geofetch").onclick = () => {
      if (!navigator.geolocation) {
        toast("Konum desteklenmiyor. Şehir yazabilirsin.");
        return;
      }
      if (
        !confirm(
          document.documentElement.lang === "en"
            ? "Your location coordinates will be sent to AlAdhan to retrieve prayer times. Your location is not used for advertising or tracking. Continue?"
            : "Namaz vakitlerini almak için konum koordinatların AlAdhan servisine gönderilecektir. Konumun reklam veya takip amacıyla kullanılmaz. Devam etmek istiyor musun?",
        )
      )
        return;
      navigator.geolocation.getCurrentPosition(
        (p) =>
          fetchForSource({
            type: "coords",
            lat: p.coords.latitude,
            lon: p.coords.longitude,
          }),
        () => toast("Konum izni alınamadı. Şehirle arayabilirsin."),
        { timeout: 12000, enableHighAccuracy: false },
      );
    };
    $("#method").onchange = (e) => {
      d.method = e.target.value;
      save();
      refreshPrayer(true);
    };
    $("#manualtoggle").onclick = () => {
      $("#prayerfields").classList.toggle("hidden");
      $("#manualtoggle").textContent = $("#prayerfields").classList.contains(
        "hidden",
      )
        ? "Elle gir"
        : "Alanları kapat";
    };
    $("#prayerfields").onchange = (e) => {
      if (e.target.matches("input[type=time]")) {
        d.prayerSource = { type: "manual" };
        prayerMessage = "";
        d.prayerTimes[e.target.dataset.prayer] = e.target.value;
        d.prayerDate = datekey(Date.now());
        d.prayerLocation =
          $("#city").value.trim() || d.prayerLocation || "Elle girildi";
        save();
        renderPrayer();
        $("#prayerfields").classList.remove("hidden");
        $("#manualtoggle").textContent = "Alanları kapat";
      }
    };
    let prayerTransitioning = false;
    async function transitionPrayer(change) {
      if (prayerTransitioning) return;
      prayerTransitioning = true;
      const hero = $(".hero"),
        reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
      await hero
        .animate(
          [
            { opacity: 1, transform: "translateY(0)" },
            { opacity: 0.15, transform: "translateY(5px)" },
          ],
          { duration: reduced ? 0 : 140, easing: "ease-in", fill: "forwards" },
        )
        .finished.catch(() => {});
      change();
      render();
      hero.getAnimations().forEach((a) => a.cancel());
      await hero
        .animate(
          [
            { opacity: 0.15, transform: "translateY(5px)" },
            { opacity: 1, transform: "translateY(0)" },
          ],
          { duration: reduced ? 0 : 260, easing: "cubic-bezier(.22,1,.36,1)" },
        )
        .finished.catch(() => {});
      prayerTransitioning = false;
    }
    $("#prayerstart").onclick = () => {
      if (d.prayerView || prayerTransitioning) return;
      transitionPrayer(() => {
        if (d.timer.running) pause();
        d.prayerView = true;
        save();
      });
    };

    $("#prayerselect").onchange = (e) => {
      if (d.prayerTimer && !d.prayerTimer.recorded)
        d.prayerTimer.name = e.target.value;
      save();
      render();
    };
    function newPrayerTimer() {
      return {
        name: $("#prayerselect").value,
        remaining: d.prayerDuration * 60,
        duration: d.prayerDuration * 60,
        elapsed: 0,
        running: false,
        endAt: null,
        segmentStartedAt: null,
        recorded: false,
      };
    }
    function creditPrayer(now) {
      const t = d.prayerTimer;
      if (!t?.running || t.segmentStartedAt === null) return;
      t.elapsed += Math.max(
        0,
        (Math.min(now, t.endAt) - t.segmentStartedAt) / 1000,
      );
      t.segmentStartedAt = Math.min(now, t.endAt);
    }
    function recordPrayer() {
      const t = d.prayerTimer;
      if (!t || t.recorded) return;
      if (t.elapsed > 0)
        d.prayers.push({
          name: t.name,
          at: new Date().toISOString(),
          seconds: Math.round(t.elapsed),
        });
      t.recorded = true;
    }
    function settlePrayer() {
      const t = d.prayerTimer;
      if (!t?.running) return;
      const now = Date.now();
      if (now < t.endAt) {
        t.remaining = (t.endAt - now) / 1000;
        return;
      }
      creditPrayer(t.endAt);
      t.running = false;
      t.remaining = 0;
      t.endAt = null;
      t.segmentStartedAt = null;
      recordPrayer();
      save();
      chime();
      render();
      window.ikraNotify(
        t.name + " · " + Math.round(t.elapsed / 60) + " dakika kaydedildi.",
        { completion: true, title: "Namaz oturumu tamamlandı" },
      );
    }
    function pausePrayer() {
      settlePrayer();
      const t = d.prayerTimer;
      if (!t?.running) return;
      creditPrayer(Date.now());
      t.remaining = Math.max(0, (t.endAt - Date.now()) / 1000);
      t.running = false;
      t.endAt = null;
      t.segmentStartedAt = null;
      save();
    }
    function beginPrayer() {
      if (!d.prayerView) return;
      if (d.timer.running) pause();
      settlePrayer();
      if (d.prayerTimer?.running) {
        pausePrayer();
        save();
        render();
        return;
      }
      if (!d.prayerTimer || d.prayerTimer.recorded)
        d.prayerTimer = newPrayerTimer();
      const t = d.prayerTimer;
      t.running = true;
      t.segmentStartedAt = Date.now();
      t.endAt = Date.now() + t.remaining * 1000;
      save();
      render();
    }
    function resetPrayer() {
      pausePrayer();
      recordPrayer();
      d.prayerTimer = newPrayerTimer();
      save();
      render();
    }
    function leavePrayer() {
      if (prayerTransitioning) return;
      pausePrayer();
      const finished =
        d.prayerTimer && !d.prayerTimer.recorded && d.prayerTimer.elapsed > 0
          ? { name: d.prayerTimer.name, seconds: d.prayerTimer.elapsed }
          : null;
      recordPrayer();
      d.prayerTimer = null;
      d.prayerView = false;
      save();
      render();
      if (finished)
        window.ikraNotify(
          finished.name +
            " · " +
            Math.round(finished.seconds / 60) +
            " dakika kaydedildi.",
          { completion: true, title: "Namaz oturumu kaydedildi" },
        );
    }
    $("#prayerfinish").onclick = leavePrayer;
    document.addEventListener("prayer-begin", beginPrayer);
    document.addEventListener("prayer-leave", leavePrayer);
    $("#prayermin").onchange = (e) => {
      const n = Number(e.target.value);
      if (!Number.isInteger(n) || n < 1 || n > 99) {
        e.target.value = d.prayerDuration;
        return;
      }
      pausePrayer();
      recordPrayer();
      d.prayerDuration = n;
      d.prayerTimer = null;
      save();
      render();
    };
    $("#start").onclick = () => (d.prayerView ? beginPrayer() : start());
    $("#reset").onclick = () => (d.prayerView ? resetPrayer() : reset());
    $("#skip").onclick = () => {
      if (d.prayerView) {
        leavePrayer();
        return;
      }
      let m = d.mode;
      reset();
      if (m === "focus") d.round++;
      changeMode(
        m === "focus"
          ? d.longEvery > 0 && d.round % d.longEvery === 0
            ? "long"
            : "break"
          : "focus",
      );
    };
    $$("[data-mode]").forEach(
      (b) => (b.onclick = () => changeMode(b.dataset.mode)),
    );
    $("#weekly").onclick = () => {
      d.view = "week";
      save();
      renderStats();
    };
    $("#monthly").onclick = () => {
      d.view = "month";
      save();
      renderStats();
    };
    $("#theme").onchange = (e) => {
      d.theme = e.target.value;
      save();
      render();
    };
    $("#subject").onchange = (e) => {
      if (d.timer.running) {
        credit(Date.now());
        d.timer.startedAt = Date.now();
        d.timer.credited = 0;
      }
      d.subject = e.target.value;
      save();
      render();
    };
    $("#addsubject").onclick = () => {
      const button = $("#addsubject"),
        show = button.getAttribute("aria-expanded") !== "true";
      button.setAttribute("aria-expanded", String(show));
      window.animatePanel($("#new-subject-row"), show);
      if (show) $("#new-subject-name").focus();
    };
    $("#save-subject").onclick = () => {
      const name = $("#new-subject-name").value.trim();
      if (!name) return;
      ensureSubject(name, $("#new-subject-color").value);
      if (d.timer.running) pause();
      d.subject = name;
      $("#new-subject-name").value = "";
      $("#addsubject").setAttribute("aria-expanded", "false");
      window.animatePanel($("#new-subject-row"), false);
      save();
      render();
    };
    $("#new-subject-name").onkeydown = (e) => {
      if (e.key === "Enter") $("#save-subject").click();
    };
    $$("[data-taskfilter]").forEach(
      (b) =>
        (b.onclick = () => {
          d.taskFilter = b.dataset.taskfilter;
          save();
          renderTasks();
        }),
    );
    function addTask() {
      let x = $("#task").value.trim();
      if (!x) return;
      d.tasks.push({
        id: Date.now() + Math.random(),
        text: x,
        done: false,
        subject: d.subject,
        due: $("#task-date").value,
      });
      d.taskFilter = "active";
      $("#task").value = "";
      $("#task-date").value = "";
      save();
      renderTasks();
    }
    $("#addtask").onclick = addTask;
    $("#task").onkeydown = (e) => {
      if (e.key === "Enter") addTask();
    };
    for (let k of ["focus", "break", "long"])
      $("#" + k + "min").onchange = (e) => {
        let n = +e.target.value;
        if (!Number.isInteger(n) || n < 1 || n > (k === "focus" ? 240 : 120)) {
          render();
          return;
        }
        if (d.timer.running) pause();
        d.durations[k] = n;
        if (d.mode === k) d.timer.remaining = n * 60;
        save();
        render();
      };
    $("#autonext").onchange = (e) => {
      d.auto = e.target.checked;
      save();
    };
    $("#fullscreen").onclick = () =>
      document.fullscreenElement
        ? document.exitFullscreen()
        : document.documentElement.requestFullscreen?.();
    $("#export").onclick = () => {
      try {
        settle();
        settlePrayer();
        const now = Date.now(),
          snapshot = backupSnapshot(d, now);
        let blob = new Blob(
            [
              JSON.stringify(
                {
                  format: "ikra-v1",
                  exportedAt: new Date(now).toISOString(),
                  data: snapshot,
                },
                null,
                2,
              ),
            ],
            { type: "application/json" },
          ),
          url = URL.createObjectURL(blob),
          a = document.createElement("a");
        a.href = url;
        a.download = "ikra-" + datekey(now) + ".json";
        document.body.append(a);
        a.click();
        a.remove();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
        toast(
          "Yedek indirme başlatıldı. Dosyayı İndirilenler klasöründe bulabilirsin.",
        );
      } catch {
        toast("Yedek hazırlanamadı. Lütfen tekrar dene.");
      }
    };
    $("#import").onclick = () => $("#importfile").click();
    $("#importfile").onchange = async (e) => {
      const file = e.target.files[0];
      if (!file) return;
      try {
        if (file.size > 20 * 1024 * 1024)
          throw Error("Yedek 20 MB sınırını aşıyor.");
        const parsed = JSON.parse(await file.text()),
          next = validateBackup(parsed);
        const summary = `${next.sessions.length} çalışma, ${next.tasks.length} görev, ${next.subjects.length} ders ve ${next.prayers.length} namaz kaydı yüklenecek. Mevcut kayıtlar değişecek; sayaçlar duraklatılmış olarak açılacak. Devam edilsin mi?`;
        if (!confirm(window.ikraT(summary))) return;
        const old = d;
        try {
          localStorage.setItem(KEY + "-before-import", JSON.stringify(old));
          localStorage.setItem(KEY, JSON.stringify(next));
        } catch {
          throw Error(
            "Yeterli depolama yok. Mevcut kayıtların değiştirilmedi.",
          );
        }
        d = next;
        render();
        document.dispatchEvent(new Event("backup-restored"));
        toast(next.sessions.length + " çalışma kaydı ve derslerin yüklendi.");
        setTimeout(() => refreshPrayer(), 0);
      } catch (error) {
        toast(
          error instanceof SyntaxError
            ? "Dosya okunamadı: geçerli bir JSON yedeği seç."
            : error.message || "Yedek yüklenemedi.",
        );
      } finally {
        e.target.value = "";
      }
    };
    function renderPeek() {
      $("#peek-toggle").setAttribute("aria-expanded", String(!!d.prayerPeek));
      window.animatePanel($("#prayer-peek"), !!d.prayerPeek);
      $("#peek-location").textContent = d.prayerLocation || "Konum ekle";
      let grid = $("#peek-times");
      grid.replaceChildren();
      let current = d.prayerDate === datekey(Date.now());
      names.forEach((n) => {
        let box = document.createElement("div"),
          label = document.createElement("b"),
          time = document.createElement("span");
        box.className = "prayer";
        label.textContent = n;
        time.textContent = d.prayerTimes[n] || "—";
        box.append(label, time);
        grid.append(box);
      });
      if (!current && d.prayerDate)
        $("#peek-location").textContent +=
          " · " + d.prayerDate + " kaydı (güncel değil)";
    }
    $("#peek-toggle").onclick = () => {
      d.prayerPeek = !d.prayerPeek;
      save();
      renderPeek();
    };
    $("#peek-config").onclick = () => window.openPrayerSettings?.();
    $("#longevery").onchange = (e) => {
      let n = Number(e.target.value);
      if (!Number.isInteger(n) || n < 0 || n > 24) {
        e.target.value = d.longEvery;
        return;
      }
      d.longEvery = n;
      d.round = 0;
      save();
    };
    $("#soundenabled").onchange = (e) => {
      d.sound = e.target.checked;
      save();
      if (d.sound) playSound("tap");
    };
    $("#soundvolume").oninput = (e) => {
      d.soundVolume = Number(e.target.value) / 100;
      save();
    };
    $("#soundtest").onclick = () => playSound("finish");
    $("#manual-open").onclick = () => {
      const show = $("#manual-open").getAttribute("aria-expanded") !== "true";
      $("#manual-open").setAttribute("aria-expanded", String(show));
      window.animatePanel($("#manual-body"), show);
      if (show) {
        $("#manual-date").value = datekey(Date.now());
        $("#manual-status").textContent = "";
        $("#manual-subject").value = d.subject;
      }
    };
    function submitManualSession(e) {
      e?.preventDefault();
      const status = $("#manual-status"),
        mins = Number($("#manual-minutes").value),
        date = $("#manual-date").value,
        subject = $("#manual-subject").value.trim();
      status.textContent = "";
      if (!subject) {
        status.textContent = "Bir ders seç veya dersin adını yaz.";
        $("#manual-subject").focus();
        return;
      }
      if (!Number.isInteger(mins) || mins < 1 || mins > 1440) {
        status.textContent = "1–1440 arasında tam sayı olarak dakika gir.";
        return;
      }
      if (!isDateKey(date) || date > datekey(Date.now())) {
        status.textContent = "Bugün veya geçmişte geçerli bir tarih seç.";
        return;
      }
      const at = new Date(date + "T12:00:00");
      ensureSubject(subject);
      const record = {
        id:
          globalThis.crypto?.randomUUID?.() ||
          String(Date.now()) + Math.random(),
        at: at.toISOString(),
        subject,
        seconds: Math.round(mins * 60),
        complete: true,
        manual: true,
      };
      const previous = [...d.sessions];
      d.sessions.push(record);
      d.statsView = "all";
      try {
        localStorage.setItem(KEY, JSON.stringify(d));
      } catch {
        d.sessions = previous;
        status.textContent =
          "Kayıt saklanamadı. Tarayıcı depolaması dolu olabilir.";
        return;
      }
      renderStats();
      renderSubjectChoices();
      $("#manual-minutes").value = "";
      $("#manual-preview").textContent = "";
      status.textContent =
        subject + " · " + display(record.seconds) + " kaydedildi.";
      window.ikraNotify(
        subject + " · " + mins + " dakika istatistiklerine eklendi.",
        { completion: true, title: "Oturum kaydedildi" },
      );
      playSound("finish");
    }
    $("#manual-minutes").addEventListener("input", () => {
      const n = Number($("#manual-minutes").value);
      $("#manual-preview").textContent =
        Number.isInteger(n) && n > 0 && n <= 1440
          ? display(n * 60)
          : "Dakika olarak gir: 1 saat = 60 dakika";
    });
    $("#manual-minutes").dispatchEvent(new Event("input"));
    $("#manual-session-form").onsubmit = submitManualSession;
    const manualSave = $('#manual-session-form button[type="submit"]');
    manualSave.type = "button";
    manualSave.onclick = submitManualSession;
    document.addEventListener("click", (e) => {
      let b = e.target.closest("button");
      if (!b || b.disabled || b.id === "soundtest") return;
      if (b.id === "focus-toggle") playSound("wind");
      else if (b.id === "start")
        playSound(
          (d.prayerView ? d.prayerTimer?.running : d.timer.running)
            ? "start"
            : "pause",
        );
      else if (b.id === "prayerfinish") playSound("finish");
      else playSound("tap");
    });

    function renderAllStats() {
      const view = d.statsView || "all",
        anchor = d.statsAnchor
          ? new Date(d.statsAnchor + "T12:00:00")
          : new Date(),
        result = aggregateStats(d.sessions, view, anchor);
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
    $$("[data-stats]").forEach(
      (b) =>
        (b.onclick = () => {
          d.statsView = b.dataset.stats;
          d.statsAnchor = datekey(Date.now());
          save();
          renderAllStats();
        }),
    );
    function shiftStats(direction) {
      let x = d.statsAnchor
        ? new Date(d.statsAnchor + "T12:00:00")
        : new Date();
      if (d.statsView === "year") {
        x.setMonth(0, 1);
        x.setFullYear(x.getFullYear() + direction);
      } else if (d.statsView === "month") {
        x.setDate(1);
        x.setMonth(x.getMonth() + direction);
      } else x.setDate(x.getDate() + 7 * direction);
      d.statsAnchor = datekey(x);
      save();
      renderAllStats();
    }
    $("#stats-prev").onclick = () => shiftStats(-1);
    $("#stats-next").onclick = () => shiftStats(1);
    let lastCalendarDay = datekey(Date.now());
    setInterval(() => {
      const today = datekey(Date.now());
      if (today !== lastCalendarDay) {
        lastCalendarDay = today;
        prayerMessage = "";
        renderStats();
        renderPrayer();
      }
      refreshPrayer();
    }, 60000);
    window.addEventListener("online", () => refreshPrayer(true));
    document.addEventListener("visibilitychange", () => {
      if (!document.hidden) refreshPrayer();
    });
    setTimeout(() => {
      refreshPrayer();
      fetchTomorrowPrayer();
    }, 0);
    document.addEventListener("widget-position", (e) => {
      d.widgetPositions = d.widgetPositions || {};
      if (e.detail.reset) d.widgetPositions = {};
      else d.widgetPositions[e.detail.id] = e.detail.position;
      save();
    });
    document.addEventListener("visibilitychange", () => {
      if (!document.hidden) {
        settle();
        render();
      }
    });
    setInterval(tick, 1000);
    document.addEventListener("ikra-language", () => render());
    settle();
    render();
  })();
}
