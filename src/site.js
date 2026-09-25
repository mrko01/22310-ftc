import {escapeHTML as escape,dateKey,formatDate,timeLabel,eventsOnDay,ics,normalizeEvents,filterEvents,eventRange,googleCalendarUrl,calendarICS,isUpcoming,eventLink,eventContactLink,eventEnquiryContext} from './calendar.mjs';
import {contactTopics,supportIntroductions,draftKey,draftFrom,readDrafts,mergeDrafts,contactContextKey,mailtoMessage} from './contact.mjs';
import {fetchJSONTimed} from './network.mjs';
document.documentElement.classList.remove('no-js');
const reduced=matchMedia('(prefers-reduced-motion: reduce)');
let paused=reduced.matches;
const header=document.querySelector('.site-header'),menu=document.querySelector('.menu-button'),nav=document.querySelector('.site-nav');
function closeMenu(){menu?.setAttribute('aria-expanded','false');menu?.setAttribute('aria-label','Open menu');nav?.classList.remove('open');}
menu?.addEventListener('click',()=>{const open=menu.getAttribute('aria-expanded')!=='true';menu.setAttribute('aria-expanded',String(open));menu.setAttribute('aria-label',open?'Close menu':'Open menu');nav.classList.toggle('open',open);if(open)nav.querySelector('a')?.focus();});
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&nav?.classList.contains('open')){closeMenu();menu.focus();}});
document.addEventListener('click',e=>{if(!e.target.closest('.site-header'))closeMenu();});
header?.addEventListener('focusout',()=>{requestAnimationFrame(()=>{if(!header.contains(document.activeElement))closeMenu();});});
nav?.querySelectorAll('a').forEach(a=>a.addEventListener('click',closeMenu));
matchMedia('(min-width:851px)').addEventListener('change',closeMenu);
const syncHeader=()=>header?.classList.toggle('scrolled',scrollY>10);window.addEventListener('scroll',syncHeader,{passive:true});syncHeader();
if(!reduced.matches&&'IntersectionObserver' in window){
  document.documentElement.classList.add('motion-ready');
  const observer=new IntersectionObserver(entries=>entries.forEach(entry=>{if(entry.isIntersecting){entry.target.classList.add('is-visible');observer.unobserve(entry.target);}}),{threshold:.08});
  document.querySelectorAll('.reveal').forEach(el=>observer.observe(el));
}
const toggle=document.querySelector('#motion-toggle');
function syncMotion(){if(toggle){toggle.textContent=paused?'Resume motion':'Pause motion';toggle.setAttribute('aria-pressed',String(paused));}}
toggle?.addEventListener('click',()=>{paused=!paused;syncMotion();});
reduced.addEventListener('change',()=>{paused=reduced.matches;syncMotion();if(reduced.matches)document.documentElement.classList.remove('motion-ready');});syncMotion();
document.querySelector('[data-print]')?.addEventListener('click',()=>window.print());
const API=document.querySelector('meta[name="saffron-api"]')?.content||'https://team.22310.ca';
function downloadCalendar(contents,name){const url=URL.createObjectURL(new Blob([contents],{type:'text/calendar;charset=utf-8'})),a=document.createElement('a');a.href=url;a.download=name;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);}
const calendar=document.querySelector('[data-events]');
if(calendar){
  let events=[],ready=false,busy=false,queued=false,view='agenda',selectedId=null,lastFetched=0,stale=false,syncingHistory=false;
  const todayParts=()=>dateKey(Date.now()).split('-').map(Number);
  const currentMonth=()=>{const [year,month]=todayParts();return new Date(year,month-1,1,12);};
  let month=currentMonth();
  const isPreview=calendar.dataset.events==='preview',filter=document.querySelector('#event-category'),search=document.querySelector('#event-search'),status=document.querySelector('#calendar-status'),dialog=document.querySelector('#event-dialog'),count=document.querySelector('#event-count'),exportButton=document.querySelector('#export-events'),cacheKey='saffron-public-calendar-v2';
  const selected=()=>filterEvents(events,filter?.value||'all',search?.value||'');
  const linkedEvent=()=>new URLSearchParams(location.search).get('event');
  function openEvent(id,updateURL=true){const event=events.find(e=>e.id===id);if(!event)return;selectedId=id;document.querySelector('#event-detail-title').textContent=event.title;document.querySelector('#event-detail-category').textContent=event.category;document.querySelector('#event-detail-time').textContent=eventRange(event);document.querySelector('#event-detail-location').textContent=event.location||'Location to be confirmed';document.querySelector('#event-detail-google').href=googleCalendarUrl(event);document.querySelector('#event-detail-contact').href=eventContactLink(event.id);document.querySelector('#event-share-url').value=eventLink(event.id);document.querySelector('#event-freshness').textContent=stale?'This is a saved schedule. Confirm details with the team before making plans.':'';if(!dialog.open){document.querySelector('#event-share-status').textContent='';document.querySelector('#event-link-field').hidden=true;dialog.showModal();}if(updateURL&&linkedEvent()!==id){const url=new URL(location.href);url.searchParams.set('event',id);history.pushState({...history.state,saffronEvent:true},'',url);}}
  function syncLinkedEvent(){const id=linkedEvent();if(id&&events.some(e=>e.id===id))openEvent(id,false);else if(id&&ready){if(dialog.open){syncingHistory=true;dialog.close();}if(status){const notice=document.createElement('p');notice.className='event-link-notice';notice.textContent='This linked event is no longer on the public schedule. Contact the team to confirm it, or browse the dates below.';status.replaceChildren(notice);}}else if(dialog.open){syncingHistory=true;dialog.close();}}
  window.addEventListener('popstate',syncLinkedEvent);
  dialog?.addEventListener('close',()=>{if(syncingHistory){syncingHistory=false;return;}if(!linkedEvent())return;if(history.state?.saffronEvent)history.back();else{const url=new URL(location.href);url.searchParams.delete('event');history.replaceState(history.state,'',url);}});
  document.querySelector('#event-detail-share')?.addEventListener('click',async()=>{const field=document.querySelector('#event-share-url'),shareStatus=document.querySelector('#event-share-status');try{await navigator.clipboard.writeText(field.value);shareStatus.textContent='Event link copied.';}catch{document.querySelector('#event-link-field').hidden=false;field.focus();field.select();shareStatus.textContent='Copy the selected link to share this event.';}});
  dialog?.querySelector('.dialog-close').addEventListener('click',()=>dialog.close());
  dialog?.addEventListener('click',e=>{if(e.target===dialog){const r=dialog.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)dialog.close();}});
  document.querySelector('#event-detail-save')?.addEventListener('click',()=>{const event=events.find(e=>e.id===selectedId);if(event)downloadCalendar(ics(event),'saffron-event.ics');});
  exportButton?.addEventListener('click',()=>{const upcoming=selected().filter(e=>isUpcoming(e));if(upcoming.length)downloadCalendar(calendarICS(upcoming),'saffron-upcoming-events.ics');});
  function clearFilters(){if(filter)filter.value='all';if(search)search.value='';render();}
  function renderStatus(){if(!status)return;if(stale){status.innerHTML=`${lastFetched?'Showing the last saved schedule from '+escape(new Intl.DateTimeFormat('en-CA',{dateStyle:'medium',timeStyle:'short',timeZone:'America/Toronto'}).format(lastFetched))+' ET. ':''}Live updates are unavailable. <button data-retry>Retry</button>`;status.querySelector('[data-retry]')?.addEventListener('click',load);}else status.textContent=isPreview?'':'Public schedule · '+(lastFetched?'Updated '+new Intl.DateTimeFormat('en-CA',{timeStyle:'short',timeZone:'America/Toronto'}).format(lastFetched)+' ET':'');}
  function render(){
    const focused=document.activeElement,focusedId=calendar.contains(focused)?focused?.dataset.event:null,focusedClass=focused?.className;
    let visible=selected(),upcoming=visible.filter(e=>isUpcoming(e));
    if(exportButton)exportButton.disabled=!upcoming.length;
    if(isPreview)visible=upcoming.slice(0,3);
    const monthControls=document.querySelector('#month-controls');if(monthControls)monthControls.hidden=view!=='month';
    document.querySelectorAll('[data-view]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.view===view)));
    if(view==='month'){
      const monthKey=`${month.getFullYear()}-${String(month.getMonth()+1).padStart(2,'0')}`;
      const next=new Date(month.getFullYear(),month.getMonth()+1,1,12),nextKey=`${next.getFullYear()}-${String(next.getMonth()+1).padStart(2,'0')}-01`;
      const monthEvents=visible.filter(e=>dateKey(e.starts,e.all_day)<nextKey&&dateKey(e.ends-1,e.all_day)>=monthKey+'-01');
      if(count)count.textContent=monthEvents.length+' event'+(monthEvents.length===1?'':'s')+' this month';
      document.querySelector('#month-title').textContent=month.toLocaleDateString('en-CA',{month:'long',year:'numeric'});
      const start=new Date(month);start.setDate(1-start.getDay());
      calendar.innerHTML='<div class="calendar-grid">'+['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map(day=>'<div class="calendar-weekday">'+day+'</div>').join('')+Array.from({length:42},(_,i)=>{const day=new Date(start);day.setDate(day.getDate()+i);const key=`${day.getFullYear()}-${String(day.getMonth()+1).padStart(2,'0')}-${String(day.getDate()).padStart(2,'0')}`;return `<div class="calendar-day ${day.getMonth()!==month.getMonth()?'outside':''} ${key===dateKey(Date.now())?'today':''}"><span ${key===dateKey(Date.now())?'aria-current="date"':''}>${day.getDate()}</span>${eventsOnDay(visible,key).map(e=>`<button class="calendar-item" data-event="${escape(e.id)}" aria-label="${escape(e.title+', '+day.toLocaleDateString('en-CA',{weekday:'long',month:'long',day:'numeric'})+', '+timeLabel(e))}">${escape(e.title)}</button>`).join('')}</div>`;}).join('')+'</div>';
    }else{
      if(count)count.textContent=upcoming.length+' upcoming event'+(upcoming.length===1?'':'s');
      visible=isPreview?visible:upcoming;
      const hasFilter=(filter&&filter.value!=='all')||search?.value.trim();
      calendar.innerHTML=visible.length?visible.map(e=>`<article class="event-row"><div class="event-date"><strong>${formatDate(e,{day:'numeric'})}</strong><span>${formatDate(e,{month:'short',year:'numeric'})}</span></div><div><span class="event-category">${escape(e.category)}</span><h3><button data-event="${escape(e.id)}">${escape(e.title)}</button></h3><p>${escape(timeLabel(e))}${e.location?' · '+escape(e.location):''}</p></div><button class="event-open" data-event="${escape(e.id)}" aria-label="View ${escape(e.title)}"><svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="m8 5 7 7-7 7" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg></button></article>`).join(''):`<div class="event-empty"><h3>${hasFilter?'No events match your search.':'More dates are on the way.'}</h3><p>${hasFilter?'Try another search or see every category.':'The next public events haven’t been posted yet. Get in touch if you’re planning a visit.'}</p>${hasFilter?'<button class="text-link" id="clear-filters">Clear filters ↗</button>':'<a class="text-link" href="/contact/?topic=visit">Ask the team ↗</a>'}</div>`;
      calendar.querySelector('#clear-filters')?.addEventListener('click',clearFilters);
    }
    calendar.querySelectorAll('[data-event]').forEach(button=>button.addEventListener('click',()=>openEvent(button.dataset.event)));
    if(focusedId)Array.from(calendar.querySelectorAll('[data-event]')).find(button=>button.dataset.event===focusedId&&button.className===focusedClass)?.focus({preventScroll:true});
    if(dialog?.open){if(events.some(e=>e.id===selectedId))openEvent(selectedId,false);else {syncingHistory=true;dialog.close();}}
  }
  async function load(){
    if(busy){queued=true;return;}busy=true;calendar.setAttribute('aria-busy','true');
    try{const {response,result}=await fetchJSONTimed(API+'/api/public/calendar');if(!response.ok)throw new Error();events=normalizeEvents(result);ready=true;stale=false;lastFetched=Date.now();try{localStorage.setItem(cacheKey,JSON.stringify({events,fetched:lastFetched}));}catch{}render();renderStatus();syncLinkedEvent();}
    catch{stale=true;if(ready){render();renderStatus();syncLinkedEvent();}else{if(status)status.textContent='You can try again or contact the team for the latest dates.';calendar.innerHTML='<div class="event-empty"><h3>The schedule is taking a break.</h3><p>We couldn’t reach the live calendar. Your next step is still here.</p><button class="text-link" id="retry-calendar">Try again ↗</button><a class="text-link" href="/contact/?topic=visit">Ask about a date ↗</a></div>';calendar.querySelector('#retry-calendar').addEventListener('click',load);}}
    finally{busy=false;calendar.setAttribute('aria-busy','false');if(queued){queued=false;void load();}}
  }
  try{const saved=JSON.parse(localStorage.getItem(cacheKey)||'null');if(saved&&Number.isFinite(saved.fetched)&&Date.now()-saved.fetched>=0&&Date.now()-saved.fetched<86400000){events=normalizeEvents(saved.events);lastFetched=saved.fetched;ready=true;stale=true;render();renderStatus();}}catch{}
  let socket,retryTimer,pingTimer,retries=0,stopped=false;
  const closeLive=()=>{clearTimeout(retryTimer);clearInterval(pingTimer);const current=socket;socket=null;if(current){current.onclose=null;current.close();}};
  function connectLive(){
    if(stopped||document.hidden||socket||!navigator.onLine||location.hostname!=='22310.ca')return;
    const url=new URL('/api/public/live',API);url.protocol=url.protocol==='https:'?'wss:':'ws:';
    try{const connection=new WebSocket(url);socket=connection;
      socket.onopen=()=>{if(socket!==connection)return;retries=0;if(stale||Date.now()-lastFetched>15000)load();pingTimer=setInterval(()=>{if(connection.readyState===WebSocket.OPEN)connection.send('ping');},25000);};
      socket.onmessage=event=>{try{const packet=JSON.parse(event.data);if(packet.type==='change'&&packet.topic==='calendar')load();}catch{}};
      socket.onclose=()=>{if(socket!==connection)return;socket=null;clearInterval(pingTimer);if(!stopped&&!document.hidden){stale=true;renderStatus();retryTimer=setTimeout(connectLive,Math.min(60000,1500*2**Math.min(retries++,5)));}};
      socket.onerror=()=>connection.close();
    }catch{socket=null;}
  }
  function start(){stopped=false;load();connectLive();}start();
  const wake=()=>{if(document.hidden)closeLive();else{load();connectLive();}};
  document.addEventListener('visibilitychange',wake);window.addEventListener('online',wake);
  window.addEventListener('offline',()=>{closeLive();stale=true;renderStatus();});
  window.addEventListener('pagehide',()=>{stopped=true;closeLive();});window.addEventListener('pageshow',e=>{if(e.persisted)start();});
  filter?.addEventListener('change',()=>{if(ready)render();});search?.addEventListener('input',()=>{if(ready)render();});
  document.querySelectorAll('[data-view]').forEach(b=>b.addEventListener('click',()=>{view=b.dataset.view;if(ready)render();}));
  document.querySelector('#previous-month')?.addEventListener('click',()=>{month=new Date(month.getFullYear(),month.getMonth()-1,1,12);if(ready)render();});
  document.querySelector('#next-month')?.addEventListener('click',()=>{month=new Date(month.getFullYear(),month.getMonth()+1,1,12);if(ready)render();});
  document.querySelector('#today-month')?.addEventListener('click',()=>{month=currentMonth();if(ready)render();});
}
const form=document.querySelector('#contact-form');
if(form){
  let sending=false,eventContext=null,eventId='',dirty=false,storageAvailable=true,pendingDraft=null;
  const message=document.querySelector('#contact-message'),button=form.querySelector('button[type=submit]'),buttonLabel=button.innerHTML,subject=form.elements.subject,body=form.elements.message,help=document.querySelector('#topic-help'),counter=document.querySelector('#message-count'),emailLink=document.querySelector('#email-fallback');
  const notice=document.querySelector('#draft-notice'),draftStatus=document.querySelector('#draft-status'),restore=document.querySelector('#restore-draft'),discard=document.querySelector('#discard-draft'),eventNotice=document.querySelector('#contact-event-context');
  const params=new URLSearchParams(location.search);
  let contextKey=contactContextKey(params);
  const fields=()=>Object.fromEntries(['name','email','subject','message'].map(key=>[key,form.elements[key].value]));
  const messageWithContext=()=>eventContext?eventEnquiryContext(eventContext)+'\n\n'+body.value:eventId?'Event link: '+eventLink(eventId)+'\n\n'+body.value:body.value;
  function syncForm(){const contextLength=messageWithContext().length-body.value.length;body.maxLength=Math.max(10,5000-contextLength);counter.textContent=body.value.length.toLocaleString('en-CA')+' / '+body.maxLength.toLocaleString('en-CA');emailLink.href=mailtoMessage({...fields(),message:messageWithContext()});help.textContent=Object.values(contactTopics).find(t=>t[0]===subject.value)?.[1]||'Choose the topic that best fits your message.';document.querySelectorAll('[data-contact-intent]').forEach(a=>{if(contactTopics[a.dataset.contactIntent]?.[0]===subject.value)a.setAttribute('aria-current','true');else a.removeAttribute('aria-current');});}
  function storedDrafts(){try{return readDrafts(sessionStorage.getItem(draftKey));}catch{return [];}}
  function writeDrafts(drafts){try{if(drafts.length)sessionStorage.setItem(draftKey,JSON.stringify(drafts));else sessionStorage.removeItem(draftKey);storageAvailable=true;}catch{storageAvailable=false;}}
  function saveDraft(){if(!dirty||sending)return;writeDrafts(mergeDrafts(storedDrafts(),draftFrom(fields(),contextKey)));if(!pendingDraft){notice.hidden=false;draftStatus.textContent=storageAvailable?'Draft saved for this tab.':'Your draft is on this page. This browser isn’t allowing session recovery.';restore.hidden=true;}}
  function discardDraft(context=contextKey){writeDrafts(storedDrafts().filter(d=>d.context!==context));dirty=false;pendingDraft=null;notice.hidden=true;restore.hidden=true;}
  function restoreDraft(draft){contextKey=draft.context;const savedContext=new URLSearchParams(draft.context);eventId=savedContext.get('event');if(!eventId)eventId='';for(const [key,value]of Object.entries(draft.fields))form.elements[key].value=value;dirty=true;pendingDraft=null;restore.hidden=true;notice.hidden=false;draftStatus.textContent='Your unsent draft has been restored.';syncForm();}
  function applyIntent(key){if(contactTopics[key])subject.value=contactTopics[key][0];syncForm();}
  applyIntent(params.get('topic'));if(params.get('topic')==='sponsorship'&&supportIntroductions[params.get('support')])body.value=supportIntroductions[params.get('support')];
  eventId=params.get('event')?.slice(0,200)||'';
  const drafts=storedDrafts();writeDrafts(drafts);const matchingDraft=drafts.find(d=>d.context===contextKey),latestDraft=drafts.at(-1);
  if(matchingDraft||(!location.search&&latestDraft))restoreDraft(matchingDraft||latestDraft);else if(latestDraft){pendingDraft=latestDraft;notice.hidden=false;draftStatus.textContent='You have another unsent message in this tab.';restore.hidden=false;}
  restore.addEventListener('click',()=>{if(!pendingDraft)return;const draft=pendingDraft;saveDraft();eventContext=null;eventNotice.hidden=true;restoreDraft(draft);loadEventContext();});
  discard.addEventListener('click',()=>{const hadPending=!!pendingDraft,discardedContext=pendingDraft?.context||contextKey;discardDraft(discardedContext);if(!hadPending){form.reset();eventId='';eventContext=null;eventNotice.hidden=true;syncForm();}else if(Object.values(fields()).some(v=>v.trim())){dirty=true;saveDraft();}draftStatus.textContent=hadPending?'Previous draft discarded.': '';});
  async function loadEventContext(){
    if(!eventId)return;const requestedId=eventId;eventNotice.hidden=false;eventNotice.textContent='Finding your selected event…';
    try{const {response,result}=await fetchJSONTimed(API+'/api/public/calendar');if(!response.ok)throw new Error();const event=normalizeEvents(result).find(e=>e.id===requestedId);if(eventId!==requestedId)return;if(!event)throw new Error();eventContext=event;eventNotice.innerHTML='<span class="section-kicker">About this event</span><h3>'+escape(event.title)+'</h3><p>'+escape(eventRange(event))+'</p><p>'+escape(event.location||'Location to be confirmed')+'</p><a class="text-link" href="'+escape(eventLink(event.id))+'">View event details ↗</a>';}
    catch{if(eventId!==requestedId)return;eventNotice.textContent='We couldn’t confirm this event’s current details. Its link will be included with your message; please add the title or date if you know it.';}
    syncForm();
  }
  loadEventContext();syncForm();
  document.querySelectorAll('[data-contact-intent]').forEach(link=>link.addEventListener('click',e=>{e.preventDefault();applyIntent(link.dataset.contactIntent);eventId='';eventContext=null;eventNotice.hidden=true;contextKey=contactContextKey(new URLSearchParams({topic:link.dataset.contactIntent}));history.replaceState(null,'','?topic='+link.dataset.contactIntent);if(dirty)saveDraft();subject.focus({preventScroll:true});form.scrollIntoView({behavior:reduced.matches?'instant':'smooth',block:'start'});}));
  const onEdit=()=>{dirty=true;syncForm();if(!pendingDraft)saveDraft();};form.addEventListener('input',onEdit);form.addEventListener('change',onEdit);window.addEventListener('pagehide',saveDraft);
  form.addEventListener('submit',async e=>{
    e.preventDefault();if(sending)return;
    for(const name of ['name','email','message'])form.elements[name].value=form.elements[name].value.trim();
    if(!form.reportValidity())return;
    if(messageWithContext().length>5000){body.setCustomValidity('Please shorten your message to leave room for the event details.');body.reportValidity();body.addEventListener('input',()=>body.setCustomValidity(''),{once:true});return;}
    if(body.value.length<10){body.setCustomValidity('Please add a message of at least 10 characters.');body.reportValidity();body.addEventListener('input',()=>body.setCustomValidity(''),{once:true});return;}
    dirty=true;saveDraft();sending=true;button.disabled=true;button.textContent='Sending…';form.setAttribute('aria-busy','true');message.textContent='';message.classList.remove('error');let postStarted=false;
    try{
      const setup=await fetchJSONTimed(API+'/api/public/contact-token',{credentials:'include'});if(!setup.response.ok)throw new Error('The contact form is unavailable right now. You can try again, or open your message in your mail app below.');
      postStarted=true;
      const {response,result}=await fetchJSONTimed(API+'/api/public/contact',{method:'POST',credentials:'include',headers:{'Content-Type':'application/json'},body:JSON.stringify({...Object.fromEntries(new FormData(form)),message:messageWithContext()})});postStarted=false;
      if(!response.ok)throw new Error(result.error||'Your message couldn’t be sent. Please try again or use the email option below.');
      if(result.ok!==true)throw new Error('We couldn’t confirm that your message arrived. Please email the team before resending.');
      message.textContent='Your message is in our team inbox. Thanks for getting in touch—we’ll reply to the email you provided.';discardDraft();form.reset();eventId='';eventContext=null;eventNotice.hidden=true;syncForm();message.focus({preventScroll:true});message.scrollIntoView({behavior:reduced.matches?'instant':'smooth',block:'nearest'});
    }catch(error){message.classList.add('error');message.textContent=postStarted?'The connection ended before we could confirm delivery. Your draft is still here. Please contact the team by email before resending.':error.message||'Check your connection, or use the email option below.';syncForm();message.focus({preventScroll:true});}
    finally{sending=false;button.disabled=false;button.innerHTML=buttonLabel;form.setAttribute('aria-busy','false');}
  });
}
// Keep the existing illustration if WebGL is unavailable. Load 3D after the interface paints.
if(document.querySelector('#robot')){
  const loadScene=()=>import('./mascot.bundle.js').then(({startMascot})=>{startMascot(()=>paused);document.querySelector('.mascot-fallback').hidden=true;}).catch(()=>{document.querySelector('#robot').hidden=true;document.querySelector('#explode-toggle').hidden=true;document.querySelector('#motion-toggle').hidden=true;});
  if('requestIdleCallback'in window)requestIdleCallback(loadScene,{timeout:1200});else setTimeout(loadScene,150);
}
