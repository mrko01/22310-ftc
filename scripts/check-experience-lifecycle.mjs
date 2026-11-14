import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {writeFile} from 'node:fs/promises';
const browser=await chromium.launch({headless:true,args:process.platform==='darwin'?['--use-angle=metal','--enable-gpu']:[]});
const report={checks:[],notes:['Chromium mobile viewport uses trusted CDP touch input; no physical phone tested.','Persisted page transition handlers are exercised directly; browser back navigation is also checked.']};
const base=process.env.SAFFRON_TEST_URL||'http://127.0.0.1:22311';
assert.ok(['localhost','127.0.0.1'].includes(new URL(base).hostname));
const record=(value,label)=>{assert.ok(value,label);report.checks.push(label);console.log('PASS '+label)};
const ready=page=>page.waitForFunction(()=>document.body.dataset.renderState==='webgl'&&window.__SAFFRON_QA__?.fieldLoaded&&document.querySelectorAll('.scene-controls').length===1,null,{timeout:60000});
try{
  const context=await browser.newContext();const page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
  let release,requested;const gate=new Promise(resolve=>release=resolve),request=new Promise(resolve=>requested=resolve);
  await page.route('**/assets/robot.glb',async route=>{requested();await gate;await route.continue()});
  await page.goto(base,{waitUntil:'domcontentloaded'});await request;
  await page.emulateMedia({reducedMotion:'reduce'});await page.emulateMedia({reducedMotion:'no-preference'});release();
  await ready(page);await page.waitForTimeout(400);
  record(await page.locator('.scene-controls').count()===1,'Changing motion preferences during loading leaves one scene/control set');
  await page.emulateMedia({reducedMotion:'reduce'});
  await page.waitForFunction(()=>!document.querySelector('.scene-controls'));
  record(await page.locator('body').evaluate(node=>node.classList.contains('reduced-motion')),'Reduced motion disposes live controls and reveals document flow');
  await page.emulateMedia({reducedMotion:'no-preference'});await ready(page);
  await page.evaluate(()=>dispatchEvent(new PageTransitionEvent('pagehide',{persisted:true})));
  record(await page.locator('.scene-controls').count()===0,'Persisted pagehide disposes the scene');
  await page.evaluate(()=>dispatchEvent(new PageTransitionEvent('pageshow',{persisted:true})));await ready(page);
  record(await page.locator('.scene-controls').count()===1,'Persisted pageshow restores the scene');
  await page.goto(new URL('/team/',base).href);await page.goBack();await ready(page);
  record(errors.length===0,'Back navigation restores WebGL without page errors');
  await context.close();

  const failedContext=await browser.newContext();const failedPage=await failedContext.newPage();
  await failedPage.route('**/assets/field-compressed.glb',route=>route.abort('failed'));
  await failedPage.goto(base);
  await failedPage.waitForFunction(()=>window.__SAFFRON_QA__?.state==='fallback',null,{timeout:60000});
  record(await failedPage.locator('.reduced-illustration img').evaluateAll(nodes=>nodes.every(n=>n.complete&&n.naturalWidth>0)),'Field-load failure reveals all static illustrations');
  record(await failedPage.locator('.scene-controls').count()===0,'Field-load failure removes unavailable live controls');
  await failedContext.close();

  const touchContext=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true});const touchPage=await touchContext.newPage();
  await touchPage.goto(base);await ready(touchPage);
  await touchPage.evaluate(()=>scrollTo(0,.7*(document.querySelector('#experience').offsetHeight-innerHeight)));
  await touchPage.waitForFunction(()=>Math.abs(window.__SAFFRON_QA__.sceneProgress-.7)<.001);
  const before=await touchPage.evaluate(()=>({y:scrollY,...structuredClone(window.__SAFFRON_QA__.interactions)}));
  const cdp=await touchContext.newCDPSession(touchPage);
  const [x,y]=before.hives[0].screen;
  const touch=(type,x,y)=>cdp.send('Input.dispatchTouchEvent',{type,touchPoints:type==='touchEnd'?[]:[{x,y,id:1,radiusX:5,radiusY:5,force:1}]});
  await touch('touchStart',x,y);
  for(let i=1;i<=10;i++){await touch('touchMove',x+9*i,y);await touchPage.waitForTimeout(35)}
  await touchPage.waitForFunction(()=>window.__SAFFRON_QA__.interactions.hives.some(h=>Math.abs(h.angle)>.22),null,{timeout:5000});
  const during=await touchPage.evaluate(()=>({y:scrollY,...structuredClone(window.__SAFFRON_QA__.interactions)}));
  await touch('touchEnd',x+90,y);
  record(during.spilledNativePieces>0,'Trusted horizontal touch drag tips native hive and spills nectar');
  record(Math.abs(during.y-before.y)<2,'Horizontal hive drag does not scroll the page');
  await touchPage.getByRole('button',{name:'Reset the field and robot'}).tap();
  await touchPage.waitForFunction(()=>window.__SAFFRON_QA__.interactions.spilledNativePieces===0);
  const scrollBefore=await touchPage.evaluate(()=>scrollY);
  await touch('touchStart',350,700);
  for(let i=1;i<=8;i++){await touch('touchMove',350,700-14*i);await touchPage.waitForTimeout(30)}
  await touch('touchEnd',350,588);await touchPage.waitForTimeout(350);
  record(await touchPage.evaluate(()=>scrollY)>scrollBefore+40,'Vertical touch swipe still scrolls through the field');
  report.touch={before,during};await touchContext.close();
  report.passed=true;
}catch(error){report.passed=false;report.error=String(error.stack||error);process.exitCode=1;console.error(error)}
finally{await browser.close();await writeFile('review/browser/lifecycle.json',JSON.stringify(report,null,2)+'\n')}
