import * as T from 'three';

// Broad flattened locks in front of the ears, joined into each hairstyle.
export function createCheekHair(box, kind) {
 const group=new T.Group();group.name='ear-front-cheek-locks';
 const c=box.getCenter(new T.Vector3()),s=box.getSize(new T.Vector3());
 for(const side of [-1,1]){
  const short=kind==='short';
  const points=[ [.41,.34,.22],[.455,.14,.36],[.435,-.08,.43],[short?.385:.365,short?-.24:-.32,.405] ];
  const curve=new T.CatmullRomCurve3(points.map(([x,y,z])=>new T.Vector3(c.x+side*x*s.x,c.y+y*s.y,c.z+z*s.z)));
  const p=[],indices=[],rings=40,segments=20;
  for(let i=0;i<=rings;i++){
   const t=i/rings,center=curve.getPoint(t),tangent=curve.getTangent(t);
   const across=new T.Vector3(-tangent.y,tangent.x,0).normalize();
   const depth=new T.Vector3().crossVectors(across,tangent).normalize();
   const taper=Math.pow(Math.sin(Math.PI*(.20+.80*t)),.72);
   const width=s.x*(short?.071:.085)*Math.max(.003,taper),thickness=s.z*.045*Math.max(.003,taper);
   for(let j=0;j<=segments;j++){
    const angle=j/segments*Math.PI*2;
    const v=center.clone().addScaledVector(across,Math.cos(angle)*width).addScaledVector(depth,Math.sin(angle)*thickness);
    p.push(v.x,v.y,v.z);
    if(i<rings&&j<segments){const a=i*(segments+1)+j,b=a+segments+1;indices.push(a,b,a+1,a+1,b,b+1);}
   }
  }
  const geo=new T.BufferGeometry();geo.setAttribute('position',new T.Float32BufferAttribute(p,3));geo.setIndex(indices);geo.computeVertexNormals();
  const mesh=new T.Mesh(geo,new T.MeshStandardMaterial({color:'#685047',roughness:.83,side:T.DoubleSide}));mesh.castShadow=true;mesh.receiveShadow=true;group.add(mesh);
 }
 return group;
}
