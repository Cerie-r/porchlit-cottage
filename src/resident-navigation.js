import {bedroomCorner} from './bedroom-corner.js';
// Coordinates follow LivingArea, including furniture positions and rotations.
export const WALK_BOUNDS=[-4.0,1.25,-3.3,1.85];
export const BODY_RADIUS=.17;
// The figures' heads are much wider than their feet. Walking may brush past
// furniture with BODY_RADIUS, but wherever a figure stops and stands, keep this
// much room so its head does not end up inside a chair back or a wardrobe.
export const STAND_RADIUS=.3;
const sizes={sofa:[2.6,.95],coffeeTable:[2.55,1.18],armchair:[1.1,.85],tvUnit:[2.16,.85],floorPlant:[.8,.8],lamp:[.55,.55],gramophone:[.6,.44]};
export function obstaclesFor(furniture){return Object.entries(sizes).filter(([id])=>furniture[id]).map(([id,[w,d]])=>({id,x:furniture[id].position[0],z:furniture[id].position[2],angle:furniture[id].rotationY||0,w,d}));}
export function freePoint(p,obstacles,bounds=WALK_BOUNDS,radius=BODY_RADIUS){if(p[0]<bounds[0]||p[0]>bounds[1]||p[1]<bounds[2]||p[1]>bounds[3])return false;return !obstacles.some(o=>{const dx=p[0]-o.x,dz=p[1]-o.z,c=Math.cos(o.angle),s=Math.sin(o.angle);return Math.abs(c*dx-s*dz)<o.w/2+radius&&Math.abs(s*dx+c*dz)<o.d/2+radius;});}
export function clearSegment(a,b,obstacles,bounds=WALK_BOUNDS){const n=Math.max(1,Math.ceil(Math.hypot(b[0]-a[0],b[1]-a[1])/.045));for(let i=0;i<=n;i++)if(!freePoint([a[0]+(b[0]-a[0])*i/n,a[1]+(b[1]-a[1])*i/n],obstacles,bounds))return false;return true;}
export function nearestFree(p,obstacles,bounds=WALK_BOUNDS,radius=BODY_RADIUS){if(freePoint(p,obstacles,bounds,radius))return [...p];let best=null,d=Infinity;for(let x=bounds[0];x<=bounds[1];x+=.12)for(let z=bounds[2];z<=bounds[3];z+=.12){const q=[x,z],dd=Math.hypot(x-p[0],z-p[1]);if(dd<d&&freePoint(q,obstacles,bounds,radius)){best=q;d=dd;}}return best;}
// Where a figure should stop near p: the nearest spot with room for its head,
// or, in a room too tight for that, the nearest spot its feet fit.
export function standingSpot(p,obstacles,bounds=WALK_BOUNDS){return nearestFree(p,obstacles,bounds,STAND_RADIUS)||nearestFree(p,obstacles,bounds);}
export function findPath(start,end,obstacles,bounds=WALK_BOUNDS){
 if(!freePoint(start,obstacles,bounds)||!freePoint(end,obstacles,bounds))return null;
 if(clearSegment(start,end,obstacles,bounds))return [end];
 const step=.12,[x0,x1,z0,z1]=bounds,nx=Math.floor((x1-x0)/step)+1,nz=Math.floor((z1-z0)/step)+1,points=[];
 for(let z=0;z<nz;z++)for(let x=0;x<nx;x++)points.push([x0+x*step,z0+z*step]);
 const valid=points.map(p=>freePoint(p,obstacles,bounds));
 function nearest(p){let id=-1,d=Infinity;points.forEach((q,i)=>{const dd=Math.hypot(q[0]-p[0],q[1]-p[1]);if(valid[i]&&dd<d&&clearSegment(p,q,obstacles,bounds)){id=i;d=dd;}});return id;}
 const from=nearest(start),to=nearest(end);if(from<0||to<0)return null;
 const open=new Set([from]),cost=new Map([[from,0]]),prev=new Map(),closed=new Set();
 while(open.size){let cur=-1,score=Infinity;for(const i of open){const f=cost.get(i)+Math.hypot(points[i][0]-points[to][0],points[i][1]-points[to][1]);if(f<score){score=f;cur=i;}}
  if(cur===to){const raw=[end];for(let i=cur;i!==undefined;i=prev.get(i))raw.unshift(points[i]);const path=[];let anchor=start;for(let i=0;i<raw.length;){let j=raw.length-1;while(j>i&&!clearSegment(anchor,raw[j],obstacles,bounds))j--;path.push(raw[j]);anchor=raw[j];i=j+1;}return path;}
  open.delete(cur);closed.add(cur);const x=cur%nx,z=Math.floor(cur/nx);
  for(const [dx,dz] of [[1,0],[-1,0],[0,1],[0,-1],[1,1],[1,-1],[-1,1],[-1,-1]]){const xx=x+dx,zz=z+dz;if(xx<0||xx>=nx||zz<0||zz>=nz)continue;const n=zz*nx+xx;if(!valid[n]||closed.has(n)||!clearSegment(points[cur],points[n],obstacles,bounds))continue;const g=cost.get(cur)+Math.hypot(dx,dz)*step;if(g<(cost.get(n)??Infinity)){cost.set(n,g);prev.set(n,cur);open.add(n);}}
 }
 return null;
}
export function sofaSeat(sofa,kind){const x=kind==='girl'?-.75:.75,c=Math.cos(sofa.rotationY||0),s=Math.sin(sofa.rotationY||0),point=z=>[sofa.position[0]+c*x+s*z,sofa.position[2]-s*x+c*z];return {seat:point(.27),approach:point(.88),height:sofa.position[1]+.235,yaw:sofa.rotationY||0};}

export const UPSTAIRS_BOUNDS=[-4.65,4.65,-3.35,3.35];
export function upstairsObstacles(furniture,room){
 const specs=room==='bedroom'?[['bedroomBed',-3.15,-.9,2.9,2.1,Math.PI/2],['bedroomWardrobe',3.65,-3.1,2,1,0],['bedroomVanity',1.4,-3.1,1.9,1,0],['bedroomChair',1.35,1.5,1.1,1,.22],['bedroomBench',-.55,-.9,1.9,.8,Math.PI/2],['bedroomSideTable',bedroomCorner.table[0],bedroomCorner.table[2],.88,.88,0],['bedroomKeepsake',bedroomCorner.keepsake[0],bedroomCorner.keepsake[2],.91,.65,0]]:[['studyDesk',-1.75,-2.7,2.7,1.1,0,true],['studyShelf',-3.85,-2.7,1.2,.6,0,true],['studyReading',-3.65,-1.1,1.1,1,0,true],['studyPrinter',-1.05,-2.85,1.4,1,0],['studyCraft',2,-2.85,3.3,1.2,0],['studyTailor',4.42,-3.05,.98,1.4,0]];
 return specs.map(([id,x,z,w,d,angle,rotated])=>{const f=furniture[id]||{},p=f.position||[0,0,0];x+=p[0];z+=p[2];return {id,x:rotated?-1.2+z:x,z:rotated?-.6-x:z,w,d,angle:angle+(f.rotationY||0)+(rotated?Math.PI/2:0)};});
}

export const KITCHEN_BOUNDS=[-3.55,3.6,-2.35,4.2];
export function kitchenObstacles(furniture){
 const sizes={sinkRun:[4.32,.82],stove:[.85,.85],cornerCabinet:[.85,.85],prepCabinet:[.85,.85],refrigerator:[1.2,1.1],island:[2.25,.9],stoolLeft:[.55,.55],stoolRight:[.55,.55]};
 const result=Object.entries(sizes).filter(([id])=>furniture[id]).map(([id,[w,d]])=>{const f=furniture[id];return {id,x:f.position[0],z:f.position[2],w,d,angle:f.rotationY||0};});
 for(const id of ['diningTable','diningChair1','diningChair2','diningChair3']){const f=furniture[id];if(f)result.push({id,x:f.position[0]-1.05,z:f.position[2]+1,w:id==='diningTable'?1.5:.5,d:id==='diningTable'?1.05:.5,angle:f.rotationY||0});}
 return result;
}

export const DOWNSTAIRS_BOUNDS=[-4.65,4.65,-3.35,3.35];
export function downstairsObstacles(furniture){return [...obstaclesFor(furniture).map(o=>({...o,x:o.x-1,z:o.z+1.6})),...kitchenObstacles(furniture).map(o=>({...o,x:o.x+1.05,z:o.z-1}))];}
// Builds standing on the floor, from the room's frame into an area's (its origin).
export function builtObstacles(built,origin=[0,0,0]){return built.map(b=>({id:b.id,x:b.item.position[0]-origin[0],z:b.item.position[2]-origin[2],w:b.spec.w,d:b.spec.d,angle:b.item.rotationY||0}));}
