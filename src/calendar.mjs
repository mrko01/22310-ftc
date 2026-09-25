export const escapeHTML = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export const dateKey = (value, allDay=false) => new Intl.DateTimeFormat('en-CA', {timeZone:allDay?'UTC':'America/Toronto'}).format(new Date(value));
export const formatDate = (event, options={weekday:'long',month:'long',day:'numeric'}) => new Intl.DateTimeFormat('en-CA',{timeZone:event.all_day?'UTC':'America/Toronto',...options}).format(new Date(event.starts));
export const timeLabel = event => event.all_day ? 'All day' : new Intl.DateTimeFormat('en-CA',{timeZone:'America/Toronto',hour:'numeric',minute:'2-digit'}).format(new Date(event.starts));
export const eventsOnDay = (events, key) => events.filter(e => dateKey(e.starts,!!e.all_day) <= key && dateKey(Math.max(e.starts,e.ends-1),!!e.all_day) >= key);
export const ics = event => {
  const esc = value => String(value||'').replace(/\\/g,'\\\\').replace(/\r/g,'').replace(/\n/g,'\\n').replace(/,/g,'\\,').replace(/;/g,'\\;');
  const stamp = value => new Date(value).toISOString().replace(/[-:]/g,'').replace(/\.\d{3}/,'');
  const lines = ['BEGIN:VCALENDAR','VERSION:2.0','CALSCALE:GREGORIAN','PRODID:-//EDIT Saffron//Team Calendar//EN','BEGIN:VEVENT','UID:'+esc(event.id)+'@22310.ca','DTSTAMP:'+stamp(Date.now()),event.all_day?'DTSTART;VALUE=DATE:'+dateKey(event.starts,true).replace(/-/g,''):'DTSTART:'+stamp(event.starts),event.all_day?'DTEND;VALUE=DATE:'+dateKey(event.ends,true).replace(/-/g,''):'DTEND:'+stamp(event.ends),'SUMMARY:'+esc(event.title),'LOCATION:'+esc(event.location),'END:VEVENT','END:VCALENDAR'];
  // Fold by UTF-8 octets, preserving multi-byte characters and calendar interoperability.
  const encoder = new TextEncoder();
  return lines.map(line => {let output='',part='',length=0;for(const char of line){const bytes=encoder.encode(char).length;if(length+bytes>75){output+=part+'\r\n';part=' ';length=1;}part+=char;length+=bytes;}return output+part;}).join('\r\n')+'\r\n';
};

export const categories = ['competition','outreach','practice','meeting','other'];
export function normalizeEvents(value) {
  if (!Array.isArray(value)) throw new TypeError('Expected a public schedule');
  const seen=new Set();
  const events=value.filter(e=>e&&typeof e.id==='string'&&e.id.length>0&&typeof e.title==='string'&&e.title.trim()&&Number.isFinite(e.starts)&&Number.isFinite(e.ends)&&e.ends>e.starts&&Math.abs(e.starts)<8.64e15&&Math.abs(e.ends)<8.64e15).map(e=>({id:e.id,title:e.title,starts:e.starts,ends:e.ends,all_day:e.all_day===1||e.all_day===true,category:categories.includes(e.category)?e.category:'other',location:typeof e.location==='string'?e.location:''})).filter(e=>{if(seen.has(e.id))return false;seen.add(e.id);return true;});
  if(value.length&&!events.length)throw new TypeError('Schedule contains no valid events');
  return events.sort((a,b)=>a.starts-b.starts);
}
export function filterEvents(events,category='all',query='') {
  const words=query.trim().toLocaleLowerCase().split(/\s+/).filter(Boolean);
  return events.filter(e=>(category==='all'||e.category===category)&&words.every(word=>[e.title,e.location,e.category].join(' ').toLocaleLowerCase().includes(word)));
}
export function eventRange(event) {
  const start=formatDate(event),end=formatDate({...event,starts:event.all_day?event.ends-1:event.ends});
  if(event.all_day)return start+(dateKey(event.starts,true)!==dateKey(event.ends-1,true)?' – '+end:'')+' · All day';
  return start+' · '+timeLabel(event)+' – '+(dateKey(event.starts)!==dateKey(event.ends)?end+' · ':'')+timeLabel({...event,starts:event.ends})+' ET';
}
export function googleCalendarUrl(event) {
  const stamp=value=>new Date(value).toISOString().replace(/[-:]/g,'').replace(/\.\d{3}/,'');
  const dates=event.all_day?[event.starts,event.ends].map(v=>dateKey(v,true).replace(/-/g,'')).join('/'):[event.starts,event.ends].map(stamp).join('/');
  return 'https://calendar.google.com/calendar/render?'+new URLSearchParams({action:'TEMPLATE',text:event.title,dates,location:event.location||'',ctz:'America/Toronto'});
}
export function calendarICS(events) {
  const entries=events.map(event=>ics(event).split('BEGIN:VEVENT\r\n')[1].split('END:VEVENT\r\n')[0]);
  return ['BEGIN:VCALENDAR','VERSION:2.0','CALSCALE:GREGORIAN','PRODID:-//EDIT Saffron//Team Calendar//EN',...entries.flatMap(entry=>['BEGIN:VEVENT',entry.trimEnd(),'END:VEVENT']),'END:VCALENDAR',''].join('\r\n');
}

// All-day end dates are exclusive UTC date values, but the public calendar day is Toronto's.
export const isUpcoming = (event, now=Date.now()) => event.all_day ? dateKey(event.ends,true)>dateKey(now) : event.ends>now;
