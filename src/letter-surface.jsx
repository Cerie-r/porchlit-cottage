import React,{useEffect,useRef,useState} from 'react';
import {Icon} from './icons.jsx';
import {play} from './sounds.js';
import './letter-surface.css';
import './stationery-refresh.css';
import {BOTTLE_ART} from './bottles.js';
import {dayLabel} from './dessert-recipe.js';
export function Postmark(){return <img className="letter-postmark" src="/art/stationery/postmark.png" alt="" aria-hidden="true"/>;}
function FloralCorner({corner}){return <img className={'stationery-flower '+corner} src="/art/stationery/letter-flower.png" alt="" aria-hidden="true"/>;}
function StationeryBorder(){return <div className="stationery-ornaments" aria-hidden="true"><div className="stationery-border"/>{['northwest','northeast','southwest','southeast'].map(c=><FloralCorner key={c} corner={c}/>)}</div>}
export function LetterSurface({letter,note,onNote,spots=[],spotId,onSpot,error,onSave,onTake,onBack,onOpen}){
 const ref=useRef(null),writing=!letter,clue=!!letter?.puzzleId,bottle=!writing&&!!letter?.bottle;
 const [stage,setStage]=useState('sealed');
 useEffect(()=>{setStage('sealed');},[letter?.id]);
 useEffect(()=>{if(stage!=='opening')return;const timer=setTimeout(()=>{setStage('read');ref.current?.focus();},window.matchMedia('(prefers-reduced-motion: reduce)').matches?0:750);return ()=>clearTimeout(timer);},[stage]);
 const unseal=()=>{if(stage!=='sealed')return;play('note');onOpen?.(letter.id);setStage('opening');};
 useEffect(()=>{ref.current?.focus();const overlay=ref.current?.closest('.storage-closeup');if(overlay)overlay.scrollTop=0;},[]);
 return <div className="letter-experience" ref={ref} tabIndex={-1} aria-label={writing?'写一封信':stage==='read'?'阅读信件':'合上的信封'}>
  <div className="letter-topline"><button onClick={onBack}><Icon name="back"/>{writing?'暂时收笔':'折好放回'}</button><span>{writing?'A LITTLE NOTE, JUST FOR YOU':bottle?'WASHED UP BY THE LAKE':'SOMETHING LEFT FOR YOU'}</span></div>
  {bottle&&stage!=='read'?<div className={'sealed-letter-view sealed-bottle '+stage}>
   <button className="bottle-cork" onClick={unseal} disabled={stage!=='sealed'} aria-label={letter.opened?'再把纸条拿出来':'拔开软木塞，拿出纸条'}><img src={BOTTLE_ART} alt="一只漂来的玻璃瓶" draggable={false}/></button>
   <p className="seal-instruction" role="status">{stage==='opening'?'纸条正从瓶口滑出来……':letter.opened?'这只瓶子拆过了 · 点瓶子再把纸条拿出来':'湖边捞回来一只瓶子 · 点瓶子拔开软木塞'}</p>
  </div>:!writing&&stage!=='read'?<div className={'sealed-letter-view '+stage}>
   <div className="sealed-envelope"><div className="envelope-lining"/><div className="envelope-pocket"/><div className="envelope-flap"/><div className="envelope-postage"><img src="/art/stationery/home-stamp.webp" alt="小屋邮票"/></div><Postmark/>
   <button className={'wax-seal '+(letter.opened?'was-opened':'')} onClick={unseal} disabled={stage!=='sealed'} aria-label={letter.opened?'展开这封信':'点蜡封拆信'}><svg viewBox="0 0 60 60" aria-hidden="true"><circle cx="30" cy="30" r="23"/><path d="M19 34c-3-12 8-17 11-7 4-10 15-5 11 3-3 6-11 11-11 11s-7-4-11-7Z"/>{letter.opened&&<path className="seal-crack" d="M35 5l-8 13 8 9-9 10 5 18"/>}</svg></button></div>
   <p className="seal-instruction" role="status">{stage==='opening'?'信纸正慢慢展开……':clue?(letter.opened?'这张线索卡已经拆过 · 点蜡封再次展开':'找到一张线索卡 · 点蜡封拆开'):letter.opened?'这封信已经拆过 · 点蜡封再次展开':'有一封信留给你 · 点蜡封拆开'}</p>
  </div>:<div className="letter-paper-stack letter-unfold"><div className="letter-envelope" aria-hidden="true"/><article className="letter-stationery"><StationeryBorder/><div className="letter-letterhead"><span>porchlit<span className="letter-letterhead-dot"> · </span>{clue?'线索卡':bottle?'漂流瓶':'小小来信'}</span><Postmark/></div><div className="letter-divider" aria-hidden="true"/>{writing?<textarea aria-label="信的内容" maxLength={2000} value={note} onChange={e=>onNote(e.target.value)} placeholder="写给发现它的人……" spellCheck={false}/>:<div className="letter-prose">{letter.note}</div>}{bottle&&(letter.bottle.thrownOn||letter.bottle.byMachine)&&<p className="letter-bottle-line">{[letter.bottle.thrownOn&&`${dayLabel(letter.bottle.thrownOn)}投进海里`,letter.bottle.byMachine&&'是一只机写的'].filter(Boolean).join(' · ')}</p>}<div className="letter-paper-footer"><svg viewBox="0 0 120 30" fill="none" stroke="currentColor" strokeWidth=".8" aria-hidden="true"><path d="M4 17c16 4 22-7 36-3M116 17c-16 4-22-7-36-3M60 12c-17-16-30 2-5 3m5-3c17-16 30 2 5 3M57 15l-8 12 8-3 3-9m3 0 8 12-8-3-3-9"/><ellipse cx="60" cy="13" rx="3" ry="2.5"/><path d="M22 17c-6-7-8-6-11-6m87 6c6-7 8-6 11-6"/></svg></div></article></div>}
  <footer className="letter-outside-actions">{writing?<><label>放在<select aria-label="信件藏点" value={spotId||''} onChange={e=>onSpot(e.target.value)}>{spots.map(s=><option key={s.id} value={s.id}>{s.label}</option>)}{!spots.length&&<option value="">先打开一个空藏点</option>}</select></label><button className="letter-primary" disabled={!note.trim()||!spotId} onClick={onSave}>折好，藏在这里 <Icon name="forward"/></button></>:onTake&&<button className="letter-primary" onClick={onTake}><Icon name="bag"/>收进背包</button>}{error&&<p role="alert">{error}</p>}</footer>
 </div>;
}

export function NoteEnvelope({onClick}){return <group onClick={onClick}><mesh castShadow receiveShadow><boxGeometry args={[5.8,.12,3.9]}/><meshStandardMaterial color="#fff2dc" roughness={.98}/></mesh><mesh><bufferGeometry><bufferAttribute attach="attributes-position" args={[new Float32Array([-2.88,.075,-1.92,2.88,.075,-1.92,0,.075,.65]),3]}/></bufferGeometry><meshStandardMaterial color="#eee0ca" roughness={1} side={2}/></mesh><line><bufferGeometry><bufferAttribute attach="attributes-position" args={[new Float32Array([-2.88,.08,-1.92,0,.08,.65,2.88,.08,-1.92]),3]}/></bufferGeometry><lineBasicMaterial color="#cbb99f"/></line><mesh position={[0,.12,.55]}><cylinderGeometry args={[.28,.30,.07,24]}/><meshStandardMaterial color="#b1898f" roughness={.7}/></mesh><mesh position={[2.05,.075,-1.12]}><boxGeometry args={[.73,.02,.85]}/><meshStandardMaterial color="#aab29b" roughness={1}/></mesh><mesh position={[2.05,.089,-1.12]} rotation={[-Math.PI/2,0,0]}><ringGeometry args={[.19,.21,24]}/><meshBasicMaterial color="#f8efdb"/></mesh></group>;}
