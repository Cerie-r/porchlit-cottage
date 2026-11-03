import React from 'react';
const romans=['0','I','II','III','IV','V','VI','VII','VIII','IX','X','XI','XII','XIII','XIV','XV','XVI','XVII','XVIII','XIX','XX','XXI'];
export function CardArt({card,back=false}){
 const rank=back?'':card.suit==='major'?romans[card.rank]:card.rank>10?['PAGE','KNIGHT','QUEEN','KING'][card.rank-11]:romans[card.rank];
 return <svg viewBox="0 0 240 400" aria-hidden="true">
  <g transform={!back&&card.reversed?'translate(240 400) rotate(180)':undefined}>
   <image href={'/art/tarot/'+(back?'back':card.id)+'.webp'} width="240" height="400"/>
   {!back&&card.suit==='major'&&card.rank===18&&<image href="/art/stationery/moon-study.webp" x="28" y="66" width="184" height="250" preserveAspectRatio="xMidYMid meet"/>}
   {!back&&<><text x="120" y="50" textAnchor="middle" fill="#77645e" fontFamily="Georgia,serif" fontSize="13" letterSpacing="2">{rank}</text><text x="120" y="352" textAnchor="middle" fill="#685753" fontFamily="serif" fontSize="17" letterSpacing="3">{card.name}</text><text x="120" y="380" textAnchor="middle" fill="#998680" fontFamily="Georgia,serif" fontSize="7" letterSpacing="2">PORCHLIT · PEN &amp; WASH</text></>}
  </g>
 </svg>;
}
