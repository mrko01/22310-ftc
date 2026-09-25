import {readFileSync,existsSync} from 'node:fs';
import {pages} from '../src/pages.mjs';
const files=new Map(Object.keys(pages).map(path=>[path==='404'?'/404.html':'/'+(path?path+'/':''),path==='404'?'dist/404.html':'dist/'+(path?path+'/':'')+'index.html']));
const errors=[];
const read=path=>readFileSync(path,'utf8');
for(const [route,file] of files){
  const html=read(file),ids=[...html.matchAll(/\bid="([^"]+)"/g)].map(m=>m[1]);
  if(new Set(ids).size!==ids.length)errors.push(route+': duplicate IDs');
  if((html.match(/<h1[\s>]/g)||[]).length!==1)errors.push(route+': expected one H1');
  JSON.parse(html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)?.[1]||'null');
  for(const [,raw]of html.matchAll(/(?:href|src)="([^"]+)"/g)){
    if(/^(https?:|mailto:|data:)/.test(raw))continue;
    const url=new URL(raw.replaceAll('&amp;','&'),'https://22310.ca'+route);
    const target=url.pathname.endsWith('/')?'dist'+url.pathname+'index.html':'dist'+url.pathname;
    if(!existsSync(target)){errors.push(route+': missing '+url.pathname);continue;}
    if(url.hash&&target.endsWith('.html')){const anchor=decodeURIComponent(url.hash.slice(1));if(!read(target).includes('id="'+anchor+'"'))errors.push(route+': missing anchor '+raw);}
  }
}
const pdf='dist/assets/saffron-partnership-brief.pdf';
if(!existsSync(pdf)||readFileSync(pdf).subarray(0,5).toString()!=='%PDF-')errors.push('Missing or invalid partnership PDF');
if(errors.length){console.error(errors.join('\n'));process.exitCode=1;}else console.log(`Checked ${files.size} public pages: internal routes, assets, anchors, unique IDs, H1s, structured data, and PDF are valid.`);
