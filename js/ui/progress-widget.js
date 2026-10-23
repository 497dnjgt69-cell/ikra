import { bilingual, localizedAttribute } from '../i18n/bindings.js';
export default function initialize() {
  (() => {
    const $ = (s) => document.querySelector(s),
      card = $(".activity-mini"),
      dock = $(".dock");
    card.classList.add("hidden");
    card.id = "progress-card";
    const progress = document.createElement("button");
    progress.className = "button";
    progress.setAttribute("aria-expanded", "false");
    progress.setAttribute("aria-controls", "progress-card");
    progress.innerHTML =
      '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 19V12m7 7V5m7 14V9"/></svg><span>İlerleme</span>';
    progress.onclick = () => {
      const visible = progress.getAttribute("aria-expanded") !== "true";
      window.animatePanel(card, visible);
      progress.setAttribute("aria-expanded", String(visible));
    };
    dock.insertBefore(progress, $("#peek-toggle"));
    const peek = $("#peek-toggle");
    peek.innerHTML =
      '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20.9 13A9 9 0 0 1 11 3.1 9 9 0 1 0 20.9 13Z"/></svg><span>Namaz vakitleri</span>';
    const select = $("#theme"),
      themes = document.createElement("div");
    themes.className = "theme-picker";
    themes.setAttribute("role", "group");
    themes.setAttribute("aria-label", "Tema");
    const slot=document.createElement('div');slot.className='theme-slot';slot.append(themes);select.after(slot);
    const toggle=document.createElement('button');toggle.type='button';toggle.className='theme-choice theme-toggle';
    toggle.setAttribute('aria-expanded','false');toggle.setAttribute('aria-controls','theme-options');
    localizedAttribute(toggle,'aria-label',()=>bilingual('Tema seç','Choose theme'));
    const options=document.createElement('div');options.id='theme-options';options.className='theme-options';options.inert=true;
    themes.append(toggle,options);
    function expand(open){themes.classList.toggle('is-open',open);toggle.setAttribute('aria-expanded',String(open));options.inert=!open;}
    toggle.onclick=()=>expand(toggle.getAttribute('aria-expanded')!=='true');
    themes.addEventListener('keydown',e=>{if(e.key==='Escape'){expand(false);toggle.focus();}});
    document.addEventListener('click',e=>{if(!themes.contains(e.target))expand(false);});
    themes.addEventListener('focusout',e=>{if(!themes.contains(e.relatedTarget))expand(false);});
    const icons = {
      neumorphism: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M2 12h2m16 0h2M4.93 4.93l1.42 1.42m11.3 11.3 1.42 1.42M4.93 19.07l1.42-1.42m11.3-11.3 1.42-1.42"/>',
      dark: '<path d="M20.9 13A9 9 0 0 1 11 3.1 9 9 0 1 0 20.9 13Z"/>',
      nature:
        '<path d="M20 4c-8-1-14 2-14 8a6 6 0 0 0 6 6c6 0 9-7 8-14Z M4 20l10-10"/>',
    };
    for (const [value, label] of [
      ["neumorphism", "Aydınlık"],
      ["dark", "Karanlık"],
      ["nature", "Doğa"],
    ]) {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "theme-choice";
      button.dataset.themeChoice = value;
      localizedAttribute(button,"aria-label",()=>bilingual(label,({neumorphism:"Light",dark:"Dark",nature:"Nature"})[value]));
      localizedAttribute(button,"title",()=>bilingual(label,({neumorphism:"Light",dark:"Dark",nature:"Nature"})[value]));
      button.innerHTML =
        '<svg viewBox="0 0 24 24" aria-hidden="true">' +
        icons[value] +
        "</svg>";
      button.onclick = () => {
        select.value = value;
        select.dispatchEvent(new Event("change", { bubbles: true }));
        expand(false);toggle.focus();
      };
      options.append(button);
    }
    const draw = () => {
      toggle.innerHTML='<svg viewBox="0 0 24 24" aria-hidden="true">'+icons[select.value]+'</svg>';
      options.querySelectorAll('button').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.themeChoice===select.value)));
    };
    document.addEventListener("focus-render", draw);
    draw();
  })();
}
