import {build} from 'esbuild';
import {readFileSync,writeFileSync} from 'node:fs';
import {gzipSync} from 'node:zlib';
const result=await build({entryPoints:['dist/assets/mascot.js'],outfile:'dist/assets/mascot.bundle.js',bundle:true,minify:true,format:'esm',target:'es2022',legalComments:'linked',metafile:true});
writeFileSync('bundle-report.json',JSON.stringify(result.metafile,null,2));
const bytes=readFileSync('dist/assets/mascot.bundle.js');
console.log(`3D bundle: ${(bytes.length/1024).toFixed(0)} KB, ${(gzipSync(bytes).length/1024).toFixed(0)} KB gzip`);
