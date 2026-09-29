// Preserve the source of mixed UI/user text so changing language is reversible.
// User-supplied values are interpolated verbatim, never sent through a dictionary.
const bindings = new WeakMap();
export const t = (text) => window.ikraT(text);
export const bilingual = (tr, en) => window.ikraLanguage() === "en" ? en : tr;
export function localizedText(element, render) {
  const entry = bindings.get(element) || {};
  entry.text = render;
  bindings.set(element, entry);
  element.dataset.i18nManaged = "";
  updateLocalized(element);
}
export function localizedAttribute(element, name, render) {
  const entry = bindings.get(element) || {};
  (entry.attributes ||= {})[name] = render;
  bindings.set(element, entry);
  updateLocalized(element);
}
export function updateLocalized(element) {
  const entry = bindings.get(element);
  if (!entry) return;
  if (entry.text) {
    const value = String(entry.text());
    if (element.textContent !== value) element.textContent = value;
  }
  for (const [name, render] of Object.entries(entry.attributes || {})) {
    const value = String(render());
    if (element.getAttribute(name) !== value) element.setAttribute(name, value);
  }
}
export const managesAttribute = (element, name) => !!bindings.get(element)?.attributes?.[name];
