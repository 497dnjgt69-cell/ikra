import { localizedText } from "../i18n/bindings.js";
export default function initialize() {
  (() => {
    window.ikraNotify = (
      message,
      {
        completion = false,
        title = completion ? "Oturum tamamlandı" : "Bildirim",
        duration = 5000,
      } = {},
    ) => {
      const region = document.getElementById("completion-notices");
      if (!region.showPopover) {
        const dialog = [...document.querySelectorAll("dialog[open]")].at(-1);
        (dialog || document.body).append(region);
        region.removeAttribute("popover");
      }
      const card = document.createElement("article");
      card.className = "notice-card";
      const icon = document.createElement("span");
      icon.className = "notice-icon";
      icon.textContent = completion ? "✓" : "i";
      icon.setAttribute("aria-hidden", "true");
      const content = document.createElement("div");
      content.className = "notice-content";
      const heading = document.createElement("strong");
      heading.textContent = title;
      const text = document.createElement("p");
      if (typeof message === "function") localizedText(text, message);
      else text.textContent = String(message);
      const foot = document.createElement("div");
      foot.className = "notice-foot";
      const track = document.createElement("span");
      track.className = "notice-track";
      const bar = document.createElement("span");
      bar.style.animationDuration = duration + "ms";
      track.append(bar);
      foot.append(track);
      content.append(heading, text, foot);
      const close = document.createElement("button");
      close.className = "notice-close";
      close.type = "button";
      close.textContent = "×";
      close.setAttribute("aria-label", "Bildirimi kapat");
      card.append(icon, content, close);
      region.append(card);
      if (region.showPopover) {
        try {
          if (!region.matches(":popover-open")) region.showPopover();
        } catch {
          region.removeAttribute("popover");
        }
      }
      let removed = false;
      const dismiss = () => {
        if (removed) return;
        removed = true;
        clearTimeout(timeout);
        card.remove();
        if (!region.children.length && region.hidePopover) {
          try {
            region.hidePopover();
          } catch {}
        }
      };
      const timeout = setTimeout(dismiss, duration);
      close.onclick = dismiss;
      card.dismissNotice = dismiss;
      while (region.children.length > 3)
        region.firstElementChild.dismissNotice?.();
      return card;
    };
  })();
}
