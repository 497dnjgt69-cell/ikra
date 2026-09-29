export default function initialize() {
  (() => {
    const $ = (s) => document.querySelector(s),
      controls = $(".prayer-main-controls");
    const begin = document.createElement("button");
    begin.id = "prayer-go";
    begin.className = "button primary";
    begin.title = "Namaz sayacını başlat";
    begin.setAttribute("aria-label", begin.title);
    begin.innerHTML =
      '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m8 5 11 7-11 7Z"/></svg>';
    begin.onclick = () => document.dispatchEvent(new Event("prayer-begin"));
    controls.insertBefore(begin, $("#prayerfinish"));
    const back = document.createElement("button");
    back.className = "button";
    back.title = "Çalışma ekranına dön";
    back.setAttribute("aria-label", back.title);
    back.innerHTML =
      '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m14 6-6 6 6 6"/></svg>';
    back.onclick = () => document.dispatchEvent(new Event("prayer-leave"));
    controls.append(back);
    const finish = $("#prayerfinish");
    finish.title = "Namazı bitir ve kaydet";
    finish.setAttribute("aria-label", finish.title);
    finish.innerHTML =
      '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m5 12 4 4 10-10"/></svg>';
    const times = document.createElement("section");
    times.className = "prayer-main-times";
    times.setAttribute("aria-label", "Namaz vakitleri");
    $(".hero").append(times);
    function sync() {
      begin.classList.toggle("hidden", !finish.classList.contains("hidden"));
      back.classList.toggle("hidden", !finish.classList.contains("hidden"));
      const list = document.createElement("div");
      for (const item of document.querySelectorAll("#prayergrid .prayer")) {
        const cell = document.createElement("div"),
          name = document.createElement("b"),
          value = document.createElement("time");
        name.textContent = item.querySelector("b").textContent;
        value.textContent = item.querySelector("span").textContent;
        cell.append(name, value);
        list.append(cell);
      }
      const note = document.createElement("p");
      note.textContent =
        $("#prayerstatus").textContent || $("#prayerplace").textContent;
      times.replaceChildren(list, note);
    }
    document.addEventListener("focus-render", sync);
    new MutationObserver(sync).observe($("#prayergrid"), { childList: true });
    sync();
  })();
}
