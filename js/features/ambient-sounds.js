import { createAmbientAudio, SOUND_IDS } from "../services/ambient-audio.js";
import { bilingual, localizedText, localizedAttribute } from "../i18n/bindings.js";
const KEY = "ikra-ambient-levels-v1";
const names = { rain: ["Yağmur", "Rain"], wind: ["Rüzgâr", "Wind"], waves: ["Dalgalar", "Waves"], brown: ["Kahverengi gürültü", "Brown noise"] };
const paths = {
  rain: "M7 14a4 4 0 1 1 1-8 5 5 0 0 1 9 2 3 3 0 0 1 0 6M8 17l-1 3m6-3-1 3m6-3-1 3",
  wind: "M3 8h12a3 3 0 1 0-3-3M3 12h16a3 3 0 1 1-3 3M3 16h5a3 3 0 1 1-3 3",
  waves: "M2 7q3-4 7 0t7 0t6 0M2 12q3-4 7 0t7 0t6 0M2 17q3-4 7 0t7 0t6 0",
  brown: "M4 10v4m4-7v10m4-13v16m4-13v10m4-7v4",
};
const icon = (id) => `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="${paths[id]}"/></svg>`;
export default function initAmbientSounds() {
  const panel = document.querySelector("#panel-sounds .ambient-content");
  const dock = document.querySelector('[aria-controls="panel-sounds"]');
  const levels = Object.fromEntries(SOUND_IDS.map(id => [id, 0.35]));
  let masterLevel = 0.65;
  try {
    const saved = JSON.parse(localStorage.getItem(KEY));
    for (const id of SOUND_IDS) if (Number.isFinite(saved?.[id])) levels[id] = Math.max(0, Math.min(1, saved[id]));
    if (Number.isFinite(saved?.master)) masterLevel = Math.max(0, Math.min(1, saved.master));
  } catch {}
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify({ ...levels, master: masterLevel })); } catch {} };
  function text(tag, tr, en, className) {
    const el = document.createElement(tag);
    if (className) el.className = className;
    localizedText(el, () => bilingual(tr, en));
    return el;
  }
  const intro = text("p", "Kendi sakin ortamını oluştur. Sesleri birlikte açabilirsin.", "Create your quiet space. Mix sounds together.", "ambient-intro");
  const status = text("p", "Sesler kapalı", "Sounds off", "ambient-status");
  status.setAttribute("role", "status");
  const error = document.createElement("p");
  error.className = "ambient-error";
  error.hidden = true;
  error.setAttribute("role", "alert");
  const grid = document.createElement("div"); grid.className = "ambient-grid";
  const controls = new Map();
  const engine = createAmbientAudio({ onChange: render });
  function render() {
    let active = 0, selected = 0;
    for (const [id, { button, state }] of controls) {
      const playing = engine.isActive(id), enabled = engine.isSelected(id);
      active += Number(playing); selected += Number(enabled);
      button.setAttribute("aria-pressed", String(enabled));
      button.closest(".ambient-card").classList.toggle("is-playing", playing);
      localizedText(state, () => playing ? bilingual("Çalıyor", "Playing") : enabled ? bilingual("Bekliyor", "Waiting") : bilingual("Kapalı", "Off"));
    }
    dock.classList.toggle("sounds-playing", active > 0);
    localizedText(status, () => active ? bilingual(`${active} ses çalıyor`, `${active} sounds playing`) : bilingual("Sesler kapalı", "Sounds off"));
    stop.disabled = selected === 0;
  }
  function slider(id, value, label, change) {
    const row = document.createElement("label"); row.className = "ambient-volume";
    const input = document.createElement("input");
    input.type = "range"; input.min = "0"; input.max = "100"; input.step = "1"; input.value = String(Math.round(value * 100)); input.id = id;
    localizedAttribute(input, "aria-label", label);
    const output = document.createElement("output"); output.htmlFor = id; output.textContent = input.value + "%";
    input.oninput = () => { output.textContent = input.value + "%"; change(Number(input.value) / 100); };
    input.onchange = save;
    row.append(input, output); return row;
  }
  for (const id of SOUND_IDS) {
    const card = document.createElement("div"); card.className = "ambient-card";
    const button = document.createElement("button"); button.type = "button"; button.className = "ambient-toggle"; button.dataset.sound = id;
    button.innerHTML = icon(id);
    const name = text("span", ...names[id], "ambient-name");
    const state = text("span", "Kapalı", "Off", "ambient-state");
    button.append(name, state);
    localizedAttribute(button, "aria-label", () => bilingual(...names[id]));
    button.onclick = async () => {
      error.hidden = true;
      if (engine.isSelected(id)) engine.stop(id);
      else {
        const pending = engine.start(id, levels[id]);
        engine.setMaster(masterLevel);
        render();
        try { await pending; } catch { error.hidden = false; localizedText(error, () => bilingual("Ses başlatılamadı. Yeniden dene.", "Could not start audio. Try again.")); }
      }
      render();
    };
    controls.set(id, { button, state });
    card.append(button, slider("ambient-" + id, levels[id], () => bilingual(...names[id]) + bilingual(" ses seviyesi", " volume"), value => { levels[id] = value; engine.setVolume(id, value); }));
    grid.append(card);
  }
  const footer = document.createElement("div"); footer.className = "ambient-footer";
  const stop = text("button", "Tümünü durdur", "Stop all", "button"); stop.type = "button";
  stop.onclick = () => engine.stopAll();
  const master = text("span", "Genel ses", "Master volume");
  footer.append(master, slider("ambient-master", masterLevel, () => bilingual("Genel ses seviyesi", "Master volume"), value => { masterLevel = value; engine.setMaster(value); }), stop);
  panel.append(intro, grid, footer, status, error, text("p", "Paneli kapattığında sesler çalmaya devam eder.", "Sounds keep playing when you close this panel.", "ambient-hint"));
  render();
  const stopOnLeave = () => engine.stopAll();
  window.addEventListener("pagehide", stopOnLeave);
  return { dispose() { window.removeEventListener("pagehide", stopOnLeave); engine.dispose(); } };
}
