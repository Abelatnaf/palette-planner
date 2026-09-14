import {PDFDocument,StandardFonts,rgb} from './vendor/pdf-lib.js';
import {days,short,formatDate,addDays,clock,hours} from './data.js';
import {layoutOverlaps} from './planning.js';
const colors={ink:rgb(.15,.18,.14),muted:rgb(.43,.48,.39),line:rgb(.82,.85,.78),paper:rgb(.97,.98,.95),corps:rgb(.64,.40,.24),class:rgb(.36,.47,.56),study:rgb(.40,.53,.31),personal:rgb(.52,.46,.60)};
const safe=s=>String(s??'').replace(/[‘’]/g,"'").replace(/[“”]/g,'"').replace(/[–—]/g,'-').replace(/…/g,'...').replace(/[^\x20-\x7E\xA0-\xFF]/g,'?');
export async function createPlanPDF({week,plan,tasks,name='Your weekly plan'}) {
 const doc=await PDFDocument.create(),sans=await doc.embedFont(StandardFonts.Helvetica),bold=await doc.embedFont(StandardFonts.HelveticaBold),serif=await doc.embedFont(StandardFonts.TimesRoman),italic=await doc.embedFont(StandardFonts.TimesRomanItalic);
 doc.setTitle(`Palette - ${week}`);doc.setAuthor('Palette Planner');doc.setSubject('Weekly schedule, daily agenda and deadlines');
 const pages=[],margin=32,W=792,H=612,range=`${formatDate(week,{month:'short',day:'numeric'})} - ${formatDate(addDays(week,6),{month:'short',day:'numeric',year:'numeric'})}`;
 const text=(page,s,x,y,size=10,font=sans,color=colors.ink)=>page.drawText(safe(s),{x,y,size,font,color});
 const line=(p,x1,y1,x2,y2,color=colors.line,width=.5,dashArray)=>p.drawLine({start:{x:x1,y:y1},end:{x:x2,y:y2},color,thickness:width,dashArray});
 const wrap=(s,width,size=9,font=sans)=>{const words=safe(s).split(/\s+/),lines=[];let row='';for(const word of words){if(font.widthOfTextAtSize((row?row+' ':'')+word,size)>width&&row){lines.push(row);row='';}if(font.widthOfTextAtSize(word,size)>width){let token='';for(const c of word){if(font.widthOfTextAtSize(token+c,size)>width){if(row){lines.push(row);row='';}lines.push(token);token='';}token+=c;}row+=(row?' ':'')+token;}else row+=(row?' ':'')+word;}if(row)lines.push(row);return lines;};
 const fit=(s,width,size,font=sans)=>{s=safe(s);while(s.length&&font.widthOfTextAtSize(s,size)>width)s=s.slice(0,-1);return s;};
 function page(title,subtitle){const p=doc.addPage([W,H]);pages.push(p);text(p,'PALETTE / MAKE SPACE',margin,580,8,bold,colors.muted);text(p,title,margin,548,28,serif);text(p,subtitle||range,margin,527,9,sans,colors.muted);line(p,margin,515,W-margin,515);return p;}
 let p=page('Your week, on paper.',range+'  /  '+name),gridX=64,gridY=61,gridW=696,gridH=414,colW=gridW/7;
 const start=Math.min(300,...plan.blocks.map(b=>Math.floor(b.start/60)*60)),end=Math.max(1410,...plan.blocks.map(b=>Math.ceil(b.end/30)*30)),scale=gridH/(end-start),lanes=layoutOverlaps(plan.blocks);
 for(let i=0;i<7;i++){text(p,short[i].toUpperCase(),gridX+i*colW+6,493,8,bold,colors.muted);text(p,Number(addDays(week,i).slice(-2)),gridX+i*colW+6,478,13,serif);line(p,gridX+i*colW,gridY,gridX+i*colW,gridY+gridH);}
 line(p,gridX+gridW,gridY,gridX+gridW,gridY+gridH);
 for(let minute=start;minute<=end;minute+=30){const y=gridY+gridH-(minute-start)*scale;line(p,gridX,y,gridX+gridW,y,colors.line,minute%60===0?.55:.25);if(minute%60===0)text(p,clock(minute),margin,y-2,6.7,sans,colors.muted);}
 for(const b of plan.blocks){const lane=lanes.get(b.id)||{lane:0,lanes:1},x=gridX+b.day*colW+lane.lane*colW/lane.lanes+2,width=colW/lane.lanes-4,y=gridY+gridH-(b.end-start)*scale,height=Math.max(3,(b.end-b.start)*scale-1),color=colors[b.kind]||colors.study;
  p.drawRectangle({x,y,width,height,color:colors.paper,borderColor:color,borderWidth:.5});line(p,x,y,x,y+height,color,1.7,b.hard?undefined:[2,2]);
  const size=height<14?6:6.6,lineHeight=size+1,label=wrap((height<14||lane.lanes>1)&&b.course?b.course:b.title,width-6,size,bold),available=Math.max(0,Math.floor((height-1)/lineHeight));for(let j=0;j<Math.min(available,label.length,3);j++)text(p,fit(label[j],width-6,size,bold),x+3,y+height-size-1-j*lineHeight,size,bold);
 }
 text(p,'Solid edge: fixed commitment     Dashed edge: flexible study',margin,43,7,sans,colors.muted);
 p=page('A day at a time.','Check off your commitments and carry the useful page with you.');
 const columnW=228,gap=22,weights=days.map((_,day)=>46+plan.blocks.filter(b=>b.day===day).reduce((sum,b)=>sum+wrap(b.title,columnW-80,8.5).length*10+8,0));
 let dayGroups=[[0,1],[2,3],[4,5,6]],best=Infinity;
 for(let a=1;a<6;a++)for(let b=a+1;b<7;b++){const groups=[days.map((_,i)=>i).slice(0,a),days.map((_,i)=>i).slice(a,b),days.map((_,i)=>i).slice(b)],score=Math.max(...groups.map(g=>g.reduce((s,i)=>s+weights[i],0)));if(score<best){best=score;dayGroups=groups;}}
 for(let col=0;col<3;col++){let y=488,x=margin+col*(columnW+gap);for(const day of dayGroups[col]){
  const blocks=plan.blocks.filter(b=>b.day===day).sort((a,b)=>a.start-b.start||a.end-b.end);const estimated=33+blocks.reduce((sum,b)=>sum+Math.max(1,wrap(b.title,columnW-80,8.5).length)*10+8,0);
  if(y-estimated<40){p=page('Daily agenda / continued',range);y=488;}
  text(p,days[day],x,y,18,serif);text(p,formatDate(addDays(week,day),{month:'short',day:'numeric'}),x+columnW-48,y+2,8,sans,colors.muted);y-=14;line(p,x,y,x+columnW,y);y-=15;
  if(!blocks.length){text(p,'Open space. Keep it yours.',x,y,9,italic,colors.muted);y-=22;}
  for(const b of blocks){const rows=wrap(b.title,columnW-80,8.5);if(y-rows.length*10<40){p=page('Daily agenda / continued',range);y=488;}p.drawRectangle({x,y:y-1,width:6,height:6,borderColor:colors.muted,borderWidth:.6});text(p,clock(b.start)+'-'+clock(b.end),x+12,y,7.2,sans,colors.muted);rows.forEach((row,j)=>text(p,row,x+76,y-j*10,8.5));y-=rows.length*10+8;}y-=17;
 }}
 p=page('Deadlines & loose ends.',range+'  /  Keep the whole picture in view.');let y=485;
 const widths=[292,105,155,72,104],xs=[32,324,429,584,656];
 function tableHeader(){['Assignment','Course','Due','Effort','Status'].forEach((label,i)=>text(p,label,xs[i],y,8,bold,colors.muted));y-=10;line(p,margin,y,W-margin,y);y-=17;}
 tableHeader();
 for(const t of tasks){const title=wrap(t.title,widths[0]-14,9),course=wrap(t.course,widths[1]-14,8),height=Math.max(title.length,course.length)*11+17;if(y-height<65){p=page('Deadlines / continued',range);y=485;tableHeader();}
  title.forEach((row,i)=>text(p,row,xs[0],y-i*11,9));course.forEach((row,i)=>text(p,row,xs[1],y-i*11,8,sans,colors.muted));text(p,formatDate(t.dueDate,{month:'short',day:'numeric'})+' '+clock(t.dueTime),xs[2],y,8);text(p,t.minutes+' min',xs[3],y,8);text(p,t.done?'Complete':t.overdue?'Overdue':plan.unplaced.some(u=>u.taskId===t.id)?'Needs room':'Scheduled',xs[4],y,8);y-=height;line(p,margin,y+9,W-margin,y+9);
 }
 if(!tasks.length){text(p,'No assignment deadlines in this plan.',margin,y,10,italic,colors.muted);y-=30;}
 y-=20;
 const notes=[...plan.conflicts.map(([a,b])=>`${days[a.day]} ${clock(Math.max(a.start,b.start))}: ${a.title} overlaps ${b.title}.`),...(plan.violations||[]).map(v=>v.note),...plan.unplaced.map(u=>`${u.title}: ${u.minutes} min unplaced. ${u.reason||''}`)];
 if(y<95){p=page('Loose ends / continued',range);y=485;}
 text(p,'Things to resolve',margin,y,18,serif);y-=22;
 for(const note of notes.length?notes:['No conflicts or unplaced work in this plan.']){const rows=wrap(note,W-margin*2-18,9);if(y-rows.length*12<40){p=page('Loose ends / continued',range);y=485;}text(p,'-',margin,y,9,bold);rows.forEach((row,i)=>text(p,row,margin+12,y-i*12,9,sans,colors.muted));y-=rows.length*12+12;}
 pages.forEach((p,i)=>{line(p,margin,29,W-margin,29);text(p,'PALETTE  /  '+week,margin,17,7,sans,colors.muted);text(p,`${i+1} / ${pages.length}`,W-margin-25,17,7,sans,colors.muted);});
 return doc.save();
}
