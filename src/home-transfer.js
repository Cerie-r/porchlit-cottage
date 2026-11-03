// Portable save format: the transfer box's file, and the document a home keeps on the server.
export const saveKeys=['porchlit-home-layout-v1','porchlit-decoration-v1','porchlit-surfaces-v1','porchlit-lights-v1','porchlit-clock-v1','porchlit.wardrobe.v1','porchlit-hair-study-v1'];
// The keys that make up a home (and travel with it); anything else in the browser stays put.
export const isHomeKey=k=>saveKeys.includes(k)||/^porchlit-search-v1:[\w:.-]{1,100}$/.test(k);
const allowed=isHomeKey;
const plain=v=>v!==null&&typeof v==='object'&&!Array.isArray(v);
function safeValue(v,depth=0){if(depth>80)throw Error('存档层级过深');if(v&&typeof v==='object')for(const [k,x] of Object.entries(v)){if(['__proto__','prototype','constructor'].includes(k))throw Error('存档包含无效字段');safeValue(x,depth+1);}}
export function exportHome(storage){const entries={};for(let i=0;i<storage.length;i++){const key=storage.key(i);if(allowed(key)){const value=JSON.parse(storage.getItem(key));safeValue(value);entries[key]=value;}}return {format:'porchlit-home',version:1,exportedAt:new Date().toISOString(),entries};}
// Text the server's database can't hold: a NUL character, or half of a
// surrogate pair (half an emoji). Checked in keys and values alike.
const unstorable=/\u0000|[\ud800-\udbff](?![\udc00-\udfff])|(?<![\ud800-\udbff])[\udc00-\udfff]/;
function storable(v){if(typeof v==='string')return !unstorable.test(v);if(v&&typeof v==='object')return Object.entries(v).every(([k,x])=>!unstorable.test(k)&&storable(x));return true;}
// For the server only: a home with such text still imports into this browser
// (an old backup may hold half an emoji), it just can't be saved to the server.
export function storableHome(doc){if(!storable(doc?.entries))throw Error('存档里有存不进去的字符');return doc;}
// The same checks for a file someone imports and for a save sent to the server.
export function checkHome(doc){if(doc?.format!=='porchlit-home'||doc.version!==1||!plain(doc.entries)||!Object.keys(doc.entries).length)throw Error('这不是可用的小屋存档');safeValue(doc);for(const [key,value] of Object.entries(doc.entries)){if(!allowed(key)||!plain(value))throw Error('存档包含未知或无效内容');if(key==='porchlit-home-layout-v1'&&!plain(value.furniture))throw Error('家具数据不完整');}return doc;}
export function parseHome(text){if(typeof text!=='string'||text.length>20*1024*1024)throw Error('存档过大');return checkHome(JSON.parse(text));}
export function importHome(storage,doc){const valid=parseHome(JSON.stringify(doc));const before=exportHome(storage);const keys=new Set([...Object.keys(before.entries),...Object.keys(valid.entries)]);try{for(const k of keys)storage.removeItem(k);for(const [k,v] of Object.entries(valid.entries))storage.setItem(k,JSON.stringify(v));}catch(error){for(const k of keys)storage.removeItem(k);for(const [k,v] of Object.entries(before.entries))storage.setItem(k,JSON.stringify(v));throw Error('空间不足，导入未完成；原存档已还原');}return Object.keys(valid.entries).length;}
export function downloadHome(doc){const url=URL.createObjectURL(new Blob([JSON.stringify(doc,null,2)],{type:'application/json'}));const a=document.createElement('a');a.href=url;a.download='porchlit-home-'+new Date().toISOString().slice(0,10)+'.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
// A few things a person recognises their home by, to tell two copies apart
// (the server counts the same way for its put-aside copies).
export function summarize(doc){const made=doc?.entries?.['porchlit-home-layout-v1']?.creations;const items=Array.isArray(made)?made.filter(plain):[];return {works:items.filter(i=>i.kind!=='note').length,notes:items.filter(i=>i.kind==='note').length};}
