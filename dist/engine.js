export const ENGINE_VERSION = '2.1.0';
export function generate(hard, tasks, prefs, locked = [], {notBefore=0} = {}) {
  const active = tasks.filter(t => !t.done), byId = new Map(active.map(t => [t.id, t]));
  const pins = locked.filter(b => byId.has(b.taskId)).map(b => ({ ...b, title: byId.get(b.taskId).title, course: byId.get(b.taskId).course, locked: true }));
  const blocks = [...hard.map(x => ({ ...x })), ...pins], unplaced = [], conflicts = [], violations = [];
  const overlap = (a, b) => a.day === b.day && a.start < b.end && b.start < a.end;
  for (let i = 0; i < blocks.length; i++) for (let j = i + 1; j < blocks.length; j++) if (overlap(blocks[i], blocks[j])) conflicts.push([blocks[i], blocks[j]]);
  const loads = Array(7).fill(0), meals = prefs.meals || [[720, 780], [1080, 1140]];
  pins.forEach(b => {
    loads[b.day] += b.end - b.start;
    if (b.day * 1440 + b.end > byId.get(b.taskId).due - prefs.lead * 60) violations.push({ id: b.id, note: `${b.title}: locked time is past the deadline buffer.` });
    if (b.start < prefs.wake || b.end > prefs.sleep || meals.some(([s, e]) => b.start < e && b.end > s)) violations.push({ id: b.id, note: `${b.title}: locked time overlaps a protected daily window.` });
  });
  loads.forEach((load, d) => { if (load > prefs.maxDaily) violations.push({ id: `day-${d}`, note: `Day ${d + 1}: locked study exceeds the daily limit.` }); });
  for (const task of [...active].sort((a, b) => a.due - b.due || (b.priority || 0) - (a.priority || 0) || a.id.localeCompare(b.id))) {
    const pinned = pins.filter(b => b.taskId === task.id).reduce((s, b) => s + b.end - b.start, 0);
    if (pinned > task.minutes) violations.push({ id: task.id, note: `${task.title}: locked time exceeds the effort estimate.` });
    let remaining = Math.max(0, task.minutes - pinned), part = 0;
    if(remaining&&task.due-prefs.lead*60<=notBefore){unplaced.push({taskId:task.id,title:task.title,minutes:remaining,reason:task.due<=notBefore?'This deadline has passed. Update the due date or mark the assignment complete.':'The deadline buffer has already passed. Adjust the buffer or deadline to make room.'});continue;}
    while (remaining > 0) {
      const candidates = [];
      for (let day = 0; day < 7; day++) {
        const dailyRoom = prefs.maxDaily - loads[day];
        if (dailyRoom <= 0) continue;
        for (let start = Math.max(prefs.wake,Math.ceil((notBefore-day*1440)/5)*5); start < prefs.sleep; start += 5) {
          const deadline = task.due - prefs.lead * 60 - day * 1440;
          let room = Math.min(prefs.sleep, deadline) - start;
          for (const b of blocks.filter(b => b.day === day)) {
            if (start >= b.start - prefs.buffer && start < b.end + prefs.buffer) { room = 0; break; }
            if (b.start - prefs.buffer > start) room = Math.min(room, b.start - prefs.buffer - start);
          }
          for (const [s, e] of meals) { if (start >= s && start < e) room = 0; else if (s > start) room = Math.min(room, s - start); }
          let size = Math.floor(Math.min(prefs.maxBlock, remaining, dailyRoom, room) / 5) * 5;
          const minimum=prefs.minBlock||25;
          if(remaining>size&&remaining-size<minimum)size=Math.floor((remaining-minimum)/5)*5;
          if (size < Math.min(prefs.minBlock || 25, remaining) || size <= 0) continue;
          const penalty = prefs.strategy === 'balanced' ? loads[day] * 8 + day * 30 + Math.abs(start - 900) * .05 : day * 1440 + start;
          candidates.push({ day, start, end: start + size, size, penalty });
        }
      }
      candidates.sort((a, b) => a.penalty - b.penalty || b.size - a.size || a.day - b.day || a.start - b.start);
      const slot = candidates[0];
      if (!slot) { unplaced.push({ taskId: task.id, title: task.title, minutes: remaining, reason: 'No available window meets your deadline and study limits.' }); break; }
      while (blocks.some(b => b.id === `${task.id}-${part}`)) part++;
      blocks.push({ day: slot.day, start: slot.start, end: slot.end, id: `${task.id}-${part++}`, taskId: task.id, title: task.title, course: task.course, kind: 'study', hard: false });
      loads[slot.day] += slot.size; remaining -= slot.size;
    }
  }
  return { blocks, conflicts, unplaced, violations, version: ENGINE_VERSION };
}
