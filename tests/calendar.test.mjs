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

import {normalizeEvents,filterEvents,eventRange,googleCalendarUrl,calendarICS} from '../src/calendar.mjs';
const sample={id:'test',title:'Build practice',starts:Date.parse('2026-10-03T14:00:00Z'),ends:Date.parse('2026-10-03T16:00:00Z'),category:'practice',location:'Workshop'};
test('public schedule validation excludes corrupt rows, deduplicates and limits exposed fields',()=>{
 const events=normalizeEvents([{...sample,internal_note:'private'},{...sample},{...sample,id:'bad',starts:'2026-10-03'},{...sample,id:'backwards',ends:0},{...sample,id:'later',starts:sample.ends,ends:sample.ends+3600000,category:'unexpected',all_day:'0',location:42}]);
 assert.equal(events.length,2);assert.equal(events[0].internal_note,undefined);assert.equal(events[0].all_day,false);assert.equal(events[1].category,'other');assert.equal(events[1].location,'');assert.equal(events[1].all_day,false);
 assert.throws(()=>normalizeEvents({events:[sample]}));assert.throws(()=>normalizeEvents([{id:'invalid'}]));assert.deepEqual(normalizeEvents([]),[]);
});
test('event search combines category, case-insensitive words and location without mutating the schedule',()=>{
 const events=normalizeEvents([sample,{...sample,id:'comp',title:'Qualifier',category:'competition',location:'Sudbury'}]);
 assert.equal(filterEvents(events,'practice','BUILD workshop')[0].id,'test');assert.equal(filterEvents(events,'competition','sudbury').length,1);assert.equal(filterEvents(events,'practice','Qualifier').length,0);assert.equal(filterEvents(events,'all','  ').length,2);assert.equal(events.length,2);
});
test('event detail range displays both times and midnight-spanning end date',()=>{
 assert.match(eventRange(sample),/10:00 a\.m\. – 12:00 p\.m\. ET/);
 const overnight={...sample,starts:Date.parse('2026-10-03T23:00:00Z'),ends:Date.parse('2026-10-04T06:00:00Z')};
 assert.match(eventRange(overnight),/Saturday, October 3.*Sunday, October 4/);
});
test('all-day ranges honor exclusive end dates while showing the final included date',()=>{
 const event={...sample,all_day:true,starts:Date.parse('2026-10-03T00:00:00Z'),ends:Date.parse('2026-10-05T00:00:00Z')};
 assert.match(eventRange(event),/Saturday, October 3 – Sunday, October 4 · All day/);assert.ok(!eventRange(event).includes('October 5'));
});
test('Google Calendar links preserve exact UTC times, all-day date ranges and escaped titles',()=>{
 const timed=new URL(googleCalendarUrl({...sample,title:'Build & test + learn'}));assert.equal(timed.hostname,'calendar.google.com');assert.equal(timed.searchParams.get('text'),'Build & test + learn');assert.equal(timed.searchParams.get('dates'),'20261003T140000Z/20261003T160000Z');assert.equal(timed.searchParams.get('ctz'),'America/Toronto');
 const allDay=new URL(googleCalendarUrl({...sample,all_day:true,starts:Date.parse('2026-10-03T00:00Z'),ends:Date.parse('2026-10-04T00:00Z')}));assert.equal(allDay.searchParams.get('dates'),'20261003/20261004');
});
test('bulk export is one valid calendar with separately identified, UTF-8-folded events',()=>{
 const contents=calendarICS([sample,{...sample,id:'second',title:'Design, build; '+ 'é🌻'.repeat(45)}]);
 assert.equal(contents.match(/BEGIN:VCALENDAR/g).length,1);assert.equal(contents.match(/END:VCALENDAR/g).length,1);assert.equal(contents.match(/BEGIN:VEVENT/g).length,2);assert.equal(contents.match(/END:VEVENT/g).length,2);assert.ok(contents.includes('UID:test@22310.ca'));assert.ok(contents.includes('UID:second@22310.ca'));assert.ok(contents.endsWith('END:VCALENDAR\r\n'));for(const line of contents.split('\r\n'))assert.ok(Buffer.byteLength(line)<=75);
});

import {isUpcoming} from '../src/calendar.mjs';
test('all-day events remain upcoming through Toronto evening despite the UTC date rollover',()=>{
 const event={...sample,all_day:true,starts:Date.parse('2026-10-03T00:00Z'),ends:Date.parse('2026-10-04T00:00Z')};
 assert.equal(isUpcoming(event,Date.parse('2026-10-04T03:59:59Z')),true); // Oct 3, 11:59 p.m. EDT
 assert.equal(isUpcoming(event,Date.parse('2026-10-04T04:00:00Z')),false); // Oct 4 midnight EDT
 const winter={...event,starts:Date.parse('2026-12-03T00:00Z'),ends:Date.parse('2026-12-04T00:00Z')};
 assert.equal(isUpcoming(winter,Date.parse('2026-12-04T04:59:59Z')),true);assert.equal(isUpcoming(winter,Date.parse('2026-12-04T05:00:00Z')),false);
});
test('timed overnight events stay upcoming until their actual end instant',()=>{
 const event={...sample,starts:Date.parse('2026-10-04T03:00Z'),ends:Date.parse('2026-10-04T06:00Z')};
 assert.equal(isUpcoming(event,Date.parse('2026-10-04T05:59:59Z')),true);assert.equal(isUpcoming(event,Date.parse('2026-10-04T06:00Z')),false);
});
