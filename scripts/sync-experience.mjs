import {copyFileSync, mkdirSync, readFileSync, writeFileSync, existsSync} from 'node:fs';
import {resolve, join} from 'node:path';
import {createHash} from 'node:crypto';

// Explicit allowlists keep local enquiry captures, source CAD, review screenshots,
// and the uncompressed field out of the deployable site. Build works independently
// from this prototype once these reviewed inputs have been synced.
const prototype = resolve(process.argv[2] || '../prototype');
const source = ['main.js','scene.js','materials.js','interactions.js','timeline.mjs','style.css'];
const assets = ['robot.glb','field-compressed.glb','field-metadata.json','studio.hdr',
  'robot-poster.png','shooter-poster.png','field-poster.png','neuropol.otf',
  'interactions.css','subpages.css'];
const manifest = {source:'Reviewed local robot/field experience',files:[]};
function copy(from, to) {
  if (!existsSync(from)) throw new Error('Missing required experience input: '+from);
  copyFileSync(from,to);
  const bytes=readFileSync(to);
  manifest.files.push({path:to,bytes:bytes.length,sha256:createHash('sha256').update(bytes).digest('hex')});
}
mkdirSync('src/experience',{recursive:true});
for(const name of source) copy(join(prototype,'src',name),'src/experience/'+name);
for(const name of assets) copy(join(prototype,'public/assets',name),'src/assets/'+name);
const html=readFileSync(join(prototype,'index.html'),'utf8');
const body=html.match(/<body>([\s\S]*?)<\/body>/)?.[1];
if(!body)throw new Error('Prototype is missing its body');
writeFileSync('src/experience/home.html',body.trim()+'\n');
for(const name of ['interactions.test.mjs','timeline.test.mjs']) {
  const input=join(prototype,'tests',name);
  if(existsSync(input))writeFileSync('tests/experience-'+name,readFileSync(input,'utf8').replaceAll('../src/','../src/experience/'));
}
writeFileSync('src/experience/manifest.json',JSON.stringify(manifest,null,2)+'\n');
console.log('Synced '+manifest.files.length+' experience files. No private preview handlers or outbox copied.');
