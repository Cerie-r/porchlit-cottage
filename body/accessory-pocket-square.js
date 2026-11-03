// A pocket square: a folded handkerchief standing up out of a breast pocket in three soft points, a
// rolled edge along the top, and the pocket's welt under it (his outfits don't all have a breast
// pocket, so it brings its own). Worn on his right chest, standing on whatever is there.
import * as T from 'three';
import {finish,part,paintPiece,wornSurfaces,onCloth,standOn} from './accessory-tools.js';

const REACH=new T.Box3(new T.Vector3(-.4,1.0,-.1),new T.Vector3(.4,1.42,.7));
// The top outline of the fold, left to right: three points with soft dips between them.
const OUTLINE=[[-.036,.004],[-.031,.022],[-.024,.036],[-.016,.024],[-.009,.021],[-.002,.034],[.004,.047],[.011,.032],[.018,.023],[.026,.036],[.033,.026],[.038,.006]];
function fold(){
 const s=new T.Shape();s.moveTo(-.038,-.012);for(const [x,y] of OUTLINE)s.lineTo(x,y);s.lineTo(.04,-.012);s.closePath();
 const g=new T.ExtrudeGeometry(s,{depth:.005,bevelEnabled:true,bevelSize:.0022,bevelThickness:.002,bevelSegments:2,curveSegments:6});
 // it bows out a little, as cloth does over the chest
 const p=g.attributes.position;for(let i=0;i<p.count;i++)p.setZ(i,p.getZ(i)+.006*(1-(p.getX(i)/.04)**2));g.computeVertexNormals();return g;
}
function build(){
 const group=new T.Group();group.name='pocket-square';
 const cloth=finish('main','#f6efe2',{roughness:.8}),edge=finish('accent','#d7c3a8',{roughness:.8}),welt=finish('trim','#3a3438',{roughness:.9});
 part(group,fold().translate(0,.002,.004),cloth,'pocket-square-fold');
 const top=new T.CatmullRomCurve3(OUTLINE.map(([x,y])=>new T.Vector3(x,y+.002,.012+.006*(1-(x/.04)**2))));
 part(group,new T.TubeGeometry(top,64,.0019,6,false),edge,'pocket-square-edge');
 part(group,new T.BoxGeometry(.092,.011,.006).translate(0,-.006,.006),welt,'pocket-square-welt');
 return group;
}
function place(square,hair,worn){
 if(!worn)return;
 const places=[];for(const y of [1.18,1.2,1.16,1.22])for(const x of [-.13,-.15,-.17,-.11])places.push([x,y]);
 const at=onCloth(wornSurfaces(worn,REACH),places,.05);
 if(at)standOn(square,at,.003,1.25);
}

export const pocketSquare={
 id:'pocket-square',name:'口袋巾',slot:'chest',wearers:['boy'],
 create:build,place,
 colorways:[{id:'cream',name:'奶白',colors:{main:'#f6efe2',accent:'#d7c3a8',trim:'#3a3438'}},{id:'wine',name:'酒红',colors:{main:'#8e3a49',accent:'#d9a6ad',trim:'#3a3438'}},{id:'sky',name:'雾蓝',colors:{main:'#a9bdd6',accent:'#f2f0ea',trim:'#3a3438'}}],
 paint:paintPiece,
 drawing:'<svg viewBox="0 0 120 120"><path d="M28 70 34 46l12 16 14-26 14 26 12-16 6 24z" fill="#f6efe2"/><path d="M24 70h72v8H24z" fill="#3a3438"/></svg>'
};
