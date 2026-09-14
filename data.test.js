import test from 'node:test';
import assert from 'node:assert/strict';
import {loadState,validateBackup} from './dist/data.js';
test('legacy data retains its original assignment dates during migration',()=>{const legacy={hard:[],tasks:[{id:'a',title:'Essay',course:'ERH',due:3900,minutes:60}],prefs:{wake:360,sleep:1380,maxBlock:60,maxDaily:240,buffer:10,lead:12},locked:[],archive:[],enrolled:[],sources:{matrix:'Sample',canvas:'Sample',term:'Sample'},matrixScope:'week'};globalThis.localStorage={getItem:key=>key==='palette-v1'?JSON.stringify(legacy):null};const s=loadState();assert.equal(s.tasks[0].dueDate,'2026-09-16');assert.equal(s.tasks[0].dueTime,1020);assert.deepEqual(s.matrixWeekOverrides,['2026-09-14']);globalThis.localStorage={getItem:key=>key==='palette-v2'?JSON.stringify(s):null};assert.deepEqual(loadState().matrixWeekOverrides,['2026-09-14']);});
test('backup rejects malformed source data and meal windows before restoring',()=>{globalThis.localStorage={getItem:()=>null};const s=loadState();assert.doesNotThrow(()=>validateBackup(s));for(const mutate of [x=>x.uploads=null,x=>x.sources.matrix=42,x=>x.prefs.meals='bad',x=>x.prefs.meals=[[800,700]]]){const bad=structuredClone(s);mutate(bad);assert.throws(()=>validateBackup(bad));}});

test('older backups normalize optional session data and reject broken timers',()=>{
 globalThis.localStorage={getItem:()=>null};const s=loadState();delete s.sessions;delete s.prefs.lookaheadDays;
 const restored=validateBackup(s);assert.deepEqual(restored.sessions,[]);assert.equal(restored.focusSession,null);assert.equal(restored.prefs.lookaheadDays,2);
 const focus={id:'focus-1',title:'Essay',total:1500,remaining:1400,running:true,end:Date.now()+1400000};
 assert.doesNotThrow(()=>validateBackup({...s,focusSession:focus,sessions:[{id:'done-1',title:'Essay',minutes:25,finishedAt:'2026-09-13T12:00:00Z'}]}));
 for(const bad of [{...focus,end:null},{...focus,remaining:-1},{...focus,remaining:1600},{...focus,running:'yes'}])assert.throws(()=>validateBackup({...s,focusSession:bad}));
 assert.throws(()=>validateBackup({...s,prefs:{...s.prefs,lookaheadDays:99}}));
 assert.throws(()=>validateBackup({...s,sessions:[{id:'a',title:'Essay',minutes:-1,finishedAt:'invalid'}]}));
});
