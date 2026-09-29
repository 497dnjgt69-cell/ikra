export default function initialize() {
  (() => {
    const app = document.querySelector(".app"),
      clock = document.querySelector("#bigclock");
    const button = document.createElement("button");
    button.id = "focus-toggle";
    button.className = "button symbol-button";
    button.setAttribute("aria-label", "Fokus görünümüne geç");
    button.title = "Fokus";
    button.setAttribute("aria-haspopup", "dialog");
    button.setAttribute("aria-controls", "focus-room");
    button.innerHTML =
      '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 3H3v5m13-5h5v5M3 16v5h5m13-5v5h-5"/><circle cx="12" cy="12" r="3"/></svg>';
    document.querySelector(".header > .row").prepend(button);
    const room = document.createElement("dialog");
    room.id = "focus-room";
    room.setAttribute("aria-label", "Fokus görünümü");
    const hint = document.createElement("div");
    hint.className = "focus-hint";
    hint.textContent = "Esc veya saate dokunarak geri dön";
    room.append(hint);
    document.body.append(room);
    const original = {
      role: clock.getAttribute("role"),
      tabindex: clock.getAttribute("tabindex"),
      label: clock.getAttribute("aria-label"),
    };
    let placeholder = null,
      busy = false,
      hintTimer,
      homeSize;
    const reduced = () =>
      matchMedia("(prefers-reduced-motion: reduce)").matches;
    function revealHint() {
      room.classList.add("show-hint");
      clearTimeout(hintTimer);
      hintTimer = setTimeout(() => room.classList.remove("show-hint"), 2000);
    }
    function mapping(from, to) {
      return `translate(${from.left + from.width / 2 - to.left - to.width / 2}px,${from.top + from.height / 2 - to.top - to.height / 2}px) scale(${from.width / to.width},${from.height / to.height})`;
    }
    async function exit() {
      if (!room.open || busy) return;
      busy = true;
      clearTimeout(hintTimer);
      room.classList.remove("show-hint");
      const current = clock.getBoundingClientRect(),
        slot = placeholder.getBoundingClientRect(),
        target = {
          left: slot.left + (slot.width - homeSize.width) / 2,
          top: slot.top,
          width: homeSize.width,
          height: homeSize.height,
        };
      app.classList.remove("focus-away");
      const animation = clock.animate(
        [{ transform: "none" }, { transform: mapping(target, current) }],
        {
          duration: reduced() ? 0 : 340,
          easing: "cubic-bezier(.22,1,.36,1)",
          fill: "forwards",
        },
      );
      await animation.finished.catch(() => {});
      placeholder.replaceWith(clock);
      placeholder = null;
      room.close();
      animation.cancel();
      for (const [key, value] of Object.entries(original)) {
        let attr = key === "label" ? "aria-label" : key;
        value === null
          ? clock.removeAttribute(attr)
          : clock.setAttribute(attr, value);
      }
      busy = false;
      button.focus({ preventScroll: true });
    }
    button.onclick = async () => {
      if (room.open || busy) return;
      busy = true;
      const slot = clock.getBoundingClientRect(),
        first = clock.firstElementChild.getBoundingClientRect(),
        last = clock.lastElementChild.getBoundingClientRect(),
        old = {
          left: first.left,
          top: slot.top,
          width: last.right - first.left,
          height: slot.height,
        },
        computed = getComputedStyle(clock);
      homeSize = { width: old.width, height: old.height };
      placeholder = document.createElement("div");
      placeholder.style.cssText = `height:${slot.height}px;width:${slot.width}px;max-width:100%;margin:${computed.marginTop} auto ${computed.marginBottom};`;
      placeholder.setAttribute("aria-hidden", "true");
      clock.before(placeholder);
      room.prepend(clock);
      clock.setAttribute("role", "button");
      clock.setAttribute("tabindex", "0");
      clock.setAttribute("aria-label", "Fokus modundan çık");
      room.showModal();
      room.focus({ preventScroll: true });
      const target = clock.getBoundingClientRect();
      app.classList.add("focus-away");
      const animation = clock.animate(
        [{ transform: mapping(old, target) }, { transform: "none" }],
        { duration: reduced() ? 0 : 440, easing: "cubic-bezier(.22,1,.36,1)" },
      );
      await animation.finished.catch(() => {});
      busy = false;
      revealHint();
    };
    room.addEventListener("cancel", (e) => {
      e.preventDefault();
      exit();
    });
    clock.addEventListener("click", () => {
      if (room.open) exit();
    });
    clock.addEventListener("keydown", (e) => {
      if (room.open && (e.key === "Enter" || e.key === " ")) {
        e.preventDefault();
        exit();
      }
    });
    room.addEventListener("pointermove", revealHint);
  })();
}
