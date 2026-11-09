import {BuiltinToyModel} from './builtin-toys.jsx';
import {StorageSlotRange} from './search-interaction.jsx';
import {QuietCanvas} from './quiet-canvas.jsx';
import {NoteEnvelope} from './letter-surface.jsx';
import {spotsFor} from './hiding-spots.js';
import {Icon} from './icons.jsx';
import {PhotoModel} from './art-model.jsx';
import {leading} from './words.js';
import {tableTaken,whoHid} from './machine-acts.js';
import {CalledContext} from './machine-names.js';
import React,{useState,useEffect,useRef,useContext,useLayoutEffect} from 'react';
import {Canvas,useThree} from '@react-three/fiber';
import {Box3,Matrix4,Vector3} from 'three';
import {parts,colors,bounds,validPlacement,validBuild,emptyDraft,cellAt,bearDraft} from './workshop-state.js';
import './workshop.css';
import {AnimalModel} from './animal-model.jsx';
export {Atelier as Workshop} from './atelier.jsx';
import {Florist,BouquetModel,freshBouquet} from './florist.jsx';
import {BuildObject} from './brick-model.jsx';
import {DessertModel} from './dessert-model.jsx';
import {ServedDish} from './cooking-pot-food.jsx';

function Piece({brick,selected=false,onClick}){
 const {w,h,d}=bounds(brick),c=brick.color;
 const material=<meshStandardMaterial color={c} roughness={.35} metalness={.02}/>;
 return <group position={[brick.x+w/2-4,brick.y,brick.z+d/2-4]} onClick={onClick}>
 <group rotation={[0,brick.turn*Math.PI/2,0]}>
 {brick.type==='round'?<mesh position={[0,.5,0]} castShadow><cylinderGeometry args={[.46,.46,.96,24]}/>{material}</mesh>:
 brick.type==='dome'?<group><mesh position={[0,.25,0]}><boxGeometry args={[.96,.5,.96]}/>{material}</mesh><mesh position={[0,.5,0]}><sphereGeometry args={[.48,24,12,0,Math.PI*2,0,Math.PI/2]}/>{material}</mesh></group>:
 brick.type==='leaf'?<mesh position={[0,.24,0]} scale={[.44,.2,.94]} rotation={[0,0,.12]}><sphereGeometry args={[1,16,10]}/>{material}</mesh>:
 brick.type==='flower'?<group>{Array.from({length:5},(_,i)=><mesh key={i} position={[Math.cos(i*1.256)*.26,.22,Math.sin(i*1.256)*.26]} scale={[.23,.16,.23]}><sphereGeometry args={[1,12,8]}/>{material}</mesh>)}<mesh position={[0,.28,0]}><cylinderGeometry args={[.12,.12,.16,16]}/><meshStandardMaterial color="#f0d28c"/></mesh></group>:
 <mesh position={[0,h/2,0]} castShadow receiveShadow><boxGeometry args={[parts[brick.type].size[0]-.035,h-.035,parts[brick.type].size[2]-.035]}/>{material}</mesh>}
 {!['leaf','flower','dome'].includes(brick.type)&&Array.from({length:parts[brick.type].size[0]},(_,x)=>Array.from({length:parts[brick.type].size[2]},(_,z)=><mesh key={`${x}-${z}`} position={[x-(parts[brick.type].size[0]-1)/2,h+.045,z-(parts[brick.type].size[2]-1)/2]}><cylinderGeometry args={[.22,.22,.1,16]}/>{material}</mesh>))}
 </group>
 {selected&&<mesh position={[0,h/2,0]}><boxGeometry args={[w+.06,h+.12,d+.06]}/><meshBasicMaterial color="#a96b8b" wireframe/></mesh>}
 </group>;
}
// Sized to fill a preview the way builds are: the biggest of its width, depth
// and height becomes `size`, centred on the origin. Measured from what is
// drawn, in its own frame, so a turned parent doesn't change the measure.
function Fill({size,children}){
 const outer=useRef(),inner=useRef(),invalidate=useThree(s=>s.invalidate);
 useLayoutEffect(()=>{
  const o=outer.current,i=inner.current;if(!o||!i)return;
  i.position.set(0,0,0);i.updateWorldMatrix(true,true);
  const inv=new Matrix4().copy(i.matrixWorld).invert(),m=new Matrix4(),box=new Box3(),b=new Box3();
  i.traverse(n=>{if(!n.isMesh||!n.geometry)return;if(!n.geometry.boundingBox)n.geometry.computeBoundingBox();box.union(b.copy(n.geometry.boundingBox).applyMatrix4(m.multiplyMatrices(inv,n.matrixWorld)));});
  if(box.isEmpty())return;
  const dim=box.getSize(new Vector3()),mid=box.getCenter(new Vector3());
  i.position.set(-mid.x,-mid.y,-mid.z);o.scale.setScalar(size/Math.max(dim.x,dim.y,dim.z,1e-6));invalidate();
 });
 return <group ref={outer}><group ref={inner}>{children}</group></group>;
}
export function CreationModel({item,onClick,fit,fill}){if(item.kind==='keepsake')return <BuiltinToyModel item={item} onClick={onClick}/>;if(item.kind==='note')return <NoteEnvelope onClick={onClick}/>;if(item.kind==='photo')return <PhotoModel item={item} onClick={onClick}/>;if(item.kind==='animal')return <group scale={1.4}><AnimalModel item={item} onClick={onClick}/></group>;if(item.kind==='bouquet')return <group onClick={onClick}>{fill?<Fill size={fill}><BouquetModel item={item}/></Fill>:<BouquetModel item={item}/>}</group>;if(item.kind==='build')return <BuildObject item={item} onClick={onClick} fit={fit} fill={fill}/>;if(item.kind==='dessert')return <DessertModel item={item} onClick={onClick} fit={fit} fill={fill}/>;if(item.kind==='dish')return <ServedDish item={item} onClick={onClick} fit={fit} fill={fill}/>;const boxes=(item.bricks||[]).map(bounds);const cx=boxes.length?(Math.min(...boxes.map(b=>b.x))+Math.max(...boxes.map(b=>b.x+b.w)))/2:4;const cz=boxes.length?(Math.min(...boxes.map(b=>b.z))+Math.max(...boxes.map(b=>b.z+b.d)))/2:4;return <group position={[4-cx,0,4-cz]} onClick={onClick}>{(item.bricks||[]).map(b=><Piece key={b.id} brick={b}/>)}</group>;}
export function ContainerObjects({items,onSelect,layout}){const start=useContext(StorageSlotRange);if(start!==null)items=items.filter(i=>i.slot>=start&&i.slot<start+4).map(i=>({...i,slot:i.slot-start}));return <group userData={{tintExclude:true}}>{items.map(i=><group key={i.id} position={layout==='curtain'?[(i.slot%2?1:-1)*.66,.04,i.slot>1?.06:-.02]:layout==='study-shelf'?(i.slot>=4?[(i.slot===4?-1:1)*.25,1.25,-.34]:[.22,.80+i.slot*.53,-.12]):layout==='bedroom-bed'?[(i.slot%2?1:-1)*.55,.77,i.slot>1?.9:-1.02]:[(i.slot%2?1:-1)*.22,.04,i.slot>1?.17:-.02]} scale={.03}><CreationModel item={i} fit={8} onClick={e=>{e.stopPropagation();onSelect(i.id);}}/></group>)}</group>;}
// The coffee table's four places in the room (左后, 右后, 左前, 右前), on its top (.064 up) and clear of the tray and the
// books as they come, so what is put there shows from the front instead of behind them: the two back ones at the ends.
const TABLE_SLOTS=[[-1.02,-.1],[.9,.22],[-.5,.4],[.45,.36]];
export function TableObjects({items,onSelect}){return <group>{items.map(i=>{const [x,z]=TABLE_SLOTS[i.slot]||TABLE_SLOTS[0];return <group key={i.id} position={[x,.064,z]} scale={.03}><CreationModel item={i} fit={8} onClick={e=>{e.stopPropagation();onSelect(i.id);}}/></group>;})}</group>;}
export function Modal({title,onClose,children,className=''}){
 const ref=useRef();useEffect(()=>{const prev=document.activeElement;ref.current?.focus();return ()=>prev?.focus?.();},[]);
 return <div className={`craft-overlay ${className}`} onPointerDown={e=>e.stopPropagation()} onWheel={e=>e.stopPropagation()}><section className="craft-panel" role="dialog" aria-modal="true" aria-label={title} tabIndex={-1} ref={ref} onKeyDown={e=>{if(e.key==='Escape')onClose();if(e.key==='Tab'){const ns=[...ref.current.querySelectorAll('button,input,select')].filter(n=>!n.disabled);const a=ns[0],b=ns.at(-1);if(e.shiftKey&&(document.activeElement===a||document.activeElement===ref.current)){e.preventDefault();b?.focus();}else if(!e.shiftKey&&(document.activeElement===b||document.activeElement===ref.current)){e.preventDefault();a?.focus();}}}}><header><div><small>MADE, WITH A LITTLE LOVE</small><h2>{title}</h2></div><button onClick={onClose}>返回小屋 <Icon name="leave"/></button></header>{children}</section></div>;
}
function LegacyWorkshop({draft,onDraft,onFinish,onClose}){
 const [type,setType]=useState('brick'),[color,setColor]=useState(colors[1]),[turn,setTurn]=useState(0),[level,setLevel]=useState(0),[selected,setSelected]=useState(null),[angle,setAngle]=useState(0),[message,setMessage]=useState('选零件，点桌面放置；点已有积木，自动叠在上面。');
 const [activity,setActivity]=useState(draft.kind==='bouquet'?'flowers':'bricks');const parked=useRef({});
 const switchActivity=next=>{parked.current[activity]=draft;onDraft(parked.current[next]||(next==='flowers'?freshBouquet():emptyDraft()));setActivity(next);setUndo([]);setSelected(null);};
 const [mode,setMode]=useState('build');const sceneRef=useRef();const [slice,setSlice]=useState(false);
 const [undo,setUndo]=useState([]);const bricks=draft.bricks||[];
 const commit=next=>{setUndo(u=>[...u.slice(-29),draft]);onDraft(next);};
 const patch=(delta)=>{const b=bricks.find(b=>b.id===selected);if(!b)return;const next={...b,...delta};const changed=bricks.map(p=>p.id===b.id?next:p);if(!validBuild(changed)){setMessage('这里放不下，或会让上面的零件悬空。');return;}commit({...draft,bricks:changed});};
 const addAt=(x,z,y)=>{
 if(bricks.length>=120){setMessage('这件小礼物最多 120 个零件。');return;}
 const b={id:crypto.randomUUID(),type,color,turn,x,z,y};
 if(!validPlacement(bricks,b)){setMessage('这里已占用、超出边界，或下方没有支撑。可以换单格薄片，或切换高度补上底层。');return;}
 commit({...draft,bricks:[...bricks,b]});setSelected(null);setMessage(`已放在第 ${x+1} 列、第 ${z+1} 行，高度 ${y}。`);
 };
 const stack=(e,base)=>{e.stopPropagation();if(mode==='edit'){setSelected(base.id);return;}
 const p=sceneRef.current.worldToLocal(e.point.clone()),a=bounds(base);
 const x=Math.max(a.x,Math.min(a.x+a.w-1,Math.floor(p.x+4)));
 const z=Math.max(a.z,Math.min(a.z+a.d-1,Math.floor(p.z+4)));
 addAt(x,z,base.y+a.h);
 };
 const place=e=>{e.stopPropagation();if(mode==='edit'){setSelected(null);return;}const local=e.object.worldToLocal(e.point.clone());addAt(Math.floor(local.x+4),Math.floor(-local.y+4),level);};
 const gridClick=(x,z)=>{const existing=cellAt(bricks,x,z,level);if(existing){setSelected(existing.id);setMode('edit');setMessage('已选中这一格的零件，可以改色、移动或拆下。');}else{setMode('build');addAt(x,z,level);}};
 return <Modal title="二楼 · 拼搭台" onClose={onClose} className="workshop"><nav className="craft-tabs"><button className={activity==='bricks'?'chosen':''} onClick={()=>switchActivity('bricks')}>微积木拼搭</button><button className={activity==='flowers'?'chosen':''} onClick={()=>switchActivity('flowers')}>花材 · 自由插花</button></nav>{activity==='flowers'?<Florist draft={draft} onDraft={onDraft} onFinish={onFinish}/>:<div className="craft-layout"><div className="craft-desk"><svg viewBox="0 0 800 600" preserveAspectRatio="none" aria-hidden="true"><defs><pattern id="desk-grid" width="32" height="32" patternUnits="userSpaceOnUse"><path d="M32 0H0V32" fill="none" stroke="#dfcfd5" strokeWidth=".6"/></pattern></defs><rect x="8" y="8" width="784" height="584" rx="30" fill="#faf5ef" stroke="#dfc9cf"/><rect x="30" y="30" width="740" height="540" rx="20" fill="url(#desk-grid)"/></svg><QuietCanvas orthographic camera={{position:[10,13,12],zoom:window.innerWidth<600?27:43}} dpr={[1,1.5]}><ambientLight intensity={1.5}/><directionalLight position={[4,9,6]} intensity={2}/><group ref={sceneRef} rotation={[0,angle,0]}><gridHelper args={[8,8,'#b597a5','#e0ced5']}/>{bricks.filter(b=>!slice||b.y<=level).map(b=><Piece key={b.id} brick={b} selected={selected===b.id} onClick={e=>stack(e,b)}/>)}<mesh position={[0,level+.004,0]} rotation={[-Math.PI/2,0,0]} onClick={place}><planeGeometry args={[8,8]}/><meshBasicMaterial transparent opacity={.06} color="#d2a6ba" depthWrite={false}/></mesh></group></QuietCanvas><div className="craft-view"><button onClick={()=>setAngle(a=>a-Math.PI/4)}>↶ 视角</button><button onClick={()=>setAngle(a=>a+Math.PI/4)}>视角 ↷</button></div></div><aside className="craft-controls"><label>礼物名字<input value={draft.name} maxLength={30} onChange={e=>onDraft({...draft,name:e.target.value})}/></label><div className="craft-row"><button className={mode==='build'?'chosen':''} onClick={()=>{setMode('build');setSelected(null);}}>拼接</button><button className={mode==='edit'?'chosen':''} onClick={()=>setMode('edit')}>选中修改</button></div><div className="craft-parts">{Object.entries(parts).map(([id,p])=><button key={id} className={type===id?'chosen':''} onClick={()=>{setType(id);setSelected(null);setMode('build');}}>{p.label}</button>)}</div><div className="craft-colors">{colors.map(c=><button key={c} aria-label={`颜色 ${c}`} aria-pressed={c===color} style={{background:c}} onClick={()=>{setColor(c);if(selected)patch({color:c});}}/>)}</div><label>分层高度<select value={level} onChange={e=>{setLevel(Number(e.target.value));setSelected(null);}}>{Array.from({length:16},(_,i)=><option key={i} value={i*.5}>{i===0?'桌面':`${i*.5} 格`}</option>)}</select></label><section className="layer-editor" aria-label="分层拼搭板"><div className="craft-row"><button onClick={()=>setLevel(y=>Math.max(0,y-.5))} disabled={level===0}>下一层</button><button onClick={()=>setLevel(y=>Math.min(7.5,y+.5))} disabled={level===7.5}>上一层</button></div><p>俯视 · 上为后方，下为正面<br/>点空格放砖，点实心格选中；淡色表示下层支撑。</p><div className="layer-grid">{Array.from({length:64},(_,i)=>{const x=i%8,z=Math.floor(i/8),b=cellAt(bricks,x,z,level),below=level>0?cellAt(bricks,x,z,level-.001):null;return <button key={i} className={b?.id===selected?'active':''} style={{background:b?b.color:below?`${below.color}66`:undefined}} aria-label={`第${z+1}行第${x+1}列，${b?'已有'+parts[b.type].label:below?'空位，下方有支撑':'空位'}`} onClick={()=>gridClick(x,z)}>{b?'●':below?'·':''}</button>;})}</div><button aria-pressed={slice} onClick={()=>setSlice(v=>!v)}>{slice?'显示完整作品':'隐藏更高层 · 看清内部'}</button></section><details className="craft-examples"><summary>从小熊底稿开始</summary><p>载入会替换当前草稿，可以点「撤销」恢复。每一块都能继续修改。</p><button onClick={()=>{commit(bearDraft());setLevel(0);setSelected(null);setSlice(false);setMessage('小熊底稿已载入。切到不同高度，可以改颜色、补砖和拆改。');}}>载入积木小熊</button></details><button onClick={()=>{if(selected){const b=bricks.find(p=>p.id===selected);patch({turn:(b.turn+1)%4});}else setTurn(t=>(t+1)%4);}}>旋转零件 ↻ {selected?'':`${turn*90}°`}</button><div className="craft-arrows">{[['←',-1,0],['→',1,0],['↑',0,-1],['↓',0,1]].map(([label,x,z])=><button key={label} disabled={!selected} onClick={()=>{const b=bricks.find(p=>p.id===selected);patch({x:b.x+x,z:b.z+z});}}>{label}</button>)}</div><div className="craft-row"><button disabled={!selected} onClick={()=>{const next=bricks.filter(p=>p.id!==selected);if(next.length&&!validBuild(next)){setMessage('先拆掉它上面支撑着的零件。');return;}commit({...draft,bricks:next});setSelected(null);}}>拆下</button><button disabled={!undo.length} onClick={()=>{onDraft(undo.at(-1));setUndo(u=>u.slice(0,-1));setSelected(null);}}>撤销</button></div><p role="status">{message}</p><small>{bricks.length} / 120 片 · 草稿自动保存</small><button className="craft-primary" disabled={!draft.name.trim()||!validBuild(bricks)} onClick={()=>{onFinish();setSelected(null);setUndo([]);setMessage('已收进侧栏背包，可以继续拼下一件。');}}>完成 · 收进背包</button></aside></div>}</Modal>;
}
export function SlotArrows({id,onShift}){return <div className="craft-arrows">{[["←",-1,0],["→",1,0],["↑",0,-1],["↓",0,1]].map(([label,x,z])=><button key={label} aria-label={`移动物件 ${label}`} onClick={()=>onShift(id,x,z)}>{label}</button>)}</div>;}
// What she hid here for the AI to find (src/machine-acts.js, 翻一格): waiting for it, or found, and when.
const stashDay=d=>/^\d{4}-\d{2}-\d{2}$/.test(d||'')?`${Number(d.slice(5,7))}月${Number(d.slice(8))}日`:'';
function StashStatus({items,him,call}){const mine=items.filter(i=>i.stash&&typeof i.stash==='object');if(!mine.length)return null;return <div className="stash-status">{mine.map(i=><p key={i.id}>{i.kind==='note'?'一封信':`「${i.name||'一样东西'}」`}{i.stash.found?` · ${leading(call(i.stash.by)||him)}在${stashDay(i.stash.found)}翻到了`:` · 藏给${him}找的，还没找到`}</p>)}</div>;}
export function StorageInventory({items,storageId,onMove,selected,onSelect,mode='find',canPlace=true,visibleSlot=()=>true,him='他'}){
 const call=useContext(CalledContext);
 // On the coffee table's top, what was left on it ('table': a letter, something made for her) is here too.
 const [target,setTarget]=useState(null);const inside=items.filter(i=>i.location===storageId||(storageId==='hide:coffeeTable'&&i.location==='table')),bag=items.filter(i=>i.location==='bag');
 // The coffee table's top is shared with letters left on it (src/machine-acts.js).
 const destinations=spotsFor(storageId).filter(s=>visibleSlot(s.slot)&&!inside.some(i=>i.slot===s.slot)&&!(storageId==='hide:coffeeTable'&&tableTaken(items,s.slot)));const destination=destinations.find(s=>s.id===target)||destinations[0];const found=inside.find(i=>i.id===selected);
 if(mode==='find'){
  if(found&&found.kind!=='note')return <div className="storage-found-card"><h3>{found.name}</h3><div><button onClick={()=>{onMove(found.id,'bag');onSelect(null);}}>收进背包</button><button onClick={()=>onSelect(null)}>放回原处</button></div></div>;
  // What an AI living here hid, showing here where it was hidden: found, and said whose it is (src/machine-acts.js).
  const theirs=inside.filter(i=>i.kind!=='note'&&whoHid(i));
  // Letters showing here open from a button too, not only by a tap on the little envelope.
  // (A clue card still unread goes into the backpack by itself.)
  const letters=inside.filter(i=>i.kind==='note'&&!(i.puzzleId&&!i.opened));
  const hidBy=letters.length===1&&whoHid(letters[0])&&call(whoHid(letters[0]));
  const status=<StashStatus items={inside} him={him} call={call}/>;
  if(!theirs.length&&!letters.length)return status;
  return <>{status}<div className="storage-found-card">{theirs.map(t=><React.Fragment key={t.id}><h3>找到了{leading(call(whoHid(t)))}藏的「{t.name}」</h3><div><button onClick={()=>onMove(t.id,'bag')}>收进背包</button></div></React.Fragment>)}{letters.length>0&&<><h3>{letters.length>1?`这里有 ${letters.length} 封信`:hidBy?`找到了${leading(hidBy)}藏的一封信`:`这里有${letters[0].puzzleId?'一张线索卡':'一封信'}`}</h3><div>{letters.map(l=><button key={l.id} onClick={()=>onSelect(l.id)}>拆开看看{letters.length>1?` · ${l.name}`:''}</button>)}</div></>}</div></>;
 }
 return <div className="storage-inventory stash-only"><h3>从背包挑一件</h3><label>放在<select aria-label="放置藏点" value={destination?.id||''} onChange={e=>setTarget(e.target.value)}>{!destinations.length&&<option value="">先打开一个空位置</option>}{destinations.map(s=><option key={s.id} value={s.id}>{s.label}</option>)}</select></label>{!bag.length&&<p>背包里暂时没有小物件。</p>}{bag.map(i=><button disabled={!canPlace||!destination} key={i.id} onClick={()=>onMove(i.id,storageId,destination.slot)}>{i.name}<Icon name="forward"/></button>)}</div>;
}

