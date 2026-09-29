import { PLACES } from '../config/places.js';
import { bilingual, localizedText, localizedAttribute } from '../i18n/bindings.js';
const KEY = 'ikra-selected-place-v1';
export default function initAmbientSounds() {
  const panel = document.querySelector('#panel-sounds .ambient-content');
  let selected = PLACES[0];
  try { selected = PLACES.find(place => place.id === localStorage.getItem(KEY)) || selected; } catch {}
  const text = (tag, copy, className) => {
    const node = document.createElement(tag);
    node.className = className;
    localizedText(node, () => bilingual(...copy));
    return node;
  };
  panel.append(text('p', ['Bugün nerede çalışmak istersin?', 'Where would you like to study today?'], 'places-intro'));
  const layout = document.createElement('div'); layout.className = 'places-layout';
  const list = document.createElement('div'); list.className = 'places-list'; list.setAttribute('role', 'group');
  localizedAttribute(list, 'aria-label', () => bilingual('Mekân seç', 'Choose a place'));
  const preview = document.createElement('section'); preview.className = 'place-preview';
  const art = document.createElement('div'); art.className = 'place-art'; art.setAttribute('aria-hidden', 'true');
  const details = document.createElement('div'); details.className = 'place-details';
  const location = document.createElement('p'); location.className = 'place-location';
  const name = document.createElement('h3'); name.id = 'selected-place-name';
  preview.setAttribute('aria-labelledby', name.id);
  const mood = document.createElement('p'); mood.className = 'place-mood';
  const tags = document.createElement('div'); tags.className = 'place-tags';
  const tagNodes = [document.createElement('span'), document.createElement('span')]; tags.append(...tagNodes);
  const waiting = text('div', ['Ses yakında', 'Audio coming soon'], 'place-waiting');
  const note = text('p', ['Mekânını seçebilirsin. Sesler henüz eklenmedi.', 'Choose your place. Audio has not been added yet.'], 'places-note');
  const announcement = document.createElement('p'); announcement.className = 'places-sr-only'; announcement.setAttribute('role', 'status');
  const buttons = new Map();
  function render(announce = false) {
    for (const [id, button] of buttons) button.setAttribute('aria-pressed', String(id === selected.id));
    preview.dataset.place = selected.id;
    art.innerHTML = `<svg viewBox="0 0 240 180" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="${selected.art}"/></svg>`;
    localizedText(location, () => bilingual(...selected.location));
    localizedText(name, () => bilingual(...selected.name));
    localizedText(mood, () => bilingual(...selected.mood));
    tagNodes.forEach((node, i) => localizedText(node, () => bilingual(...selected.tags[i])));
    if (announce) localizedText(announcement, () => `${bilingual(...selected.name)}. ${bilingual('Seçildi. Ses yakında.', 'Selected. Audio coming soon.')}`);
  }
  for (const place of PLACES) {
    const button = document.createElement('button'); button.type = 'button'; button.className = 'place-choice'; button.dataset.place = place.id;
    const symbol = document.createElement('span'); symbol.className = 'place-symbol'; symbol.setAttribute('aria-hidden', 'true');
    symbol.innerHTML = `<svg viewBox="0 0 24 24"><path d="${place.icon}"/></svg>`;
    const copy = document.createElement('span'); copy.className = 'place-choice-copy';
    copy.append(text('span', place.name, 'place-choice-name'), text('span', place.location, 'place-choice-location'));
    const check = document.createElement('span'); check.className = 'place-check'; check.textContent = '✓'; check.setAttribute('aria-hidden', 'true');
    button.append(symbol, copy, check);
    button.onclick = () => { selected = place; try { localStorage.setItem(KEY, place.id); } catch {} render(true); };
    list.append(button); buttons.set(place.id, button);
  }
  details.append(location, name, mood, tags, waiting);
  preview.append(art, details); layout.append(list, preview); panel.append(layout, note, announcement);
  render();
  return { dispose() {} };
}
