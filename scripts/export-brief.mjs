import {createServer} from 'node:http';
import {readFile,writeFile} from 'node:fs/promises';
import {resolve,extname,sep} from 'node:path';
import {chromium} from 'playwright';
const root=resolve('dist');
const mime={'.html':'text/html','.css':'text/css','.js':'text/javascript','.png':'image/png','.svg':'image/svg+xml','.woff2':'font/woff2'};
const server=createServer(async(req,res)=>{
  try{let pathname=decodeURIComponent(new URL(req.url,'http://localhost').pathname);if(pathname.endsWith('/'))pathname+='index.html';const file=resolve(root,'.'+pathname);if(!file.startsWith(root+sep))throw new Error();const data=await readFile(file);res.writeHead(200,{'Content-Type':mime[extname(file)]||'application/octet-stream'});res.end(data);}catch{res.writeHead(404);res.end();}
});
await new Promise(done=>server.listen(0,'127.0.0.1',done));
let browser;
try{
  browser=await chromium.launch();
  const context=await browser.newContext({javaScriptEnabled:false});
  const page=await context.newPage();
  await page.goto(`http://127.0.0.1:${server.address().port}/sponsors/brief/`,{waitUntil:'networkidle'});
  await page.evaluate(()=>document.fonts.ready);
  const pdf=await page.pdf({format:'A4',printBackground:true,preferCSSPageSize:true,tagged:true,outline:true});
  await writeFile('src/assets/saffron-partnership-brief.pdf',pdf);
  await writeFile('dist/assets/saffron-partnership-brief.pdf',pdf);
  console.log(`Partnership brief exported: ${(pdf.length/1024).toFixed(1)} KB.`);
}finally{await browser?.close();await new Promise(done=>server.close(done));}
