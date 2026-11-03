// A horn gramophone on a small cream cabinet. While the house music plays, the record turns, the arm rests on it
// and little notes float out of the horn in time with the tune; when the music stops the arm swings back and the
// record slows to a halt. Tapping it is wired by the room (see gramophoneNext in music.js).
import React,{useEffect,useMemo,useRef,useState} from 'react';
import {useFrame} from '@react-three/fiber';
import * as T from 'three';
import {RoundedBoxGeometry} from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import {DecorMaterial} from './decor-context.jsx';
import {ShellCrest} from './rococo-details.jsx';
import {Bow} from './little-touches.jsx';
import {musicState,onMusicChange,onMusicNote,musicClock} from './music.js';

const cream='#f5ebdf', panel='#fbf4ea', gilt='#cbb28c', wood='#8a6a5c', vinyl='#2d2730', rose='#e5afbf', label='#d7a1b0';
const Gilt=()=><DecorMaterial role="detail" color={gilt} roughness={.4} metalness={.35}/>;
const Paint=({color=cream})=><DecorMaterial role="paint" color={color} roughness={.55}/>;

function Box({size,radius=.02,position,children}){
  const g=useMemo(()=>new RoundedBoxGeometry(size[0],size[1],size[2],3,radius),[size[0],size[1],size[2],radius]);
  useEffect(()=>()=>g.dispose(),[g]);
  return <mesh geometry={g} position={position} castShadow receiveShadow>{children}</mesh>;
}

// The horn's neck rises from the back of the case and turns forward; the bell flares open at its end.
const neckPoints=[[-.1,.79,-.1],[-.13,.93,-.15],[-.09,1.07,-.1],[-.02,1.14,-.01]].map(p=>new T.Vector3(...p));
const bellProfile=Array.from({length:18},(_,i)=>{const u=i/17;return new T.Vector2(.022+.25*Math.pow(u,2.3),u*.32);});

function Horn(){
  const neck=useMemo(()=>new T.TubeGeometry(new T.CatmullRomCurve3(neckPoints),40,.02,10,false),[]);
  const bell=useMemo(()=>new T.LatheGeometry(bellProfile,48),[]);
  const ribs=useMemo(()=>Array.from({length:8},(_,k)=>{const a=k/8*Math.PI*2;return new T.TubeGeometry(new T.CatmullRomCurve3(bellProfile.filter((_,i)=>i%3===0||i===17).map(p=>new T.Vector3(Math.cos(a)*(p.x+.002),p.y,Math.sin(a)*(p.x+.002)))),24,.0035,5,false);}),[]);
  useEffect(()=>()=>{neck.dispose();bell.dispose();ribs.forEach(r=>r.dispose());},[neck,bell,ribs]);
  // point the bell's axis along the end of the neck: forward and a little up
  const end=neckPoints[neckPoints.length-1],dir=new T.Vector3(.12,.42,1).normalize();
  const q=useMemo(()=>new T.Quaternion().setFromUnitVectors(new T.Vector3(0,1,0),dir),[]);
  return <group>
    <mesh geometry={neck} castShadow><Gilt/></mesh>
    <group position={end} quaternion={q}>
      <mesh geometry={bell} castShadow><DecorMaterial role="paint" color={cream} roughness={.5} side={T.FrontSide}/></mesh>
      <mesh geometry={bell}><meshStandardMaterial color={rose} roughness={.6} side={T.BackSide}/></mesh>
      {ribs.map((r,k)=><mesh key={k} geometry={r}><Gilt/></mesh>)}
      <mesh position={[0,.32,0]} rotation={[Math.PI/2,0,0]}><torusGeometry args={[.272,.009,8,48]}/><Gilt/></mesh>
    </group>
    <group position={[-.115,.9,-.14]} rotation={[0,.5,0]} userData={{tintExclude:true}}><Bow scale={.42}/></group>
  </group>;
}

// Some pieces spell something in their tune: a melody note can carry a `glyph`, and then that letter floats out
// instead of a note, in the colour of the voice playing it (`letter[0]`: the first voice, the second, or both).
const voiceInk=['#a67c44','#c76e8b','#b98a5e'];
const glyphTextures=new Map();
function glyphTexture(glyph,voice){
  const key=voice+':'+glyph;
  if(!glyphTextures.has(key)){
    const c=document.createElement('canvas');c.width=c.height=128;
    const x=c.getContext('2d');
    x.font='italic 600 92px Georgia,"Times New Roman",serif';x.textAlign='center';x.textBaseline='middle';
    x.lineJoin='round';x.lineWidth=12;x.strokeStyle='rgba(255,249,242,.92)';x.strokeText(glyph,64,68);
    x.fillStyle=voiceInk[voice]||voiceInk[0];x.fillText(glyph,64,68);
    const t=new T.CanvasTexture(c);t.colorSpace=T.SRGBColorSpace;
    glyphTextures.set(key,t);
  }
  return glyphTextures.get(key);
}
function makeGlyph(){
  const m=new T.SpriteMaterial({transparent:true,opacity:0,depthWrite:false});
  const s=new T.Sprite(m);s.visible=false;s.userData={m,life:0};s.raycast=()=>{};
  return s;
}

// a small note: head, stem and flag, fading as it drifts up
function makeNote(){
  const m=new T.MeshStandardMaterial({color:gilt,roughness:.35,metalness:.3,transparent:true,opacity:0,depthWrite:false});
  const g=new T.Group();
  const head=new T.Mesh(new T.SphereGeometry(.016,12,8),m);head.scale.set(1.25,.9,.7);head.rotation.z=.4;
  const stem=new T.Mesh(new T.BoxGeometry(.004,.06,.004),m);stem.position.set(.016,.03,0);
  const flag=new T.Mesh(new T.BoxGeometry(.018,.006,.004),m);flag.position.set(.024,.058,0);flag.rotation.z=-.6;
  g.add(head,stem,flag);g.visible=false;g.userData={m,life:0};
  g.traverse(o=>{o.raycast=()=>{};});
  return g;
}

export function Gramophone(){
  const [state,setState]=useState(musicState);
  useEffect(()=>onMusicChange(setState),[]);
  const record=useRef(),arm=useRef(),notes=useRef(),spin=useRef(0),queue=useRef([]),last=useRef(0);
  const pool=useMemo(()=>Array.from({length:8},makeNote),[]),letters=useMemo(()=>Array.from({length:12},makeGlyph),[]);
  useEffect(()=>()=>pool.forEach(n=>{n.traverse(o=>o.geometry&&o.geometry.dispose());n.userData.m.dispose();}),[pool]);
  useEffect(()=>()=>letters.forEach(s=>s.userData.m.dispose()),[letters]);
  useEffect(()=>onMusicNote(e=>{
    if(e.type==='mel'&&e.glyph)queue.current.push({t:e.t,glyph:e.glyph,voice:e.letter?.[0]??0});
    else if(e.type==='mel'||Math.random()<.5)queue.current.push({t:e.t});
    if(queue.current.length>24)queue.current.splice(0,queue.current.length-24);
  }),[]);
  const playing=state.on&&state.playing;
  // the bell's mouth in this piece's own frame, where notes come out
  const mouth=useMemo(()=>{const end=neckPoints[neckPoints.length-1],dir=new T.Vector3(.12,.42,1).normalize();return end.clone().addScaledVector(dir,.3);},[]);
  useFrame((_,dt)=>{
    dt=Math.min(dt,.05);
    spin.current+=((playing?2.2:0)-spin.current)*Math.min(1,dt*(playing?1.5:.8));
    if(record.current)record.current.rotation.y-=spin.current*dt;
    if(arm.current){const want=playing?-.25:.5;arm.current.rotation.y+=(want-arm.current.rotation.y)*Math.min(1,dt*2.4);}
    const now=musicClock();
    if(now!=null){
      const q=queue.current;
      for(let i=q.length-1;i>=0;i--){
        const ev=q[i];
        if(ev.t>now)continue;
        q.splice(i,1);
        if(!playing)continue;
        // A letter always comes out, each voice on its own side of the bell, so two at once don't cover each other.
        if(ev.glyph){
          const s=letters.find(p=>!p.visible);
          if(!s)continue;
          const side=ev.voice===0?-1:ev.voice===1?1:0;
          s.userData.m.map=glyphTexture(ev.glyph,ev.voice);s.userData.m.needsUpdate=true;
          s.visible=true;s.userData.life=0;s.userData.v=new T.Vector3(side*.018+(Math.random()-.5)*.01,.16,.04);
          s.position.copy(mouth).add(new T.Vector3(side*.13,.26+(Math.random()-.5)*.02,.06));
          continue;
        }
        if(now-last.current<.35)continue;
        const n=pool.find(p=>!p.visible);
        if(!n)continue;
        last.current=now;
        n.visible=true;n.userData.life=0;n.userData.v=new T.Vector3((Math.random()-.5)*.06,.09+Math.random()*.04,.05+Math.random()*.03);
        n.position.copy(mouth).add(new T.Vector3((Math.random()-.5)*.16,(Math.random()-.5)*.06,(Math.random()-.5)*.08));
        n.rotation.set(0,(Math.random()-.5)*.8,(Math.random()-.5)*.5);
      }
    }
    for(const n of pool){
      if(!n.visible)continue;
      const u=(n.userData.life+=dt)/2.6;
      if(u>=1){n.visible=false;n.userData.m.opacity=0;continue;}
      n.position.addScaledVector(n.userData.v,dt);
      n.position.x+=Math.sin(n.userData.life*2.2)*.0015;
      n.userData.m.opacity=Math.min(1,u*6)*(1-u);
      n.scale.setScalar(.8+.5*Math.min(1,u*4));
    }
    // letters rise a little slower and stay a little longer, so a word can be read as it goes by
    for(const s of letters){
      if(!s.visible)continue;
      const u=(s.userData.life+=dt)/3.4;
      if(u>=1){s.visible=false;s.userData.m.opacity=0;continue;}
      s.position.addScaledVector(s.userData.v,dt);
      s.position.x+=Math.sin(s.userData.life*1.8)*.001;
      s.userData.m.opacity=Math.min(1,u*5)*(1-u*u);
      s.scale.setScalar(.15*(.75+.25*Math.min(1,u*4)));
    }
  });
  return <group>
    {/* the cabinet */}
    {[[-1,-1],[1,-1],[-1,1],[1,1]].map(([x,z])=><mesh key={x+','+z} position={[x*.22,.04,z*.15]} castShadow><cylinderGeometry args={[.016,.022,.08,12]}/><Gilt/></mesh>)}
    <Box size={[.56,.58,.4]} radius={.03} position={[0,.37,0]}><Paint/></Box>
    <Box size={[.6,.03,.44]} radius={.012} position={[0,.675,0]}><Gilt/></Box>
    {[-1,1].map(s=><group key={s}>
      <Box size={[.22,.4,.012]} radius={.01} position={[s*.122,.36,.203]}><Paint color={panel}/></Box>
      <mesh position={[s*.03,.36,.214]} castShadow><sphereGeometry args={[.011,10,8]}/><Gilt/></mesh>
    </group>)}
    <ShellCrest position={[0,.585,.205]} scale={.3}/>
    {/* the gramophone itself */}
    <Box size={[.36,.1,.34]} radius={.018} position={[0,.74,0]}><meshStandardMaterial color={wood} roughness={.5}/></Box>
    <Box size={[.37,.014,.35]} radius={.006} position={[0,.697,0]}><Gilt/></Box>
    <mesh position={[.19,.75,.06]} rotation={[0,0,Math.PI/2]} castShadow><cylinderGeometry args={[.012,.012,.03,10]}/><Gilt/></mesh>
    <mesh position={[.21,.75,.06]} castShadow><sphereGeometry args={[.016,10,8]}/><Gilt/></mesh>
    <mesh position={[0,.796,0]} castShadow><cylinderGeometry args={[.135,.135,.014,40]}/><Gilt/></mesh>
    <group ref={record} position={[0,.806,0]}>
      <mesh receiveShadow><cylinderGeometry args={[.125,.125,.006,48]}/><meshStandardMaterial color={vinyl} roughness={.3} metalness={.1}/></mesh>
      {[.06,.08,.1].map(r=><mesh key={r} position={[0,.0032,0]} rotation={[-Math.PI/2,0,0]}><ringGeometry args={[r,r+.003,48]}/><meshStandardMaterial color="#4a4250" roughness={.25}/></mesh>)}
      <mesh position={[0,.0036,0]}><cylinderGeometry args={[.042,.042,.002,32]}/><meshStandardMaterial color={label} roughness={.6}/></mesh>
      <mesh position={[.02,.0048,0]}><boxGeometry args={[.012,.001,.004]}/><meshStandardMaterial color={panel}/></mesh>
      <mesh position={[0,.01,0]}><cylinderGeometry args={[.004,.004,.02,8]}/><Gilt/></mesh>
    </group>
    {/* the arm swings onto the record while it plays */}
    <group position={[.14,.8,-.12]}>
      <mesh position={[0,.012,0]} castShadow><cylinderGeometry args={[.02,.024,.026,16]}/><Gilt/></mesh>
      <group ref={arm} rotation={[0,.5,0]}>
        <mesh position={[-.02,.03,.085]} rotation={[Math.PI/2,0,.22]} castShadow><cylinderGeometry args={[.0055,.0055,.18,8]}/><Gilt/></mesh>
        <mesh position={[-.04,.02,.175]} castShadow><boxGeometry args={[.026,.014,.036]}/><Gilt/></mesh>
      </group>
    </group>
    <Horn/>
    <group ref={notes}>{pool.map((n,k)=><primitive key={k} object={n}/>)}{letters.map((s,k)=><primitive key={'l'+k} object={s}/>)}</group>
  </group>;
}
