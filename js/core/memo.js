export function splitLines(text) { return text.split(/\r?\n/).map(s=>s.trim()).filter(Boolean); }
export function normalizeMemos(value) {
  if(!Array.isArray(value)) return [];
  return value.filter(m=>m && typeof m.id==='string' && typeof m.title==='string' && typeof m.text==='string' && splitLines(m.text).length).slice(0,500).map(m=>({id:m.id,title:m.title.slice(0,120),text:m.text.slice(0,30000),kind:['poem','verse','text'].includes(m.kind)?m.kind:'text',level:Number.isInteger(m.level)?Math.max(0,Math.min(6,m.level)):0,due:Number.isFinite(m.due)?m.due:0,reviews:Number.isInteger(m.reviews)?Math.max(0,m.reviews):0}));
}
export function reviewed(memo,rating,now=Date.now()) {
  const level=rating==='again'?0:Math.min(6,memo.level+(rating==='easy'?2:1));
  const delay=rating==='again'?10*60*1000:[0,1,3,7,14,30,60][level]*86400000;
  return {...memo,level,due:now+delay,reviews:memo.reviews+1};
}
export function hiddenWord(index,stage) {return stage===3 || (stage===1 && index%3===1) || (stage===2 && index%3!==0);}
