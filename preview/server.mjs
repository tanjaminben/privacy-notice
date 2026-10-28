import http from 'node:http';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {readFile, realpath, stat} from 'node:fs/promises';

const index=process.argv.indexOf('--output-root');
if(index>=0&&!process.argv[index+1])throw Error('--output-root requires a directory');
const root=await realpath(index<0?path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../site'):path.resolve(process.argv[index+1],'site'));
const port=Number(process.env.PORT||8920);
const types={'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'text/javascript; charset=utf-8','.mjs':'text/javascript; charset=utf-8','.json':'application/json','.svg':'image/svg+xml','.png':'image/png','.webp':'image/webp','.jpg':'image/jpeg','.ttf':'font/ttf','.woff2':'font/woff2','.txt':'text/plain; charset=utf-8'};
const inside=p=>{const relative=path.relative(root,p);return relative!=='..'&&!relative.startsWith('..'+path.sep)&&!path.isAbsolute(relative);};
http.createServer(async(req,res)=>{
  if(![`127.0.0.1:${port}`,`localhost:${port}`].includes(req.headers.host)){res.writeHead(421).end();return;}
  if(!['GET','HEAD'].includes(req.method)){res.writeHead(405,{Allow:'GET, HEAD'}).end();return;}
  try{
    const url=new URL(req.url,'http://localhost');
    const pathname=decodeURIComponent(url.pathname);
    if(pathname.includes('\0')||pathname.includes('\\')||pathname.split('/').some(p=>p.startsWith('.'))){res.writeHead(403).end();return;}
    if(pathname==='/'||pathname==='/guides/privacy-notice'){res.writeHead(302,{Location:'/guides/privacy-notice/'+url.search}).end();return;}
    const file=path.resolve(root,'.'+pathname+(pathname.endsWith('/')?'index.html':''));
    if(!inside(file)){res.writeHead(403).end();return;}
    if(!pathname.startsWith('/guides/privacy-notice/')&&(!path.extname(pathname)||pathname.endsWith('.html'))&&!(await stat(file).catch(()=>null))?.isFile()){
      res.writeHead(302,{Location:'https://ben-tan.com'+url.pathname+url.search}).end();return;
    }
    if(!inside(file)||!inside(await realpath(file))||!(await stat(file)).isFile()){res.writeHead(404).end();return;}
    const data=await readFile(file);
    res.writeHead(200,{'Content-Type':types[path.extname(file)]||'application/octet-stream','Content-Length':data.length,'Cache-Control':'no-store','X-Content-Type-Options':'nosniff','X-Robots-Tag':'noindex, nofollow'});
    res.end(req.method==='HEAD'?undefined:data);
  }catch{res.writeHead(404).end('Local resource unavailable');}
}).listen(port,'127.0.0.1',()=>console.log(`Anatomy preview: http://127.0.0.1:${port}/guides/privacy-notice/?edition=plain`));
