import test from 'node:test';
import assert from 'node:assert/strict';
import {prepareWeek,layoutOverlaps,focusRemaining} from './dist/planning.js';

const now=new Date('2026-09-16T14:07:29Z'); // Wednesday, 10:07 a.m. Eastern.
const makeTask=(id,dueDate,extra={})=>({id,title:id,course:'TEST',dueDate,dueTime:720,minutes:60,...extra});
const state={prefs:{lookaheadDays:2},hard:[],tasks:[
 makeTask('old','2026-09-11'),
 makeTask('old-done','2026-09-11',{done:true}),
 makeTask('this-week','2026-09-18'),
 makeTask('week-done','2026-09-19',{done:true}),
 makeTask('monday-next','2026-09-21'),
 makeTask('tuesday-next','2026-09-22'),
 makeTask('beyond-lookahead','2026-09-23'),
 makeTask('next-done','2026-09-21',{done:true}),
 makeTask('removed','2026-09-17',{removedAt:1})
]};
test('week preparation includes unfinished overdue and near-future work with correct absolute deadlines',()=>{
 const result=prepareWeek(state,'2026-09-14',now);
 assert.deepEqual(result.tasks.map(t=>t.id),['old','this-week','week-done','monday-next','tuesday-next']);
 assert.equal(result.notBefore,2*1440+610);
 assert.equal(result.tasks.find(t=>t.id==='old').overdue,true);
 const upcoming=result.tasks.find(t=>t.id==='monday-next');
 assert.equal(upcoming.upcoming,true);
 assert.equal(upcoming.due,7*1440+720);
 assert.equal(result.tasks.find(t=>t.id==='this-week').upcoming,false);
});
test('week preparation honors disabled lookahead and does not leak current overdue work into distant weeks',()=>{
 const current=prepareWeek({...state,prefs:{lookaheadDays:0}},'2026-09-14',now);
 assert.deepEqual(current.tasks.map(t=>t.id),['old','this-week','week-done']);
 const distant=prepareWeek(state,'2026-10-05',now);
 assert.deepEqual(distant.tasks,[]);
 assert.equal(distant.notBefore,0);
});
test('week-only corps matrices replace recurring corps commitments for the selected week',()=>{
 const hard=[
  {id:'recurring',kind:'corps'},
  {id:'class',kind:'class'},
  {id:'this-week',kind:'corps',week:'2026-09-14'},
  {id:'other-week',kind:'corps',week:'2026-09-21'}
 ];
 const result=prepareWeek({...state,hard,matrixWeekOverrides:['2026-09-14']},'2026-09-14',now);
 assert.deepEqual(result.hard.map(b=>b.id),['class','this-week']);
});
test('overlap lanes stay consistent through connected chains and reset at touching boundaries',()=>{
 const blocks=[
  {id:'a',day:0,start:60,end:120},
  {id:'b',day:0,start:90,end:150},
  {id:'c',day:0,start:120,end:180},
  {id:'d',day:0,start:180,end:210},
  {id:'e',day:1,start:60,end:120}
 ];
 const positions=layoutOverlaps(blocks);
 assert.deepEqual(positions.get('a'),{lane:0,lanes:2});
 assert.deepEqual(positions.get('b'),{lane:1,lanes:2});
 assert.deepEqual(positions.get('c'),{lane:0,lanes:2});
 assert.deepEqual(positions.get('d'),{lane:0,lanes:1});
 assert.deepEqual(positions.get('e'),{lane:0,lanes:1});
 assert.deepEqual(layoutOverlaps([...blocks].reverse()),positions);
});
test('focus remaining uses the saved deadline after long gaps and remains fixed while paused',()=>{
 const start=1_000_000,session={running:true,end:start+25*60*1000,remaining:1500};
 assert.equal(focusRemaining(session,start+10*60*1000+350),900);
 assert.equal(focusRemaining(session,start+30*60*1000),0);
 assert.equal(focusRemaining({...session,running:false,remaining:271},start+60*60*1000),271);
 assert.equal(focusRemaining(null,start),0);
});
