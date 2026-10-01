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
    if(raw.startsWith('mailto:')&&!html.includes('<!--email_off--><a'))errors.push(route+': direct email fallback is missing Cloudflare protection');
    if(/^(https?:|mailto:|data:)/.test(raw))continue;
    const url=new URL(raw.replaceAll('&amp;','&'),'https://22310.ca'+route);
    const target=url.pathname.endsWith('/')?'dist'+url.pathname+'index.html':'dist'+url.pathname;
    if(!existsSync(target)){errors.push(route+': missing '+url.pathname);continue;}
    if(url.hash&&target.endsWith('.html')){const anchor=decodeURIComponent(url.hash.slice(1));if(!read(target).includes('id="'+anchor+'"'))errors.push(route+': missing anchor '+raw);}
  }
}
const sponsor=read('dist/sponsors/index.html');
const home=read('dist/index.html');
if((home.match(/<header class="site-header"/g)||[]).length!==1)errors.push('Home must have exactly one navigation header');
if(home.includes('/assets/site.js?'))errors.push('Home must not load the production subpage bundle');
for(const path of ['.local-messages','api','assets/field.glb','assets/subpages.js'])if(existsSync('dist/'+path))errors.push('Unexpected prototype/private asset published: '+path);
const contact=read('dist/contact/index.html');
if(!contact.includes('id="contact-form"')||!contact.includes('id="email-fallback"'))errors.push('Contact must retain inline form and secondary email option');
if(!read('dist/events/index.html').includes('data-view="month" aria-pressed="true"'))errors.push('Calendar must default to Month view');
if(!sponsor.includes('docs.google.com/presentation/d/1oGsSP_7ACpBvWPNOVP26FnDXzV3fG_IkUBOh9UIbEUo'))errors.push('Missing Lo-Ellen sponsorship package link');
if(existsSync('dist/assets/saffron-partnership-brief.pdf')||existsSync('dist/sponsors/brief/index.html'))errors.push('Outdated sponsor brief is still published');
if(errors.length){console.error(errors.join('\n'));process.exitCode=1;}else console.log(`Checked ${files.size} public pages: internal routes, assets, anchors, unique IDs, H1s, structured data, and sponsor package link are valid.`);
