// The sky behind the house: a few clouds by day, stars at night. Positions are
// percentages of the screen, so shapes keep their size on any viewport instead
// of stretching. Nothing here is spaced evenly: an even row of anything reads
// as a pattern.

// Seeded, so the sky is the same every visit.
function seeded(seed){
 return ()=>{seed=seed+0x6D2B79F5|0;let t=Math.imul(seed^seed>>>15,1|seed);t=t+Math.imul(t^t>>>7,61|t)^t;return ((t^t>>>14)>>>0)/4294967296;};
}
const smooth=t=>{t=Math.max(0,Math.min(1,t));return t*t*(3-2*t);};

// Stars only come out once the sky has turned (the night background starts at
// daylight .5) and are fully out by .15.
export const starOpacity=daylight=>smooth((.5-daylight)/.35);
// Clouds thin out through the evening and are gone before the sky turns.
export const cloudOpacity=daylight=>smooth((daylight-.5)/.35);

// Mostly cream and cool white, a few with a trace of lilac or pink.
const tints=['#fff6e8','#fff6e8','#eef1ff','#eef1ff','#f3eeff','#ffeef3'];

// r is the star's visual radius in CSS px. Stars are drawn as soft radial
// gradients inside a fixed box, so fractional sizes stay round instead of
// being snapped into little dashes.
export function makeStars(seed=528,count=130){
 const r=seeded(seed),stars=[];
 for(let i=0;i<count;i++){
  const k=r();
  const radius=k>.95?1.35:k>.8?1.05:k>.45?.8:.6; // most are faint dust
  const dust=radius<.7;
  stars.push({
   x:r()*100,
   y:Math.pow(r(),1.35)*100, // thinner toward the bottom, like a real sky
   r:radius,
   o:+((dust?.3:.5)+r()*(dust?.3:.45)).toFixed(2),
   tint:tints[Math.floor(r()*tints.length)],
   twinkle:!dust&&r()<.3,
   dur:+(2.6+r()*4.6).toFixed(2),
   delay:-+(r()*7).toFixed(2),
   extra:r()<.5, // hidden on phones, where the same count would look crowded
  });
 }
 // Three brighter stars with a faint four-point glint, all in the upper sky.
 for(let i=0;i<3;i++)stars.push({x:6+r()*88,y:5+r()*38,r:1.2,o:.95,tint:'#fff6e8',twinkle:true,dur:+(5+r()*3).toFixed(2),delay:-+(r()*6).toFixed(2),extra:false,glint:true});
 return stars;
}

// Where clouds may float: around the title and the house rather than behind
// them, deliberately uneven. w is the width in CSS px on a desktop screen.
const cloudSlots=[
 {x:7,y:9,w:225},
 {x:54,y:3,w:150},
 {x:88,y:21,w:250},
 {x:13,y:71,w:135,extra:true},
 {x:91,y:76,w:105,extra:true},
];

// Each cloud is a row of four to six puffs on a soft flat-bottomed base, in a
// 200 x 100 box. Puffs grow left to right, each overlapping the last, so the
// top edge is bumpy all the way along with no flat shelf showing between them.
// Ends are small and low, the middle is taller, one puff is the biggest; sizes
// and overlaps are random, so no two clouds match.
const round=v=>+v.toFixed(1);
export function makeClouds(seed=1018){
 const r=seeded(seed);
 return cloudSlots.map(slot=>{
  const n=4+Math.floor(r()*3);
  const middle=i=>1-Math.abs(i/(n-1)*2-1); // 0 at the ends, 1 in the middle
  const radii=Array.from({length:n},(_,i)=>11+middle(i)*13+r()*6);
  radii[1+Math.floor(r()*(n-2))]+=7+r()*4; // the biggest puff, never at an end
  const xs=[0];
  for(let i=1;i<n;i++)xs.push(xs[i-1]+(radii[i-1]+radii[i])*(.5+r()*.16));
  // Fit the row into the box, centred, leaving room for the shadow.
  const span=xs[n-1]+radii[0]+radii[n-1],k=Math.min(1,176/span),shift=(200-span*k)/2+radii[0]*k;
  const top=62;
  const puffs=xs.map((x,i)=>{const pr=radii[i]*k;return {cx:shift+x*k,cy:Math.max(top-pr*(.22+.38*middle(i))+(r()-.5)*3,pr+2),r:pr};});
  return {
   x:round(slot.x+(r()-.5)*4),
   y:round(slot.y+(r()-.5)*4),
   w:Math.round(slot.w*(.92+r()*.16)),
   o:+(.86+r()*.12).toFixed(2),
   drift:Math.round(12+r()*20),
   dur:Math.round(55+r()*45),
   delay:-Math.round(r()*60),
   extra:!!slot.extra,
   // The base tucks under the end puffs and gives the cloud its flat bottom.
   base:(()=>{const a=puffs[0],b=puffs[n-1],x=a.cx-a.r*.55;return {x:round(x),y:top-6,w:round(b.cx+b.r*.55-x),h:22};})(),
   puffs:puffs.map(p=>({cx:round(p.cx),cy:round(p.cy),r:round(p.r)})),
  };
 });
}
