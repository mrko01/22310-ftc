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
