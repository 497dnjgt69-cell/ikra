import {datekey,isDateKey} from '../shared/format.js';
import {prayerNames} from '../domain/prayer-timer.js';
// One plant contribution per date/prayer. Explicit corrections override legacy timers.
export function prayerGarden(prayers=[],checks={},now=new Date()){
  const today=datekey(now),completed=new Set();
  for(const p of prayers){if(!p||!prayerNames.includes(p.name)||!(p.seconds>0)||!Number.isFinite(Date.parse(p.at))||Date.parse(p.at)>+now)continue;completed.add(datekey(p.at)+':'+p.name);}
  for(const [date,values] of Object.entries(checks||{})){
    if(!isDateKey(date)||date>today||!values)continue;
    for(const name of prayerNames){const key=date+':'+name;if(values[name]===true)completed.add(key);else if(values[name]===false)completed.delete(key);}
  }
  const days=Array.from({length:7},(_,i)=>{const date=new Date(now);date.setHours(12,0,0,0);date.setDate(date.getDate()-6+i);const key=datekey(date);return {date,key,count:prayerNames.filter(name=>completed.has(key+':'+name)).length};});
  return {completed,total:completed.size,activeDays:new Set([...completed].map(key=>key.split(':')[0])).size,days,weekTotal:days.reduce((sum,d)=>sum+d.count,0),fullDays:days.filter(d=>d.count===5).length};
}
