// Compact, approximate kerahat markers displayed within the prayer-time rows.
// These are estimates (45 minutes after sunrise, 10 minutes before Dhuhr,
// 45 minutes before sunset), not exact astronomical boundaries.
const valid = /^([01]\d|2[0-3]):[0-5]\d$/;
const parse = value => valid.test(value || "") ? Number(value.slice(0,2))*60+Number(value.slice(3,5)) : null;
const format = minutes => String(Math.floor(minutes/60)).padStart(2,"0")+":"+String(minutes%60).padStart(2,"0");
const isEnglish = () => (document.documentElement.lang || "tr").toLowerCase().startsWith("en");

function ensureStyle() {
  if (document.getElementById("ikra-kerahat-style")) return;
  const style = document.createElement("style");
  style.id = "ikra-kerahat-style";
  style.textContent = `
    /* Preserve a dedicated right column for prayer times. Kerahat gets its
       own full-width line beneath, never a third item in the time row. */
    #peek-times .prayer {
      display:grid;
      grid-template-columns:minmax(0,1fr) auto;
      align-items:center;
      column-gap:12px;
      row-gap:0;
      width:100%;
    }
    #peek-times .prayer > b {
      grid-column:1;
      grid-row:1;
      min-width:0;
      text-align:left;
    }
    #peek-times .prayer > span {
      grid-column:2;
      grid-row:1;
      justify-self:end;
      text-align:right;
      white-space:nowrap;
      font-variant-numeric:tabular-nums;
    }
    #peek-times .prayer > .kerahat-inline {
      display:block;
      grid-column:1 / -1;
      grid-row:2;
      margin:4px 0 0;
      padding:0;
      font-size:10px;
      font-weight:500;
      line-height:1.35;
      text-align:left;
      color:#d64b54;
      font-variant-numeric:tabular-nums;
      white-space:normal;
      overflow-wrap:anywhere;
    }
    #peek-times .prayer > .kerahat-inline.is-active {
      font-weight:700;
      color:#e13b45;
    }
  `;
  document.head.append(style);
}

export function updateKerahat({store,times}) {
  ensureStyle();
  // Remove the older standalone panel on hot reloads as well.
  document.getElementById("ikra-kerahat")?.remove();
  const grid=document.getElementById("peek-times");
  if(!grid)return;
  const cards=[...grid.querySelectorAll(".prayer")];
  if(cards.length<6)return;
  const wall=times.wall();
  const data=store.state.prayerTimes||{};
  const current=store.state.prayerDate===wall.date;
  const en=isEnglish();
  const anchors=[
    {index:1,at:"Güneş",offset:45,kind:"end"},
    {index:2,at:"Öğle",offset:-10,kind:"start"},
    {index:3,at:"Akşam",offset:-45,kind:"start"}
  ];
  for(const item of anchors) {
    const card=cards[item.index];
    const old=card.querySelector(".kerahat-inline");
    const base=current?parse(data[item.at]):null;
    const moment=base===null?null:base+item.offset;
    if(moment===null||moment<0||moment>=1440) {old?.remove();continue;}
    const text=(en ? (item.kind==="end"?"Kerahat ends: ":"Kerahat starts: ") :
      (item.kind==="end"?"Kerahat bitişi: ":"Kerahat başlangıcı: "))+format(moment);
    const now=wall.seconds/60;
    const active=item.kind==="end"
      ? now>=base&&now<moment
      : item.at==="Öğle" ? now>=moment&&now<base : now>=moment&&now<base;
    const label=old||document.createElement("small");
    label.className="kerahat-inline"+(active?" is-active":"");
    if(label.textContent!==text)label.textContent=text;
    if(!old)card.append(label);
  }
}
