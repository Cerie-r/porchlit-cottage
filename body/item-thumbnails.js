import * as T from 'three';

// The photographs are kept in this browser between visits, so the next time
// the wardrobe opens its cards show the real garments straight away instead
// of the old drawings. A new build of the wardrobe starts the keeping afresh.
const keptKey='porchlit-wardrobe-pictures-v1';
const version=import.meta.url;
const cardKey=button=>Object.entries(button.dataset).map(([k,v])=>k+'='+v).sort().join('&');
function readKept(){try{const kept=JSON.parse(localStorage.getItem(keptKey));return kept?.version===version&&kept.cards&&typeof kept.cards==='object'?kept.cards:{};}catch{return {};}}
function writeKept(cards){try{const text=JSON.stringify({version,cards});if(text.length<400000)localStorage.setItem(keptKey,text);}catch{}}
function place(button,src){const image=new Image();image.alt='';image.width=240;image.height=270;image.src=src;button.querySelector(':scope > img')?.remove();button.prepend(image);button.classList.add('has-thumbnail');}

// Before anything is drawn: last visit's photographs on the cards that had one.
export function showKeptThumbnails(){
 const kept=readKept();
 document.querySelectorAll('button').forEach(button=>{const src=kept[cardKey(button)];if(src&&Object.keys(button.dataset).length)place(button,src);});
}
// The drawings stay hidden while photographs are coming; if they can't be
// made, the drawings are what's shown.
export const showDrawings=()=>document.body.classList.remove('pictures-pending');

// Reuse the existing WebGL context to photograph the actual garments once.
// The SVG underneath remains a fallback if a device cannot export its canvas.
export function makeItemThumbnails(renderer, entries) {
 const size=renderer.getSize(new T.Vector2()),ratio=renderer.getPixelRatio();
 const color=renderer.getClearColor(new T.Color()).clone(),alpha=renderer.getClearAlpha();
 const fresh={};
 try {
  renderer.setPixelRatio(1);renderer.setSize(240,270,false);renderer.setClearColor(0x000000,0);
  for(const [button,object,options={}] of entries){
   if(!button||!object)continue;
   const scene=new T.Scene(),copy=object.clone(true);copy.visible=true;scene.add(copy);
   // options.inside: hair photographed without a head shows its inside through the face opening;
   // draw both sides of its surfaces there, so the inside reads as hair and not as a hole.
   const insides=[];if(options.inside)copy.traverse(o=>{if(o.isMesh){o.material=o.material.clone();o.material.side=T.DoubleSide;insides.push(o.material);}});
   scene.add(new T.AmbientLight('#ffffff',1.5));
   const light=new T.DirectionalLight('#fff7ed',2.2);light.position.set(-3,5,6);scene.add(light);
   const bounds=options.bounds||new T.Box3().setFromObject(copy),center=bounds.getCenter(new T.Vector3()),extent=bounds.getSize(new T.Vector3());
   const half=Math.max(extent.y/2,extent.x/2/(240/270)) * (options.padding||1.2);
   const camera=new T.OrthographicCamera(-half*240/270,half*240/270,half,-half,.01,100);
   camera.position.set(center.x,center.y,center.z+10);camera.lookAt(center);renderer.render(scene,camera);insides.forEach(m=>m.dispose());
   // WebP keeps the kept copies small; browsers that can't write it give PNG.
   const src=renderer.domElement.toDataURL('image/webp',.86);
   place(button,src);
   if(Object.keys(button.dataset).length)fresh[cardKey(button)]=src;
  }
  writeKept({...readKept(),...fresh});
 } catch(error){console.warn('Using illustrated wardrobe cards',error);showDrawings();}
 finally{renderer.setPixelRatio(ratio);renderer.setSize(size.x,size.y,false);renderer.setClearColor(color,alpha);}
}
