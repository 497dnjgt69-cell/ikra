export default function initialize() {
  (() => {
    const panel = document.querySelector("#about-ikra");
    document.querySelector("#about-open").onclick = () => panel.showModal();
    document.querySelector("#about-close").onclick = () =>
      window.closePanel(panel);
    panel.addEventListener("cancel", (e) => {
      e.preventDefault();
      window.closePanel(panel);
    });
    panel.addEventListener("click", (e) => {
      if (e.target === panel) window.closePanel(panel);
    });
  })();
}
