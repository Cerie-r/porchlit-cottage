import {surfaceSlots} from './surface-state.js';
export const roomFor=id=>id?.startsWith('room:')?id.slice(5):id?.startsWith('bedroom')?'bedroom':id?.startsWith('study')?'study':'downstairs';
export const roomNames={downstairs:'一楼',bedroom:'卧室',study:'书房'};
export const materialOwners={};
for(const id of ['tvUnit','refrigerator','sinkRun','cornerCabinet','prepCabinet','upperLeft','upperRight','bedroomWardrobe','bedroomNightstand','bedroomShelf','studyShelf','studyPrinter',...Array.from({length:7},(_,i)=>'studyBox'+i)])materialOwners[id]={group:'cabinet',parts:['paint','detail']};
for(const id of ['sofa','armchair','bedroomBed','bedroomChair','bedroomBench','diningChair1','diningChair2','diningChair3','stoolLeft','stoolRight','studyReading'])materialOwners[id]={group:'frame',parts:['paint','detail']};
// Tables also take a piece of lace on their top (src/lace-cloth.js): 'lace' while it is laid, else nothing.
for(const id of ['coffeeTable','diningTable','island','studyDesk','studyCraft','studyTailor','bedroomVanity','bedroomSideTable'])materialOwners[id]={group:'frame',parts:['paint','top','detail','lace']};
for(const [id,slots] of Object.entries(surfaceSlots))materialOwners[id]={...(materialOwners[id]||{group:'fabric',parts:[]}),parts:[...(materialOwners[id]?.parts||[]),...Object.keys(slots).map(s=>'fabric:'+s)]};
for(const id of Object.keys(roomNames))materialOwners['room:'+id]={group:'room',parts:['wall','trim','floor','layout']};
export const paints=[['ivory','象牙白','#f5eee3'],['porcelain','瓷器浅蓝','#d8e6ec'],['shell','贝壳粉','#efdad9'],['peach','淡杏桃','#f0dfce'],['oat','燕麦米','#dfd0bb']];
export const details=[['pearl','珍珠白','#f3e9dc'],['champagne','浅香槟','#cbb28c'],['silver','雾银','#c5c8ca']];
export const tops=[['cream','奶油石面','#f5eee3'],['oak','浅橡木','#dfceb7'],['rose','粉白石面','#ede0dd']];
export const wallpapers=[['plain','奶油素墙','#eee5d9'],['blue','浅蓝细纹','#e2ebed'],['rose','蔷薇小花','#f2e7e3'],['linen','亚麻米纹','#e6dfd2']];
export const floorSamples=[['oak','白橡木','#eadfd4'],['blushTile','腮红砖','#ead9da'],['walnut','胡桃木','#ad9285']];
export const presets={cream:{label:'奶油晨光',colors:['#f5eee3','#dfceb7','#f7eee1'],paint:'#f5eee3',top:'#dfceb7',detail:'#cbb28c',wall:'plain',fabric:'rose'},blue:{label:'瓷蓝小调',colors:['#f7f1e7','#d8e6ec','#b9cdd7'],paint:'#f5eee3',top:'#f5eee3',detail:'#c5c8ca',wall:'blue',fabric:'blue'},pink:{label:'贝壳来信',colors:['#f5eee3','#efdad9','#d8b6bd'],paint:'#f5eee3',top:'#ede0dd',detail:'#cbb28c',wall:'rose',fabric:'blush'}};
export const keyFor=(owner,part)=>owner+'|'+part;
// The pieces with lace laid on them in a decoration state.
export const lacedPieces=state=>Object.keys(materialOwners).filter(id=>materialOwners[id].parts.includes('lace')&&state?.values?.[keyFor(id,'lace')]==='lace');
export const decorValue=(state,owner,part,fallback)=>state?.values?.[keyFor(owner,part)]??fallback;
export function targetsFor({owner,room,scope,part,group}){return Object.keys(materialOwners).filter(id=>(scope==='all'||(scope==='one'?id===owner:roomFor(id)===room))&&(!group||materialOwners[id].group===group)&&materialOwners[id].parts.includes(part));}
export function applyDecor(state,targets,part,value,{respectLocks=false}={}){const values={...state.values};for(const id of targets){const key=keyFor(id,part);if(!materialOwners[id]?.parts.includes(part))continue;if(respectLocks&&state.locks?.[key])continue;values[key]=value;}return {...state,values};}
export function applyPreset(state,preset,{room,scope,groups}){let next=state;for(const [id,meta] of Object.entries(materialOwners)){if(scope!=='all'&&roomFor(id)!==room)continue;for(const part of meta.parts){const category=part.startsWith('fabric:')?'fabric':part==='paint'?meta.group:part;if(!groups.includes(category))continue;let value=part.startsWith('fabric:')?preset.fabric:preset[part];if(part==='floor')value='oak';if(part==='trim')value='#fff9ef';if(value!==undefined)next=applyDecor(next,[id],part,value,{respectLocks:true});}}return next;}
