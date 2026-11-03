import http from 'node:http';
import {readFile,stat} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createApi} from './api.mjs';
import {createMcp} from './mcp.mjs';
import {createPool,databaseConfig} from './db.mjs';
import {loadMigrations,schemaStatus} from './migrate.mjs';
import {oursAllowed} from './ours.mjs';
import {createGate} from './passwords.mjs';
import {accountLimits} from './limits.mjs';
import {CanaryProblem,checkCanary,keySecret,secretProblem} from './keys.mjs';
const root=fileURLToPath(new URL('../dist/',import.meta.url));
// db is {pool, migrations} when there is a database, otherwise null. /health
// waits at most two seconds for it, so a database that is down shows as down
// instead of holding the request.
async function databaseState(db){if(!db)return 'off';let timer;try{return await Promise.race([schemaStatus(db.pool,db.migrations),new Promise(r=>{timer=setTimeout(()=>r('down'),2000);})]);}finally{clearTimeout(timer);}}
// The scheme the visitor's browser used: Cloudflare's own word for it first (cf-visitor, when it stands in front), then
// the router's (x-forwarded-proto, Heroku's); '' when the request came straight to the server (local).
export function visitorScheme(headers){try{const v=JSON.parse(headers['cf-visitor']||'null');if(v&&typeof v.scheme==='string')return v.scheme;}catch{}return String(headers['x-forwarded-proto']||'').split(',')[0].trim().toLowerCase();}
const LOCAL=/^(localhost|127\.0\.0\.1|\[::1\])(:\d+)?$/i,HOST=/^[a-z0-9.-]+(:\d+)?$/i;
// Pictures outside /assets/ whose names stay the same between builds (the outing pages', the wardrobe's): kept a day.
// Everything else that keeps its name (models, the fit, the pages) is asked about each time, so it always matches the
// code that reads it.
const KEPT_A_DAY=/^\/(explore|wardrobe)\/.+\.(webp|png|jpg)$/;
const types={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json','.png':'image/png','.webp':'image/webp','.jpg':'image/jpeg','.svg':'image/svg+xml','.glb':'model/gltf-binary','.woff2':'font/woff2','.ico':'image/x-icon'};
// ours: who may have the home's own things (server/ours.mjs; OURS_ACCOUNTS when not given; true for anyone, which only
// a local tool asks for: scripts/wardrobe-pictures.mjs). files: the built site to serve (dist/). api and mcp: the
// people's doors and the AIs' (server/mcp.mjs, at /mcp and at the root of an mcp.* host); by default they share one
// password-hashing gate, so one hash runs at a time in the whole process, and one set of account limits, so a password
// tried at one door counts at the other.
export function createServer({db=null,gate=createGate(),accounts=accountLimits(),api=db?createApi({pool:db.pool,gate,accounts}):null,mcp=db?createMcp({pool:db.pool,gate,accounts}):null,ours,files=root}={}){const oursDir=path.join(files,'ours');return http.createServer(async(req,res)=>{
 res.setHeader('X-Content-Type-Options','nosniff');
 let url,pathname;try{url=new URL(req.url,'http://localhost');pathname=decodeURIComponent(url.pathname);}catch{res.writeHead(400);res.end();return;}
 if(pathname==='/api'||pathname.startsWith('/api/')){if(api)await api(req,res,pathname);else{res.writeHead(503,{'Content-Type':'application/json; charset=utf-8','Access-Control-Allow-Origin':'*','Cache-Control':'no-store'});res.end(JSON.stringify({error:{code:'no_database',message:'这里还没接上数据库。'}}));}return;}
 // The AIs' door. Its address carries a key in ?token=, so nothing here ever logs the URL.
 if(pathname==='/mcp'||(pathname==='/'&&/^mcp\./i.test(req.headers.host||''))){if(mcp)await mcp(req,res,url);else{res.writeHead(503,{'Content-Type':'application/json; charset=utf-8','Access-Control-Allow-Origin':'*','Cache-Control':'no-store'});res.end(JSON.stringify({jsonrpc:'2.0',id:null,error:{code:-32000,message:'这里还没接上数据库。'}}));}return;}
 if(!['GET','HEAD'].includes(req.method)){res.writeHead(405,{'Allow':'GET, HEAD'});res.end();return;}
 if(pathname==='/health'){const database=await databaseState(db);res.writeHead(200,{'Content-Type':'application/json','Cache-Control':'no-store'});res.end(req.method==='HEAD'?undefined:JSON.stringify({status:'ok',database}));return;}
 // A page asked for over plain http goes over to https: an http page isn't a secure context, and the browser leaves
 // out what the page needs from one (crypto.randomUUID among them, which hiding a letter uses).
 const host=String(req.headers.host||'');
 if(visitorScheme(req.headers)==='http'&&HOST.test(host)&&!LOCAL.test(host)){res.writeHead(301,{Location:'https://'+host+req.url,'Cache-Control':'no-store'});res.end();return;}
 if(pathname.split('/').some(p=>p.startsWith('.'))||pathname.includes('\\')||pathname.includes('\0')){res.writeHead(404);res.end();return;}
 let target=path.resolve(files,'.'+pathname);
 if(target!==path.resolve(files)&&!target.startsWith(path.resolve(files)+path.sep)){res.writeHead(404);res.end();return;}
 // A home's own things only for that home (server/ours.mjs); to anyone else they aren't there. Decided by where
 // the file is, however the path was written.
 const own=target===oursDir||target.startsWith(oursDir+path.sep);
 if(own&&ours!==true&&!(await oursAllowed(db?.pool,req,ours).catch(()=>false))){res.writeHead(404,{'Content-Type':'text/plain; charset=utf-8','Cache-Control':'no-store'});res.end(req.method==='HEAD'?undefined:'Not found');return;}
 try{
  let info=await stat(target);if(info.isDirectory()){target=path.join(target,'index.html');info=await stat(target);}
  if(!info.isFile())throw Error('not file');
  // Files outside /assets/ keep their names between builds, so browsers ask
  // each time; the tag lets an unchanged file come back as "same as before".
  const ext=path.extname(target),cache=own?'private, max-age=31536000, immutable':pathname.startsWith('/assets/')?'public, max-age=31536000, immutable':KEPT_A_DAY.test(pathname)?'public, max-age=86400':'no-cache';
  const tag=`W/"${info.size.toString(36)}-${Math.floor(info.mtimeMs).toString(36)}"`;
  if(req.headers['if-none-match']===tag){res.writeHead(304,{ETag:tag,'Cache-Control':cache});res.end();return;}
  const body=await readFile(target);
  res.writeHead(200,{'Content-Type':types[ext]||'application/octet-stream','Content-Length':body.length,'Cache-Control':cache,ETag:tag});
  res.end(req.method==='HEAD'?undefined:body);
 }catch{res.writeHead(404,{'Content-Type':'text/plain; charset=utf-8'});res.end(req.method==='HEAD'?undefined:'Not found');}
});}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const config=databaseConfig();
 const db=config?{pool:createPool(config),migrations:await loadMigrations()}:null;
 // The key canary (server/keys.mjs): a secret other than the one the keys were signed with stops the start, so
 // nothing runs that would turn every AI away. A database that can't be reached isn't that: the AIs' door asks again.
 const secret=keySecret(),weak=secretProblem();if(weak)console.error('keys:',weak);
 if(db&&secret){try{console.log('keys: canary',await checkCanary(db.pool,secret));}catch(err){if(err instanceof CanaryProblem){console.error('keys:',err.message);process.exit(1);}console.error('keys: the canary could not be checked yet:',err.message);}}
 const server=createServer({db});server.listen(Number(process.env.PORT)||3000,'0.0.0.0',async()=>{console.log('Porchlit is ready');if(db)console.log('database:',await databaseState(db));});
 process.on('SIGTERM',()=>server.close(async()=>{await db?.pool.end();process.exit(0);}));
}
