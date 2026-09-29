export default function initialize() {
  (() => {
    const $ = (s) => document.querySelector(s);
    const manual = $(".manual-session");
    $("#stats-panel").before(manual);
    const select = $("#prayerselect"),
      group = document.createElement("div");
    group.className = "prayer-selection";
    group.setAttribute("role", "group");
    group.setAttribute("aria-label", "Namaz seçimi");
    select.after(group);
    select.classList.add("visually-hidden-select");
    for (const option of select.options) {
      const b = document.createElement("button");
      b.type = "button";
      b.textContent = option.text;
      b.dataset.value = option.value;
      b.onclick = () => {
        select.value = b.dataset.value;
        select.dispatchEvent(new Event("change", { bubbles: true }));
      };
      group.append(b);
    }
    function sync() {
      const active = document.body.classList.contains("prayer-active");
      group.hidden = !active;
      $("#focus-toggle").classList.toggle("hidden", active);
      for (const b of group.children) {
        b.classList.toggle("active", b.dataset.value === select.value);
        b.setAttribute(
          "aria-pressed",
          String(b.dataset.value === select.value),
        );
      }
    }
    document.addEventListener("focus-render", sync);
    document.addEventListener("backup-restored", () => {
      document.querySelectorAll(".floating-widget").forEach((card) => {
        card.classList.remove("floating-widget");
        card.style.removeProperty("left");
        card.style.removeProperty("top");
        card.style.removeProperty("width");
        card.style.removeProperty("z-index");
      });
      sync();
    });
    sync();
  })();
}
