export default function initialize() {
  (() => {
    const $ = (s) => document.querySelector(s);
    const reflection = $(".prayer-rotating");
    if (reflection) $("#prayer-peek").append(reflection);
    const select = $("#prayerselect");
    select.classList.add("prayer-name-picker");
    select.setAttribute("aria-label", "Namaz seçimi");
    $("#timerinfo").after(select);
    function sync() {
      select.classList.toggle(
        "hidden",
        !document.body.classList.contains("prayer-active"),
      );
      $("#skip").title = document.body.classList.contains("prayer-active")
        ? "Bitir ve kaydet"
        : "Geç";
      $("#skip").setAttribute("aria-label", $("#skip").title);
    }
    document.addEventListener("focus-render", sync);
    sync();
  })();
}
