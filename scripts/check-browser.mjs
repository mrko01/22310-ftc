import {createServer} from 'node:http';
import {readFile,stat,mkdir,writeFile} from 'node:fs/promises';
import {resolve,extname} from 'node:path';
import assert from 'node:assert/strict';
import {chromium,webkit} from 'playwright';

// Every API request is intercepted. This check never sends an enquiry or changes
// the live schedule, and serves only the existing build on an ephemeral port.
const root=resolve('dist');
const csp=(await readFile(resolve(root,'_headers'),'utf8')).match(/Content-Security-Policy: (.*)/)[1];
await mkdir('review/production-browser',{recursive:true});
const server=createServer(async(req,res)=>{
  try{
    let path=resolve(root,'.'+decodeURIComponent(new URL(req.url,'http://localhost').pathname));
    if(path!==root&&!path.startsWith(root+'/'))throw new Error('Outside build');
    if((await stat(path)).isDirectory())path+='/index.html';
    res.setHeader('Content-Security-Policy',csp);
    res.setHeader('Content-Type',({'.html':'text/html','.js':'text/javascript','.css':'text/css','.svg':'image/svg+xml','.png':'image/png','.jpg':'image/jpeg','.woff2':'font/woff2'})[extname(path)]||'application/octet-stream');
    res.end(await readFile(path));
  }catch{res.statusCode=404;res.end('Not found');}
});
await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(0,'127.0.0.1',resolve);});
const base='http://127.0.0.1:'+server.address().port;
const routes=['/','/team/','/sponsors/','/events/','/contact/','/404.html'];
const now=Date.now();
const events=[{id:'visit',title:'Open workshop',starts:now+3600000,ends:now+7200000,category:'outreach',location:'Lo-Ellen Park Secondary School'},{id:'long',title:'VeryLongUnbrokenEventTitle'.repeat(8),starts:now+86400000,ends:now+90000000,category:'practice',location:'LongUnbrokenWorkshopLocation'.repeat(6)}];
const reply=(route,data,status=200)=>route.fulfill({status,contentType:'application/json',body:JSON.stringify(data)});
let pagesChecked=0,workflowsChecked=0;
try{
 for(const engine of [chromium,webkit]){
  const browser=await engine.launch();
  try{
   for(const width of [320,390,768,1440]){
    const page=await browser.newPage({viewport:{width,height:900},reducedMotion:'reduce'});
    const errors=[];page.on('pageerror',error=>errors.push(error.message));
    await page.route('**/api/**',route=>route.request().url().endsWith('/calendar')?reply(route,events):reply(route,{error:'Unexpected request'},503));
    for(const path of routes){
     await page.goto(base+path);await page.waitForFunction(()=>!document.documentElement.classList.contains('no-js'));
     await page.evaluate(async()=>{await document.fonts.ready;for(let y=0;y<document.body.scrollHeight;y+=600){scrollTo(0,y);await new Promise(resolve=>setTimeout(resolve,15));}scrollTo(0,0);});
     await page.waitForFunction(()=>[...document.images].every(image=>image.complete));
     assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,engine.name()+' overflow '+width+' '+path);
     assert.equal(await page.locator('h1').count(),1);
     assert.ok(await page.locator('select').evaluateAll(items=>items.every(item=>item.getBoundingClientRect().height>=44)),'Select touch target '+engine.name()+' '+path);
     assert.equal(await page.evaluate(()=>[...document.images].some(image=>!image.naturalWidth)),false,'Broken image '+path);
     if(path==='/team/'||path==='/sponsors/')assert.ok(await page.locator(path==='/team/'?'.team-hero .button':'.sponsor-hero .button').evaluate(button=>button.getBoundingClientRect().bottom<innerHeight),'Primary action stays in the first screen');
     assert.deepEqual(errors,[],engine.name()+' page errors');if(width===390||width===1440)await page.screenshot({path:'review/production-browser/'+engine.name()+'-'+width+'-'+(path.replaceAll('/','')||'home')+'.png',fullPage:false});pagesChecked++;
    }
    await page.close();
   }
   const page=await browser.newPage({viewport:{width:390,height:844},reducedMotion:'reduce'});
   await page.route('**/api/**',route=>route.request().url().endsWith('/calendar')?reply(route,events):reply(route,{error:'Unexpected request'},503));
   await page.goto(base+'/events/');await page.locator('.calendar-grid').waitFor();assert.equal(await page.locator('[data-view=month]').getAttribute('aria-pressed'),'true');await page.getByRole('button',{name:'List',exact:true}).click();await page.locator('.event-row').first().waitFor();
   assert.equal(await page.locator('.event-row').first().getByRole('button').count(),1);
   await page.locator('.skip').focus();await page.keyboard.press('Enter');assert.equal(await page.evaluate(()=>document.activeElement.id),'main');
   await page.getByRole('button',{name:'Open menu',exact:true}).click();assert.equal(await page.getByRole('button',{name:'Close menu',exact:true}).getAttribute('aria-expanded'),'true');
   await page.keyboard.press('Escape');assert.equal(await page.evaluate(()=>document.activeElement.className),'menu-button');
   await page.locator('.event-row').first().click({position:{x:10,y:10}});await page.locator('#event-dialog').waitFor({state:'visible'});
   await page.context().setOffline(true);await page.waitForFunction(()=>document.querySelector('#event-freshness').textContent.includes('saved schedule'));
   await page.keyboard.press('Escape');await page.context().setOffline(false);
   await page.getByRole('button',{name:'Month',exact:true}).click();await page.locator('.calendar-grid').waitFor();
   assert.ok(await page.locator('.calendar-item').evaluateAll(items=>items.every(item=>item.clientHeight<110)),'Long month titles must stay compact');
   await page.getByRole('searchbox').fill('No matching workshop');await page.getByRole('button',{name:'Clear filters'}).click();assert.equal(await page.evaluate(()=>document.activeElement.id),'event-search');
   await page.getByRole('button',{name:'Next month'}).click();await page.getByRole('button',{name:'Next month'}).click();await page.getByRole('button',{name:'See upcoming events'}).click();assert.equal(await page.locator('[data-view="agenda"]').getAttribute('aria-pressed'),'true');
   workflowsChecked+=5;await page.close();

   const contact=await browser.newPage({viewport:{width:390,height:844},reducedMotion:'reduce'});
   let release,tokenSeen,posts=0,payload;
   const gate=new Promise(resolve=>release=resolve),seen=new Promise(resolve=>tokenSeen=resolve);
   await contact.route('**/api/public/contact-token',async route=>{tokenSeen();await gate;await reply(route,{ok:true});});
   await contact.route('**/api/public/contact',async route=>{posts++;payload=route.request().postDataJSON();await reply(route,{ok:true});});
   await contact.goto(base+'/contact/?topic=sponsorship&support=materials');
   assert.equal(await contact.locator('#contact-form-title').innerText(),'Talk sponsorship');
   await contact.locator('[name=name]').fill('Local QA');await contact.locator('[name=email]').fill('qa@example.invalid');await contact.locator('textarea').fill('This enquiry is intercepted locally.');
   await contact.reload();assert.equal(await contact.locator('textarea').inputValue(),'This enquiry is intercepted locally.');
   await contact.getByRole('button',{name:'Send message',exact:true}).click();await seen;
   assert.equal(await contact.locator('textarea').isDisabled(),true);assert.equal(await contact.locator('[name=name]').isDisabled(),true);assert.equal(await contact.locator('#discard-draft').isDisabled(),true);
   await contact.locator('[data-contact-intent="joining"]').dispatchEvent('click');assert.equal(await contact.locator('[name=subject]').inputValue(),'Partnership or sponsorship');
   release();await contact.waitForFunction(()=>document.querySelector('#contact-message').textContent.includes('team inbox'));
   assert.equal(posts,1);assert.equal(payload.name,'Local QA');assert.equal(payload.message,'This enquiry is intercepted locally.');assert.equal(await contact.locator('textarea').inputValue(),'');assert.equal(await contact.locator('textarea').isDisabled(),false);
   await contact.unroute('**/api/public/contact-token');await contact.unroute('**/api/public/contact');
   await contact.route('**/api/public/contact-token',route=>reply(route,{ok:true}));await contact.route('**/api/public/contact',route=>route.abort('failed'));
   await contact.locator('[name=name]').fill('Local QA');await contact.locator('[name=email]').fill('qa@example.invalid');await contact.locator('[name=subject]').selectOption('Robotics question');await contact.locator('textarea').fill('Keep this draft after a failed connection.');
   await contact.locator('[name=name]').focus();await contact.keyboard.press('Enter');await contact.waitForFunction(()=>document.querySelector('#contact-message').textContent.includes('before we could confirm'));
   assert.equal(await contact.locator('textarea').inputValue(),'Keep this draft after a failed connection.');assert.equal(await contact.locator('textarea').isDisabled(),false);
   assert.ok(await contact.locator('#contact-message').evaluate(message=>message.getBoundingClientRect().bottom<=innerHeight+1),'Keyboard submission errors must be visible');
   assert.ok((await contact.locator('#email-fallback').getAttribute('href')).includes('Keep%20this%20draft'));
   workflowsChecked+=3;await contact.close();

   const failure=await browser.newPage({viewport:{width:390,height:844}});let attempts=0,failAgain=false,removed=false;
   await failure.addInitScript(()=>Object.defineProperty(navigator,'clipboard',{value:{writeText:()=>Promise.reject(new Error('Permission denied'))}}));
   await failure.route('**/api/public/calendar',route=>{attempts++;return reply(route,attempts===1||failAgain?{error:'offline'}:removed?[]:events,attempts===1||failAgain?503:200);});
   await failure.goto(base+'/events/');await failure.getByRole('button',{name:'Try again'}).focus();await failure.keyboard.press('Enter');await failure.locator('.calendar-grid').waitFor();assert.equal(await failure.locator('[data-view=month]').getAttribute('aria-pressed'),'true');await failure.getByRole('button',{name:'List',exact:true}).click();await failure.locator('.event-row').first().waitFor();assert.equal(attempts,2);assert.equal(await failure.locator('[data-event=visit]').count(),1);
   failAgain=true;await failure.reload();await failure.waitForFunction(()=>document.querySelector('#calendar-status').textContent.includes('last saved schedule'));await failure.getByRole('button',{name:'List',exact:true}).click();assert.equal(await failure.locator('.event-row').count(),2);
   await failure.locator('.event-row').first().click();await failure.getByRole('button',{name:'Copy event link'}).click();assert.equal(await failure.locator('#event-link-field').isVisible(),true);assert.equal(await failure.locator('#event-share-url').inputValue(),'https://22310.ca/events/?event=visit');
   failAgain=false;removed=true;await failure.evaluate(()=>document.dispatchEvent(new Event('visibilitychange')));await failure.locator('#event-dialog').waitFor({state:'hidden'});
   assert.ok((await failure.locator('#calendar-status').innerText()).includes('no longer on the public schedule'));assert.equal(await failure.locator('.event-row').count(),0);assert.equal(await failure.locator('#export-events').isDisabled(),true);workflowsChecked+=4;await failure.close();
   for(const width of [320,1440]){
    const nojs=await browser.newPage({javaScriptEnabled:false,viewport:{width,height:900}});
    for(const path of routes){await nojs.goto(base+path);assert.equal(await nojs.locator('.site-header nav').isVisible(),true);assert.equal(await nojs.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);pagesChecked++;}
    await nojs.goto(base+'/contact/');assert.equal(await nojs.locator('.no-script-contact').isVisible(),true);await nojs.close();
   }
   const fallback=await browser.newPage({viewport:{width:390,height:844}});
   const fallbackErrors=[];fallback.on('pageerror',error=>fallbackErrors.push(error.message));
   await fallback.addInitScript(()=>{const original=HTMLCanvasElement.prototype.getContext;HTMLCanvasElement.prototype.getContext=function(type,...args){return String(type).includes('webgl')?null:original.call(this,type,...args);};});
   await fallback.goto(base);await fallback.waitForFunction(()=>window.__SAFFRON_QA__?.state==='fallback');
   assert.equal(await fallback.locator('#scene-poster').isVisible(),true);
   assert.equal(await fallback.locator('.scene-controls').count(),0);
   assert.deepEqual(fallbackErrors,[]);workflowsChecked++;await fallback.close();
   const reduced=await browser.newPage({viewport:{width:390,height:844},reducedMotion:'reduce',hasTouch:true,isMobile:true});
   await reduced.goto(base);await reduced.waitForFunction(()=>window.__SAFFRON_QA__?.state==='reduced-motion');
   assert.equal(await reduced.locator('#scene-poster').isVisible(),true);
   assert.equal(await reduced.locator('.site-header').count(),1);
   assert.equal(await reduced.locator('.wordmark').innerText(),'EDIT 22310');
   assert.equal(await reduced.locator('#motion-toggle').count(),0);
   assert.equal(await reduced.locator('.chapter[aria-hidden=true]').count(),0);
   await reduced.screenshot({path:'review/production-browser/'+engine.name()+'-home-mobile.png'});
   workflowsChecked++;await reduced.close();
  }finally{await browser.close();}
 }
 await writeFile('review/production-browser/results.json',JSON.stringify({pagesChecked,workflowsChecked,engines:['Chromium','WebKit'],status:'passed',liveWrites:false},null,2));
 console.log(`${pagesChecked} responsive/no-JS pages and ${workflowsChecked} workflow checks passed in Chromium and WebKit. No live writes.`);
}finally{await new Promise(resolve=>server.close(resolve));}
