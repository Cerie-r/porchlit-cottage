import {SeatTarget} from './seat-interaction.jsx';
import {useRoomLight,accentLevel} from './room-lighting.jsx';
import {MaterialOwner} from './decor-context.jsx';
import {CarvedLine,ShellCrest,CabrioleLeg,CabinetCrown,RococoPanel} from './rococo-details.jsx';
import {StudyChair} from './study-chair.jsx';
import {SearchPart} from './search-interaction.jsx';
import {MicroGarden} from './micro-botanical.jsx';
import {useDaylight} from './home-lighting.jsx';
import {WindowLight} from './window-light.jsx';
import {FloorBooks,MoonLamp,HangingStars} from './little-touches.jsx';
import {UpstairsItem,UpstairsHotspot,UpstairsContext} from './upstairs-interaction.jsx';
import React,{useMemo,useContext} from 'react';
import * as THREE from 'three';
import {Part,Rod,Ring,Tiles,Courses} from './brick-interior.jsx';
import {TextileRug,BotanicalFrame,Curtain,CraftDetails,StudyBalustrade} from './study-details.jsx';
import {WorkbenchModel} from './animal-model.jsx';
import {TailorCorner} from './tailor-corner.jsx';
import {formPiece} from './tailor-state.js';
const cream='#f4e8d5',edge='#e1cdb2',wood='#b88c63',rose='#c99caa',gold='#b78b45';
const click=fn=>e=>{e.stopPropagation();if(e.delta<5)fn();};
const hover={onPointerOver:()=>document.body.style.cursor='pointer',onPointerOut:()=>document.body.style.cursor='default'};
function Books({count=7}){return <group>{Array.from({length:count},(_,i)=><group key={i} position={[(i-count/2)*.105,0,0]} rotation={[0,0,i===0?.09:0]}><Part p={[0,.19+(i%3)*.015,0]} s={[.09,.38+(i%3)*.03,.22]} c={['#b99786','#849486','#d6b69d','#e3cfb2','#9b8e99'][i%5]} radius={.004}/>{[.07,.29].map(y=><Part key={y} p={[0,y,.113]} s={[.066,.012,.007]} c={edge}/>)}</group>)}</group>;}
function Blooms({p=[0,0,0],scale=1}){return <group position={p}><MicroGarden scale={scale*.64} color={cream}/></group>;}
function Lamp({p}){const light=useRoomLight(),level=accentLevel(light,'desk');return <group position={p} onClick={e=>{if(e.delta>5||light.editing)return;e.stopPropagation();light.patch({lamp:'desk'});}}><Rod radius={.16} length={.035}/><Rod p={[0,.28,0]} radius={.022} length={.55}/><group position={[0,.59,0]}><mesh><cylinderGeometry args={[.1,.23,.24,24,1,true]}/><meshStandardMaterial color={cream} side={THREE.DoubleSide} roughness={.5}/></mesh><Rod p={[0,-.12,0]} radius={.23} length={.014}/><mesh position={[0,-.123,0]} rotation={[-Math.PI/2,0,0]}><circleGeometry args={[.21,24]}/><meshStandardMaterial color="#ffe7b8" emissive="#ffc77a" emissiveIntensity={.6*level}/></mesh></group><pointLight position={[0,.46,.1]} color="#ffda9d" intensity={.6*level} distance={2.3}/></group>;}
function Drawer({x=0,y,w=.62}){return <group position={[x,y,0]}><Part role="paint" s={[w,.22,.035]} c={edge}/><Part role="paint" p={[0,0,.024]} s={[w-.035,.185,.025]} c={cream} radius={.035}/><CarvedLine radius={.009} points={[[-w*.4,.05,.045],[0,.08,.045],[w*.4,.05,.045]]}/><Rod p={[0,0,.055]} radius={.024} length={.035} r={[Math.PI/2,0,0]}/></group>;}
// The computer and the printer can be moved over what they stand on while the
// house is being arranged; then a tap picks them instead of switching them on.
export function Desk({onArt}){const {decorMode}=useContext(UpstairsContext);return <group position={[-1.75,0,-2.7]} userData={{supportId:'studyDesk'}}>
 <Part role="top" p={[0,1.14,0]} s={[2.65,.09,1.05]} nx={12} nz={5} c={cream}/><Part role="top" p={[0,1.08,0]} s={[2.69,.045,1.09]} c={edge}/>
 {[-1.16,1.16].flatMap(x=>[-.4,.4].map(z=><CabrioleLeg key={`${x}-${z}`} x={x} z={z} height={1.09}/>))}<CarvedLine points={[[-1.25,.9,.54],[-.7,.81,.54],[0,.94,.54],[.7,.81,.54],[1.25,.9,.54]]}/>

 <Part role="paint" p={[0,1.025,.51]} s={[2.43,.025,.04]} c={edge}/><Part role="paint" p={[0,.94,-.43]} s={[2.4,.28,.055]} c={cream}/><UpstairsHotspot id="studyDesk"><group position={[0,.95,.49]}>{[-.87,0,.87].map(x=><Drawer key={x} x={x} y={0} w={.83}/>)}</group></UpstairsHotspot>
 <UpstairsItem id="studyComputer" pivot={[0,1.19,0]} inherit><group onClick={decorMode?undefined:click(()=>onArt('draw'))} {...hover}>
 <Part p={[0,1.74,-.22]} s={[1.24,.80,.065]} c="#b99c8b" radius={.02}/><Part p={[0,1.75,-.18]} s={[1.15,.69,.015]} c="#fff8e9"/>
 <Part p={[0,1.76,-.168]} s={[.98,.54,.008]} c="#f3ebdc"/><Part p={[-.38,1.76,-.161]} s={[.13,.49,.005]} c="#e8d4ce"/>
 {['#c69ba8','#94a58a','#d7b887'].map((c,i)=><Rod key={c} p={[-.38,1.88-i*.1,-.15]} radius={.025} length={.008} r={[Math.PI/2,0,0]} c={c}/>)}
 <Rod p={[0,1.3,-.22]} radius={.038} length={.22} c="#b99c8b"/><Part p={[0,1.2,-.22]} s={[.43,.035,.25]} c="#c5ad98"/>
 <Part p={[0,1.205,.28]} s={[.94,.035,.30]} c={edge}/>{Array.from({length:12},(_,x)=>Array.from({length:4},(_,z)=><Part key={`${x}-${z}`} p={[-.42+x*.075,1.228,.18+z*.065]} s={[.063,.018,.05]} c={cream} radius={.004}/>))}
 <Part p={[.7,1.23,.3]} s={[.13,.07,.22]} c={cream} radius={.025}/>
 </group></UpstairsItem><Lamp p={[1.03,1.2,-.23]}/><Blooms p={[-1.04,1.2,-.25]} scale={.8}/>
 <group position={[-.76,1.2,.15]}><Rod p={[0,.09,0]} radius={.065} length={.18} c={rose}/>{[-.035,0,.035].map((x,i)=><Part key={x} p={[x,.23,0]} s={[.017,.3,.017]} r={[0,0,x*3]} c={i%2?gold:'#7d6e64'}/>)}</group>
 <StudyChair/>
 </group>;}
export function StudyPrinter({p=[.5,0,-2.7],onArt,queued=0}){const {decorMode}=useContext(UpstairsContext);return <group position={p} userData={{supportId:'studyPrinter'}}><CarvedLine points={[[-.64,1.19,.46],[-.34,1.14,.46],[0,1.2,.46],[.34,1.14,.46],[.64,1.19,.46]]}/>
 <Part role="paint" p={[0,.65,-.39]} s={[1.27,1.15,.09]} nx={7} ny={10} c={cream}/>{[-.62,.62].map(x=><Part role="paint" key={x} p={[x,.65,0]} s={[.08,1.15,.82]} nx={1} ny={10} c={cream}/>)}
 <Part role="paint" p={[0,1.27,0]} s={[1.4,.085,.94]} nx={7} nz={4} c={cream}/><Part role="paint" p={[0,.13,0]} s={[1.32,.09,.86]} c={edge}/>
 <Part role="paint" p={[-.11,.69,0]} s={[.06,1.05,.79]} c={cream}/><group position={[-.36,0,.43]}>{[.32,.58,.84,1.1].map(y=><Drawer key={y} y={y} w={.43}/>)}</group>
 {[.4,.72,1.04].map(y=><group key={y}><Part role="paint" p={[.26,y,0]} s={[.66,.035,.79]} c={cream}/>{[0,1,2].map(i=><Part key={i} p={[.26,y+.03+i*.017,.09]} s={[.48,.012,.57]} c={i%2?'#fffaf0':'#e5d8c9'}/>)}</group>)}
 <UpstairsItem id="studyPrintPreview" pivot={[-.10,1.32,0]} inherit><group position={[-.10,1.32,0]} onClick={decorMode?undefined:click(()=>onArt('print'))} {...hover}>
 <Part p={[0,.16,0]} s={[.95,.30,.64]} c={edge}/><Part p={[0,.31,0]} s={[.96,.045,.66]} nx={6} nz={3} c={cream}/>
 <Part p={[0,.16,.326]} s={[.72,.07,.015]} c="#64564c"/><Part p={[0,.10,.42]} s={[.74,.025,.25]} c={cream}/><Part p={[0,.37,-.2]} s={[.72,.035,.19]} c={cream}/><Part p={[.30,.34,.13]} s={[.16,.018,.10]} c="#afa99a"/>
 <Rod p={[.40,.34,.14]} radius={.019} length={.015} c={queued?'#9cb985':'#bba697'}/>
 {queued>0&&<Part p={[0,.13,.46]} s={[.54,.008,.30]} c="#fff9ee"/>}
 </group></UpstairsItem></group>;}
export function Reading({onRead,onTarot}){return <group position={[-3.65,0,-1.1]} onClick={click(onRead)} {...hover}><SeatTarget id="studyReading" height={.68} depth={.18}>
 {[-.4,.4].flatMap(x=>[-.32,.32].map(z=><CabrioleLeg key={`${x}-${z}`} x={x} z={z} height={.3}/>))}<CarvedLine points={[[-.5,1.29,-.3],[-.3,1.4,-.3],[0,1.47,-.3],[.3,1.4,-.3],[.5,1.29,-.3]]}/><ShellCrest position={[0,1.45,-.29]} scale={.45}/>
 <Part p={[0,.40,0]} s={[1.05,.27,.96]} nx={5} nz={4} c={rose} finish="fabric"/><SearchPart id="open" move={[0,.55,-.25]} turn={[-.3,0,0]}><Part p={[0,.59,.05]} s={[.73,.18,.69]} c="#dcb7bd" finish="fabric" radius={.09}/></SearchPart>
 {[-.48,.48].map(x=><group key={x}><Part p={[x,.62,0]} s={[.18,.50,.96]} nx={1} ny={7} c={rose} finish="fabric"/><Part p={[x,.89,0]} s={[.21,.09,.96]} c="#d7adb5" finish="fabric" radius={.025}/></group>)}
 <Part p={[0,.95,-.4]} s={[1.04,.8,.16]} nx={10} ny={8} c={rose} finish="fabric"/><Part p={[0,1.01,-.29]} s={[.72,.53,.1]} c="#ddbdc2" finish="fabric" radius={.09}/>
 <group position={[.03,.73,.12]} rotation={[-.12,-.2,0]}><Part s={[.47,.04,.32]} c="#9ba288"/><Part p={[0,.026,0]} s={[.44,.015,.29]} c="#fff5df"/><Part p={[0,.04,0]} s={[.012,.008,.29]} c={edge}/>{[-.14,-.07,.07,.14].map(x=><Part key={x} p={[x,.04,0]} s={[.04,.005,.19]} c="#d6c6ac"/>)}</group>
 <group position={[1.02,0,.05]}><group position={[0,.78,.06]} rotation={[0,.2,0]} onClick={onTarot?click(onTarot):undefined}><Part s={[.32,.07,.4]} c={cream} radius={.025}/><Part p={[0,.04,0]} s={[.29,.018,.37]} c="#e5cbb8" radius={.018}/><Ring p={[0,.054,0]} r={[Math.PI/2,0,0]} radius={.075} tube={.006} c={gold}/><Part p={[0,.06,.01]} s={[.018,.007,.09]} c={gold}/></group><Rod p={[0,.34,0]} radius={.06} length={.65} c={wood}/><Rod p={[0,.06,0]} radius={.25} length={.07} c={wood}/><Rod p={[0,.7,0]} radius={.30} length={.07} c={wood}/><Rod p={[-.17,.77,-.14]} radius={.07} length={.035} c={cream}/><Rod p={[-.17,.84,-.14]} radius={.05} length={.12} c={cream}/><Ring p={[-.12,.85,-.14]} radius={.06} tube={.012} c={cream}/></group>
 {/* At the foot of the little reading table: the chair's other side is the room's front edge. */}
 <group position={[1.03,0,.52]} rotation={[0,.5,0]}><FloorBooks/></group>
 </SeatTarget></group>;}
export function Shelf({position=[-3.85,0,-2.7],children}){return <group position={position}><CabinetCrown position={[0,2.93,.24]} width={1.2}/>
 {[-.53,.53].map(x=><Part role="paint" key={x} p={[x,1.48,0]} s={[.09,2.85,.55]} nx={1} ny={18} c={cream}/>)}
 <Part role="paint" p={[0,1.48,-.23]} s={[1,2.85,.05]} nx={5} ny={18} c={edge}/>{[.22,.72,1.25,1.78,2.31,2.9].map(y=><Part role="paint" key={y} p={[0,y,0]} s={[1.16,.07,.6]} nx={6} nz={3} c={cream}/>)}
 {[.76,1.29,1.82,2.35].map((y,i)=><SearchPart key={y} id={"shelf"+i} position={[.03,y,.1]} move={[.75,0,.25]} axis="right"><Books count={8}/></SearchPart>)}{children}<SearchPart id="drawer" position={[0,.45,.3]} move={[0,0,.55]} axis="down"><Drawer y={0} w={.98}/><Part role="paint" p={[0,-.1,-.25]} s={[.94,.035,.5]} c={edge}/>{[-.46,.46].map(x=><Part role="paint" key={x} p={[x,0,-.25]} s={[.025,.2,.5]} c={cream}/>)}<Part role="paint" p={[0,0,-.49]} s={[.94,.2,.025]} c={cream}/></SearchPart>{[-.25,.25].map(x=><group key={x}><Part role="paint" p={[x,1.17,-.37]} s={[.4,.24,.025]} c={cream}/><Part role="paint" p={[x,1.06,-.31]} s={[.4,.025,.14]} c={edge}/>{[-.19,.19].map(dx=><Part role="paint" key={dx} p={[x+dx,1.17,-.31]} s={[.025,.24,.14]} c={edge}/>)}</group>)}<Blooms p={[.08,2.95,0]} scale={.7}/></group>;}
function ArchedWindow(){const day=useDaylight();const shape=useMemo(()=>{const s=new THREE.Shape();s.moveTo(-1.25,0);s.lineTo(1.25,0);s.lineTo(1.25,1.1);s.absarc(0,1.1,1.25,0,Math.PI,false);s.lineTo(-1.25,0);return s;},[]);return <group position={[-1.75,1.25,-3.84]}>
 <mesh position={[0,0,.02]}><shapeGeometry args={[shape,32]}/><meshStandardMaterial color={day>.5?"#d8e1dd":"#354864"} roughness={.12} metalness={.22} emissive={day>.5?"#e7d8b3":"#7188b4"} emissiveIntensity={.12}/></mesh>
 {[-1.3,1.3].map(x=><Part role="trim" key={x} p={[x,.55,.09]} s={[.10,1.1,.15]} nx={1} ny={8} c={cream}/>)}
 <group position={[0,1.1,.08]}>{Array.from({length:25},(_,i)=>{const a=i*Math.PI/24;return <Part role="trim" key={i} p={[Math.cos(a)*1.3,Math.sin(a)*1.3,0]} s={[.17,.10,.15]} r={[0,0,a+Math.PI/2]} c={cream}/>;})}</group>
 <Part role="trim" p={[0,1.13,.13]} s={[.045,2.23,.05]} c={cream}/><Part role="trim" p={[0,.8,.13]} s={[2.5,.045,.05]} c={cream}/><Part role="trim" p={[0,1.1,.13]} s={[2.5,.045,.05]} c={cream}/><Part role="trim" p={[0,-.05,.17]} s={[2.85,.10,.4]} nx={14} nz={2} c={cream}/>
 <pointLight position={[0,1.4,.55]} color="#ffdc98" intensity={day*1.1} distance={5}/><Rod p={[0,2.42,.19]} length={3.2} radius={.025} r={[0,0,Math.PI/2]}/>
 {[-1,1].map(side=><Curtain key={side} side={side}/>)}
 {/* The arched glass runs from 1.25 to 3.6 above the floor, which is 1.25 below this group. */}
 <WindowLight kind="arch" width={2.5} bottom={1.25} top={3.6} position={[0,-1.25,.04]}/>
 </group>;}
export function StudyRoom({onArt,onCraft,onRead,onTarot,queued}){const interaction=useContext(UpstairsContext);return <group>
 {/* The wall between the arched window and the back corner: a moon lamp and paper stars, so it is not a blank corner at night. */}
 <group position={[-4.99,2.45,-1.75]} rotation={[0,Math.PI/2,0]}><MoonLamp/></group>
 <group position={[-4.72,0,0]}><HangingStars/></group>
 <group position={[-1.2,0,-.6]} rotation={[0,Math.PI/2,0]}><MaterialOwner id="room:study"><ArchedWindow/></MaterialOwner><UpstairsItem id="studyDesk" pivot={[-1.75,0,-2.7]}><Desk onArt={onArt}/></UpstairsItem><UpstairsItem id="studyShelf" pivot={[-3.85,0,-2.7]}><Shelf/></UpstairsItem><UpstairsItem id="studyReading" pivot={[-3.65,0,-1.1]}><Reading onRead={onRead} onTarot={onTarot}/></UpstairsItem></group><UpstairsItem id="studyPrinter" pivot={[-1.05,0,-2.85]}><StudyPrinter p={[-1.05,0,-2.85]} onArt={onArt} queued={queued}/></UpstairsItem>
 <UpstairsItem id="studyCraft" pivot={[2,0,-2.85]}><group position={[2.0,0,-2.85]}><WorkbenchModel onClick={click(onCraft)} drawers={false}/><CraftDetails/><group position={[0,1.75,-.57]}>{[-1.2,-.6].flatMap((x,xi)=>[0,.28].map((y,yi)=><UpstairsHotspot id={"studyBox"+(xi*2+yi)} pivot={[x,y,0]} key={`${x}-${y}`}><group><Part role="paint" p={[x,y,0]} s={[.54,.25,.32]} c={cream}/><Part role="paint" p={[x,y+.13,0]} s={[.56,.025,.34]} c={edge}/><ShellCrest position={[x,y-.03,.175]} scale={.3}/></group></UpstairsHotspot>))}</group><Part role="paint" p={[0,2.23,-.57]} s={[3.25,.07,.5]} nx={16} nz={2} c={cream}/><group position={[-.7,2.28,-.55]}><Books count={9}/></group><Blooms p={[.8,2.72,-.56]} scale={.8}/><Blooms p={[-.75,1.10,.12]} scale={.75}/></group>
 </UpstairsItem><UpstairsItem id="studyTailor" pivot={[4.42,0,-3.05]}><group position={[4.42,0,-3.05]}><TailorCorner piece={formPiece(interaction.tailor)}/></group></UpstairsItem><UpstairsItem id="studyRug" pivot={[.1,0,.75]}><TextileRug/></UpstairsItem><StudyBalustrade/>
 <UpstairsItem id="studyFrame1" pivot={[-1.9,2.75,-3.72]}><BotanicalFrame id="studyFrame1" p={[-1.9,2.75,-3.72]} scale={.8}/></UpstairsItem><UpstairsItem id="studyFrame2" pivot={[-1.05,2.87,-3.72]}><BotanicalFrame id="studyFrame2" p={[-1.05,2.87,-3.72]}/></UpstairsItem><Blooms p={[-.65,1.32,-2.85]} scale={.65}/>

 </group>;}
