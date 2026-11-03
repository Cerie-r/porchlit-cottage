import * as THREE from 'three';

// Thin, sewn shells. Dimensions are half-width/depth; origin is the top opening.
export function clothTube({height,top,bottom=top,thickness=.006,fold=.0015}) {
  const n=48,rows=14,pos=[],idx=[];
  for(let layer=0;layer<2;layer++) for(let j=0;j<=rows;j++){
    const t=j/rows,rx=THREE.MathUtils.lerp(top[0],bottom[0],t)-layer*thickness;
    const rz=THREE.MathUtils.lerp(top[1],bottom[1],t)-layer*thickness;
    for(let i=0;i<=n;i++){
      const a=i/n*Math.PI*2,c=Math.cos(a),s=Math.sin(a);
      const crease=fold*Math.cos(a*4+.4)*Math.sin(t*Math.PI);
      pos.push(Math.sign(c)*Math.abs(c)**.72*(rx+crease),-height*t,Math.sign(s)*Math.abs(s)**.72*(rz+crease));
    }
  }
  const stride=n+1,offset=(rows+1)*stride;
  for(let layer=0;layer<2;layer++)for(let j=0;j<rows;j++)for(let i=0;i<n;i++){
    const a=layer*offset+j*stride+i,b=a+1,c=a+stride,d=c+1;
    if(layer)idx.push(a,c,b,b,c,d);else idx.push(a,b,c,b,d,c);
  }
  for(const row of [0,rows])for(let i=0;i<n;i++){
    const a=row*stride+i,b=a+1,c=a+offset,d=b+offset;
    if(row===0)idx.push(a,c,b,b,c,d);else idx.push(a,b,c,b,d,c);
  }
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));g.setIndex(idx);g.computeVertexNormals();return g;
}

export function clothPanel(width,height,thickness=.006,bow=.012){
  const nx=24,ny=16,stride=nx+1,count=(nx+1)*(ny+1),pos=[],idx=[];
  const r=Math.min(width,height)*.08,w=width/2,h=height/2;
  for(let layer=0;layer<2;layer++)for(let j=0;j<=ny;j++){
    const y=-h+height*j/ny,d=Math.max(0,Math.abs(y)-(h-r));
    const half=w-r+Math.sqrt(Math.max(0,r*r-d*d));
    for(let i=0;i<=nx;i++){const x=(-1+2*i/nx)*half;pos.push(x,y,layer*thickness+bow*(1-(x/w)**2));}
  }
  for(let layer=0;layer<2;layer++)for(let j=0;j<ny;j++)for(let i=0;i<nx;i++){
    const a=layer*count+j*stride+i,b=a+1,c=a+stride,d=c+1;
    if(layer)idx.push(a,b,c,b,d,c);else idx.push(a,c,b,b,c,d);
  }
  const edges=[];for(let i=0;i<nx;i++)edges.push([i,i+1]);for(let j=0;j<ny;j++)edges.push([j*stride+nx,(j+1)*stride+nx]);
  for(let i=nx;i>0;i--)edges.push([ny*stride+i,ny*stride+i-1]);for(let j=ny;j>0;j--)edges.push([j*stride,(j-1)*stride]);
  for(const [a,b] of edges)idx.push(a,b,a+count,b,b+count,a+count);
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));g.setIndex(idx);g.computeVertexNormals();return g;
}

export function clothRibbon(points,width,thickness=.006){
  const curve=new THREE.CatmullRomCurve3(points.map(p=>new THREE.Vector3(...p))),n=40,pos=[],idx=[];
  for(let j=0;j<=n;j++){
    const t=j/n,p=curve.getPoint(t),tan=curve.getTangent(t),side=new THREE.Vector3(1,0,0);
    side.addScaledVector(tan,-tan.dot(side)).normalize();
    const norm=new THREE.Vector3().crossVectors(side,tan).normalize();
    for(const [sx,sz] of [[-1,-1],[1,-1],[1,1],[-1,1]]){
      const q=p.clone().addScaledVector(side,sx*width/2).addScaledVector(norm,sz*thickness/2);pos.push(q.x,q.y,q.z);
    }
  }
  for(let j=0;j<n;j++)for(let k=0;k<4;k++){const a=j*4+k,b=j*4+(k+1)%4,c=a+4,d=b+4;idx.push(a,b,c,b,d,c);}
  idx.push(0,2,1,0,3,2,n*4,n*4+1,n*4+2,n*4,n*4+2,n*4+3);
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));g.setIndex(idx);g.computeVertexNormals();return g;
}
