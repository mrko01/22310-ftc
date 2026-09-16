const reduced=matchMedia('(prefers-reduced-motion: reduce)');
let paused=reduced.matches;
const menu=document.querySelector('.menu-button'),nav=document.querySelector('.site-nav');
menu?.addEventListener('click',()=>{const open=menu.getAttribute('aria-expanded')!=='true';menu.setAttribute('aria-expanded',String(open));menu.setAttribute('aria-label',open?'Close menu':'Open menu');nav.classList.toggle('open',open);menu.textContent=open?'×':'☰';});
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&nav?.classList.contains('open'))menu.click();});
if(!paused){document.documentElement.classList.add('js-motion');const observer=new IntersectionObserver(entries=>entries.forEach(e=>{if(e.isIntersecting){e.target.classList.add('visible');observer.unobserve(e.target);}}),{threshold:.1});document.querySelectorAll('.reveal').forEach(el=>observer.observe(el));}
const toggle=document.querySelector('#motion-toggle');
const syncMotion=()=>{document.documentElement.classList.toggle('pause-all',paused);if(toggle){toggle.textContent=paused?'Resume motion':'Pause motion';toggle.setAttribute('aria-pressed',String(paused));}};
toggle?.addEventListener('click',()=>{paused=!paused;syncMotion();});reduced.addEventListener('change',()=>{paused=reduced.matches;syncMotion();});syncMotion();
const API=location.hostname==='localhost'||location.hostname==='127.0.0.1'?'http://localhost:8790':'https://team.22310.ca';
const escape=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const dateKey=(v,allDay=false)=>allDay?new Date(v).toISOString().slice(0,10):new Intl.DateTimeFormat('en-CA',{timeZone:'America/Toronto'}).format(new Date(v));
const datePart=(v,part,allDay=false)=>new Intl.DateTimeFormat('en-CA',{timeZone:allDay?'UTC':'America/Toronto',[part]:part==='day'?'numeric':'short'}).format(new Date(v));
const timeLabel=e=>e.all_day?'All day':new Intl.DateTimeFormat('en-CA',{timeZone:'America/Toronto',hour:'numeric',minute:'2-digit'}).format(new Date(e.starts));
function ics(e){const esc=v=>String(v||'').replace(/\\/g,'\\\\').replace(/\r/g,'').replace(/\n/g,'\\n').replace(/,/g,'\\,').replace(/;/g,'\\;');const stamp=v=>new Date(v).toISOString().replace(/[-:]/g,'').replace(/\.\d{3}/,'');return ['BEGIN:VCALENDAR','VERSION:2.0','PRODID:-//EDIT Saffron//Team Calendar//EN','BEGIN:VEVENT','UID:'+e.id+'@22310.ca','DTSTAMP:'+stamp(Date.now()),e.all_day?'DTSTART;VALUE=DATE:'+dateKey(e.starts,true).replace(/-/g,''):'DTSTART:'+stamp(e.starts),e.all_day?'DTEND;VALUE=DATE:'+dateKey(e.ends,true).replace(/-/g,''):'DTEND:'+stamp(e.ends),'SUMMARY:'+esc(e.title),'LOCATION:'+esc(e.location),'END:VEVENT','END:VCALENDAR',''].join('\r\n');}
const calendar=document.querySelector('[data-events]');
if(calendar){
 let events=[],loading=false,queued=false,view=calendar.dataset.events==='all'?'month':'agenda',month=new Date(new Date().getFullYear(),new Date().getMonth(),1),failed=false,ready=false;
 const status=document.querySelector('#calendar-status'),filter=document.querySelector('#event-category');
 const updateStatus=(text)=>{if(status)status.textContent=text;};
 const render=()=>{
  if(!ready&&!failed)return;
  const selected=events.filter(e=>!filter||filter.value==='all'||filter.value===e.category);
  const data=calendar.dataset.events==='preview'?selected.slice(0,3):selected;
  if(failed&&!ready){calendar.innerHTML='<div class="event-empty"><h3>The schedule couldn’t load.</h3><p>Please try again in a moment. <button class="text-link" id="retry-calendar">Try again ↗</button></p></div>';document.querySelector('#retry-calendar').onclick=load;return;}
  if(view==='month'){
   document.querySelector('#month-title').textContent=month.toLocaleDateString('en-CA',{month:'long',year:'numeric'});
   const start=new Date(month);start.setDate(1-start.getDay());
   const days=Array.from({length:42},(_,i)=>{const d=new Date(start);d.setDate(start.getDate()+i);const key=`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;const matches=data.filter(e=>dateKey(e.starts,!!e.all_day)<=key&&dateKey(e.ends-1,!!e.all_day)>=key);return `<div class="calendar-day ${d.getMonth()!==month.getMonth()?'outside':''} ${key===dateKey(Date.now())?'today':''}"><span>${d.getDate()}</span>${matches.map(e=>`<a class="calendar-item" href="#" data-ics="${escape(e.id)}" title="${escape(e.title+' · '+timeLabel(e)+' · Add to calendar')}">${escape(e.title)}</a>`).join('')}</div>`;});
   calendar.innerHTML=`<div class="calendar-grid">${['SUN','MON','TUE','WED','THU','FRI','SAT'].map(d=>`<div class="calendar-weekday">${d}</div>`).join('')}${days.join('')}</div>`;
  } else calendar.innerHTML=data.length?data.map(e=>`<article class="event-row"><div class="event-date"><strong>${datePart(e.starts,'day',!!e.all_day)}</strong><span>${datePart(e.starts,'month',!!e.all_day)}</span></div><div><h3>${escape(e.title)}</h3><p>${escape(timeLabel(e))}${e.location?' · '+escape(e.location):''} · ${escape(e.category)}</p></div><a href="#" data-ics="${escape(e.id)}" aria-label="Add ${escape(e.title)} to your calendar">Add to calendar ↗</a></article>`).join(''):`<div class="event-empty"><h3>${filter&&filter.value!=='all'?'No events in this category.':'No public events scheduled yet.'}</h3><p>New dates will appear here. You can also <a class="text-link" href="/contact/">get in touch ↗</a>.</p></div>`;
  calendar.querySelectorAll('[data-ics]').forEach(a=>a.addEventListener('click',ev=>{ev.preventDefault();const e=events.find(e=>e.id===a.dataset.ics);if(!e)return;const url=URL.createObjectURL(new Blob([ics(e)],{type:'text/calendar'})),download=document.createElement('a');download.href=url;download.download='22310-event.ics';download.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}));
 };
 async function load(){if(loading){queued=true;return;}loading=true;try{const r=await fetch(API+'/api/public/calendar');if(!r.ok)throw new Error();events=await r.json();failed=false;ready=true;render();if(!socket||socket.readyState!==WebSocket.OPEN)updateStatus('Calendar synced · reconnecting live updates');}catch{failed=true;render();updateStatus('Schedule unavailable · retrying');}finally{loading=false;if(queued){queued=false;load();}}}
 let socket,timer,attempts=0;
 const connect=()=>{socket=new WebSocket(API.replace(/^http/,'ws')+'/api/public/live');socket.onopen=()=>{attempts=0;load();updateStatus('● Live from the team calendar');};socket.onmessage=ev=>{try{if(JSON.parse(ev.data).type==='change')load();}catch{}};socket.onclose=()=>{updateStatus('Calendar synced · reconnecting live updates');timer=setTimeout(connect,Math.min(30000,1000*2**attempts++));};socket.onerror=()=>socket.close();};
 load();connect();setInterval(()=>{if(!document.hidden){if(socket?.readyState===WebSocket.OPEN)socket.send('ping');else load();}},30000);
 document.addEventListener('visibilitychange',()=>{if(!document.hidden)load();});window.addEventListener('pagehide',()=>{clearTimeout(timer);if(socket){socket.onclose=null;socket.close();}});
 filter?.addEventListener('change',render);
 document.querySelector('#previous-month')?.addEventListener('click',()=>{month=new Date(month.getFullYear(),month.getMonth()-1,1);render();});document.querySelector('#next-month')?.addEventListener('click',()=>{month=new Date(month.getFullYear(),month.getMonth()+1,1);render();});document.querySelector('#today-month')?.addEventListener('click',()=>{month=new Date(new Date().getFullYear(),new Date().getMonth(),1);render();});
}
const form=document.querySelector('#contact-form');
if(form){let sending=false;const message=document.querySelector('#contact-message'),button=form.querySelector('button[type=submit]');form.addEventListener('submit',async e=>{e.preventDefault();if(sending)return;sending=true;button.disabled=true;button.textContent='Sending…';message.textContent='';try{const setup=await fetch(API+'/api/public/contact-token',{credentials:'include'});if(!setup.ok)throw new Error('Contact is temporarily unavailable. Please try again.');const data=Object.fromEntries(new FormData(form));const response=await fetch(API+'/api/public/contact',{method:'POST',credentials:'include',headers:{'Content-Type':'application/json'},body:JSON.stringify(data)});const result=await response.json();if(!response.ok)throw new Error(result.error||'Your message could not be sent. Please try again.');message.textContent='Message sent. Thanks for reaching out — your message is in our team inbox.';form.reset();}catch(error){message.textContent=error.message||'Could not connect. Please check your connection and try again.';}finally{sending=false;button.disabled=false;button.innerHTML='Send message <span class="arrow" aria-hidden="true">↗</span>';}});}

// The character is a digital team mascot, not the team's competition robot.
if(document.querySelector('#robot')) {
  const sceneModule='./mascot.bundle.js?v=593c7cb19493';
  const loadScene=()=>import(sceneModule).catch(()=>import(sceneModule+(sceneModule.includes('?')?'&':'?')+'retry=1'));
  loadScene().then(({startMascot})=>startMascot(()=>paused)).catch(error=>{
    console.warn('The 3D scene could not start; showing the illustrated mascot.',error);
    const fallback=document.querySelector('.mascot-fallback');if(fallback)fallback.hidden=false;
    document.querySelector('#robot').hidden=true;
    document.querySelector('#explode-toggle').hidden=true;
  });
}
