import {createServer} from 'node:http';
import {readFile,stat} from 'node:fs/promises';
import {resolve,extname} from 'node:path';
const root=resolve('dist'),port=Number(process.env.PORT||22311);
const types={'.html':'text/html; charset=utf-8','.js':'text/javascript','.css':'text/css','.json':'application/json','.svg':'image/svg+xml','.png':'image/png','.jpg':'image/jpeg','.woff2':'font/woff2','.otf':'font/otf','.glb':'model/gltf-binary'};
createServer(async(req,res)=>{
  try{
    let path=resolve(root,'.'+decodeURIComponent(new URL(req.url,'http://localhost').pathname));
    if(path!==root&&!path.startsWith(root+'/'))throw new Error('Outside build');
    if((await stat(path)).isDirectory())path+='/index.html';
    const headers=await readFile(resolve(root,'_headers'),'utf8');
    res.setHeader('Content-Security-Policy',headers.match(/Content-Security-Policy: (.*)/)[1]);
    res.setHeader('X-Content-Type-Options','nosniff');res.setHeader('Cache-Control','no-store');
    res.setHeader('Content-Type',types[extname(path)]||'application/octet-stream');
    res.end(await readFile(path));
  }catch{res.statusCode=404;res.end('Not found')}
}).listen(port,'127.0.0.1',()=>console.log('Production build preview: http://127.0.0.1:'+port+' (loopback only; real contact/calendar API contracts)'));
