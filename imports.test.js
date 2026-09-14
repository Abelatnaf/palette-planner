import test from 'node:test';
import assert from 'node:assert/strict';
import {parseTime,parseCSV,detectMatrix,parseMatrix,parseTerm,parseCalendar} from './dist/imports.js';
import {addDays,monday,dayDiff} from './dist/data.js';
test('strict time parsing supports military, colon, AM/PM and midnight',()=>{assert.equal(parseTime('0700'),420);assert.equal(parseTime('6:30 PM'),1110);assert.equal(parseTime('2400'),1440);assert.throws(()=>parseTime('24:15'));assert.throws(()=>parseTime('13:30 AM'));});
test('wide matrix imports BOM, title row, semicolon delimiter and en dash',()=>{const d=detectMatrix(parseCSV('\uFEFFWeekly Matrix\nTIME;MON;TUE;WED\n0600–0630;SRC;-;SRC\n'));const events=parseMatrix(d,null,null);assert.equal(events.length,2);assert.equal(events[0].start,360);assert.equal(events[1].day,2);});
test('overnight dated matrix splits Sunday into the next week',()=>{const d=detectMatrix(parseCSV('Day,Start,End,Activity\nSunday,2300,0100,Duty'));const events=parseMatrix(d,{day:0,start:1,end:2,title:3},'2026-09-14');assert.equal(events.length,2);assert.equal(events[0].end,1440);assert.equal(events[1].day,0);assert.equal(events[1].week,'2026-09-21');assert.equal(events[1].end,60);});
test('CSV preserves quoted delimiters and line breaks',()=>{const rows=parseCSV('Day,Start,End,Activity\nMonday,0700,0730,"Duty, \"\"Class B\"\""');assert.equal(rows[1][3],'Duty, "Class B"');});
test('term parser rejects unknown days and supports concatenated day codes',()=>{const data='course_code,title,days,start_time,end_time\nMA-123,Calculus,MOWEFR,10:00,10:50';const events=parseTerm(parseCSV(data));assert.deepEqual(events.map(e=>e.day),[0,2,4]);assert.throws(()=>parseTerm(parseCSV(data.replace('MOWEFR','never'))));});
test('ICS keeps all dated assignments and converts source timezone to Eastern',()=>{const data='BEGIN:VCALENDAR\nBEGIN:VEVENT\nUID:a\nSUMMARY:Essay [ERH-101]\nDTSTART;TZID=America/Los_Angeles:20261102T180000\nEND:VEVENT\nBEGIN:VEVENT\nUID:b\nSUMMARY:All day\nDTSTART;VALUE=DATE:20261201\nEND:VEVENT\nEND:VCALENDAR';const result=parseCalendar(data);assert.equal(result.events.length,2);assert.equal(result.events[0].dueDate,'2026-11-02');assert.equal(result.events[0].dueTime,1260);assert.equal(result.events[0].course,'ERH-101');assert.equal(result.events[1].dueDate,'2026-12-01');assert.equal(result.events[1].dueTime,1439);});
test('ICS expands folded lines and reports unsupported recurrence',()=>{const data='BEGIN:VCALENDAR\nBEGIN:VEVENT\nUID:a\nSUMMARY:A long\n  title\nDTSTART:20260917T170000Z\nEND:VEVENT\nBEGIN:VEVENT\nUID:r\nRRULE:FREQ=WEEKLY\nSUMMARY:Weekly\nDTSTART:20260917T170000Z\nEND:VEVENT\nEND:VCALENDAR';const result=parseCalendar(data);assert.equal(result.events[0].title,'A long title');assert.equal(result.events[0].dueTime,780);assert.equal(result.warnings.length,1);});
test('date arithmetic preserves calendar days across DST and year boundaries',()=>{assert.equal(addDays('2026-11-01',1),'2026-11-02');assert.equal(dayDiff('2026-11-02','2026-10-26'),7);assert.equal(monday('2026-11-01'),'2026-10-26');assert.equal(addDays('2026-12-31',1),'2027-01-01');});
test('midnight matrix endings create one valid block without an empty next-day continuation',()=>{
 for(const end of ['0000','2400']){
  const detected=detectMatrix(parseCSV(`Day,Start,End,Activity\nSunday,2300,${end},Duty`));
  const events=parseMatrix(detected,{day:0,start:1,end:2,title:3},'2026-09-14');
  assert.equal(events.length,1);
  assert.equal(events[0].day,6);
  assert.equal(events[0].start,1380);
  assert.equal(events[0].end,1440);
  assert.equal(events[0].week,'2026-09-14');
 }
});
test('term parser rejects a missing weekday instead of silently dropping a class',()=>{
 const data='course_code,title,days,start_time,end_time\nMA-123,Calculus,,10:00,10:50';
 assert.throws(()=>parseTerm(parseCSV(data)),/Row 2: a weekday is required/);
});
test('ICS rejects impossible dates and times while retaining valid leap-day events',()=>{
 const dates=['20260230T120000','20261301T120000','20260917T250000','20260917T126000','20260917T120061','20280229'];
 const data=`BEGIN:VCALENDAR\n${dates.map((date,i)=>`BEGIN:VEVENT\nUID:${i}\nSUMMARY:Event ${i}\nDTSTART:${date}\nEND:VEVENT`).join('\n')}\nEND:VCALENDAR`;
 const result=parseCalendar(data);
 assert.equal(result.events.length,1);
 assert.equal(result.events[0].dueDate,'2028-02-29');
 assert.deepEqual(result.warnings,['5 entries had missing or unsupported dates.']);
});
