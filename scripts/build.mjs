import {build} from 'esbuild';
import {readFileSync,writeFileSync,renameSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {gzipSync} from 'node:zlib';
const result=await build({entryPoints:['dist/assets/mascot.js'],outfile:'dist/assets/mascot.bundle.js',write:false,bundle:true,minify:true,format:'esm',target:'es2022',legalComments:'linked',metafile:true});
for(const file of result.outputFiles){writeFileSync(file.path+'.tmp',file.contents);renameSync(file.path+'.tmp',file.path);}
writeFileSync('bundle-report.json',JSON.stringify(result.metafile,null,2));
const bytes=readFileSync('dist/assets/mascot.bundle.js');
console.log(`3D bundle: ${(bytes.length/1024).toFixed(0)} KB, ${(gzipSync(bytes).length/1024).toFixed(0)} KB gzip`);

const version=createHash('sha256').update(bytes).digest('hex').slice(0,12);
for(const path of ['dist/index.html','dist/assets/site.js']){
  const source=readFileSync(path,'utf8').replace(/mascot\.bundle\.js(?:\?v=[a-f0-9]+)?/g,'mascot.bundle.js?v='+version);
  writeFileSync(path+'.tmp',source);renameSync(path+'.tmp',path);
}
