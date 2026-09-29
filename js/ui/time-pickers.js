export default function initialize() {
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
      input.style.display = "none";
      input.setAttribute("aria-hidden", "true");
      input.tabIndex = -1;
      label.classList.add("wheel-label");
      const wrap = document.createElement("span");
      wrap.className = "wheel-wrap";
      const wheel = document.createElement("span");
      wheel.className = "number-wheel";
      wheel.style.display = "block";
      wheel.tabIndex = 0;
      wheel.setAttribute("role", "spinbutton");
      wheel.setAttribute("aria-label", label.textContent.trim());
      wheel.setAttribute("aria-valuemin", min);
      wheel.setAttribute("aria-valuemax", max);
      wrap.append(wheel);
      label.append(wrap);
      let timer,
        scrolling = false,
        userScroll = false;
      const nodes = [];
      for (let n = min; n <= max; n++) {
        const item = document.createElement("span");
        item.style.display = "block";
        item.className = "wheel-item";
        item.textContent = n;
        item.setAttribute("aria-hidden", "true");
        item.onclick = () => {
          userScroll = true;
          wheel.scrollTo({ top: (n - min) * 36, behavior: "smooth" });
        };
        wheel.append(item);
        nodes.push(item);
      }
      const mark = () => {
        const value = Math.max(
          min,
          Math.min(max, min + Math.round(wheel.scrollTop / 36)),
        );
        nodes.forEach((n, i) =>
          n.classList.toggle("selected", i === value - min),
        );
        wheel.setAttribute("aria-valuenow", value);
        wheel.setAttribute(
          "aria-valuetext",
          id === "longevery" && value === 0 ? "Serbest" : String(value),
        );
        return value;
      };
      function sync() {
        if (!wheel.getClientRects().length) {
          clearTimeout(timer);
          scrolling = false;
          userScroll = false;
          return;
        }
        if (userScroll && scrolling) return;
        userScroll = false;
        wheel.scrollTop =
          (Math.max(min, Math.min(max, +input.value)) - min) * 36;
        mark();
      }
      wheel.addEventListener(
        "wheel",
        () => {
          userScroll = true;
        },
        { passive: true },
      );
      wheel.addEventListener("pointerdown", () => {
        userScroll = true;
      });
      wheel.addEventListener("scroll", () => {
        mark();
        if (!userScroll) return;
        scrolling = true;
        clearTimeout(timer);
        timer = setTimeout(() => {
          const value = mark(),
            commit = userScroll && wheel.getClientRects().length > 0;
          scrolling = false;
          userScroll = false;
          if (commit && +input.value !== value) {
            input.value = value;
            input.dispatchEvent(new Event("change", { bubbles: true }));
          }
        }, 180);
      });
      wheel.addEventListener("keydown", (e) => {
        const steps = { ArrowUp: -1, ArrowDown: 1, PageUp: -5, PageDown: 5 };
        let value = mark();
        if (e.key in steps) value += steps[e.key];
        else if (e.key === "Home") value = min;
        else if (e.key === "End") value = max;
        else return;
        e.preventDefault();
        userScroll = true;
        wheel.scrollTo({
          top: (Math.max(min, Math.min(max, value)) - min) * 36,
          behavior: "smooth",
        });
      });
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
    ];
    cards.forEach(([, card]) => stack.append(card));
    let saved = {};
    try {
      saved =
        JSON.parse(localStorage.getItem("mahir-focus-v1"))?.widgetPositions ||
        {};
    } catch {}
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
      card.prepend(handle);
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
