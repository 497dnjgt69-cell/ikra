export default function initialize() {
  (() => {
    // Edit this release record and its dictionary entries for future announcements.
    const release = {
  version:"1.9.0",title:"Namaza sakin bir başlangıç.",intro:"Seç, niyet et, odağını bul.",
  features:[
    {icon:"leaf",title:"Yeni namaz odağı",text:"Nefes animasyonu, durdur/devam et ve ayet-hadis seçkisi."},
    {icon:"sparkle",title:"Daha temiz açılış",text:"IKRA logolu, temana uygun yükleme ekranı."}
  ]
};
    const seenKey = "ikra-release-seen:" + release.version;
    const paths = {
      leaf: "M20 4C12 3 5 6 5 12a6 6 0 0 0 6 6c6 0 9-7 9-14ZM4 21l11-11m-7 7v-5m3 2h5",
      phone:
        "M8 3h8a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2Zm2 3h4m-3 12h2",
      sparkle:
        "m12 3 2.5 6.5L21 12l-6.5 2.5L12 21l-2.5-6.5L3 12l6.5-2.5L12 3Zm7-1v4m-2-2h4",
      arrow: "M5 12h14m-5-5 5 5-5 5",
    };
    function icon(name) {
      const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
      svg.setAttribute("viewBox", "0 0 24 24");
      svg.setAttribute("aria-hidden", "true");
      const path = document.createElementNS(svg.namespaceURI, "path");
      path.setAttribute("d", paths[name]);
      svg.append(path);
      return svg;
    }
    function element(tag, className, text) {
      const node = document.createElement(tag);
      if (className) node.className = className;
      if (text) node.textContent = window.ikraT(text);
      return node;
    }
    let attempted = false;
    function wasSeen() {
      try {
        if (localStorage.getItem(seenKey) === "1") return true;
      } catch {}
      try {
        return sessionStorage.getItem(seenKey) === "1";
      } catch {
        return false;
      }
    }
    function showRelease() {
      // Wait for visibility and don't interrupt a panel the user has just opened.
      if (document.hidden || document.querySelector("dialog[open]")) {
        attempted = false;
        return;
      }
      if (wasSeen()) return;
      const previousFocus = document.activeElement;
      const dialog = element("dialog");
      dialog.id = "release-dialog";
      dialog.dataset.version = release.version;
      dialog.setAttribute("aria-labelledby", "release-title");
      dialog.setAttribute("aria-describedby", "release-intro");
      const shell = element("div", "release-shell");
      const close = element("button", "release-close", "×");
      close.type = "button";
      close.setAttribute("aria-label", window.ikraT("Kapat"));
      const mark = element("div", "release-mark");
      const logo = document.createElement("img");
      logo.src = "./icon-192.png";
      logo.alt = "";
      logo.width = logo.height = 56;
      mark.append(logo);
      const meta = element("div", "release-meta");
      meta.append(
        element("span", "", "IKRA · YENİLİKLER"),
        element("span", "release-version", "v" + release.version),
      );
      const title = element("h2", "", release.title);
      title.id = "release-title";
      const intro = element("p", "release-intro", release.intro);
      intro.id = "release-intro";
      const features = element("ul", "release-features");
      for (const feature of release.features) {
        const row = element("li", "release-feature");
        const badge = element("span", "release-feature-icon");
        badge.append(icon(feature.icon));
        const copy = element("div");
        copy.append(
          element("strong", "", feature.title),
          element("p", "", feature.text),
        );
        row.append(badge, copy);
        features.append(row);
      }
      const next = element("button", "release-continue");
      next.type = "button";
      next.autofocus = true;
      next.append(element("span", "", "Harika, başlayalım"), icon("arrow"));
      const footnote = element(
        "p",
        "release-footnote",
        "Her güncellemede, yalnızca bir kez.",
      );
      const dismiss = () => dialog.close();
      close.onclick = next.onclick = dismiss;
      dialog.addEventListener("keydown", (event) => {
        if (event.key !== "Tab") return;
        if (event.shiftKey && document.activeElement === close) {
          event.preventDefault();
          next.focus();
        } else if (!event.shiftKey && document.activeElement === next) {
          event.preventDefault();
          close.focus();
        }
      });
      dialog.addEventListener("click", (event) => {
        if (event.target !== dialog) return;
        const rect = dialog.getBoundingClientRect();
        if (
          event.clientX < rect.left ||
          event.clientX > rect.right ||
          event.clientY < rect.top ||
          event.clientY > rect.bottom
        )
          dismiss();
      });
      dialog.addEventListener("close", () => {
        document.body.classList.remove("release-open");
        dialog.remove();
        if (previousFocus?.isConnected && previousFocus !== document.body)
          previousFocus.focus({ preventScroll: true });
      });
      shell.append(close, mark, meta, title, intro, features, next, footnote);
      dialog.append(shell);
      document.body.append(dialog);
      dialog.showModal();
      document.body.classList.add("release-open");
      // The announcement never changes study data or timer state.
      try {
        localStorage.setItem(seenKey, "1");
      } catch {}
      try {
        sessionStorage.setItem(seenKey, "1");
      } catch {}
    }
    function scheduleRelease() {
      if (attempted || document.hidden || wasSeen()) return;
      attempted = true;
      setTimeout(() => {
        if (navigator.locks?.request)
          navigator.locks.request(seenKey, showRelease).catch(() => {
            attempted = false;
          });
        else showRelease();
      }, 700);
    }
    document.addEventListener("visibilitychange", scheduleRelease);
    document.addEventListener("close", scheduleRelease, true);
    scheduleRelease();
  })();
}
