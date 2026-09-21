import test from 'node:test';
import assert from 'node:assert/strict';
import {dateKey,eventsOnDay,ics,escapeHTML,timeLabel} from '../src/calendar.mjs';
test('all-day calendar dates remain date-only across timezone boundaries',()=>{
 const e={id:'day',title:'Workshop',all_day:1,starts:Date.parse('2026-09-21T00:00Z'),ends:Date.parse('2026-09-22T00:00Z')};
 assert.equal(dateKey(e.starts,true),'2026-09-21');assert.equal(eventsOnDay([e],'2026-09-21').length,1);assert.equal(eventsOnDay([e],'2026-09-22').length,0);assert.equal(timeLabel(e),'All day');assert.match(ics(e),/DTSTART;VALUE=DATE:20260921\r\nDTEND;VALUE=DATE:20260922/);
});
test('timed events use Toronto dates and export UTC times',()=>{
 const e={id:'timed',title:'Practice',starts:Date.parse('2026-09-21T00:30Z'),ends:Date.parse('2026-09-21T01:30Z')};
 assert.equal(dateKey(e.starts),'2026-09-20');assert.equal(eventsOnDay([e],'2026-09-20').length,1);assert.match(ics(e),/DTSTART:20260921T003000Z/);
});
test('calendar export escapes fields and folds UTF-8 by octet count',()=>{
 const e={id:'safe',title:'Robotics, design; '+ 'é🌻'.repeat(45)+'\nNext line',location:'Room 1; north',starts:0,ends:3600000};
 const result=ics(e);assert.match(result,/SUMMARY:Robotics\\, design\\;/);assert.match(result,/LOCATION:Room 1\\; north/);assert.ok(result.includes('\\nNext line'));for(const line of result.split('\r\n'))assert.ok(Buffer.byteLength(line)<=75);assert.ok(!result.includes('�'));
});
test('untrusted event text is escaped before HTML rendering',()=>{
 assert.equal(escapeHTML('<img onerror="x">'), '&lt;img onerror=&quot;x&quot;&gt;');assert.equal(escapeHTML("O'Reilly & team"),'O&#39;Reilly &amp; team');
});
