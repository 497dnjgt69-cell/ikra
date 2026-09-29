export default function initialize() {
  (() => {
    for (const button of document.querySelectorAll(".dock .button")) {
      const label = button.querySelector("span");
      if (!label) continue;
      const update = () => {
        const text = label.textContent.trim();
        button.setAttribute("aria-label", text);
        button.dataset.tooltip = text;
      };
      update();
      new MutationObserver(update).observe(label, {
        subtree: true,
        childList: true,
        characterData: true,
      });
    }
  })();
}
