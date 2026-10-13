export default function initialize({ getWidgetPositions }) {
  (() => {
    const $ = (s) => document.querySelector(s);
    const pickers = [];
    for (const id of [
      "focusmin",
      "breakmin",
      "longmin",
      "prayermin",
      "longevery",
    ]) {
      const input = $("#" + id),
        label = input.closest("label"),
        min = +input.min,
        max = +input.max;
      label.classList.add("wheel-label");
      const wrap = document.createElement("span");
      wrap.className = "duration-stepper";
      const up = document.createElement("button"), down = document.createElement("button");
      up.type = down.type = "button";
      up.textContent = "⌃"; down.textContent = "⌄";
      up.setAttribute("aria-label", "Artır"); down.setAttribute("aria-label", "Azalt");
      input.before(wrap);
      wrap.append(up, input, down);
      input.inputMode = "numeric";
      input.setAttribute("aria-label", {
        focusmin: "Odak dakika", breakmin: "Kısa mola dakika", longmin: "Uzun mola dakika",
        prayermin: "Namaz dakika", longevery: "Uzun mola aralığı",
      }[id]);
      input.addEventListener("focus", () => input.select());
      input.addEventListener("keydown", e => {
        if (e.key === "Enter") { e.preventDefault(); input.blur(); }
      });
      function step(amount) {
        const current = Number(input.value);
        input.value = Math.max(min, Math.min(max, (Number.isFinite(current) ? current : min) + amount));
        input.dispatchEvent(new Event("change", { bubbles: true }));
        sync();
      }
      up.onclick = () => step(1);
      down.onclick = () => step(-1);
      function sync() {
        up.disabled = Number(input.value) >= max;
        down.disabled = Number(input.value) <= min;
      }
      input.addEventListener("change", sync);
      sync();
      pickers.push(sync);
    }
    $("#panel-settings").addEventListener("toggle", () => {
      if ($("#panel-settings").open)
        requestAnimationFrame(() => pickers.forEach((f) => f()));
    });
    document.addEventListener("focus-render", () =>
      pickers.forEach((f) => f()),
    );
    const stage = $(".focusstage"),
      stack = document.createElement("aside");
    stack.className = "widget-stack";
    stack.setAttribute("aria-label", "Bilgi kartları");
    stage.append(stack);
    const cards = [
      ["heatmap", $(".activity-mini"), "İlerleme"],
      ["prayer", $("#prayer-peek"), "Namaz vakitleri"],
      ["anki", $("#anki-widget"), "Anki"],
    ];
    cards.forEach(([, card]) => stack.append(card));
    let saved = getWidgetPositions();
    const active = [];
    let topZ = 5;
    for (const [id, card, title] of cards) {
      const handle = document.createElement("div");
      handle.className = "widget-handle";
      handle.textContent = title;
      handle.tabIndex = 0;
      handle.setAttribute("role", "button");
      handle.setAttribute(
        "aria-label",
        title + " kartını sürükle; ok tuşlarıyla taşı",
      );
      const heading = document.createElement("div");
      heading.className = "widget-heading";
      const minimize = document.createElement("button");
      minimize.type = "button";
      minimize.className = "widget-minimize";
      minimize.textContent = "−";
      minimize.setAttribute("aria-label", "Küçült");
      minimize.title = "Küçült";
      minimize.onclick = () => {
        const dialog = card.closest("dialog");
        const toggle = id === "heatmap" ? $('.dock [aria-controls="progress-card"]') : $(id === "prayer" ? "#peek-toggle" : "#anki-toggle");
        if (dialog?.open) window.closePanel(dialog);
        else if (toggle?.getAttribute("aria-expanded") === "true") toggle.click();
        toggle?.focus({preventScroll:true});
      };
      heading.append(handle, minimize);
      card.prepend(heading);
      let drag = null,
        raf = null,
        last = null;
      const clamp = (x, y) => ({
        x: Math.max(8, Math.min(innerWidth - card.offsetWidth - 8, x)),
        y: Math.max(8, Math.min(innerHeight - card.offsetHeight - 8, y)),
      });
      function place(x, y) {
        const pos = clamp(x, y);
        card.style.left = pos.x + "px";
        card.style.top = pos.y + "px";
        return pos;
      }
      function floating() {
        if (!card.classList.contains("floating-widget")) {
          const r = card.getBoundingClientRect();
          card.style.width = Math.min(r.width || 250, innerWidth - 16) + "px";
          card.classList.add("floating-widget");
          place(r.left, r.top);
        }
        card.style.zIndex = ++topZ;
      }
      function persist() {
        const r = card.getBoundingClientRect();
        document.dispatchEvent(
          new CustomEvent("widget-position", {
            detail: {
              id,
              position: { x: r.left / innerWidth, y: r.top / innerHeight },
            },
          }),
        );
      }
      handle.addEventListener("pointerdown", (e) => {
        if (e.button !== 0) return;
        e.preventDefault();
        floating();
        const r = card.getBoundingClientRect();
        drag = {
          id: e.pointerId,
          dx: e.clientX - r.left,
          dy: e.clientY - r.top,
        };
        handle.setPointerCapture(e.pointerId);
        card.classList.add("dragging-widget");
      });
      handle.addEventListener("pointermove", (e) => {
        if (!drag) return;
        last = { x: e.clientX - drag.dx, y: e.clientY - drag.dy };
        if (!raf)
          raf = requestAnimationFrame(() => {
            raf = null;
            if (last) place(last.x, last.y);
          });
      });
      function end(e) {
        if (!drag) return;
        if (raf) cancelAnimationFrame(raf);
        raf = null;
        if (last) place(last.x, last.y);
        last = null;
        drag = null;
        card.classList.remove("dragging-widget");
        if (handle.hasPointerCapture(e.pointerId))
          handle.releasePointerCapture(e.pointerId);
        persist();
      }
      handle.addEventListener("pointerup", end);
      handle.addEventListener("pointercancel", end);
      handle.addEventListener("keydown", (e) => {
        const delta = {
          ArrowLeft: [-12, 0],
          ArrowRight: [12, 0],
          ArrowUp: [0, -12],
          ArrowDown: [0, 12],
        }[e.key];
        if (!delta) return;
        e.preventDefault();
        floating();
        const r = card.getBoundingClientRect();
        place(r.left + delta[0], r.top + delta[1]);
        persist();
      });
      function restore() {
        if (saved[id]) {
          card.style.width = Math.min(250, innerWidth - 16) + "px";
          card.classList.add("floating-widget");
          place(saved[id].x * innerWidth, saved[id].y * innerHeight);
        }
      }
      restore();
      new ResizeObserver(() => {
        if (
          card.classList.contains("floating-widget") &&
          !card.classList.contains("hidden")
        ) {
          const r = card.getBoundingClientRect();
          place(r.left, r.top);
        }
      }).observe(card);
      active.push({ card, place });
    }
    addEventListener("resize", () =>
      active.forEach(({ card, place }) => {
        if (card.classList.contains("floating-widget")) {
          card.style.width = Math.min(250, innerWidth - 16) + "px";
          const r = card.getBoundingClientRect();
          place(r.left, r.top);
        }
      }),
    );
    $("#reset-widgets").onclick = () => {
      active.forEach(({ card }) => {
        card.classList.remove("floating-widget");
        card.style.removeProperty("left");
        card.style.removeProperty("top");
        card.style.removeProperty("width");
        card.style.removeProperty("z-index");
      });
      saved = {};
      document.dispatchEvent(
        new CustomEvent("widget-position", { detail: { reset: true } }),
      );
    };
  })();
}
