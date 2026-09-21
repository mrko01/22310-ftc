import { escapeHTML as escape, dateKey, formatDate, timeLabel, eventsOnDay, ics } from './calendar.mjs';
const reduced = matchMedia('(prefers-reduced-motion: reduce)');
let paused = reduced.matches;
const menu = document.querySelector('.menu-button'), nav = document.querySelector('.site-nav');
function closeMenu(){menu?.setAttribute('aria-expanded','false');menu?.setAttribute('aria-label','Open menu');nav?.classList.remove('open');}
menu?.addEventListener('click',()=>{const open=menu.getAttribute('aria-expanded')!=='true';menu.setAttribute('aria-expanded',String(open));menu.setAttribute('aria-label',open?'Close menu':'Open menu');nav.classList.toggle('open',open);if(open)nav.querySelector('a')?.focus();});
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&nav?.classList.contains('open')){closeMenu();menu.focus();}});
document.addEventListener('click',e=>{if(!e.target.closest('.site-header'))closeMenu();});
nav?.querySelectorAll('a').forEach(a=>a.addEventListener('click',closeMenu));
matchMedia('(min-width:761px)').addEventListener('change',closeMenu);
const toggle=document.querySelector('#motion-toggle');
function syncMotion(){if(toggle){toggle.textContent=paused?'Resume motion':'Pause motion';toggle.setAttribute('aria-pressed',String(paused));}}
toggle?.addEventListener('click',()=>{paused=!paused;syncMotion();});reduced.addEventListener('change',()=>{paused=reduced.matches;syncMotion();});syncMotion();
const API = document.querySelector('meta[name="saffron-api"]')?.content || 'https://team.22310.ca';
const calendar=document.querySelector('[data-events]');
if(calendar){
  let events=[],ready=false,busy=false,queued=false,view='agenda',month=new Date(new Date().getFullYear(),new Date().getMonth(),1),timer;
  const isPreview=calendar.dataset.events==='preview',filter=document.querySelector('#event-category'),status=document.querySelector('#calendar-status'),dialog=document.querySelector('#event-dialog');
  let selectedId=null;
  function openEvent(id){const event=events.find(e=>e.id===id);if(!event)return;selectedId=id;document.querySelector('#event-detail-title').textContent=event.title;document.querySelector('#event-detail-category').textContent=event.category.charAt(0).toUpperCase()+event.category.slice(1);document.querySelector('#event-detail-time').textContent=formatDate(event)+(!event.all_day?' · '+timeLabel(event)+' ET':' · All day');document.querySelector('#event-detail-location').textContent=event.location||'';if(!dialog.open)dialog.showModal();}
  dialog?.querySelector('.dialog-close').addEventListener('click',()=>dialog.close());
  dialog?.addEventListener('click',e=>{if(e.target===dialog){const r=dialog.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)dialog.close();}});
  document.querySelector('#event-detail-save')?.addEventListener('click',()=>{const event=events.find(e=>e.id===selectedId);if(!event)return;const url=URL.createObjectURL(new Blob([ics(event)],{type:'text/calendar;charset=utf-8'})),a=document.createElement('a');a.href=url;a.download='saffron-event.ics';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);});
  function render(){
    const focused=document.activeElement;
    const focusedId=calendar.contains(focused)?focused?.dataset.event:null;
    const focusedClass=focused?.className;
    let selected=events.filter(e=>!filter||filter.value==='all'||e.category===filter.value).sort((a,b)=>a.starts-b.starts);
    if(isPreview)selected=selected.filter(e=>e.ends>Date.now()).slice(0,3);
    const monthControls=document.querySelector('#month-controls');if(monthControls)monthControls.hidden=view!=='month';
    document.querySelectorAll('[data-view]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.view===view)));
    if(view==='month'){
      document.querySelector('#month-title').textContent=month.toLocaleDateString('en-CA',{month:'long',year:'numeric'});
      const start=new Date(month);start.setDate(1-start.getDay());
      calendar.innerHTML='<div class="calendar-grid">'+['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map(day=>'<div class="calendar-weekday">'+day+'</div>').join('')+Array.from({length:42},(_,i)=>{const day=new Date(start);day.setDate(day.getDate()+i);const key=`${day.getFullYear()}-${String(day.getMonth()+1).padStart(2,'0')}-${String(day.getDate()).padStart(2,'0')}`;return `<div class="calendar-day ${day.getMonth()!==month.getMonth()?'outside':''} ${key===dateKey(Date.now())?'today':''}"><span>${day.getDate()}</span>${eventsOnDay(selected,key).map(e=>`<button class="calendar-item" data-event="${escape(e.id)}" aria-label="${escape(e.title+', '+formatDate({...e,starts:day.getTime()}))}">${escape(e.title)}</button>`).join('')}</div>`;}).join('')+'</div>';
    }else{
      selected=selected.filter(e=>e.ends>Date.now());
      calendar.innerHTML=selected.length?selected.map(e=>`<article class="event-row"><div class="event-date"><strong>${formatDate(e,{day:'numeric'})}</strong><span>${formatDate(e,{month:'short'})}</span></div><div><h3><button data-event="${escape(e.id)}">${escape(e.title)}</button></h3><p>${escape(timeLabel(e))}${e.location?' · '+escape(e.location):''}</p></div><button class="event-open" data-event="${escape(e.id)}" aria-label="View ${escape(e.title)}"><svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="m8 5 7 7-7 7" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg></button></article>`).join(''):`<div class="event-empty"><h3>${filter?.value!=='all'&&filter?'No upcoming events in this category.':'No upcoming events yet.'}</h3><p>Check back for new dates.</p></div>`;
    }
    calendar.querySelectorAll('[data-event]').forEach(button=>button.addEventListener('click',()=>openEvent(button.dataset.event)));
    if(focusedId)Array.from(calendar.querySelectorAll('[data-event]')).find(button=>button.dataset.event===focusedId&&button.className===focusedClass)?.focus({preventScroll:true});
    if(dialog?.open){if(events.some(e=>e.id===selectedId))openEvent(selectedId);else dialog.close();}
  }
  async function load(){
    if(busy){queued=true;return;}busy=true;
    try{const response=await fetch(API+'/api/public/calendar');if(!response.ok)throw new Error();const result=await response.json();if(!Array.isArray(result))throw new Error();events=result;ready=true;render();if(status)status.textContent='';}
    catch{if(status)status.textContent=ready?'Updates are temporarily unavailable. Showing the last schedule.':'The schedule couldn’t load.';if(!ready){calendar.innerHTML='<div class="event-empty"><h3>The schedule couldn’t load.</h3><button class="text-link" id="retry-calendar">Try again ↗</button></div>';document.querySelector('#retry-calendar').addEventListener('click',load);}}
    finally{busy=false;if(queued){queued=false;void load();}}
  }
  let socket,retryTimer,pingTimer,retries=0,stopped=false;
  const closeLive=()=>{clearTimeout(retryTimer);clearInterval(pingTimer);const current=socket;socket=null;if(current){current.onclose=null;current.close();}};
  function connectLive(){
    if(stopped||document.hidden||socket||!navigator.onLine||location.hostname!=='22310.ca')return;
    const url=new URL('/api/public/live',API);url.protocol=url.protocol==='https:'?'wss:':'ws:';
    try{
      const connection=new WebSocket(url);socket=connection;
      socket.onopen=()=>{if(socket!==connection)return;retries=0;load();pingTimer=setInterval(()=>{if(connection.readyState===WebSocket.OPEN)connection.send('ping');},25000);};
      socket.onmessage=event=>{try{const packet=JSON.parse(event.data);if(packet.type==='change'&&packet.topic==='calendar')load();}catch{}};
      socket.onclose=()=>{if(socket!==connection)return;socket=null;clearInterval(pingTimer);if(!stopped&&!document.hidden)retryTimer=setTimeout(connectLive,Math.min(60000,1500*2**Math.min(retries++,5)));};
      socket.onerror=()=>connection.close();
    }catch{socket=null;}
  }
  function start(){stopped=false;load();connectLive();clearInterval(timer);timer=setInterval(()=>{if(!document.hidden)load();},60000);}
  start();
  const wake=()=>{if(document.hidden)closeLive();else{load();connectLive();}};
  document.addEventListener('visibilitychange',wake);window.addEventListener('online',wake);
  window.addEventListener('offline',closeLive);
  window.addEventListener('pagehide',()=>{stopped=true;closeLive();clearInterval(timer);});
  window.addEventListener('pageshow',e=>{if(e.persisted)start();});
  filter?.addEventListener('change',()=>{if(ready)render();});
  document.querySelectorAll('[data-view]').forEach(b=>b.addEventListener('click',()=>{view=b.dataset.view;if(ready)render();}));
  document.querySelector('#previous-month')?.addEventListener('click',()=>{month=new Date(month.getFullYear(),month.getMonth()-1,1);if(ready)render();});
  document.querySelector('#next-month')?.addEventListener('click',()=>{month=new Date(month.getFullYear(),month.getMonth()+1,1);if(ready)render();});
  document.querySelector('#today-month')?.addEventListener('click',()=>{month=new Date(new Date().getFullYear(),new Date().getMonth(),1);if(ready)render();});
}
const form=document.querySelector('#contact-form');
if(form){let sending=false;const message=document.querySelector('#contact-message'),button=form.querySelector('button[type=submit]'),label=button.innerHTML;
  form.addEventListener('submit',async e=>{e.preventDefault();if(sending)return;sending=true;button.disabled=true;button.textContent='Sending…';message.textContent='';message.classList.remove('error');
    try{const setup=await fetch(API+'/api/public/contact-token',{credentials:'include'});if(!setup.ok)throw new Error('Contact is temporarily unavailable. Please try again.');const response=await fetch(API+'/api/public/contact',{method:'POST',credentials:'include',headers:{'Content-Type':'application/json'},body:JSON.stringify(Object.fromEntries(new FormData(form)))});const result=await response.json();if(!response.ok)throw new Error(result.error||'Your message couldn’t be sent. Please try again.');message.textContent='Message sent. Thank you for getting in touch.';form.reset();}
    catch(error){message.classList.add('error');message.textContent=error.message||'Check your connection and try again.';}
    finally{sending=false;button.disabled=false;button.innerHTML=label;}
  });
}
// Load the scene after the main interface paints. Keep the illustration if WebGL fails.
if(document.querySelector('#robot')){
  const loadScene=()=>import('./mascot.bundle.js').then(({startMascot})=>{startMascot(()=>paused);document.querySelector('.mascot-fallback').hidden=true;}).catch(()=>{document.querySelector('#robot').hidden=true;document.querySelector('#explode-toggle').hidden=true;document.querySelector('#motion-toggle').hidden=true;});
  if('requestIdleCallback'in window)requestIdleCallback(loadScene,{timeout:1200});else setTimeout(loadScene,150);
}
