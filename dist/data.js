export const days = ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'];
export const short = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];
export const defaults = {wake:360,sleep:1380,maxBlock:75,minBlock:25,maxDaily:240,buffer:10,lead:12,strategy:'balanced',lookaheadDays:2,meals:[[720,780],[1080,1140]]};
export function dateKey(date = new Date()) { return new Intl.DateTimeFormat('en-CA',{timeZone:'America/New_York',year:'numeric',month:'2-digit',day:'2-digit'}).format(date); }
export const addDays = (key, n) => { const date=new Date(key+'T12:00:00Z');date.setUTCDate(date.getUTCDate()+n);return date.toISOString().slice(0,10); };
export function monday(key = dateKey()) { const d=new Date(key+'T12:00:00Z').getUTCDay();return addDays(key,-((d+6)%7)); }
export const dayDiff = (a,b) => Math.round((Date.parse(a+'T12:00:00Z')-Date.parse(b+'T12:00:00Z'))/86400000);
export const formatDate = (key, options={month:'long',day:'numeric'}) => new Date(key+'T12:00:00Z').toLocaleDateString('en-US',{...options,timeZone:'UTC'});
export const clock = m => `${String(Math.floor(m/60)%24).padStart(2,'0')}:${String(m%60).padStart(2,'0')}`;
export const timeLabel = m => `${Math.floor(m/60)%12||12}${m%60?':'+String(m%60).padStart(2,'0'):''}${m<720?'am':'pm'}`;
export const hours = m => Number((m/60).toFixed(1));
export function sampleHard() {
 const a=[];const add=(day,start,end,title,kind,location,course='')=>a.push({id:`h${a.length}`,day,start,end,title,kind,location,course,hard:true});
 for(let d=0;d<5;d++){add(d,420,450,'BRC Formation','corps','Old Barracks');add(d,600,650,'Calculus I','class','Mallory 206','MA-123');if(d%2===0){add(d,480,530,'English Composition','class','Scott Shipp 304','ERH-101');add(d,780,830,'World History','class','Scott Shipp 112','HI-103');}else{add(d,510,585,'Intro to Programming','class','Nichols 210','CIS-111');add(d,900,960,'Physical training','corps','Parade Ground');}}
 add(2,840,1010,'Programming Lab','class','Nichols 210','CIS-111L');add(2,930,990,'MAC Training','corps','Parade Ground');add(4,960,1020,'Friday Parade','corps','Parade Ground');add(5,540,600,'Room inspection','corps','Old Barracks');add(6,1020,1080,'Weekly reset','personal','Personal time');return a;
}
export function loadState() {
 let old;try{old=JSON.parse(localStorage.getItem('palette-v2')||localStorage.getItem('palette-v1'));}catch{}
 const today=dateKey(),initialWeek=monday(addDays(today,new Date(today+'T12:00:00Z').getUTCDay()===0?1:0));
 const s=old||{hard:sampleHard(),tasks:[{id:'t1',title:'Gilgamesh reading response',course:'ERH-101',due:3900,minutes:90},{id:'t2',title:'Problem set 03',course:'MA-123',due:5340,minutes:120},{id:'t3',title:'Python: loops & logic',course:'CIS-111',due:7199,minutes:150},{id:'t4',title:'World history chapter notes',course:'HI-103',due:9840,minutes:90}],prefs:defaults,locked:[],archive:[],sources:{matrix:'Sample corps schedule',canvas:'Sample assignments',term:'Fall 2026 sample catalog'},enrolled:['MA-123','ERH-101','HI-103','CIS-111','CIS-111L']};
 const migrating=old&&!old.schema,legacyWeek=migrating?'2026-09-14':initialWeek;
 s.tasks=s.tasks.map(t=>({...t,dueDate:t.dueDate||addDays(legacyWeek,Math.floor(t.due/1440)),dueTime:t.dueTime??t.due%1440}));
 s.locked=(s.locked||[]).map(b=>({...b,week:b.week||legacyWeek}));s.prefs={...defaults,...s.prefs};
 s.catalog=s.catalog||s.hard.filter(b=>b.kind==='class');s.mappings=s.mappings||{};s.uploads=s.uploads||[];s.matrixWeekOverrides=s.matrixWeekOverrides||[];s.sessions=s.sessions||[];s.schema=2;
 if(migrating&&s.matrixScope==='week'&&!s.matrixWeekOverrides.includes(legacyWeek))s.matrixWeekOverrides.push(legacyWeek);
 s.hard=s.hard.map(b=>migrating&&s.matrixScope==='week'&&b.source==='matrix'&&!b.week?{...b,week:legacyWeek}:b);
 return s;
}
export function validateBackup(s){
 const fail=()=>{throw Error('This backup has missing or invalid planner data.');};
 const arr=x=>Array.isArray(x),str=x=>typeof x==='string',num=x=>Number.isFinite(x),validDate=x=>str(x)&&/^\d{4}-\d{2}-\d{2}$/.test(x)&&!Number.isNaN(Date.parse(x+'T12:00:00Z'))&&new Date(x+'T12:00:00Z').toISOString().slice(0,10)===x;
 if(s?.schema!==2||!arr(s.tasks)||!arr(s.hard)||!arr(s.catalog)||!arr(s.locked)||!arr(s.archive)||!arr(s.enrolled)||!s.sources||!s.prefs)fail();
 const checkTask=t=>{if(!str(t.id)||!str(t.title)||!str(t.course)||!validDate(t.dueDate)||!num(t.dueTime)||t.dueTime<0||t.dueTime>=1440||!num(t.minutes)||t.minutes<0||t.minutes>2400)fail();};
 const checkBlock=b=>{if(!str(b.id)||!str(b.title)||!['corps','class','study','personal'].includes(b.kind)||!Number.isInteger(b.day)||b.day<0||b.day>6||!num(b.start)||!num(b.end)||b.start<0||b.end>1440||b.start>=b.end||(b.week&&!validDate(b.week)))fail();};
 s.tasks.forEach(checkTask);[...s.hard,...s.catalog,...s.locked].forEach(checkBlock);
 for(const a of s.archive){if(!a.plan||!arr(a.plan.blocks)||!arr(a.plan.conflicts)||!arr(a.plan.unplaced)||!arr(a.tasks))fail();a.plan.blocks.forEach(checkBlock);if(a.week){if(!validDate(a.week))fail();a.tasks.forEach(checkTask);}a.plan.conflicts.forEach(pair=>{if(!arr(pair)||pair.length!==2)fail();pair.forEach(checkBlock);});}
 for(const key of ['wake','sleep','minBlock','maxBlock','maxDaily','buffer','lead'])if(!num(s.prefs[key]))fail();
 if(s.prefs.wake<0||s.prefs.sleep>1440||s.prefs.sleep<=s.prefs.wake||s.prefs.minBlock<5||s.prefs.maxBlock< s.prefs.minBlock||s.prefs.maxBlock>180||s.prefs.maxDaily<0||s.prefs.maxDaily>1440||s.prefs.buffer<0||s.prefs.buffer>120||s.prefs.lead<0||s.prefs.lead>168)fail();
 if(!s.enrolled.every(str)||!arr(s.uploads)||s.uploads.some(u=>!u||!str(u.raw)||!str(u.name)||!str(u.kind)))fail();
 if(['matrix','canvas','term'].some(k=>!str(s.sources[k])))fail();
 if(!s.mappings||typeof s.mappings!=='object'||arr(s.mappings))fail();
 if(s.matrixWeekOverrides&&(!arr(s.matrixWeekOverrides)||!s.matrixWeekOverrides.every(validDate)))fail();
 if(!['balanced','early'].includes(s.prefs.strategy))fail();
 if(s.prefs.meals&&(!arr(s.prefs.meals)||s.prefs.meals.length!==2||s.prefs.meals.some(m=>!arr(m)||m.length!==2||!m.every(num)||m[0]<0||m[1]>1440||m[0]>=m[1])))fail();
 if(s.prefs.lookaheadDays!==undefined&&(!Number.isInteger(s.prefs.lookaheadDays)||s.prefs.lookaheadDays<0||s.prefs.lookaheadDays>7))fail();
 if(s.sessions!==undefined&&(!arr(s.sessions)||s.sessions.some(x=>!x||!str(x.id)||!str(x.title)||!num(x.minutes)||x.minutes<0||!str(x.finishedAt)||Number.isNaN(Date.parse(x.finishedAt)))))fail();
 if(s.focusSession!=null){const f=s.focusSession;if(!str(f.id)||!str(f.title)||!num(f.total)||f.total<=0||f.total>86400||!num(f.remaining)||f.remaining<0||f.remaining>f.total||typeof f.running!=='boolean'||(f.running&&!num(f.end)))fail();}
 for(const a of s.archive){if(a.hard){if(!arr(a.hard))fail();a.hard.forEach(checkBlock);}if(a.plan.violations&&(!arr(a.plan.violations)||a.plan.violations.some(v=>!str(v.note))))fail();if(a.plan.unplaced.some(u=>!str(u.title)||!num(u.minutes)))fail();}
 return {...s,prefs:{...defaults,...s.prefs},sessions:s.sessions||[],focusSession:s.focusSession??null,matrixWeekOverrides:s.matrixWeekOverrides||[]};
}
