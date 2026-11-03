// Small tools for sewing garments around the residents' body, in its own coordinates: y up, face
// towards +z; the torso's axis is x 0, z .10 and the legs' x ±.19, z .11. Used by body/outfits.js
// and by a home's own outfits (src/ours/*.outfit.js).
import * as T from 'three';

// The residents' body around the torso's axis (x 0, z .10): its radius towards the front, the side
// and the back at each height, measured on the body model. Garments are drawn a little outside it, so
// the fit (fitShells) has little left to push.
export const TORSO=[[1.40,.085,.14,.165],[1.36,.11,.22,.17],[1.32,.144,.27,.18],[1.26,.179,.265,.206],[1.20,.198,.255,.224],[1.14,.215,.25,.234],[1.08,.232,.279,.243],[1.02,.245,.29,.254],[.96,.256,.304,.268],[.90,.263,.32,.279],[.84,.262,.327,.281],[.78,.251,.33,.272],[.72,.228,.327,.25]];
export const smoothstep=t=>(t=Math.min(1,Math.max(0,t)),t*t*(3-2*t));
// A row of three radii (front, side, back), read round by angle: theta 0 is the front (+z), pi/2 is +x.
export const around=([f,s,b],a)=>{const c=Math.cos(a),q=Math.sin(a)**2;return s*q+(c>0?f:b)*(1-q);};
export function torsoAt(y){const r=TORSO,k=Math.max(0,Math.min(r.length-2,r.findIndex(row=>row[0]<=y)-1));const [y0,...a]=r[k],[y1,...b]=r[k+1],t=Math.min(1,Math.max(0,(y0-y)/(y0-y1)));return a.map((v,i)=>v+(b[i]-v)*t);}
// Heights for rows: closer together where the rig bends cloth (hips .80-.96, knees .36-.52).
export function rowHeights(top,bottom,coarse=.032){const ys=[];for(let y=top;y>bottom+.012;){ys.push(y);const fine=(y>.78&&y<1)||(y>.34&&y<.55);y-=fine?.02:coarse;}ys.push(bottom);return ys;}
// Rings around a vertical axis: rows [[y, radius(theta, y)]] from the top down. A seam column is doubled
// so texture coordinates run all the way round; opening(y) leaves the front open by that half-angle.
export function rings(rows,cols,{cx=0,cz=.10,opening}={}){
 const pos=[],uv=[],idx=[],per=cols+1;
 rows.forEach(([y,r],j)=>{const o=opening?opening(y):0;for(let i=0;i<=cols;i++){const a=o+(Math.PI*2-2*o)*i/cols,R=r(a,y);pos.push(cx+Math.sin(a)*R,y,cz+Math.cos(a)*R);uv.push(i/cols,1-j/(rows.length-1));}});
 for(let j=0;j<rows.length-1;j++)for(let i=0;i<cols;i++){const a=j*per+i,b=a+per;idx.push(a,b,a+1,a+1,b,b+1);}
 const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(pos,3));g.setAttribute('uv',new T.Float32BufferAttribute(uv,2));g.setIndex(idx);g.computeVertexNormals();
 if(!opening){const n=g.attributes.normal,v=new T.Vector3();for(let j=0;j<rows.length;j++){const a=j*per,b=a+cols;v.fromBufferAttribute(n,a).add(new T.Vector3().fromBufferAttribute(n,b)).normalize();n.setXYZ(a,v.x,v.y,v.z);n.setXYZ(b,v.x,v.y,v.z);}}
 return g;
}
export function mesh(group,geometry,material,name,axis){const m=new T.Mesh(geometry,material);m.name=name;m.castShadow=true;m.receiveShadow=true;if(axis)m.userData.clothAxis=axis;group.add(m);return m;}
// The arm as the body model has it: shoulder, elbow and wrist (on the +x side). The upper arm is about
// .1 thick; on the rig its skin near the shoulder hardly moves while the forearm swings.
export const ARM={shoulder:[.18,1.32,.065],elbow:[.44,1.065,.05],wrist:[.535,.915,.05]};
// Rings along the whole arm, shoulder -> elbow -> wrist, bending smoothly at the elbow:
// rows [[s, radius(theta)]], s measured along the arm from the shoulder. theta 0 faces forward.
export function armRings(side,rows,cols){
 const P=k=>new T.Vector3(side*ARM[k][0],ARM[k][1],ARM[k][2]),S=P('shoulder'),E=P('elbow'),W=P('wrist');
 const l1=S.distanceTo(E),l2=E.distanceTo(W),d1=E.clone().sub(S).normalize(),d2=W.clone().sub(E).normalize(),bend=.06;
 const centre=s=>{if(s<=l1-bend)return S.clone().addScaledVector(d1,s);if(s>=l1+bend)return E.clone().addScaledVector(d2,s-l1);
  const t=(s-l1+bend)/(2*bend),a=E.clone().addScaledVector(d1,-bend),c=E.clone().addScaledVector(d2,bend);return a.multiplyScalar((1-t)**2).addScaledVector(E,2*t*(1-t)).addScaledVector(c,t*t);};
 const frame=s=>{const d=centre(s+.004).sub(centre(s-.004)).normalize(),front=new T.Vector3(0,0,1).addScaledVector(d,-d.z).normalize();return {d,front,across:new T.Vector3().crossVectors(d,front).normalize()};};
 const at=(s,a,R)=>{const {front,across}=frame(s);return centre(s).addScaledVector(front,Math.cos(a)*R).addScaledVector(across,Math.sin(a)*R*side);};
 const pos=[],uv=[],idx=[],per=cols+1;
 rows.forEach(([s,r],j)=>{for(let i=0;i<=cols;i++){const a=i/cols*Math.PI*2,p=at(s,a,typeof r==='function'?r(a):r);pos.push(p.x,p.y,p.z);uv.push(i/cols,1-j/(rows.length-1));}});
 for(let j=0;j<rows.length-1;j++)for(let i=0;i<cols;i++){const a=j*per+i,b=a+per;side>0?idx.push(a,b,a+1,a+1,b,b+1):idx.push(a,a+1,b,a+1,b+1,b);}
 const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(pos,3));g.setAttribute('uv',new T.Float32BufferAttribute(uv,2));g.setIndex(idx);g.computeVertexNormals();
 return {geometry:g,at,frame,centre,length:l1+l2};
}
// A smooth value from points [[s, value]] (sorted by s).
export function profile(points,s){const k=Math.max(0,points.findIndex(p=>p[0]>=s)-1),[s0,v0]=points[k],[s1,v1]=points[k+1]||points[k];return s1===s0?v0:v0+(v1-v0)*smoothstep((s-s0)/(s1-s0));}
export const cloth=(name,color,roughness=.92)=>new T.MeshStandardMaterial({name,color,roughness,side:T.DoubleSide});
export const fold=(a,phase=0)=>.55*Math.sin(13*a+1.3+phase)+.45*Math.sin(8*a+.4+.8*Math.sin(3*a)+phase);

// A closed slab lying on a garment: outline(u, v) -> [theta, y] on the surface radius(theta, y) around
// the torso's axis, lifted by `lift` and `thickness` thick, with its rim closed.
export function slab(radius,outline,U,V,lift,thickness){
 const pos=[],idx=[],grid=(off)=>{const base=pos.length/3;for(let i=0;i<=U;i++)for(let j=0;j<=V;j++){const [a,y]=outline(i/U,j/V),R=radius(a,y)+off;pos.push(Math.sin(a)*R,y,.10+Math.cos(a)*R);}return base;};
 const top=grid(lift+thickness),bottom=grid(lift),id=(b,i,j)=>b+i*(V+1)+j;
 for(let i=0;i<U;i++)for(let j=0;j<V;j++){idx.push(id(top,i,j),id(top,i+1,j),id(top,i,j+1),id(top,i,j+1),id(top,i+1,j),id(top,i+1,j+1));idx.push(id(bottom,i,j),id(bottom,i,j+1),id(bottom,i+1,j),id(bottom,i,j+1),id(bottom,i+1,j+1),id(bottom,i+1,j));}
 const rim=[];for(let i=0;i<U;i++)rim.push([i,0]);for(let j=0;j<V;j++)rim.push([U,j]);for(let i=U;i>0;i--)rim.push([i,V]);for(let j=V;j>0;j--)rim.push([0,j]);
 rim.forEach(([i,j],k)=>{const [i2,j2]=rim[(k+1)%rim.length];idx.push(id(top,i,j),id(bottom,i,j),id(top,i2,j2),id(top,i2,j2),id(bottom,i,j),id(bottom,i2,j2));});
 const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(pos,3));g.setIndex(idx);g.computeVertexNormals();return g;
}
// A circle of radius R whose centre sits dz in front of the torso's axis, as a radius round that axis.
export const circleAround=(R,dz)=>a=>dz*Math.cos(a)+Math.sqrt(Math.max(0,R*R-(dz*Math.sin(a))**2));

// One leg of a pair of trousers, its own piece (see the charcoal coat's in body/outfits.js): above the
// crotch it goes round its half of the hips, from the middle of the front, over the side, to the
// middle of the back, and closes along the middle plane inside the body; below the crotch it is a tube
// round the leg, joined to the other leg a little below the crotch so no skin shows there. Its radius
// round the leg at height y is legRadius(y, p), p the angle round the leg (0 in front). Name it
// "...-stitch", with {cx, cz, leg: true} as its axis: it bends at the hips the way the skin does.
export function trouserLeg(side,legRadius,{top=1.045,bottom=.16,cols=32,ease=.026}={}){
 const cx=side*.19,cz=.11,torso=(a,y)=>around(torsoAt(y),a),OUT=.75,ys=rowHeights(top,bottom,.036),per=cols+1;
 const hipPoint=(u,y)=>{const yy=Math.max(y,.72);if(u<=OUT){const a=side*Math.PI*u/OUT,R=torso(a,yy)+ease;return [Math.sin(a)*R,.10+Math.cos(a)*R];}
  const t=(u-OUT)/(1-OUT),back=.10-(torsoAt(yy)[2]+ease),front=.10+torsoAt(yy)[0]+ease;return [side*.002,back+(front-back)*t];};
 const legPoint=(u,y)=>{const p=side*(u<=OUT?Math.PI*u/OUT:Math.PI+Math.PI*(u-OUT)/(1-OUT)),R=legRadius(y,p);return [cx+Math.sin(p)*R,cz+Math.cos(p)*R];};
 const pos=[],uv=[],idx=[];
 ys.forEach((y,j)=>{const t=smoothstep((y-.55)/.13);for(let i=0;i<=cols;i++){const u=(i%cols)/cols,[x1,z1]=legPoint(u,y),[x2,z2]=hipPoint(u,y);pos.push(x1+(x2-x1)*t,y,z1+(z2-z1)*t);uv.push(i/cols,1-j/(ys.length-1));}});
 for(let j=0;j<ys.length-1;j++)for(let i=0;i<cols;i++){const a=j*per+i,b=a+per;side>0?idx.push(a,b,a+1,a+1,b,b+1):idx.push(a,a+1,b,a+1,b+1,b);}
 const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(pos,3));g.setAttribute('uv',new T.Float32BufferAttribute(uv,2));g.setIndex(idx);g.computeVertexNormals();
 return {geometry:g,axis:{cx,cz,leg:true}};
}
// A fine tube lying along a garment's surface radius(theta, y) round the torso's axis, through the
// points [[theta, y], ...], lift out from it: piping, a seam, an edge.
export function surfaceLine(radius,path,lift,r,{closed=false,segments=64}={}){
 const pts=path.map(([a,y])=>{const R=radius(a,y)+lift;return new T.Vector3(Math.sin(a)*R,y,.10+Math.cos(a)*R);});
 return new T.TubeGeometry(new T.CatmullRomCurve3(pts,closed,'centripetal'),segments,r,5,closed);
}
