// A little flower tucked into the hair above her right ear: five round petals, cupped a little, a domed
// middle, and two small leaves peeking out from under it. It rests on the hair of the hairstyle being
// worn, lifted just clear of it.
import * as T from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import {finish,part,paintPiece,reachOf,hairPoints,restOnReach,onHead} from './accessory-tools.js';

const SIZE=.15,GROW=1.18;
function petals(){
 const parts=[];
 for(let i=0;i<5;i++){const a=Math.PI/2+i*Math.PI*2/5,g=new T.SphereGeometry(1,18,12).scale(.036,.026,.0075);
  // round, cupped up towards their tips, each out from the middle
  const p=g.attributes.position;for(let k=0;k<p.count;k++){const x=p.getX(k);p.setZ(k,p.getZ(k)+.012*((x/.036+1)/2)**2);}
  g.translate(.032,0,0).rotateZ(a);parts.push(g);}
 return mergeGeometries(parts);
}
function leaves(){
 return mergeGeometries([[-2.3,.05],[-1.25,.045]].map(([a,len])=>{const g=new T.SphereGeometry(1,14,10).scale(len,.017,.0045);g.translate(len*.9+.03,0,-.006).rotateZ(a);return g;}));
}
function build(){
 const group=new T.Group();group.name='hair-flower';
 const bloom=new T.Group();bloom.name='hair-flower-bloom';group.add(bloom);
 part(bloom,petals(),finish('main','#fbf7f0',{roughness:.6}),'hair-flower-petals');
 part(bloom,new T.SphereGeometry(1,18,12).scale(.019,.019,.012).translate(0,0,.009),finish('accent','#f2c94c',{roughness:.7}),'hair-flower-middle');
 part(bloom,leaves(),finish('trim','#9cbf8a',{roughness:.6}),'hair-flower-leaves');
 return group;
}
// Where it goes, by angle round the head (0 straight ahead, pi/2 to her left) and elevation.
const AT=[-.92,.32];
function place(flower,hair){
 const at=restOnReach(reachOf(hairPoints(hair),{A:240,E:120,spread:1,smoothing:0}),...AT,{length:SIZE,width:SIZE,turn:.3,lift:.009});
 const bloom=flower.getObjectByName('hair-flower-bloom');bloom.position.copy(at.point);bloom.quaternion.copy(at.quaternion);bloom.scale.setScalar(GROW);
 onHead(flower,hair);
}

export const hairFlower={
 id:'hair-flower',name:'小花',slot:'head',wearers:['girl'],
 create:build,place,
 colorways:[{id:'daisy',name:'小雏菊',colors:{main:'#fbf7f0',accent:'#f2c94c',trim:'#9cbf8a'}},{id:'blossom',name:'樱花粉',colors:{main:'#f4c6cf',accent:'#f7e4a8',trim:'#a9c69a'}},{id:'forget',name:'勿忘我',colors:{main:'#b9cdec',accent:'#f6e7b0',trim:'#9cbf8a'}}],
 paint:paintPiece,
 drawing:'<svg viewBox="0 0 120 120"><g fill="#fbf7f0"><circle cx="60" cy="36" r="15"/><circle cx="83" cy="53" r="15"/><circle cx="74" cy="80" r="15"/><circle cx="46" cy="80" r="15"/><circle cx="37" cy="53" r="15"/></g><circle cx="60" cy="60" r="11" fill="#f2c94c"/></svg>'
};
