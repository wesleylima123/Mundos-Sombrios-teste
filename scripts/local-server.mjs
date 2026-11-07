import http from 'node:http';
import { createReadStream, existsSync, statSync } from 'node:fs';
import { extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';
const root=fileURLToPath(new URL('../',import.meta.url));
const port=Math.max(1,Math.min(65535,Number(process.argv[2])||8080));
const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json; charset=utf-8','.txt':'text/plain; charset=utf-8','.md':'text/markdown; charset=utf-8','.svg':'image/svg+xml','.png':'image/png','.jpg':'image/jpeg','.jpeg':'image/jpeg','.webp':'image/webp','.ico':'image/x-icon','.pdf':'application/pdf','.ogg':'audio/ogg','.mp3':'audio/mpeg','.wav':'audio/wav','.woff2':'font/woff2'};
http.createServer((req,res)=>{
  try{
    const raw=decodeURIComponent(String(req.url||'/').split('?')[0]);
    let rel=normalize(raw).replace(/^([/\\])+/, '');
    if(rel.includes('..')){res.writeHead(403);return res.end('Forbidden');}
    let file=join(root,rel);
    if(existsSync(file)&&statSync(file).isDirectory()) file=join(file,'index.html');
    if(!existsSync(file)||!statSync(file).isFile()){res.writeHead(404);return res.end('Not found');}
    res.writeHead(200,{'Content-Type':mime[extname(file).toLowerCase()]||'application/octet-stream','Cache-Control':'no-store'});
    const stream=createReadStream(file);
    stream.on('error',()=>{if(!res.headersSent)res.writeHead(500);res.end();});
    stream.pipe(res);
  }catch(error){res.writeHead(500);res.end(String(error?.message||error));}
}).listen(port,'127.0.0.1',()=>console.log(`Site Oficial MS: http://localhost:${port}/`));
