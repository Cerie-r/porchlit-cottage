import '../src/compat.js';
import {cleanWardrobe,readWardrobe,wardrobeKey} from './wardrobe-state.js';
import {makeItemThumbnails,showKeptThumbnails,showDrawings} from './item-thumbnails.js';
import {createAccessories,placeAccessories,colorAccessory,coverOutfit} from './accessories.js';
import {createOutfits,applyOutfitFit} from './outfits.js';
import {oursExpected,loadOurs,oursLoaded,onOursLoaded} from '../src/ours-load.js';
import {extraOutfits,outfitsFor,colorwaysOf,paintOutfit,isHomeOutfit,outfitFitWith} from './outfit-registry.js';
import {dayOf,isOut} from './wardrobe-day.js';
import {EXPRESSIONS,expressionOf} from './expressions.js';
// A card for something worn only at home carries a little house.
const homeOnlyMark=b=>{b.dataset.homeOnly='';b.title='只在家里穿';b.insertAdjacentHTML('beforeend','<span class="sr-only">只在家里穿</span>');};
import {applyHairColor,bindColorInput} from './appearance.js';
import {applyRoundHead} from './round-head.js';
import {hairsFor,hairById,wornHair,makeHair,hideCurl} from './hair-registry.js';
import {extraAccessories,headwearFor,piecesFor,slotOf,cardKey,accessoryById,isHomeAccessory,hidesCurl,accessoryColorwaysOf,paintAccessory,PIECE_SLOTS,showsWith} from './accessory-registry.js';
import {cleanDrawn,readDrawn,offered,drawnWays,wearOnlyDrawn,fromCapsules} from './drawn.js';
import {sewnOutfit,sewnOutfits} from './outfit-registry.js';
import {sewnGarment,disposeSewn} from './sewn.js';
import {registerSewn,readTailor} from '../src/tailor-state.js';
import * as THREE from 'three';
import {createFaceAndHairBase} from './face.js';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {applyHeadRatio} from './proportions.js';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
// A home's own outfits, hairstyles and headwear come first, when this is that home (src/ours-load.js): everything
// below lists and fits what is registered by then. Should they still be on their way, nothing is saved until they
// come (saving would take off whatever of them is being worn), and the page opens again once they have.
const oursLate=oursExpected()&&!(await loadOurs({timeout:8000}));
if(oursLate)onOursLoaded(()=>location.reload());
// What has been sewn at home (src/tailor-state.js) is worn and kept like any other outfit: the house says what there
// is when it opens the wardrobe; opened on its own, the home's own record.
registerSewn(readTailor());
showKeptThumbnails();
// What this home has drawn from the capsule machine: the house says when it opens the wardrobe.
let drawn=readDrawn();
// Ask for everything at once rather than one after another.
const early={fit:fetch('/models/outfits-fit.json').then(r=>r.json())};
early.fit.catch(()=>{});
const canvas=document.querySelector('#view'),renderer=new THREE.WebGLRenderer({canvas,antialias:true});renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.0;
const scene=new THREE.Scene();scene.background=new THREE.Color('#f3f1ee');const camera=new THREE.PerspectiveCamera(36,1,.05,50);const controls=new OrbitControls(camera,canvas);controls.enableDamping=false;controls.enablePan=true;controls.minDistance=1.2;controls.maxDistance=12;controls.maxPolarAngle=Math.PI*.89;
scene.add(new THREE.AmbientLight('#ffffff',1));scene.add(new THREE.HemisphereLight('#fff8ef','#b8a4a0',1.1));const key=new THREE.DirectionalLight('#ffffff',2);key.position.set(-3,5,4);key.castShadow=true;key.shadow.mapSize.set(1024,1024);key.shadow.camera.left=-2;key.shadow.camera.right=2;key.shadow.camera.top=4;key.shadow.camera.bottom=-2;key.shadow.normalBias=.025;scene.add(key);const fill=new THREE.DirectionalLight('#edf1ff',0);fill.position.set(3,3,-2);scene.add(fill);
let model,modelBounds;try{model=(await new GLTFLoader().loadAsync('/models/resident-body.glb')).scene;applyRoundHead(model);modelBounds=applyHeadRatio(model);model.traverse(m=>{if(m.isMesh){m.castShadow=true;m.receiveShadow=true;}});model.getObjectByName('purchased-head').receiveShadow=false;scene.add(model);}catch(error){document.querySelector('#loading').textContent='白模加载失败，请刷新重试';throw error;}const floor=new THREE.Mesh(new THREE.PlaneGeometry(200,200),new THREE.MeshStandardMaterial({color:'#f3f1ee',roughness:1}));floor.rotation.x=-Math.PI/2;floor.receiveShadow=true;scene.add(floor);
const features=createFaceAndHairBase(model);scene.add(features.face,features.base);
model.traverse(o=>{if(o.isMesh)o.material.color.set('#f5dfce');});
const outfits=createOutfits();applyOutfitFit(outfits,outfitFitWith(await early.fit));Object.values(outfits).forEach(o=>scene.add(o));
// Cards for outfits registered from elsewhere (a home's own ones), after the dress; the public ones
// have theirs in index.html.
for(const o of [...extraOutfits].reverse()){if(!isHomeOutfit(o.id))continue;const b=document.createElement('button');b.dataset.outfit=o.id;b.dataset.home='';b.className='item'+(o.picture?' has-thumbnail':'');if(o.picture){const img=new Image();img.alt='';img.width=240;img.height=270;img.src=o.picture;img.onerror=()=>{b.classList.remove('has-thumbnail');img.remove();};b.append(img);}b.insertAdjacentHTML('beforeend',(o.drawing||'')+'<span class="sr-only"></span>');b.querySelector('.sr-only').textContent=o.name;if(o.homeOnly)homeOnlyMark(b);document.querySelector('[data-outfit="dress"]').after(b);}

// Outfits sewn at home: each is its pattern's garment in the colours sewn (sewn.js), its card after its pattern's,
// with a needle in its corner. Called again when the house says what there is.
const sewnCards=new Map();
function showSewn(){
 const fresh=[];
 for(const [id,b] of sewnCards)if(!sewnOutfit(id)){b.remove();sewnCards.delete(id);scene.remove(outfits[id]);disposeSewn(outfits[id]);delete outfits[id];}
 for(const s of sewnOutfits()){
  if(outfits[s.id]||!outfits[s.pattern])continue;
  const g=sewnGarment(outfits[s.pattern],s.colors,s.trims);g.visible=false;outfits[s.id]=g;scene.add(g);
  const b=document.createElement('button');b.dataset.outfit=s.id;b.dataset.sewn='';b.className='item';b.title=s.name;
  const drawing=document.querySelector(`[data-outfit="${s.pattern}"]:not([data-sewn]) svg`);if(drawing)b.append(drawing.cloneNode(true));
  b.insertAdjacentHTML('beforeend','<span class="sewn-mark" aria-hidden="true"></span><span class="sr-only"></span>');b.querySelector('.sr-only').textContent=s.name;if(extraOutfits.find(o=>o.id===s.pattern)?.homeOnly)homeOnlyMark(b);b.onclick=()=>setOutfit(s.id);
  const kin=[...document.querySelectorAll('[data-outfit]')].filter(c=>c.dataset.outfit===s.pattern||sewnOutfit(c.dataset.outfit)?.pattern===s.pattern);
  (kin.at(-1)||document.querySelector('[data-panel="outfit"] .items').lastElementChild).after(b);
  sewnCards.set(s.id,b);fresh.push([b,g]);
 }
 return fresh;
}
showSewn();

// Something that comes out on a day of its own (wardrobe-day.js) has its card from that day on, or
// while the person shown has it on. The day is the home's own (the house sends it when it opens the wardrobe),
// or, opened by itself, this device's.
let today=dayOf(),keptNow=new Set();
const outNow=id=>keptNow.has(id)||isOut(accessoryById(id)||extraOutfits.find(o=>o.id===id),today);
let selectedOutfit='dress',chosenWays={};
function setOutfit(kind){selectedOutfit=kind;Object.entries(outfits).forEach(([k,o])=>o.visible=k===kind);document.querySelectorAll('[data-outfit]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.outfit===kind)));refreshOutfitColors();refreshSlot('neck');refreshSlot('chest');render();}
// An outfit that comes in several colourways shows a swatch for each under the cards.
function refreshOutfitColors(){const ways=drawnWays(drawn,selectedOutfit,colorwaysOf(selectedOutfit)),row=document.querySelector('#outfit-colors'),chosen=ways.find(w=>w.id===chosenWays[selectedOutfit])||ways[0];row.hidden=ways.length<2;row.replaceChildren(...ways.map(w=>{const b=document.createElement('button');b.style.background=`linear-gradient(135deg,${w.colors.main} 0 58%,${w.colors.accent} 58% 100%)`;b.setAttribute('aria-label','配色：'+w.name);b.title=w.name;b.setAttribute('aria-pressed',String(w===chosen));b.onclick=()=>{chosenWays[selectedOutfit]=w.id;refreshOutfitColors();render();};return b;}));if(chosen)paintOutfit(outfits[selectedOutfit],chosen.colors);}
document.querySelectorAll('[data-outfit]').forEach(b=>b.onclick=()=>setOutfit(b.dataset.outfit));
document.querySelector('#blush').onclick=e=>{const visible=!features.blush[0].visible;features.blush.forEach(m=>m.visible=visible);e.currentTarget.setAttribute('aria-pressed',String(visible));render();};
// The expressions (body/expressions.js): one button each, the one worn pressed.
let expression=0;
const expressionButtons=EXPRESSIONS.map((e,i)=>{const b=document.createElement('button');b.type='button';b.className='expression';b.dataset.expression=String(i);b.title=e.name;b.setAttribute('aria-label',e.name);b.innerHTML=e.icon;b.onclick=()=>{wearExpression(i);render();};return b;});
document.querySelector('#expressions').replaceChildren(...expressionButtons);
function wearExpression(i){expression=expressionOf(i);features.setExpression(expression);expressionButtons.forEach((b,k)=>b.setAttribute('aria-pressed',String(k===expression)));}
// Every hairstyle either resident may wear, made once and sized to the head; only the one being worn shows.
const headBox=new THREE.Box3().setFromObject(model.getObjectByName('purchased-head'));
const hairModels={};
for(const id of [...hairsFor('girl'),...hairsFor('boy')]){const hair=makeHair(id,new THREE.MeshStandardMaterial({color:'#806455',roughness:.78}),headBox);hair.visible=false;scene.add(hair);hairModels[id]=hair;}
// Cards for the hairstyles after the base two (out of the capsule machine, or a home's own); one not drawn stays hidden.
for(const id of Object.keys(hairModels))if(!document.querySelector(`[data-hair="${id}"]`)){const b=document.createElement('button');b.dataset.hair=id;b.className='item';b.setAttribute('aria-label',hairById(id).name);document.querySelector('[data-panel="hair"] .items').append(b);}
let selectedHair='classic';
const accessories=createAccessories();Object.values(accessories).forEach(o=>scene.add(o));
// Cards for a home's own pieces (the public ones are in index.html): headwear after the others, the
// rest in the row of their slot under the headwear (glasses, the neck, the chest).
const accessoryCard=(a,key)=>{const b=document.createElement('button');b.dataset[key]=a.id;b.dataset.home='';b.hidden=true;b.className='item'+(a.picture?' has-thumbnail':'');if(a.picture){const img=new Image();img.alt='';img.width=240;img.height=270;img.src=a.picture;img.onerror=()=>{b.classList.remove('has-thumbnail');img.remove();};b.append(img);}b.insertAdjacentHTML('beforeend',(a.drawing||'')+'<span class="sr-only"></span>');b.querySelector('.sr-only').textContent=a.name;if(a.homeOnly)homeOnlyMark(b);return b;};
for(const a of extraAccessories)if(isHomeAccessory(a.id)){const slot=slotOf(a.id);document.querySelector(slot==='head'?'[data-panel="accessory"] > .items':`[data-slot="${slot}"] .items`).append(accessoryCard(a,cardKey(slot)));}
// Headwear goes by person: her bow, his beret, and any registered for them. Only the bow and the
// beret take the headwear colour.
let chosenAccessoryWays={};
// A piece that comes in several colourways shows a swatch for each in a row under its cards.
function swatchRow(row,id){const ways=drawnWays(drawn,id,accessoryColorwaysOf(id)),chosen=ways.find(w=>w.id===chosenAccessoryWays[id])||ways[0];row.hidden=ways.length<2;row.replaceChildren(...ways.map(w=>{const b=document.createElement('button');b.type='button';b.style.background=`linear-gradient(135deg,${w.colors.main} 0 58%,${w.colors.accent} 58% 100%)`;b.setAttribute('aria-label','配色：'+w.name);b.title=w.name;b.setAttribute('aria-pressed',String(w===chosen));b.onclick=()=>{chosenAccessoryWays[id]=w.id;swatchRow(row,id);render();};return b;}));paintAccessory(accessories[id],id,chosen?.id);}
function refreshAccessoryColors(){swatchRow(document.querySelector('#accessory-colors'),accessoryChoice[person]);}
const accessoryChoice={girl:'bow',boy:'none'},accessoryColors={bow:'#f3e6d5',beret:'#51474a'},headwear=()=>person==='girl'?'bow':'beret';
function refreshAccessory(){const choice=accessoryChoice[person];Object.entries(accessories).forEach(([k,o])=>{if(slotOf(k)==='head')o.visible=k===choice;});hideCurl(hairModels[selectedHair],hidesCurl(choice));document.querySelectorAll('[data-accessory]').forEach(b=>{b.hidden=b.dataset.accessory!=='none'&&!(headwearFor(person).includes(b.dataset.accessory)&&offered(drawn,b.dataset.accessory)&&outNow(b.dataset.accessory));b.setAttribute('aria-pressed',String(b.dataset.accessory===choice));});const input=document.querySelector('#accessory-color');input.disabled=!(choice in accessoryColors);input.closest('.color-field').hidden=input.disabled;refreshAccessoryColors();input.value=accessoryColors[choice]||accessoryColors[headwear()];}
document.querySelectorAll('[data-accessory]').forEach(b=>b.onclick=()=>{accessoryChoice[person]=b.dataset.accessory;refreshAccessory();keepHeadwearInView();render();});
// Glasses, and what is worn at the neck, on the chest and on the braids, go by person too: one in each
// slot, worn with any headwear. What is at the neck or on the chest sits on the outfit being worn, so
// it is placed again whenever that changes; what is on the braids shows only on a hairstyle with
// braids. A row shows only when the person has something for it (and, for the braids, has braids).
const SLOT_ROWS=PIECE_SLOTS,slotChoice=Object.fromEntries(SLOT_ROWS.map(slot=>[slot,{girl:'none',boy:'none'}]));
const wornNow=()=>({body:model.getObjectByName('purchased-body'),outfit:outfits[selectedOutfit]});
function refreshSlot(slot){
 const choice=slotChoice[slot][person],mine=piecesFor(person,slot).filter(id=>offered(drawn,id)&&outNow(id)),key=cardKey(slot),fits=mine.some(id=>showsWith(id,hairModels[selectedHair]));
 coverOutfit(outfits[selectedOutfit],SLOT_ROWS.map(s=>slotChoice[s][person]));
 for(const [k,o] of Object.entries(accessories))if(accessoryById(k)&&slotOf(k)===slot){o.visible=k===choice&&showsWith(k,hairModels[selectedHair]);if(o.visible&&slot!=='face')accessoryById(k).place(o,hairModels[selectedHair],wornNow());}
 document.querySelectorAll(`[data-${key}]`).forEach(b=>{b.hidden=b.dataset[key]!=='none'&&!mine.includes(b.dataset[key]);b.setAttribute('aria-pressed',String(b.dataset[key]===choice));});
 document.querySelector(`[data-slot="${slot}"]`).hidden=!fits;
 swatchRow(document.querySelector(`[data-colors-for="${slot}"]`),choice);
}
for(const slot of SLOT_ROWS){const key=cardKey(slot);document.querySelectorAll(`[data-${key}]`).forEach(b=>b.onclick=()=>{slotChoice[slot][person]=b.dataset[key];refreshSlot(slot);render();});}
bindColorInput(document.querySelector('#accessory-color'),value=>{const choice=accessoryChoice[person];if(choice in accessoryColors){accessoryColors[choice]=value;colorAccessory(accessories[choice],value);render();}});
// Wear a hairstyle: only it shows, the headwear sits on it, and the person's own hair cards show.
function setHair(id){
 selectedHair=id;const headVisible=model.getObjectByName('plain-head').visible;
 for(const [key,hair] of Object.entries(hairModels))hair.visible=key===id&&headVisible;
 features.base.visible=false;placeAccessories(accessories,hairModels[id]);refreshAccessory();refreshSlot('braid');keepHeadwearInView();
 document.querySelectorAll('[data-hair]').forEach(b=>{b.hidden=!hairsFor(person).includes(b.dataset.hair)||!offered(drawn,b.dataset.hair);b.setAttribute('aria-pressed',String(b.dataset.hair===id));});
 render();
}
document.querySelectorAll('[data-hair]').forEach(b=>b.onclick=()=>setHair(b.dataset.hair));
const hairInput=document.querySelector('#hair-color'),eyeInput=document.querySelector('#eye-color'),browInput=document.querySelector('#brow-color'),linkButton=document.querySelector('#link-colors');
let linked=true;
function eyesColor(value){features.eyes.forEach(o=>o.material.color.set(value));features.lids.forEach(o=>o.material.color.set(value).multiplyScalar(.68));}
function browsColor(value){features.brows.forEach(o=>o.material.color.set(value));}
function coordinateColors(){const hsl={};new THREE.Color(hairInput.value).getHSL(hsl);const eye=new THREE.Color().setHSL(hsl.h,Math.min(hsl.s,.04),.058);const brow=new THREE.Color().setHSL(hsl.h,Math.min(hsl.s,.22),.16);eyeInput.value='#'+eye.getHexString();browInput.value='#'+brow.getHexString();eyesColor(eyeInput.value);browsColor(browInput.value);}
function unlink(){linked=false;linkButton.setAttribute('aria-pressed','false');}
const refreshHair=bindColorInput(hairInput,value=>{applyHairColor(hairModels,features.base,value);if(linked)coordinateColors();render();});
bindColorInput(eyeInput,value=>{unlink();eyesColor(value);render();});
bindColorInput(browInput,value=>{unlink();browsColor(value);render();});
linkButton.onclick=()=>{linked=!linked;linkButton.setAttribute('aria-pressed',String(linked));if(linked)coordinateColors();render();};
hairInput.value='#806455';refreshHair();
function render(){document.querySelectorAll('.swatches[data-color-target] button').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.color===hairInput.value)));renderer.render(scene,camera);}
// Tall headwear (the top hat, bunny ears) reaches higher than the views leave room for above the
// head; while it is worn they take in that much more.
let room=0;
function headroom(){const o=accessories[accessoryChoice[person]];return o?.visible?Math.max(0,new THREE.Box3().setFromObject(o).max.y-modelBounds.max.y-.55):0;}
function keepHeadwearInView(){if(Math.abs(headroom()-room)>.01)view(current);}
function view(name){const leg=name==='legs';room=headroom();const extra=leg?0:room,target=leg?.62:modelBounds.min.y+(modelBounds.max.y-modelBounds.min.y)*.575+extra/2;controls.target.set(0,target,0);const dist=leg?3.1:Math.max(6.0,(modelBounds.max.y-modelBounds.min.y+.25+extra)/(Math.tan(THREE.MathUtils.degToRad(18))*Math.min(1,camera.aspect))* .58);camera.position.set(name==='side'?dist:0,target+(leg?0:dist*.035),name==='side'?0:name==='back'?-dist:dist);controls.update();document.querySelectorAll('[data-view]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.view===name)));render();}
let current='front';document.querySelectorAll('[data-view]').forEach(b=>b.onclick=()=>{current=b.dataset.view;view(current);});
function resize(){const box=canvas.parentElement.getBoundingClientRect();renderer.setSize(box.width,box.height,false);camera.aspect=box.width/box.height;camera.updateProjectionMatrix();view(current);}
controls.addEventListener('change',render);new ResizeObserver(resize).observe(canvas.parentElement);
// The house says whose wardrobe this is in the address; on its own, the last one played.
const askedKind=new URLSearchParams(location.search).get('kind');
let saved=wearOnlyDrawn(readWardrobe(),drawn),draft=structuredClone(saved),person=askedKind==='boy'||askedKind==='girl'?askedKind:saved.playerKind;
const embedded=new URLSearchParams(location.search).has('embedded');
function capture(){const d=draft[person];d.hairColor=hairInput.value;d.eyeColor=eyeInput.value;d.browColor=browInput.value;d.linked=linked;d.mouth=expression;d.blush=features.blush[0].visible;d.accessory=accessoryChoice[person];d.hair=selectedHair;d.accessoryColor=accessoryColors[person==='girl'?'bow':'beret'];d.outfit=selectedOutfit;d.colorways={...chosenWays};d.accessoryWays={...chosenAccessoryWays};for(const slot of SLOT_ROWS){if(slotChoice[slot][person]==='none')delete d[slot];else d[slot]=slotChoice[slot][person];}}
function labels(){document.querySelectorAll('[data-person]').forEach(b=>{const label=b.dataset.person===draft.playerKind?'我':'小机';let name=b.querySelector('span');if(!name){name=document.createElement('span');b.append(name);}name.textContent=label;b.setAttribute('aria-label','给'+label+'换装');b.setAttribute('aria-pressed',String(b.dataset.person===person));});}
function showPerson(kind){person=kind;const d=draft[kind];keptNow=new Set([d.outfit,d.accessory,...SLOT_ROWS.map(slot=>d[slot])]);for(const slot of SLOT_ROWS)slotChoice[slot][kind]=d[slot]||'none';chosenWays={...(d.colorways||{})};chosenAccessoryWays={...(d.accessoryWays||{})};document.querySelectorAll('[data-outfit]').forEach(b=>b.hidden=!outfitsFor(kind).includes(b.dataset.outfit)||!offered(drawn,b.dataset.outfit)||!outNow(b.dataset.outfit));setHair(wornHair(kind,d));setOutfit(outfitsFor(kind).includes(d.outfit)&&outfits[d.outfit]?d.outfit:outfitsFor(kind)[0]);hairInput.value=d.hairColor;eyeInput.value=d.eyeColor;browInput.value=d.browColor;linked=d.linked;linkButton.setAttribute('aria-pressed',String(linked));applyHairColor(hairModels,features.base,d.hairColor);eyesColor(d.eyeColor);browsColor(d.browColor);wearExpression(d.mouth);features.blush.forEach(m=>m.visible=d.blush);document.querySelector('#blush').setAttribute('aria-pressed',String(d.blush));accessoryChoice[kind]=d.accessory;refreshSlot('face');const accessory=kind==='girl'?'bow':'beret';accessoryColors[accessory]=d.accessoryColor;colorAccessory(accessories[accessory],d.accessoryColor);refreshAccessory();labels();refreshLookPictures();view('front');}

function refreshLookPictures(){
 const hair=hairModels[selectedHair],head=new THREE.Group();
 for(const object of [model,features.face,features.base,hair,accessories[accessoryChoice[person]],accessories[slotChoice.face[person]]])if(object&&object.visible)head.add(object.clone(true));
 const bounds=new THREE.Box3().setFromObject(model.getObjectByName('purchased-head'));
 bounds.union(new THREE.Box3().setFromObject(hair));
 for(const accessory of [accessories[accessoryChoice[person]],accessories[slotChoice.face[person]]])if(accessory?.visible)bounds.union(new THREE.Box3().setFromObject(accessory));
 const portrait=document.querySelector(`[data-person="${person}"]`);
 makeItemThumbnails(renderer,[[portrait,head,{bounds,padding:1.05}],...hairsFor(person).filter(id=>offered(drawn,id)).map(id=>[document.querySelector(`[data-hair="${id}"]`),hairModels[id],{inside:true}]),
 [document.querySelector('[data-tab="outfit"]'),outfits[selectedOutfit]],
 [document.querySelector('[data-tab="hair"]'),hair,{inside:true}],
 [document.querySelector('[data-tab="face"]'),head,{bounds,padding:1.05}],
 [document.querySelector('[data-tab="accessory"]'),accessories[person==='girl'?'bow':'beret']]]);
}
function refreshBothPictures(kind=person){showPerson('girl');showPerson('boy');showPerson(kind);}

document.querySelectorAll('[data-person]').forEach(b=>b.onclick=()=>{capture();showPerson(b.dataset.person);});
function tab(name){document.querySelectorAll('[data-panel]').forEach(p=>p.hidden=p.dataset.panel!==name);document.querySelectorAll('[data-tab]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.tab===name)));}
document.querySelectorAll('[data-tab]').forEach(b=>b.onclick=()=>tab(b.dataset.tab));document.querySelector('#settings').onclick=()=>tab('settings');
document.querySelector('#swap').onclick=()=>{draft.playerKind=draft.playerKind==='girl'?'boy':'girl';labels();};
document.querySelector('#undo').onclick=()=>{draft=structuredClone(saved);refreshBothPictures(person);document.querySelector('#status').textContent='已还原本次试穿';};
const send=(type,data)=>parent.postMessage({type,...data},location.origin);
document.querySelector('#save').onclick=()=>{if(oursLate&&!oursLoaded()){document.querySelector('#status').textContent='你的衣服还在路上，到了再存';return;}capture();const next=cleanWardrobe(wearOnlyDrawn(draft,drawn));try{localStorage.setItem(wardrobeKey,JSON.stringify(next));saved=next;draft=structuredClone(next);document.querySelector('#status').textContent='穿搭已保存';if(embedded)send('porchlit-wardrobe-save',{wardrobe:next});}catch{document.querySelector('#status').textContent='暂时无法保存，请检查浏览器存储后重试';}};
document.querySelector('#leave').onclick=()=>{if(embedded)send('porchlit-wardrobe-close',{});else location.href='/';};
window.addEventListener('keydown',e=>{if(e.key==='Escape')document.querySelector('#leave').click();});
window.addEventListener('message',e=>{if(e.origin!==location.origin||e.source!==parent||e.data?.type!=='porchlit-wardrobe-init')return;if(typeof e.data.day==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(e.data.day))today=e.data.day;if(e.data.drawn)drawn=cleanDrawn(e.data.drawn);if(Array.isArray(e.data.sewn)){registerSewn({made:e.data.sewn});const fresh=showSewn();if(fresh.length)makeItemThumbnails(renderer,fresh);}saved=wearOnlyDrawn(cleanWardrobe(e.data.wardrobe||saved),drawn);draft=structuredClone(saved);refreshBothPictures(e.data.kind==='boy'?'boy':e.data.kind==='girl'?'girl':saved.playerKind);});
for(const color of ['#494448','#806455','#b5967b','#d1b6a2','#302c30','#9a7474']){const b=document.createElement('button');b.style.background=color;b.setAttribute('aria-label','发色 '+color);b.onclick=()=>{hairInput.value=color;hairInput.dispatchEvent(new Event('input'));};b.dataset.color=color;document.querySelector('.swatches').append(b);}
document.querySelector('#loading').remove();resize();refreshBothPictures(person);if(embedded)send('porchlit-wardrobe-ready',{});
// What came out of the capsule machine is photographed in a colourway drawn (what is being worn keeps its own).
{const worn=new Set([selectedOutfit,accessoryChoice[person],...SLOT_ROWS.map(s=>slotChoice[s][person])]);for(const [id,o] of Object.entries(outfits)){const w=drawnWays(drawn,id,colorwaysOf(id))[0];if(fromCapsules(id)&&w&&!worn.has(id))paintOutfit(o,w.colors);}for(const [id,o] of Object.entries(accessories)){const w=drawnWays(drawn,id,accessoryColorwaysOf(id))[0];if(fromCapsules(id)&&w&&!worn.has(id))paintAccessory(o,id,w.id);}}
makeItemThumbnails(renderer,[...Object.entries(outfits).map(([id,object])=>[document.querySelector(`[data-outfit="${id}"]`),object]),...Object.entries(accessories).map(([id,object])=>[document.querySelector(`[data-accessory="${id}"],[data-face="${id}"],[data-neck="${id}"],[data-chest="${id}"],[data-braid="${id}"]`),slotOf(id)==='braid'?accessoryById(id).create():object])]);render();showDrawings();

let pictureTimer;document.querySelector('.contents').addEventListener('input',()=>{clearTimeout(pictureTimer);pictureTimer=setTimeout(()=>{refreshLookPictures();render();},160);});document.querySelector('.contents').addEventListener('click',()=>{clearTimeout(pictureTimer);pictureTimer=setTimeout(()=>{refreshLookPictures();render();},60);});
