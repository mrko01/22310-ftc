import {chromium} from 'playwright';
import {mkdir,writeFile} from 'node:fs/promises';
const browser=await chromium.launch({headless:true,args:process.platform==='darwin'?['--use-angle=metal','--enable-gpu']:[]});
const report={scope:'Owned headless browser on this Mac; mobile is viewport emulation, not physical-phone performance.',samples:[]};
try{
  for(const [label,viewport] of [['desktop',{width:1440,height:900}],['mobile',{width:390,height:844}]]){
    const page=await browser.newPage({viewport,deviceScaleFactor:label==='mobile'?2:1,isMobile:label==='mobile',hasTouch:label==='mobile'});
    await page.goto('http://127.0.0.1:22311/');
    await page.waitForFunction(()=>window.__SAFFRON_QA__?.fieldLoaded,null,{timeout:60000});
    await page.evaluate(()=>scrollTo(0,.7*(document.querySelector('#experience').offsetHeight-innerHeight)));
    await page.waitForFunction(()=>Math.abs(window.__SAFFRON_QA__.sceneProgress-.7)<.001);
    await page.keyboard.down('d');
    const data=await page.evaluate(()=>new Promise(resolve=>{
      const start=performance.now(),first=window.__SAFFRON_QA__.frames,intervals=[];let previous=start;
      const sample=now=>{intervals.push(now-previous);previous=now;if(now-start<3000){requestAnimationFrame(sample);return}
        const qa=window.__SAFFRON_QA__,sorted=intervals.slice(1).sort((a,b)=>a-b),gl=document.querySelector('#scene').getContext('webgl2'),extension=gl.getExtension('WEBGL_debug_renderer_info');
        resolve({elapsedMs:now-start,renderedFrames:qa.frames-first,renderFPS:(qa.frames-first)*1000/(now-start),medianFrameMs:sorted[Math.floor(sorted.length*.5)],p95FrameMs:sorted[Math.floor(sorted.length*.95)],triangles:qa.triangles,drawCalls:qa.drawCalls,pixelRatio:qa.pixelRatio,renderer:extension?gl.getParameter(extension.UNMASKED_RENDERER_WEBGL):'unknown'});
      };requestAnimationFrame(sample);
    }));
    await page.keyboard.up('d');report.samples.push({label,...data});console.log(label,JSON.stringify(data));await page.close();
  }
}finally{await browser.close();await mkdir('review/browser',{recursive:true});await writeFile('review/browser/performance.json',JSON.stringify(report,null,2)+'\n')}
