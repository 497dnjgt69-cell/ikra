import { $ } from "../shared/dom.js";
import { fmt } from "../shared/format.js";

export function createClockView({ store }) {
  let clockPrev = "";
  function renderClock() {
    let value = store.state.prayerView
      ? fmt(
          store.state.prayerTimer
            ? store.state.prayerTimer.remaining
            : store.state.prayerDuration * 60,
        )
      : store.state.mode === "clock"
        ? new Date().toLocaleTimeString("en-GB", {
            hour: "2-digit",
            minute: "2-digit",
          })
        : fmt(store.state.timer.remaining);
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
    const prayerValue = store.state.prayerTimer
      ? fmt(store.state.prayerTimer.remaining)
      : fmt(store.state.prayerDuration * 60);
    if ($("#prayerelapsed").textContent !== prayerValue)
      $("#prayerelapsed").textContent = prayerValue;
  }
  return { render: renderClock };
}
