import {build} from 'esbuild';
import {readFileSync,writeFileSync,copyFileSync,mkdirSync,readdirSync,rmSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {gzipSync} from 'node:zlib';
import {pages,navigation,footer,site} from '../src/pages.mjs';
const hash=value=>createHash('sha256').update(value).digest('hex').slice(0,12);
const pageUrl=path=>path==='404'?site.url+'404.html':site.url+(path?path+'/':'');
const htmlAttr=value=>String(value).replaceAll('&','&amp;').replaceAll('"','&quot;').replaceAll('<','&lt;').replaceAll('>','&gt;');
const schemaJSON=value=>JSON.stringify(value).replaceAll('<','\\u003c');
const logoImage={
  '@type':'ImageObject',
  '@id':site.url+'#logo',
  url:site.logo,
  contentUrl:site.logo,
  width:1254,
  height:1254,
  caption:site.logoAlt
};
const organization={
  '@type':'Organization',
  '@id':site.url+'#organization',
  name:site.name,
  alternateName:[site.team,'FIRST Tech Challenge Team 22310'],
  url:site.url,
  logo:{'@id':site.url+'#logo'},
  image:{'@id':site.url+'#logo'},
  email:'mailto:'+site.email,
  address:{'@type':'PostalAddress',addressLocality:site.city,addressRegion:site.region,addressCountry:site.country},
  memberOf:{'@type':'Organization',name:'FIRST Tech Challenge',url:'https://www.firstinspires.org/programs/ftc'}
};
function structuredData(path,page){
  const url=pageUrl(path);
  const graph=[
    organization,
    logoImage,
    {'@type':'WebSite','@id':site.url+'#website',url:site.url,name:site.name,description:site.description,publisher:{'@id':site.url+'#organization'},inLanguage:'en-CA'},
    {'@type':page.type,'@id':url+'#webpage',url,name:page.title,description:page.description,isPartOf:{'@id':site.url+'#website'},about:{'@id':site.url+'#organization'},primaryImageOfPage:{'@id':site.url+'#logo'},inLanguage:'en-CA'}
  ];
  if(path&&path!=='404')graph.push({'@type':'BreadcrumbList','@id':url+'#breadcrumb',itemListElement:[
    {'@type':'ListItem',position:1,name:'Home',item:site.url},
    ...(path.includes('/')?[{'@type':'ListItem',position:2,name:pages[path.split('/')[0]].title.replace(' · EDIT Saffron',''),item:pageUrl(path.split('/')[0])}]:[]),
    {'@type':'ListItem',position:path.includes('/')?3:2,name:page.title.replace(' · EDIT Saffron',''),item:url}
  ]});
  return {'@context':'https://schema.org','@graph':graph};
}
rmSync('dist',{recursive:true,force:true});
mkdirSync('dist/assets',{recursive:true});
// Finder/iCloud conflict copies ("name 2.png") and retired sources never ship.
const skipAsset=name=>name.startsWith('.')||/ \d+(\.[^.]+)?$/.test(name)||/ \d+\./.test(name)||['studio.hdr','subpages.css','interactions.css'].includes(name)||name.startsWith('mascot');
for(const name of readdirSync('src/assets'))if(!skipAsset(name))copyFileSync('src/assets/'+name,'dist/assets/'+name);
// Every asset URL carries a content hash, so assets can be cached for a year
// and a changed file is fetched fresh the moment its page changes.
const assetHash=Object.fromEntries(readdirSync('dist/assets').map(name=>[name,hash(readFileSync('dist/assets/'+name)).slice(0,10)]));
const escapeRe=value=>value.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
const assetPattern=new RegExp('/assets/('+Object.keys(assetHash).sort((a,b)=>b.length-a.length).map(escapeRe).join('|')+')(\\?v=[\\w.-]+)?','g');
const versioned=text=>text.replace(assetPattern,(_,name)=>`/assets/${name}?v=${assetHash[name]}`);
const experience=await build({entryPoints:{experience:'src/experience/main.js'},outdir:'dist/assets/experience',bundle:true,splitting:true,minify:true,format:'esm',target:'es2022',entryNames:'[name]-[hash]',chunkNames:'chunk-[hash]',legalComments:'linked',metafile:true,define:{__ASSETS__:JSON.stringify(assetHash)}});
writeFileSync('bundle-report.json',JSON.stringify(experience.metafile,null,2));
const experienceEntry=Object.entries(experience.metafile.outputs).find(([,info])=>info.entryPoint==='src/experience/main.js')[0].replace(/^dist/,'');
const cssBundle=async(files,out)=>{const result=await build({stdin:{contents:files.map(file=>readFileSync(file,'utf8')).join('\n'),loader:'css',resolveDir:process.cwd()},write:false,minify:true,target:['chrome111','safari16.4','firefox115']});writeFileSync(out,versioned(result.outputFiles[0].text));};
await cssBundle(['src/styles/tokens.css','src/styles/base.css','src/styles/home.css'],'dist/assets/home.css');
await cssBundle(['src/styles/tokens.css','src/styles/base.css','src/styles/pages.css'],'dist/assets/site.css');
await build({entryPoints:['src/site.js'],outfile:'dist/assets/site.js',bundle:true,format:'esm',minify:true,target:'es2022'});
// Minex (the Sudbury mining simulator at /minex/) ships its own script and styles.
await build({entryPoints:['src/minex/main.js'],outfile:'dist/assets/minex.js',bundle:true,format:'esm',minify:true,target:'es2022'});
await cssBundle(['src/styles/tokens.css','src/styles/base.css','src/minex/minex.css'],'dist/assets/minex.css');
const cssHash=hash(readFileSync('dist/assets/site.css')),jsHash=hash(readFileSync('dist/assets/site.js')),homeCSSHash=hash(readFileSync('dist/assets/home.css'));
const bundles={minex:{css:'/assets/minex.css?v='+hash(readFileSync('dist/assets/minex.css')),js:'/assets/minex.js?v='+hash(readFileSync('dist/assets/minex.js'))}};
const cspHashes=[];
for(const [path,page]of Object.entries(pages)){
  const home=path==='';
  const own=page.bundle&&bundles[page.bundle];
  const styles=home?`<link rel="stylesheet" href="/assets/home.css?v=${homeCSSHash}">`:own?`<link rel="stylesheet" href="${own.css}">`:`<link rel="stylesheet" href="/assets/site.css?v=${cssHash}">`;
  const script=home?experienceEntry:own?own.js:'/assets/site.js?v='+jsHash;
  const preload=home?`<link rel="modulepreload" href="${experienceEntry}"><link rel="preload" href="/assets/robot.glb" as="fetch" crossorigin media="(min-width: 801px) and (pointer: fine)"><link rel="preload" href="/assets/robot-mobile.glb" as="fetch" crossorigin media="(max-width: 800px), (pointer: coarse)">`:'';
  const url=pageUrl(path);
  const schema=schemaJSON(structuredData(path,page));
  cspHashes.push("'sha256-"+createHash('sha256').update(schema).digest('base64')+"'");
  const robots=path==='404'?'noindex, follow, noarchive, max-image-preview:none':'index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1';
  const seoLinks=path==='404'?'':'<link rel="canonical" href="'+url+'"><link rel="alternate" hreflang="en-ca" href="'+url+'"><link rel="alternate" hreflang="x-default" href="'+url+'">';
  const html=`<!doctype html>\n<html lang="en-CA" class="no-js"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><meta name="theme-color" content="#0a0a0b"><meta name="color-scheme" content="dark"><meta name="author" content="${htmlAttr(site.name)} · ${htmlAttr(site.team)}"><title>${htmlAttr(page.title)}</title><meta name="description" content="${htmlAttr(page.description)}"><meta name="robots" content="${robots}"><meta name="googlebot" content="${robots}">${seoLinks}<link rel="sitemap" type="application/xml" href="/sitemap.xml"><link rel="alternate" type="text/plain" href="/llms.txt" title="About EDIT Saffron"><meta property="og:locale" content="en_CA"><meta property="og:title" content="${htmlAttr(page.title)}"><meta property="og:description" content="${htmlAttr(page.description)}"><meta property="og:type" content="website"><meta property="og:url" content="${url}"><meta property="og:site_name" content="${htmlAttr(site.name)}"><meta property="og:image" content="${site.logo}"><meta property="og:image:secure_url" content="${site.logo}"><meta property="og:image:type" content="image/png"><meta property="og:image:width" content="1254"><meta property="og:image:height" content="1254"><meta property="og:image:alt" content="${htmlAttr(site.logoAlt)}"><meta name="twitter:card" content="summary_large_image"><meta name="twitter:title" content="${htmlAttr(page.title)}"><meta name="twitter:description" content="${htmlAttr(page.description)}"><meta name="twitter:image" content="${site.logo}"><meta name="twitter:image:alt" content="${htmlAttr(site.logoAlt)}"><link rel="icon" href="/assets/saffron-app-32.png" type="image/png"><link rel="apple-touch-icon" href="/assets/saffron-app-180.png"><link rel="preload" href="/assets/archivo-var.woff2" as="font" type="font/woff2" crossorigin><link rel="preload" href="/assets/jetbrains-mono-500.woff2" as="font" type="font/woff2" crossorigin>${styles}${preload}<script type="module" src="${script}"></script><script type="application/ld+json">${schema}</script></head><body>${navigation(path)}${page.body}${footer}</body></html>\n`;
  const destination=path==='404'?'dist/404.html':path?'dist/'+path+'/index.html':'dist/index.html';if(path&&path!=='404')mkdirSync('dist/'+path,{recursive:true});// Keep direct email links usable without JavaScript on Cloudflare.
  // https://developers.cloudflare.com/waf/tools/scrape-shield/email-address-obfuscation/
  writeFileSync(destination,versioned(html).replace(/<a\b[^>]*href="mailto:[^"]*"[^>]*>[\s\S]*?<\/a>/g,'<!--email_off-->$&<!--/email_off-->'));
}
const publicPages=Object.entries(pages).filter(([path])=>path!=='404');
writeFileSync('dist/robots.txt',`# EDIT Saffron's public website is intentionally crawlable, including by AI search and assistant crawlers.\nUser-agent: *\nAllow: /\n\nSitemap: ${site.url}sitemap.xml\n`);
writeFileSync('dist/sitemap.xml',`<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${publicPages.map(([path])=>`<url><loc>${pageUrl(path)}</loc></url>`).join('')}</urlset>\n`);
writeFileSync('dist/llms.txt',`# ${site.name}\n\n> ${site.description}\n\n${site.name} is an independent FIRST® Tech Challenge robotics team based at ${site.school} in ${site.city}, ${site.region}. The public site covers the team's students, engineering disciplines, competition calendar, outreach, and contact information.\n\n## Public pages\n\n${publicPages.map(([path,page])=>`- [${page.title.replace(' · EDIT Saffron','')}](${pageUrl(path)}): ${page.description}`).join('\n')}\n\n## Public-site scope\n\nThis file describes only the public website at ${site.url}. Use the linked pages as the source of truth for current public information.\n`);
writeFileSync('dist/_redirects','/minex /minex/ 301\n/sponsors/brief/ /sponsors/ 301\n/sponsors/brief /sponsors/ 301\n/assets/saffron-partnership-brief.pdf /sponsors/ 301\n');
writeFileSync('dist/_headers',`/*\n  X-Content-Type-Options: nosniff\n  X-Frame-Options: DENY\n  Referrer-Policy: strict-origin-when-cross-origin\n  Content-Language: en-CA\n  X-Robots-Tag: index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1\n  Permissions-Policy: camera=(), microphone=(), geolocation=()\n  Content-Security-Policy: default-src 'self'; script-src 'self' 'wasm-unsafe-eval' https://static.cloudflareinsights.com ${cspHashes.join(' ')}; style-src 'self'; img-src 'self' data: blob:; font-src 'self'; connect-src 'self' https://team.22310.ca wss://team.22310.ca https://cloudflareinsights.com https://static.cloudflareinsights.com; worker-src 'self' blob:; object-src 'none'; base-uri 'self'; frame-ancestors 'none'; form-action 'self'\n/assets/*\n  Cache-Control: public, max-age=31536000, immutable\n/robots.txt\n  Cache-Control: public, max-age=3600\n/sitemap.xml\n  Cache-Control: public, max-age=3600\n/llms.txt\n  Cache-Control: public, max-age=3600\n/404.html\n  X-Robots-Tag: noindex\n`);
for(const name of ['site.js','site.css','home.css','minex.js','minex.css']){const bytes=readFileSync('dist/assets/'+name);console.log(name+': '+(bytes.length/1024).toFixed(1)+' KB / '+(gzipSync(bytes).length/1024).toFixed(1)+' KB gzip');}
