import {spotsFor} from './hiding-spots.js';
export const parts={tile:{label:'单格薄片',size:[1,.5,1]},brick:{label:'方砖',size:[1,1,1]},long:{label:'长砖',size:[2,1,1]},plate:{label:'薄板',size:[2,.5,2]},round:{label:'圆柱',size:[1,1,1]},dome:{label:'弧顶',size:[1,1,1]},leaf:{label:'叶片',size:[1,.5,2]},flower:{label:'小花',size:[1,.5,1]}};
export const colors=['#fff5e9','#e6b8c9','#c5b8da','#b5cbbb','#94b8c5','#c4a17b','#685460','#efd58e'];
export const emptyDraft=()=>({name:'我的小礼物',bricks:[]});
export function bounds(b){const s=parts[b.type].size;return {x:b.x,z:b.z,y:b.y,w:b.turn%2?s[2]:s[0],d:b.turn%2?s[0]:s[2],h:s[1]};}
export function validPlacement(bricks,b){
 const a=bounds(b);if(a.x<0||a.z<0||a.y<0||a.x+a.w>8||a.z+a.d>8||a.y+a.h>8)return false;
 const others=bricks.filter(p=>p.id!==b.id).map(bounds);
 const overlaps=(p,q)=>p.x<q.x+q.w&&p.x+p.w>q.x&&p.z<q.z+q.d&&p.z+p.d>q.z;
 if(others.some(p=>overlaps(a,p)&&a.y<p.y+p.h&&a.y+a.h>p.y))return false;
 return a.y===0||others.some(p=>overlaps(a,p)&&Math.abs(p.y+p.h-a.y)<.001);
}
export function validBuild(bricks){return bricks.length>0&&bricks.length<=120&&bricks.every(b=>parts[b.type]&&validPlacement(bricks,b));}
// A placed thing and everything resting on it, however high the pile: what
// stands on a build has the build as its support ('creation:' and its id).
export function stackOf(items,id){
 const out=new Set(id?[id]:[]);
 for(let grew=!!id;grew;){grew=false;for(const i of items)if(!out.has(i.id)&&i.location==='room'&&i.support?.startsWith('creation:')&&out.has(i.support.slice(9))){out.add(i.id);grew=true;}}
 return out;
}
// Setting a thing down somewhere in the house (at: position, support, and for
// a build on a wall its turn and wall): what rests on it comes along to the
// same floor and room.
export function placeItem(items,id,at,floor,room){
 const riding=stackOf(items,id);riding.delete(id);
 return items.map(i=>i.id===id?{...i,location:'room',spotId:undefined,floor,room,...at}:riding.has(i.id)?{...i,floor,room}:i);
}
// Taking a placed thing out of the room brings what rests on it back to the bag.
export function moveItem(items,id,location){
 const item=items.find(i=>i.id===id);if(!item) return items;
 if(item.location===location)return items;
 const occupants=items.filter(i=>i.location===location);
 if(location!=='bag'&&occupants.length>=spotsFor(location).length)return items;
 const slot=location==='bag'?0:spotsFor(location).map(s=>s.slot).find(n=>!occupants.some(i=>i.slot===n));
 const riding=item.location==='room'?stackOf(items,id):new Set();riding.delete(id);
 return items.map(i=>i.id===id?{...i,location,slot}:riding.has(i.id)?{...i,location:'bag',slot:0,support:null}:i);
}
// Throwing a thing away (the backpack's 删掉): gone from wherever it is; what rested on it comes back to the bag, as
// when it is put away.
export function dropItem(items,id){
 const item=items.find(i=>i.id===id);if(!item)return items;
 const riding=item.location==='room'?stackOf(items,id):new Set();riding.delete(id);
 return items.filter(i=>i.id!==id).map(i=>riding.has(i.id)?{...i,location:'bag',slot:0,support:null}:i);
}
export function shiftItem(items,id,dx,dz){
 const item=items.find(i=>i.id===id);if(!item||item.location==='bag')return items;
 const x=item.slot%2+dx,z=Math.floor(item.slot/2)+dz;if(x<0||x>1||z<0||z>1)return items;
 // On the coffee table, what was put there from the backpack and what was set down in its close-up share the places.
 const table=['table','hide:coffeeTable'],here=i=>table.includes(item.location)?table.includes(i.location):i.location===item.location;
 const slot=z*2+x,other=items.find(i=>i.id!==id&&here(i)&&i.slot===slot);
 return items.map(i=>i.id===id?{...i,slot}:i.id===other?.id?{...i,slot:item.slot}:i);
}

// Layer occupancy is independent of camera occlusion.
export function cellAt(bricks,x,z,y){return bricks.find(b=>{const a=bounds(b);return x>=a.x&&x<a.x+a.w&&z>=a.z&&z<a.z+a.d&&y>=a.y&&y<a.y+a.h;});}
export function bearDraft(){
 const bricks=[];
 const add=(x,y,z,color='#c4a17b',type='brick')=>bricks.push({id:`bear-${bricks.length}`,x,y,z,color,type,turn:0});
 // Feet, body and head are connected stacks, with a cream muzzle facing +Z.
 for(let y=0;y<6;y++)for(let x=2;x<=5;x++)for(let z=2;z<=4;z++){
  if(y===0&&x!==2&&x!==5)continue;
  if(y===1){if(x===2||x===4)add(x,y,z,'#c4a17b','long');continue;}
  add(x,y,z,y===4&&z===4&&(x===2||x===5)?'#685460':y>=3&&z===4&&(x===3||x===4)?'#fff5e9':'#c4a17b');
 }
 for(const x of [2,5])for(const z of [2,3])add(x,6,z,'#c4a17b','dome');
 for(const x of [1,6]){add(x,0,3);add(x,1,3);add(x,2,3,'#c4a17b','dome');}
 return {name:'一只积木小熊',bricks};
}
