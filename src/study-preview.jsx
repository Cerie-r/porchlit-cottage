import React from 'react';
import {Desk,StudyPrinter,Reading,Shelf} from './study-room.jsx';
import {TextileRug,CraftDetails} from './study-details.jsx';
import {WorkbenchModel} from './animal-model.jsx';
export function StudyObjectPreview({kind,children}){if(kind==='study-shelf')return <Shelf position={[0,-1.4,0]}>{children}</Shelf>;if(kind==='study-reading')return <group position={[3.65,-.8,1.1]}><Reading onRead={()=>{}}/><group position={[-3.65,.51,-1.05]}>{children}</group></group>;if(kind==='study-rug')return <group position={[-.1,-.3,-.75]} scale={.85}><TextileRug/><group position={[.1,.04,1.65]} scale={[5,1,1]}>{children}</group></group>;if(kind==='study-computer')return <group position={[1.75,-1.1,2.7]}><Desk onArt={()=>{}}/></group>;if(kind==='study-print-preview')return <StudyPrinter p={[0,-1.05,0]} onArt={()=>{}}/>;return <group position={[0,-1.2,0]} scale={.8}><WorkbenchModel drawers={false}/><CraftDetails/></group>}
