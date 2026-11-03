import * as THREE from 'three';
import {mergeVertices} from 'three/addons/utils/BufferGeometryUtils.js';

// Rounded blunt fringe: three broad convex masses, with narrow rounded partings.
// Polar silhouette curves are authored individually; no repeating sawtooth edge.
const femaleEdge=[[-Math.PI,2.43],[-2.3,2.44],[-1.6,2.50],[-1.2,2.62],[-1.02,2.69],[-.90,2.66],[-.80,2.48],[-.73,1.70],[-.64,1.59],[-.47,1.61],[-.30,1.62],[-.255,1.56],[-.22,1.64],[.12,1.65],[.245,1.63],[.28,1.56],[.32,1.61],[.53,1.60],[.67,1.56],[.74,1.69],[.81,2.46],[.92,2.67],[1.04,2.69],[1.22,2.61],[1.6,2.50],[2.3,2.44],[Math.PI,2.43]];
const maleEdge=[[-Math.PI,2.10],[-2,2.14],[-1.3,2.15],[-1.02,2.21],[-.86,2.04],[-.74,1.62],[-.58,1.54],[-.32,1.60],[-.24,1.52],[-.18,1.63],[.08,1.67],[.26,1.59],[.31,1.51],[.38,1.58],[.60,1.53],[.72,1.58],[.85,2.05],[1.04,2.20],[1.4,2.13],[2.1,2.14],[Math.PI,2.10]];
function profile(a,points){let i=1;while(i<points.length-1&&a>points[i][0])i++;const [x,y]=points[i-1],[xx,yy]=points[i];return THREE.MathUtils.lerp(y,yy,THREE.MathUtils.smoothstep(a,x,xx));}
export function createResidentHair(girl=true){
 const pos=[],idx=[],rows=64,cols=192,stride=cols+1,layerSize=(rows+1)*stride;
 for(let layer=0;layer<2;layer++)for(let i=0;i<=rows;i++)for(let j=0;j<=cols;j++){
  const a=-Math.PI+j/cols*Math.PI*2,u=i/rows,edge=profile(a,girl?femaleEdge:maleEdge),t=edge*u;
  const front=THREE.MathUtils.smoothstep(Math.cos(a),.54,.85);
  // Soft convex planes begin halfway down the forehead, never stripes at the crown.
  const forehead=THREE.MathUtils.smoothstep(t,.5,1.10);
  const flow=a+(girl?.035:-.10)*Math.sin(Math.PI*u);
  const left=Math.exp(-Math.pow((flow+.47)/.24,4));
  const center=Math.exp(-Math.pow((flow-.015)/.26,4));
  const right=Math.exp(-Math.pow((flow-.49)/.24,4));
  const fullness=.026*(left+center+right)*front*forehead;
  const lower=THREE.MathUtils.smoothstep(t,1.7,2.65);
  const side= Math.exp(-Math.pow((Math.abs(a)-.97)/.19,4));
  // Separate cheek locks visually by a soft valley within the same solid surface.
  const sideFull=.019*side*THREE.MathUtils.smoothstep(t,.8,1.7);
  const valley=.012*Math.exp(-Math.pow((Math.abs(a)-1.25)/.06,2))*THREE.MathUtils.smoothstep(t,1.1,2.0);
  const inner=layer===1?.032:0;
  // Tuck in the final rings to round the hem instead of leaving a knife-like cut.
  const lip=.012*THREE.MathUtils.smoothstep(u,.965,1);
  const r=Math.pow(Math.max(0,Math.sin(t)),.83);
  const radiusDelta=fullness+sideFull-valley-inner-lip;
  const x=(.465+radiusDelta)*r*Math.sin(a);
  const z=-.025+(.392+radiusDelta)*r*Math.cos(a);
  const y=.024+(.393-inner)*Math.cos(t)-(girl?.055:0)*lower*(1-front);
  pos.push(x,y,z);
  if(i<rows&&j<cols){const v=layer*layerSize+i*stride+j,n=v+stride; if(layer===0)idx.push(v,n,v+1,v+1,n,n+1);else idx.push(v,v+1,n,v+1,n+1,n);}
 }
 for(let j=0;j<cols;j++){const v=rows*stride+j,n=v+layerSize;idx.push(v,v+1,n,v+1,n+1,n);}
 const raw=new THREE.BufferGeometry();raw.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));raw.setIndex(idx);
 const g=mergeVertices(raw,1e-6);raw.dispose();g.computeVertexNormals();return g;
}
