export default function initialize() {
  (() => {
    const $ = (s) => document.querySelector(s),
      prayerCard = $("#panel-prayer .card"),
      settings = $("#panel-settings .settings");
    const details = document.createElement("details");
    details.className = "setting-details";
    details.id = "prayer-settings";
    const summary = document.createElement("summary");
    summary.textContent = "Namaz vakitleri ve konum";
    const body = document.createElement("div");
    body.className = "detail-body prayer-settings-body";
    details.append(summary, body);
    const timerRow = $("#prayerstart").closest(".row");
    for (const child of [...prayerCard.children])
      if (child !== timerRow) body.append(child);
    const initialHeading = body.querySelector("h2");
    if (initialHeading) initialHeading.textContent = "Konum ve hesaplama";
    settings.insertBefore(details, settings.querySelector(".settings-saved"));
    const note = document.createElement("p");
    note.className = "prayer-timer-note";
    note.textContent =
      "Namazını seç ve sayacı başlat. Çalışma sayacı duraklatılır.";
    prayerCard.prepend(note);
    $("#panel-prayer .dialog-top h2").textContent = "Namaz sayacı";
    window.openPrayerSettings = () => {
      details.open = true;
      $("#panel-settings").showModal();
      requestAnimationFrame(() =>
        details.scrollIntoView({ block: "nearest", behavior: "smooth" }),
      );
    };
    // Animate details before removing their open content.
    for (const element of document.querySelectorAll("details")) {
      const summary = element.querySelector(":scope > summary");
      let running = null;
      summary.addEventListener("click", (e) => {
        e.preventDefault();
        if (running) return;
        const start = element.getBoundingClientRect().height;
        const opening = !element.open;
        if (opening) element.open = true;
        const end = opening
          ? element.getBoundingClientRect().height
          : summary.getBoundingClientRect().height +
            parseFloat(getComputedStyle(element).paddingTop) +
            parseFloat(getComputedStyle(element).paddingBottom) +
            1;
        element.style.overflow = "hidden";
        running = element.animate(
          [
            { height: start + "px", opacity: 1 },
            { height: end + "px", opacity: 1 },
          ],
          {
            duration: matchMedia("(prefers-reduced-motion: reduce)").matches
              ? 0
              : 210,
            easing: "cubic-bezier(.22,1,.36,1)",
          },
        );
        running.finished
          .then(() => {
            if (!opening) element.open = false;
            element.style.removeProperty("overflow");
            running = null;
          })
          .catch(() => {
            running = null;
          });
      });
    }
  })();
}
