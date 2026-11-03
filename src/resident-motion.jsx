import {hitsPlacedObject} from './placed-hit.js';
import {residentPosePosition,RESIDENT_GROUND_OFFSET} from './resident-pose.js';
import {seatInNavigation,seatInRoom} from './seat-coordinates.js';
import React,{useContext,useEffect,useMemo,useRef,useState} from 'react';
import {useFrame,useThree,createPortal} from '@react-three/fiber';
import * as T from 'three';
import {createApprovedAvatar,disposeAvatar} from '../body/avatar-model.js';
import {readWardrobe} from '../body/wardrobe-state.js';
import {rigAvatar} from '../body/avatar-rig.js';
import {obstaclesFor,nearestFree,freePoint,standingSpot,findPath,clearSegment,sofaSeat,WALK_BOUNDS,UPSTAIRS_BOUNDS,upstairsObstacles,KITCHEN_BOUNDS,kitchenObstacles,DOWNSTAIRS_BOUNDS,downstairsObstacles,builtObstacles} from './resident-navigation.js';
import {newMotion,beginStand,stepResident} from './resident-motion-state.js';
import {newReunion,stepReunion} from './hide-and-seek-reunion.js';
import {HideHint,KissBurst} from './hide-and-seek.jsx';
import {play} from './sounds.js';
import {SeatContext} from './seat-interaction.jsx';
import {lapSeat,lapSide,LAP_HOLD,READ_ARMS,READ_REACH,INVITE,SEAT_VIEWS,NESTLE,WIDE,sameSeat,seatBeside,seatEnd,seatNestled} from './resident-together.js';
import {cameraPlaces,placeOffset} from './room-camera.jsx';
import {newTouch,stepTouch,endTouch,fussFor,TOUCHES} from './resident-touches.js';
import {TouchBurst} from './resident-touch-burst.jsx';
import {newHand,stepHand,endHand,handHeld,handTo,strollAgain,pairPlanner} from './resident-hand.js';
import {bedFrame,newSleep,planBed,stepSleep,wakeUp,outOfBed,sleeping as inBed,headOf} from './resident-bed.js';
import {newDance,stepDance,stopDance,endDance,dancing} from './resident-dance.js';
import {musicState,onMusicChange} from './music.js';
import {ReadingBook} from './reading-book.jsx';
// How red the cheeks go at most (the face's blush, body/face.js, deepened).
const DEEP_BLUSH=new T.Color('#efa6aa');
function WalkingResident({kind,look,motion,active,onSelect,enabled,hidden=false,passThrough=false}){
 const holder=useRef(),ring=useRef(),[rig,setRig]=useState(null),invalidate=useThree(s=>s.invalidate),signature=JSON.stringify(look);
 useEffect(()=>{let alive=true,loaded;setRig(null);createApprovedAvatar(kind,look).then(root=>{if(!alive){disposeAvatar(root);return;}loaded=rigAvatar(root);
  // The blush on the cheeks (when the look has one), and how high the top of the head is (hair and all).
  loaded.blush=loaded.root.children.filter(o=>o.isSkinnedMesh&&o.material?.color?.getHexString?.()==='eac3b7').map(o=>o.material);loaded.cheek=loaded.blush[0]?.color.clone();
  // In bed (resident-bed.js): what the quilt covers (everything below the neck), and the eyes: as the
  // expression draws them awake (open, or closed in a happy arc), and shut asleep.
  const meshes=loaded.root.children.filter(o=>o.isSkinnedMesh),under=o=>new T.Box3().setFromBufferAttribute(o.geometry.attributes.position).max.y*loaded.root.scale.y<.7;
  Object.assign(loaded,{covered:meshes.filter(under),eyesOpen:meshes.filter(o=>o.name==='eye'||o.name==='eye-light'||o.name==='eye-closed'),eyesShut:meshes.filter(o=>o.name==='eye-shut'),baseTurn:loaded.root.rotation.y,asleepShown:false});motion.top=new T.Box3().setFromObject(loaded.root).max.y;
  setRig(loaded);invalidate();}).catch(error=>console.error('Resident motion unavailable',error));return()=>{alive=false;if(loaded){loaded.skeleton.dispose();disposeAvatar(loaded.root);}};},[kind,signature,invalidate]);
 useEffect(()=>{invalidate();},[enabled,active,invalidate]);
 useFrame((_,dt)=>{if(!holder.current||!rig)return;const running=enabled&&stepResident(motion,dt,rig.seatContact.y+RESIDENT_GROUND_OFFSET);holder.current.position.fromArray(residentPosePosition(motion,rig.seatContact));holder.current.rotation.set(-(motion.lie||0)*Math.PI/2,motion.yaw,0,'YXZ');rig.root.rotation.y=rig.baseTurn+(motion.roll||0);if(rig.asleepShown!==!!motion.asleep){const a=rig.asleepShown=!!motion.asleep;rig.covered.forEach(o=>{o.visible=!a;});rig.eyesOpen.forEach(o=>{o.visible=!a;});rig.eyesShut.forEach(o=>{o.material.visible=a;});}const pop=motion.pop??1,sq=motion.squash||0;holder.current.scale.set(pop*(1+sq*.5),pop*(1-sq),pop*(1+sq*.5));if(rig.blush.length&&rig.blushShown!==motion.blush){rig.blushShown=motion.blush;rig.blush.forEach(m=>m.color.copy(rig.cheek).lerp(DEEP_BLUSH,motion.blush||0));}if(ring.current){ring.current.visible=active&&enabled&&motion.sit<.01&&!(motion.lie>.01);ring.current.position.y=-motion.y-.019;}rig.pose({phase:motion.phase,amount:motion.amount,sit:motion.sit,crouch:motion.crouch,lean:motion.lean,tilt:motion.tilt,arms:motion.arms,reach:motion.reach});if(running)invalidate();});
 // Hidden (in the wardrobe, under the quilt): loaded but not drawn, and not in the way of clicks.
 // Crouched behind furniture while she's arranging it: clicks go through to the furniture.
 return <group ref={holder} visible={!hidden} position={[motion.x,.025,motion.z]} onClick={hidden?undefined:e=>{if(passThrough||!enabled||hitsPlacedObject(e.intersections))return;e.stopPropagation();if(enabled&&e.delta<5)onSelect(kind,holder.current);}} userData={{resident:true,kind}}>{rig&&<primitive object={rig.root}/>}{rig&&createPortal(<ReadingBook motion={motion} scale={1/rig.root.scale.x}/>,rig.bones[0])}<mesh ref={ring} rotation={[-Math.PI/2,0,0]} position={[0,.006,0]} visible={active&&enabled&&!motion.sit}><ringGeometry args={[.24,.265,40]}/><meshBasicMaterial color="#b88f98" transparent opacity={.7} depthWrite={false}/></mesh></group>;
}
// built: furniture-sized builds standing on this floor ({spec, item}, room frame); they are walked round too.
export function LivingResidents({furniture,built=[],value,enabled,command,onNotice,area="living",origin=[-1,0,1.6],spawns={girl:[.65,.9],boy:[.65,-1.4]},onGround,onTogether,hideSeek}){
 const group=useRef(),commandSeen=useRef(command?.id),invalidate=useThree(s=>s.invalidate),camera=useThree(s=>s.camera),wardrobe=readWardrobe(value?.wardrobeV1),[active,setActive]=useState(wardrobe.playerKind);
 const key=JSON.stringify([Object.entries(furniture).map(([id,f])=>[id,f.position,f.rotationY]),built.map(b=>[b.id,b.item.position,b.item.rotationY,b.spec.w,b.spec.d])]);
 const bounds=area==="downstairs"?DOWNSTAIRS_BOUNDS:area==="living"?WALK_BOUNDS:area==="kitchen"?KITCHEN_BOUNDS:UPSTAIRS_BOUNDS;
 const obstacles=useMemo(()=>[...(area==="downstairs"?downstairsObstacles(furniture):area==="living"?obstaclesFor(furniture):area==="kitchen"?kitchenObstacles(furniture):upstairsObstacles(furniture,area)),...builtObstacles(built,origin)],[key,area]);
 const motions=useRef(null);if(!motions.current){motions.current={girl:newMotion(standingSpot(spawns.girl,obstacles,bounds)||[1,1]),boy:newMotion(standingSpot(spawns.boy,obstacles,bounds)||[1,-2])};}
 const state=motions.current;
 // Hide-and-seek (hide-and-seek.js): today the partner may be hiding. `spot` is
 // where, in this area's frame, or null when it's in another room.
 const seek=hideSeek||{},partner=active==='girl'?'boy':'girl',spot=seek.spot||null,crouching=spot?.kind==='behind';
 const hidden=!!seek.hidden,unseen=hidden&&!crouching,unseenRef=useRef(unseen),hiddenRef=useRef(hidden);unseenRef.current=unseen;hiddenRef.current=hidden;
 const enabledRef=useRef(enabled);enabledRef.current=enabled;
 // On his lap (resident-together.js): {seat: his, stage: 'waiting' for him to sit, 'coming' to it, 'holding'}.
 // Declared before the hiding below, which lets go of both while rendering.
 const lap=useRef(null),seats=useContext(SeatContext);
 // Leaning on him on the sofa (resident-together.js): {his: his seat, mine: hers next to it, stage: 'coming', 'leaning'}.
 const nestle=useRef(null);
 // To watch television together: he's on his way to sit on the sofa ({seat}); once he's there she leans on him.
 const watch=useRef(null);
 // Hand in hand (resident-hand.js): he comes to take her hand, then they walk and stand together.
 const hand=useRef(null);
 // Gone to bed together (resident-bed.js), in the bedroom.
 const sleep=useRef(null);
 // A slow dance while the gramophone plays (resident-dance.js).
 const dance=useRef(null);
 // Crouching behind furniture: put there while rendering, so he never shows anywhere else first.
 // Keyed on who hides too: if she swaps figures in the wardrobe, the other one stands up.
 const placed=useRef(''),spotKey=hidden&&crouching?partner+JSON.stringify(spot.figure):'';
 if(placed.current!==spotKey){placed.current=spotKey;const her=state[active];Object.assign(her,{crouch:0,crouchTo:0,lean:0,leanTo:0,tilt:0,tiltTo:0,pop:1,armsTo:null});if(her.seat?.lap){Object.assign(her,{x:her.seat.approach[0],z:her.seat.approach[1],y:0,sit:0,seat:null,transition:null,route:[],pending:null,pendingSeat:null});lap.current=null;}nestle.current=null;watch.current=null;if(her.book)Object.assign(her,{book:false,reachTo:null});if(hand.current){endHand(hand.current,state[partner],her);hand.current=null;}if(sleep.current){outOfBed(sleep.current,her,state[partner]);sleep.current=null;}if(dance.current){endDance(dance.current,her,state[partner]);dance.current=null;}if(spotKey)Object.assign(state[partner],{arms:[0,0,0,0],armsTo:null,tilt:0,tiltTo:0});if(spotKey){const f=spot.figure;if(Math.hypot(her.x-f.x,her.z-f.z)<.45){const p=standingSpot([f.x,f.z],[...obstacles,{x:f.x,z:f.z,w:.5,d:.5,angle:0}],bounds);if(p){her.x=p[0];her.z=p[1];}}Object.assign(state[partner],{x:f.x,z:f.z,yaw:f.yaw,y:0,sit:0,route:[],seat:null,transition:null,pending:null,pendingSeat:null,crouch:f.crouch,crouchTo:f.crouch,lean:0,leanTo:0,pop:1});}}
 // While he hides he's never in her way, even crouched where she happens to stand.
 // Two of them on their way to sit down and eat: { kinds, ids, onSeated }.
 const dine=useRef(null);
 // Left alone a while, he asks her over (see below): {seat, stage: 'going' to sit, 'asking', until}.
 // tuneTimer: a record just went on and he's about to come over to dance (see 'tune').
 const idleSince=useRef(performance.now()),invite=useRef(null),lastInvite=useRef(-Infinity),tuneTimer=useRef(null);
 // Anything she does, or that starts between the two of them, also calls off that dance.
 const touched=()=>{idleSince.current=performance.now();clearTimeout(tuneTimer.current);tuneTimer.current=null;};
 const holderOf=kind=>group.current?.children.find(o=>o.userData.kind===kind);
 useFrame(()=>{const d=dine.current;if(!d)return;if(d.kinds.every(k=>{const m=state[k];return d.ids.includes(m.seat?.id)&&m.sit>.99&&!m.transition&&!m.route.length;})){dine.current=null;d.onSeated?.();}else invalidate();});
 const blocked=kind=>{const otherKind=kind==='girl'?'boy':'girl';if(otherKind===partner&&hiddenRef.current)return obstacles;const other=state[otherKind];return [...obstacles,{x:other.x,z:other.z,w:.22,d:.22,angle:0}];};
 useEffect(()=>{stopTouch();offLap();unNestle();watch.current=null;if(hand.current){endHand(hand.current,state[partner],state[active]);hand.current=null;}if(sleep.current){outOfBed(sleep.current,state[active],state[partner]);sleep.current=null;tellSleep(false);}if(dance.current){endDance(dance.current,state[active],state[partner]);dance.current=null;tellDance(false);}for(const kind of ['girl','boy']){if(kind===partner&&(placed.current||unseenRef.current))continue;const m=state[kind];m.route=[];m.seat=null;m.transition=null;m.pending=null;m.pendingSeat=null;m.sit=0;m.y=0;const p=standingSpot([m.x,m.z],blocked(kind),bounds);if(p){m.x=p[0];m.z=p[1];}}invalidate();},[key]);
 // She swaps figures in the wardrobe: whatever the two of them were doing together stops first, the way round it was.
 useEffect(()=>{if(wardrobe.playerKind===active)return;stopTouch();stopHand();stopSleep();stopDanceNow();offLap();unNestle();watch.current=null;if(invite.current){seats?.close?.('partner-invite');invite.current=null;}setActive(wardrobe.playerKind);},[wardrobe.playerKind]);
 // Found: he comes out and goes to kiss her (hide-and-seek-reunion.js).
 const reunion=useRef(null),reunionSeen=useRef(seek.reunion?.id),[burst,setBurst]=useState(null);
 if(seek.reunion&&reunionSeen.current!==seek.reunion.id){reunionSeen.current=seek.reunion.id;const m=state[partner],her=state[active];
  // He steps out where there's room, not into her if she's standing at the doors.
  if(spot&&!crouching){const exit=standingSpot(spot.exit,blocked(partner),bounds)||spot.exit;Object.assign(m,{x:exit[0],z:exit[1],yaw:Math.atan2(her.x-exit[0],her.z-exit[1]),y:0,sit:0,route:[],seat:null,transition:null,pending:null,pendingSeat:null,crouch:0,crouchTo:0,lean:0,leanTo:0,pop:0});reunion.current=newReunion({crouched:false,kiss:seek.reunion.kiss});}
  else if(spot){if(Math.hypot(her.x-m.x,her.z-m.z)<.45){const p=standingSpot([m.x,m.z],blocked(partner),bounds);if(p){m.x=p[0];m.z=p[1];}}reunion.current=newReunion({crouched:true,kiss:seek.reunion.kiss});}
 }
 // A new day's hiding began mid-kiss (the page was away overnight): the kiss is over.
 if(hidden&&reunion.current){reunion.current=null;Object.assign(state[active],{lean:0,leanTo:0});}
 useFrame((_,dt)=>{const r=reunion.current;if(!r||!enabled)return;const before=r.burst,her=state[active];
  // The camera's way along this floor, so the kiss is seen from the side.
  const look=camera.getWorldDirection(new T.Vector3()).applyQuaternion(group.current.getWorldQuaternion(new T.Quaternion()).invert()),flat=Math.hypot(look.x,look.z);
  const obs=blocked(partner);
  const going=stepReunion(r,Math.min(dt,.05),{partner:state[partner],player:her,view:flat>1e-3?[look.x/flat,look.z/flat]:null,place:to=>standingSpot(to,obs,bounds)||to,route:(from,to)=>findPath(freePoint(from,obs,bounds)?from:nearestFree(from,obs,bounds)||from,to,obs,bounds)});
  if(r.burst&&r.burst!==before){play('kiss');setBurst({...r.burst,y:her.sit>.5?.98:1.18,key:Date.now()});onTogether?.({act:'kiss'});}
  if(!going)reunion.current=null;invalidate();
 });
 useEffect(()=>{if(!burst)return;const t=setTimeout(()=>setBurst(null),burst.long?3200:2000);return()=>clearTimeout(t);},[burst]);
 // Little touches any day (resident-touches.js): a kiss stolen on the cheek, a pat on the head, a pinch of the
 // cheek. {t, giver, taker}: the touch and who does it to whom (by kind). On his lap it happens right there.
 const touch=useRef(null),lastFuss=useRef(null),[touchBurst,setTouchBurst]=useState(null);
 const viewHere=()=>{const look=camera.getWorldDirection(new T.Vector3()).applyQuaternion(group.current.getWorldQuaternion(new T.Quaternion()).invert()),flat=Math.hypot(look.x,look.z);return flat>1e-3?[look.x/flat,look.z/flat]:null;};
 const stopTouch=()=>{const c=touch.current;if(!c)return;endTouch(c.t,state[c.giver],state[c.taker]);touch.current=null;invalidate();};
 const stopHand=()=>{const h=hand.current;if(!h)return;endHand(h,state[partner],state[active]);hand.current=null;invalidate();};
 // Out of bed at once (she's off to do something else).
 const sleepTold=useRef(false),[asleepNow,setAsleepNow]=useState(false);
 const tellSleep=on=>{if(sleepTold.current===on)return;sleepTold.current=on;setAsleepNow(on);onTogether?.({act:'sleep',on});};
 const stopSleep=()=>{const s=sleep.current;if(!s)return;outOfBed(s,state[active],state[partner]);sleep.current=null;tellSleep(false);invalidate();};
 // No more dancing, at once.
 const danceTold=useRef(false),tellDance=on=>{if(danceTold.current===on)return;danceTold.current=on;onTogether?.({act:'dance',on});};
 const stopDanceNow=()=>{const d=dance.current;if(!d)return;endDance(d,state[active],state[partner]);dance.current=null;tellDance(false);invalidate();};
 const startTouch=(kind,giverKind)=>{
  if(hiddenRef.current||reunion.current||dine.current)return false;
  stopTouch();stopHand();stopSleep();stopDanceNow();watch.current=null;const takerKind=giverKind==='girl'?'boy':'girl',taker=state[takerKind],l=lap.current,together=l?.stage==='holding'||nestle.current?.stage==='leaning';
  // Not yet on his lap: that's off. He was asking her over, or on his way somewhere: that's off too.
  if(l&&!together)offLap();
  if(invite.current){seats?.close?.('partner-invite');invite.current=null;}
  if(!together&&takerKind===partner&&taker.route.length){taker.route=[];taker.seat=null;}
  touch.current={t:newTouch(kind,{together}),giver:giverKind,taker:takerKind};touched();invalidate();return true;
 };
 useFrame((_,dt)=>{const c=touch.current;if(!c||!enabled)return;if(hiddenRef.current)return stopTouch();
  const t=c.t,giver=state[c.giver],taker=state[c.taker],before=t.burst,beats=t.beats,obs=blocked(c.giver);
  const going=stepTouch(t,Math.min(dt,.05),{giver,taker,view:viewHere(),place:to=>standingSpot(to,obs,bounds)||to,route:(from,to)=>findPath(freePoint(from,obs,bounds)?from:nearestFree(from,obs,bounds)||from,to,obs,bounds)});
  // What floats up, at the height of her face, her cheek and the top of her head (hair and all).
  if(t.burst&&t.burst!==before){const base=.025+taker.y,spec=TOUCHES[t.kind];setTouchBurst({...t.burst,face:base+1.155,cheek:base+.93,top:base+(taker.top||1.38),hold:spec.hold,beats:spec.beats||0,key:Date.now()});if(t.kind==='kiss'){play('kiss');onTogether?.({act:'kiss'});}}
  if(t.beats>beats)play(t.kind==='pat'?'cloth':'tap',{volume:t.kind==='pat'?.4:.55});
  if(!going)touch.current=null;invalidate();
 });
 useEffect(()=>{if(!touchBurst)return;const t=setTimeout(()=>setTouchBurst(null),2600);return()=>clearTimeout(t);},[touchBurst]);
 // Reading together on his lap: now and then a page turns over, softly.
 const [reading,setReading]=useState(false);
 useEffect(()=>{if(!reading)return;const turn=()=>{const her=state[active];if(!her.book)return;her.turned=performance.now();play('page',{volume:.25});invalidate();};const tick=setInterval(turn,6500);return()=>clearInterval(tick);},[reading,active]);
 // Off his lap at once: he lets go, the book is put away, and if she's on his lap (or on her way to it) she gets up.
 const offLap=()=>{const l=lap.current;if(!l)return;const her=state[active];Object.assign(state[partner],{armsTo:null,leanTo:0,tiltTo:0});Object.assign(her,{armsTo:null,reachTo:null,leanTo:0,tiltTo:0,book:false});if(l.book)setReading(false);lap.current=null;
  if(her.pendingSeat?.lap){her.pending=null;her.pendingSeat=null;}
  if(her.seat?.lap){if(her.sit>.001||her.transition)beginStand(her);else{her.route=[];her.seat=null;}}invalidate();};
 // No more leaning on him.
 const unNestle=()=>{const n=nestle.current;if(!n)return;if(n.stage==='leaning'){Object.assign(state[partner],{tiltTo:0,blushTo:0});Object.assign(state[active],{tiltTo:0,blushTo:0});}nestle.current=null;invalidate();};
 // The hiding above lets go of everything while rendering, where the house can't be told it's over (in bed,
 // dancing, reading): told here instead.
 useEffect(()=>{tellSleep(false);tellDance(false);setReading(false);},[spotKey]);
 // Hand in hand (resident-hand.js): he comes up beside her and takes her hand, leads her a little way, and then
 // they go wherever she walks until either of them does something else. The two of them walk as one point
 // between them, with room kept for both.
 const pair=useMemo(()=>pairPlanner(obstacles,bounds,{findPath,freePoint,nearestFree,clearSegment}),[obstacles,bounds]);
 const startHand=({lead=true}={})=>{
  if(hiddenRef.current||reunion.current||dine.current)return false;
  stopTouch();stopHand();stopSleep();stopDanceNow();watch.current=null;
  // Off his lap, not leaning on him, not asked over any more; he stops where he was going.
  offLap();unNestle();
  if(invite.current){seats?.close?.('partner-invite');invite.current=null;}
  const him=state[partner];if(him.route.length&&!him.transition){him.route=[];him.seat=null;}
  hand.current=newHand({lead});touched();invalidate();return true;
 };
 useFrame((_,dt)=>{const h=hand.current;if(!h||!enabled)return;if(hiddenRef.current)return stopHand();
  const giver=state[partner],taker=state[active],before=h.burst,obs=blocked(partner);
  const going=stepHand(h,Math.min(dt,.05),{giver,taker,pair,view:viewHere(),place:to=>standingSpot(to,obs,bounds)||to,route:(from,to)=>findPath(freePoint(from,obs,bounds)?from:nearestFree(from,obs,bounds)||from,to,obs,bounds)});
  // Their hands meet: a heart from between them, and 「牵牵」.
  if(h.burst&&h.burst!==before){const base=.025+taker.y;setTouchBurst({...h.burst,face:base+1.155,top:base+(taker.top||1.38),hand:base+.5,key:Date.now()});play('cloth',{volume:.45});}
  if(!going){hand.current=null;invalidate();return;}
  // Standing still hand in hand, there's nothing to draw.
  if(h.phase!=='hold'||h.moving)invalidate();
 });
 // To bed together (resident-bed.js): both go round to their side of the bed, climb in and lie down, and sleep
 // until she gets them up; meanwhile the room has only its night light on (the house does that, told by
 // onTogether), and now and then a 「Zz」 floats up.
 // Which way each of them goes there: a spot clear of furniture, a walk round what's in the way.
 const bedWays={place:(w,to)=>standingSpot(to,blocked(w==='her'?active:partner),bounds)||to,route:(w,from,to)=>{const obs=blocked(w==='her'?active:partner);return findPath(freePoint(from,obs,bounds)?from:nearestFree(from,obs,bounds)||from,to,obs,bounds);}};
 // True when they're on their way; not when one of them can't get to the bed (quiet: nothing said, the house trying
 // again later), and then nothing has stopped for it.
 const startSleep=(quiet=false)=>{
  if(area!=='bedroom'||hiddenRef.current||reunion.current||dine.current)return false;
  if(!planBed(bedFrame(furniture),{her:state[active],him:state[partner],...bedWays})){if(!quiet)onNotice('走不到床边，换个地方试试。');return false;}
  stopTouch();stopHand();stopSleep();stopDanceNow();offLap();unNestle();watch.current=null;
  if(invite.current){seats?.close?.('partner-invite');invite.current=null;}
  sleep.current=newSleep();touched();invalidate();return true;
 };
 useFrame((_,dt)=>{const s=sleep.current;if(!s||!enabled)return;if(hiddenRef.current)return stopSleep();
  const going=stepSleep(s,Math.min(dt,.05),{her:state[active],him:state[partner],bed:bedFrame(furniture),...bedWays});
  tellSleep(!!s.asleep);
  if(!going){sleep.current=null;tellSleep(false);invalidate();if(s.then)walk(s.then);else if(s.places===null)onNotice('走不到床边，换个地方试试。');return;}
  if(s.phase!=='asleep')invalidate();
 });
 // Asleep: a 「Zz」 now and then, his and hers by turns.
 // A slow dance (resident-dance.js): asked for at the gramophone, or he comes over when she puts a record on (now and
 // then). It lasts while the music plays; when it stops they bow to each other.
 const lastDance=useRef(-Infinity);
 useEffect(()=>()=>clearTimeout(tuneTimer.current),[]);
 // On a sofa together: he sits on one (where he is, or his end of it), then she comes to lean on him; for watching
 // television together, or (an AI living here asking) just leaning on him. True when it's under way; nothing she is
 // doing with him stops before it is. quiet: no notice when it can't be now (the house tries again later).
 const sofaTogether=(quiet=false)=>{
  if(hiding())return false;const m=state[active],him=state[partner];
  // He's on a sofa: she comes to lean on him (unless she's leaning on him there already, or on her way).
  if(him.sit>.99&&!him.transition&&him.seat&&!him.seat.lap&&WIDE[him.seat.id])return nestle.current?.his===him.seat||nestleNow(quiet);
  const sofa=area==='living'?sofaEnd(partner):(s=>s&&WIDE[s.id]?seatEnd(s,partner==='girl'?-1:1):null)(nearestSeat(him,null,'sofa'));
  if(!sofa){if(!quiet)onNotice('这里没有沙发。');return false;}
  const obs=blocked(partner),route=findPath(fromHere(him,obs),sofa.approach,obs,bounds);
  if(!route){if(!quiet)onNotice('沙发前需要留一点空地，才能走过去坐下。');return false;}
  // Off his lap first (else she'd be left sitting on nothing), not leaning on him somewhere else either, nor hand in
  // hand.
  offLap();unNestle();stopHand();
  // On the sofa herself already: she gets up meanwhile, so he has room.
  if(m.seat&&WIDE[m.seat.id]&&(m.sit>.001||m.transition)){m.pending=[];m.pendingSeat=null;beginStand(m);}
  if(him.sit||him.transition){him.pending=route;him.pendingSeat=sofa;beginStand(him);}else{him.route=route;him.seat=sofa;}
  dine.current=null;watch.current={seat:sofa};invalidate();return true;
 };
 const startDance=()=>{
  if(hiddenRef.current||reunion.current||dine.current||!musicState().playing)return false;
  stopTouch();stopHand();stopSleep();stopDanceNow();offLap();unNestle();watch.current=null;
  if(invite.current){seats?.close?.('partner-invite');invite.current=null;}
  lastDance.current=performance.now();dance.current=newDance();touched();invalidate();return true;
 };
 useFrame((_,dt)=>{const d=dance.current;if(!d||!enabled)return;if(hiddenRef.current)return stopDanceNow();
  const her=state[active],him=state[partner],who=w=>w==='her'?active:partner,before=d.burst;
  // Room to turn round near her, else a little further off (asked from the sofa, they go out onto the floor).
  const going=stepDance(d,Math.min(dt,.05),{her,him,view:viewHere(),room:p=>pair.near(p,0,1,.9,{room:'turn'})||pair.near(p,0,1,2.4,{room:'turn'}),route:(w,from,to)=>{const obs=blocked(who(w));return findPath(freePoint(from,obs,bounds)?from:nearestFree(from,obs,bounds)||from,to,obs,bounds);}});
  if(d.burst&&d.burst!==before){setTouchBurst({...d.burst,top:.025+(her.top||1.38),face:.025+1.155,key:Date.now()});play('cloth',{volume:.4});}
  tellDance(dancing(d));
  if(!going){dance.current=null;tellDance(false);if(d.cramped)onNotice('这里太挤了，换块宽敞的地方再跳吧。');invalidate();return;}
  invalidate();
 });
 // The music stopped: the dance ends with a bow.
 useEffect(()=>onMusicChange(()=>{if(!musicState().playing&&dance.current&&stopDance(dance.current))invalidate();}),[invalidate]);
 useEffect(()=>{if(!asleepNow)return;let n=0;const zz=()=>{const m=state[n++%2?active:partner];if(!(m.lie>.9))return;const [x,z]=headOf(m);setTouchBurst({kind:'zz',x,z,top:.025+m.y+.45,key:Date.now()});};const first=setTimeout(zz,1200),tick=setInterval(zz,4800);return()=>{clearTimeout(first);clearInterval(tick);};},[asleepNow,active,partner]);
 // Looked for a while: every few seconds he peeks over the top.
 useEffect(()=>{if(!(hidden&&crouching&&seek.fidget))return;const m=state[partner],deep=spot.figure.crouch;let back;
  const peek=()=>{m.crouchTo=deep*.4;invalidate();back=setTimeout(()=>{if(placed.current){m.crouchTo=deep;invalidate();}},1100);};
  const timer=setInterval(peek,8000);peek();return()=>{clearInterval(timer);clearTimeout(back);};
 },[hidden,crouching,seek.fidget,spotKey,partner]);
 // The seats in this room (SeatTarget), in this floor's frame: `rather` if it's here, else the nearest
 // to a resident; not `taken`.
 const nearestSeat=(m,taken,rather)=>{let room=group.current;while(room&&!room.userData.cameraRoom)room=room.parent;const found=[];room?.traverse(o=>{if(o.userData.seatId&&o.userData.seatId!==taken)found.push(seatInNavigation({...seatInRoom(o,room,o.userData.seatSpec),id:o.userData.seatId},origin));});return found.find(s=>s.id===rather)||found.sort((a,b)=>Math.hypot(a.approach[0]-m.x,a.approach[1]-m.z)-Math.hypot(b.approach[0]-m.x,b.approach[1]-m.z))[0]||null;};
 // On his lap: once he's sitting, she walks up in front of him, turns her back to him and sits back
 // onto his thighs, on the side that keeps his face in view; then he holds her. Either getting up ends it.
 useFrame(()=>{const l=lap.current;if(!l||!enabled)return;const him=state[partner],her=state[active];
  const release=()=>{Object.assign(him,{armsTo:null,leanTo:0,tiltTo:0});Object.assign(her,{armsTo:null,reachTo:null,leanTo:0,tiltTo:0,book:false});if(l.book)setReading(false);lap.current=null;invalidate();};
  if(hiddenRef.current)return release();
  // The way the camera looks, flat, in this floor's frame: she sits on the side that keeps his face in
  // view. Where the camera is about to walk round to see them (SEAT_VIEWS), the way it will look from there.
  const side=()=>{
   const spec=cameraPlaces[SEAT_VIEWS[l.seat.id]];let root=group.current,anchor=null;while(root.parent)root=root.parent;
   if(spec)root.traverse(o=>{if(!anchor&&o.userData.cameraPlace===spec.id)anchor=o;});
   if(anchor){const eye=group.current.worldToLocal(anchor.localToWorld(new T.Vector3(...placeOffset(spec)))),dx=l.seat.seat[0]-eye.x,dz=l.seat.seat[1]-eye.z,d=Math.hypot(dx,dz);if(d>1e-3)return lapSide(l.seat.yaw,[dx/d,dz/d]);}
   const look=camera.getWorldDirection(new T.Vector3()).applyQuaternion(group.current.getWorldQuaternion(new T.Quaternion()).invert()),flat=Math.hypot(look.x,look.z);return lapSide(l.seat.yaw,flat>1e-3?[look.x/flat,look.z/flat]:null);};
  if(l.stage==='waiting'){
   if(him.seat!==l.seat&&him.pendingSeat!==l.seat)return release();
   if(him.seat!==l.seat||him.sit<.99||him.transition||him.route.length){invalidate();return;}
   const seat=lapSeat(l.seat,side()),obs=blocked(active);
   const route=findPath(fromHere(her,obs),standingSpot(seat.approach,obs,bounds)||seat.approach,obs,bounds);
   if(!route){onNotice('走不到跟前，换个地方试试。');return release();}
   if(her.sit||her.transition){her.pending=route;her.pendingSeat=seat;beginStand(her);}else{her.route=route;her.seat=seat;}
   Object.assign(l,{stage:'coming',lap:seat});onTogether?.({act:'lap',seat:l.seat.id});invalidate();return;
  }
  if(l.stage==='coming'){
   if(her.seat!==l.lap&&her.pendingSeat!==l.lap)return release();
   // Arrived in front of him: the camera may have walked round meanwhile, so the side again.
   if(!l.sided&&her.seat===l.lap&&!her.route.length){const again=lapSeat(l.seat,side());Object.assign(l.lap,{seat:again.seat,approach:again.approach,side:again.side});l.sided=true;}
   if(her.seat===l.lap&&her.sit>.99&&!her.transition){l.stage='holding';const way=l.lap.side<0?-1:1;Object.assign(him,{armsTo:LAP_HOLD.under.arms,leanTo:LAP_HOLD.under.lean,tiltTo:LAP_HOLD.under.tilt*way});Object.assign(her,{armsTo:l.book?READ_ARMS:LAP_HOLD.over.arms,reachTo:l.book?READ_REACH:null,leanTo:LAP_HOLD.over.lean,tiltTo:LAP_HOLD.over.tilt*way,book:!!l.book});if(l.book)setReading(true);play('cloth',{volume:.5});}
   invalidate();return;
  }
  if(her.seat!==l.lap||her.transition||him.seat!==l.seat||him.transition)release();
 });
 // Leaning on him: once she's sitting next to him, she tilts her head onto his and he tilts a little to her.
 // Either getting up ends it.
 useFrame(()=>{const n=nestle.current;if(!n||!enabled)return;const him=state[partner],her=state[active];
  const release=()=>{if(n.stage==='leaning'){Object.assign(him,{tiltTo:0,blushTo:0});Object.assign(her,{tiltTo:0,blushTo:0});}nestle.current=null;invalidate();};
  if(hiddenRef.current||him.seat!==n.his||(her.seat!==n.mine&&her.pendingSeat!==n.mine))return release();
  if(n.stage==='coming'){if(her.seat===n.mine&&her.sit>.99&&!her.transition&&him.sit>.99&&!him.transition){n.stage='leaning';const way=n.mine.nestle;Object.assign(her,{tiltTo:-NESTLE.her*way,blushTo:.5});Object.assign(him,{tiltTo:NESTLE.him*way,blushTo:.3});play('cloth',{volume:.4});}invalidate();return;}
  if(her.transition||him.transition)release();
 });
 // Tell the house which seat he's sitting on (the sofa's bubble offers 靠着他 when it's his).
 const seatShown=useRef(undefined);
 useFrame(()=>{const him=state[partner],id=!hiddenRef.current&&him.sit>.99&&!him.transition&&him.seat&&!him.seat.lap?him.seat.id||null:null;if(id!==seatShown.current){seatShown.current=id;onTogether?.({act:'seated',seat:id});}});
 useEffect(()=>()=>{onTogether?.({act:'seated',seat:null});if(sleepTold.current)onTogether?.({act:'sleep',on:false});if(danceTold.current)onTogether?.({act:'dance',on:false});},[]);
 // Left alone a while (she hasn't walked, sat down or asked for anything, and nothing else is going
 // on), now and then he sits down and asks her over: a little bubble above him that does what
 // 坐他腿上 does. Not taken up, it goes away; he asks again only after a good while.
 useEffect(()=>{if(!enabled)return;const tick=setInterval(()=>{
  const now=performance.now(),him=state[partner],her=state[active],i=invite.current;
  if(i){
   if(lap.current||hiddenRef.current||now>i.until||him.seat!==i.seat&&him.pendingSeat!==i.seat){seats?.close?.('partner-invite');invite.current=null;touched();return;}
   if(i.stage==='going'&&him.seat===i.seat&&him.sit>.99&&!him.transition){const anchor=holderOf(partner);if(!anchor){invite.current=null;return;}Object.assign(i,{stage:'asking',until:now+(i.long?90000:INVITE.showFor)});seats?.offer?.({id:'partner-invite',partner,anchor,labelPoint:[0,1.2,0],invite:true});}
   return;
  }
  if(document.hidden||hiddenRef.current||dine.current||reunion.current||touch.current||sleep.current||dance.current||now-idleSince.current<INVITE.idle||now-lastInvite.current<INVITE.gap)return;
  if(her.route.length||her.transition||him.route.length||him.transition)return;
  // Hand in hand: now and then he leads her a little way again. While he's coming to take it, nothing else.
  const h=hand.current;if(h&&!handHeld(h))return;
  if(handHeld(h)){if(h.phase==='hold'&&Math.random()<.5&&strollAgain(h,pair)){lastInvite.current=now;invalidate();}else idleSince.current=now-INVITE.idle/2;return;}
  const onLap=lap.current?.stage==='holding'||nestle.current?.stage==='leaning';if(lap.current&&!onLap)return;
  // Not every time it could: then a while again.
  if(Math.random()<.5){idleSince.current=now-INVITE.idle/2;return;}
  // Mostly he comes over for a little touch (on his lap, always that); now and then he asks her over instead.
  if(onLap||Math.random()<.6){const kind=fussFor(lastFuss.current,Math.random,{seated:her.sit>.5||onLap});lastFuss.current=kind;lastInvite.current=now;if(kind==='hand')startHand();else startTouch(kind,partner);return;}
  const seat=him.seat&&!him.seat.lap&&him.sit>.99?him.seat:hisSeat(him,her);
  if(!seat)return;
  // She's on that sofa already: he comes over to her instead.
  if(sameSeat(seat,her.seat)){const kind=fussFor(lastFuss.current,Math.random,{seated:true});lastFuss.current=kind;lastInvite.current=now;startTouch(kind,partner);return;}
  if(him.seat!==seat){const obs=blocked(partner),route=findPath(fromHere(him,obs),seat.approach,obs,bounds);if(!route)return;if(him.sit||him.transition){him.pending=route;him.pendingSeat=seat;beginStand(him);}else{him.route=route;him.seat=seat;}invalidate();}
  lastInvite.current=now;invite.current={seat,stage:'going',until:now+60000};
 },4000);return()=>clearInterval(tick);},[enabled,area,partner,key]);
 // Asked for by an AI (the 'machine' command): he sits down and asks her over, as he does now and then when left
 // alone, and waits longer for her (a minute and a half). On his lap already, leaning on him, or she's on that sofa:
 // he comes for a kiss instead. What he did ('invite', 'kiss'), or null when he couldn't.
 const startInvite=()=>{const now=performance.now(),him=state[partner],her=state[active];
  if(lap.current?.stage==='holding'||nestle.current?.stage==='leaning')return startTouch('kiss',partner)?'kiss':null;
  const seat=him.seat&&!him.seat.lap&&him.sit>.99&&!him.transition?him.seat:hisSeat(him,her);
  if(!seat)return null;
  if(sameSeat(seat,her.seat))return startTouch('kiss',partner)?'kiss':null;
  let route=null;if(him.seat!==seat){const obs=blocked(partner);route=findPath(fromHere(him,obs),seat.approach,obs,bounds);if(!route)return null;}
  stopTouch();stopHand();watch.current=null;
  if(route){if(him.sit||him.transition){him.pending=route;him.pendingSeat=seat;beginStand(him);}else{him.route=route;him.seat=seat;}}
  touched();lastInvite.current=now;invite.current={seat,stage:'going',until:now+90000,long:true};invalidate();return 'invite';};
 // A hug asked for while she sat: once she's up, it happens (not if something else began meanwhile), and the house
 // hears what came of it.
 const standThen=useRef(null);
 useFrame(()=>{const s=standThen.current;if(!s||!enabled)return;const her=state[active];
  if(performance.now()>s.until||hiddenRef.current||touch.current||hand.current||lap.current||sleep.current||dance.current){standThen.current=null;s.done(null);return;}
  if(her.sit<.01&&!her.transition&&!her.pending){standThen.current=null;s.done(startTouch(s.kind,partner)?s.kind:null);return;}
  invalidate();});
 // Where he sits down to ask her over or to have her on his lap: his end of the sofa in the living room, else the
 // nearest seat she isn't on (his end of it, if it's the sofa).
 const sofaEnd=kind=>({...sofaSeat(furniture.sofa,kind),id:'sofa',end:kind==='girl'?-1:1});
 const hisSeat=(him,her)=>area==='living'?sofaEnd(partner):seatEnd(nearestSeat(him,her.seat?.id,'sofa'),partner==='girl'?-1:1);
 // He's hiding (today's hide-and-seek): nothing together until she's found him, and she's told so.
 const hiding=()=>{if(!hiddenRef.current)return false;const he=partner==='girl'?'她':'他';onNotice(`${he}躲起来了，先把${he}找出来吧。`);return true;};
 // Where a walk can start: where she is, or just beside it if she's standing inside something.
 const fromHere=(m,obs)=>{const p=(m.sit||m.transition)?m.seat.approach:[m.x,m.z];return freePoint(p,obs,bounds)?p:nearestFree(p,obs,bounds)||p;};
 // Leaning on him (he sits on the sofa): she sits next to him, towards the middle, and leans in. False if she can't
 // (quiet: and nothing said, the house trying again later).
 const nestleNow=(quiet=false)=>{const m=state[active],him=state[partner],mine=!hiddenRef.current&&him.sit>.99&&!him.transition?seatNestled(him.seat):null;
  if(!mine){if(!quiet)onNotice(`${partner==='girl'?'她':'他'}要先坐在沙发上。`);return false;}
  const obs=blocked(active),route=findPath(fromHere(m,obs),mine.approach,obs,bounds);
  if(!route){if(!quiet)onNotice('沙发前需要留一点空地，才能走过去坐下。');return false;}
  offLap();stopHand();
  if(m.sit||m.transition){m.pending=route;m.pendingSeat=mine;beginStand(m);}else{m.route=route;m.seat=mine;}
  dine.current=null;nestle.current={his:him.seat,mine,stage:'coming'};invalidate();return true;
 };
 // To watch television: once he's sat down on the sofa, she leans on him.
 useFrame(()=>{const w=watch.current;if(!w||!enabled)return;const him=state[partner];
  if(hiddenRef.current||(him.seat!==w.seat&&him.pendingSeat!==w.seat)){watch.current=null;return;}
  if(him.seat===w.seat&&him.sit>.99&&!him.transition){watch.current=null;nestleNow();}
  invalidate();
 });
 function walk(p){touched();stopTouch();dine.current=null;watch.current=null;
  // Hand in hand the two of them go there together; where they can't side by side, she lets go and goes alone.
  if(handHeld(hand.current)&&handTo(hand.current,p,pair)){invalidate();return;}
  // In bed: they get up first, then she goes.
  if(sleep.current&&wakeUp(sleep.current)){sleep.current.then=p;invalidate();return;}
  stopHand();stopSleep();stopDanceNow();const m=state[active],obs=blocked(active),start=fromHere(m,obs);const route=findPath(start,standingSpot(p,obs,bounds)||p,obs,bounds);if(!route){onNotice('这里暂时走不过去，换一块空地试试。');return;}
  if(m.sit||m.transition){m.pendingSeat=null;m.pending=route;beginStand(m);}else{m.seat=null;m.route=route;}invalidate();
 }
 useEffect(()=>{if(!command||commandSeen.current===command.id)return;commandSeen.current=command.id;if(!enabled)return;touched();const m=state[active];
  // A touch: she steals a kiss from him, or asks him for a fuss (撒个娇) and he does one of them (holding her hand
  // already, not that one again).
  if(command.type==='touch'){if(command.touch==='fuss'){const kind=fussFor(handHeld(hand.current)?'hand':lastFuss.current,Math.random,{seated:m.sit>.5});lastFuss.current=kind;if(kind==='hand')startHand();else startTouch(kind,partner);}else startTouch(command.touch==='hug'?'hug':'kiss',active);return;}
  // Hand in hand: he comes to take her hand, or, holding it, lets go.
  if(command.type==='hand'){if(command.release)stopHand();else if(!handHeld(hand.current))startHand();return;}
  // Asked of him by an AI living here (src/machine-acts.js, together): he does it to her, as when she asks him for a
  // fuss. command.onDone hears what he did (a kiss rather than a hug when she's on his lap), or null when it can't be
  // now: he's hiding, they're asleep or dancing or eating, something she asked for is under way, or he can't get to
  // her; the house tries again later. A hug from behind wants her on her feet: sitting (not on his lap), she gets up
  // for it first.
  if(command.type==='machine'){const k=command.touch,l=lap.current,onLap=l?.stage==='holding',done=did=>{command.onDone?.(did);};
   if(hiddenRef.current||reunion.current||dine.current||touch.current||sleep.current||dance.current||invite.current||standThen.current||watch.current||(l&&!onLap)){done(null);return;}
   if(k==='hand'){const h=hand.current;if(handHeld(h)){const led=h.phase==='hold'&&strollAgain(h,pair);if(led)invalidate();done(led?'hand':null);}else done(!h&&startHand()?'hand':null);return;}
   if(k==='invite'){done(startInvite());return;}
   // Onto a sofa together (and the television on, for watching it: src/main.jsx), a dance while a record plays, to bed
   // together in the bedroom: as when she asks for them, or not now.
   if(k==='lean'||k==='watch'){done(sofaTogether(true)?k:null);return;}
   if(k==='dance'){done(startDance()?'dance':null);return;}
   if(k==='sleep'){done(startSleep(true)?'sleep':null);return;}
   if(!TOUCHES[k]){done(null);return;}
   if(k==='hug'&&!onLap&&(m.sit>.5||m.transition)){unNestle();beginStand(m);standThen.current={kind:k,until:performance.now()+6000,done};invalidate();return;}
   const kind=k==='hug'&&onLap?'kiss':k;
   done(startTouch(kind,partner)?kind:null);return;}
  // To bed together, or up again.
  if(command.type==='sleep'){if(!hiding())startSleep();return;}
  if(command.type==='wake'){if(sleep.current&&wakeUp(sleep.current))invalidate();return;}
  // A dance: asked for; or a record just went on, and now and then he comes over for one; or enough of it.
  if(command.type==='dance'){if(!hiding()&&!startDance()&&!musicState().playing)onNotice('唱片停了，再放一张吧。');return;}
  if(command.type==='undance'){if(dance.current&&stopDance(dance.current))invalidate();return;}
  // He comes over a moment later, if nothing else has started by then (touched() calls it off).
  if(command.type==='tune'){if(!dance.current&&!touch.current&&!hand.current&&!sleep.current&&!lap.current&&performance.now()-lastDance.current>180000&&Math.random()<.4)tuneTimer.current=setTimeout(()=>{tuneTimer.current=null;if(enabledRef.current&&!touch.current&&!hand.current&&!sleep.current&&!lap.current&&!dance.current&&musicState().playing)startDance();},1500);return;}
  stopTouch();stopHand();stopSleep();stopDanceNow();watch.current=null;if(command.type==='stand'){beginStand(m);invalidate();return;}
  // Sitting down to eat: she takes the nearer of the two chairs and he the other (not while he's hiding).
  // Once both are sitting, command.onSeated says so (see `dine` below).
  // Onto his lap: he sits down first (staying where he sits, or at his end of the sofa, or on the
  // nearest seat), then she comes (see `lap` below).
  // Leaning on him: he's sitting on the sofa; she sits next to him, towards the middle, and leans in.
  if(command.type==='nestle'){nestleNow();return;}
  // Watching television together: he sits on the sofa (where he is, or his end of it), then she leans on him.
  if(command.type==='watch'){sofaTogether();return;}
  // Reading together in a reading chair: he sits in it, she on his lap with a book (see `lap`).
  if(command.type==='read'){
   if(hiding()||!command.seat)return;const him=state[partner],seat=seatInNavigation(command.seat,origin),l=lap.current;
   const there=him.seat&&!him.seat.lap&&him.sit>.99&&!him.transition&&sameSeat(him.seat,seat);
   // On his lap in that chair already (or on her way to it): she only opens the book.
   if(there&&l&&sameSeat(l.seat,seat)){if(!l.book){l.book=true;if(l.stage==='holding'){Object.assign(m,{armsTo:READ_ARMS,reachTo:READ_REACH,book:true});setReading(true);}}invalidate();return;}
   // Whether he can get to the chair, before anyone gets up.
   const obs=blocked(partner),route=there?null:findPath(fromHere(him,obs),seat.approach,obs,bounds);
   if(!there&&!route){onNotice('椅子前需要留一点空地，才能走过去坐下。');return;}
   offLap();unNestle();
   if(!there){
    // She's in that chair: up she gets, and steps aside.
    if(m.seat&&sameSeat(m.seat,seat)&&(m.sit>.001||m.transition)){const r=[Math.cos(seat.yaw||0),-Math.sin(seat.yaw||0)],mine=blocked(active),aside=standingSpot([seat.approach[0]+r[0]*.9,seat.approach[1]+r[1]*.9],mine,bounds);m.pending=(aside&&findPath(seat.approach,aside,mine,bounds))||[];m.pendingSeat=null;beginStand(m);}
    if(him.sit||him.transition){him.pending=route;him.pendingSeat=seat;beginStand(him);}else{him.route=route;him.seat=seat;}
   }
   dine.current=null;watch.current=null;lap.current={seat:there?him.seat:seat,stage:'waiting',book:true};invalidate();return;
  }
  if(command.type==='lap'){
   if(hiddenRef.current)return;const him=state[partner];
   let seat=him.seat&&!him.seat.lap&&him.sit>.99&&!him.transition?him.seat:null;
   if(!seat){seat=hisSeat(him,state[active]);
    const obs=blocked(partner),route=seat&&findPath(fromHere(him,obs),seat.approach,obs,bounds);
    if(!route){onNotice('这里没有能坐下的地方。');return;}
    if(him.sit||him.transition){him.pending=route;him.pendingSeat=seat;beginStand(him);}else{him.route=route;him.seat=seat;}}
   dine.current=null;lap.current={seat,stage:'waiting'};invalidate();return;
  }
  if(command.type==='dine'){
   let room=group.current;while(room&&!room.userData.cameraRoom)room=room.parent;
   const seats=(command.chairs||[]).map(id=>{let at=null;room?.traverse(o=>{if(o.userData.seatId===id)at=o;});return at&&seatInNavigation({...seatInRoom(at,room,at.userData.seatSpec),id},origin);}).filter(Boolean);
   const her=state[active],order=seats.length>1&&Math.hypot(seats[1].approach[0]-her.x,seats[1].approach[1]-her.z)<Math.hypot(seats[0].approach[0]-her.x,seats[0].approach[1]-her.z)?[seats[1],seats[0]]:seats;
   const kinds=[active,...(hiddenRef.current?[]:[partner])].slice(0,order.length),going=[];
   kinds.forEach((kind,i)=>{const m=state[kind],seat=order[i];if(m.seat?.id===seat.id&&m.sit>.99&&!m.transition){going.push(kind);return;}
    const obs=blocked(kind),route=findPath(fromHere(m,obs),seat.approach,obs,bounds);if(!route)return;going.push(kind);
    if(m.sit||m.transition){m.pending=route;m.pendingSeat=seat;beginStand(m);}else{m.route=route;m.seat=seat;}});
   dine.current=going.length?{kinds:going,ids:order.map(s=>s.id),onSeated:command.onSeated}:null;
   if(!going.length)command.onSeated?.();
   invalidate();return;
  }
  if(command.type==='sit'){let seat=command.seat?seatInNavigation(command.seat,origin):sofaEnd(active);
   // He's on that seat, or on his way to it: on the sofa she takes the other end; a seat for one is his.
   const him=state[partner];if(!hiddenRef.current&&him.seat&&!him.seat.lap){const beside=seatBeside(seat,him.seat);if(!beside){const he=partner==='girl'?'她':'他';onNotice(`${he}坐在这儿呢，点${he}可以坐${he}腿上。`);return;}seat=beside;}
  const obs=blocked(active),route=findPath(fromHere(m,obs),seat.approach,obs,bounds);if(!route){onNotice('椅子前需要留一点空地，才能走过去坐下。');return;}if(m.sit||m.transition){m.pending=route;m.pendingSeat=seat;beginStand(m);}else{m.route=route;m.seat=seat;}invalidate();}
 },[command]);
 // A transparent ground target sits above the rug. Furniture handlers keep priority.
 const [x0,x1,z0,z1]=bounds;
 return <group ref={group}>
 <mesh position={[(x0+x1)/2,.14,(z0+z1)/2]} rotation={[-Math.PI/2,0,0]} visible={enabled} onClick={e=>{if(!enabled||e.delta>5||hitsPlacedObject(e.intersections))return;e.stopPropagation();onGround?.();const p=group.current.worldToLocal(e.point.clone());walk([p.x,p.z]);}}><planeGeometry args={[x1-x0,z1-z0]}/><meshBasicMaterial transparent opacity={0} depthWrite={false}/></mesh>
 {['girl','boy'].map(kind=><WalkingResident key={kind} kind={kind} look={wardrobe[kind]} motion={state[kind]} active={active===kind} enabled={enabled} hidden={kind===partner&&unseen} passThrough={kind===partner&&hidden&&!enabled} onSelect={inBed(sleep.current)?(k,anchor)=>seats?.open?.({id:'bedroomBed',bed:true,sleeping:true,anchor,labelPoint:[0,.6,0]}):kind===partner&&hidden?()=>seek.onFound?.():kind===partner?(k,anchor)=>seats?.open?.({id:'partner',partner:k,anchor,labelPoint:[0,state[k].sit>.5?1.2:1.5,0],onLap:lap.current?.stage==='holding',sitting:state[k].sit>.5,sofa:state[k].sit>.5&&state[k].seat?.id==='sofa'&&nestle.current?.stage!=='leaning',hand:handHeld(hand.current),dancing:!!dance.current&&dance.current.phase!=='done'}):hidden?()=>{}:(k,anchor)=>seats?.open?.({id:'self',self:true,partner,anchor,labelPoint:[0,state[k].sit>.5?1.2:1.5,0]})}/>)}
 {unseen&&<HideHint spot={spot} fidget={!!seek.fidget} outfit={wardrobe[partner]?.outfit} colorway={wardrobe[partner]?.colorways?.[wardrobe[partner]?.outfit]} onFound={()=>seek.onFound?.()} enabled={enabled}/>}
 {burst&&<KissBurst key={burst.key} burst={burst}/>}
 {touchBurst&&<TouchBurst key={touchBurst.key} burst={touchBurst}/>}
 </group>;
}

