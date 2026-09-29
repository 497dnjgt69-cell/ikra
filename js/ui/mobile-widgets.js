export default function initialize() {
  (() => {
    const mobile = matchMedia("(max-width:690px)");
    for (const [id, buttonId, title] of [
      ["progress-card", null, "İlerleme"],
      ["prayer-peek", "peek-toggle", "Namaz vakitleri"],
    ]) {
      const card = document.getElementById(id),
        button = buttonId
          ? document.getElementById(buttonId)
          : document.querySelector('.dock [aria-controls="progress-card"]');
      if (!card || !button) continue;
      const placeholder = document.createComment("widget home");
      card.before(placeholder);
      const dialog = document.createElement("dialog");
      dialog.className = "glass-dialog mobile-widget-dialog";
      dialog.id = "mobile-" + id;
      dialog.setAttribute("aria-label", title);
      const shell = document.createElement("div");
      shell.className = "dialog-shell";
      const top = document.createElement("div");
      top.className = "dialog-top";
      const heading = document.createElement("h2");
      heading.textContent = title;
      const close = document.createElement("button");
      close.className = "button";
      close.textContent = "×";
      close.setAttribute("aria-label", "Kapat");
      top.append(heading, close);
      shell.append(top);
      dialog.append(shell);
      document.body.append(dialog);
      const oldClick = button.onclick;
      const finish = () => {
        if (button.getAttribute("aria-expanded") === "true")
          oldClick?.call(button);
        card.classList.add("hidden");
        placeholder.after(card);
        button.setAttribute("aria-expanded", "false");
      };
      close.onclick = () => window.closePanel(dialog);
      dialog.addEventListener("close", finish);
      dialog.addEventListener("cancel", (e) => {
        e.preventDefault();
        window.closePanel(dialog);
      });
      dialog.addEventListener("click", (e) => {
        if (e.target === dialog) window.closePanel(dialog);
      });
      button.onclick = (e) => {
        if (!mobile.matches) return oldClick?.call(button, e);
        if (button.getAttribute("aria-expanded") !== "true")
          oldClick?.call(button, e);
        card.getAnimations().forEach((a) => a.cancel());
        shell.append(card);
        card.classList.remove("hidden");
        button.setAttribute("aria-expanded", "true");
        dialog.showModal();
      };
      mobile.addEventListener("change", () => {
        if (dialog.open) dialog.close();
      });
    }
  })();
}
