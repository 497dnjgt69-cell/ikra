import { updateLocalized, managesAttribute } from "./bindings.js";

export default function initialize() {
  (() => {
    const buttonGroup = document.createElement("div");
    buttonGroup.className = "language-toggle";
    buttonGroup.setAttribute("role", "group");
    buttonGroup.setAttribute("aria-label", "Language / Dil");
    for (const lang of ["en", "tr"]) {
      const button = document.createElement("button");
      button.type = "button";
      button.textContent = lang.toUpperCase();
      button.lang = lang;
      button.setAttribute("aria-label", lang === "en" ? "English" : "Türkçe");
      button.onclick = () => window.ikraSetLanguage(lang);
      button.dataset.language = lang;
      buttonGroup.append(button);
    }
    document.querySelector(".header>.row").prepend(buttonGroup);
    // Option values are app data. Localize only their visible captions.
    document.querySelectorAll("option").forEach((option) => {
      if (!option.hasAttribute("value"))
        option.setAttribute("value", option.value);
    });
    const textCache = new WeakMap(),
      attributeCache = new WeakMap();
    function text(node) {
      if (
        !node.parentElement ||
        node.parentElement.closest(
          "script,style,[data-user-text],[data-i18n-managed],textarea,.digit,.colon,.wheel-item",
        )
      )
        return;
      const previous = textCache.get(node);
      const original =
        previous && node.nodeValue === previous.output
          ? previous.original
          : window.ikraOriginal(node.nodeValue);
      const output = window.ikraT(original);
      textCache.set(node, { original, output });
      if (output !== node.nodeValue) node.nodeValue = output;
    }
    function element(el) {
      if (el.matches("script,style,[data-user-text]")) return;
      updateLocalized(el);
      let cache = attributeCache.get(el) || {};
      for (const attr of [
        "aria-label",
        "title",
        "placeholder",
        "data-tooltip",
        "aria-valuetext",
      ]) {
        if (!el.hasAttribute(attr) || managesAttribute(el, attr)) continue;
        const current = el.getAttribute(attr),
          old = cache[attr],
          original =
            old && current === old.output
              ? old.original
              : window.ikraOriginal(current),
          output = window.ikraT(original);
        cache[attr] = { original, output };
        if (output !== current) el.setAttribute(attr, output);
      }
      attributeCache.set(el, cache);
    }
    function scan(root) {
      if (root.nodeType === 3) {
        text(root);
        return;
      }
      if (root.nodeType !== 1) return;
      element(root);
      const walker = document.createTreeWalker(
        root,
        NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT,
      );
      let node;
      while ((node = walker.nextNode())) {
        if (node.nodeType === 3) text(node);
        else element(node);
      }
    }
    const observer = new MutationObserver((records) => {
      for (const record of records) {
        if (record.type === "characterData") text(record.target);
        else if (record.type === "attributes") element(record.target);
        else record.addedNodes.forEach(scan);
      }
    });
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      characterData: true,
      attributes: true,
      attributeFilter: [
        "aria-label",
        "title",
        "placeholder",
        "data-tooltip",
        "aria-valuetext",
      ],
    });
    function update() {
      document.documentElement.lang = window.ikraLanguage();
      buttonGroup
        .querySelectorAll("button")
        .forEach((b) =>
          b.setAttribute(
            "aria-pressed",
            String(b.dataset.language === window.ikraLanguage()),
          ),
        );
      scan(document.body);
    }
    document.addEventListener("ikra-language", update);
    update();
  })();
}
