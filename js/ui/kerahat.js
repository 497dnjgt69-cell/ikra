// Kerahat intervals are approximate according to Diyanet (Hanafi practice).
// Ranges depend on local conditions; do not represent precise solar calculations.
const intervals = [
  {tr:"Güneş doğuşu",en:"After sunrise",start:"Güneş",end:"Güneş",before:0,after:45},
  {tr:"Öğle öncesi",en:"Before Dhuhr",start:"Öğle",end:"Öğle",before:10,after:0},
  {tr:"Güneş batışı",en:"Before sunset",start:"Akşam",end:"Akşam",before:45,after:0},
];
const valid = /^([01]\d|2[0-3]):[0-5]\d$/;
const parse = s => valid.test(s||"") ? +s.slice(0,2)*60 + +s.slice(3,5) : null;
const fmt = n => String(Math.floor(n/60)).padStart(2,"0")+":"+String(n%60).padStart(2,"0");
const english = () => (document.documentElement.lang||"tr").toLowerCase().startsWith("en");
function ensureStyle(){
 if(document.getElementById("ikra-kerahat-style"))return;
 const style=document.createElement("style");
 style.id="ikra-kerahat-style";
 style.textContent=`.kerahat-box{margin-top:12px;padding:12px;border:1px solid currentColor;border-radius:14px;border-color:color-mix(in srgb,currentColor 15%,transparent)}.kerahat-head{font-weight:650;margin-bottom:8px}.kerahat-list{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:8px}.kerahat-slot{padding:9px;border-radius:10px;background:color-mix(in srgb,currentColor 5%,transparent);display:grid;gap:3px}.kerahat-slot.active{background:color-mix(in srgb,#d89029 18%,transparent);outline:1px solid #d89029}.kerahat-slot b{font-size:.85rem}.kerahat-slot span,.kerahat-note{font-size:.79rem;opacity:.82}.kerahat-note{margin:8px 0 0}`;
 document.head.append(style);
}
export function updateKerahat({store,times}){
 ensureStyle();
 const host=document.getElementById("prayer-peek");
 if(!host)return;
 let box=document.getElementById("ikra-kerahat");
 if(!box){box=document.createElement("section");box.id="ikra-kerahat";box.className="kerahat-box";box.setAttribute("aria-label","Kerahat vakitleri");const config=document.getElementById("peek-config");host.insertBefore(box,config);}
 const en=english(),wall=times.wall(),data=store.state.prayerTimes||{};
 const current=store.state.prayerDate===wall.date;
 const minutes=wall.seconds/60;
 const rows=current ? intervals.map(item=>{
    const anchor=parse(data[item.start]);if(anchor===null)return null;
    const start=anchor-item.before,end=anchor+item.after;
    if(start<0||end>=1440)return null;
    return {...item,start,end,active:minutes>=start&&minutes<end};
 }) : [];
 const ready=rows.length===3&&rows.every(Boolean);
 box.replaceChildren();
 const heading=document.createElement("div");heading.className="kerahat-head";heading.textContent=en?"Kerahat times (approx.)":"Kerahat vakitleri (yaklaşık)";box.append(heading);
 if(!ready){const note=document.createElement("p");note.className="kerahat-note";note.textContent=en?"Refresh today's prayer times to display these intervals.":"Aralıkları görmek için bugünün namaz vakitlerini güncelle.";box.append(note);return;}
 const list=document.createElement("div");list.className="kerahat-list";
 for(const row of rows){
  const slot=document.createElement("div");slot.className="kerahat-slot"+(row.active?" active":"");
  const title=document.createElement("b");title.textContent=en?row.en:row.tr;
  const span=document.createElement("span");span.textContent=fmt(row.start)+"–"+fmt(row.end)+(row.active?(en?" · Active":" · Şu an kerahat"):"");
  slot.append(title,span);list.append(slot);
 }
 box.append(list);
 const note=document.createElement("p");note.className="kerahat-note";note.textContent=en?"Approximate 45/10/45-minute intervals based on Diyanet guidance. Rules for voluntary prayers also apply outside these intervals.":"Diyanet'in tarifine göre yaklaşık 45/10/45 dakika. Ayrıca bazı vakitlerde yalnızca nafile namazlar mekruhtur.";box.append(note);
}
