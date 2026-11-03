import {QuietCanvas} from './quiet-canvas.jsx';
import {Icon} from './icons.jsx';
import React,{useState,useMemo,useEffect,useRef} from 'react';
import {useThree,useFrame} from '@react-three/fiber';
import {Shape,Vector2,Vector3,CatmullRomCurve3,MOUSE,TOUCH,BufferGeometry,Float32BufferAttribute,DoubleSide} from 'three';
import {OrbitControls} from 'three/examples/jsm/controls/OrbitControls.js';
import {Picture,PictureStudio} from './picture-studio.jsx';
import {cachedPictures} from './brick-pictures.js';
import {flowerKinds,vaseKinds,freshBouquet,validBouquet} from './flower-kinds.js';
export {flowerKinds,vaseKinds,freshBouquet,validBouquet};
function StemLine({points,color,width=.025}){const curve=useMemo(()=>new CatmullRomCurve3(points.map(p=>new Vector3(...p))),[JSON.stringify(points)]);return <mesh castShadow><tubeGeometry args={[curve,24,width,6,false]}/><Plastic color={color}/></mesh>;}
function Plastic({color}){return <meshStandardMaterial color={color} roughness={.45} metalness={.015}/>;}
function Disc({r=.2,h=.12,color,position=[0,0,0]}){return <mesh position={position} castShadow><cylinderGeometry args={[r,r,h,24]}/><Plastic color={color}/></mesh>;}
function Petal({color,angle=0,length=.55,width=.23,cup=0}){
 const shape=useMemo(()=>{const p=new Shape();p.moveTo(-width*.45,0);p.bezierCurveTo(-width, length*.55,-width*.8,length,width*.05,length);p.bezierCurveTo(width*.9,length,width,length*.55,width*.45,0);p.closePath();return p;},[length,width]);
 return <group rotation={[0,angle,0]}><mesh rotation={[-Math.PI/2+cup,0,0]} castShadow><extrudeGeometry args={[shape,{depth:.032,bevelEnabled:true,bevelSize:.012,bevelThickness:.01,bevelSegments:3,steps:1}]}/><Plastic color={color}/></mesh></group>;
}
export function Blossom({type,color}){return <group>
 {type==='daisy'&&Array.from({length:5},(_,i)=><Petal key={i} color={color} angle={i*Math.PI*2/5} length={.6} width={.25}/>)}
 {type==='rose'&&[0,1,2].map(row=><group key={row} position={[0,row*.13,0]}>{Array.from({length:5},(_,i)=><Petal key={i} color={color} angle={(i+row*.45)*Math.PI*2/5} length={.57-row*.13} width={.25-row*.025} cup={.4+row*.2}/>)}</group>)}
 {type==='tulip'&&Array.from({length:6},(_,i)=><Petal key={i} color={color} angle={i*Math.PI/3} length={.72} width={.25} cup={1.02}/>)}
 <Disc color={type==='daisy'?'#e6b75c':color} r={.17} h={.14} position={[0,.1,0]}/><mesh position={[0,.18,0]} rotation={[-Math.PI/2,0,0]}><torusGeometry args={[.11,.045,8,20]}/><Plastic color={type==='daisy'?'#b89142':color}/></mesh>
 </group>;}
function PaperSheet({color,inner=false}){
 const geometry=useMemo(()=>{const vertices=[];const n=48;const point=(i,row)=>{const a=i/n*Math.PI*2;const r=[.09,.16,inner?.57:.66][row];const y=row===0?.05:row===1?.43:1.12+.22*(1-Math.cos(a))+.09*Math.cos(4*a);return [Math.sin(a)*r,y,Math.cos(a)*r];};for(let row=0;row<2;row++)for(let i=0;i<n;i++){for(const p of [point(i,row),point(i+1,row),point(i+1,row+1),point(i,row),point(i+1,row+1),point(i,row+1)])vertices.push(...p);}const g=new BufferGeometry();g.setAttribute('position',new Float32BufferAttribute(vertices,3));g.computeVertexNormals();return g;},[inner]);
 return <mesh geometry={geometry} position={[0,inner?.06:0,0]} castShadow receiveShadow><meshStandardMaterial color={color} side={DoubleSide} roughness={.8}/></mesh>;
}
export function FlowerWrap({color='#f3e7d5'}){return <group><PaperSheet color={color}/><PaperSheet color="#fff6e9" inner/><mesh position={[0,.44,0]} rotation={[Math.PI/2,0,0]}><torusGeometry args={[.18,.035,8,32]}/><Plastic color="#bc8298"/></mesh>{[-1,1].map(side=><group key={side}><StemLine points={[[0,.45,.19],[side*.22,.62,.22],[side*.3,.5,.23],[0,.45,.2]]} color="#c78ea3" width={.035}/><StemLine points={[[0,.44,.2],[side*.12,.28,.22],[side*.19,.12,.24]]} color="#c78ea3" width={.04}/></group>)}<Disc color="#bc8298" r={.065} h={.08} position={[0,.45,.22]}/></group>;}
export function HandFlowers({stems=[],wrapColor='#f3e7d5'}){return <group><FlowerWrap color={wrapColor}/>{stems.slice(0,9).map((s,i)=>{const a=i*2.399,r=stems.length===1?0:.35+Math.floor(i/5)*.15;return <group key={s.id||i} rotation={[Math.sin(a)*.2,0,Math.cos(a)*.2]}><StemLine points={[[0,0,0],[0,.6,0],[Math.cos(a)*r,1.55+(i%3)*.18,Math.sin(a)*r]]} color="#64834e" width={.04}/><group position={[Math.cos(a)*r,1.55+(i%3)*.18,Math.sin(a)*r]} rotation={[.25,0,0]} scale={.7}><Blossom type={s.type} color={s.color}/></group></group>;})}<mesh position={[0,.47,0]} rotation={[Math.PI/2,0,0]}><torusGeometry args={[.12,.055,8,24]}/><Plastic color="#ce9da9"/></mesh></group>;}

// Turned vessels, as (radius, height) up the outside and back down the inside.
// The cream bottle is round-bellied with a narrow neck; the ribbed vase is
// tall and slender, fluted all the way up and opening a little at the lip.
const PROFILES={
 cream:[[.02,0],[.43,0],[.49,.07],[.49,.16],[.43,.2],[.56,.38],[.72,.68],[.73,.94],[.65,1.17],[.44,1.44],[.35,1.65],[.35,1.8],[.4,1.82],[.4,1.88],[.29,1.88],[.28,1.78],[.28,1.64],[.37,1.43],[.56,1.14],[.64,.92],[.63,.7],[.47,.4],[.02,.2]],
 ribbed:[[.02,0],[.42,0],[.46,.05],[.46,.12],[.4,.17],[.41,.3],[.45,.7],[.46,1.1],[.44,1.5],[.42,1.8],[.46,2],[.52,2.12],[.52,2.17],[.46,2.17],[.41,2.04],[.37,1.82],[.39,1.5],[.41,1.1],[.4,.7],[.36,.3],[.02,.26]]
};
// Each vessel: where its stems stand, how far apart the nine places are, its
// gold rings (height, radius) and the green foam showing in its mouth.
const VESSELS={
 wrap:{mouth:1.45,spread:.22},
 cream:{mouth:1.45,spread:.22,rings:[[.13,.465],[1.84,.355]],foam:[1.48,.29]},
 ribbed:{mouth:1.8,spread:.17,rings:[[.13,.465],[2.15,.52]],foam:[1.9,.36],ribs:[[.425,.32],[.465,.7],[.475,1.1],[.455,1.5],[.435,1.8],[.475,1.99]]}
};
function Vessel({kind,color}){
 const v=VESSELS[kind]||VESSELS.cream,profile=PROFILES[kind]||PROFILES.cream;
 const points=useMemo(()=>profile.map(p=>new Vector2(...p)),[profile]);
 if(kind==='wrap')return <group scale={[1.7,2.25,1.7]}><FlowerWrap color={color}/></group>;
 return <group>
  <mesh castShadow receiveShadow><latheGeometry args={[points,64]}/><Plastic color={color}/></mesh>
  {v.ribs&&Array.from({length:24},(_,i)=><group key={i} rotation={[0,i*Math.PI/12,0]}><StemLine points={v.ribs.map(([r,y])=>[r,y,0])} color={color} width={.018}/></group>)}
  {v.rings.map(([y,r])=><mesh key={y} position={[0,y,0]} rotation={[-Math.PI/2,0,0]}><torusGeometry args={[r,.018,8,64]}/><Plastic color="#cbb48c"/></mesh>)}
  <Disc color="#586649" r={v.foam[1]} h={.06} position={[0,v.foam[0],0]}/>
 </group>;
}
export function BouquetModel({item,selected,onSelect}){
 const v=VESSELS[item.vase]||VESSELS.cream;
 return <group>
 <Vessel kind={item.vase} color={item.vaseColor}/>
 {item.stems.map(s=>{const x=(s.slot%3-1)*v.spread,z=(Math.floor(s.slot/3)-1)*v.spread;return <group key={s.id} position={[x,v.mouth,z]} rotation={[0,s.turn,0]} onClick={e=>{if(onSelect&&e.delta<5){e.stopPropagation();onSelect(s.id);}}}><group rotation={[s.tilt,0,0]}><Disc color="#64834e" r={.065} h={s.height} position={[0,s.height/2,0]}/><Disc color="#537442" r={.105} h={.13} position={[0,s.height*.5,0]}/>{[0,1].map(i=><group key={i} position={[0,s.height*(.35+i*.23),0]} rotation={[0,i*Math.PI+.6,0]}><Petal color={i?'#77985b':'#527a46'} length={.7} width={.19} cup={.45}/></group>)}<group position={[0,s.height,0]} rotation={[.3,0,0]}><Blossom type={s.type} color={s.color}/></group>{selected===s.id&&<mesh position={[0,s.height+.1,0]} rotation={[-Math.PI/2,0,0]}><torusGeometry args={[.72,.018,6,48]}/><meshBasicMaterial color="#a46a88"/></mesh>}</group></group>;})}
 </group>;
}
// Drag to turn round the flowers, right-drag or two fingers to slide, wheel
// or pinch to zoom; the buttons turn, zoom and come back to the front.
function FlowerCamera({api}){
 const {camera,gl,size,invalidate}=useThree();const controls=useRef();
 useEffect(()=>{const c=new OrbitControls(camera,gl.domElement);controls.current=c;c.enableDamping=true;c.dampingFactor=.12;c.minZoom=15;c.maxZoom=180;c.minPolarAngle=.08;c.maxPolarAngle=Math.PI*.85;c.screenSpacePanning=true;c.mouseButtons.LEFT=MOUSE.ROTATE;c.mouseButtons.RIGHT=MOUSE.PAN;c.touches.ONE=TOUCH.ROTATE;c.touches.TWO=TOUCH.DOLLY_PAN;c.addEventListener('change',invalidate);return()=>{c.removeEventListener('change',invalidate);c.dispose();controls.current=null;api.current=null;};},[camera,gl,invalidate,api]);
 useEffect(()=>{const c=controls.current;if(!c)return;const reset=()=>{camera.position.set(8,6.5,10);c.target.set(0,0,0);camera.zoom=Math.max(20,Math.min(size.width/7.5,size.height/8)*.85);camera.updateProjectionMatrix();c.update();invalidate();};api.current={reset,zoom:factor=>{camera.zoom=Math.max(c.minZoom,Math.min(c.maxZoom,camera.zoom*factor));camera.updateProjectionMatrix();c.update();invalidate();},turn:angle=>{const offset=camera.position.clone().sub(c.target).applyAxisAngle(new Vector3(0,1,0),angle);camera.position.copy(c.target).add(offset);c.update();invalidate();}};reset();},[camera,size.width,size.height,invalidate,api]);
 useFrame(()=>controls.current?.update());return null;
}

// The flower table, laid out like the rest of the craft room: the
// arrangement on the left, a card with its name, where the stems go and the
// chosen stem's settings, and a tray of vessels and flowers below, each with
// a little picture of itself. Only what's unlocked is shown.
const VASE_COLORS=['#f3e7d5','#c5b4ce','#8b9c85','#d9aab7'],FLOWER_COLORS=['#fff0dc','#d9a1bd','#ba9bce','#e6bc63','#af647e'];
const VIEW=[8,6.5,10];
const unlocked=kinds=>Object.entries(kinds).filter(([,k])=>k.open);
const vaseKey=(id,color)=>`vase:${id}:${color}`,flowerKey=(id,color)=>`flower:${id}:${color}`;
export function Florist({draft,onDraft,onFinish}){
 const [saved,setSaved]=useState(false);const viewApi=useRef(null);
 const [selected,setSelected]=useState(null),[type,setType]=useState('daisy'),[color,setColor]=useState('#d9a1bd'),[tab,setTab]=useState('flower'),[message,setMessage]=useState('在「花材」里挑一种花，再点右边的空位插进去。');
 const d=draft.kind==='bouquet'?draft:freshBouquet(),s=d.stems.find(s=>s.id===selected);
 const flowerColor=s?s.color:color,flowerType=s?s.type:type;
 const wanted=useMemo(()=>[...unlocked(vaseKinds).map(([id])=>({key:vaseKey(id,d.vaseColor),node:<Vessel kind={id} color={d.vaseColor}/>})),...unlocked(flowerKinds).map(([id])=>({key:flowerKey(id,flowerColor),node:<group rotation={[.6,0,0]}><Blossom type={id} color={flowerColor}/></group>}))],[d.vaseColor,flowerColor]);
 const [pictures,setPictures]=useState(()=>cachedPictures(wanted.map(w=>w.key)));
 const update=delta=>{setSaved(false);onDraft({...d,...delta});};const patch=delta=>update({stems:d.stems.map(p=>p.id===selected?{...p,...delta}:p)});
 const choose=slot=>{const occupant=d.stems.find(p=>p.slot===slot);if(occupant){setSelected(occupant.id);setMessage('选中了这一枝：可以调高低、倾斜和朝向，换花换颜色也行。');return;}if(s){patch({slot});setMessage('挪过去了。');return;}const id=crypto.randomUUID();update({stems:[...d.stems,{id,slot,type,color,height:2.8+(slot%3)*.25,tilt:slot===4?0:.28,turn:Math.atan2(slot%3-1,Math.floor(slot/3)-1)}]});setSelected(id);setMessage('插好了。可以调高低、倾斜和朝向；点「再添一枝」接着插。');};
 return <div className="bench florist">
  <div className="atelier-top">
   <div className="atelier-stage bench-stage">
    <div className="atelier-wall"/>
    <QuietCanvas orthographic camera={{position:[8,6.5,10],zoom:window.innerWidth<600?40:65}} dpr={[1,1.5]}>
     <FlowerCamera api={viewApi}/><ambientLight intensity={1.3}/><directionalLight position={[3,8,5]} intensity={2.2}/>
     <group position={[0,-2.8,0]}><BouquetModel item={d} selected={selected} onSelect={id=>{setSelected(id);setMessage('选中了这一枝：可以调高低、倾斜和朝向，换花换颜色也行。');}}/></group>
     <PictureStudio items={wanted.filter(w=>!pictures[w.key])} view={VIEW} onPictures={got=>setPictures(p=>({...p,...got}))}/>
    </QuietCanvas>
    <div className="atelier-camera">
     <button onClick={()=>viewApi.current?.turn(-Math.PI/4)} aria-label="向左转">↶</button><span>拖动转一转</span><button onClick={()=>viewApi.current?.turn(Math.PI/4)} aria-label="向右转">↷</button>
     <button onClick={()=>viewApi.current?.zoom(1/1.2)} aria-label="缩小">−</button><button onClick={()=>viewApi.current?.zoom(1.2)} aria-label="放大">＋</button><button onClick={()=>viewApi.current?.reset()} aria-label="回到正面">归位</button>
    </div>
   </div>
   <aside className="atelier-card bench-card">
    <label>给它一个名字<input value={d.name} maxLength={30} onChange={e=>update({name:e.target.value})}/></label>
    <div className="florist-slots"><span>插在哪里 · 从上往下看</span><div className="vase-slots">{Array.from({length:9},(_,slot)=>{const p=d.stems.find(p=>p.slot===slot);return <button key={slot} aria-label={`插花位置 ${slot+1}`} className={p&&p.id===selected?'active':''} onClick={()=>choose(slot)} style={{color:p?.color}}><Icon name={p?'flower':'plus'}/></button>;})}</div></div>
    {s&&<div className="bench-edit florist-edit">
     <label>枝长<input type="range" min="2.2" max="4.2" step=".1" value={s.height} onChange={e=>patch({height:+e.target.value})}/></label>
     <label>向外倾斜<input type="range" min="0" max=".5" step=".025" value={s.tilt} onChange={e=>patch({tilt:+e.target.value})}/></label>
     <label>朝向<input type="range" min="0" max={Math.PI*2} step=".1" value={(s.turn+Math.PI*2)%(Math.PI*2)} onChange={e=>patch({turn:+e.target.value})}/></label>
     <div className="bench-row"><button onClick={()=>{setSelected(null);setMessage('挑好花，再点一个空位。');}}>再添一枝</button><button onClick={()=>{update({stems:d.stems.filter(p=>p.id!==selected)});setSelected(null);setMessage('取出来了。');}}>取出这枝</button></div>
    </div>}
    <button className="atelier-save" disabled={saved||!d.name.trim()||!validBouquet(d)} onClick={()=>{onFinish();setSelected(null);setSaved(true);setMessage('收进背包了，可以拿出来摆在屋里。');}}>{saved?'已收进背包':'收进背包'}</button>
    <p role="status">{message}</p>
    <small className="bench-count">{d.stems.length} / 9 枝</small>
   </aside>
  </div>
  <div className="atelier-tray">
   <nav>{[['flower','花材'],['vase','花器']].map(([id,label])=><button key={id} className={tab===id?'active':''} onClick={()=>setTab(id)}>{label}</button>)}</nav>
   <div className="atelier-tray-content bench-tray">
    {tab==='flower'&&<><div className="bench-chips">{unlocked(flowerKinds).map(([id,f])=><button key={id} className={`with-picture${flowerType===id?' active':''}`} onClick={()=>{setType(id);if(s)patch({type:id});}}><Picture big src={pictures[flowerKey(id,flowerColor)]}/>{f.name}</button>)}</div>
     <div className="bench-colors"><div className="atelier-palette bench-palette"><div>{FLOWER_COLORS.map(c=><button key={c} style={{background:c}} aria-label={`花色 ${c}`} aria-pressed={flowerColor===c} onClick={()=>{setColor(c);if(s)patch({color:c});}}/>)}</div></div></div></>}
    {tab==='vase'&&<><div className="bench-chips">{unlocked(vaseKinds).map(([id,v])=><button key={id} className={`with-picture${d.vase===id?' active':''}`} onClick={()=>update({vase:id})}><Picture big src={pictures[vaseKey(id,d.vaseColor)]}/>{v.name}</button>)}</div>
     <div className="bench-colors"><div className="atelier-palette bench-palette"><div>{VASE_COLORS.map(c=><button key={c} style={{background:c}} aria-label={`花器或包纸颜色 ${c}`} aria-pressed={d.vaseColor===c} onClick={()=>update({vaseColor:c})}/>)}</div></div></div></>}
   </div>
  </div>
 </div>;
}
