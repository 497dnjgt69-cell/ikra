export default function initialize() {
  (() => {
    const $ = (s) => document.querySelector(s),
      card = $(".activity-mini"),
      dock = $(".dock");
    card.classList.add("hidden");
    card.id = "progress-card";
    const progress = document.createElement("button");
    progress.className = "button";
    progress.setAttribute("aria-expanded", "false");
    progress.setAttribute("aria-controls", "progress-card");
    progress.innerHTML =
      '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 19V12m7 7V5m7 14V9"/></svg><span>İlerleme</span>';
    progress.onclick = () => {
      const visible = progress.getAttribute("aria-expanded") !== "true";
      window.animatePanel(card, visible);
      progress.setAttribute("aria-expanded", String(visible));
    };
    dock.insertBefore(progress, $("#peek-toggle"));
    const peek = $("#peek-toggle");
    peek.innerHTML =
      '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M18 3a9 9 0 1 0 3 12A8 8 0 0 1 18 3Z"/></svg><span>Namaz vakitleri</span>';
    const select = $("#theme"),
      themes = document.createElement("div");
    themes.className = "theme-picker";
    themes.setAttribute("role", "group");
    themes.setAttribute("aria-label", "Tema");
    select.after(themes);
    const icons = {
      light:
        '<circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M2 12h2m16 0h2M5 5l1.5 1.5m11 11L19 19M5 19l1.5-1.5m11-11L19 5"/>',
      neumorphism: '<rect x="4" y="4" width="16" height="16" rx="6"/><circle cx="12" cy="12" r="3"/>',
      dark: '<path d="M18 3a9 9 0 1 0 3 12A8 8 0 0 1 18 3Z"/>',
      nature:
        '<path d="M20 4c-7-1-14 2-14 8a6 6 0 0 0 6 6c6 0 8-7 8-14Z M4 21l11-11 M8 17v-5 M11 14h5"/>',
    };
    for (const [value, label] of [
      ["light", "Aydınlık"],
      ["dark", "Karanlık"],
      ["nature", "Doğa"],
      ["neumorphism", "Neumorphism"],
    ]) {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "theme-choice";
      button.dataset.themeChoice = value;
      button.setAttribute("aria-label", label);
      button.title = label;
      button.innerHTML =
        '<svg viewBox="0 0 24 24" aria-hidden="true">' +
        icons[value] +
        "</svg>";
      button.onclick = () => {
        select.value = value;
        select.dispatchEvent(new Event("change", { bubbles: true }));
      };
      themes.append(button);
    }
    const draw = () =>
      themes
        .querySelectorAll("button")
        .forEach((b) =>
          b.setAttribute(
            "aria-pressed",
            String(b.dataset.themeChoice === select.value),
          ),
        );
    document.addEventListener("focus-render", draw);
    draw();
  })();
}
