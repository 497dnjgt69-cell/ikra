export default function initialize() {
  (() => {
    const $ = (s) => document.querySelector(s);
    const modes = $("#modes"),
      hero = $(".hero");
    const start = $("#prayerstart"),
      finish = $("#prayerfinish"),
      select = $("#prayerselect"),
      elapsed = $("#prayerelapsed");
    modes.append(start);
    const controls = document.createElement("div");
    controls.className = "prayer-main-controls";
    finish.textContent = "Bitir ve kaydet";
    controls.append(select, finish, elapsed);
    $(".controls").after(controls);
    const reflection = document.createElement("div");
    reflection.className = "prayer-reflection";
    reflection.innerHTML =
      '<blockquote>“Biliniz ki, kalpler ancak Allah’ı anmakla huzur bulur.”</blockquote><a href="https://kuran.diyanet.gov.tr/tefsir/Ra%27d-suresi/1734/27-28-ayet-tefsiri" target="_blank" rel="noopener noreferrer">Ra’d 13:28 · Diyanet meali</a><div class="reflection-divider"></div><blockquote>“Namaz bir nurdur.”</blockquote><a href="https://sunnah.com/muslim:223" target="_blank" rel="noopener noreferrer">Sahih Muslim 223 · Türkçe anlamı</a>';
    controls.after(reflection);
    const oldButton = document.querySelector(
      '.dock [aria-controls="panel-prayer"]',
    );
    if (oldButton) oldButton.remove();
    // The old empty counter dialog remains detached from navigation; all settings were moved earlier.
  })();
}
