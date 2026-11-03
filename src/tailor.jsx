// The tailor's bench (小裁缝): sewing an outfit for one of the two, on the dress form in the study. Choose whom it
// is for, cut it from a pattern (body/sewn.js says which may be), colour its three areas, trim it with lace and pearl
// buttons if there are any (body/trims.js), name it and finish it: it goes into the bedroom wardrobe like any other
// outfit. What is on the form stays there until it's finished, for either of the two to carry on with
// (src/tailor-state.js).
import React,{useEffect,useMemo,useRef,useState} from 'react';
import {useThree} from '@react-three/fiber';
import {QuietCanvas} from './quiet-canvas.jsx';
import {Icon} from './icons.jsx';
import {ApprovedResident} from './approved-resident.jsx';
import {DressForm,FittingStand,TOILE} from './tailor-corner.jsx';
import {garmentPiece} from './tailor-garment.js';
import {onOursLoaded} from './ours-load.js';
import {sewablePatterns,patternName,patternPicture,colorsOf} from '../body/sewn.js';
import {setSewnPreview} from '../body/outfit-registry.js';
import {cleanTailor,workOn,finishDraft,clearForm,MAX_MADE,NAME_MAX,NOTE_MAX} from './tailor-state.js';
import {makerLabel} from './dessert-recipe.js';
import {play} from './sounds.js';
import {SWATCHES,SETS,sameColors,autoName,renamed} from './tailor-names.js';
import {costOf,short as stockShort,left as stockLeft,shown as stockShown,dyeFor,NOTION_HINT} from './bench-stock.js';
import {cleanTrims,trimsKey} from '../body/trims.js';
import './tailor.css';

const AREAS=[['main','主色'],['accent','配色'],['trim','滚边']];
const LACE_AT=[['hem','下摆'],['collar','领口'],['cuffs','袖口']];
// What a piece is trimmed with, in a few words ('' for nothing).
const trimWords=piece=>{const lace=LACE_AT.filter(([k])=>piece.lace?.includes(k)).map(([,label])=>label);return [lace.length?`${lace.join('、')}镶蕾丝`:'',piece.pearls?'珍珠扣':''].filter(Boolean).join(' · ');};
// A little dress, drawn in a line, with where the lace goes (or the pearl buttons) picked out.
function TrimPicture({at}){
 const line='#b39482',lace='#d38ea0',scallops=(x,y,n,w=3)=>`M${x} ${y}`+Array.from({length:n},()=>`q${w/2} 3 ${w} 0`).join('');
 return <svg className="tailor-trim-picture" viewBox="0 0 40 40" aria-hidden="true">
  <path d="M15.5 6.5h9l2.3 9.5 6.2 17.5H6.9l6.3-17.5zM15.5 6.5l-6 4.6-3.1 9.4 3.4 1.2 3.4-6.7M24.5 6.5l6 4.6 3.1 9.4-3.4 1.2-3.4-6.7" fill="#fffaf3" stroke={line} strokeWidth="1.3" strokeLinejoin="round"/>
  {at==='hem'&&<path d={scallops(6.9,33.6,8,3.26)} fill="none" stroke={lace} strokeWidth="1.6" strokeLinecap="round"/>}
  {at==='collar'&&<path d={scallops(14.6,7.2,4,2.7)} fill="none" stroke={lace} strokeWidth="1.6" strokeLinecap="round"/>}
  {at==='cuffs'&&<><path d="M5.6 20.4q1.1 2.9 2.2.8q1.1 2.9 2.2.8" fill="none" stroke={lace} strokeWidth="1.6" strokeLinecap="round"/><path d="M30.2 21.2q1.1 2.9 2.2.8q1.1 2.9 2.2.8" fill="none" stroke={lace} strokeWidth="1.6" strokeLinecap="round" transform="translate(-.4 -.6)"/></>}
  {at==='pearls'&&[11,15.5,20].map(y=><circle key={y} cx="20" cy={y} r="1.7" fill="#fbf6ee" stroke="#c9b6a4" strokeWidth=".8"/>)}
 </svg>;
}
// The one on the form, worn by whoever stands up in it to see (body/outfit-registry.js, setSewnPreview).
const PREVIEW='tailor-preview';
const same=sameColors;
const Bands=({colors})=><span className="tailor-bands" aria-hidden="true">{AREAS.map(([k])=><i key={k} style={{background:colors[k]}}/>)}</span>;
const baseFor=kind=>kind==='boy'?'coat':'dress';
const dayLabel=day=>{const [,m,d]=day.split('-').map(Number);return `${m}月${d}日`;};

// The stage: the stand, and on it the form wearing what is being made, or the one it's for standing up in it.
function Framing({trying}){
 // Standing up, hair and all, one of them is about 1.6 high on the stand; the form, .8.
 const {camera,size,invalidate}=useThree(),h=trying?1.72:.84,y=trying?.8:.43;
 useEffect(()=>{camera.zoom=Math.min(size.height/(h*(trying?1.3:1.5)),size.width/1.6);camera.position.set(0,y+1.1,10);camera.lookAt(0,y,0);camera.updateProjectionMatrix();invalidate();},[camera,size.width,size.height,trying]);
 return null;
}
function Stage({piece,wearer,trying,wardrobe,angle}){
 const key=`${piece.pattern}${piece.colors.main}${piece.colors.accent}${piece.colors.trim}${trimsKey(piece)}`;
 return <QuietCanvas shadows orthographic camera={{position:[0,1.5,10],zoom:300}} dpr={[1,1.5]}>
  <Framing trying={trying}/>
  <ambientLight intensity={1.1}/><hemisphereLight args={['#fff8e9','#c3ac9b',1]}/>
  <directionalLight position={[-3,6,5]} intensity={2.3} castShadow shadow-mapSize={[1024,1024]} shadow-camera-left={-1.5} shadow-camera-right={1.5} shadow-camera-top={2} shadow-camera-bottom={-.5}/>
  <group rotation={[0,angle,0]}><FittingStand/><group position={[0,.064,0]}>{trying?<ApprovedResident key={key} kind={wearer} wardrobe={wardrobe}/>:<DressForm piece={piece}/>}</group></group>
  <mesh rotation={[-Math.PI/2,0,0]} receiveShadow><circleGeometry args={[3,48]}/><shadowMaterial opacity={.12}/></mesh>
 </QuietCanvas>;
}

// The colours a pattern is made in (what its garment says), once it is here.
function useOwnColors(pattern,late){
 const [own,setOwn]=useState(null);
 useEffect(()=>{let alive=true;setOwn(null);if(pattern)garmentPiece(pattern).then(g=>{if(alive)setOwn(colorsOf(g));});return()=>{alive=false;};},[pattern,late]);
 return own;
}

// tailor: homeState.tailor; wardrobe: the two residents' looks (body/wardrobe-state.js, cleanWardrobe); day: the
// home's today. onChange(next) keeps it, next being a function of the tailor as it is then; onUnpick(id) takes one
// apart; onWardrobe(kind) opens that one's wardrobe.
// stock: what the benches have (src/bench-stock.js); onSpend(cost): what a finished piece used up.
export function Tailor({tailor,wardrobe,day,stock,onSpend,onChange,onUnpick,onWardrobe,onClose}){
 const t=cleanTailor(tailor),draft=t.draft,me=wardrobe.playerKind==='boy'?'boy':'girl',other=me==='girl'?'boy':'girl',him=other==='boy'?'他':'她';
 const forWhom=kind=>kind===me?'自己':him;
 const [tab,setTab]=useState(draft?'colors':'who'),[area,setArea]=useState('main'),[angle,setAngle]=useState(-.42),[trying,setTrying]=useState(false);
 const [message,setMessage]=useState(''),[done,setDone]=useState(null),[asking,setAsking]=useState(null),[late,setLate]=useState(0);
 const panel=useRef(),drag=useRef();
 useEffect(()=>onOursLoaded(()=>setLate(n=>n+1)),[]);
 useEffect(()=>{const previous=document.activeElement;panel.current?.focus();return()=>{setSewnPreview(null);previous?.focus?.();};},[]);
 const wearer=draft?.wearer||me,patterns=useMemo(()=>sewablePatterns(wearer,day),[wearer,day,late]);
 // A pattern not here yet (a home's own still on its way) stays on the form as it is, and shows as the toile.
 const here=!!draft&&patterns.includes(draft.pattern),own=useOwnColors(here?draft.pattern:null,late);
 const piece=draft?(here?draft:TOILE):done||t.made.at(-1)||TOILE;
 // The name follows what it is and its colours until it is given one of its own (src/tailor-names.js).
 const work=patch=>{onChange(now=>{const d=cleanTailor(now).draft,named=!d||'name' in patch||renamed(d,own);return workOn(now,named?patch:{...patch,name:autoName({...d,...patch},own)},{day});});setDone(null);setMessage('');};
 // A new piece, or a new pattern for it: in the pattern's own colours, unless other colours have been chosen.
 const cut=async(kind,pattern)=>{
  const [g,before]=await Promise.all([garmentPiece(pattern),draft?.wearer===kind&&here?garmentPiece(draft.pattern):null]);
  const chosen=before&&!same(draft.colors,colorsOf(before));
  onChange(now=>{const d=cleanTailor(now).draft,mine=d?.wearer===kind,colors=chosen&&mine?d.colors:colorsOf(g)||TOILE.colors,next={pattern,wearer:kind,colors};return workOn(now,{...next,name:mine&&renamed(d,before&&colorsOf(before))?d.name:autoName(next,colorsOf(g)),...(mine?{}:{note:'',lace:[],pearls:false})},{day});});
  setDone(null);setMessage('');play('cloth',{volume:.7});
 };
 const choose=kind=>{setTab('pattern');if(draft?.wearer===kind)return;cut(kind,baseFor(kind));};
 // The dyes come out of their jars only once it's made: a pattern's own colours need none.
 const ownHex=new Set(own?Object.values(own).map(c=>c.toLowerCase()):[]);
 // A preset set is on the bench when each of its dyes is, and can be picked while each has some left.
 const setShown=colors=>!stock||Object.values(colors).every(c=>{const d=dyeFor(c,ownHex);return !d||stockShown(stock,'dye',d);});
 const setLeft=colors=>!stock||Object.values(colors).every(c=>{const d=dyeFor(c,ownHex);return !d||stockLeft(stock,'dye',d)>=1;});
 // Lace and pearl buttons: what is left of them, and whether one more may go on (one already on may always come off).
 const notionLeft=name=>stock?stockLeft(stock,'notion',name):Infinity,notionShown=name=>!stock||stockShown(stock,'notion',name);
 const lace=draft?.lace||[],pearls=!!draft?.pearls;
 const notionWords=(name,words)=>{const n=notionLeft(name);return !notionShown(name)?'还没有':n===Infinity?'':n<1?'用完了':words(n);};
 const finish=()=>{
  const cost=costOf({colors:draft.colors,lace:draft.lace,pearls:draft.pearls},{own:ownHex}),lack=stock&&stockShort(stock,cost);
  if(lack){setMessage(lack.words);return;}
  const r=finishDraft(t,{day});
  if(r.error){setMessage(r.error);return;}
  onChange(()=>r.tailor);onSpend?.(cost);setDone(r.made);setTrying(false);setTab('made');play('cloth');setMessage(`「${r.made.name}」做好了，挂进卧室的衣柜里了。`);
 };
 const tryingOn=trying&&here;
 // Whoever stands up in it wears it as one sewn would be (set before the stage draws them).
 const trims=cleanTrims(draft);
 setSewnPreview(tryingOn?{id:PREVIEW,pattern:draft.pattern,wearer:draft.wearer,colors:draft.colors,name:draft.name||'',...(trims?{trims}:{})}:null);
 const look=tryingOn?{...wardrobe,[draft.wearer]:{...wardrobe[draft.wearer],outfit:PREVIEW}}:wardrobe,full=t.made.length>=MAX_MADE;
 const tabs=[['who','给谁做'],['pattern','版型'],['colors','颜色'],['trims','点缀'],['made',`做好的${t.made.length?' · '+t.made.length:''}`]];
 return <div className="atelier-overlay tailor-overlay" onPointerDown={e=>e.stopPropagation()} onWheel={e=>e.stopPropagation()}><section className="atelier tailor" ref={panel} role="dialog" aria-modal="true" aria-label="小裁缝" tabIndex={-1} onKeyDown={e=>{if(e.key==='Escape')onClose();if(e.key==='Tab'){const els=[...panel.current.querySelectorAll('button,input')].filter(n=>!n.disabled);const a=els[0],b=els.at(-1);if(e.shiftKey&&(document.activeElement===a||document.activeElement===panel.current)){e.preventDefault();b?.focus();}else if(!e.shiftKey&&(document.activeElement===b||document.activeElement===panel.current)){e.preventDefault();a?.focus();}}}}>
  <header className="atelier-header"><button className="atelier-back" onClick={onClose} aria-label="回书房"><Icon name="back"/></button><div><span className="atelier-wordmark">porchlit</span><p>小裁缝</p></div><span className="atelier-autosave">{draft?'人台上的会一直留着':'做好的都在衣柜里'}</span></header>
  <div className="atelier-top">
   <div className="atelier-stage tailor-stage" onPointerDown={e=>{if(e.target.tagName!=='CANVAS')return;drag.current={x:e.clientX,a:angle};e.currentTarget.setPointerCapture(e.pointerId);}} onPointerMove={e=>{if(drag.current)setAngle(drag.current.a+(e.clientX-drag.current.x)*.009);}} onPointerUp={()=>drag.current=null} onPointerCancel={()=>drag.current=null}>
    <div className="atelier-wall"/>
    <Stage piece={piece} wearer={draft?.wearer||me} trying={tryingOn} wardrobe={look} angle={angle}/>
    {draft&&!here&&<p className="tailor-tag">这件的版型还在路上，到了就能接着做。</p>}
    {here&&draft.note&&<p className="tailor-tag">小签：{draft.note}{draft.by?.kind==='machine'?` · ${draft.by.name}留的`:''}</p>}
    <div className="atelier-camera"><button onClick={()=>setAngle(a=>a-.45)} aria-label="向左转">↶</button><span>拖动转一转</span><button onClick={()=>setAngle(a=>a+.45)} aria-label="向右转">↷</button>{here&&<button className="tailor-try" aria-pressed={trying} onClick={()=>setTrying(v=>!v)}>{trying?'换回人台':'站上去看看'}</button>}</div>
   </div>
   <aside className={`atelier-card tailor-card${draft?'':' tailor-card-quiet'}`}>
    {draft?<>
     <label>给它起个名字<input value={draft.name} maxLength={NAME_MAX} placeholder={`像「秋天的${patternName(draft.pattern)||'衣服'}」`} onChange={e=>work({name:e.target.value})}/></label>
     <label>小签上写一句话<input value={draft.note||''} maxLength={NOTE_MAX} placeholder="可以空着，像「帮我配个扣子」" onChange={e=>work({note:e.target.value})}/></label>
     <button className="atelier-save" disabled={!here||!draft.name.trim()||full} onClick={finish}>做好了</button>
     <p role="status">{message||(full?`家里做的已经有 ${MAX_MADE} 件了，先拆掉一件再做吧。`:!draft.name.trim()?'起好名字，就能做好啦。':`给${forWhom(draft.wearer)}做的，做好了挂进卧室衣柜。`)}</p>
     {asking==='form'?<span className="tailor-clear"><span>取下来就不留了</span><button className="tailor-unpick" onClick={()=>{onChange(now=>clearForm(now));setTrying(false);setAsking(null);setTab('who');}}>取下来</button><button onClick={()=>setAsking(null)}>留着</button></span>:<span className="tailor-clear"><button onClick={()=>setAsking('form')}>从人台上取下来</button></span>}
    </>:done?<>
     <p role="status" className="tailor-done">{message}</p>
     <button className="atelier-save" onClick={()=>onWardrobe(done.wearer)}>去衣柜换上</button>
     <button className="tailor-again" onClick={()=>{setDone(null);setMessage('');setTab('who');}}>再做一件</button>
    </>:<p className="tailor-hello">{t.made.length?`人台上是上次做好的「${t.made.at(-1).name}」。想再做一件，在下面挑给谁做。`:'人台上是一件白坯样衣。在下面挑给谁做，再挑版型、配颜色。'}</p>}
   </aside>
  </div>
  <div className="atelier-tray tailor-tray">
   <nav>{tabs.map(([id,label])=><button key={id} className={tab===id?'active':''} disabled={['pattern','colors','trims'].includes(id)&&!draft} onClick={()=>setTab(id)}>{label}</button>)}</nav>
   <div className="atelier-tray-content">
    {tab==='who'&&<div className="atelier-options tailor-options">{[me,other].map(kind=><button key={kind} className={draft?.wearer===kind?'active':''} aria-pressed={draft?.wearer===kind} onClick={()=>choose(kind)}><img className="tailor-picture" src={patternPicture(baseFor(kind))} alt="" draggable={false}/><span>给{forWhom(kind)}做</span></button>)}</div>}
    {tab==='pattern'&&draft&&<div className="atelier-options tailor-options">{patterns.map(id=>{const src=patternPicture(id);return <button key={id} className={draft.pattern===id?'active':''} aria-pressed={draft.pattern===id} onClick={()=>{cut(draft.wearer,id);setTab('colors');}}>{src?<img className="tailor-picture" src={src} alt="" draggable={false}/>:<span className="tailor-picture"/>}<span>{patternName(id)}</span></button>;})}</div>}
    {tab==='colors'&&draft&&<div className="tailor-colors">
     <div className="tailor-sets">{own&&<button className={same(draft.colors,own)?'active':''} aria-pressed={same(draft.colors,own)} onClick={()=>work({colors:own})}><Bands colors={own}/><span>原来的</span></button>}{SETS.filter(([,colors])=>setShown(colors)).map(([name,colors])=><button key={name} className={same(draft.colors,colors)?'active':''} aria-pressed={same(draft.colors,colors)} disabled={!setLeft(colors)} onClick={()=>work({colors})}><Bands colors={colors}/><span>{name}</span></button>)}</div>
     <div className="tailor-areas" role="group" aria-label="改哪一块">{AREAS.map(([k,label])=><button key={k} className={area===k?'active':''} aria-pressed={area===k} onClick={()=>setArea(k)}><i style={{background:draft.colors[k]}}/>{label}</button>)}</div>
     <div className="atelier-palette tailor-swatches"><div>{SWATCHES.filter(([,name])=>!stock||stockShown(stock,'dye',name)).map(([c,name])=>{const n=stock?stockLeft(stock,'dye',name):Infinity;return <button key={c} style={{background:c}} aria-label={n===Infinity?name:`${name}，还能染 ${n} 次`} title={n===Infinity?name:`${name} · 还能染 ${n} 次`} aria-pressed={draft.colors[area]===c} disabled={n<1&&draft.colors[area]!==c} data-left={n===Infinity?undefined:n} onClick={()=>work({colors:{...draft.colors,[area]:c}})}/>;})}<label className="tailor-own" title="自己调一个颜色"><input type="color" value={draft.colors[area]} onChange={e=>work({colors:{...draft.colors,[area]:e.target.value}})} aria-label="自己调一个颜色"/></label></div></div>
    </div>}
    {tab==='trims'&&draft&&<div className="tailor-trims">
     <section aria-label="蕾丝"><header><strong>蕾丝</strong><small>{notionWords('lace',n=>`还能镶 ${n} 件`)}</small></header>
      <div className="tailor-trim-options" role="group" aria-label="镶在哪里">{LACE_AT.map(([k,label])=>{const on=lace.includes(k);return <button key={k} className={on?'active':''} aria-pressed={on} disabled={!on&&!lace.length&&notionLeft('lace')<1} onClick={()=>work({lace:on?lace.filter(p=>p!==k):[...lace,k]})}><TrimPicture at={k}/><span>{label}</span></button>;})}</div>
      {!notionShown('lace')&&<p className="tailor-trim-hint">{NOTION_HINT.lace}。</p>}
     </section>
     <section aria-label="珍珠扣"><header><strong>珍珠扣</strong><small>{notionWords('pearl',n=>`还有 ${n} 副`)}</small></header>
      <div className="tailor-trim-options"><button className={pearls?'active':''} aria-pressed={pearls} disabled={!pearls&&notionLeft('pearl')<1} onClick={()=>work({pearls:!pearls})}><TrimPicture at="pearls"/><span>{pearls?'珍珠扣':'换成珍珠扣'}</span></button></div>
      {!notionShown('pearl')&&<p className="tailor-trim-hint">{NOTION_HINT.pearl}。</p>}
     </section>
     <p className="tailor-trim-note">一张挂着露水的蛛网，做出的蕾丝够镶两件，一件镶几处都只算一件；一颗珍珠配一副扣子。做好的时候才用掉。</p>
    </div>}
    {tab==='made'&&<div className="tailor-made">{t.made.length?<ul>{[...t.made].reverse().map(m=><li key={m.id}><Bands colors={m.colors}/><div><strong>{m.name}</strong><small>给{forWhom(m.wearer)} · {patternName(m.pattern)||'家里的版型'} · {dayLabel(m.on)} · {makerLabel(m.by)}</small>{trimWords(m)&&<small className="tailor-note">{trimWords(m)}</small>}{m.note&&<small className="tailor-note">「{m.note}」</small>}</div>{asking===m.id?<span className="tailor-ask"><button className="tailor-unpick" onClick={()=>{onUnpick(m.id);setAsking(null);if(done?.id===m.id)setDone(null);}}>拆掉</button><button onClick={()=>setAsking(null)}>留着</button></span>:<span className="tailor-ask"><button disabled={!!draft} title={draft?'人台上还有一件':undefined} onClick={()=>{onChange(now=>workOn(now,{pattern:m.pattern,wearer:m.wearer,colors:m.colors,name:m.name,note:m.note||'',lace:m.lace||[],pearls:!!m.pearls},{day}));setDone(null);setTab('colors');}}>照着再做</button><button onClick={()=>setAsking(m.id)}>拆掉</button></span>}</li>)}</ul>:<p>还没有做好的。做好的会挂进卧室衣柜，在点头像那里换上。</p>}<p className="tailor-count">家里做的 {t.made.length} / {MAX_MADE} 件 · 只待在自家衣柜里</p></div>}
   </div>
  </div>
 </section></div>;
}
