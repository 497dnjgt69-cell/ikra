import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { fileURLToPath } from "node:url";
import { JSDOM } from "jsdom";
import { createPrayerView } from "../js/ui/prayer.js";
// DOM integration, not a browser layout test. Animation/dialog/media APIs are stubbed.
for (const width of [1440, 390])
  test(`UI workflows, bilingual round-trips and data preservation at media width ${width}`, async (t) => {
    let app, dom;
    const root = fileURLToPath(new URL("..", import.meta.url));
    const globals = [
      "window",
      "document",
      "navigator",
      "localStorage",
      "sessionStorage",
      "MutationObserver",
      "NodeFilter",
      "Option",
      "Event",
      "CustomEvent",
      "Node",
      "HTMLElement",
      "Element",
      "HTMLDialogElement",
      "getComputedStyle",
      "matchMedia",
      "requestAnimationFrame",
      "cancelAnimationFrame",
      "addEventListener",
      "innerWidth",
      "innerHeight",
      "ResizeObserver",
      "confirm",
      "setTimeout",
      "setInterval",
    ];
    const old = new Map(
      globals.map((k) => [k, Object.getOwnPropertyDescriptor(globalThis, k)]),
    );
    const timeouts = [],
      intervals = [];
    const timeout = globalThis.setTimeout,
      interval = globalThis.setInterval;
    globalThis.setTimeout = (...args) => {
      const id = timeout(...args);
      timeouts.push(id);
      return id;
    };
    globalThis.setInterval = (...args) => {
      const id = interval(...args);
      intervals.push(id);
      return id;
    };
    t.after(() => {
      app?.dispose();
      dom?.window.close();
      timeouts.forEach(clearTimeout);
      intervals.forEach(clearInterval);
      for (const [k, d] of old) {
        if (d) Object.defineProperty(globalThis, k, d);
        else delete globalThis[k];
      }
    });
    const html = fs.readFileSync(root + "/index.html", "utf8");
    dom = new JSDOM(html, {
      url: "https://example.test/ikra/",
      pretendToBeVisual: true,
    });
    const w = dom.window;
    for (const name of [
      "window",
      "document",
      "localStorage",
      "sessionStorage",
      "MutationObserver",
      "NodeFilter",
      "Option",
      "Event",
      "CustomEvent",
      "Node",
      "HTMLElement",
      "Element",
      "HTMLDialogElement",
      "getComputedStyle",
    ])
      global[name] = name === "window" ? w : w[name];
    Object.defineProperty(global, "navigator", {
      value: w.navigator,
      configurable: true,
    });
    global.matchMedia = w.matchMedia = (query) => ({
      matches: query.includes("max-width:690px") && width === 390,
      addEventListener() {},
      removeEventListener() {},
    });
    global.requestAnimationFrame = w.requestAnimationFrame.bind(w);
    global.cancelAnimationFrame = w.cancelAnimationFrame.bind(w);
    global.addEventListener = w.addEventListener.bind(w);
    global.innerWidth = width;
    global.innerHeight = 900;
    global.ResizeObserver = class {
      observe() {}
      disconnect() {}
    };
    w.Element.prototype.getAnimations = () => [];
    w.Element.prototype.animate = function () {
      return { finished: Promise.resolve(), cancel() {}, finish() {} };
    };
    w.HTMLElement.prototype.scrollTo = function () {};
    w.HTMLDialogElement.prototype.showModal = function () {
      this.open = true;
    };
    w.HTMLDialogElement.prototype.close = function () {
      this.open = false;
      this.dispatchEvent(new w.Event("close"));
    };
    global.confirm = () => true;
    w.localStorage.setItem("ikra-release-seen:1.4.0", "1");
    if (width === 390) w.localStorage.setItem("ikra-language", "en");
    const errors = [];
    w.addEventListener("error", (e) => {
      errors.push(e.error?.stack || e.message);
      e.preventDefault();
    });
    const { bootstrap } = await import(root + "/js/bootstrap.js");
    app = bootstrap({
      storage: w.localStorage,
      ankiAPI: {async sync(){return {profile:"Test",syncedAt:new Date().toISOString(),reviews:[{id:Date.now()-1000,card:1,seconds:75,ease:3}]};}},
      prayerAPI: {
        load() {
          throw Error("No network expected");
        },
      },
    });

    w.HTMLMediaElement.prototype.pause = function() {};
    w.HTMLMediaElement.prototype.load = function() {};
    const $ = (s) => w.document.querySelector(s);
    const flush = () => new Promise((r) => setTimeout(r, 20));
    await flush();
    assert.equal($('#statistics-general').hidden, false);
    for (const section of ['focus', 'anki', 'prayer', 'general']) {
      $(`[data-stat-section="${section}"]`).click();
      assert.equal($(`#statistics-${section}`).hidden, false);
      assert.equal($('#statistics-records').hidden, section !== 'general');
      assert.equal($('#statistics-period-controls').hidden, !['general', 'focus', 'anki'].includes(section));
      assert.equal(w.document.querySelectorAll('.statistics-section:not([hidden])').length, 1);
    }
    $('#anki-sync').click();
    await flush();
    assert.equal(app.store.state.anki.reviews.length, 1);
    assert.match($('#anki-summary').textContent, /1 (dk|min)/);
    app.backup.restore(app.backup.export());
    assert.equal(app.store.state.anki.profile, 'Test');
    $('#anki-goal').value='50';$('#anki-goal').dispatchEvent(new w.Event('change'));
    await flush();
    assert.equal(app.store.state.ankiGoal,50);
    app.backup.restore(app.backup.export());
    assert.equal(app.store.state.ankiGoal,50);
    assert.equal(document.querySelectorAll('.anki-day').length,28);
    assert.equal(document.querySelectorAll('.anki-badge').length,6);
    assert.equal(document.querySelector('.anki-ring').getAttribute('aria-valuemax'),'50');
    assert.match($('#focus-streak').textContent, /Focus Streak/);
    $('#anki-toggle').click();
    assert.equal($('#anki-toggle').getAttribute('aria-expanded'),'true');
    assert.ok($('#anki-widget .widget-handle'));
    if(width<690){assert.ok($('#mobile-anki-widget #anki-widget'));$('#mobile-anki-widget').close();$('#mobile-anki-widget').dispatchEvent(new w.Event('close'));}
    else assert.ok($('.widget-stack #anki-widget'));
    assert.equal($('#panel-anki'),null);
    assert.ok($('#panel-history #statistics-anki'));
    assert.ok($('#panel-settings #dock-edit'));assert.equal($('.dock #dock-edit'),null);
    $('#dock-edit').click();$('[data-remove="sounds"]').click();
    assert.equal($('.dock [data-dock-id="sounds"]').hidden,true);
    $('[data-tool="anki"]').dispatchEvent(new w.KeyboardEvent('keydown',{key:'ArrowLeft',altKey:true,bubbles:true}));
    assert.ok(app.store.state.dock.order.indexOf('anki')<app.store.state.dock.order.indexOf('history'));
    const order=[...app.store.state.dock.order];app.backup.restore(app.backup.export());assert.deepEqual(app.store.state.dock.order,order);
    $('[data-add="sounds"]').click();assert.equal($('.dock [data-dock-id="sounds"]').hidden,false);
    $('#dock-reset').click();
    const grip=$('[data-tool="anki"]');
    const originalPoint=w.document.elementFromPoint;
    w.document.elementFromPoint=()=> $('[data-dock-tool="tasks"]');
    const down=new w.Event('pointerdown');Object.assign(down,{button:0,pointerId:1});grip.dispatchEvent(down);
    const move=new w.Event('pointermove');Object.assign(move,{clientX:0,clientY:0});grip.dispatchEvent(move);grip.dispatchEvent(new w.Event('pointerup'));
    assert.equal(app.store.state.dock.order[0],'anki');w.document.elementFromPoint=originalPoint;
    $('#dock-reset').click();
    assert.equal($('.dock [data-dock-id="prayer"]'),null);
    assert.ok($('.dock [data-dock-id="progress"]'));

    const prayerView = createPrayerView({ store: app.store, times: {
      next: () => ({ name: "Yatsı", minutes: 411, tomorrow: false }),
      wall: () => ({ date: "2026-09-30" }),
    } });
    $('[data-language=tr]').click();
    await flush();
    prayerView.updateNextPrayer();
    assert.equal($('#next-prayer').textContent, 'Yatsı · 6 saat 51 dk kaldı');
    $('[data-language=en]').click();
    await flush();
    prayerView.updateNextPrayer();
    assert.equal($('#next-prayer').textContent, 'Isha · 6 h 51 min remaining');
    $('[data-language=tr]').click();
    await flush();
    assert.equal(document.querySelectorAll('.hour-cell').length, 168);
    assert.equal(document.querySelectorAll('.prayer-check').length, 35);
    document.querySelector('.prayer-check:not(:disabled)').click();
    await flush();
    assert.equal(document.querySelector('.prayer-check:not(:disabled)').getAttribute('aria-pressed'), 'true');
    assert.equal(Object.keys(app.store.state.prayerChecks).length, 1);
    app.backup.restore(app.backup.export());
    await flush();
    assert.equal(document.querySelector('.prayer-check:not(:disabled)').getAttribute('aria-pressed'), 'true');
    assert.equal(w.document.querySelectorAll(".place-choice").length, 5);
    $('.place-choice[data-place="japan"]').click();
    assert.equal($(".place-preview").dataset.place, "japan");
    assert.equal(w.localStorage.getItem("ikra-selected-place-v1"), "japan");
    assert.equal($('.place-choice[data-place="japan"]').getAttribute("aria-pressed"), "true");
    assert.equal($("#panel-sounds audio"), null);
    $("#addsubject").click();
    $("#new-subject-name").value = "Anatomy";
    $("#save-subject").click();
    await flush();
    if (app.store.state.subject !== "Anatomy") throw Error("course creation");
    $("#task").value = "Study muscles";
    $("#addtask").click();
    await flush();
    if (app.store.state.tasks.length !== 1) throw Error("task creation");
    $("#start").click();
    await flush();
    if (!app.store.state.timer.running) throw Error("timer start");
    const deadline = app.store.state.timer.endAt;
    $('[data-mode="clock"]').click();
    await flush();
    assert.equal(app.store.state.timer.running, true);
    assert.equal(app.store.state.timer.endAt, deadline);
    assert.equal($('#title').textContent, w.ikraT("Şimdiki an."));
    assert.equal($('#start').classList.contains('hidden'), true);
    assert.equal($('[data-mode="clock"]').classList.contains('active'), true);
    $('[data-mode="focus"]').click();
    await flush();
    assert.equal(app.store.state.timer.endAt, deadline);
    assert.equal($('#start').classList.contains('hidden'), false);
    $("#start").click();
    await flush();
    if (app.store.state.timer.running) throw Error("timer pause");
    $("#manual-open").click();
    $("#manual-subject").value = "Anatomy";
    $("#manual-minutes").value = "60";
    $("#manual-date").value = "2026-09-20";
    $("#manual-session-form button").click();
    await flush();
    if (!app.store.state.sessions.some((s) => s.manual && s.seconds === 3600))
      throw Error("manual record");
    $('[data-mode="clock"]').click();await flush();
    assert.equal($('#modes').classList.contains('breaks-open'),false);
    $('[data-mode="focus"]').click();await flush();
    assert.equal($('#modes').classList.contains('breaks-open'),true);
    assert.equal($('#mode-breaks').children.length,2);
    $("#theme").value = "neumorphism";
    $("#theme").dispatchEvent(new w.Event("change"));
    await flush();
    assert.equal(app.store.state.theme,"neumorphism");
    assert.equal(document.body.dataset.theme,"neumorphism");
    $("[data-language=en]").click();
    await flush();
    if (w.document.documentElement.lang !== "en") throw Error("language");
    $("#prayerstart").click();
    await flush();
    if (!app.store.state.prayerView) throw Error("prayer enter");
    assert.equal($("#prayer-go").disabled,true);
    $('.prayer-selection [data-value="Sabah"]').click();
    assert.equal($("#prayer-go").disabled,false);
    $("#prayer-go").click();
    await flush();
    assert.equal(app.store.state.prayerTimer.untimed,true);
    assert.equal($('#prayer-focus-room').hidden,false);
    assert.equal($('#prayer-focus-room').closest('#prayer-presence'),$('#prayer-presence'));
    assert.equal($('#prayer-focus-room').tagName,'SECTION');
    $('#prayer-pause').click();await flush();
    assert.equal(app.store.state.prayerTimer.paused,true);
    assert.equal($('#prayer-focus-room').classList.contains('is-paused'),true);
    $('#prayer-pause').click();await flush();assert.equal(app.store.state.prayerTimer.paused,false);
    $("#prayerfinish").click();
    await flush();
    if (app.store.state.prayerView) throw Error("prayer leave");
    const historyCount =
      app.store.state.sessions.length + app.store.state.prayers.length;
    $("#history .session-delete").click();
    await flush();
    assert.equal(
      app.store.state.sessions.length + app.store.state.prayers.length,
      historyCount - 1,
    );
    $("#completion-notices .notice-undo").click();
    await flush();
    assert.equal(
      app.store.state.sessions.length + app.store.state.prayers.length,
      historyCount,
    );
    $("#tasklist input[type=checkbox]").click();
    await flush();
    assert.equal(app.store.state.tasks[0].done, true);
    $("#reset-widgets").click();
    await flush();
    assert.deepEqual(app.store.state.widgetPositions, {});
    const exported = app.backup.export();
    app.records.addManual({
      subject: "Extra",
      minutes: 10,
      date: "2026-09-20",
    });
    await flush();
    Object.defineProperty($("#importfile"), "files", {
      configurable: true,
      value: [{ size: 1000, text: async () => JSON.stringify(exported) }],
    });
    $("#importfile").dispatchEvent(new w.Event("change"));
    await flush();
    assert.equal(app.store.state.subjects.includes("Extra"), false);
    $("#course-colors .session-delete").click();
    await flush();
    assert.equal(app.store.state.subjects.length, 0);
    const undoButtons = w.document.querySelectorAll(
      "#completion-notices .notice-undo",
    );
    undoButtons[undoButtons.length - 1].click();
    await flush();
    assert.equal(app.store.state.subjects[0], "Anatomy");
    const progressButton = $(".dock [aria-controls=progress-card]");
    progressButton.click();
    await flush();
    if (width === 390) {
      assert.equal($("#mobile-progress-card").open, true);
      $("#mobile-progress-card .dialog-top button").click();
      await flush();
      assert.equal($("#mobile-progress-card").open, false);
    }
    // User data and account access remain separate after an actual UI import.
    assert.equal(app.access.plan, "free");

    // Language round-trips must update copy, dates and dynamic notices without
    // translating user data (including names that collide with dictionary entries).
    app.records.addManual({subject: "Focus", minutes: 61, date: "2026-09-20"});
    app.planner.addSubject("Saat");
    app.planner.addTask("Light", "2026-09-20");
    app.store.update((d) => {
      d.prayers.push({id: "i18n-prayer", name: "Sabah", seconds: 120, at: "2026-09-20T12:00:00.000Z", complete: true});
      d.prayerDate = "2026-09-20";
      d.prayerLocation = "Montréal, Canada";
    });
    await flush();
    for (const lang of ["tr", "en", "tr", "en"]) {
      w.ikraSetLanguage(lang);
      await flush();
      assert.equal($("#panel-sounds h2").textContent, lang === "en" ? "Themed Places" : "Temalı Mekânlar");
      assert.equal($('.place-choice[data-place="bosphorus"] .place-choice-name').textContent, lang === "en" ? "Bosphorus café" : "Boğaz’da bir kafe");
      assert.equal($(".place-waiting").textContent, lang === "en" ? "Audio coming soon" : "Ses yakında");
      assert.equal($("#title").textContent, lang === "en" ? "Find your focus." : "Odağını topla.");
      assert.ok($("#about-ikra").textContent.includes(lang === "en" ? "Hi, I'm Mahir" : "Merhaba, ben Mahir"));
      assert.ok($("#panel-history").textContent.includes(lang === "en" ? "Prayer time is not included" : "Namaz süreleri"));
      assert.ok($("#prayer-settings").textContent.includes(lang === "en" ? "Automatic times require internet" : "Otomatik vakitler internet"));
      assert.equal($("#prayer-settings h2").textContent, lang === "en" ? "Location & calculation" : "Konum ve hesaplama");
      assert.equal($(".number-wheel").getAttribute("aria-label"), lang === "en" ? "Focus duration in minutes" : "Odak dakika");
      assert.equal($("#plan-progress").getAttribute("aria-label"), lang === "en" ? "Task completion rate" : "Tamamlanan görev oranı");
      assert.equal($("#tasklist .task-name").textContent, "Light");
      assert.ok($("#history").textContent.includes("Focus ·"));
      assert.ok($("#history").textContent.includes(lang === "en" ? "Prayer · Fajr · completed" : "Namaz · Sabah · tamamlandı"));
      assert.ok($("#peek-location").textContent.includes(lang === "en" ? "(out of date)" : "(güncel değil)"));
      assert.deepEqual([...$("#subject-options").options].map(o => o.textContent), app.store.state.subjects);
      assert.ok($("#tasklist input").getAttribute("aria-label").startsWith("Light "));
    }
    // Open notices also change language; interpolated course names stay literal.
    $("#manual-subject").value = "Saat";
    $("#manual-minutes").value = "1";
    $("#manual-date").value = "2026-09-20";
    $("#manual-session-form button").click();
    await flush();
    assert.equal($("#manual-status").textContent, "Saat · 1 min saved.");
    assert.ok($("#completion-notices").textContent.includes("Saat · 1 min added to your statistics."));
    w.ikraSetLanguage("tr");
    await flush();
    assert.equal($("#manual-status").textContent, "Saat · 1 dk kaydedildi.");
    assert.ok($("#completion-notices").textContent.includes("Saat · 1 dakika istatistiklerine eklendi."));
    assert.equal(app.store.state.sessions.at(-1).subject, "Saat");
    if (errors.length) throw Error(errors.join("\n"));
  });
