import {createPortal} from 'react-dom';
import React,{useEffect,useRef,useState,useMemo} from 'react';
import {BookPortrait} from './sample-book-model.jsx';
import {useDecoration} from './decor-context.jsx';
import {paints,details,tops,wallpapers,floorSamples,presets,roomFor,roomNames,materialOwners,targetsFor,applyDecor,applyPreset,keyFor,decorValue,lacedPieces} from './decor-state.js';
import {LACE_LAID,NOTION_HINT} from './bench-stock.js';
import {surfaceSlots,patterns} from './surface-state.js';
import {patternTexture} from './surfaces.jsx';
import {wallpaperTexture} from './wallpaper.jsx';
import './sample-book.css';
const chapters=[['sets','搭配'],['wall','墙纸'],['furniture','家具'],['fabric','布料'],['floor','地面']];
const partNames={paint:'漆面与框架',top:'桌面与台面',detail:'雕花与描边',trim:'门窗与线条',floor:'地板',layout:'铺法',wall:'墙纸',lace:'蕾丝'};
// A table's top seen from the front, bare or with a piece of lace on it.
function LaceSketch({laid}){
 const scallops=Array.from({length:22},(_,i)=>{const a=i/22*Math.PI*2,b=(i+.5)/22*Math.PI*2,p=t=>[90+Math.cos(t)*52,38+Math.sin(t)*9];const [x1,y1]=p(a),[x2,y2]=p(b),[x3,y3]=[90+Math.cos(b)*58,38+Math.sin(b)*10.6];return `${i?'':`M${x1.toFixed(1)} ${y1.toFixed(1)}`}Q${x3.toFixed(1)} ${y3.toFixed(1)} ${x2.toFixed(1)} ${y2.toFixed(1)}`;}).join('')+'Z';
 return <svg className="book-lace-sketch" viewBox="0 0 180 90" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true"><path d="M14 38Q90 22 166 38Q90 54 14 38Z"/><path d="M14 38V44Q90 60 166 44V38M34 49Q28 68 36 84M146 49Q152 68 144 84"/>{laid&&<><path d={scallops} fill="#fffaf3" stroke="#d38ea0"/><ellipse cx="90" cy="38" rx="36" ry="6" stroke="#d38ea0" strokeDasharray="2 3"/></>}</svg>;
}
// Lace on a table's top (src/lace-cloth.js), laid from the drawer (src/bench-stock.js) and back in it once taken up.
// free: what is in the drawer with what this draft lays; had: whether any was ever made.
function LacePage({laid,had,free,onLay}){
 const room=free>=LACE_LAID,pieces=free===Infinity?'':`抽屉里的蕾丝还够铺 ${Math.floor(free/LACE_LAID)} 件。`;
 return <div className="book-lace">
  <LaceSketch laid={laid}/>
  <p>{laid?'桌面上铺着一块蕾丝。':'桌面上还空着。'}</p>
  {laid?<button onClick={()=>onLay(false)}>收起来，放回抽屉</button>:<button className="book-lace-lay" disabled={!room} onClick={()=>onLay(true)}>铺一块蕾丝</button>}
  <p className="book-note">{!had?`还没有蕾丝。${NOTION_HINT.lace}。`:room||laid?pieces:`抽屉里的蕾丝不够铺一件了。${NOTION_HINT.lace}。`}</p>
  <p className="book-note">一张挂着露水的蛛网，做出的蕾丝铺一件家具，或者镶两件衣服；收起来就放回抽屉。点「就用这个」才算铺好。</p>
 </div>;
}
function FurnitureSketch({owner}){return <svg className="furniture-sketch" viewBox="0 0 180 110" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true">{owner?.includes('Bed')?<><path d="M22 77V27Q46 9 89 20Q131 9 158 27V77M22 48H158L166 86H14Z M19 86V99M161 86V99"/><path d="M35 38Q54 29 76 38V50H35Z M102 38Q123 29 145 38V50H102Z M26 63H154"/></>:owner?.match(/Wardrobe|Shelf|Printer|Cabinet|refrigerator|upper/i)?<><path d="M43 99V24Q62 12 90 18Q120 12 137 24V99M39 24H141M40 91H140M90 26V90M51 33H82V81H51ZM99 33H129V81H99Z"/><circle cx="83" cy="58" r="2"/><circle cx="98" cy="58" r="2"/></>:owner?.match(/Table|Desk|Vanity|island|Craft/)?<><path d="M17 45Q90 35 163 45L159 55H21ZM32 55Q24 74 34 96M147 55Q157 74 147 96M52 55Q90 71 130 55"/>{owner?.includes('Vanity')&&<ellipse cx="90" cy="24" rx="23" ry="20"/>}</>:<><path d="M27 78V47Q15 31 30 29Q42 29 43 49H138Q140 29 152 29Q166 31 153 47V78ZM39 42V26Q55 13 90 23Q126 13 141 26V42M29 80Q25 94 32 97M151 80Q156 94 148 97M46 52V72H135V52M90 52V72"/></>}</svg>;}
export function SampleBook({open,resumeKey=0,launcherHidden=false,launcherTarget,onOpen,onClose,owner,room,catalog,stock,onSelect,onMove,onRoomPreview}){
 const d=useDecoration(),[chapter,setChapter]=useState('sets'),[part,setPart]=useState('paint'),[scope,setScope]=useState('room'),[group,setGroup]=useState('cabinet'),[chosen,setChosen]=useState(''),[groups,setGroups]=useState(['wall','cabinet','frame','fabric']),[scopeRoom,setScopeRoom]=useState(room);
 const launcher=useRef(),closeButton=useRef(),panel=useRef();
 const previous=useRef({open:false,owner:null,resumeKey});
 useEffect(()=>{
  const before=previous.current,resuming=before.resumeKey!==resumeKey;
  previous.current={open,owner,resumeKey};
  if(!open)return;
  const opening=!before.open;
  if(opening){
   if(!resuming){d.begin();setScopeRoom(room);setChosen('');}
   closeButton.current?.focus();
  }
  if(!resuming&&(opening||owner!==before.owner)&&owner&&materialOwners[owner]){
   setChapter('furniture');setScope('one');setGroup(materialOwners[owner].group);setScopeRoom(roomFor(owner));setPart(materialOwners[owner].parts.includes('paint')?'paint':materialOwners[owner].parts[0]);setChosen('');
  }
 },[owner,open,resumeKey]);
 const finish=save=>{save?d.commit():d.cancel();onClose();requestAnimationFrame(()=>launcher.current?.focus());};
 useEffect(()=>{if(!open)return;const key=e=>{if(e.key==='Escape'){e.preventDefault();e.stopPropagation();finish(false);}};window.addEventListener('keydown',key);return()=>window.removeEventListener('keydown',key);},[open,d.draft]);
 const currentOwner=!['wall','floor'].includes(chapter)&&scope==='one'&&owner?owner:'room:'+scopeRoom;
 const roles=chapter==='wall'?['wall','trim']:chapter==='floor'?['floor','layout']:chapter==='fabric'?(owner&&scope==='one'?Object.keys(surfaceSlots[owner]||{}).map(x=>'fabric:'+x):['fabric:fabric','fabric:pillow','fabric:curtain','fabric:quilt','fabric:sheet','fabric:throw','fabric:rug']):scope==='one'&&owner?materialOwners[owner]?.parts||[]:['paint','top','detail'];
 const activePart=roles.includes(part)?part:roles[0];
 const activeGroup=chapter==='furniture'&&scope!=='one'&&activePart==='paint'?group:undefined;
 const targets=targetsFor({owner:currentOwner,room:scopeRoom,scope:chapter==='wall'||chapter==='floor'?(scope==='all'?'all':'one'):scope,part:activePart,group:activeGroup});
 const activeValue=targets.length?decorValue(d.state,targets[0],activePart,null):null;
 const samples=activePart?.startsWith('fabric:')?Object.entries(patterns).map(([id,p])=>[id,p.label,p.color]):activePart==='wall'?wallpapers:activePart==='floor'?floorSamples:activePart==='layout'?[['plank','直铺','#dfceb7'],['herringbone','人字拼','#d3bfa5']]:activePart==='detail'?details:activePart==='top'?tops:paints;
 const imageFor=id=>activePart?.startsWith('fabric:')?patternTexture(id).image.toDataURL():activePart==='wall'?wallpaperTexture(id).image.toDataURL():null;
 const choose=([id,label,color])=>{const value=['wall','floor','layout'].includes(activePart)||activePart?.startsWith('fabric:')?id:color;d.setDraft(s=>applyDecor(s||d.committed,targets,activePart,value));setChosen(label);};
 const lockCount=targets.filter(id=>d.state.locks?.[keyFor(id,activePart)]).length;
 // The lace in the drawer, less what this draft has laid (stock: what the benches have, none of it laid).
 const laceHad=!stock||!!stock.notion?.lace,laceFree=!stock?Infinity:Math.max(0,(stock.notion?.lace?.left||0)-LACE_LAID*lacedPieces(d.state).length);
 const layLace=on=>{d.setDraft(s=>applyDecor(s||d.committed,targets,'lace',on?'lace':null));setChosen(on?'蕾丝':'');};
 const launch=<button onPointerDown={e=>e.stopPropagation()} ref={launcher} className={'sample-book-launcher'+(launcherTarget?' is-toolbar':'')} onClick={onOpen} aria-label="打开家居样本册"><span className="book-miniature"><BookPortrait/></span><span className="book-launch-label">{launcherTarget?'布置':<>家居样本册<small>挑一点喜欢的</small></>}</span></button>;
 return <>
 {!open&&!launcherHidden&&(launcherTarget?createPortal(launch,launcherTarget):launch)}
 {open&&<section onPointerDown={e=>e.stopPropagation()} ref={panel} className="sample-book" role="dialog" aria-modal="false" aria-labelledby="sample-book-title">
 <div className="book-spine"/><nav className="book-tabs" aria-label="样本册章节">{chapters.map(([id,label])=><button key={id} aria-pressed={chapter===id} onClick={()=>{setChapter(id);setChosen('');if(['sets','wall','floor'].includes(id)&&scope==='one')setScope('room');}}>{label}</button>)}</nav>
 <button ref={closeButton} className="book-close" onClick={()=>finish(false)} aria-label="合上样本册并还原未应用的预览">×</button>
 <div className="book-spread"><aside className="book-left-page"><span className="book-eyebrow">MAISON · MATERIAL NOTES</span><h2 id="sample-book-title">给小屋<br/>挑一点喜欢的</h2><FurnitureSketch owner={owner}/><strong>{owner?catalog[owner]?.label||'这一件家具':roomNames[scopeRoom]}</strong><p>{owner?'点下面的部位，给它挑材料。':'也可以点小屋里的家具，翻到它的那一页。'}</p><label className="book-room-label">这一页属于<select aria-label="选择房间" value={scopeRoom} onChange={e=>{setScopeRoom(e.target.value);onRoomPreview?.(e.target.value);if(scope==='one')setScope('room');}}>{Object.entries(roomNames).map(([id,name])=><option key={id} value={id}>{name}</option>)}</select></label>{owner&&onMove&&<button className="book-text-button book-move" onClick={onMove}>挪一挪这件家具 ↗</button>}<span className="book-page-number">01 — YOUR LITTLE PLACE</span></aside>
 <div className="book-right-page" key={chapter}><header><span className="book-eyebrow">{chapter==='sets'?'A LITTLE COLLECTION':'TOUCH & TRY'}</span><h3>{chapters.find(([id])=>id===chapter)?.[1]}样本</h3></header>
 {chapter==='sets'?<><div className="book-preset-grid">{Object.entries(presets).map(([id,p])=><button key={id} className={`book-preset ${chosen===p.label?'is-picked':''}`} aria-pressed={chosen===p.label} onClick={()=>{d.setDraft(s=>applyPreset(s||d.committed,p,{room:scopeRoom,scope,groups}));setChosen(p.label);}}><span className="preset-collage">{p.colors.map((color,i)=><i key={i} style={{background:color}}/>)}</span><span>{p.label}</span></button>)}</div><fieldset className="book-checks"><legend>这次一起换</legend>{[['wall','墙纸'],['trim','门窗线条'],['cabinet','柜体'],['frame','家具框架'],['top','台面'],['fabric','布料'],['detail','描边'],['floor','地板']].map(([id,label])=><label key={id}><input type="checkbox" checked={groups.includes(id)} onChange={e=>{setGroups(g=>e.target.checked?[...g,id]:g.filter(x=>x!==id));d.setDraft(structuredClone(d.committed));setChosen('');}}/>{label}</label>)}</fieldset><p className="book-note">锁住的小样会保留。</p></>:<><div className="book-parts" aria-label="选择材质部位">{roles.map(role=><button key={role} aria-pressed={activePart===role} onClick={()=>{setPart(role);setChosen('');}}>{partNames[role]||surfaceSlots[owner]?.[role.slice(7)]||({fabric:'座椅软包',pillow:'抱枕',curtain:'窗帘',quilt:'被套',sheet:'床单',throw:'搭毯',rug:'地毯',headboard:'床头软包'}[role.slice(7)])}</button>)}</div>{chapter==='furniture'&&scope!=='one'&&activePart==='paint'&&<div className="book-parts"><button aria-pressed={group==='cabinet'} onClick={()=>setGroup('cabinet')}>柜类</button><button aria-pressed={group==='frame'} onClick={()=>setGroup('frame')}>桌椅与床架</button></div>}
 {activePart==='lace'?<LacePage laid={activeValue==='lace'} had={laceHad} free={laceFree} onLay={layLace}/>:<><div className={`book-swatch-grid kind-${activePart?.startsWith('fabric:')?'fabric':activePart}`}>
 {samples.map(sample=>{const [id,label,color]=sample,img=imageFor(id),value=['wall','floor','layout'].includes(activePart)||activePart?.startsWith('fabric:')?id:color;return <button key={id} className={`book-sample ${activeValue===value?'is-picked':''}`} aria-pressed={activeValue===value} disabled={!targets.length} onClick={()=>choose(sample)}><span className="material-piece" style={{backgroundColor:color,...(img?{backgroundImage:`url(${img})`}:{})}}><i className="sample-clip"/></span><span>{label}</span></button>;})}</div>
 {['paint','top','detail','trim'].includes(activePart)&&<label className="book-custom-color">自选颜色 <input type="color" aria-label="自选家具颜色" value={/^#[0-9a-f]{6}$/i.test(activeValue||'')?activeValue:'#f5eee3'} disabled={!targets.length} onChange={e=>choose(['custom','自选颜色',e.target.value])}/></label>}
 {targets.length?<button className="book-lock" aria-pressed={lockCount===targets.length} onClick={()=>d.setDraft(s=>{const next=s||d.committed,locks={...next.locks};for(const id of targets)locks[keyFor(id,activePart)]=lockCount!==targets.length;return {...next,locks};})}>{lockCount===targets.length?'● 已锁住，整套搭配会保留':'○ 锁住这部分搭配'}</button>:<p className="book-note">这件家具没有这个布料部位，选一件软包家具试试。</p>}</>}</>}
 <span className="book-page-number">{String(chapters.findIndex(([id])=>id===chapter)+2).padStart(2,'0')} — {chosen?'正在试配 · '+chosen:'选一块小样，看看它在家里的样子'}</span></div></div>
 <footer className="book-footer"><label>用在<select aria-label="应用范围" value={['sets','wall','floor'].includes(chapter)&&scope==='one'?'room':scope} onChange={e=>{setScope(e.target.value);setChosen('');d.setDraft(structuredClone(d.committed));}}>{owner&&chapter!=='sets'&&!['wall','floor'].includes(chapter)&&<option value="one">这一件家具</option>}<option value="room">{roomNames[scopeRoom]}</option><option value="all">全屋同类</option></select></label><div><button onClick={()=>{d.setDraft(structuredClone(d.committed));setChosen('');}}>还原</button>{d.canUndo&&<button onClick={()=>{d.undo();setChosen('');}}>撤销上次</button>}<button className="book-apply" onClick={()=>finish(true)}>就用这个</button></div></footer>{d.error&&<p role="alert" className="book-note">{d.error}</p>}
 </section>}
 </>;
}
