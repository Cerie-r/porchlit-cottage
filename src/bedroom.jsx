import {bedroomCorner} from './bedroom-corner.js';
import {SeatTarget,BedTarget} from './seat-interaction.jsx';
import {useRoomLight,accentLevel} from './room-lighting.jsx';
import {CabrioleLeg,ShellCrest,OvalFrame,CarvedLine,RococoPanel,CabinetCrown} from './rococo-details.jsx';
import {VanityMirror} from './vanity-mirror.jsx';
import {Drape,Lace} from './bedroom-textiles.jsx';
import {FabricMaterial} from './surfaces.jsx';
import {useDaylight} from './home-lighting.jsx';
import {SearchPart,useSearch,StorageSlotRange} from './search-interaction.jsx';
import {AnimalModel} from './animal-model.jsx';
import {freshAnimal} from './animal-state.js';
import React,{useState,useContext} from 'react';
import {Part,Rod,Ring,Tiles,Courses} from './brick-interior.jsx';
import {UpstairsItem,UpstairsContext} from './upstairs-interaction.jsx';
import {MiniFigure} from './mini-figure.jsx';
import {TextileRug,BotanicalFrame} from './study-details.jsx';
import {OursAt} from './ours-seam.jsx';
const cream='#f4e8d5',edge='#e1cdb2',rose='#c99caa',gold='#b78b45';
export function BedroomBed({reveal=false,children}){return <group userData={{supportId:"bed-toys"}}>
 {[-1.05,1.05].flatMap(x=>[-1.55,1.55].map(z=><Rod key={`${x}-${z}`} p={[x,.19,z]} radius={.065} length={.35} c={gold}/>))}
 <Part role="paint" p={[0,.4,0]} s={[2.45,.25,3.55]} c={cream} radius={.07}/><Part p={[0,.59,0]} s={[2.37,.23,3.43]} c="#fff8ee" radius={.1} finish="fabric" slot="sheet"/>
 <RococoPanel position={[0,.46,-1.79]} width={2.61} height={1.44} depth={.12}/><RococoPanel position={[0,.61,-1.64]} width={2.37} height={1.15} depth={.07} color={rose} fabric slot="headboard"/><ShellCrest position={[0,1.86,-1.52]} scale={.85}/>
 <RococoPanel position={[0,.29,1.67]} width={2.48} height={.47} depth={.08}/><ShellCrest position={[0,.63,1.77]} scale={.55}/>
 <SearchPart id="quilt" move={[0,.4,-.9]} turn={[-.18,0,0]}><Drape/><Drape slot="throw" width={3.12} depth={.62} position={[0,.9,1.05]} color={rose}/></SearchPart>
 {[-.6,.6].map((x,i)=><SearchPart key={x} id={i?"right":"left"} position={[x,.83,-1.03]} rotation={[-.13,0,i?-.035:.035]} move={[i?.25:-.25,.5,-.25]} turn={[-.55,0,0]}><Part s={[1.02,.26,.65]} c="#fff8ef" finish="fabric" slot="pillow" radius={.12}/><Lace width={1.03} position={[0,.07,.33]}/></SearchPart>)}
 <OursAt spot="bed"/>
 <group>{children}</group>
 </group>}
export function BedroomNightstand({open=false,children}){return <group><CarvedLine points={[[-.42,.74,.4],[-.22,.7,.4],[0,.75,.4],[.22,.7,.4],[.42,.74,.4]]}/>
 {[-.34,.34].flatMap(x=>[-.25,.25].map(z=><Rod key={`${x}-${z}`} p={[x,.12,z]} radius={.035} length={.24} c={gold}/>))}
 <Part role="paint" p={[0,.45,-.34]} s={[.86,.65,.04]} c={edge}/>{[-.41,.41].map(x=><Part role="paint" key={x} p={[x,.45,0]} s={[.04,.65,.72]} c={edge}/>)}<Part role="paint" p={[0,.80,0]} s={[.94,.06,.79]} c={cream} radius={.035}/>
 {[.16,.45].map(y=><Part role="paint" key={y} p={[0,y,0]} s={[.8,.035,.7]} c={edge}/>)}{[.31,.59].map((y,i)=><SearchPart key={y} id={i===1?"open":"lower"} move={[0,0,.62]} axis="down"><Part role="paint" p={[0,y,.38]} s={[.76,.23,.04]} c={cream}/><Rod p={[0,y,.42]} radius={.024} length={.035} r={[Math.PI/2,0,0]} c={gold}/>{<><Part role="paint" p={[0,y-.11,.05]} s={[.71,.03,.62]} c={edge}/>{[-.35,.35].map(x=><Part role="paint" key={x} p={[x,y,.05]} s={[.025,.21,.62]} c={cream}/>)}<Part role="paint" p={[0,y,-.25]} s={[.71,.21,.025]} c={cream}/><StorageSlotRange.Provider value={i===1?0:4}><group position={[0,y-.08,.05]} scale={.6}>{children}</group></StorageSlotRange.Provider></>}</SearchPart>)}
 <OursAt spot="nightstand"/>
 </group>}
function BedsideLamp({selectId='bedroomNightstand'}){const light=useRoomLight(),id=selectId==='bedroomChair'?'reading':'bedside',level=accentLevel(light,id),lit=level>0,c=useContext(UpstairsContext);return <group position={[0,.85,0]} onClick={e=>{e.stopPropagation();if(e.delta>5)return;if(c.decorMode)c.onSelect(selectId);else light.patch({lamp:id});}}><Rod radius={.17} length={.025} c={gold}/><Rod p={[0,.26,0]} radius={.02} length={.5} c={gold}/><mesh position={[0,.51,0]}><cylinderGeometry args={[.13,.26,.3,32,1,true]}/><meshStandardMaterial color={cream} side={2} emissive={lit?'#ffddb0':'#000000'} emissiveIntensity={lit?.25:0}/></mesh><Ring p={[0,.36,0]} radius={.26} tube={.012} r={[Math.PI/2,0,0]} c={gold}/>{lit&&<pointLight position={[0,.33,0]} color="#ffd09a" intensity={1.4*level} distance={3.2}/>}</group>}
export function BedroomWardrobe({open=false,children}){return <group><ShellCrest position={[0,2.48,.04]} scale={.85}/><CarvedLine points={[[-.9,2.46,.4],[-.5,2.51,.4],[0,2.6,.4],[.5,2.51,.4],[.9,2.46,.4]]}/><Part role="paint" p={[0,1.25,-.34]} s={[1.7,2.3,.08]} c={edge}/>{[-.85,.85].map(x=><Part role="paint" key={x} p={[x,1.25,0]} s={[.08,2.3,.76]} c={cream}/>)}<Part role="paint" p={[0,2.44,0]} s={[1.86,.08,.86]} c={cream} radius={.03}/><Part role="paint" p={[0,.12,0]} s={[1.8,.12,.8]} c={edge}/><Part role="paint" p={[0,1.25,0]} s={[1.65,.04,.7]} c={cream}/>{[-1,1].map(side=><SearchPart key={side} id={side<0?"left":"right"} position={[side*.85,1.28,.4]} turn={[0,side*1.9,0]} axis="right"><Part role="paint" p={[-side*.41,0,0]} s={[.81,2.24,.055]} c={cream}/><Part role="paint" p={[-side*.41,0,.033]} s={[.69,2.10,.025]} c={edge}/><RococoPanel position={[-side*.41,-.94,.05]} width={.62} height={1.91} depth={.018} color={cream}/><Rod p={[-side*.72,0,.10]} radius={.022} length={.28} c={gold}/>{side<0&&<OursAt spot="wardrobeLeftDoor"/>}</SearchPart>)}<group position={[0,1.29,0]} scale={.8}>{children}</group></group>}
export function BedroomVanity({children}){return <group>
 <Part role="top" p={[0,.96,0]} s={[1.9,.09,.87]} c="#fff5e9" radius={.2}/><Part role="top" p={[0,.905,0]} s={[1.82,.035,.81]} c="#cbb28c" radius={.16}/>
 {[-.77,.77].flatMap(x=>[-.28,.28].map(z=><CabrioleLeg key={`${x}-${z}`} x={x} z={z}/>))}
 {[-1,1].map(side=><SearchPart key={side} id={side<0?'drawerLeft':'drawerRight'} move={[0,0,.48]} axis="down"><Part role="paint" p={[side*.59,.77,.31]} s={[.54,.22,.07]} c={cream} radius={.065}/><Part role="paint" p={[side*.59,.67,0]} s={[.51,.035,.6]} c={edge}/>{[-.24,.24].map(dx=><Part role="paint" key={dx} p={[side*.59+dx,.77,0]} s={[.025,.2,.6]} c={cream}/>)}<Part role="paint" p={[side*.59,.77,-.29]} s={[.5,.2,.025]} c={cream}/><Ring p={[side*.59,.77,.37]} radius={.045} tube={.009} c="#cbb28c"/><StorageSlotRange.Provider value={side<0?4:8}><group position={[side*.59,.69,0]} scale={.65}>{children}</group></StorageSlotRange.Provider></SearchPart>)}
 <CarvedLine points={[[-.84,.69,.35],[-.46,.65,.35],[0,.74,.35],[.46,.65,.35],[.84,.69,.35]]}/><ShellCrest position={[0,.73,.37]} scale={.55}/>
 <OvalFrame/><group position={[0,.05,0]}><VanityMirror/></group>
 <OursAt spot="vanity"/>
 <group position={[.64,1.02,.09]} scale={.65}><StorageSlotRange.Provider value={0}><SmallStorageBox>{children}</SmallStorageBox></StorageSlotRange.Provider></group>
 <Rod p={[-.64,1.02,.08]} radius={.17} length={.025} c="#cbb28c"/>{[-.7,-.55].map((x,i)=><group key={x}><Rod p={[x,1.10,.08]} radius={i?.045:.055} length={i?.13:.16} c={i?'#d5b9c6':'#dce1d3'}/><Rod p={[x,1.19,.08]} radius={.028} length={.025} c="#cbb28c"/></group>)}
 </group>}

function Legs({w=.6,d=.4,h=.4}){return [-1,1].flatMap(x=>[-1,1].map(z=><CabrioleLeg key={`${x}-${z}`} x={x*w} z={z*d} height={h}/>));}
export function BedroomBench({children}){return <group><CarvedLine points={[[-.85,.39,.38],[-.5,.29,.38],[0,.4,.38],[.5,.29,.38],[.85,.39,.38]]}/><ShellCrest position={[0,.28,.39]} scale={.4}/><Legs w={.78} d={.28} h={.2}/><Part role="paint" p={[0,.2,0]} s={[1.8,.05,.72]} c={cream}/>{[-.87,.87].map(x=><Part role="paint" key={x} p={[x,.35,0]} s={[.06,.3,.72]} c={cream}/>)}{[-.33,.33].map(z=><Part role="paint" key={z} p={[0,.35,z]} s={[1.74,.3,.06]} c={cream}/>)}<SearchPart id="open" position={[0,.53,-.36]} turn={[-1.7,0,0]}><Part p={[0,0,.36]} s={[1.86,.18,.78]} c="#f5e6db" radius={.08} finish="fabric"/><Lace width={1.8} position={[0,-.04,.76]}/></SearchPart><group position={[0,.51,0]} scale={.65}>{children}</group></group>;}
export function BedroomChair({children}){return <group><CarvedLine points={[[-.51,1.19,-.22],[-.4,1.45,-.22],[0,1.53,-.22],[.4,1.45,-.22],[.51,1.19,-.22]]}/><ShellCrest position={[0,1.49,-.21]} scale={.45}/><Legs w={.42} d={.35} h={.28}/><Part role="paint" p={[0,.38,0]} s={[1.1,.24,.94]} c={cream} radius={.1}/><Part p={[0,.93,-.35]} s={[1.1,1.05,.24]} c={cream} radius={.22} finish="fabric"/>{[-.49,.49].map(x=><Part key={x} p={[x,.68,0]} s={[.2,.36,.95]} c={cream} radius={.1} finish="fabric"/>)}<SearchPart id="open" position={[0,.56,.08]} move={[0,.6,-.2]} turn={[-.8,0,0]}><Part s={[.78,.18,.76]} c="#f4e4d9" radius={.09} finish="fabric"/></SearchPart><group position={[0,.48,0]} scale={.5}>{children}</group></group>;}
export function BedroomTable(){return <group>{[-.24,.24].flatMap(x=>[-.24,.24].map(z=><CabrioleLeg key={`${x}-${z}`} x={x} z={z} height={.75}/>))}<ShellCrest position={[0,.65,.34]} scale={.35}/><Part role="top" p={[0,.79,0]} s={[.88,.07,.88]} radius={.19} c={cream}/><Rod p={[.13,.9,0]} radius={.09} length={.15} c="#f9eee4"/><Ring p={[.23,.91,0]} radius={.05} tube={.012} r={[0,Math.PI/2,0]} c={edge}/><Part p={[-.14,.85,.05]} s={[.22,.04,.26]} c={rose}/>{/* the reading lamp sits on the table, so nobody standing by the chair walks into a floor lamp */}<group position={[-.04,-.02,-.25]}><BedsideLamp selectId="bedroomChair"/></group></group>;}
export function BedroomShelf({children}){return <group><CarvedLine points={[[-.8,-.09,.15],[-.45,-.17,.15],[0,-.1,.15],[.45,-.17,.15],[.8,-.09,.15]]}/><Part role="paint" s={[1.8,.09,.34]} c={cream}/>{[-.65,.65].map(x=><Part role="paint" key={x} p={[x,-.17,-.08]} s={[.06,.3,.19]} c={edge}/>)}{[-.6,-.42,-.24,-.06].map((x,i)=><Part key={x} p={[x,.24,0]} s={[.13,.42,.23]} c={['#b9c2aa','#dfb7bd','#d9c8ae','#b6a3b4'][i]}/>)}<group position={[.5,.05,0]}><StorageSlotRange.Provider value={0}><SmallStorageBox>{children}</SmallStorageBox></StorageSlotRange.Provider></group></group>;}
function VanityStool(){return <group position={[0,0,1.05]}><Legs w={.23} d={.23} h={.46}/><mesh position={[0,.52,0]} scale={[1,.4,1]}><sphereGeometry args={[.36,24,12]}/><FabricMaterial owner="bedroomVanity" color={rose}/></mesh></group>;}
export function Bedroom({}){return <group>
 <UpstairsItem id="bedroomBench" pivot={[-.55,0,-.9]}><group position={[-.55,0,-.9]} rotation={[0,Math.PI/2,0]}><SeatTarget id="bedroomBench" height={.62}><BedroomBench/></SeatTarget></group></UpstairsItem>
 <UpstairsItem id="bedroomChair" pivot={[1.35,0,1.5]}><group position={[1.35,0,1.5]} rotation={[0,.22,0]}><SeatTarget id="bedroomChair" height={.65}><BedroomChair/></SeatTarget></group></UpstairsItem>
 <UpstairsItem id="bedroomSideTable" pivot={bedroomCorner.table}><group position={bedroomCorner.table}><BedroomTable/></group></UpstairsItem>
 <UpstairsItem id="bedroomShelf" pivot={[-4.92,2.15,-1]}><group position={[-4.92,2.15,-1]} rotation={[0,Math.PI/2,0]}><BedroomShelf/></group></UpstairsItem>

 <UpstairsItem id="bedroomBed" pivot={[-3.15,0,-.9]}><group position={[-3.15,0,-.9]} rotation={[0,Math.PI/2,0]}><BedTarget id="bedroomBed"><BedroomBed/></BedTarget></group></UpstairsItem>
 <UpstairsItem id="bedroomNightstand" pivot={[-4.45,0,.95]}><group position={[-4.45,0,.95]} rotation={[0,Math.PI/2,0]}><BedroomNightstand/><BedsideLamp/></group></UpstairsItem>
 <UpstairsItem id="bedroomWardrobe" pivot={[3.65,0,-3.1]}><group position={[3.65,0,-3.1]}><BedroomWardrobe/></group></UpstairsItem>
 {/* The little figure stands on the vanity and goes where it goes. */}
 <UpstairsItem id="bedroomVanity" pivot={[1.4,0,-3.1]}><group position={[1.4,0,-3.1]}><BedroomVanity/><VanityStool/></group><UpstairsItem id="bedroomFigure" pivot={[1.4,.98,-3.13]}><group position={[1.4,.98,-3.13]}><MiniFigure/></group></UpstairsItem></UpstairsItem>
 <UpstairsItem id="bedroomRug" pivot={[-2.65,0,-.65]}><group position={[-2.65,0,-.65]} rotation={[0,Math.PI/2,0]}><group position={[-.1,0,-.75]}><TextileRug/></group></group></UpstairsItem>
 {/* On the free wall between the window and the vanity. It used to hang at
     x -3.5, inside the window's own frame, where nothing of it showed. */}
 <UpstairsItem id="bedroomFrame" pivot={[.2,2.3,-3.86]}><BotanicalFrame id="bedroomFrame" p={[.2,2.3,-3.86]} scale={1.1}/></UpstairsItem>
 </group>}
export function BedroomPreview({kind,children}){if(kind==='bedroom-bench')return <group position={[0,-.5,0]}><BedroomBench>{children}</BedroomBench></group>;if(kind==='bedroom-chair')return <group position={[0,-.7,0]}><BedroomChair>{children}</BedroomChair></group>;if(kind==='bedroom-table')return <BedroomTable/>;if(kind==='bedroom-shelf')return <group scale={1.8}><BedroomShelf>{children}</BedroomShelf></group>;if(kind==='bedroom-bed')return <group position={[0,-.65,0]} scale={.8}><BedroomBed>{children}</BedroomBed></group>;if(kind==='bedroom-nightstand')return <group position={[0,-.8,0]} scale={2}><BedroomNightstand>{children}</BedroomNightstand></group>;if(kind==='bedroom-wardrobe')return <group position={[0,-1.2,0]}><BedroomWardrobe>{children}</BedroomWardrobe></group>;return <group position={[0,-1,0]} scale={1.3}><BedroomVanity>{children}</BedroomVanity></group>}

function SmallStorageBox({children}){return <group><ShellCrest position={[0,.09,.16]} scale={.32}/><Part role="paint" s={[.5,.025,.3]} c={cream}/>{[-.24,.24].map(x=><Part role="paint" key={x} p={[x,.12,0]} s={[.02,.24,.3]} c={cream}/>)}{[-.14,.14].map(z=><Part role="paint" key={z} p={[0,.12,z]} s={[.46,.24,.02]} c={cream}/>)}<SearchPart id="open" position={[0,.26,-.15]} turn={[-1.7,0,0]}><Part p={[0,0,.15]} s={[.53,.03,.33]} c={rose}/></SearchPart><group position={[0,.03,0]} scale={.5}>{children}</group></group>;}

