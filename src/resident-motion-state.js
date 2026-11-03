export const angleDelta=(a,b)=>Math.atan2(Math.sin(b-a),Math.cos(b-a));
const mix=(a,b,t)=>a+(b-a)*t;
// arms/armsTo: how the arms hold someone ([left forward, left out, right forward, right out], see avatar-rig.js), eased like crouching;
// reach/reachTo the same for how far each arm stretches ([left, right]), to reach a hand.
// blush/blushTo: how red the cheeks are (0 to 1), coming quickly and going slowly. squash: pressed down (a pat) or
// squished (a pinch), set as it happens (resident-touches.js). inStep: walking hand in hand, moved along by
// resident-hand.js rather than by a route here, so the legs keep walking.
export function newMotion(p){return {x:p[0],z:p[1],y:0,yaw:0,phase:0,amount:0,sit:0,crouch:0,crouchTo:0,lean:0,leanTo:0,tilt:0,tiltTo:0,arms:[0,0,0,0],armsTo:null,reach:[0,0],reachTo:null,blush:0,blushTo:0,squash:0,route:[],seat:null,transition:null,pending:null};}
const NO_ARMS=[0,0,0,0],NO_REACH=[0,0];
export function beginStand(m){if(m.sit>.001||m.transition){m.transition={type:'stand',time:0,from:[m.x,m.z,m.y,m.sit]};m.route=[];}else{m.route=[];m.seat=null;m.pending=null;}}
export function stepResident(m,seconds,hipHeight){
 const dt=Math.min(Math.max(seconds,0),.05);let moving=false,easing=false;
 // Crouching, leaning and tilting (sideways, avatar-rig.js) ease towards where they're asked to be.
 for(const k of ['crouch','lean','tilt']){const to=m[k+'To']||0,v=m[k]||0;if(Math.abs(to-v)<.002)m[k]=to;else{m[k]=v+(to-v)*(1-Math.exp(-9*dt));easing=true;}}
 if(m.arms){const to=m.armsTo||NO_ARMS;for(let i=0;i<4;i++){const v=m.arms[i];if(Math.abs(to[i]-v)<.002)m.arms[i]=to[i];else{m.arms[i]=v+(to[i]-v)*(1-Math.exp(-6*dt));easing=true;}}}
 if(m.reach){const to=m.reachTo||NO_REACH;for(let i=0;i<2;i++){const v=m.reach[i];if(Math.abs(to[i]-v)<.002)m.reach[i]=to[i];else{m.reach[i]=v+(to[i]-v)*(1-Math.exp(-6*dt));easing=true;}}}
 if(m.blush!==undefined){const to=m.blushTo||0,v=m.blush;if(Math.abs(to-v)<.004)m.blush=to;else{m.blush=v+(to-v)*(1-Math.exp(-(to>v?5:.9)*dt));easing=true;}}
 if(m.transition){const t=m.transition;t.time+=dt;const u=Math.min(1,t.time/.85),s=u*u*(3-2*u),seated=t.type==='sit';
  const target=seated?m.seat.seat:m.seat.approach;
  m.x=mix(t.from[0],target[0],s);m.z=mix(t.from[1],target[1],s);m.y=mix(t.from[2],seated?m.seat.height-hipHeight:0,s);m.sit=mix(t.from[3],seated?1:0,s);
  m.yaw+=angleDelta(m.yaw,m.seat.yaw)*Math.min(1,dt*10);
  if(u===1){m.transition=null;if(!seated){m.seat=m.pendingSeat||null;m.pendingSeat=null;m.route=m.pending||[];m.pending=null;}}
 }else if(m.route.length&&!(m.crouch>.08)){
  const goal=m.route[0],dx=goal[0]-m.x,dz=goal[1]-m.z,dist=Math.hypot(dx,dz),turn=angleDelta(m.yaw,Math.atan2(dx,dz));
  m.yaw+=Math.sign(turn)*Math.min(Math.abs(turn),dt*8.25);
  const remaining=m.route.reduce((sum,p,i)=>sum+Math.hypot(p[0]-(i?m.route[i-1][0]:m.x),p[1]-(i?m.route[i-1][1]:m.z)),0);
  const speed=Math.min(1.425,Math.max(.195,remaining*3.75))*Math.max(0,Math.cos(turn)),distance=Math.min(dist,speed*dt);
  if(dist>1e-5){m.x+=dx/dist*distance;m.z+=dz/dist*distance;moving=distance>1e-5;m.phase+=distance*16;}
  if(dist<=distance+.006){m.x=goal[0];m.z=goal[1];m.route.shift();}
 }else if(m.seat&&m.sit<.001){
  const turn=angleDelta(m.yaw,m.seat.yaw);m.yaw+=Math.sign(turn)*Math.min(Math.abs(turn),dt*8.25);
  if(Math.abs(turn)<.02)m.transition={type:'sit',time:0,from:[m.x,m.z,m.y,m.sit]};
 }
 const desired=moving||m.inStep?1:0;m.amount+=(desired-m.amount)*(1-Math.exp(-12*dt));if(!moving&&m.amount<.002)m.amount=0;
 return !!(easing||m.transition||m.route.length||m.amount||m.inStep||(m.seat&&m.sit<.999));
}
