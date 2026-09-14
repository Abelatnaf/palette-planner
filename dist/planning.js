import {addDays,dateKey,dayDiff,monday} from './data.js';
export function easternMinutes(now=new Date()) {
 const parts=Object.fromEntries(new Intl.DateTimeFormat('en-US',{timeZone:'America/New_York',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).formatToParts(now).map(p=>[p.type,p.value]));
 return +parts.hour*60+(+parts.minute);
}
export function prepareWeek(state,week,now=new Date()) {
 const today=dateKey(now),weekEnd=addDays(week,7),current=monday(today),notBefore=Math.max(0,dayDiff(today,week)*1440+Math.ceil(easternMinutes(now)/5)*5);
 const includeOverdue=week>=current&&week<=addDays(current,7);
 const tasks=state.tasks.filter(t=>!t.removedAt&&((t.dueDate>=week&&t.dueDate<weekEnd)||(!t.done&&t.dueDate>=weekEnd&&t.dueDate<addDays(weekEnd,state.prefs.lookaheadDays??2))||(!t.done&&includeOverdue&&t.dueDate<week)))
 .map(t=>({...t,due:dayDiff(t.dueDate,week)*1440+t.dueTime,upcoming:t.dueDate>=weekEnd,overdue:!t.done&&(t.dueDate<today||t.dueDate===today&&t.dueTime<easternMinutes(now))}));
 const hard=state.hard.filter(b=>(!b.week||b.week===week)&&!(b.kind==='corps'&&!b.week&&(state.matrixWeekOverrides||[]).includes(week)));
 return {tasks,hard,notBefore};
}
export function layoutOverlaps(blocks) {
 const result=new Map();
 for(let day=0;day<7;day++){
  const sorted=blocks.filter(b=>b.day===day).sort((a,b)=>a.start-b.start||b.end-a.end||a.id.localeCompare(b.id));let group=[],groupEnd=-1;
  const flush=()=>{const ends=[],positions=[];for(const b of group){let lane=ends.findIndex(end=>end<=b.start);if(lane<0)lane=ends.length;ends[lane]=b.end;positions.push([b.id,lane]);}positions.forEach(([id,lane])=>result.set(id,{lane,lanes:ends.length}));group=[];};
  for(const block of sorted){if(block.start>=groupEnd&&group.length)flush();group.push(block);groupEnd=Math.max(group.length===1?-1:groupEnd,block.end);}if(group.length)flush();
 }
 return result;
}
export function focusRemaining(session,now=Date.now()) {return session?.running?Math.max(0,Math.ceil((session.end-now)/1000)):Math.max(0,session?.remaining||0);}
