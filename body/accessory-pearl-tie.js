// A pearl hair tie at the end of each braid: a ring of pearls, a tiny gold bead between each two,
// wound round the braid where it is tied off, over its plain tie. Only on a hairstyle with braids
// (see showsWith in body/accessory-registry.js); made as a pair side by side, as the wardrobe
// photographs it.
import * as T from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import {finish,part,paintPiece,braidTies,onHead} from './accessory-tools.js';

const PEARLS=8,RING=.047,PEARL=.0175,BEAD=.0075,APART=.08;
// A ring round its own z axis.
function ring(size,count,turn){return mergeGeometries(Array.from({length:count},(_,i)=>{const a=(i+turn)/count*Math.PI*2;return new T.SphereGeometry(size,16,12).translate(Math.cos(a)*RING,Math.sin(a)*RING,0);}));}
function build(){
 const group=new T.Group();group.name='pearl-tie';
 const pearl=finish('main','#f6efe4',{roughness:.28}),bead=finish('accent','#d9b56a',{roughness:.32,metalness:.35});
 for(const k of [0,1]){const one=new T.Group();one.name='pearl-tie-'+k;group.add(one);part(one,ring(PEARL,PEARLS,0),pearl,'pearl-tie-pearls');part(one,ring(BEAD,PEARLS,.5),bead,'pearl-tie-beads');}
 lay(group);return group;
}
// Side by side, facing forward: as it is built, and on a hairstyle without braids.
function lay(group){group.children.forEach((one,k)=>{one.position.set((k?-1:1)*APART,0,0);one.quaternion.identity();});}
function place(tie,hair){
 const ties=braidTies(hair);
 if(!ties.length){lay(tie);tie.position.set(0,0,0);tie.scale.setScalar(1);return;}
 // round each braid, in the plane across it
 tie.children.forEach((one,k)=>{const t=ties[k%ties.length];one.position.copy(t.point);one.quaternion.setFromRotationMatrix(new T.Matrix4().makeBasis(t.front,t.side,t.along));});
 onHead(tie,hair);
}

export const pearlTie={
 id:'pearl-tie',name:'珍珠发绳',slot:'braid',wearers:['girl'],
 create:build,place,
 colorways:[{id:'pearl',name:'珍珠白',colors:{main:'#f6efe4',accent:'#d9b56a'}},{id:'blush',name:'粉珍珠',colors:{main:'#f3d6d6',accent:'#e3c39d'}},{id:'midnight',name:'黑珍珠',colors:{main:'#3b3a44',accent:'#d9b56a'}}],
 paint:paintPiece,
 drawing:'<svg viewBox="0 0 120 120"><g fill="#f6efe4"><circle cx="38" cy="44" r="9"/><circle cx="54" cy="40" r="9"/><circle cx="66" cy="52" r="9"/><circle cx="62" cy="68" r="9"/><circle cx="46" cy="74" r="9"/><circle cx="32" cy="62" r="9"/></g><g fill="#d9b56a"><circle cx="82" cy="50" r="5"/><circle cx="90" cy="64" r="5"/></g></svg>'
};
