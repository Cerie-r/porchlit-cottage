import React,{useRef,useEffect,useState,useLayoutEffect,useMemo} from 'react';
import {useThree,useFrame} from '@react-three/fiber';
import {Raycaster,Vector2,Vector3,Matrix3,Matrix4,BufferGeometry,Box3,Quaternion} from 'three';
import {CreationModel} from './workshop.jsx';
import {stackOf} from './workshop-state.js';
import {buildSize,FLOOR_LEVEL} from './furniture-range.js';
function ancestors(o,test){for(;o;o=o.parent)if(test(o))return o;return null;}
// Only what is drawn can be stood on: not the see-through click areas laid over
// furniture and floors, nor anything hidden.
function drawn(o){
 if(!o.isMesh)return false;
 for(let n=o;n;n=n.parent)if(n.visible===false)return false;
 return [].concat(o.material).some(m=>m&&m.visible!==false&&m.colorWrite!==false&&!(m.transparent&&m.opacity===0));
}
// The edge of what is picked, seen through it: its footprint for a build, a
// small circle for anything else.
function PickedEdge({item,color='#b0607e'}){
 const size=useMemo(()=>buildSize(item),[item]);
 const edge=useMemo(()=>{const pts=size?[[-1,-1],[1,-1],[1,1],[-1,1]].map(([x,z])=>new Vector3(x*(size.w/2+.03),0,z*(size.d/2+.03))):Array.from({length:40},(_,i)=>{const a=i/40*Math.PI*2;return new Vector3(Math.cos(a)*.17,0,Math.sin(a)*.17);});return new BufferGeometry().setFromPoints(pts);},[size]);
 useEffect(()=>()=>edge.dispose(),[edge]);
 return <group position={[0,.006,0]} rotation={[0,item.rotationY||0,0]}><lineLoop geometry={edge} renderOrder={4}><lineBasicMaterial color={color} transparent opacity={.9} depthTest={false}/></lineLoop></group>;
}
// Placed things stand on the floor, on furniture (their support: they move with
// it) or on the top of a placed build. Each one's turned, scaled group is itself
// a support, so whatever is set on a build rides along with it.
function Placed({item,root,selected,red,onSelect,objects}){
 const ref=useRef(),model=useRef(),[pickBox,setPickBox]=useState(null),supportRef=useRef(null),point=useRef(new Vector3()),supportTurn=useRef(new Quaternion()),stageTurn=useRef(new Quaternion()),invalidate=useThree(s=>s.invalidate);
 // Small toys need a continuous target across the gaps between their brick shells.
 // Measure the rendered toy, so species, pose and rotation all keep their own extent.
 useLayoutEffect(()=>{
  if(!['animal','keepsake'].includes(item.kind)||!model.current||!ref.current){setPickBox(null);return;}
  ref.current.updateWorldMatrix(true,true);
  const box=new Box3().setFromObject(model.current).applyMatrix4(new Matrix4().copy(ref.current.matrixWorld).invert());
  if(box.isEmpty())return;
  box.expandByScalar(.035);
  setPickBox({center:box.getCenter(new Vector3()).toArray(),size:box.getSize(new Vector3()).toArray()});
 },[item]);
 // Resolve supports after React commits furniture changes, not every rendered frame.
 useLayoutEffect(()=>{supportRef.current=null;if(item.support)root.current?.parent.traverse(o=>{if(o.userData.supportId===item.support)supportRef.current=o;});});
 useEffect(()=>{objects.set(item.id,ref);return()=>{if(objects.get(item.id)===ref)objects.delete(item.id);};},[item.id,objects]);
 useFrame(()=>{const object=ref.current,stage=root.current?.parent;if(!object||!stage)return;const support=supportRef.current;object.visible=!item.support||!!support;if(!object.visible)return;const p=point.current.set(...item.position);if(support){support.updateWorldMatrix(true,false);stage.updateWorldMatrix(true,false);stage.worldToLocal(support.localToWorld(p));}
  if(item.kind==='keepsake'){
   const turn=supportTurn.current.identity();
   if(support){support.getWorldQuaternion(turn);stage.getWorldQuaternion(stageTurn.current);turn.premultiply(stageTurn.current.invert());}
   if(!object.quaternion.equals(turn)){object.quaternion.copy(turn);invalidate();}
  }
  // What it stands on may only have moved this frame: look again next frame.
  if(!object.position.equals(p)){object.position.copy(p);invalidate();}});
 return <group ref={ref} position={item.position} userData={{placedObject:true,creationId:item.id}} onClick={e=>{if(e.delta>5)return;e.stopPropagation();onSelect(item.id);}}>
  <group ref={model} scale={.12} rotation={[0,item.rotationY||0,0]} userData={{supportId:'creation:'+item.id}}><CreationModel item={item} onClick={e=>{if(e.delta>5)return;e.stopPropagation();onSelect(item.id);}}/></group>
  {pickBox&&<mesh position={pickBox.center} userData={{placementPickTarget:true}}><boxGeometry args={pickBox.size}/><meshBasicMaterial transparent opacity={0} depthWrite={false}/></mesh>}
  {(selected||red)&&<PickedEdge item={item} color={red?'#d4505a':'#b0607e'}/>}
 </group>;
}
// pending: a thing from the backpack waiting for a spot (hidden till it has one).
// moving: a placed thing picked while arranging the house; it stays where it is
// till a tap on a surface sends it there. api.current.nudge moves it a little
// over the surface it stands on.
// red: builds to outline in red (standing on something, or stood on).
// hangable: what is being placed may also hang on a wall (builds can).
// onSettle([[id, surface]]): things found standing on nothing, with what is really under them.
export function FreePlacement({items,pending,moving,red=[],hangable=false,api,onPlace,onSelect,onSettle}){
 const root=useRef(),{camera,gl,invalidate}=useThree();const [hover,setHover]=useState(null);
 const objects=useMemo(()=>new Map(),[]);
 const active=pending||moving;
 // Nothing may land on itself, nor on what it carries.
 const carried=useMemo(()=>stackOf(items,active),[items,active]);
 const live=useRef();live.current={carried,moving,onPlace,hangable};
 const ray=useMemo(()=>new Raycaster(),[]);
 // The first surface facing up along the ray: the floor, furniture, or the top
 // of a placed build (its landing faces); never the thing being placed, nor
 // what rides on it. Any other placed thing in the way blocks the spot.
 const surface=stage=>{
  const hits=ray.intersectObjects(stage.children,true).filter(h=>{
   if(ancestors(h.object,o=>o.userData.placementPreview))return false;
   const placed=ancestors(h.object,o=>o.userData.placedObject);
   if(placed)return !live.current.carried.has(placed.userData.creationId)&&(!!h.object.userData.landing||!!h.object.userData.placementPickTarget||drawn(h.object));
   return !!h.face&&drawn(h.object);
  });
  // Another placed thing in the way: only a build's top can take it.
  const h=hits[0];if(!h?.face)return null;if(ancestors(h.object,o=>o.userData.placedObject)&&!h.object.userData.landing)return null;
  const normal=h.face.normal.clone().applyNormalMatrix(new Matrix3().getNormalMatrix(h.object.matrixWorld));
  if(normal.y<.75){
   // The back or the left wall, from the room's side: somewhere to hang a build.
   const wall=live.current.hangable&&ancestors(h.object,o=>o.userData.cutawayWall)?.userData.cutawayWall,n=normal.clone().transformDirection(new Matrix4().copy(stage.matrixWorld).invert());
   if(!(wall==='back'&&n.z>.75||wall==='left'&&n.x>.75))return null;
   const at=stage.worldToLocal(h.point.clone()).toArray();
   return {wall,point:at,preview:at};
  }
  const world=h.point.clone().add(new Vector3(0,.008,0));const p=stage.worldToLocal(world.clone());if(Math.abs(p.x)>5.15||Math.abs(p.z)>4||p.y>2.5)return null;
  const support=ancestors(h.object,o=>!!o.userData.supportId);
  return {position:(support?support.worldToLocal(world):p).toArray(),support:support?.userData.supportId||null,preview:p.toArray()};
 };
 useEffect(()=>{if(!api)return;api.current={
  // Slide a placed thing dX, dZ across the room; it has to stay on a surface at
  // the same height (the floor and the rugs on it count as one), or it doesn't move.
  nudge(id,dX,dZ){
   const stage=root.current?.parent,object=objects.get(id)?.current;if(!stage||!object)return null;
   stage.updateWorldMatrix(true,true);
   const p=object.position.clone().add(new Vector3(dX,0,dZ)),from=stage.localToWorld(p.clone().add(new Vector3(0,.05,0))),to=stage.localToWorld(p.clone().add(new Vector3(0,-1,0)));
   const keep=live.current.carried;live.current.carried=stackOf(items,id);
   ray.set(from,to.sub(from).normalize());const next=surface(stage);live.current.carried=keep;
   return next&&!next.wall&&(Math.abs(next.preview[1]-p.y)<.03||p.y<FLOOR_LEVEL&&next.preview[1]<FLOOR_LEVEL)?next:null;
  }};return()=>{api.current=null;};},[api,items,objects,ray]);
 // Things set down while the residents' see-through walking floor (.14 up) still
 // caught the tap stand on nothing, a hand above the floor. Once the room is
 // drawn, each is set down on whatever is really under it; a thing that does
 // stand on something at that height is left alone.
 const settled=useRef(new Set());
 const floating=items.filter(i=>!i.support&&!i.wall&&!settled.current.has(i.id)&&i.position?.[1]>.143&&i.position[1]<.157);
 const floatKey=floating.map(i=>i.id+':'+i.position.join(',')).join('|');
 live.current.settle={floating,onSettle};
 useEffect(()=>{
  if(!floatKey||active)return;
  const timer=setTimeout(()=>{
   const stage=root.current?.parent,{floating,onSettle}=live.current.settle;if(!stage||!onSettle)return;
   stage.updateWorldMatrix(true,true);
   const keep=live.current.carried,fixes=[];
   for(const i of floating){
    settled.current.add(i.id);
    const p=new Vector3(...i.position),from=stage.localToWorld(p.clone().add(new Vector3(0,.05,0))),to=stage.localToWorld(p.clone().add(new Vector3(0,-1,0)));
    live.current.carried=stackOf(items,i.id);ray.set(from,to.sub(from).normalize());
    const under=surface(stage);
    if(under&&!under.wall&&under.preview[1]<p.y-.02)fixes.push([i.id,under]);
   }
   live.current.carried=keep;
   if(fixes.length)onSettle(fixes);
  },600);
  return()=>clearTimeout(timer);
 },[floatKey,active,ray]);
 useEffect(()=>{setHover(null);if(!active)return;const canvas=gl.domElement;let start=null;
 const hit=e=>{const stage=root.current?.parent;if(!stage)return null;stage.updateWorldMatrix(true,true);const r=canvas.getBoundingClientRect();ray.setFromCamera(new Vector2((e.clientX-r.left)/r.width*2-1,-(e.clientY-r.top)/r.height*2+1),camera);return surface(stage);};
 const down=e=>{start=[e.clientX,e.clientY];};const move=e=>{setHover(hit(e));invalidate();};
 const click=e=>{const dragged=!start||Math.hypot(e.clientX-start[0],e.clientY-start[1])>6;const result=dragged?null:hit(e);
  // While moving, a tap that lands nowhere is left alone (it may pick another
  // piece, or let go); while placing from the backpack every tap is ours.
  if(live.current.moving&&!result)return;
  e.stopImmediatePropagation();e.preventDefault();if(result)live.current.onPlace(result);};
 canvas.addEventListener('pointerdown',down,true);canvas.addEventListener('pointermove',move);canvas.addEventListener('click',click,true);return()=>{canvas.removeEventListener('pointerdown',down,true);canvas.removeEventListener('pointermove',move);canvas.removeEventListener('click',click,true);};},[active,camera,gl,invalidate,ray]);
 return <group ref={root}>{items.filter(i=>i.id!==pending).map(i=><Placed key={i.id} item={i} root={root} objects={objects} selected={i.id===moving} red={red.includes(i.id)} onSelect={onSelect}/>)}{active&&hover&&<mesh userData={{placementPreview:true}} position={hover.preview} rotation={hover.wall==='back'?[0,0,0]:hover.wall==='left'?[0,Math.PI/2,0]:[-Math.PI/2,0,0]}><ringGeometry args={[.13,.17,40]}/><meshBasicMaterial color="#af8197" depthTest={false}/></mesh>}</group>;
}

