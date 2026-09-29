export default function initialize() {
  (() => {
    const $ = (s) => document.querySelector(s);
    const main = $("main"),
      hero = $(".hero"),
      layout = $(".layout"),
      cards = [...layout.children];
    const stage = document.createElement("div");
    stage.className = "focusstage";
    main.prepend(stage);
    stage.append(hero, cards[0]);
    cards[0].classList.add("activity-mini");
    const dock = document.createElement("nav");
    dock.className = "dock";
    dock.setAttribute("aria-label", "Çalışma araçları");
    stage.after(dock);
    const icons = {
      tasks: '<path d="M5 5h14v15H5zM8 2v6m8-6v6M8 12h8m-8 4h5"/>',
      prayer: '<path d="M18 3a9 9 0 1 0 3 12A8 8 0 0 1 18 3Z"/>',
      history: '<path d="M3 11a9 9 0 1 1 2 7M3 5v6h6m3-5v6l4 2"/>',
      settings: '<path d="M4 7h16M4 17h16M8 4v6m8 4v6"/>',
    };
    const panels = [
      ["tasks", "Planım", cards[1]],
      ["prayer", "Namaz", cards[2]],
      ["history", "İstatistikler", cards[3]],
      ["settings", "Ayarlar", cards[4]],
    ];
    for (const [id, label, card] of panels) {
      const dialog = document.createElement("dialog");
      dialog.id = "panel-" + id;
      dialog.className = "glass-dialog";
      dialog.setAttribute("aria-label", label);
      const shell = document.createElement("div");
      shell.className = "dialog-shell";
      const top = document.createElement("div");
      top.className = "dialog-top";
      const h = document.createElement("h2");
      h.textContent = label;
      const close = document.createElement("button");
      close.className = "button";
      close.textContent = "×";
      close.setAttribute("aria-label", "Kapat");
      close.onclick = () => window.closePanel(dialog);
      top.append(h, close);
      shell.append(top, card);
      dialog.append(shell);
      document.body.append(dialog);
      if (id === "settings") {
        const p = document.createElement("p");
        p.className = "dialog-note";
        p.textContent =
          "Kayıtların bu tarayıcıda saklanır. Başka bir dosyaya veya tarayıcıya geçmeden önce yedek indir. Otomatik namaz vakitleri için internet bağlantısı gerekir.";
        shell.append(p);
      }
      dialog.addEventListener("cancel", (e) => {
        e.preventDefault();
        window.closePanel(dialog);
      });
      dialog.addEventListener("click", (e) => {
        if (e.target === dialog) window.closePanel(dialog);
      });
      const button = document.createElement("button");
      button.className = "button";
      button.setAttribute("aria-haspopup", "dialog");
      button.setAttribute("aria-controls", dialog.id);
      button.innerHTML =
        '<svg viewBox="0 0 24 24" aria-hidden="true">' +
        icons[id] +
        "</svg><span></span>";
      button.querySelector("span").textContent = label;
      button.onclick = () => dialog.showModal();
      dock.append(button);
      if (id === "prayer") {
        const elapsed = $("#prayerelapsed");
        new MutationObserver(() => {
          const running = !$("#prayerfinish").classList.contains("hidden");
          button.querySelector("span").textContent = running
            ? "Namaz · " + elapsed.textContent
            : label;
        }).observe(elapsed, {
          childList: true,
          subtree: true,
          characterData: true,
        });
      }
    }
    dock.append(document.querySelector("#peek-toggle"));
    layout.remove();
  })();
}
