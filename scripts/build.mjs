import {build} from 'esbuild';
import {readFileSync,writeFileSync,copyFileSync,mkdirSync,readdirSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {gzipSync} from 'node:zlib';
import {pages,navigation,footer} from '../src/pages.mjs';
const hash=value=>createHash('sha256').update(value).digest('hex').slice(0,12);
for(const name of readdirSync('src/assets'))copyFileSync('src/assets/'+name,'dist/assets/'+name);
const scene=await build({entryPoints:['dist/assets/mascot.js'],outfile:'dist/assets/mascot.bundle.js',bundle:true,minify:true,format:'esm',target:'es2022',legalComments:'linked',metafile:true});
writeFileSync('bundle-report.json',JSON.stringify(scene.metafile,null,2));
const sceneHash=hash(readFileSync('dist/assets/mascot.bundle.js'));
const js=await build({entryPoints:['src/site.js'],bundle:true,write:false,format:'esm',minify:true,target:'es2022',external:['./mascot.bundle.js']});
writeFileSync('dist/assets/site.js',js.outputFiles[0].text.replace('./mascot.bundle.js','./mascot.bundle.js?v='+sceneHash));
const css=await build({entryPoints:['src/site.css'],write:false,minify:true,target:'es2022'});
writeFileSync('dist/assets/site.css',css.outputFiles[0].contents);
const cssHash=hash(readFileSync('dist/assets/site.css')),jsHash=hash(readFileSync('dist/assets/site.js'));
const cspHashes=[];
for(const [path,page]of Object.entries(pages)){
  const url='https://22310.ca/'+(path&&path!=='404'?path+'/':'');
  const schema=JSON.stringify({'@context':'https://schema.org','@type':page.type,'name':page.title,'description':page.description,'url':url,'about':{'@type':'Organization','name':'EDIT Saffron','alternateName':'FTC Team 22310','url':'https://22310.ca/','logo':'https://22310.ca/assets/saffron-app-512.png'}});
  cspHashes.push("'sha256-"+createHash('sha256').update(schema).digest('base64')+"'");
  const html=`<!doctype html>\n<html lang="en-CA"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><meta name="theme-color" content="#f8f0e0"><title>${page.title}</title><meta name="description" content="${page.description}"><link rel="canonical" href="${url}"><meta property="og:title" content="${page.title}"><meta property="og:description" content="${page.description}"><meta property="og:type" content="website"><meta property="og:url" content="${url}"><meta property="og:site_name" content="EDIT Saffron"><meta property="og:image" content="https://22310.ca/assets/saffron-app-1024.png"><meta property="og:image:alt" content="Saffron filaments and 22310 on a warm orange badge"><meta name="twitter:card" content="summary"><meta name="robots" content="${path==='404'?'noindex':'index, follow, max-image-preview:large'}"><link rel="icon" href="/assets/saffron-mark.svg" type="image/svg+xml"><link rel="apple-touch-icon" href="/assets/saffron-app-180.png"><link rel="preload" href="/assets/dm-sans-400.woff2" as="font" type="font/woff2" crossorigin><link rel="stylesheet" href="/assets/site.css?v=${cssHash}"><script type="module" src="/assets/site.js?v=${jsHash}"></script><script type="application/ld+json">${schema}</script></head><body>${navigation(path)}${page.body}${footer}</body></html>\n`;
  const destination=path==='404'?'dist/404.html':path?'dist/'+path+'/index.html':'dist/index.html';if(path&&path!=='404')mkdirSync('dist/'+path,{recursive:true});writeFileSync(destination,html);
}
writeFileSync('dist/_headers',`/*\n  X-Content-Type-Options: nosniff\n  X-Frame-Options: DENY\n  Referrer-Policy: strict-origin-when-cross-origin\n  Permissions-Policy: camera=(), microphone=(), geolocation=()\n  Content-Security-Policy: default-src 'self'; script-src 'self' ${cspHashes.join(' ')}; style-src 'self'; img-src 'self' data:; font-src 'self'; connect-src 'self' https://team.22310.ca wss://team.22310.ca; object-src 'none'; base-uri 'self'; frame-ancestors 'none'; form-action 'self'\n/assets/*\n  Cache-Control: public, max-age=3600\n`);
for(const name of ['site.js','site.css','mascot.bundle.js']){const bytes=readFileSync('dist/assets/'+name);console.log(name+': '+(bytes.length/1024).toFixed(1)+' KB / '+(gzipSync(bytes).length/1024).toFixed(1)+' KB gzip');}
