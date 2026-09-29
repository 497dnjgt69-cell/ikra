export default function initialize() {
  (() => {
    const $ = (s) => document.querySelector(s),
      settings = $("#panel-settings .settings");
    const timeLabels = ["focusmin", "breakmin", "longmin", "prayermin"].map(
      (id) => $("#" + id).closest("label"),
    );
    const auto = $("#autonext"),
      sound = $("#soundenabled"),
      range = $("#soundvolume"),
      test = $("#soundtest"),
      longLabel = $("#longevery").closest("label"),
      exports = $("#export"),
      imports = $("#import"),
      file = $("#importfile"),
      reset = $("#reset-widgets");
    const section = (title) => {
      let s = document.createElement("section");
      s.className = "settings-section";
      if (title) {
        let h = document.createElement("h3");
        h.className = "settings-heading";
        h.textContent = title;
        s.append(h);
      }
      return s;
    };
    const row = (input, title, description) => {
      let label = document.createElement("label");
      label.className = "setting-row";
      let text = document.createElement("span");
      text.className = "setting-copy";
      text.textContent = title;
      if (description) {
        let small = document.createElement("small");
        small.textContent = description;
        text.append(small);
      }
      input.classList.add("switch");
      input.setAttribute("role", "switch");
      label.append(text, input);
      return label;
    };
    const durations = section("Süreler");
    const grid = document.createElement("div");
    grid.className = "duration-grid";
    timeLabels.forEach((label, i) => {
      [...label.childNodes]
        .filter((n) => n.nodeType === 3)
        .forEach((n) => n.remove());
      label.prepend(
        document.createTextNode(["Odak", "Kısa mola", "Uzun mola", "Namaz"][i]),
      );
      let unit = document.createElement("span");
      unit.className = "unit";
      unit.textContent = "dakika";
      label.append(unit);
      grid.append(label);
    });
    durations.append(grid);
    const flow = section();
    flow.append(
      row(auto, "Otomatik devam", "Süre bitince sonraki sayacı başlat."),
    );
    const soundSection = section();
    soundSection.append(
      row(sound, "Ses efektleri", "Geçişler ve oturum bitişi."),
    );
    let volume = document.createElement("div");
    volume.className = "volume-row";
    const value = document.createElement("output");
    value.className = "volume-value";
    value.setAttribute("for", "soundvolume");
    range.setAttribute("aria-label", "Ses seviyesi");
    volume.append(range, value, test);
    soundSection.append(volume);
    const advanced = document.createElement("details");
    advanced.className = "setting-details";
    let summary = document.createElement("summary");
    summary.textContent = "Uzun mola düzeni";
    let summaryValue = document.createElement("span");
    summaryValue.className = "long-summary";
    summary.append(summaryValue);
    let body = document.createElement("div");
    body.className = "detail-body";
    body.append(longLabel);
    let help = document.createElement("p");
    help.className = "detail-help";
    help.textContent =
      "0 seçersen uzun molayı kendin başlatırsın. Örneğin 4, her dört odak turundan sonra uzun mola verir.";
    body.append(help);
    advanced.append(summary, body);
    const data = document.createElement("details");
    data.className = "setting-details";
    let ds = document.createElement("summary");
    ds.textContent = "Veriler ve düzen";
    let db = document.createElement("div");
    db.className = "detail-body";
    let actions = document.createElement("div");
    actions.className = "data-actions";
    exports.textContent = "Yedeği indir";
    imports.textContent = "Yedekten yükle";
    reset.textContent = "Kartları başlangıç konumuna getir";
    actions.append(exports, imports, reset);
    db.append(actions, file);
    let note = document.createElement("p");
    note.className = "detail-help";
    note.textContent =
      "Çalışmaların bu tarayıcıda saklanır. Başka tarayıcıya geçmeden önce yedek indir.";
    db.append(note);
    data.append(ds, db);
    const saved = document.createElement("p");
    saved.className = "settings-saved";
    saved.textContent = "Değişiklikler otomatik kaydedilir.";
    settings.replaceChildren(
      durations,
      flow,
      soundSection,
      advanced,
      data,
      saved,
    );
    function sync() {
      value.textContent = range.value + "%";
      range.disabled = !sound.checked;
      test.disabled = !sound.checked;
      volume.classList.toggle("disabled-volume", !sound.checked);
      let n = +$("#longevery").value;
      summaryValue.textContent = n ? "Her " + n + " turda" : "Elle";
    }
    sound.addEventListener("change", sync);
    range.addEventListener("input", sync);
    $("#longevery").addEventListener("change", sync);
    document.addEventListener("focus-render", sync);
    advanced.addEventListener("toggle", () => {
      if (advanced.open) document.dispatchEvent(new Event("focus-render"));
    });
    sync();
  })();
}
