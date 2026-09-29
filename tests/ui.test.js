import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { fileURLToPath } from "node:url";
import { JSDOM } from "jsdom";
// DOM integration, not a browser layout test. Animation/dialog/media APIs are stubbed.
for (const width of [1440, 390])
  test(`UI workflows and data preservation at media width ${width}`, async (t) => {
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
    w.localStorage.setItem("ikra-release-seen:1.1.1", "1");
    const errors = [];
    w.addEventListener("error", (e) => {
      errors.push(e.error?.stack || e.message);
      e.preventDefault();
    });
    const { bootstrap } = await import(root + "/js/bootstrap.js");
    app = bootstrap({
      storage: w.localStorage,
      prayerAPI: {
        load() {
          throw Error("No network expected");
        },
      },
    });

    const $ = (s) => w.document.querySelector(s);
    const flush = () => new Promise((r) => setTimeout(r, 20));
    await flush();
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
    $("#theme").value = "nature";
    $("#theme").dispatchEvent(new w.Event("change"));
    await flush();
    $("[data-language=en]").click();
    await flush();
    if (w.document.documentElement.lang !== "en") throw Error("language");
    $("#prayerstart").click();
    await flush();
    if (!app.store.state.prayerView) throw Error("prayer enter");
    $("#start").click();
    await flush();
    if (!app.store.state.prayerTimer?.running) throw Error("prayer start");
    $("#start").click();
    await flush();
    $("#skip").click();
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

    if (errors.length) throw Error(errors.join("\n"));
  });
