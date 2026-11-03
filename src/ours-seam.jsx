import React from 'react';

// A home's own things live in src/ours/ and are not part of the public
// release; they come only to that home (ours-pack.js). Each module there may
// export `spots`: { spotName: [{Item, position, rotation, scale}] }, positions
// in the frame of the object the spot is on. Until they come (and for every
// other home), every spot is simply empty.
//
// Spots so far (all in the bedroom):
//   bed               on the bed, in the bed's own frame
//   nightstand        on the bedside table
//   wardrobeLeftDoor  on the left wardrobe door (swings open with it)
//   vanity            on the dressing table, mirror frame included
import {spots} from './ours-spots.js';

export function OursAt({spot}){
  const pieces=spots[spot];
  if(!pieces?.length)return null;
  return <>{pieces.map(({Item,position=[0,0,0],rotation=[0,0,0],scale=1},i)=><group key={i} position={position} rotation={rotation} scale={scale}><Item/></group>)}</>;
}
