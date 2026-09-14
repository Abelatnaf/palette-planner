import test from 'node:test';
import assert from 'node:assert/strict';
import {generate} from './dist/engine.js';
const prefs={wake:360,sleep:1380,maxBlock:60,maxDaily:240,buffer:10,lead:12};
const hard=[{id:'h1',day:0,start:420,end:600,hard:true},{id:'h2',day:0,start:570,end:630,hard:true}];
const tasks=[{id:'a',title:'Assignment',due:4320,minutes:180}];
test('deterministic scheduling preserves conflicts and avoids fixed commitments',()=>{const a=generate(hard,tasks,prefs);assert.deepEqual(a,generate(hard,tasks,prefs));assert.equal(a.conflicts.length,1);for(const b of a.blocks.filter(b=>!b.hard)){assert.ok(b.day*1440+b.end<=tasks[0].due-720);for(const h of hard)assert.ok(b.day!==h.day||b.end<=h.start-10||b.start>=h.end+10)}assert.equal(a.unplaced.length,0)});
test('over capacity reports unscheduled work and obeys daily caps',()=>{const p=generate([],[{id:'a',title:'Large task',minutes:3000,due:10080}],{...prefs,maxDaily:60});assert.ok(p.unplaced.length);for(let d=0;d<7;d++)assert.ok(p.blocks.filter(b=>b.day===d).reduce((s,b)=>s+b.end-b.start,0)<=60)});
test('locked chunks persist without duplicate ids or excess demand',()=>{const first=generate([],tasks,prefs),lock=first.blocks[0];const next=generate([],tasks,prefs,[{...lock,locked:true}]);assert.deepEqual(next.blocks.find(b=>b.id===lock.id),{...lock,locked:true});assert.equal(new Set(next.blocks.map(b=>b.id)).size,next.blocks.length);assert.equal(next.blocks.reduce((s,b)=>s+b.end-b.start,0),180)});
test('locked conflicts and deadline violations are surfaced',()=>{const p=generate(hard,tasks,prefs,[{id:'pin',taskId:'a',title:'Old title',day:0,start:450,end:500,hard:false}]);assert.equal(p.conflicts.length,2);assert.equal(p.blocks.find(b=>b.id==='pin').title,'Assignment');const late=generate([],tasks,prefs,[{id:'pin',taskId:'a',day:6,start:600,end:660,hard:false}]);assert.ok(late.violations.some(v=>v.note.includes('deadline')));});
test('completed or removed tasks cannot retain study locks',()=>{const p=generate([],[],prefs,[{id:'pin',taskId:'deleted',day:0,start:600,end:660}]);assert.equal(p.blocks.length,0);});
test('balanced planning avoids double bookings and respects buffers',()=>{const p=generate(hard,[...tasks,{id:'b',title:'Second task',minutes:300,due:10080}],{...prefs,strategy:'balanced'});const generated=p.blocks.filter(b=>!b.hard);for(const a of generated)for(const b of p.blocks){if(a.id===b.id||a.day!==b.day)continue;assert.ok(a.end+prefs.buffer<=b.start||a.start>=b.end+prefs.buffer);}assert.equal(generated.reduce((s,b)=>s+b.end-b.start,0),480);});
test('regeneration places new study only after the current time and preserves fixed history',()=>{
 const notBefore=2*1440+607;
 const plan=generate(hard,[{id:'future',title:'Future work',due:10080,minutes:180}],prefs,[],{notBefore});
 assert.equal(plan.unplaced.length,0);
 assert.deepEqual(plan.blocks.filter(b=>b.hard),hard);
 const study=plan.blocks.filter(b=>!b.hard);
 assert.equal(study.reduce((sum,b)=>sum+b.end-b.start,0),180);
 assert.ok(study.every(b=>b.day*1440+b.start>=notBefore));
 assert.ok(study.every(b=>b.start%5===0));
});
test('passed deadlines and buffers produce explicit unplaced work instead of past blocks',()=>{
 const plan=generate([], [
  {id:'past',title:'Overdue work',due:1000,minutes:60},
  {id:'buffer',title:'Buffer passed',due:2000,minutes:90}
 ],prefs,[],{notBefore:1500});
 assert.equal(plan.blocks.length,0);
 assert.deepEqual(plan.unplaced.map(t=>[t.taskId,t.minutes]),[['past',60],['buffer',90]]);
 assert.match(plan.unplaced[0].reason,/deadline has passed/);
 assert.match(plan.unplaced[1].reason,/buffer has already passed/);
});
test('chunking reserves a full final block when a sub-minimum remainder is avoidable',()=>{
 const plan=generate([],[{id:'a',title:'Seventy minutes',due:4320,minutes:70}],{...prefs,minBlock:25});
 const sizes=plan.blocks.map(b=>b.end-b.start);
 assert.equal(plan.unplaced.length,0);
 assert.equal(sizes.reduce((sum,size)=>sum+size,0),70);
 assert.ok(sizes.every(size=>size>=25&&size<=60));
 assert.equal(sizes.length,2);
});
