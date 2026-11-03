import {bedroomCorner} from './bedroom-corner.js';
import {SearchPart} from './search-interaction.jsx';
import {MiniFigure} from './mini-figure.jsx';
import React from 'react';
import {Part,Rod,Ring,Tiles} from './brick-interior.jsx';
import {UpstairsItem} from './upstairs-interaction.jsx';
const cream='#f4e8d5',rose='#c99caa',gold='#b78b45';
export function MiniBasket(){return <group>
 <Part p={[0,.07,0]} s={[.66,.07,.48]} c="#b7956c" radius={.035}/>
 {[...Array(8)].map((_,i)=><group key={i}>{[-1,1].map(side=><React.Fragment key={side}><Part p={[0,.12+i*.038,side*.23]} s={[.66,.022,.025]} c={i%2?'#b79874':'#c9ac87'} radius={.004}/><Part p={[side*.32,.12+i*.038,0]} s={[.025,.022,.46]} c={i%2?'#c9ac87':'#b79874'} radius={.004}/></React.Fragment>)}</group>)}
 {Array.from({length:12},(_,i)=><group key={i}>{[-1,1].map(side=><Part key={side} p={[-.30+i*.055,.25,side*.235]} s={[.015,.30,.018]} c="#d4b58c" radius={.003}/>)}</group>)}
 {[-1,1].map(side=><Ring key={side} p={[side*.32,.43,0]} radius={.10} tube={.013} c="#b7956c" r={[0,Math.PI/2,0]}/>)}
 <SearchPart id="open" move={[-.45,.35,0]}><Part p={[-.09,.39,0]} s={[.42,.10,.35]} c={cream} radius={.018}/><Part p={[-.09,.45,.02]} s={[.4,.035,.32]} c={rose} radius={.012}/>
 {Array.from({length:9},(_,i)=><Part key={i} p={[-.25+i*.04,.48,.02]} s={[.008,.003,.30]} c={cream} radius={0}/>)}
 </SearchPart><group position={[.19,.44,-.02]} rotation={[.4,0,.12]}><Rod radius={.10} length={.15} c="#c99caa"/><Ring radius={.101} tube={.008} c="#e1cdb2" r={[Math.PI/2,0,0]}/></group>
 </group>}
export function KitchenRail(){return <group>
 <Rod radius={.018} length={1.22} r={[0,0,Math.PI/2]} c={gold}/>{[-.55,.55].map(x=><Rod key={x} p={[x,0,-.06]} radius={.025} length={.13} r={[Math.PI/2,0,0]} c={gold}/>)}
 {[-.43,-.16,.12,.4].map((x,i)=><group key={x} position={[x,-.10,0]}><Ring radius={.045} tube={.008} arc={Math.PI*1.5} c={gold}/>{i===0?<><Part p={[0,-.30,0]} s={[.28,.35,.035]} c="#b88c63" radius={.035}/><Part p={[0,-.10,0]} s={[.065,.12,.035]} c="#b88c63" radius={.01}/></>:i===1?<><Rod p={[0,-.20,0]} radius={.015} length={.30} c={gold}/><mesh position={[0,-.4,0]} scale={[.055,.085,.02]}><sphereGeometry args={[1,12,8]}/><meshStandardMaterial color={gold} metalness={.5} roughness={.35}/></mesh></>:i===2?<><Part p={[0,-.25,0]} s={[.018,.32,.024]} c="#9a7867"/><Part p={[0,-.43,0]} s={[.10,.13,.025]} c="#9a7867" radius={.02}/></>:<><Part p={[0,-.32,0]} s={[.25,.48,.025]} c={cream}/>{[-.08,0,.08].map(x=><Part key={x} p={[x,-.32,.016]} s={[.018,.47,.005]} c={rose}/>)}</>}</group>)}
 </group>}
export function Slippers(){return <group>{[-.14,.14].map((x,i)=><group key={x} position={[x,.05,0]} rotation={[0,i?.10:-.1,0]}><Part s={[.19,.045,.37]} c="#e1cdb2" radius={.05}/><Part p={[0,.06,-.06]} s={[.19,.09,.21]} c={rose} radius={.04}/><Part p={[0,.07,.065]} s={[.13,.045,.06]} c={cream} radius={.02}/></group>)}</group>}
export function KeepsakeBox({open=false,children}){return <group>
 <Tiles p={[0,.08,0]} s={[.85,.08,.60]} nx={6} nz={4} c={cream}/>{[-.41,.41].map(x=><Part key={x} p={[x,.24,0]} s={[.045,.32,.60]} c={cream}/>)}{[-.28,.28].map(z=><Part key={z} p={[0,.24,z]} s={[.78,.32,.04]} c={cream}/>)}
 {[-.25,.25].map(x=><Part key={x} p={[x,.24,.305]} s={[.045,.30,.015]} c={rose}/>)}<Part p={[0,.30,.316]} s={[.11,.10,.025]} c={gold}/>
 <SearchPart id="open" position={[0,.41,-.30]} turn={[-1.6,0,0]}><Tiles p={[0,0,.30]} s={[.91,.06,.65]} nx={7} nz={5} c={cream}/><Part p={[0,.037,.30]} s={[.14,.01,.65]} c={rose}/></SearchPart><group position={[0,.14,0]}>{children}</group>
 </group>}
export function Pinboard(){return <group><Part s={[1.10,.76,.055]} c="#b88c63" radius={.012}/><Part p={[0,0,.035]} s={[1.02,.68,.025]} c="#d6bea0"/>{[[-.29,.12,-.08],[.21,.15,.10],[-.17,-.19,.04],[.29,-.19,-.09]].map(([x,y,r],i)=><group key={i} position={[x,y,.06]} rotation={[0,0,r]}><Part s={[.35,.25,.008]} c={i%2?'#fff6e7':'#ead6d7'} radius={.003}/><Rod p={[0,.105,.012]} radius={.013} length={.008} r={[Math.PI/2,0,0]} c={gold}/>{[0,1,2].map(j=><Part key={j} p={[-.01,.04-j*.045,.006]} s={[.20-j*.035,.005,.002]} c="#b49c8b" radius={0}/>)}</group>)}</group>}
const objects={figure:MiniFigure,basket:MiniBasket,herbs:KitchenRail,slippers:Slippers,keepsake:KeepsakeBox,pinboard:Pinboard};
export function DioramaPreview({kind,children}){const type=kind.replace('diorama-',''),Object=objects[type];return <group position={[0,type==='pinboard'?0:-.5,0]} scale={type==='figure'?3:type==='herbs'?2.3:type==='slippers'?5:type==='pinboard'?2.7:3}><Object/>{['keepsake','basket'].includes(type)?<group position={[0,.15,0]}>{children}</group>:<group position={[0,.05,.2]}>{children}</group>}</group>}
export function DioramaAccents({floor,room}){const place=(id,p,child)=><UpstairsItem key={id} id={id} pivot={p}><group position={p}>{child}</group></UpstairsItem>;return <group>
 {floor==='1F'&&room!=='kitchen'&&place('livingBasket',[-4.42,0,1.9],<MiniBasket/>)}
 {floor==='1F'&&room!=='living'&&place('kitchenRail',[.30,1.9,-3.85],<KitchenRail/>)}
 {floor==='2F'&&room==='bedroom'&&<>{place('bedroomSlippers',[-2.85,0,.5],<Slippers/>)}{place('bedroomKeepsake',bedroomCorner.keepsake,<KeepsakeBox/>)}</>}
 {floor==='2F'&&room==='study'&&place('studyPinboard',[.25,2.3,-3.85],<Pinboard/>)}
 </group>}
export function WallDetails({theme}){return <group>
 <Part p={[0,3.48,-3.84]} s={[10.10,.055,.07]} c={theme.trim}/><Part p={[-5.02,3.48,0]} s={[.07,.055,7.7]} c={theme.trim}/>
 <Part p={[0,.09,-3.83]} s={[10.10,.08,.10]} c={theme.trim}/><Part p={[-5.01,.09,0]} s={[.10,.08,7.7]} c={theme.trim}/>
 {[-3.9,-2.5,-1.1,.3,1.7,3.1,4.5].map(x=><group key={x}><Part p={[x,.60,-3.865]} s={[.014,.64,.016]} c={theme.trim}/><Part p={[x+.56,.60,-3.865]} s={[.014,.64,.016]} c={theme.trim}/>{[.28,.92].map(y=><Part key={y} p={[x+.28,y,-3.865]} s={[.56,.014,.016]} c={theme.trim}/>)}</group>)}
 </group>}
