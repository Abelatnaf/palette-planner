import {addDays,days} from './data.js';
export function parseTime(value){
 const s=String(value??'').trim(),m=s.match(/^(\d{1,2})(?::?(\d{2}))?\s*(AM|PM)?$/i);
 if(!m)throw Error(`Unrecognized time: ${s||'(empty)'}`);
 let hour=Number(m[1]),minute=Number(m[2]||0);if(m[3]){if(hour<1||hour>12)throw Error(`Invalid time: ${s}`);hour=hour%12+(m[3].toUpperCase()==='PM'?12:0);}
 if(hour>24||minute>59||(hour===24&&minute!==0))throw Error(`Invalid time: ${s}`);return hour*60+minute;
}
export function parseCSV(text){
 const lines=text.replace(/^\uFEFF/,'').split(/\r?\n/),sample=lines.slice(0,5).join('\n');
 const delim=(sample.match(/;/g)||[]).length>(sample.match(/,/g)||[]).length?';':',';
 let rows=[],row=[],value='',quote=false;
 for(let i=0;i<text.length;i++){const c=text[i];if(c==='"'){if(quote&&text[i+1]==='"'){value+='"';i++;}else quote=!quote;}else if(c===delim&&!quote){row.push(value.trim().replace(/^\uFEFF/,''));value='';}else if(c==='\n'&&!quote){row.push(value.trim());rows.push(row);row=[];value='';}else if(c!=='\r')value+=c;}
 if(quote)throw Error('A quoted CSV cell is missing its closing quote.');row.push(value.trim());rows.push(row);return rows.filter(r=>r.some(Boolean));
}
const dayAliases=[['mo','mon','monday','m'],['tu','tue','tues','tuesday','t'],['we','wed','wednesday','w'],['th','thu','thur','thurs','thursday','r'],['fr','fri','friday','f'],['sa','sat','saturday'],['su','sun','sunday']];
export const dayIndex=value=>dayAliases.findIndex(a=>a.includes(String(value??'').trim().toLowerCase()));
export function detectMatrix(rows){
 const header=rows.findIndex(r=>r.filter(v=>dayIndex(v)>=0).length>=3||r.some(v=>/^(day|start|end|activity|event|time|period)$/i.test(v)));
 if(header<0)throw Error('No schedule header was found. Include Day, Start, End, Activity or a Time column with weekdays.');
 const headers=rows[header],wide=headers.filter(h=>dayIndex(h)>=0).length>=3,singleTime=!wide&&headers.some(h=>/^(time|period|range)$/i.test(h))&&!headers.some(h=>/^(end|end_time|finish|to)$/i.test(h));return {headers,rows:rows.slice(header+1),wide,singleTime};
}
export function parseMatrix(detected,mapping,week){
 const out=[],seen=new Set(),{headers,rows,wide,singleTime}=detected;
 const add=(day,start,end,raw,location='',uniform='')=>{
  const text=String(raw||'').trim();if(!text||/^(—|-|n\/a)$/i.test(text))return;if(day<0)throw Error('A row has an unknown weekday.');
  if(start>=1440||start===end)throw Error('A commitment must have a non-zero duration and start before midnight.');
  const split=text.split(/\s*(?:\/|\|)\s*/),title=split[0],key=[day,start,end,title].join('|');if(seen.has(key))return;seen.add(key);
  const b={id:crypto.randomUUID(),day,start,end,title,kind:'corps',hard:true,source:'matrix',week,location,uniform:uniform||split[1]||'',raw:text};
  if(end<start){out.push({...b,end:1440});if(end>0)out.push({...b,id:crypto.randomUUID(),day:(day+1)%7,start:0,week:week&&day===6?addDays(week,7):week});}else out.push(b);
 };
 const loc=headers.findIndex(h=>/location/i.test(h)),uniform=headers.findIndex(h=>/uniform/i.test(h));
 if(wide){const timeCol=headers.findIndex(h=>/time|period/i.test(h));for(const row of rows){if(!row.some(Boolean))continue;const range=String(row[timeCol<0?0:timeCol]).split(/\s*[-–—]\s*/);if(range.length!==2)throw Error('Each time cell needs a range, such as 0700–0730.');headers.forEach((h,i)=>{const d=dayIndex(h);if(d>=0)add(d,parseTime(range[0]),parseTime(range[1]),row[i]);});}}
 else if(singleTime){if(new Set(Object.values(mapping)).size<3)throw Error('Choose a different column for each field.');for(const row of rows){if(!row[mapping.title]||/^(—|-|n\/a)$/i.test(row[mapping.title]))continue;const range=String(row[mapping.time]||'').split(/\s*[-–—]\s*/);if(range.length!==2)throw Error('Each time cell needs a range, such as 0700–0730.');add(dayIndex(row[mapping.day]),parseTime(range[0]),parseTime(range[1]),row[mapping.title],row[loc]||'',row[uniform]||'');}}
 else {if(new Set(Object.values(mapping)).size<4)throw Error('Choose a different column for each field.');for(const row of rows){if(!row[mapping.title]||/^(—|-|n\/a)$/i.test(row[mapping.title]))continue;add(dayIndex(row[mapping.day]),parseTime(row[mapping.start]),parseTime(row[mapping.end]),row[mapping.title],row[loc]||'',row[uniform]||'');}}
 return out;
}
export function parseTerm(rows){
 if(rows.length<2)throw Error('The term file has no course rows.');const headers=rows[0].map(h=>h.trim().toLowerCase());
 for(const key of ['course_code','title','days','start_time','end_time'])if(!headers.includes(key))throw Error(`Missing term column: ${key}`);
 const out=[];for(const [index,row] of rows.slice(1).entries()){const get=k=>row[headers.indexOf(k)]||'',start=parseTime(get('start_time')),end=parseTime(get('end_time'));if(end<=start||start>=1440)throw Error(`Row ${index+2}: end time must follow start time.`);if(!get('title')||!get('course_code'))throw Error(`Row ${index+2}: course code and title are required.`);
 const raw=get('days').replace(/[\[\]'"()]/g,'');let tokens=raw.split(/[\s,;|/]+/).filter(Boolean);if(tokens.length===1&&dayIndex(tokens[0])<0){const t=tokens[0].toUpperCase();tokens=/^(MO|TU|WE|TH|FR|SA|SU)+$/.test(t)?t.match(/.{2}/g):/^[MTWRF]+$/.test(t)?t.split(''):tokens;}
 if(!tokens.length)throw Error(`Row ${index+2}: a weekday is required.`);
 for(const d of tokens){const day=dayIndex(d);if(day<0)throw Error(`Row ${index+2}: unknown weekday '${d}'.`);out.push({id:crypto.randomUUID(),day,start,end,title:get('title'),course:get('course_code')+(get('section')?' · '+get('section'):''),location:get('location'),instructor:get('instructor'),kind:'class',hard:true});}}
 return out;
}
function localParts(date,zone){return Object.fromEntries(new Intl.DateTimeFormat('en-US',{timeZone:zone,year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',second:'2-digit',hourCycle:'h23'}).formatToParts(date).map(p=>[p.type,p.value]));}
function toInstant(y,m,d,h,min,sec,zone){const target=Date.UTC(y,m-1,d,h,min,sec);let stamp=target;for(let i=0;i<3;i++){const p=localParts(new Date(stamp),zone),actual=Date.UTC(+p.year,+p.month-1,+p.day,+p.hour,+p.minute,+p.second);stamp+=target-actual;}return new Date(stamp);}
const unescapeText=s=>String(s).replace(/\\[nN]/g,' ').replace(/\\([,;\\])/g,'$1');
export function parseCalendar(text){
 if(!/BEGIN:VCALENDAR/.test(text))throw Error('This is not an ICS calendar file.');const events=[],warnings=[],folded=text.replace(/\r?\n[ \t]/g,'');let skipped=0,recurring=0,cancelled=0;
 for(const raw of folded.split('BEGIN:VEVENT').slice(1)){
  const content=raw.split('END:VEVENT')[0],lines=content.split(/\r?\n/),get=key=>lines.find(l=>new RegExp('^'+key+'(?:;|:)').test(l));
  if(/STATUS:CANCELLED/.test(content)){cancelled++;continue;}if(get('RRULE')){recurring++;continue;}
  const line=get('DTSTART'),summary=get('SUMMARY')?.split(':').slice(1).join(':'),uid=get('UID')?.split(':').slice(1).join(':');
  if(!line||!summary){skipped++;continue;}const colon=line.indexOf(':'),params=line.slice(0,colon),v=line.slice(colon+1),match=v.match(/^(\d{4})(\d{2})(\d{2})(?:T(\d{2})(\d{2})(\d{2})?(Z)?)?$/);
  if(!match){skipped++;continue;}const [,ys,ms,ds,hs,mins,secs,z]=match,y=+ys,m=+ms,d=+ds;
  const checked=new Date(Date.UTC(y,m-1,d));if(checked.getUTCFullYear()!==y||checked.getUTCMonth()!==m-1||checked.getUTCDate()!==d||(hs!==undefined&&(+hs>23||+mins>59||+(secs||0)>59))){skipped++;continue;}
  let dueDate=`${ys}-${ms}-${ds}`,dueTime=1439;
  try{if(hs!==undefined){const zone=z?'UTC':params.match(/TZID=([^;:]+)/)?.[1]?.replace(/^"|"$/g,'')||'America/New_York',instant=toInstant(y,m,d,+hs,+mins,+(secs||0),zone),p=localParts(instant,'America/New_York');dueDate=`${p.year}-${p.month}-${p.day}`;dueTime=+p.hour*60+(+p.minute);}const course=summary.match(/\[([^\]]+)\]\s*$/)?.[1]||'Canvas';events.push({id:uid||summary+v,title:unescapeText(summary.replace(/\s*\[[^\]]+\]\s*$/,'')),course,dueDate,dueTime,minutes:60,done:false,source:'canvas'});}catch{skipped++;}
 }
 if(recurring)warnings.push(`${recurring} recurring entries were skipped; recurring ICS expansion is not connected.`);if(cancelled)warnings.push(`${cancelled} cancelled entries skipped.`);if(skipped)warnings.push(`${skipped} entries had missing or unsupported dates.`);return {events,warnings};
}
