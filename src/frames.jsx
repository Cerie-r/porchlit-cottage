// Pictures for the living-room walls: small painted artworks drawn on canvas
// (original, simple: a rose sprig, soft hills, a bird on a blossom branch, a
// lake, roses in a vase) and the frames that hold them.
import React,{useEffect,useMemo} from 'react';
import * as T from 'three';
import {DecorMaterial} from './decor-context.jsx';
import {PhotoSurface} from './art-model.jsx';
import {Bow} from './little-touches.jsx';

// Seeded so every home paints the same pictures and the paper grain never
// lines up into stripes.
function seeded(seed){return()=>{seed|=0;seed=seed+0x6D2B79F5|0;let t=Math.imul(seed^seed>>>15,1|seed);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;};}
function paper(g,w,h,base='#f5eddf'){
  g.fillStyle=base;g.fillRect(0,0,w,h);
  const rand=seeded(528);
  for(let i=0;i<w*h/90;i++){g.fillStyle=rand()<.5?'rgba(255,250,240,.35)':'rgba(140,115,90,.07)';g.fillRect(rand()*w,rand()*h,1+rand()*1.5,1+rand()*2);}
}
function leaf(g,x,y,len,angle,color){g.save();g.translate(x,y);g.rotate(angle);g.fillStyle=color;g.beginPath();g.moveTo(0,0);g.quadraticCurveTo(len*.5,-len*.32,len,0);g.quadraticCurveTo(len*.5,len*.32,0,0);g.fill();g.strokeStyle='rgba(70,90,60,.35)';g.lineWidth=1;g.beginPath();g.moveTo(0,0);g.lineTo(len*.9,0);g.stroke();g.restore();}
function rose(g,x,y,r,tones=['#e5b3bc','#d79aa6','#c98593']){
  for(let i=0;i<5;i++){const a=i/5*Math.PI*2;g.fillStyle=tones[0];g.beginPath();g.ellipse(x+Math.cos(a)*r*.45,y+Math.sin(a)*r*.4,r*.62,r*.5,a,0,7);g.fill();}
  g.fillStyle=tones[1];g.beginPath();g.arc(x,y,r*.58,0,7);g.fill();
  g.strokeStyle=tones[2];g.lineWidth=Math.max(1,r*.12);
  for(let i=0;i<3;i++){g.beginPath();g.arc(x+(i-1)*r*.08,y-r*.05,r*(.42-i*.12),Math.PI*(.15+i*.3),Math.PI*(1.35+i*.3));g.stroke();}
}
function blossom(g,x,y,r){for(let i=0;i<5;i++){const a=i/5*Math.PI*2-Math.PI/2;g.fillStyle='#f2c9d1';g.beginPath();g.arc(x+Math.cos(a)*r*.62,y+Math.sin(a)*r*.62,r*.55,0,7);g.fill();}g.fillStyle='#d6939f';g.beginPath();g.arc(x,y,r*.32,0,7);g.fill();}

const painters={
  // a pressed rose sprig tied with a ribbon
  rose(g,w,h){
    paper(g,w,h);
    g.strokeStyle='#7f9172';g.lineWidth=5;g.lineCap='round';g.beginPath();g.moveTo(132,300);g.bezierCurveTo(118,230,140,170,122,96);g.stroke();
    g.lineWidth=3;g.beginPath();g.moveTo(128,200);g.quadraticCurveTo(150,170,166,150);g.stroke();
    [[127,250,44,-2.4,'#8fa07f'],[131,226,40,-.5,'#99aa88'],[126,180,38,-2.7,'#8fa07f'],[133,150,34,-.3,'#99aa88']].forEach(([x,y,l,a,c])=>leaf(g,x,y,l,a,c));
    rose(g,122,92,34);
    g.fillStyle='#e2a9b4';g.beginPath();g.ellipse(168,146,9,13,.6,0,7);g.fill();leaf(g,166,156,16,1.9,'#8fa07f');
    g.fillStyle='#e3b7c0';[[-1,1],[1,1]].forEach(([s])=>{g.beginPath();g.ellipse(130+s*16,268,15,8,s*.5,0,7);g.fill();});
    g.fillStyle='#d79aa6';g.beginPath();g.arc(130,268,5,0,7);g.fill();
    g.strokeStyle='#e3b7c0';g.lineWidth=4;g.beginPath();g.moveTo(128,270);g.lineTo(116,296);g.moveTo(132,270);g.lineTo(146,294);g.stroke();
  },
  // soft hills under a blush sky, a small tree and a pale sun
  hills(g,w,h){
    const sky=g.createLinearGradient(0,0,0,h);sky.addColorStop(0,'#f1d6d6');sky.addColorStop(.62,'#f7ede2');g.fillStyle=sky;g.fillRect(0,0,w,h);
    g.fillStyle='rgba(246,226,181,.9)';g.beginPath();g.arc(372,96,32,0,7);g.fill();
    const hill=(y0,amp,color,phase)=>{g.fillStyle=color;g.beginPath();g.moveTo(0,h);for(let x=0;x<=w;x+=8)g.lineTo(x,y0-Math.sin(x/w*Math.PI*1.6+phase)*amp);g.lineTo(w,h);g.fill();};
    hill(205,26,'#c2cbb3',.4);hill(240,22,'#a7b799',2.1);hill(280,14,'#90a383',3.7);
    g.fillStyle='#8b7563';g.fillRect(138,198,5,30);g.fillStyle='#7f9474';[[140,190,17],[128,200,12],[153,201,12]].forEach(([x,y,r])=>{g.beginPath();g.arc(x,y,r,0,7);g.fill();});
    g.strokeStyle='#8a7f86';g.lineWidth=2;[[250,70],[272,82],[232,92]].forEach(([x,y])=>{g.beginPath();g.moveTo(x-7,y-3);g.quadraticCurveTo(x-3,y-6,x,y);g.quadraticCurveTo(x+3,y-6,x+7,y-3);g.stroke();});
    paperGrain(g,w,h);
  },
  // a little bird on a blossom branch
  bird(g,w,h){
    paper(g,w,h,'#f6eee3');
    g.strokeStyle='#8f7462';g.lineCap='round';g.lineWidth=6;g.beginPath();g.moveTo(8,232);g.bezierCurveTo(80,214,160,196,250,168);g.stroke();
    g.lineWidth=3;[[70,220,52,182],[170,192,196,150],[210,180,232,206]].forEach(([a,b,c,d])=>{g.beginPath();g.moveTo(a,b);g.lineTo(c,d);g.stroke();});
    [[50,180,9],[60,214,8],[196,148,10],[232,206,8],[120,205,7],[238,166,9]].forEach(([x,y,r])=>blossom(g,x,y,r));
    leaf(g,98,212,22,-.9,'#9aab8a');leaf(g,214,178,20,.8,'#9aab8a');
    g.fillStyle='#a9b8c9';g.beginPath();g.ellipse(132,176,30,21,-.15,0,7);g.fill();
    g.beginPath();g.moveTo(106,182);g.lineTo(76,196);g.lineTo(82,180);g.closePath();g.fill();
    g.fillStyle='#e9ddca';g.beginPath();g.ellipse(140,186,19,12,-.2,0,7);g.fill();
    g.fillStyle='#a9b8c9';g.beginPath();g.arc(160,154,17,0,7);g.fill();
    g.fillStyle='#93a3b6';g.beginPath();g.ellipse(124,170,18,10,-.4,0,7);g.fill();
    g.fillStyle='#3b3438';g.beginPath();g.arc(166,150,2.6,0,7);g.fill();
    g.fillStyle='#d8a45a';g.beginPath();g.moveTo(175,154);g.lineTo(186,157);g.lineTo(175,160);g.closePath();g.fill();
    g.strokeStyle='#8f7462';g.lineWidth=2;g.beginPath();g.moveTo(130,196);g.lineTo(128,206);g.moveTo(140,196);g.lineTo(141,206);g.stroke();
  },
  // a quiet lake between hills, wide format for the big picture
  lake(g,w,h){
    const sky=g.createLinearGradient(0,0,0,h*.6);sky.addColorStop(0,'#e7d5dc');sky.addColorStop(1,'#f6eee4');g.fillStyle=sky;g.fillRect(0,0,w,h);
    const ridge=(y0,amp,freq,color,phase)=>{g.fillStyle=color;g.beginPath();g.moveTo(0,h);for(let x=0;x<=w;x+=8)g.lineTo(x,y0-Math.abs(Math.sin(x/w*Math.PI*freq+phase))*amp);g.lineTo(w,h);g.fill();};
    ridge(150,46,2.2,'#cfcbd6',.3);ridge(178,30,1.6,'#b4c0a8',1.4);
    const water=g.createLinearGradient(0,190,0,260);water.addColorStop(0,'#cddcdd');water.addColorStop(1,'#e3ebe6');g.fillStyle=water;g.fillRect(0,190,w,72);
    g.strokeStyle='rgba(255,255,255,.7)';g.lineWidth=2;[[90,208,60],[300,222,90],[470,212,70],[200,240,50]].forEach(([x,y,l])=>{g.beginPath();g.moveTo(x,y);g.lineTo(x+l,y);g.stroke();});
    ridge(300,40,1.2,'#9eb08f',2.6);ridge(h,26,.9,'#8a9f7d',.8);
    g.strokeStyle='#7d8e6e';g.lineWidth=2;for(let i=0;i<14;i++){const x=40+i*9+(i%3)*4;g.beginPath();g.moveTo(x,276);g.quadraticCurveTo(x+3,256-(i%4)*6,x+6,246-(i%5)*5);g.stroke();}
    g.fillStyle='rgba(247,229,186,.9)';g.beginPath();g.arc(520,70,24,0,7);g.fill();
    paperGrain(g,w,h);
  },
  // roses in a pale vase on a ledge
  vase(g,w,h){
    paper(g,w,h,'#f4ecdf');
    g.fillStyle='#e8ddcb';g.fillRect(0,170,w,50);g.strokeStyle='#d8c9b2';g.lineWidth=2;g.beginPath();g.moveTo(0,170);g.lineTo(w,170);g.stroke();
    [[132,96,46,-2.3],[186,92,44,-.8],[150,70,40,-1.9],[172,74,38,-1.1]].forEach(([x,y,l,a])=>leaf(g,x,y,l,a,'#93a483'));
    rose(g,140,62,24);rose(g,182,58,22,['#efc9cf','#e2aab5','#cf8f9c']);rose(g,160,40,20);
    g.fillStyle='#e9c0c8';g.beginPath();g.ellipse(208,80,7,10,.5,0,7);g.fill();
    g.fillStyle='#c8d6d1';g.beginPath();g.moveTo(140,104);g.bezierCurveTo(118,128,124,170,146,176);g.lineTo(176,176);g.bezierCurveTo(198,170,204,128,182,104);g.closePath();g.fill();
    g.fillStyle='rgba(255,255,255,.45)';g.beginPath();g.ellipse(148,138,5,20,.1,0,7);g.fill();
    g.fillStyle='#b9cac4';g.fillRect(146,98,30,8);
  }
};
function paperGrain(g,w,h){const rand=seeded(1018);for(let i=0;i<w*h/120;i++){g.fillStyle=rand()<.5?'rgba(255,250,240,.25)':'rgba(140,115,90,.05)';g.fillRect(rand()*w,rand()*h,1+rand(),1+rand()*2);}}
const sizes={rose:[256,320],hills:[512,320],bird:[256,320],lake:[640,340],vase:[320,220]};
const cache=new Map();
export function artTexture(kind){
  if(cache.has(kind))return cache.get(kind);
  const [w,h]=sizes[kind],c=document.createElement('canvas');c.width=w;c.height=h;
  painters[kind](c.getContext('2d'),w,h);
  const t=new T.CanvasTexture(c);t.colorSpace=T.SRGBColorSpace;t.anisotropy=4;cache.set(kind,t);return t;
}

const Gilt=()=><DecorMaterial role="detail" color="#c6a56b" metalness={.45} roughness={.35}/>;
const Mat=()=><meshStandardMaterial color="#fbf6ec" roughness={.85}/>;
const Art=({kind})=><meshStandardMaterial map={artTexture(kind)} roughness={.85}/>;

// Arched-top outline, w wide and h tall, centred on the origin.
function archShape(w,h){const s=new T.Shape(),r=w/2;s.moveTo(-r,-h/2);s.lineTo(r,-h/2);s.lineTo(r,h/2-r);s.absarc(0,h/2-r,r,0,Math.PI,false);s.lineTo(-r,-h/2);return s;}
function flatShape(shape,depth=0){
  const g=depth?new T.ExtrudeGeometry(shape,{depth,bevelEnabled:false,curveSegments:24}):new T.ShapeGeometry(shape,24);
  g.computeBoundingBox();const b=g.boundingBox,uv=g.attributes.uv,p=g.attributes.position;
  for(let i=0;i<uv.count;i++)uv.setXY(i,(p.getX(i)-b.min.x)/(b.max.x-b.min.x),(p.getY(i)-b.min.y)/(b.max.y-b.min.y));
  return g;
}

function OvalPicture({kind}){
  return <group>
    {/* the backing: stretch the disc into an oval in the wall plane (scale outside the turn), front face behind the mat */}
    <group position={[0,0,-.004]} scale={[1,1.3,1]}><mesh rotation={[Math.PI/2,0,0]} castShadow><cylinderGeometry args={[.156,.156,.03,40]}/><meshStandardMaterial color="#f3e9db" roughness={.6}/></mesh></group>
    <group userData={{tintExclude:true}}>
      <mesh position={[0,0,.013]} scale={[1,1.3,1]}><torusGeometry args={[.147,.016,10,48]}/><Gilt/></mesh>
      <mesh position={[0,0,.0115]} scale={[1,1.3,1]}><circleGeometry args={[.134,40]}/><Mat/></mesh>
      <mesh position={[0,0,.0135]} scale={[1,1.3,1]}><circleGeometry args={[.104,40]}/><Art kind={kind}/></mesh>
      <group position={[0,.212,.022]}><Bow color="#d4b06c" scale={.42}/></group>
    </group>
  </group>;
}
function RectPicture({kind,photo,w=.3,h=.4}){
  return <group>
    <mesh castShadow><boxGeometry args={[w,h,.04]}/><DecorMaterial role="paint" color="#f6eee2" roughness={.6}/></mesh>
    <group userData={{tintExclude:true}}>
      <mesh position={[0,0,.004]}><boxGeometry args={[w-.05,h-.05,.04]}/><Gilt/></mesh>
      <mesh position={[0,0,.006]}><boxGeometry args={[w-.068,h-.068,.04]}/><Mat/></mesh>
      <mesh position={[0,0,.0265]}><planeGeometry args={[w-.13,h-.15]}/><Art kind={kind}/></mesh>
    </group>
    {photo&&<PhotoSurface item={photo} width={.18} height={.135} position={[0,0,.03]}/>}
  </group>;
}
function ArchPicture({kind,w=.26,h=.36}){
  const geos=useMemo(()=>({outer:flatShape(archShape(w,h),.035),gilt:flatShape(archShape(w-.034,h-.034),.004),mat:flatShape(archShape(w-.05,h-.05)),art:flatShape(archShape(w-.1,h-.11))}),[w,h]);
  useEffect(()=>()=>Object.values(geos).forEach(g=>g.dispose()),[geos]);
  return <group>
    <mesh geometry={geos.outer} position={[0,0,-.0175]} castShadow><meshStandardMaterial color="#ecd0d5" roughness={.6}/></mesh>
    <group userData={{tintExclude:true}}>
      <mesh geometry={geos.gilt} position={[0,0,.0175]}><Gilt/></mesh>
      <mesh geometry={geos.mat} position={[0,0,.022]}><Mat/></mesh>
      <mesh geometry={geos.art} position={[0,0,.023]}><Art kind={kind}/></mesh>
    </group>
  </group>;
}

// Three small pictures hung as a little gallery: an oval with a bow, the
// middle frame (where a printed photo can go) and an arched one, at slightly
// different heights. Faces +z; spans about 1.1 across.
export function GalleryFrames({photo}){
  return <group>
    <group position={[-.44,.035,0]}><OvalPicture kind="rose"/></group>
    <RectPicture kind="hills" photo={photo}/>
    <group position={[.43,-.025,0]}><ArchPicture kind="bird"/></group>
  </group>;
}

// A gilt bead and a painting inside an existing frame's mat (the big picture
// and the shelf picture keep their wooden frames). z is the mat's front face.
export function FramedArt({kind,w,h,z}){
  return <group userData={{tintExclude:true}}>
    <mesh position={[0,0,z+.002]}><boxGeometry args={[w+.03,h+.03,.004]}/><Gilt/></mesh>
    <mesh position={[0,0,z+.0045]}><planeGeometry args={[w,h]}/><Art kind={kind}/></mesh>
  </group>;
}
