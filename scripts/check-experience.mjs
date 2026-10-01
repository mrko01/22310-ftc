import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {resolve} from 'node:path';

// Intentionally connects only to the parent-owned loopback preview. This test
// neither starts another server nor opens the user's browser/profile.
const baseURL=process.env.SAFFRON_TEST_URL||'http://127.0.0.1:22311/';
assert.ok(['127.0.0.1','localhost','[::1]'].includes(new URL(baseURL).hostname),'QA is localhost-only');
const evidence=resolve('review/browser');
await mkdir(evidence,{recursive:true});
const selectedPhases=(process.env.SAFFRON_QA_PHASES||"desktop,mobile,reduced-motion,webgl-unavailable,no-javascript")?.split(',').filter(Boolean);
const reportFile=selectedPhases?'results-selected.json':'results.json';
const report={startedAt:new Date().toISOString(),baseURL,selectedPhases:selectedPhases||'all',rendererClaim:'Owned headless Chromium WebGL, renderer recorded per phase. Mobile is an emulated viewport, not a physical phone.',phases:[],checks:[],failures:[]};
let browser;
const hash=data=>createHash('sha256').update(data).digest('hex');
const check=(condition,message,details)=>{
  report.checks.push({message,passed:Boolean(condition),...(details===undefined?{}:{details})});
  assert.ok(condition,message);
};
const save=()=>writeFile(resolve(evidence,reportFile),JSON.stringify(report,null,2));

async function makePage(options={}) {
  const context=await browser.newContext({viewport:{width:1440,height:900},deviceScaleFactor:1,...options});
  const page=await context.newPage(),errors=[],consoleErrors=[],failedRequests=[],externalRequests=[];
  await page.route('**/*',route=>{
    const url=new URL(route.request().url());
    if(!['http:','https:'].includes(url.protocol)||['127.0.0.1','localhost','[::1]'].includes(url.hostname))return route.continue();
    externalRequests.push(url.href);return route.abort('blockedbyclient');
  });
  page.on('pageerror',error=>errors.push(error.message));
  page.on('console',message=>{if(message.type()==='error')consoleErrors.push(message.text())});
  page.on('response',response=>{if(response.status()>=400)failedRequests.push({url:response.url(),status:response.status()})});
  return {context,page,errors,consoleErrors,failedRequests,externalRequests};
}
async function qa(page){return page.evaluate(()=>structuredClone(window.__SAFFRON_QA__))}
async function graphics(page){return page.evaluate(()=>{const gl=document.querySelector('#scene').getContext('webgl2');const extension=gl?.getExtension('WEBGL_debug_renderer_info');return extension?{vendor:gl.getParameter(extension.UNMASKED_VENDOR_WEBGL),renderer:gl.getParameter(extension.UNMASKED_RENDERER_WEBGL)}:{renderer:'not exposed'}})}
async function layout(page){return page.evaluate(()=>({width:innerWidth,height:innerHeight,scrollWidth:document.documentElement.scrollWidth,bodyWidth:document.body.scrollWidth}))}
async function capture(page,name){const path=resolve(evidence,name+'.png');const buffer=await page.screenshot({path});return {path,sha256:hash(buffer),bytes:buffer.length}}
async function scrollToProgress(page,progress) {
  await page.evaluate(value=>scrollTo({top:value*(document.querySelector('#experience').offsetHeight-innerHeight),behavior:'instant'}),progress);
  try{await page.waitForFunction(value=>Math.abs(window.__SAFFRON_QA__.progress-value)<.002&&Math.abs(window.__SAFFRON_QA__.sceneProgress-value)<.001,progress,{timeout:20000})}
  catch(error){const snapshot=await qa(page);throw new Error(`Scroll to ${progress} did not settle: ${JSON.stringify({progress:snapshot.progress,sceneProgress:snapshot.sceneProgress,frames:snapshot.frames,triangles:snapshot.triangles,drawCalls:snapshot.drawCalls,errors:snapshot.errors})}`,{cause:error})}
}
async function checkInteractions(page,name,isMobile,entry) {
  await scrollToProgress(page,.7);
  await page.waitForFunction(()=>window.__SAFFRON_QA__?.interactions?.active,null,{timeout:15000});
  const before=(await qa(page)).interactions;
  check(await page.locator('.scene-controls').isVisible(),`${name}: field controls appear in the field chapter`);
  check(before.hives.length===2,`${name}: both native CAD hive pivots are interactive`,before.hives);
  check(before.nativePieces===6,`${name}: six original CAD nectar pieces are attached to the hives`);
  await page.evaluate(()=>document.activeElement?.blur());
  await page.keyboard.press('Space');
  await page.waitForFunction(count=>window.__SAFFRON_QA__.interactions.balls>count,before.balls,{timeout:10000});
  check(true,`${name}: Space drops a ball`);
  const beforeDrive=(await qa(page)).interactions.robotPosition;
  if(isMobile) {
    const pad=await page.locator('.field-joystick').boundingBox();check(Boolean(pad),'mobile: drive pad is visible');
    await page.mouse.move(pad.x+pad.width/2,pad.y+41);await page.mouse.down();
    try {
      await page.mouse.move(pad.x+pad.width/2,pad.y+15);
      await page.waitForFunction(origin=>Math.hypot(...window.__SAFFRON_QA__.interactions.robotPosition.map((value,index)=>value-origin[index]))>.005,beforeDrive,{timeout:10000});
    }finally{await page.mouse.up()}
    check(true,'mobile: pointer drag on drive pad moves the robot');
  }else {
    await page.keyboard.down('w');
    try{await page.waitForFunction(origin=>Math.hypot(...window.__SAFFRON_QA__.interactions.robotPosition.map((value,index)=>value-origin[index]))>.005,beforeDrive,{timeout:10000})}
    finally{await page.keyboard.up('w')}
    check(true,'desktop: W drives the robot');
  }
  await page.keyboard.down('q');
  try{await page.waitForFunction(()=>Math.abs(window.__SAFFRON_QA__.interactions.hives[0].angle)>.22&&window.__SAFFRON_QA__.interactions.spilledNativePieces>0,null,{timeout:10000})}
  finally{await page.keyboard.up('q')}
  check(true,`${name}: Q tilts the first native hive and spills its native nectar`);
  entry.interactionChanged=(await qa(page)).interactions;
  entry.captures.push(await capture(page,name+'-field-interaction'));
  await page.keyboard.press('r');
  await page.waitForFunction(()=>!window.__SAFFRON_QA__.interactions.driveStarted&&document.querySelector('.field-reset').hidden,null,{timeout:10000});
  const reset=(await qa(page)).interactions;entry.interactionReset=reset;
  check(reset.balls===before.balls,`${name}: reset restores the initial ball count`,{before:before.balls,after:reset.balls});
  check(reset.hives.every(hive=>Math.abs(hive.angle)<.001),`${name}: reset restores hive angles`);
  check(reset.spilledNativePieces===0,`${name}: reset restores native nectar placement`);
  const help=page.locator('.field-help-toggle');await help.focus();await page.keyboard.press('Enter');
  check(await help.getAttribute('aria-expanded')==='true',`${name}: keyboard opens interaction help`);
  await page.keyboard.press('Escape');
  check(await help.getAttribute('aria-expanded')==='false',`${name}: Escape dismisses interaction help`);
  await scrollToProgress(page,0);
  check(!await page.locator('.scene-controls').isVisible(),`${name}: field controls disappear outside the field chapter`);
  if(!isMobile) {
    let hit;
    for(const y of [.5,.55,.45,.6,.4,.65]) {
      for(const x of [.5,.46,.54,.42,.58]) {
        await page.mouse.move(x*1440,y*900);await page.waitForTimeout(70);
        if((await qa(page)).interactions.hoveredPart){hit={x:x*1440,y:y*900};break}
      }
      if(hit)break;
    }
    check(Boolean(hit),'desktop: robot parts respond to pointer hover');
    await page.mouse.click(hit.x,hit.y);
    await page.waitForFunction(()=>window.__SAFFRON_QA__.interactions.feedActive,null,{timeout:10000});
    entry.feed=(await qa(page)).interactions;
    check(true,'desktop: clicking a robot part starts the feed animation');
    entry.captures.push(await capture(page,'desktop-robot-interaction'));
    await page.mouse.move(15,120);
    await page.waitForFunction(()=>!window.__SAFFRON_QA__.interactions.feedActive,null,{timeout:15000});
  }
}
async function phase(name,callback) {
  if(selectedPhases&&!selectedPhases.includes(name))return;
  const entry={name,startedAt:new Date().toISOString()};report.phases.push(entry);
  try{await callback(entry);entry.passed=true;console.log('PASS '+name)}
  catch(error){entry.passed=false;entry.error=String(error.stack||error);report.failures.push({name,error:entry.error});console.error('FAIL '+name+': '+error.message)}
  await save();
}
function assertClean(session,name,{expectedWebGLFailure=false}={}) {
  check(session.errors.length===0,`${name}: no unhandled page errors`,session.errors);
  const unexpected=session.consoleErrors.filter(message=>!expectedWebGLFailure||!/Error creating WebGL context/i.test(message));
  check(unexpected.length===0,`${name}: no unexpected console errors`,session.consoleErrors);
  check(session.failedRequests.length===0,`${name}: local assets resolve`,session.failedRequests);
  check(session.externalRequests.length===0,`${name}: no external network requests`,session.externalRequests);
}

try {
  // macOS headless-shell otherwise defaults to CPU SwiftShader. Exercise the
  // host's real Metal renderer; record its identity rather than assuming it.
  browser=await chromium.launch({headless:true,args:process.platform==='darwin'?['--use-angle=metal','--enable-gpu']:[]});
  report.browserVersion=browser.version();
  if(selectedPhases?.includes('field-diagnostic'))await phase('field-diagnostic',async entry=>{
    const session=await makePage(),{page,context}=session;
    try {
      await page.goto(baseURL,{waitUntil:'domcontentloaded'});
      await page.waitForFunction(()=>window.__SAFFRON_QA__?.fieldLoaded,null,{timeout:60000});
      entry.graphics=await graphics(page);
      await page.evaluate(()=>scrollTo({top:.7*(document.querySelector('#experience').offsetHeight-innerHeight),behavior:'instant'}));
      entry.samples=[];
      for(let i=0;i<10;i++) {
        await page.waitForTimeout(2000);
        const sample={...await qa(page),sampledAt:Date.now()};entry.samples.push(sample);
        console.log('FIELD SAMPLE '+JSON.stringify({frames:sample.frames,progress:sample.progress,sceneProgress:sample.sceneProgress,triangles:sample.triangles,drawCalls:sample.drawCalls,errors:sample.errors}));
        await save();
      }
      entry.capture=await capture(page,'field-diagnostic');
      assertClean(session,'field diagnostic');
    }finally{await context.close()}
  });
  for(const [name,viewport,isMobile] of [['desktop',{width:1440,height:900},false],['mobile',{width:390,height:844},true]]) {
    await phase(name,async entry=>{
      const session=await makePage({viewport,isMobile,hasTouch:isMobile}),{context,page}=session;
      try {
        await page.goto(baseURL,{waitUntil:'domcontentloaded',timeout:15000});
        await page.waitForFunction(()=>window.__SAFFRON_QA__?.state==='webgl'&&window.__SAFFRON_QA__.robotLoaded&&window.__SAFFRON_QA__.triangles>0,null,{timeout:45000});
        await page.waitForFunction(()=>getComputedStyle(document.querySelector('#scene')).opacity==='1',null,{timeout:10000});
        entry.graphics=await graphics(page);
        check(await page.locator('#about-toggle,#motion-toggle,.scene-footer').count()===0,`${name}: removed explanatory/pause UI stays absent`);
        check(!await page.locator('#home').innerText().then(text=>/Greater Sudbury|About this study|Pause motion|FTC\s*22310/.test(text)),`${name}: hero remains sparse`);
        entry.captures=[];entry.samples=[];
        for(const progress of [0,.28,.43,.7,1]) {
          if(progress>=.7)await page.waitForFunction(()=>window.__SAFFRON_QA__.fieldLoaded,null,{timeout:60000});
          await scrollToProgress(page,progress);
          const snapshot=await qa(page),bounds=await layout(page);
          check(snapshot.state==='webgl'&&snapshot.frames>0&&snapshot.triangles>0,`${name} ${progress}: real mesh rendering`,snapshot);
          check(snapshot.camera.length===3&&snapshot.camera.every(Number.isFinite),`${name} ${progress}: finite camera`);
          check(bounds.scrollWidth<=bounds.width+1,`${name} ${progress}: no horizontal overflow`,bounds);
          const sceneBuffer=await page.locator('#scene').screenshot();
          entry.samples.push({progress,...snapshot,layout:bounds,canvasSha256:hash(sceneBuffer)});
          entry.captures.push(await capture(page,`${name}-${String(progress).replace('.','_')}`));
          console.log(`CAPTURE ${name} ${progress}: ${snapshot.triangles} triangles, ${snapshot.drawCalls} draw calls`);
        }
        check(new Set(entry.samples.map(sample=>sample.canvasSha256)).size===5,`${name}: canvas changes throughout the scroll timeline`);
        check(new Set(entry.samples.map(sample=>JSON.stringify(sample.camera))).size===5,`${name}: camera changes throughout the scroll timeline`);
        check(entry.samples.every(sample=>sample.errors.length===0),`${name}: scene reports no asset/render errors`,entry.samples.flatMap(sample=>sample.errors));
        if(isMobile) {
          await scrollToProgress(page,.879);const before=await qa(page);
          await scrollToProgress(page,.881);const after=await qa(page);
          entry.mobileClosingTransition={before,after};
          check(Array.isArray(before.robotPosition)&&Array.isArray(after.robotPosition),'mobile: robot-placement telemetry available');
          const displacement=Math.hypot(...before.robotPosition.map((value,index)=>value-after.robotPosition[index]));
          check(displacement<.08,'mobile: robot does not jump across the .88 closing transition',{displacement});
        }
        await checkInteractions(page,name,isMobile,entry);
        // Ending at the hero avoids interactive field controls; ambient animation
        // should settle automatically when the user is no longer scrolling.
        await scrollToProgress(page,0);
        await page.waitForTimeout(4700);
        const first=await qa(page);await page.waitForTimeout(600);const second=await qa(page);
        entry.idle={first,second};
        check(Math.abs(first.ambientTime-second.ambientTime)<.001,`${name}: automatic ambient motion settles`);
        check(await page.locator('#site-navigation a').count()>=6,`${name}: production navigation restored`);
        if(isMobile) {
          const toggle=page.locator('.menu-toggle');await toggle.focus();await page.keyboard.press('Enter');
          check(await toggle.getAttribute('aria-expanded')==='true','mobile: keyboard opens menu');
          await page.locator('#site-navigation a').first().focus();
          await page.keyboard.press('Escape');
          check(await toggle.getAttribute('aria-expanded')==='false','mobile: Escape closes menu');
          check(await toggle.evaluate(node=>node===document.activeElement),'mobile: closing the menu returns keyboard focus');
        }
        const explore=page.getByRole('link',{name:'Explore the robot'});await explore.focus();await page.keyboard.press('Enter');
        await page.waitForFunction(()=>Math.abs(window.__SAFFRON_QA__.progress-.28)<.003,null,{timeout:20000});
        check(true,`${name}: keyboard activates scroll navigation`);
        assertClean(session,name);
      }catch(error){entry.lastQA=await qa(page).catch(()=>null);entry.lastLayout=await layout(page).catch(()=>null);entry.failureCapture=await capture(page,name+'-failure').catch(()=>null);throw error}
      finally{entry.networkAndConsole={errors:session.errors,consoleErrors:session.consoleErrors,failedRequests:session.failedRequests,externalRequests:session.externalRequests};await context.close()}
    });
  }

  for(const [name,viewport] of [['desktop',{width:1440,height:900}],['mobile',{width:390,height:844}]])await phase('events-'+name,async entry=>{
    const session=await makePage({viewport}),{page,context}=session;
    try {
      const response=await page.goto(new URL('/events/',baseURL).href,{waitUntil:'networkidle',timeout:15000});
      check(response.status()===200,`events ${name}: local page resolves`);
      await page.locator('.calendar-grid').waitFor({state:'visible'});
      const month=page.getByRole('button',{name:'Month',exact:true}),list=page.getByRole('button',{name:'List',exact:true});
      check(await month.getAttribute('aria-pressed')==='true',`events ${name}: Month is the initial selection`);
      check(await page.locator('#month-controls').isVisible(),`events ${name}: initial month controls are visible`);
      entry.captures=[await capture(page,'events-'+name+'-month')];
      await list.focus();await page.keyboard.press('Enter');
      check(await list.getAttribute('aria-pressed')==='true'&&await month.getAttribute('aria-pressed')==='false',`events ${name}: keyboard switches to List`);
      check(!await page.locator('#month-controls').isVisible(),`events ${name}: List hides month controls`);
      await month.click();
      check(await page.locator('.calendar-grid').isVisible(),`events ${name}: Month restores its calendar grid`);
      const bounds=await layout(page);check(bounds.scrollWidth<=bounds.width+1,`events ${name}: no horizontal overflow`,bounds);
      assertClean(session,'events '+name);
    }finally{entry.networkAndConsole={errors:session.errors,consoleErrors:session.consoleErrors,failedRequests:session.failedRequests,externalRequests:session.externalRequests};await context.close()}
  });

  for(const mode of ['reduced-motion','webgl-unavailable','no-javascript'])await phase(mode,async entry=>{
    const session=await makePage({reducedMotion:mode==='reduced-motion'?'reduce':'no-preference',javaScriptEnabled:mode!=='no-javascript'}),{page,context}=session;
    try {
      if(mode==='webgl-unavailable')await page.addInitScript(()=>{
        const original=HTMLCanvasElement.prototype.getContext;
        HTMLCanvasElement.prototype.getContext=function(type,...args){return /webgl/i.test(type)?null:original.call(this,type,...args)};
      });
      await page.goto(baseURL,{waitUntil:'networkidle',timeout:30000});
      if(mode!=='no-javascript') {
        const expected=mode==='reduced-motion'?'reduced-motion':'fallback';
        await page.waitForFunction(value=>window.__SAFFRON_QA__?.state===value,expected,{timeout:15000});
        entry.qa=await qa(page);check(entry.qa.frames===0,`${mode}: no live WebGL animation`);
      }
      const panels=await page.locator('[data-chapter]').evaluateAll(nodes=>nodes.map(node=>({id:node.id,position:getComputedStyle(node).position,opacity:getComputedStyle(node).opacity,visibility:getComputedStyle(node).visibility,hidden:node.getAttribute('aria-hidden'),inert:node.inert})));
      check(panels.every(panel=>panel.position==='relative'&&Number(panel.opacity)===1&&panel.visibility==='visible'&&panel.hidden!=='true'&&!panel.inert),`${mode}: every chapter is accessible in normal document flow`,panels);
      check(await page.locator('.reduced-illustration img').evaluateAll(nodes=>nodes.length>=3&&nodes.every(image=>image.complete&&image.naturalWidth>0)),`${mode}: static assembly and field illustrations load`);
      const bounds=await layout(page);check(bounds.scrollWidth<=bounds.width+1,`${mode}: no horizontal overflow`,bounds);
      entry.captures=[await capture(page,mode+'-hero')];
      await page.locator('#field').scrollIntoViewIfNeeded();entry.captures.push(await capture(page,mode+'-field'));
      assertClean(session,mode,{expectedWebGLFailure:mode==='webgl-unavailable'});
    }finally{entry.networkAndConsole={errors:session.errors,consoleErrors:session.consoleErrors,failedRequests:session.failedRequests,externalRequests:session.externalRequests};await context.close()}
  });
}catch(error){report.failures.push({name:'browser-launch-or-harness',error:String(error.stack||error)});console.error(error)}
finally{await browser?.close();report.finishedAt=new Date().toISOString();report.passed=report.failures.length===0;await save()}
console.log(`Evidence: ${evidence}/${reportFile}`);
if(!report.passed)process.exitCode=1;
