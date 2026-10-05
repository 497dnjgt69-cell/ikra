import {prayerNames} from '../domain/prayer-timer.js';
import {prayerWallNow} from '../domain/prayer-times.js';
import {FEATURES} from '../config/features.js';
// Untimed prayer presence: only an explicit completion marks the prayer as done.
export function createPrayerTimer({store,access,focus,now=Date.now}) {
  const leave=()=>store.update(d=>{d.prayerTimer=null;d.prayerView=false;});
  return Object.freeze({
    settle(){},pause(){},leave,
    enter(){access.require(FEATURES.PRAYER);focus.pause();store.update(d=>{d.prayerView=true;});},
    begin(name){
      access.require(FEATURES.PRAYER);
      if(!store.state.prayerView||store.state.prayerTimer||!prayerNames.includes(name))return;
      focus.pause();store.update(d=>{d.prayerTimer={name,untimed:true,startedDate:prayerWallNow(d,new Date(now())).date};});
    },
    finish(){
      if(!store.state.prayerTimer)return null;
      return store.update(d=>{const session=d.prayerTimer;const day=session.startedDate||prayerWallNow(d,new Date(now())).date;
        d.prayerChecks ||= {};d.prayerChecks[day] ||= {};d.prayerChecks[day][session.name]=true;
        d.prayerTimer=null;d.prayerView=false;return {name:session.name};});
    },
    select(){},reset(){leave();},setDuration(){return false;}
  });
}
