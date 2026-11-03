import React,{useRef,useState,useEffect,useMemo} from 'react';
import {useThree} from '@react-three/fiber';
import {Raycaster,Vector2,Vector3,Plane,Matrix4,BufferGeometry} from 'three';
import {floorPieces,placeAt,roomPoint,extent,overlapsFor} from './furniture-range.js';

// The edge of a footprint, in its own frame: a rectangle, or an oval for rugs.
function edgePoints(w,d,oval){
 if(oval)return Array.from({length:48},(_,i)=>{const a=i/48*Math.PI*2;return new Vector3(Math.cos(a)*w/2,0,Math.sin(a)*d/2);});
 return [[-1,-1],[1,-1],[1,1],[-1,1]].map(([x,z])=>new Vector3(x*w/2,0,z*d/2));
}

// The outline of a floor piece where it stands (or would stand): a tinted patch
// with a crisp edge, lying flat just above the rugs (their top is about .11 up)
// so it shows on them too. Furniture still stands in front of the patch; with
// through, the edge shows through it, so the piece picked is plain to see.
export function Footprint({id,spec,item,color="#c98fa0",opacity=.3,y=.12,through=false,edgeColor=color}){
 const s=spec||floorPieces[id];
 const edge=useMemo(()=>s?new BufferGeometry().setFromPoints(edgePoints(s.w,s.d,s.oval)):null,[s]);
 useEffect(()=>()=>edge?.dispose(),[edge]);
 if(!s||!item)return null;
 const turn=s.a0+s.frame.turn+(item.rotationY||0),[X,Z]=roomPoint(s,item),e=extent(s,item.rotationY||0);
 return <group position={[X+e.ox,y,Z+e.oz]} rotation={[0,turn,0]} userData={{placementPreview:true}}>
  <mesh rotation={[-Math.PI/2,0,0]} scale={s.oval?[s.w/2,s.d/2,1]:[1,1,1]} renderOrder={2}>
   {s.oval?<circleGeometry args={[1,48]}/>:<planeGeometry args={[s.w,s.d]}/>}
   <meshBasicMaterial color={color} transparent opacity={opacity} depthWrite={false}/>
  </mesh>
  <lineLoop geometry={edge} renderOrder={through?5:3}><lineBasicMaterial color={edgeColor} transparent opacity={through?.9:Math.min(1,opacity*2.4)} depthWrite={false} depthTest={!through}/></lineLoop>
 </group>;
}

const RUGS=new Set(['rug','bedroomRug','studyRug']);
// The piece a mesh belongs to, if any (furniture groups carry their id).
function pieceOf(o){for(;o;o=o.parent){if(o.userData.placementPreview)return 'preview';const id=o.userData.cameraPlace||o.userData.supportId;if(id)return id;}return null;}

// While a floor piece is being arranged, a tap on the floor sends it there, held
// inside the floor it belongs to; a soft outline shows where it would land.
// Taps on other furniture still pick that piece; a tap on a rug counts as floor;
// a tap outside the floor still lets go of the piece. Like the backpack's
// placement, this listens on the canvas itself and finds the floor with its own
// ray, so it doesn't depend on any mesh lying on the floor to be clicked.
// bounds: the floor as shown, [minX,maxX,minZ,maxZ] in the room's frame.
export function FloorTarget({selectedId,item,home,bounds,onPlace,furniture={},defaults={},shown,built=[]}){
 const ref=useRef(),{camera,gl,invalidate}=useThree(),[hover,setHover]=useState(null);
 const live=useRef();live.current={selectedId,item,home,bounds,onPlace};
 const active=!!(selectedId&&floorPieces[selectedId]&&item);
 useEffect(()=>{
  if(!active)return;
  const canvas=gl.domElement,ray=new Raycaster(),floor=new Plane(new Vector3(0,1,0),0),inverse=new Matrix4(),at=new Vector3();let start=null;
  const aim=e=>{const r=canvas.getBoundingClientRect();ray.setFromCamera(new Vector2((e.clientX-r.left)/r.width*2-1,-(e.clientY-r.top)/r.height*2+1),camera);};
  const floorPoint=()=>{const g=ref.current;if(!g)return null;g.updateWorldMatrix(true,false);const local=ray.ray.clone().applyMatrix4(inverse.copy(g.matrixWorld).invert());if(!local.intersectPlane(floor,at))return null;const b=live.current.bounds;return at.x<b[0]||at.x>b[1]||at.z<b[2]||at.z>b[3]?null:[at.x,at.z];};
  const landing=p=>{const c=live.current;return p&&placeAt(c.selectedId,c.item,p[0],p[1],c.home);};
  const down=e=>{start=[e.clientX,e.clientY];};
  const move=e=>{aim(e);setHover(landing(floorPoint()));invalidate();};
  const leave=()=>{setHover(null);invalidate();};
  const click=e=>{
   if(!start||Math.hypot(e.clientX-start[0],e.clientY-start[1])>6)return;
   // The whole stage, so things made at home standing about can be picked too.
   const room=ref.current?.parent,stage=room?.parent||room;if(!stage)return;
   aim(e);stage.updateWorldMatrix(true,true);
   const first=ray.intersectObject(stage,true).find(h=>pieceOf(h.object)!=='preview');
   const id=first&&pieceOf(first.object);
   if(id&&!RUGS.has(id))return; // another piece: let it be picked
   const next=landing(floorPoint());
   if(!next)return; // off the floor: the tap still lets go of the piece
   e.stopImmediatePropagation();e.preventDefault();
   live.current.onPlace(live.current.selectedId,next);setHover(null);invalidate();
  };
  canvas.addEventListener('pointerdown',down,true);canvas.addEventListener('pointermove',move);canvas.addEventListener('pointerleave',leave);canvas.addEventListener('click',click,true);
  return()=>{canvas.removeEventListener('pointerdown',down,true);canvas.removeEventListener('pointermove',move);canvas.removeEventListener('pointerleave',leave);canvas.removeEventListener('click',click,true);setHover(null);};
 },[active,camera,gl,invalidate]);
 // Where it would land; red if it would stand on another piece there.
 const clash=active&&hover&&overlapsFor(selectedId,{...furniture,[selectedId]:hover},defaults,shown,.08,built).length>0;
 return <group ref={ref}>{active&&hover&&<Footprint id={selectedId} item={hover} color={clash?'#d4505a':'#c98fa0'} opacity={clash?.38:.3}/>}</group>;
}

// Under the piece being arranged: a soft outline, red while it stands on another
// piece, and that other piece outlined in red too. Rugs are left out: things
// are meant to stand on them.
// built: the builds standing on this floor ({id, spec, item}); they count, and
// show in red, like furniture.
const Others=({ids,furniture,built})=>ids.map(o=>{const b=built.find(b=>b.id===o);return b?<Footprint key={o} spec={b.spec} item={b.item} color="#d4505a" opacity={.3} y={.122}/>:<Footprint key={o} id={o} item={furniture[o]} color="#d4505a" opacity={.3} y={.122}/>;});
export function OverlapHint({selectedId,furniture,defaults,shown,built=[]}){
 const s=floorPieces[selectedId],item=furniture[selectedId];
 if(!s||s.flat||!item)return null;
 const others=overlapsFor(selectedId,furniture,defaults,shown,.08,built),red=others.length>0;
 return <group>
  <Footprint id={selectedId} item={item} color={red?'#d4505a':'#b98f7c'} opacity={red?.42:.2} y={.124} through edgeColor={red?'#d4505a':'#b0607e'}/>
  <Others ids={others} furniture={furniture} built={built}/>
 </group>;
}
// Under a build being arranged: the same, with what it stands on worked out
// by the page (clash).
export function BuiltOverlapHint({entry,clash,furniture,built=[]}){
 const red=clash.length>0;
 return <group>
  <Footprint spec={entry.spec} item={entry.item} color={red?'#d4505a':'#b98f7c'} opacity={red?.42:.2} y={.124}/>
  <Others ids={clash} furniture={furniture} built={built}/>
 </group>;
}
