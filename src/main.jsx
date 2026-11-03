import './compat.js';
import {cleanAlbumMemory,rememberAlbum} from './album-memory.js';
import {withBuiltinToys} from './builtin-toys.jsx';
import {cleanReceipts, receiveMail} from './mail-receipts.js';
import {FurnitureLabels} from './furniture-labels.jsx';
import {residentLocation} from './resident-location.js';
import {SeatContext,SeatTarget} from './seat-interaction.jsx';
import {SEAT_VIEWS} from './resident-together.js';
import {TvPictureContext} from './tv-screen.jsx';
import {cleanFinish} from './legacy-finishes.js';
import {RoomLightContext,useHouseLights,useRoomLight,accentLevel,CeilingLamp,LightRemote} from './room-lighting.jsx';
import {SampleBook} from './sample-book.jsx';
import {DecorationProvider,MaterialOwner,useDecoration} from './decor-context.jsx';
import {decorValue,roomFor,lacedPieces} from './decor-state.js';
import {WallpaperMaterial} from './wallpaper.jsx';
import {WindowLight} from './window-light.jsx';
import {curtainGaps} from './window-light-shape.js';
import {movedDefaults,repairLayout,nowResting} from './layout-repairs.js';
import {moveBy,turnBy,moveResting,placeAt,wallPieces,restingPieces,floorPieces,builtPiece,builtPieces,builtOverlaps,overlapsFor,shownIn,FLOOR_LEVEL,buildSize,hangOn,nudgeHung} from './furniture-range.js';
import {FloorTarget,OverlapHint,BuiltOverlapHint} from './floor-target.jsx';
import {validRecipe} from './brick-recipe.js';
import {TiebackBow,SillCat,FairyLights,WallClock} from './little-touches.jsx';
import {Gramophone} from './gramophone.jsx';
import {musicHome,musicAway,setMusicMood,gramophoneNext,moodFor,setMusicOn,musicState,onMusicChange} from './music.js';
import {play,isMuted,setMuted,startRain,stopRain,isRaining,prepareRain} from './sounds.js';
import {playPart,placedSound} from './house-sounds.js';
import {GalleryFrames,FramedArt} from './frames.jsx';
import {CloseupCamera} from './closeup-camera.jsx';
import {RoomCamera,cameraPlaces,furnitureViews} from './room-camera.jsx';
import {SurfaceProvider,SurfaceScope,SurfaceControls,FabricMaterial,FloorControls,useFloorLayout,Parquet} from './surfaces.jsx';
import {useQuietMotion} from './quiet-motion.jsx';
import {QuietCanvas} from './quiet-canvas.jsx';
import {LetterSurface} from './letter-surface.jsx';
import {SearchBook,SearchLivingRug} from './search-objects.jsx';
import {spotsFor,placeLetter,migrateLetters} from './hiding-spots.js';
import {SearchContext,SearchPart,useSearch} from './search-interaction.jsx';
import {clamp,searchParts,slotVisible,loadSearch,searchHint,clickSearchPart} from './search-state.js';
import {MiniMaterial,relief} from './miniature-finish.jsx';
import {DaylightContext,HomeZoneContext,useHomeClock,HomeClockSettings} from './home-lighting.jsx';
import {Sky} from './sky.jsx';
import {StreetMap} from './street-map.jsx';
import {porchLook} from './street-layout.js';
import {DioramaAccents,DioramaPreview,WallDetails} from './diorama-details.jsx';
import {FurnitureTint} from './furniture-tint.jsx';
import {Bedroom,BedroomPreview} from './bedroom.jsx';
import {Icon} from './icons.jsx';
import {StudyPalette} from './study-palette.jsx';
import {StudyObjectPreview} from './study-preview.jsx';
import {UpstairsContext,UpstairsItem,upstairsItems} from './upstairs-interaction.jsx';
import {StudyRoom} from './study-room.jsx';
import {PrintStation} from './print-station.jsx';
import {StudyComputer} from './study-computer.jsx';
import {Tarot} from './tarot.jsx';
import {ResidentPortraits,ResidentPanel} from './residents.jsx';
import {LivingResidents} from './resident-motion.jsx';
import {cleanHideSeek,hidingOn,cleanVisit,enterVisit,markFound,kissFor,foundMessage,enterMessage,dayIn,newSeed,WIGGLE_AFTER,VISIT_KEY} from './hide-and-seek.js';
import {spotPlacement,availableSpots,placementIn,spotOpeners} from './hide-and-seek-spots.js';
import {readWardrobe,wardrobeKey,cleanWardrobe} from '../body/wardrobe-state.js';
import {cleanDrawn,wearOnlyDrawn} from '../body/drawn.js';
import {closetOf,storedWardrobe,wardrobeKnown} from './machine-closet.js';
import {PhotoSurface} from './art-model.jsx';
import {installPhoto,collectPrint} from './art-state.js';
import {FreePlacement} from './free-placement.jsx';
import {newDoll,validAnimal} from './animal-state.js';
import {cleanCapsules,turnDial,exchange} from './capsules.js';
import {homeNotes} from './capsule-notes.js';
import {CapsuleMachine} from './capsule-overlay.jsx';
import {cleanCaught,payClaw,keepDoll} from './claw.js';
import {stockOf,cleanSpent,spend,costOf,short,ownColours} from './bench-stock.js';
import {availableSpecies} from './doll-catch.js';
import {ClawMachine} from './claw-overlay.jsx';
import {cleanBlindBox,payBox,keepThing} from './blind-box.js';
import {BlindBoxMachine} from './blindbox-overlay.jsx';
import {WorkbenchModel} from './animal-model.jsx';
import {validBouquet} from './florist.jsx';
import React, { Suspense, useContext, useEffect, useLayoutEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { createRoot } from "react-dom/client";
import { Canvas, useFrame, useLoader, useThree } from "@react-three/fiber";
import {keepShadowsStill} from "./still-shadows.js";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import "./styles.css";
import porch from "./porch.js";
import { PorchCard, PorchLamp, usePorch } from "./porch-light.jsx";
import {loadOurs,noteOurs,onOursLoaded,oursExpected,oursLoaded} from './ours-load.js';
import "./porch-light.css";
import {HouseMenu,menuIcons} from "./house-menu.jsx";
import "./house-menu.css";
import { RefrigeratorPreview,fridgeSlots, DrawerDetail, HideContext, hideSpots, storageAppearance } from "./brick-interior.jsx";
import { BrickKitchen as KitchenArea, BrickSofa as SoftSofa, BrickArmchair as ReadingChair, BrickCoffeeTable as OvalCoffeeTable, BrickFloorPlant as FloorPlant, BrickTvUnit, BrickDining, kitchenFurniture, smallFurniture } from "./brick-interior.jsx";

import {Workshop,StorageInventory,ContainerObjects,TableObjects} from './workshop.jsx';
import {Backpack} from './backpack.jsx';
import {cleanTickets,earnTicket} from './tickets.js';
import {albumOf} from './album.js';
import {diaryDays} from './diary-days.js';
import {useVisit,VisitPlate,MailPanel,useOwnDoor,DoorPanel,DoorThings} from './door.jsx';
import {leading} from './words.js';
import {emptyDraft,validBuild,moveItem,shiftItem,placeItem,dropItem} from './workshop-state.js';
import {DessertTable} from './dessert-table.jsx';
import {CookingTable} from './cooking-table.jsx';
import {pantryOf} from './cooking-pantry.js';
import {Tailor} from './tailor.jsx';
import {cleanTailor,freshTailor,registerSewn,unpickAt} from './tailor-state.js';
import {tailorSpot} from './tailor-place.js';
import {DessertBook} from './dessert-book.jsx';
import {GARDEN,clueOf,hideClue} from './puzzle-folder.js';
import {openFolder} from './folder-open.js';
import {DessertContext,DomeTag,DINING_PAIR} from './dessert-dining.jsx';
import {freshDessertState,loadDessertState,domeItem,putInDome,finishMeal,writeTasteWords} from './dessert-state.js';
import {validDessert} from './dessert-recipe.js';
import {validDish} from './cooking-recipe.js';

import {palette,roomData,interiorThemes,floorFinishes,furnitureCatalog} from './house-catalog.js';
import {houseShells,DEFAULT_SHELL,knownShell,knownSeasonShell,shellOf,shownShell,wearShell} from './house-shells.js';
import {ShellPicker} from './shell-picker.jsx';
import {cleanRoses,addKiss} from './roses.js';
import {cleanNights,addNight,nightOf,hourIn} from './nights.js';
import {RoseCount} from './rose-count.jsx';
import {cluesShowing,pickupWords} from './clue-pickup.js';
import {cleanMachine,freshMachine,unseen,markSeen,hiddenThings,askHint,markHiddenFound,foundNow,tableTaken,callAs,playScene,calledName,sceneNow,lapseScenes,markStash,unstash,seekableAt} from './machine-acts.js';
import {cleanExplore,waitAtDoor,leaveDoor,startTrip,homecoming,isHome,outingNow} from './explore-trips.js';
import {readTrip,readStrayTrip,writeTrip,dropTrip,savedExplore} from './explore-session.js';
import {findName,foundShelf,placesOpen} from './explore-places.js';
import {OutingButton,OutingPanel} from './door-outing.jsx';
import {awaitBottles,bottleAnswer,bottlesIn,cleanBottles,openBottle,threwBottle,thrownToday} from './bottles.js';
import {CalledContext} from './machine-names.js';
import {useMachineActs,MachineVisit,HiddenTag,HiddenIcon,hiddenLabel} from './machine-visit.jsx';

const defaultHomeState = {
  version: 4,
  creations: [],
  album: {},
  capsules: cleanCapsules(null),
  // The kinds of doll this home has caught or been given; the bear it always has.
  caught: [],
  // What this home has found in the blind boxes, each once.
  blindbox: {found: []},
  mailReceipts: [],
  // A new doll wears only what this home has drawn: at first, nothing.
  craftDraft: newDoll([]),
  craftDrafts: {},
  ...freshDessertState(),
  hideSeek: {seed: null, book: [], total: 0},
  shell: DEFAULT_SHELL,
  seasonShell: null,
  roses: cleanRoses(null),
  nights: cleanNights(null),
  tailor: freshTailor(),
  // What AIs living here asked to do, as it was let in or not (src/machine-acts.js).
  machine: freshMachine(),
  // Going out together into the exploring book (src/explore-trips.js): what was found, the trips, the door.
  explore: cleanExplore(null),
  // What making things has used up of what was brought home (src/bench-stock.js).
  spent: cleanSpent(null),
  // Drift bottles (src/bottles.js): the ones brought home from the lake not opened yet, and a log for the diary.
  bottles: cleanBottles(null),
  furniture: {
    ...kitchenFurniture,
    livingWindow: {position:[-2.45,1.9,-3.83],rotationY:0},
    wallArt: {position:[...movedDefaults.wallArt.to],rotationY:0},
    wallShelf: {position:[-4.98,2.34,-.35],rotationY:0},
    wallPictures: {position:[-4.97,2.65,1.05],rotationY:0},
    wallClock: {position:[-4.98,2.45,-2.3],rotationY:0},
    rug: { position: [-2.15,.015,-.48], rotationY: 0 },
    sofa: { position: [-.62,.43,-.45], rotationY: -Math.PI/2 },
    coffeeTable: { position: [-2.4,.34,-.48], rotationY: Math.PI/2 },
    // On the coffee table, in its own frame (the cup on the tray); see restingPieces.
    coffeeTray: { position: [-.45,.17,0], rotationY: 0, on: 'coffeeTable' },
    coffeeMug: { position: [-.11,.09,.01], rotationY: 0, on: 'coffeeTray' },
    greenBook: { position: [.4,.18,.02], rotationY: .18, on: 'coffeeTable' },
    roseBook: { position: [.56,.25,0], rotationY: -.08, on: 'coffeeTable' },
    armchair: { position: [-2.28,.38,-2.16], rotationY: .62 },
    tvUnit: { position: [-3.88,.34,-.55], rotationY: Math.PI/2 },
    lamp: { position: [...movedDefaults.lamp.to], rotationY: movedDefaults.lamp.toRotationY },
    floorPlant: { position: [-3.62,.03,-2.48], rotationY: -.18 },
    gramophone: { position: [-3.7,0,1.3], rotationY: 1.2 }
  },
  containers: {
    tvUnit: { leftOpen: false, rightOpen: false, slots: { left: null, right: null } }
  }
};

Object.entries({sinkRun:'水槽操作台',stove:'灶台与烟机',cornerCabinet:'转角地柜',prepCabinet:'备餐柜',upperLeft:'左吊柜',upperRight:'右吊柜',refrigerator:'冰箱',island:'岛台',stoolLeft:'左吧凳',stoolRight:'右吧凳',diningTable:'餐桌',diningChair1:'餐椅一',diningChair2:'餐椅二',diningChair3:'餐椅三'}).forEach(([id,label])=>{
  furnitureCatalog[id]={label,placement:'floor',radius:id==='sinkRun'?2.2:.65,interactions:['move','rotate']};
});

Object.entries(upstairsItems).forEach(([id,[label,kind]])=>{furnitureCatalog[id]={label,placement:'floor',bounds:[-2,2,-2,2]};defaultHomeState.furniture[id]={position:[0,0,0],rotationY:0,...(restingPieces[id]&&nowResting.includes(id)?{on:restingPieces[id].on}:{})};hideSpots[id]=[label,kind];});

function freshHomeState() {
  const home=JSON.parse(JSON.stringify(defaultHomeState));return {...home,creations:withBuiltinToys(home.creations)};
}

Object.entries(smallFurniture).forEach(([id,v])=>{furnitureCatalog[id]={label:v.label,placement:'surface',step:.05,bounds:v.bounds};});
Object.assign(furnitureCatalog,{
 livingWindow:{label:'窗户与窗帘',placement:'backWall',bounds:[-3.3,3.3,.8,2.4]},
 wallArt:{label:'墙上挂画',placement:'backWall',bounds:[-4.4,4.4,1.4,3.1]},
 wallShelf:{label:'墙上置物架与画',placement:'sideWall',bounds:[-3.1,3.1,1.3,2.9]},
 wallPictures:{label:'墙上小相框',placement:'sideWall',bounds:[-3.1,3.1,1.4,3.1]},
 wallClock:{label:'墙上挂钟',placement:'sideWall',bounds:[-3.1,3.1,1.5,2.7]}
});

defaultHomeState.furniture.bedroomWindow={...defaultHomeState.furniture.livingWindow,position:[...defaultHomeState.furniture.livingWindow.position]};
furnitureCatalog.bedroomWindow={...furnitureCatalog.livingWindow,label:"卧室窗户与窗帘"};
// Floor pieces get their range from furniture-range.js. Things hanging on a wall
// slide along it, and little things stay on what they sit on.
for(const [id,v] of Object.entries({...wallPieces,...restingPieces}))if(furnitureCatalog[id])Object.assign(furnitureCatalog[id],v);

function loadHomeState() {
  try {
    const raw = JSON.parse(localStorage.getItem("porchlit-home-layout-v1"));
    const saved=raw?migrateLetters(raw):raw;
    if (!saved?.furniture) return freshHomeState();
    const migratedFurniture = Object.fromEntries(Object.entries(saved.furniture).map(([id,item])=>[id,{...item,...(item.color?{color:cleanFinish(item.color)}:{})}]));
    if ((saved.version || 1) < 4) {
      Object.assign(migratedFurniture, freshHomeState().furniture);
    }
    // A home from before the tailor's corner gets it beside the craft bench, or nearby if something stands there.
    if (!saved.furniture.studyTailor) migratedFurniture.studyTailor = tailorSpot({...freshHomeState().furniture, ...migratedFurniture}, saved.creations);
    return {
      version: 4,
      mailReceipts: cleanReceipts(saved.mailReceipts),
      album: cleanAlbumMemory(saved.album),
      capsules: cleanCapsules(saved.capsules),
      caught: cleanCaught(saved.caught),
      blindbox: cleanBlindBox(saved.blindbox),
      creations: withBuiltinToys(Array.isArray(saved.creations)?saved.creations:[]),
      artDrafts: Array.isArray(saved.artDrafts)?saved.artDrafts:[],
      computer: saved.computer||{},
      residents:saved.residents||{},
      printJobs:Array.isArray(saved.printJobs)?saved.printJobs:[],
      craftDraft: saved.craftDraft||newDoll(cleanCapsules(saved.capsules).dolls),
      craftDrafts: saved.craftDrafts||{},
      ...loadDessertState(saved),
      hideSeek: cleanHideSeek(saved.hideSeek),
      tickets: cleanTickets(saved.tickets,{foundBefore:cleanHideSeek(saved.hideSeek).total,lastFound:cleanHideSeek(saved.hideSeek).book.at(-1)?.day}),
      shell: knownShell(saved.shell),
      seasonShell: knownSeasonShell(saved.seasonShell),
      roses: cleanRoses(saved.roses),
      nights: cleanNights(saved.nights),
      tailor: cleanTailor(saved.tailor),
      machine: cleanMachine(saved.machine),
      explore: cleanExplore(saved.explore),
      spent: cleanSpent(saved.spent),
      bottles: cleanBottles(saved.bottles),
      tvOn: !!saved.tvOn,
      tvPicture:saved.tvPicture||'window',
      furniture: repairLayout({ ...freshHomeState().furniture, ...migratedFurniture }),
      containers: {
        ...freshHomeState().containers,
        ...saved.containers,
        tvUnit: {
          ...freshHomeState().containers.tvUnit,
          ...saved.containers?.tvUnit,
          slots: { ...freshHomeState().containers.tvUnit.slots, ...saved.containers?.tvUnit?.slots }
        }
      }
    };
  } catch {
    return freshHomeState();
  }
}

const exteriorThemes = {
  creamRose: {
    cream: "#eee2d8", plaster: "#f7eee7", ivory: "#fff7ee", pearl: "#f8ece5",
    blush: "#e5cfd0", rose: "#c98aa5", roseDeep: "#9b607b", lavender: "#b896d0", lavenderDeep: "#76558f",
    sage: "#507359", sageLight: "#769073", roof: "#292630", roofPale: "#45404c",
    stone: "#d8cbc0", wood: "#7d6963", metal: "#28252d", gold: "#d7aa58", glass: "#ead9df",
    room: "#f4d6b4",
    lawn: "#c7d3ba", hedge: "#8aa486", leafLight: "#a9bea2", lilac: "#dccdea"
  }
};

const finishes = {
  matte: { roughness: .78, metalness: 0 },
  fabric: { roughness: .96, metalness: 0 },
  wood: { roughness: .64, metalness: 0 },
  lacquer: { roughness: .36, metalness: .02 },
  stone: { roughness: .42, metalness: 0 },
  metal: { roughness: .3, metalness: .48 }
};

const roundedUnit = new RoundedBoxGeometry(1, 1, 1, 4, 0.12);
const plushUnit = new RoundedBoxGeometry(1, 1, 1, 8, 0.23);
const outlineInk = "#8f5f6d";

function Box({ position, scale, color, rotation = [0, 0, 0], onClick, emissive, roughness = 0.78 }) {
  return (
    <mesh position={position} scale={scale} rotation={rotation} castShadow receiveShadow onClick={onClick}>
      <boxGeometry args={[1, 1, 1]} />
      <meshStandardMaterial color={color} roughness={roughness} emissive={emissive || "#000000"} emissiveIntensity={emissive ? 0.42 : 0} />
    </mesh>
  );
}

function SoftBox({ position, scale, color, rotation = [0, 0, 0], onClick, emissive, roughness, finish = "matte", outline = true }) {
  const surface = finishes[finish] || finishes.matte;
  return (
    <group position={position} scale={scale} rotation={rotation} onClick={onClick}>
      {outline && <mesh geometry={roundedUnit} scale={[1.025,1.025,1.025]}><meshBasicMaterial color={outlineInk} side={THREE.BackSide} transparent opacity={.62} /></mesh>}
      <mesh geometry={roundedUnit} castShadow receiveShadow>
        <MiniMaterial color={color} finish={finish} roughness={roughness ?? surface.roughness} metalness={surface.metalness} emissive={emissive || "#000000"} emissiveIntensity={emissive ? 0.48 : 0} />
      </mesh>
    </group>
  );
}

function PlushBox({ position, scale, color, rotation = [0, 0, 0], onClick, roughness = .97 }) {
  return (
    <group position={position} scale={scale} rotation={rotation} onClick={onClick}>
      <mesh geometry={plushUnit} scale={[1.028,1.028,1.028]}><meshBasicMaterial color={outlineInk} side={THREE.BackSide} transparent opacity={.58} /></mesh>
      <mesh geometry={plushUnit} castShadow receiveShadow>
        <meshPhysicalMaterial color={color} roughness={Math.min(roughness,.82)} metalness={0} sheen={.7} sheenRoughness={.72} sheenColor="#f5cad7" clearcoat={.04} />
      </mesh>
    </group>
  );
}

function BrickStud({ position, color, radius = .055, height = .035 }) {
  return (
    <mesh position={position} castShadow receiveShadow>
      <cylinderGeometry args={[radius, radius, height, 20]} />
      <meshStandardMaterial color={color} roughness={.42} />
    </mesh>
  );
}

function MicroBrick({ position = [0,0,0], scale = [1,.18,.4], color, rotation = [0,0,0], studs = [2,1], finish = "lacquer" }) {
  const [columns, rows] = studs || [0,0];
  const dots = [];
  if (columns && rows) {
    for (let ix=0; ix<columns; ix+=1) {
      for (let iz=0; iz<rows; iz+=1) {
        dots.push([
          ((ix+.5)/columns-.5)*scale[0]*.72,
          scale[1]/2+.025,
          ((iz+.5)/rows-.5)*scale[2]*.68
        ]);
      }
    }
  }
  return (
    <group position={position} rotation={rotation}>
      <SoftBox position={[0,0,0]} scale={scale} color={color} finish={finish} />
      {dots.map((dot,index)=><BrickStud key={index} position={dot} color={color} radius={Math.min(.055,scale[0]/(columns*5.5),scale[2]/(rows*4.6))} />)}
    </group>
  );
}

function RoundPiece({ position, scale, color, rotation = [0, 0, 0], emissive, onClick, outline = true }) {
  return (
    <group position={position} scale={scale} rotation={rotation} onClick={onClick}>
      {outline && <mesh scale={[1.025,1.025,1.025]}><cylinderGeometry args={[1,1,1,28]} /><meshBasicMaterial color={outlineInk} side={THREE.BackSide} transparent opacity={.55} /></mesh>}
      <mesh castShadow receiveShadow>
        <cylinderGeometry args={[1, 1, 1, 28]} />
        <meshStandardMaterial color={color} roughness={0.68} emissive={emissive || "#000000"} emissiveIntensity={emissive ? 0.48 : 0} />
      </mesh>
    </group>
  );
}

function HitArea({ position = [0, 0, 0], scale, onClick, label }) {
  return (
    <mesh
      position={position}
      scale={scale}
      aria-label={label}
      onPointerDown={(event) => event.stopPropagation()}
      onPointerUp={(event) => event.stopPropagation()}
      onPointerEnter={(event) => { event.stopPropagation(); document.body.style.cursor = "pointer"; }}
      onPointerLeave={() => { document.body.style.cursor = "default"; }}
      onClick={(event) => { event.stopPropagation(); onClick(); }}
    >
      <boxGeometry />
      <meshBasicMaterial transparent opacity={0} depthWrite={false} />
    </mesh>
  );
}

function VoxelBatch({ voxels, color, roughness = 0.82 }) {
  const mesh = useRef();

  useLayoutEffect(() => {
    if (!mesh.current) return;
    const block = new THREE.Object3D();
    voxels.forEach((voxel, index) => {
      block.position.set(...voxel.position);
      block.scale.set(...voxel.scale);
      block.rotation.set(...(voxel.rotation || [0, 0, 0]));
      block.updateMatrix();
      mesh.current.setMatrixAt(index, block.matrix);
    });
    mesh.current.instanceMatrix.needsUpdate = true;
  }, [voxels]);

  return (
    <instancedMesh ref={mesh} args={[null, null, voxels.length]} castShadow receiveShadow>
      <boxGeometry args={[1, 1, 1]} />
      <meshStandardMaterial color={color} roughness={roughness} />
    </instancedMesh>
  );
}

function GlassBox({ position, scale, rotation = [0, 0, 0] }) {
  return (
    <mesh position={position} scale={scale} rotation={rotation} castShadow receiveShadow>
      <boxGeometry args={[1, 1, 1]} />
      <meshPhysicalMaterial color="#f8f2ee" transparent opacity={0.34} roughness={0.14} transmission={0.22} thickness={0.18} />
    </mesh>
  );
}

function Window({ position, scale = [0.78, 1.08, 0.13] }) {
  return (
    <group position={position}>
      <Box position={[0, 0, 0]} scale={scale} color={palette.ivory} />
      <Box position={[0, 0, 0.08]} scale={[scale[0] - 0.14, scale[1] - 0.14, 0.08]} color={palette.amber} emissive={palette.amber} roughness={0.3} />
      <Box position={[0, 0, 0.15]} scale={[0.055, scale[1] - 0.12, 0.045]} color={palette.ivory} />
      <Box position={[0, 0, 0.15]} scale={[scale[0] - 0.12, 0.055, 0.045]} color={palette.ivory} />
    </group>
  );
}

function FacadeWindow({ position, rotation = [0, 0, 0], compact = false }) {
  const width = compact ? 0.72 : 0.86;
  const height = compact ? 0.82 : 1.12;
  return (
    <group position={position} rotation={rotation}>
      <Box position={[0, 0, 0]} scale={[width + 0.28, height + 0.3, 0.16]} color="#f8eee8" />
      <Window position={[0, 0, 0.12]} scale={[width, height, 0.13]} />
      <Box position={[0, -height / 2 - 0.18, 0.2]} scale={[width + 0.38, 0.14, 0.34]} color={palette.ivory} />
      <Box position={[0, height / 2 + 0.2, 0.18]} scale={[width + 0.46, 0.14, 0.28]} color={palette.ivory} />
      {!compact && (
        <group position={[0, -height / 2 - 0.3, 0.32]}>
          <Box position={[0, 0, 0]} scale={[width + 0.2, 0.16, 0.24]} color="#b57f94" />
          {[-0.32, -0.16, 0, 0.16, 0.32].map((x, index) => (
            <group key={x} position={[x, 0.12 + (index % 2) * 0.025, 0.02]}>
              <Box position={[0, -0.08, 0]} scale={[0.035, 0.18, 0.035]} color={palette.sage} />
              <Box position={[0, 0.03, 0]} scale={[0.085, 0.085, 0.085]} color={index % 3 === 1 ? "#f1d8d7" : palette.rose} />
            </group>
          ))}
        </group>
      )}
    </group>
  );
}

function Flower({ position, color = palette.rose, size = 0.18 }) {
  const petal = size * 0.48;
  const spread = size * 0.46;
  return (
    <group position={position}>
      <Box position={[0, -size * .7, 0]} scale={[size * 0.22, size * 1.5, size * 0.22]} color={palette.sage} />
      {[[0, .08, 0], [spread, .04, 0], [-spread, .04, 0], [0, .04, spread], [0, .04, -spread]].map((point, index) => (
        <Box key={index} position={point} scale={[petal, petal, petal]} color={index === 0 ? "#f7e1e4" : color} />
      ))}
    </group>
  );
}

function VoxelBush({ position, flip = 1 }) {
  const leaves = [
    [-.2, .1, 0, .32], [.08, .16, .04, .38], [.3, .09, -.03, .28],
    [-.05, .26, -.12, .3], [.18, .3, .12, .26]
  ];
  return (
    <group position={position} scale={[flip, 1, 1]}>
      {leaves.map(([x, y, z, s], index) => <Box key={index} position={[x, y, z]} scale={[s, s, s]} color={index % 2 ? "#91a08b" : palette.sage} />)}
      <Flower position={[-.14, .43, .08]} size={.13} />
      <Flower position={[.12, .48, -.02]} color="#edc6cf" size={.12} />
      <Flower position={[.3, .32, .1]} color="#f4ddd8" size={.1} />
    </group>
  );
}

function GardenCluster({ x, z, flip = 1 }) {
  return (
    <group position={[x, 0, z]}>
      <VoxelBush position={[0, 0, 0]} flip={flip} />
      <VoxelBush position={[.48 * flip, -.02, .22]} flip={flip} />
    </group>
  );
}

function Conservatory() {
  return (
    <group position={[-4.05, 0.85, -0.1]}>
      <Box position={[0, 0, 0]} scale={[2.3, 0.18, 3.15]} color={palette.stone} />
      <GlassBox position={[0, 1, -1.48]} scale={[2.2, 2, 0.08]} />
      <GlassBox position={[0, 1, 1.48]} scale={[2.2, 2, 0.08]} />
      <GlassBox position={[-1.05, 1, 0]} scale={[0.08, 2, 3]} />
      <GlassBox position={[1.05, 1, 0]} scale={[0.08, 2, 3]} />
      <GlassBox position={[-0.56, 2.05, 0]} scale={[1.45, 0.08, 3.2]} rotation={[0, 0, -0.52]} />
      <GlassBox position={[0.56, 2.05, 0]} scale={[1.45, 0.08, 3.2]} rotation={[0, 0, 0.52]} />
      {[-1.48, 0, 1.48].map((z) => <Box key={`ridge-${z}`} position={[0, 1.12, z]} scale={[2.25, 0.07, 0.08]} color={palette.ivory} />)}
      {[-1.05, 0, 1.05].map((x) => <Box key={`frame-${x}`} position={[x, 1, 0]} scale={[0.08, 2.12, 0.08]} color={palette.ivory} />)}
      {[-1.2, 0, 1.2].map((z) => <Flower key={z} position={[0, 0.35, z]} size={0.16} />)}
    </group>
  );
}

function RoofDetails() {
  const strips = [-2.45, -1.95, -1.45, -0.95, 0.95, 1.45, 1.95, 2.45];
  return (
    <group>
      {strips.map((x) => {
        const left = x < 0;
        const y = 5.98 - Math.abs(x) * 0.62;
        return <Box key={x} position={[x, y, 0]} scale={[0.075, 0.075, 4.78]} color="#8c8796" rotation={[0, 0, left ? 0.62 : -0.62]} />;
      })}
      <Box position={[0, 6.22, 0]} scale={[0.28, 0.22, 4.82]} color="#696675" />
      <Box position={[0, 4.35, 2.25]} scale={[6.7, 0.18, 0.2]} color={palette.ivory} />
      <Box position={[0, 4.35, -2.25]} scale={[6.7, 0.18, 0.2]} color={palette.ivory} />
    </group>
  );
}

function RoofVoxels() {
  const tiles = useMemo(() => {
    const pale = [];
    const deep = [];
    [-1, 1].forEach((side) => {
      for (let column = 0; column < 14; column += 1) {
        const x = side * (0.2 + column * 0.225);
        const y = 6.05 - Math.abs(x) * 0.62;
        for (let row = 0; row < 20; row += 1) {
          const z = -2.12 + row * 0.225 + (column % 2 ? 0.055 : -0.055);
          const voxel = {
            position: [x, y + 0.1, z],
            scale: [0.205, 0.055, 0.205],
            rotation: [0, 0, side < 0 ? 0.62 : -0.62]
          };
          ((column + row) % 3 === 0 ? pale : deep).push(voxel);
        }
      }
    });
    return { pale, deep };
  }, []);

  return (
    <group>
      <VoxelBatch voxels={tiles.deep} color="#777382" />
      <VoxelBatch voxels={tiles.pale} color="#8d8898" />
    </group>
  );
}

function FacadeMasonry() {
  const bricks = useMemo(() => {
    const blush = [];
    const pearl = [];
    for (let row = 0; row < 18; row += 1) {
      const y = 0.14 + row * 0.235;
      for (let column = 0; column < 26; column += 1) {
        const x = -2.98 + column * 0.235 + (row % 2 ? 0.115 : 0);
        if (Math.abs(x) > 3.05) continue;
        const inDoor = y < 2.45 && Math.abs(x) < 0.92;
        const inLowerWindow = Math.abs(y - 1.35) < 0.72 && [ -1.85, 1.85 ].some((center) => Math.abs(x - center) < 0.64);
        const inUpperWindow = Math.abs(y - 3.55) < 0.75 && [ -1.85, 0, 1.85 ].some((center) => Math.abs(x - center) < 0.64);
        if (inDoor || inLowerWindow || inUpperWindow) continue;
        const voxel = { position: [x, y, 2.145], scale: [0.18, 0.065, 0.045] };
        ((row + column) % 4 === 0 ? blush : pearl).push(voxel);
      }
    }
    return { blush, pearl };
  }, []);

  return (
    <group>
      <VoxelBatch voxels={bricks.pearl} color="#f7ebe4" />
      <VoxelBatch voxels={bricks.blush} color="#ead6d1" />
    </group>
  );
}

function Chimney() {
  return (
    <group position={[2.05, 5.72, -1.15]}>
      <Box position={[0, 0, 0]} scale={[0.62, 1.45, 0.72]} color="#c8a79d" />
      {[0.12, 0.48, 0.84].map((y) => <Box key={y} position={[0, y - .48, .38]} scale={[0.7, 0.08, 0.06]} color="#ead9d0" />)}
      <Box position={[0, 0.8, 0]} scale={[0.82, 0.16, 0.9]} color="#776f79" />
      <Box position={[0, 0.98, 0]} scale={[0.62, 0.2, 0.68]} color="#8c8290" />
    </group>
  );
}

function FrenchBalcony() {
  const bars = [-.76, -.57, -.38, -.19, 0, .19, .38, .57, .76];
  return (
    <group position={[0, 2.9, 2.48]}>
      <Box position={[0, 0, 0]} scale={[1.9, 0.12, 0.72]} color="#e9ddd4" />
      <Box position={[0, .68, .32]} scale={[1.92, .07, .07]} color="#9d7183" />
      {bars.map((x) => <Box key={x} position={[x, .36, .32]} scale={[.045, .7, .045]} color="#9d7183" />)}
      <Box position={[-.9, .34, 0]} scale={[.06, .72, .72]} color="#9d7183" />
      <Box position={[.9, .34, 0]} scale={[.06, .72, .72]} color="#9d7183" />
    </group>
  );
}

function PorchLantern({ x }) {
  return (
    <group position={[x, 1.82, 2.5]}>
      <Box position={[0, .25, -.04]} scale={[.09, .55, .09]} color="#675e64" />
      <Box position={[0, 0, 0]} scale={[.3, .38, .24]} color={palette.amber} emissive={palette.amber} roughness={.25} />
      <Box position={[0, -.23, 0]} scale={[.38, .08, .31]} color="#675e64" />
      <Box position={[0, .23, 0]} scale={[.38, .08, .31]} color="#675e64" />
    </group>
  );
}

function CorniceDentils() {
  const blocks = useMemo(() => {
    const result = [];
    [2.48, 4.28].forEach((y) => {
      for (let x = -2.92; x <= 2.92; x += .29) {
        result.push({ position: [x, y, 2.31], scale: [.15, .14, .18] });
      }
    });
    return result;
  }, []);
  return <VoxelBatch voxels={blocks} color="#fff7f0" />;
}

function HouseTrims() {
  const ys = Array.from({ length: 15 }, (_, index) => 0.16 + index * 0.29);
  return (
    <group>
      <Box position={[0, -0.02, 0]} scale={[6.65, 0.34, 4.62]} color="#e2d2c7" />
      <Box position={[0, 2.62, 2.17]} scale={[6.55, 0.22, 0.22]} color={palette.ivory} />
      <Box position={[0, 4.43, 2.17]} scale={[6.62, 0.24, 0.24]} color={palette.ivory} />
      {[-3.16, 3.16].flatMap((x) => ys.map((y, index) => (
        <Box key={`${x}-${y}`} position={[x, y, 2.12]} scale={[0.26, 0.16, index % 2 ? 0.28 : 0.22]} color={index % 2 ? "#f8eee8" : palette.ivory} />
      )))}
      {[-1.85, 1.85].flatMap((x) => [1.35, 3.55].map((y) => (
        <Box key={`planter-${x}-${y}`} position={[x, y - 0.68, 2.33]} scale={[1.02, 0.18, 0.34]} color="#c08a9e" />
      )))}
    </group>
  );
}

function DoorArch() {
  const stones = Array.from({ length: 11 }, (_, index) => {
    const angle = Math.PI * (index / 10);
    return [Math.cos(angle) * 0.74, 2.11 + Math.sin(angle) * 0.56, angle];
  });
  return (
    <group>
      {stones.map(([x, y, angle], index) => (
        <Box key={index} position={[x, y, 2.36]} scale={[0.18, 0.14, 0.14]} color={palette.ivory} rotation={[0, 0, angle - Math.PI / 2]} />
      ))}
      <Box position={[-0.83, 1.15, 2.34]} scale={[0.22, 2.05, 0.22]} color={palette.ivory} />
      <Box position={[0.83, 1.15, 2.34]} scale={[0.22, 2.05, 0.22]} color={palette.ivory} />
      <Box position={[0, 2.64, 2.48]} scale={[2.35, 0.18, 0.75]} color="#eee0d6" />
      <Box position={[-0.92, 1.42, 2.5]} scale={[0.18, 2.35, 0.18]} color={palette.ivory} />
      <Box position={[0.92, 1.42, 2.5]} scale={[0.18, 2.35, 0.18]} color={palette.ivory} />
    </group>
  );
}

function House({ onEnter }) {
  const doorRef = useRef();
  const [doorHover, setDoorHover] = useState(false);

  return (
    <group>
      <Box position={[0, -0.58, 0]} scale={[11.4, 0.24, 9]} color="#c8cdbd" />
      <Box position={[0, -0.42, 0]} scale={[10.9, 0.26, 8.5]} color={palette.lawn} />
      <Box position={[0, -0.05, 2.1]} scale={[2.1, 0.12, 4.25]} color={palette.stone} />
      <Box position={[0, 1.2, 0]} scale={[6.2, 2.8, 4.2]} color={palette.cream} />
      <Box position={[0, 3.55, 0]} scale={[6.2, 1.9, 4.2]} color="#f4e7df" />
      <FacadeMasonry />
      <HouseTrims />
      <CorniceDentils />

      <Box position={[-1.55, 5.05, 0]} scale={[3.9, 0.34, 4.7]} color={palette.roof} rotation={[0, 0, 0.62]} />
      <Box position={[1.55, 5.05, 0]} scale={[3.9, 0.34, 4.7]} color={palette.roof} rotation={[0, 0, -0.62]} />
      <RoofVoxels />
      <RoofDetails />
      <Chimney />
      <Box position={[0, 5.95, 0]} scale={[0.28, 1.2, 0.28]} color={palette.ivory} />
      <Box position={[0, 6.62, 0]} scale={[0.62, 0.18, 0.62]} color={palette.rose} />
      <Box position={[0, 4.94, 2.23]} scale={[1.55, 1.18, 0.3]} color="#f4e7df" />
      <FacadeWindow position={[0, 5.0, 2.42]} compact />
      <Box position={[-0.45, 5.72, 2.24]} scale={[1.22, 0.22, 0.65]} color={palette.roof} rotation={[0, 0, 0.57]} />
      <Box position={[0.45, 5.72, 2.24]} scale={[1.22, 0.22, 0.65]} color={palette.roof} rotation={[0, 0, -0.57]} />

      <FacadeWindow position={[-1.85, 3.55, 2.22]} />
      <FacadeWindow position={[1.85, 3.55, 2.22]} />
      <FacadeWindow position={[-1.85, 1.35, 2.22]} />
      <FacadeWindow position={[1.85, 1.35, 2.22]} />
      <FacadeWindow position={[0, 3.7, 2.24]} compact />
      <FrenchBalcony />
      <group position={[3.16, 3.5, 0.9]} rotation={[0, Math.PI / 2, 0]}>
        <FacadeWindow position={[0, 0, 0]} />
      </group>
      <group position={[3.16, 1.3, -0.75]} rotation={[0, Math.PI / 2, 0]}>
        <FacadeWindow position={[0, 0, 0]} />
      </group>
      <DoorArch />
      <PorchLantern x={-1.08} />
      <PorchLantern x={1.08} />

      <group
        ref={doorRef}
        position={[0, 0, 0]}
        onPointerEnter={(event) => { event.stopPropagation(); setDoorHover(true); document.body.style.cursor = "pointer"; }}
        onPointerLeave={() => { setDoorHover(false); document.body.style.cursor = "default"; }}
        onPointerDown={(event) => { event.stopPropagation(); }}
        onClick={(event) => { event.stopPropagation(); onEnter(); }}
      >
        <Box position={[0, 1.08, 2.2]} scale={[1.25, 2.25, 0.22]} color={doorHover ? "#a97888" : palette.roseDeep} emissive={doorHover ? "#c694a6" : null} />
        <Box position={[0, 2.03, 2.32]} scale={[0.86, 0.28, 0.08]} color={palette.amber} emissive={palette.amber} />
        <mesh position={[0.42, 1.0, 2.38]} castShadow>
          <sphereGeometry args={[0.08, 14, 14]} />
          <meshStandardMaterial color="#e8c681" metalness={0.4} roughness={0.4} />
        </mesh>
      </group>

      {[0, 1, 2].map((i) => <Box key={i} position={[0, 0.05 + i * 0.12, 2.85 + i * 0.22]} scale={[2.1 + i * 0.22, 0.13, 0.6]} color={palette.ivory} />)}
      <Conservatory />

      <GardenCluster x={-4.2} z={3.15} />
      <GardenCluster x={3.9} z={3.0} flip={-1} />
      <GardenCluster x={-3.55} z={-3.0} />
      <GardenCluster x={3.9} z={-2.75} flip={-1} />
      <GardenCluster x={-4.7} z={1.9} flip={-1} />
      <GardenCluster x={4.4} z={1.75} />
      <GardenCluster x={-2.8} z={3.48} />
      <GardenCluster x={2.85} z={3.46} flip={-1} />
      {[-0.6, 0.15, 0.9, 1.65, 2.4, 3.15].map((z, index) => (
        <Box key={`stone-${z}`} position={[index % 2 ? 0.18 : -0.12, 0.04, z]} scale={[0.78, 0.11, 0.46]} color={index % 2 ? "#e8ddd4" : "#ded0c6"} />
      ))}

      <group position={[0, 0.2, 4.05]}>
        <Box position={[-1.2, 0.4, 0]} scale={[0.15, 1.15, 0.15]} color={palette.ivory} />
        <Box position={[1.2, 0.4, 0]} scale={[0.15, 1.15, 0.15]} color={palette.ivory} />
        <Box position={[-0.82, 0.35, 0]} scale={[0.08, 0.8, 0.12]} color={palette.roseDeep} />
        <Box position={[0.82, 0.35, 0]} scale={[0.08, 0.8, 0.12]} color={palette.roseDeep} />
        <Box position={[-0.42, 0.35, 0]} scale={[0.08, 0.8, 0.12]} color={palette.roseDeep} />
        <Box position={[0.42, 0.35, 0]} scale={[0.08, 0.8, 0.12]} color={palette.roseDeep} />
        <Box position={[0, 0.73, 0]} scale={[2.5, 0.12, 0.12]} color={palette.roseDeep} />
      </group>
    </group>
  );
}

function AssetHouse({ onEnter, themeKey, shellKey, lit = true, level, windows = 1, onLamp, letter = false, gift = false, onMailbox, onGift }) {
  // level: how bright the porch lanterns are (0 dark .. 1 lit); windows: how lit the rooms look at night.
  const glow = level ?? (lit ? 1 : 0);
  const daylight=useContext(DaylightContext);
  const shell = houseShells[shellKey];
  const gltf = useLoader(GLTFLoader, shell.modelUrl);
  const model = useMemo(() => {
    const clone = gltf.scene.clone(true);
    clone.traverse((object) => {
      if (!object.isMesh || !object.material) return;
      object.material = Array.isArray(object.material)
        ? object.material.map((material) => material.clone())
        : object.material.clone();
    });
    return clone;
  }, [gltf.scene]);
  const [doorHover, setDoorHover] = useState(false);

  useLayoutEffect(() => {
    const colors = exteriorThemes[themeKey];
    model.traverse((object) => {
      if (!object.isMesh) return;
      object.castShadow = object.name !== "glass";
      object.receiveShadow = true;
      const materials = Array.isArray(object.material) ? object.material : [object.material];
      materials.forEach((material) => {
        const color = colors[material.name];
        if (color && material.color) material.color.set(color);
        if(['plaster','cream','wood'].includes(material.name)){material.bumpMap=relief(material.name==='wood'?'wood':'matte');material.bumpScale=.002;}
        if(material.name==="amber"&&material.emissive){material.emissive.set("#ffc47a");material.emissiveIntensity=.15+(1-daylight)*.65;}
        // Windows: a pale wall by day, a softly lit room at night; kept below the lanterns.
        if(material.name==="room"&&material.emissive){material.emissive.set("#ffc58a");material.emissiveIntensity=.05+(1-daylight)*.45*windows;}
        // Mist over the lawn (the Halloween house has some): only after dark.
        if(material.name==="mist"){material.opacity=.13*(1-daylight);material.emissive?.set("#8f87aa");material.emissiveIntensity=.7;object.visible=daylight<.9;}
        // The two porch lanterns: lit while someone is signed in on this device, dark otherwise.
        if(object.name.startsWith("porch-lamp")&&material.emissive){material.color.set(glow?"#f0c27f":"#b8aa9b");material.emissive.set(glow?"#ffc47a":"#3a3029");material.emissiveIntensity=glow?(.3+(1-daylight)*.9)*glow:.05;}
        material.needsUpdate = true;
      });
    });
  }, [model, themeKey, daylight, glow, windows]);

  return (
    <group scale={shell.scale}>
      <primitive object={model} />
      <mesh
        position={shell.door}
        onPointerEnter={(event) => { event.stopPropagation(); setDoorHover(true); document.body.style.cursor = "pointer"; }}
        onPointerLeave={() => { setDoorHover(false); document.body.style.cursor = "default"; }}
        onPointerDown={(event) => { event.stopPropagation(); }}
        onClick={(event) => { event.stopPropagation(); onEnter(); }}
      >
        <boxGeometry args={shell.doorHitbox} />
        <meshBasicMaterial transparent opacity={doorHover ? .08 : 0} color="#f3c879" depthWrite={false} />
      </mesh>
      {doorHover && <pointLight position={shell.doorLight} color="#f3c879" intensity={1.1} distance={3.4} />}
      <DoorThings model={model} giftAt={shell.giftAt} letter={letter} gift={gift} onMailbox={onMailbox} onGift={onGift} />
      {shell.lanterns.map(([x, y, z]) => <group key={x} position={[x, y, z]}>
        {/* Always here, only brighter or darker, so lighting up doesn't rebuild the scene's shaders. */}
        <pointLight position={[0, -.05, .32]} color="#ffbf73" intensity={glow ? (.35 + (1 - daylight) * 1.1) * glow : 0} distance={1.9} decay={2} />
        <mesh
          onPointerEnter={(event) => { event.stopPropagation(); document.body.style.cursor = "pointer"; }}
          onPointerLeave={() => { document.body.style.cursor = "default"; }}
          onClick={(event) => { event.stopPropagation(); onLamp?.(); }}
        >
          <boxGeometry args={[.5, .75, .5]} />
          <meshBasicMaterial transparent opacity={0} depthWrite={false} />
        </mesh>
      </group>)}
    </group>
  );
}

function TinyBook({position,color,rotation=[0,0,0]}){return <group position={position} rotation={rotation}><SearchBook color={color}/></group>;}

function CoffeeTray({ theme }) {
  return (
    <group>
      <SoftBox position={[0,0,0]} scale={[.78,.055,.54]} color={theme.wood} finish="wood" />
      <SoftBox position={[0,.035,0]} scale={[.66,.035,.42]} color="#f5e9df" finish="lacquer" />
      <SoftBox position={[0,.085,-.245]} scale={[.66,.09,.045]} color={theme.accent} finish="wood" />
      <SoftBox position={[0,.085,.245]} scale={[.66,.09,.045]} color={theme.accent} finish="wood" />
      <SoftBox position={[-.365,.085,0]} scale={[.045,.09,.42]} color={theme.accent} finish="wood" />
      <SoftBox position={[.365,.085,0]} scale={[.045,.09,.42]} color={theme.accent} finish="wood" />
      {[-.4,.4].map((x)=><mesh key={x} position={[x,.13,0]} rotation={[Math.PI/2,0,0]}><torusGeometry args={[.075,.018,8,20,Math.PI]} /><meshStandardMaterial color="#bd9182" roughness={.42} /></mesh>)}
    </group>
  );
}

function CoffeeMug({ theme }) {
  return (
    <group>
      <RoundPiece position={[0,-.075,0]} scale={[.16,.025,.16]} color="#ead9d3" />
      <RoundPiece position={[0,-.045,0]} scale={[.11,.018,.11]} color="#fff8ef" />
      <mesh position={[0,.045,0]} castShadow receiveShadow>
        <cylinderGeometry args={[.105,.085,.18,28]} />
        <meshStandardMaterial color={theme.curtainB} roughness={.26} />
      </mesh>
      <RoundPiece position={[0,.137,0]} scale={[.108,.018,.108]} color="#fff2e8" />
      <RoundPiece position={[0,.151,0]} scale={[.083,.009,.083]} color="#75574d" />
      <mesh position={[.112,.045,0]} rotation={[Math.PI/2,0,0]}><torusGeometry args={[.072,.018,10,24]} /><meshStandardMaterial color={theme.curtainB} roughness={.28} /></mesh>
      <mesh position={[-.025,.22,.01]} rotation={[0,0,-.22]}><torusGeometry args={[.025,.007,8,18,Math.PI]} /><meshStandardMaterial color="#f3ddd8" transparent opacity={.58} /></mesh>
    </group>
  );
}

function LivingRug({theme}){return <SearchLivingRug theme={theme}/>;}

function LegacyFloorPlant({ theme }) {
  const leaves = [
    [-.24,.88,.02,-.62,-.2,.36], [.2,.94,.04,.54,.18,.42],
    [-.08,1.16,-.05,-.2,.36,.46], [.31,1.2,-.08,.68,-.12,.4],
    [-.31,1.27,.02,-.78,.1,.38], [.08,1.43,.04,.18,-.2,.42],
    [.24,1.52,-.04,.5,.28,.34], [-.15,1.58,-.06,-.36,-.18,.36]
  ];
  return (
    <group>
      <RoundPiece position={[0,.045,0]} scale={[.38,.07,.38]} color="#c89e99" />
      <mesh position={[0,.31,0]} castShadow receiveShadow>
        <cylinderGeometry args={[.31,.24,.5,32]} />
        <meshStandardMaterial color={theme.cabinetDoor} roughness={.48} />
      </mesh>
      <RoundPiece position={[0,.56,0]} scale={[.35,.09,.35]} color={theme.accent} />
      <RoundPiece position={[0,.59,0]} scale={[.27,.035,.27]} color="#6f5a4e" />
      {[[-.08,.91,0,-.2],[.1,1.02,-.02,.18],[-.18,1.12,.03,-.38],[.2,1.22,-.04,.42]].map(([x,y,z,turn],index)=>(
        <RoundPiece key={index} position={[x,y,z]} scale={[.025,.72,.025]} rotation={[0,0,turn]} color={index%2?"#66806a":"#718b72"} />
      ))}
      {leaves.map(([x,y,z,rz,ry,size],index)=>(
        <group key={index} position={[x,y,z]} rotation={[0,ry,rz]}>
          <mesh castShadow receiveShadow scale={[size*.48,size,.13]}>
            <sphereGeometry args={[.5,18,14]} />
            <meshStandardMaterial color={index%3===0?"#78967b":index%3===1?"#91aa8e":"#68866e"} roughness={.78} />
          </mesh>
          <Box position={[0,0,.04]} scale={[.014,size*.68,.014]} color="#d5dfc8" rotation={[0,0,0]} />
        </group>
      ))}
      <SoftBox position={[.22,.3,.27]} scale={[.13,.12,.025]} rotation={[0,.24,0]} color="#f7eee7" finish="lacquer" />
    </group>
  );
}

function InteriorWindow({ position, rotation = [0, 0, 0], width = 2.25 }) {
  const daylight=useContext(DaylightContext);
  return (
    <group position={position} rotation={rotation}>
      <SoftBox position={[0,0,0]} scale={[width+0.34,1.93,.16]} color="#f7e9e1" finish="wood" />
      <SoftBox position={[0,0,.09]} scale={[width+0.18,1.77,.07]} color="#fffaf3" finish="wood" />
      <SoftBox position={[0,0,.14]} scale={[width,1.6,.045]} color={daylight>.5?"#b9ced0":"#405572"} emissive={daylight>.5?"#8faeb2":"#26364f"} roughness={.2} />
      <SoftBox position={[0,-.78,.25]} scale={[width+.48,.13,.38]} color="#fff8ef" finish="stone" />
      <Box position={[0,0,.19]} scale={[.055,1.57,.045]} color="#fff8f0" />
      <Box position={[0,0,.19]} scale={[width-.03,.055,.045]} color="#fff8f0" />
      <Box position={[-width*.25,0,.19]} scale={[.04,1.57,.045]} color="#fff8f0" />
      <Box position={[width*.25,0,.19]} scale={[.04,1.57,.045]} color="#fff8f0" />
      <mesh position={[0,0,.165]}><planeGeometry args={[width,1.6]}/><meshPhysicalMaterial color="#eef5f4" transparent opacity={.16} roughness={.08} metalness={.1} depthWrite={false}/></mesh>
      <SoftBox position={[width*.34,-.26,.22]} scale={[.3,.5,.025]} color="#d4e0df" transparent />
    </group>
  );
}

function CurtainFabric({ width, height, color, gathered = false, mirrored = false, opacity = 1, onClick }) {
  const geometry = useMemo(() => {
    const columns = 42;
    const rows = 30;
    const positions = [];
    const indices = [];
    for (let row = 0; row <= rows; row += 1) {
      const v = row / rows;
      const tiePull = gathered ? .31 * Math.exp(-Math.pow((v - .56) / .16, 2)) : 0;
      const lowerFlare = gathered ? .13 * Math.max(0, (v - .58) / .42) : 0;
      const rowWidth = width * (1 - tiePull + lowerFlare);
      for (let column = 0; column <= columns; column += 1) {
        const u = column / columns;
        const wave = Math.sin((u * 5 + .08) * Math.PI * 2);
        const x = (u - .5) * rowWidth;
        const y = height * (.5 - v) + (v > .92 ? Math.sin(u * Math.PI * 4) * .018 : 0);
        const z = wave * .075 * (mirrored ? -1 : 1) * (.74 + .26 * Math.sin(Math.PI * v));
        positions.push(x,y,z);
      }
    }
    for (let row = 0; row < rows; row += 1) {
      for (let column = 0; column < columns; column += 1) {
        const a = row * (columns + 1) + column;
        const b = a + columns + 1;
        indices.push(a,b,a+1,b,b+1,a+1);
      }
    }
    const cloth = new THREE.BufferGeometry();
    cloth.setAttribute("position",new THREE.Float32BufferAttribute(positions,3));
    cloth.setAttribute("uv",new THREE.Float32BufferAttribute(Array.from({length:(rows+1)*(columns+1)},(_,i)=>[i%(columns+1)/columns,1-Math.floor(i/(columns+1))/rows]).flat(),2));
    cloth.setIndex(indices);
    cloth.computeVertexNormals();
    return cloth;
  },[width,height,gathered,mirrored]);

  useEffect(() => () => geometry.dispose(), [geometry]);

  return (
    <group onClick={onClick}>
      <mesh geometry={geometry} castShadow={opacity === 1} receiveShadow>
        <FabricMaterial slot="curtain" color={color} side={THREE.DoubleSide} transparent={opacity < 1} opacity={opacity} depthWrite={opacity > .55} />
      </mesh>
      {opacity === 1 && <>
        <SoftBox position={[-width*.49,0,.01]} scale={[.018,height,.022]} color={outlineInk} outline={false} />
        <SoftBox position={[width*.49,0,.01]} scale={[.018,height,.022]} color={outlineInk} outline={false} />
        <SoftBox position={[0,-height*.495,.01]} scale={[width,.018,.022]} color={outlineInk} outline={false} />
      </>}
    </group>
  );
}

// cat: the porcelain cat on the living-room sill (centre, clear of the hiding
// slots at x ±.66). lights: the bedroom's fairy lights along the rod.
function CurtainHiding({theme,values,children,onClick,cat=false,lights=false}){
 const search=useSearch(),v=values||search?.values||{};
 return <group onClick={onClick}><InteriorWindow position={[0,0,0]} width={2.7}/><SoftBox position={[0,1.08,.27]} scale={[3.55,.065,.07]} color="#9f817b"/>
 {lights&&<FairyLights/>}
 {cat&&<group position={[.12,-.715,.2]}><SillCat/></group>}
 {[-1,1].map(side=>{const id=side<0?'left':'right',amount=clamp(v[id]);return <SearchPart key={id} id={id} axis={side<0?"left":"right"}><group position={[side*(.73+.6*amount),.02,.4]}><CurtainFabric width={1.47-1.02*amount} height={1.78} gathered={amount>.65} color={side<0?theme.curtainA:theme.curtainB}/>{amount>.65&&<TiebackBow width={1.47-1.02*amount}/>}</group></SearchPart>;})}
 <group position={[0,-.72,.27]}>{children}</group></group>;
}

function Curtains({ position, rotation = [0, 0, 0], open, onToggle, width = 2.65, theme }) {
  const panelWidth = open ? width * .28 : width * .5;
  const panelCenter = open ? width * .4 : width * .25;
  const toggleCurtains = (event) => {
    event?.stopPropagation?.();
    onToggle();
  };
  return (
    <group position={position} rotation={rotation}>
      <SoftBox position={[0,1.06,.02]} scale={[width*1.15,.065,.07]} color="#9f817b" finish="wood" />
      {[-width*.595,width*.595].map((x)=><mesh key={x} position={[x,1.06,.02]}><sphereGeometry args={[.085,20,14]} /><meshStandardMaterial color="#c59aa8" roughness={.42} /></mesh>)}
      {[-width*.47,-width*.4,-width*.33,width*.33,width*.4,width*.47].map((x)=><mesh key={`ring-${x}`} position={[x,1.005,.035]} rotation={[Math.PI/2,0,0]}><torusGeometry args={[.047,.01,8,20]} /><meshStandardMaterial color="#b28d82" roughness={.35} /></mesh>)}

      {open && (
        <group position={[0,.04,-.035]}>
          <CurtainFabric width={width*.78} height={1.64} color="#fff9f3" opacity={.2} />
        </group>
      )}

      <group position={[-panelCenter,.02,.06]}>
        <CurtainFabric width={panelWidth} height={1.78} color={theme.curtainA} gathered={open} onClick={toggleCurtains} />
      </group>
      <group position={[panelCenter,.02,.06]}>
        <CurtainFabric width={panelWidth} height={1.78} color={theme.curtainB} gathered={open} mirrored onClick={toggleCurtains} />
      </group>

      {open && [-panelCenter,panelCenter].map((x)=><SoftBox key={`tie-${x}`} position={[x,-.07,.14]} scale={[.17,.075,.13]} color={theme.accent} finish="fabric" />)}
      <HitArea position={[0,0,.18]} scale={[width,2.12,.34]} onClick={onToggle} label="拉开或合上窗帘" />
    </group>
  );
}

// Wall faces: the back wall's inner face is at z -3.89, the left wall's at x -5.07.
// Wainscot: a chair rail at 1.0 and moulded panels below it. Anything set
// against the wall simply covers them, as it would in a real room.
function WainscotPanels({along,center,length,color}){
  const count=Math.max(1,Math.round(length/1.2)),step=length/count,panel=step-.26,strips=[];
  for(let i=0;i<count;i+=1){
    const c=center-length/2+step*(i+.5);
    for(const [a,y,w,h] of [[c,.84,panel+.026,.026],[c,.3,panel+.026,.026],[c-panel/2,.57,.026,.566],[c+panel/2,.57,.026,.566]])
      strips.push(along==="x"?{p:[a,y,-3.869],s:[w,h,.022]}:{p:[-5.059,y,a],s:[.022,h,w]});
  }
  return <group>
    <Box position={along==="x"?[center,1.0,-3.855]:[-5.045,1.0,center]} scale={along==="x"?[length,.045,.05]:[.05,.045,length]} color={color} roughness={.6}/>
    {strips.map((strip,i)=><Box key={i} position={strip.p} scale={strip.s} color={color} roughness={.6}/>)}
  </group>;
}

function InteriorTrim({theme,centerX=0,width=10.18,sideLength=7.72,sideCenter=0}){
  return <group>
    <SoftBox position={[centerX,.065,-3.84]} scale={[width,.13,.08]} color={theme.trim} finish="wood" outline={false}/>
    <SoftBox position={[-5.02,.065,sideCenter]} scale={[.08,.13,sideLength]} color={theme.trim} finish="wood" outline={false}/>
    <group userData={{cutawayWall:"back"}}><WainscotPanels along="x" center={centerX} length={width} color={theme.trim}/></group>
    <group userData={{cutawayWall:"left"}}><WainscotPanels along="z" center={sideCenter} length={sideLength} color={theme.trim}/></group>
  </group>;
}

// A stepped cornice along the top of a cut-away wall (the wall top is at 3.65):
// a thin cap over the wall's thickness, two steps down into the room and a
// bead, instead of one thick slab. Matches the wall it sits on.
function Cornice({along,center=0,length,color}){
  const x=along==="x",span=length??(x?10.62:8.12);
  const piece=(offset,y,depth,height,key)=><Box key={key} position={x?[center,y,-3.89+offset]:[-5.07+offset,y,center]} scale={x?[span,height,depth]:[depth,height,span]} color={color} roughness={.6}/>;
  return <group>
    {piece(-.11,3.665,.27,.05,"cap")}
    {piece(.045,3.6,.1,.08,"crown")}
    {piece(.025,3.535,.06,.05,"step")}
    <mesh position={x?[center,3.493,-3.87]:[-5.05,3.493,center]} rotation={x?[0,0,Math.PI/2]:[Math.PI/2,0,0]} castShadow receiveShadow>
      <cylinderGeometry args={[.017,.017,span-.04,10]}/><meshStandardMaterial color={color} roughness={.55}/>
    </mesh>
  </group>;
}

function FurnitureItem({ id, item, selected, decorMode, onSelect, onActivate, children }) {
  const hide=useContext(HideContext);
  const choose = (event) => {
    if(event.delta>5)return;
    event.stopPropagation();
    if (!decorMode) {if(onActivate){onActivate(event);return;}if(hideSpots[id]||furnitureViews[id])hide(`hide:${id}`);return;}
    event.stopPropagation();
    onSelect(id);
  };
  return (
    <group
      userData={{supportId:id,cameraPlace:id}}
      position={item.position}
      rotation={[0,item.rotationY,0]}
      onClick={choose}
      onPointerEnter={() => { if (decorMode) document.body.style.cursor = "pointer"; }}
      onPointerLeave={() => { document.body.style.cursor = "default"; }}
    >
      <SurfaceScope id={id}><FurnitureTint color={item.color}>{children}</FurnitureTint></SurfaceScope>
    </group>
  );
}

function LegacySoftSofa({ theme }) {
  return (
    <group>
      {[-.92,-.46,0,.46,.92].map((x)=><MicroBrick key={`base-${x}`} position={[x,-.3,0]} scale={[.43,.18,.82]} color={theme.wood} studs={[2,3]} finish="wood" />)}
      {[-.78,0,.78].map((x)=><PlushBox key={`seat-${x}`} position={[x,-.02,.08]} scale={[.7,.32,.67]} color={theme.sofa} />)}
      {[-.78,0,.78].map((x)=><PlushBox key={`back-${x}`} position={[x,.48,-.31]} scale={[.7,.72,.25]} color={theme.sofaDeep} rotation={[-.055,0,0]} />)}
      {[-1.15,1.15].map((x)=><group key={`arm-${x}`}>
        {[[-.12,.02],[.12,.02],[-.12,.35],[.12,.35]].map(([dx,y],index)=><MicroBrick key={index} position={[x+dx,y,.02]} scale={[.23,.24,.78]} color={theme.sofaDeep} studs={index>1?[1,3]:null} />)}
      </group>)}
      <PlushBox position={[-.52,.48,-.02]} scale={[.42,.42,.14]} rotation={[0,0,-.1]} color={theme.cushion} />
      <PlushBox position={[.54,.48,-.02]} scale={[.4,.4,.14]} rotation={[0,0,.09]} color="#e7ddd2" />
      {[[-.98,-.48,-.27],[.98,-.48,-.27],[-.98,-.48,.27],[.98,-.48,.27]].map((p,index)=><RoundPiece key={index} position={p} scale={[.065,.18,.065]} color={theme.wood} />)}
    </group>
  );
}

function LegacyReadingChair({ theme }) {
  return (
    <group>
      {[-.3,0,.3].map((x)=><MicroBrick key={x} position={[x,-.24,0]} scale={[.27,.18,.76]} color={theme.wood} studs={[1,3]} finish="wood" />)}
      <PlushBox position={[0,.02,.08]} scale={[.72,.3,.62]} color={theme.sofa} />
      <PlushBox position={[0,.5,-.27]} scale={[.76,.72,.24]} rotation={[-.06,0,0]} color={theme.sofaDeep} />
      {[-.47,.47].map((x)=><group key={x}>{[-.12,.12].map((z)=><MicroBrick key={z} position={[x,.18,z]} scale={[.2,.45,.3]} color={theme.sofaDeep} studs={[1,1]} />)}</group>)}
      {[-.17,.17].map((x)=><mesh key={x} position={[x,.54,-.13]}><sphereGeometry args={[.024,12,8]} /><meshStandardMaterial color="#bda99e" roughness={.82} /></mesh>)}
      <PlushBox position={[.14,.28,.24]} scale={[.28,.27,.11]} rotation={[0,0,-.12]} color={theme.cushion} />
      {[[-.31,-.4,-.24],[.31,-.4,-.24],[-.31,-.4,.24],[.31,-.4,.24]].map((p,index)=><RoundPiece key={index} position={p} scale={[.055,.21,.055]} color={theme.wood} />)}
    </group>
  );
}

function LegacyOvalCoffeeTable({ theme }) {
  return (
    <group>
      <mesh position={[0,.04,0]} scale={[1.36,1,.62]} castShadow receiveShadow>
        <cylinderGeometry args={[1,1,.13,64]} />
        <meshStandardMaterial color="#fff8ef" roughness={.38} />
      </mesh>
      <mesh position={[0,-.045,0]} scale={[1.25,1,.55]} castShadow receiveShadow>
        <cylinderGeometry args={[1,1,.09,64]} />
        <meshStandardMaterial color="#d8beb2" roughness={.55} />
      </mesh>
      <mesh position={[0,-.25,0]} scale={[1.08,1,.45]} castShadow receiveShadow>
        <cylinderGeometry args={[1,1,.06,64]} />
        <meshStandardMaterial color="#ead8cb" roughness={.63} />
      </mesh>
      {[[-.94,-.34,-.3],[.94,-.34,-.3],[-.94,-.34,.3],[.94,-.34,.3]].map((p,index)=><RoundPiece key={index} position={p} scale={[.06,.31,.06]} rotation={[0,0,index%2?.06:-.06]} color={theme.wood} />)}
      {[-.66,.66].map((x)=><SoftBox key={x} position={[x,-.16,0]} scale={[.05,.22,.76]} color={theme.accent} finish="wood" />)}
      <SoftBox position={[0,-.34,0]} scale={[1.82,.04,.045]} color="#c59aa8" finish="metal" />
    </group>
  );
}

function FloorLamp({ lampOn, onLamp, selectOr, theme }) {
 const day=useContext(DaylightContext),level=accentLevel(useRoomLight(),'floor');lampOn=lampOn&&level>0;
  return (
    <group>
      <RoundPiece position={[0,.045,0]} scale={[.38,.055,.38]} color="#b79259" />
      <RoundPiece position={[0,.1,0]} scale={[.28,.04,.28]} color="#f7eddf" />
      <RoundPiece position={[0,.86,0]} scale={[.038,1.5,.038]} color="#a7804c" />
      <RoundPiece position={[.19,1.55,0]} scale={[.035,.5,.035]} rotation={[0,0,-.84]} color="#a7804c" />
      <mesh position={[.47,1.52,0]} castShadow onClick={(event)=>{event.stopPropagation();selectOr("lamp",onLamp);}}>
        <cylinderGeometry args={[.22,.38,.5,48]} />
        <meshPhysicalMaterial color={lampOn?"#ffe7ad":theme.curtainB} emissive={lampOn?"#f3b94f":"#000"} emissiveIntensity={lampOn?.65+(1-day)*.55:0} roughness={.58} />
      </mesh>
      <RoundPiece position={[.47,1.77,0]} scale={[.225,.018,.225]} color={theme.accent} />
      <RoundPiece position={[.47,1.27,0]} scale={[.385,.018,.385]} color={theme.accent} />
      {lampOn && <>
        {/* Place the warm source below the closed shade so its own mesh does not block the light. */}
        <pointLight position={[.47,1.21,.08]} color="#ffc078" intensity={(2.8+(1-day)*1.7)*level} distance={4.8} decay={1.8} castShadow shadow-mapSize={[512,512]} shadow-camera-near={.05} shadow-camera-far={5} shadow-bias={-.0002} shadow-normalBias={.025} shadow-radius={2} />
        <pointLight position={[.47,1.81,.08]} color="#ffe0a3" intensity={(.45+(1-day)*.3)*level} distance={2.4} decay={2} />
      </>}
      <HitArea position={[.25,.92,.05]} scale={[1.15,2.08,.9]} onClick={()=>selectOr("lamp",onLamp)} label="开关落地灯" />
    </group>
  );
}

function LivingWallDetails({ theme, furniture, decorMode, onSelect, photos=[] }) {
  const photo=id=>photos.find(i=>i.location==='frame:hide:'+id);
  const wrap=(id,children)=><FurnitureItem id={id} item={furniture[id]} decorMode={decorMode} onSelect={onSelect}>{children}</FurnitureItem>;
  return (
    <group>
      {wrap('wallArt',<group>
        <SoftBox position={[0,0,0]} scale={[1.08,.7,.07]} color={theme.wood} finish="wood" />
        <SoftBox position={[0,0,.05]} scale={[.91,.53,.025]} color="#fff8ef" finish="matte" />
        <FramedArt kind="lake" w={.74} h={.39} z={.0625}/>
        {photo('wallArt')&&<PhotoSurface item={photo('wallArt')} width={.70} height={.525} position={[0,0,.11]}/>}
      </group>)}
      {wrap('wallShelf',<group rotation={[0,Math.PI/2,0]}>
        <SoftBox position={[0,.28,0]} scale={[.88,.62,.06]} color={theme.wood} finish="wood" />
        <SoftBox position={[0,.28,.045]} scale={[.72,.46,.025]} color="#f8e8df" />
        <group position={[0,.28,0]}><FramedArt kind="vase" w={.56} h={.385} z={.0575}/></group>
        {photo('wallShelf')&&<PhotoSurface item={photo('wallShelf')} width={.60} height={.45} position={[0,.28,.10]}/>}
        <SoftBox position={[0,-.28,0]} scale={[1.18,.09,.22]} color={theme.wood} finish="wood" />
        <group position={[.28,-.13,.16]} scale={.65}><CoffeeMug theme={theme} /></group>
      </group>)}
      {wrap('wallClock',<group rotation={[0,Math.PI/2,0]}><WallClock/></group>)}
      {wrap('wallPictures',<group rotation={[0,Math.PI/2,0]}>
        <GalleryFrames photo={photo('wallPictures')}/>
      </group>)}
    </group>
  );
}

function TeapotSet({ theme }) {
  return (
    <group>
      <mesh position={[0,.15,0]} scale={[.3,.24,.27]} castShadow receiveShadow>
        <sphereGeometry args={[1,32,22]} />
        <meshPhysicalMaterial color="#fff1e7" roughness={.28} clearcoat={.35} />
      </mesh>
      <RoundPiece position={[0,.36,0]} scale={[.13,.045,.13]} color={theme.curtainB} />
      <mesh position={[.32,.18,0]} rotation={[0,0,-.62]} castShadow><cylinderGeometry args={[.06,.11,.34,20]} /><meshStandardMaterial color="#fff1e7" roughness={.3} /></mesh>
      <mesh position={[-.29,.19,0]} rotation={[Math.PI/2,0,0]}><torusGeometry args={[.18,.035,10,28,Math.PI*1.55]} /><meshStandardMaterial color={theme.curtainB} roughness={.34} /></mesh>
      <group position={[.52,.05,.08]} scale={.72}><CoffeeMug theme={theme} /></group>
    </group>
  );
}

function PastryPlate({ theme, position = [0,0,0], kind = "cake" }) {
  return (
    <group position={position}>
      <RoundPiece position={[0,.025,0]} scale={[.28,.025,.28]} color="#fff7ee" />
      {kind === "cake" ? <>
        <RoundPiece position={[0,.11,0]} scale={[.19,.13,.19]} color="#d8a779" />
        <RoundPiece position={[0,.245,0]} scale={[.2,.035,.2]} color="#fff1df" />
        {[-.1,0,.1].map((x)=><mesh key={x} position={[x,.3,0]} castShadow><sphereGeometry args={[.045,16,12]} /><meshStandardMaterial color="#c96d83" roughness={.5} /></mesh>)}
      </> : <>
        {[-.14,-.05,.05,.14].map((x)=><mesh key={x} position={[x,.12,0]} rotation={[0,0,.18]} castShadow><capsuleGeometry args={[.055,.16,6,12]} /><meshStandardMaterial color="#e2b77c" roughness={.72} /></mesh>)}
      </>}
    </group>
  );
}

function KitchenShelf({ theme }) {
  return (
    <group position={[2.15,2.36,-2.62]}>
      <SoftBox position={[0,0,0]} scale={[2.75,.1,.34]} color={theme.trim} finish="wood" />
      <SoftBox position={[0,-.47,0]} scale={[2.75,.075,.3]} color={theme.trim} finish="wood" />
      {[-1.06,-.53,0,.53,1.06].map((x,index)=><group key={x} position={[x,.29,0]}>
        <mesh castShadow receiveShadow><cylinderGeometry args={[.12,.15,.4,24]} /><meshPhysicalMaterial color={["#f5eee4","#e8ddd1","#fff8ef","#decfc1","#f2e7dc"][index]} roughness={.3} clearcoat={.18} /></mesh>
        <RoundPiece position={[0,.22,0]} scale={[.13,.035,.13]} color="#fff5eb" />
      </group>)}
      <group position={[0,-.33,.09]}>
        {[-1.02,-.62,-.22,.18,.58,.98].map((x,index)=><group key={x} position={[x,0,0]}>
          <RoundPiece position={[0,0,0]} scale={[.1,.16,.1]} color={index%2?"#e6d8cb":"#fff7ed"} />
          <RoundPiece position={[0,.17,0]} scale={[.1,.025,.1]} color="#c6a76e" />
        </group>)}
      </group>
    </group>
  );
}

function KitchenStool({ theme, position }) {
  return (
    <group position={position}>
      <RoundPiece position={[0,.56,0]} scale={[.34,.12,.34]} color={theme.chair} />
      <RoundPiece position={[0,.66,0]} scale={[.29,.055,.29]} color={theme.cushion} />
      {[[ -.2,.28,-.2],[.2,.28,-.2],[-.2,.28,.2],[.2,.28,.2]].map((p,index)=><RoundPiece key={index} position={p} scale={[.045,.56,.045]} color={theme.wood} />)}
      <mesh position={[0,.3,0]} rotation={[Math.PI/2,0,0]}><torusGeometry args={[.25,.025,8,28]} /><meshStandardMaterial color="#b9955c" roughness={.35} /></mesh>
    </group>
  );
}

function LivingArea({ onSit, onSofaSearch, lampOn, onLamp, tvOn, onTv, theme, furniture, decorMode, selectedId, onSelect, cabinet, onCabinet, onNotice, onStorage, onGramophone }) {
  const selectOr = (id, action) => decorMode ? onSelect(id) : action();
  const toggleDrawer = (side) => {
    if (decorMode) return onSelect("tvUnit");
    onCabinet({ ...cabinet, [`${side}Open`]: !cabinet[`${side}Open`] });
    onStorage(!cabinet[`${side}Open`]?`tv:${side}`:null);
  };
  return (
    <group>
      <FurnitureItem id="rug" item={furniture.rug} selected={selectedId==="rug"} decorMode={decorMode} onSelect={onSelect}>
        <LivingRug theme={theme} />
      </FurnitureItem>

      <FurnitureItem id="sofa" item={furniture.sofa} selected={selectedId==="sofa"} decorMode={decorMode} onSelect={onSelect}>
        <SeatTarget id="sofa" height={.235} depth={.27} approach={.88}><SoftSofa theme={theme}/></SeatTarget>
      </FurnitureItem>

      {/* What is on the coffee table goes where the table goes; the cup sits on the tray. */}
      <FurnitureItem id="coffeeTable" item={furniture.coffeeTable} selected={selectedId==="coffeeTable"} decorMode={decorMode} onSelect={onSelect}>
        <OvalCoffeeTable theme={theme} />
        <FurnitureItem id="coffeeTray" item={furniture.coffeeTray} selected={selectedId==="coffeeTray"} decorMode={decorMode} onSelect={onSelect}>
          <CoffeeTray theme={theme} />
          <FurnitureItem id="coffeeMug" item={furniture.coffeeMug} selected={selectedId==="coffeeMug"} decorMode={decorMode} onSelect={onSelect}>
            <CoffeeMug theme={theme} />
          </FurnitureItem>
        </FurnitureItem>
        <FurnitureItem id="greenBook" item={furniture.greenBook} selected={selectedId==="greenBook"} decorMode={decorMode} onSelect={onSelect}>
          <TinyBook position={[0,0,0]} color="#c8b8a8" />
        </FurnitureItem>
        <FurnitureItem id="roseBook" item={furniture.roseBook} selected={selectedId==="roseBook"} decorMode={decorMode} onSelect={onSelect}>
          <TinyBook position={[0,0,0]} color="#d6a4b2" />
        </FurnitureItem>
      </FurnitureItem>

      <FurnitureItem id="armchair" item={furniture.armchair} selected={selectedId==="armchair"} decorMode={decorMode} onSelect={onSelect}>
        <SeatTarget id="armchair" height={.21} depth={.2} approach={[.85,0,.35]}><ReadingChair theme={theme}/></SeatTarget>
      </FurnitureItem>

      <FurnitureItem id="tvUnit" item={furniture.tvUnit} selected={selectedId==="tvUnit"} decorMode={decorMode} onSelect={onSelect}>
        <BrickTvUnit theme={theme} cabinet={cabinet} onDrawer={toggleDrawer} tvOn={tvOn} onTv={()=>selectOr("tvUnit",()=>onStorage("hide:tvUnit"))} onNotice={onNotice} onGift={side=>decorMode?onSelect('tvUnit'):onStorage(`tv:${side}`)}/>
        {false && <>
        <SoftBox position={[0,.34,0]} scale={[2.12,.14,.74]} color="#f5e8df" finish="wood" />
        <SoftBox position={[0,.27,0]} scale={[2.02,.08,.68]} color={theme.cabinet} finish="wood" />
        <SoftBox position={[0,-.31,0]} scale={[2.02,.13,.68]} color={theme.cabinet} finish="wood" />
        <SoftBox position={[-.94,0,0]} scale={[.12,.55,.66]} color={theme.cabinet} finish="wood" />
        <SoftBox position={[.94,0,0]} scale={[.12,.55,.66]} color={theme.cabinet} finish="wood" />
        <SoftBox position={[0,0,0]} scale={[.1,.55,.64]} color={theme.cabinet} finish="wood" />
        <SoftBox position={[-.47,0,-.29]} scale={[.79,.46,.055]} color="#d8c9bc" finish="wood" />
        <SoftBox position={[.47,0,-.29]} scale={[.79,.46,.055]} color="#d8c9bc" finish="wood" />
        {[["left",-.47],["right",.47]].map(([side,x]) => {
          const open = cabinet[`${side}Open`];
          return (
            <group key={side} position={[x,.02,open ? .82 : .32]} onClick={(event)=>{event.stopPropagation();toggleDrawer(side);}}>
              {open && (
                <group position={[0,-.02,-.26]}>
                  <SoftBox position={[0,-.15,0]} scale={[.72,.07,.58]} color="#d4b8aa" finish="wood" />
                  <SoftBox position={[-.34,0,0]} scale={[.06,.34,.58]} color={theme.cabinetDoor} finish="wood" />
                  <SoftBox position={[.34,0,0]} scale={[.06,.34,.58]} color={theme.cabinetDoor} finish="wood" />
                  <SoftBox position={[0,0,-.27]} scale={[.72,.34,.06]} color={theme.cabinetDoor} finish="wood" />
                  <SoftBox position={[0,-.105,-.015]} scale={[.56,.025,.45]} color="#ead8ca" finish="fabric" />
                </group>
              )}
              <SoftBox position={[0,0,0]} scale={[.75,.36,.055]} color={theme.cabinetDoor} finish="lacquer" />
              <SoftBox position={[0,0,.035]} scale={[.61,.24,.018]} color="#f8ebe6" finish="lacquer" />
              {[-.22,-.11,0,.11,.22].map((stripe)=><Box key={stripe} position={[stripe,0,.052]} scale={[.018,.2,.012]} color={theme.accent} />)}
              <SoftBox position={[0,.08,.075]} scale={[.22,.035,.035]} color="#bd916d" finish="metal" />
              {side === "right" && open && cabinet.slots.right && (
                <group position={[0,.06,-.24]} onClick={(event)=>{event.stopPropagation();onNotice("电视柜抽屉里藏着一份小礼物。可以在布置模式里把它取出来。");}}>
                  <SoftBox position={[0,0,0]} scale={[.28,.22,.24]} color="#d69aac" finish="fabric" />
                  <Box position={[0,.12,0]} scale={[.31,.035,.05]} color="#fff0e7" />
                  <Box position={[0,.12,0]} scale={[.05,.035,.27]} color="#fff0e7" />
                </group>
              )}
            </group>
          );
        })}
        {[[-.76,-.42,-.18],[.76,-.42,-.18],[-.76,-.42,.18],[.76,-.42,.18]].map((p,index)=><RoundPiece key={index} position={p} scale={[.065,.24,.065]} color="#8d7069" />)}
        <SoftBox position={[0,.91,0]} scale={[1.55,.9,.13]} color="#674554" finish="metal" />
        <SoftBox position={[0,.91,.082]} scale={[1.34,.69,.035]} color={tvOn?"#b9d7d8":"#382530"} emissive={tvOn?"#a9d4d8":undefined} roughness={tvOn ? .2 : .42} />
        {tvOn && (
          <group position={[0,.91,.108]}>
            <mesh position={[-.28,.02,0]}>
              <circleGeometry args={[.21,32]} />
              <meshStandardMaterial color="#f2d7c6" emissive="#e8bfa6" emissiveIntensity={.22} roughness={.7} />
            </mesh>
            <mesh position={[.2,-.1,.003]}>
              <circleGeometry args={[.29,32]} />
              <meshStandardMaterial color="#91b9af" roughness={.78} />
            </mesh>
          </group>
        )}
        <RoundPiece position={[0,.42,0]} scale={[.1,.16,.1]} color="#74525f" />
        <SoftBox position={[0,.3,0]} scale={[.58,.06,.26]} color="#74525f" finish="metal" />
        <SoftBox position={[.71,.45,.08]} scale={[.32,.075,.19]} color="#cfb3bd" finish="lacquer" />
        <HitArea position={[0,.82,.18]} scale={[1.95,1.3,.42]} onClick={()=>selectOr("tvUnit",onTv)} label="开关电视" />
        </>}
      </FurnitureItem>

      <FurnitureItem id="floorPlant" item={furniture.floorPlant} selected={selectedId==="floorPlant"} decorMode={decorMode} onSelect={onSelect}>
        <FloorPlant theme={theme} />
      </FurnitureItem>
      <FurnitureItem id="lamp" item={furniture.lamp} selected={selectedId==="lamp"} decorMode={decorMode} onSelect={onSelect}>
        <FloorLamp lampOn={lampOn} onLamp={onLamp} selectOr={selectOr} theme={theme} />
      </FurnitureItem>
      <FurnitureItem id="gramophone" item={furniture.gramophone} selected={selectedId==="gramophone"} decorMode={decorMode} onSelect={onSelect} onActivate={e=>onGramophone?onGramophone(e.eventObject):onNotice(gramophoneNext())}>
        <Gramophone />
      </FurnitureItem>
    </group>
  );
}

function LegacyKitchenArea({ cabinetOpen, onCabinet, theme }) {
  const doorTurn = cabinetOpen ? -0.72 : 0;
  const baseUnits = [-.72,0,.72,1.44,2.16];
  return (
    <group>
      {/* quiet tiled splashback: one grid, no shelves crossing the window */}
      {[-.9,-.45,0,.45,.9,1.35,1.8,2.25,2.7].map((x)=><Box key={`tile-v-${x}`} position={[x,1.38,-2.69]} scale={[.012,.78,.025]} color="#d7c9bd" />)}
      {[1.08,1.43,1.78].map((y)=><Box key={`tile-h-${y}`} position={[.9,y,-2.69]} scale={[3.65,.012,.025]} color="#d7c9bd" />)}

      {/* five clearly separated lower modules */}
      {baseUnits.map((x,index)=><group key={`base-${x}`} position={[x,.48,-2.42]}>
        <MicroBrick position={[0,-.32,0]} scale={[.68,.18,.64]} color={theme.cabinet} studs={[2,2]} />
        <SoftBox position={[0,.02,.31]} scale={[.62,.58,.055]} color={theme.cabinetDoor} finish="lacquer" />
        {index !== 2 && <SoftBox position={[0,.13,.35]} scale={[.2,.025,.025]} color="#b38c58" finish="metal" />}
      </group>)}
      <MicroBrick position={[.72,.94,-2.42]} scale={[4.38,.14,.78]} color="#fff8ee" studs={[12,2]} finish="stone" />

      {/* sink lives alone beneath the small window */}
      <group position={[.05,1.02,-2.37]}>
        <SoftBox position={[0,0,0]} scale={[.48,.06,.38]} color="#aab5b2" finish="metal" />
        <SoftBox position={[0,.035,0]} scale={[.34,.025,.25]} color="#71807d" finish="metal" />
        <RoundPiece position={[.2,.2,-.08]} scale={[.032,.27,.032]} color="#a78d77" />
        <Box position={[.09,.33,-.08]} scale={[.22,.032,.032]} color="#a78d77" />
      </group>

      {/* oven and hob get one uninterrupted vertical bay */}
      <group position={[1.44,.49,-2.08]}>
        <SoftBox position={[0,0,0]} scale={[.58,.55,.075]} color="#6f6666" finish="metal" />
        <SoftBox position={[0,.02,.045]} scale={[.43,.35,.025]} color="#342d31" finish="metal" />
        <SoftBox position={[0,.28,.052]} scale={[.34,.025,.02]} color="#d5b16f" finish="metal" />
      </group>
      {[-.16,.16].flatMap((x)=>[-.14,.14].map((z)=><RoundPiece key={`hob-${x}-${z}`} position={[1.44+x,1.04,-2.42+z]} scale={[.1,.018,.1]} color="#5a5051" />))}
      <group position={[1.44,1.93,-2.56]}>
        <SoftBox position={[0,-.2,0]} scale={[.82,.22,.4]} color="#4f4548" finish="metal" />
        <MicroBrick position={[0,.18,0]} scale={[.44,.55,.3]} color={theme.cabinetDoor} studs={[2,1]} />
      </group>

      {/* upper cabinets sit on either side of the window and hob */}
      {[-.72,2.16,2.76].map((x)=><group key={`upper-${x}`} position={[x,1.88,-2.55]}>
        <MicroBrick position={[0,0,0]} scale={[.58,.72,.42]} color={theme.cabinet} studs={[2,1]} />
        <SoftBox position={[0,-.03,.235]} scale={[.48,.57,.035]} color={theme.cabinetDoor} finish="lacquer" />
        <RoundPiece position={[.16,-.04,.27]} scale={[.028,.028,.028]} color="#b38c58" />
      </group>)}

      {/* fridge is detached from the cabinet run */}
      <group position={[3.48,1.12,-2.38]}>
        <MicroBrick position={[0,0,0]} scale={[.88,2.24,.82]} color={theme.cabinetDoor} studs={[3,2]} />
        <SoftBox position={[0,.28,.44]} scale={[.7,.035,.025]} color="#b38c58" finish="metal" />
        <SoftBox position={[0,-.58,.44]} scale={[.7,.035,.025]} color="#b38c58" finish="metal" />
        <Box position={[0,-.18,.445]} scale={[.76,.014,.02]} color="#cdbfb3" />
      </group>

      {/* compact island leaves a clean aisle to the back counter */}
      <group position={[1.05,.66,-.5]}>
        {[-.68,0,.68].map((x)=><MicroBrick key={`island-${x}`} position={[x,-.18,0]} scale={[.62,.78,.84]} color={theme.island} studs={[2,3]} />)}
        <MicroBrick position={[0,.34,0]} scale={[2.32,.14,1.02]} color="#fff8ee" studs={[7,3]} finish="stone" />
        <SoftBox position={[-.48,-.16,.45]} scale={[.56,.48,.045]} color={theme.cabinetDoor} finish="lacquer" />
        <group position={[.48,-.16,.45]} rotation={[0,doorTurn,0]} onClick={(event)=>{event.stopPropagation();onCabinet();}}>
          <SoftBox position={[0,0,0]} scale={[.56,.48,.045]} color={theme.cabinetDoor} finish="lacquer" />
          <RoundPiece position={[-.19,0,.045]} scale={[.028,.028,.028]} color="#b38c58" />
        </group>
        <group position={[-.56,.48,-.02]} scale={.62}><TeapotSet theme={theme} /></group>
        <PastryPlate theme={theme} position={[.25,.48,-.02]} kind="cake" />
      </group>
      <KitchenStool theme={theme} position={[.62,.02,.28]} />
      <KitchenStool theme={theme} position={[1.5,.02,.28]} />
    </group>
  );
}

function DiningArea({ theme }) {
  return (
    <group>
      <SoftBox position={[0,.72,0]} scale={[1.72,.15,1.12]} color="#fff6ec" finish="wood" />
      <SoftBox position={[0,.8,0]} scale={[.36,.025,1.02]} color={theme.accent} finish="fabric" />
      <SoftBox position={[0,.62,0]} scale={[1.58,.08,.98]} color="#ead9ce" finish="wood" />
      <RoundPiece position={[-.56,.34,0]} scale={[.09,.68,.09]} color={theme.wood} />
      <RoundPiece position={[.56,.34,0]} scale={[.09,.68,.09]} color={theme.wood} />
      <group position={[0,.91,0]}>
        <RoundPiece position={[-.03,.04,-.08]} scale={[.1,.13,.1]} color="#d6a3ad" />
        <Flower position={[-.03,.25,-.08]} size={.11} />
      </group>
      <PastryPlate theme={theme} position={[-.52,.91,.14]} kind="bread" />
      <PastryPlate theme={theme} position={[.52,.91,-.08]} kind="cake" />
      <group position={[.02,.9,.38]} scale={.55}><CoffeeMug theme={theme} /></group>
      {[
        [-1.02,.2,0,Math.PI/2],
        [1.02,.2,0,-Math.PI/2],
        [0,.2,.86,0]
      ].map(([x,y,z,turn],index)=>(
        <group key={index} position={[x,y,z]} rotation={[0,turn,0]}>
          <SoftBox position={[0,.24,0]} scale={[.58,.18,.52]} color={theme.chair} finish="fabric" />
          <SoftBox position={[-.22,.6,-.2]} scale={[.09,.64,.12]} color={theme.wood} finish="wood" />
          <SoftBox position={[.22,.6,-.2]} scale={[.09,.64,.12]} color={theme.wood} finish="wood" />
          <SoftBox position={[0,.83,-.2]} scale={[.54,.1,.13]} color={theme.wood} finish="wood" />
          <SoftBox position={[0,.61,-.2]} scale={[.38,.3,.08]} color={theme.chair} finish="fabric" />
          {[-.2,.2].map((leg)=><RoundPiece key={leg} position={[leg,-.12,0]} scale={[.055,.42,.055]} color={theme.wood} />)}
        </group>
      ))}
      <SoftBox position={[0,.015,0]} scale={[2.9,.035,2.15]} color={theme.rug} finish="fabric" />
    </group>
  );
}

function UpstairsFurniture({ room, onCraft, onArt, onRead, onTarot, queued }) {
  if(room==="bedroom")return <Bedroom/>;
  return <StudyRoom onArt={onArt} onCraft={onCraft} onRead={onRead} onTarot={onTarot} queued={queued}/>;
}

function FloorSurface({ finish, micro=false, width = 10.12, centerX = 0, zMin = -3.64, zMax = 3.64 }) {
  const layout=useFloorLayout();if(layout==='herringbone'&&finish.kind!=='tile')return <Parquet {...{finish,width,centerX,zMin,zMax}}/>;
  if(finish.kind!=="tile"){const boards=[];for(let row=0;row<Math.floor((zMax-zMin)/.29)+1;row++){const z=zMin+row*.29;for(let col=-1;col<6;col++){const a=Math.max(-width/2,col*2.1-width/2+(row%3)*.7),b=Math.min(width/2,(col+1)*2.1-width/2+(row%3)*.7);if(b>a)boards.push(<SoftBox finish="wood" outline={false} key={`${row}-${col}`} position={[centerX+(a+b)/2,-.01,z]} scale={[b-a-.008,.026,.282]} color={(row+col)%3?finish.a:finish.b} roughness={.67}/>);}}return <>{boards}</>;}
  if (finish.kind === "tile") {
    const tiles = [];
    for (let x=centerX-width/2+.3; x<=centerX+width/2-.3; x+=.66) {
      for (let z=zMin; z<=zMax; z+=.66) tiles.push([x,z]);
    }
    return <>{tiles.map(([x,z],index)=><Box key={`${x}-${z}`} position={[x,-.01,z]} scale={[.61,.026,.61]} color={index%3===0?finish.b:finish.a} roughness={.38} />)}</>;
  }
  const rows = [];
  for (let z=zMin; z<=zMax; z+=.56) rows.push(Number(z.toFixed(2)));
  return <>{rows.map((z,index)=><Box key={z} position={[centerX,-.01,z]} scale={[width,.025,.5]} color={index%2?finish.a:finish.b} roughness={.62} />)}</>;
}

function Room({ onGramophone, hideSeek, onGround, onSit, onSofaSearch, onTogether, motionEnabled, residentCommand, room, floor, theme, floorFinish, onCraft, onArt, onTarot, onResident, onObject, onPower, homeState, decorMode, selectedId, onSelect, onPlace, onCabinet, onNotice, onStorage, onStorageChange , built=[], movingBuilt=null, builtClash=[] }) {
  const decoration=useDecoration();const materialRoom=floor==='1F'?'downstairs':room;
  const trimColor=decorValue(decoration.state,'room:'+materialRoom,'trim',theme.trim);
  const [curtainsOpen,setCurtainsOpen] = useState(true);
  const roomLight=useRoomLight();const lampOn=roomLight.lamps.floor;
  const tvOn=!!homeState.tvOn;
  const downstairs = floor === "1F";
  const study = !downstairs && room!=="bedroom";
  const windowId=downstairs?"livingWindow":"bedroomWindow";
  const showLiving = downstairs && (room === "overview" || room === "living");
  const showKitchen = downstairs && (room === "overview" || room === "kitchen");
  const residentPlace=residentLocation(floor,room);
  const livingFocus = downstairs && room === "living";
  const shellCenterX = livingFocus ? -2.05 : 0;
  const shellWidth = livingFocus ? 6.45 : 10.55;
  const shellDepth = livingFocus ? 6.7 : 8.25;
  // Which floor pieces this view draws: the living room and the kitchen each hide the other.
  const shownPiece = shownIn(floor, room);
  return (
    <group userData={{cameraRoom:true}}>
      <CeilingLamp room={materialRoom}/>
      <group key={residentPlace.key} position={residentPlace.origin} userData={{residentRoom:residentPlace.key}}><LivingResidents area={residentPlace.area} origin={residentPlace.origin} spawns={residentPlace.spawns} furniture={homeState.furniture} built={built} value={homeState.residents} enabled={motionEnabled} command={residentCommand} onNotice={onNotice} onGround={onGround} onTogether={onTogether} hideSeek={hideSeek&&{...hideSeek,spot:placementIn(hideSeek.spot,residentPlace.area)}}/></group>
      <Box position={[shellCenterX,-.25,livingFocus ? -.55 : 0]} scale={[shellWidth,.45,shellDepth]} color="#d8c9bd" />
      <MaterialOwner id={"room:"+materialRoom}><FloorSurface micro={!downstairs&&floorFinish.kind!=="tile"} finish={floorFinish} width={livingFocus ? 6.18 : 10.12} centerX={shellCenterX} zMin={-3.64} zMax={livingFocus ? 2.32 : 3.64} /></MaterialOwner>
      {decorMode&&<FloorTarget selectedId={selectedId} item={homeState.furniture[selectedId]} home={defaultHomeState.furniture[selectedId]} bounds={livingFocus ? [-5.14,1.04,-3.64,2.32] : [-5.06,5.06,-3.64,3.64]} onPlace={onPlace} furniture={homeState.furniture} defaults={defaultHomeState.furniture} shown={shownPiece} built={built}/>}
      {decorMode&&<OverlapHint selectedId={selectedId} furniture={homeState.furniture} defaults={defaultHomeState.furniture} shown={shownPiece} built={built}/>}
      {decorMode&&movingBuilt&&<BuiltOverlapHint entry={movingBuilt} clash={builtClash} furniture={homeState.furniture} built={built}/>}
      <group userData={{cutawayWall:"back"}}><mesh position={[shellCenterX,1.7,-4]} receiveShadow><boxGeometry args={[shellWidth,3.9,.22]}/><WallpaperMaterial room={materialRoom} color={theme.wall}/></mesh></group>
      <group userData={{cutawayWall:"left"}}><mesh position={[-5.18,1.7,livingFocus ? -.65 : 0]} receiveShadow><boxGeometry args={[.22,3.9,livingFocus?6.6:8.05]}/><WallpaperMaterial room={materialRoom} color={theme.wallSide}/></mesh></group>
      <InteriorTrim theme={{...theme,trim:trimColor}} centerX={shellCenterX} width={shellWidth-.37} sideLength={livingFocus?6.25:7.72} sideCenter={livingFocus?-.65:0}/>
      <UpstairsContext.Provider value={{furniture:homeState.furniture,decorMode,onSelect,onStorage}}><StudyPalette theme={theme}><DioramaAccents floor={floor} room={room}/></StudyPalette></UpstairsContext.Provider>
      {(downstairs||room==='bedroom')&&<FurnitureItem id={windowId} item={homeState.furniture[windowId]} decorMode={decorMode} onSelect={onSelect}>
        <CurtainHiding theme={{...theme,trim:trimColor}} values={loadSearch("hide:"+windowId)} cat={downstairs} lights={!downstairs} onClick={e=>{e.stopPropagation();if(e.delta>5)return;decorMode?onSelect(windowId):onStorage("hide:"+windowId);}}/>
      </FurnitureItem>}
      {/* Light through that window follows it wherever it is moved: its glass is
          1.6 tall around the saved centre height, .14 in front of its position.
          Only the glass the curtains leave open lets light through. */}
      {(downstairs||room==='bedroom')&&(()=>{const w=homeState.furniture[windowId],curtains=loadSearch("hide:"+windowId);return <WindowLight width={2.7} bottom={w.position[1]-.8} top={w.position[1]+.8} gaps={curtainGaps(clamp(curtains.left),clamp(curtains.right))} position={[w.position[0],0,w.position[2]+.14]} rotation={[0,w.rotationY||0,0]}/>;})()}
      {/* Kitchen window belongs to its fitted cabinet layout. */}
      <group userData={{cutawayWall:"back"}}><Cornice along="x" center={shellCenterX} length={shellWidth+.07} color={trimColor}/></group>
      <group userData={{cutawayWall:"left"}}><Cornice along="z" center={livingFocus?-.65:0} length={(livingFocus?6.6:8.05)+.07} color={trimColor}/></group>
      {downstairs ? (
        <>
          {showLiving && <group position={[-1,0,1.6]}>
            
            <LivingArea
              onSit={motionEnabled?onSit:()=>{}} onSofaSearch={onSofaSearch}
              lampOn={lampOn}
              onLamp={()=>roomLight.patch({lamp:'floor'})}
              tvOn={tvOn}
              onTv={onPower}
              theme={theme}
              furniture={homeState.furniture}
              decorMode={decorMode}
              selectedId={selectedId}
              onSelect={onSelect}
              cabinet={homeState.containers.tvUnit}
              onCabinet={onCabinet}
              onStorage={onStorage}
              onNotice={onNotice}
              onGramophone={onGramophone}
            />
          </group>}
          {showLiving && <group position={[-1,0,1.6]}><group position={homeState.furniture.coffeeTable.position} rotation={[0,homeState.furniture.coffeeTable.rotationY,0]}><TableObjects items={(homeState.creations||[]).filter(i=>i.location==='table'||i.location==='hide:coffeeTable')} onSelect={id=>{if(!decorMode)onObject(id);else onSelect('coffeeTable');}}/></group></group>}
          {showLiving && <LivingWallDetails photos={homeState.creations||[]} theme={theme} furniture={homeState.furniture} decorMode={decorMode} onSelect={onSelect} />}
          {showKitchen && <group position={[1.05,0,-1]}><KitchenArea storage={homeState.containers} onStorage={onStorage} onStorageChange={onStorageChange} theme={theme} furniture={homeState.furniture} decorMode={decorMode} onSelect={onSelect} /></group>}
          {showKitchen && <BrickDining theme={theme} furniture={homeState.furniture} decorMode={decorMode} onSelect={onSelect}/>}
        </>
      ) : <UpstairsContext.Provider value={{furniture:homeState.furniture,creations:homeState.creations||[],decorMode,onSelect,onStorage,tailor:homeState.tailor}}><StudyPalette theme={theme}><UpstairsFurniture room={room} onTarot={()=>decorMode?onSelect('studyReading'):onTarot()} onCraft={()=>decorMode?onSelect('studyCraft'):onCraft()} onArt={kind=>decorMode?onSelect(kind==='print'?'studyPrinter':'studyDesk'):onArt(kind)} queued={(homeState.printJobs||[]).length} onRead={()=>decorMode?onSelect('studyReading'):onStorage('hide:studyReading')} /></StudyPalette></UpstairsContext.Provider>}
    </group>
  );
}

// The house's shadow maps are drawn again only when something that casts a shadow has moved (still-shadows.js).
function StillShadows() {
  const gl = useThree((s) => s.gl), scene = useThree((s) => s.scene);
  useEffect(() => keepShadowsStill(gl, scene), [gl, scene]);
  return null;
}

function SceneLights({daylight=1}) {
  return (
    <>
      <ambientLight color={daylight>.5?"#fff8ef":"#c0c9dc"} intensity={.25+daylight*.05} />
      <hemisphereLight args={[daylight>.5?"#fff0dd":"#c4cede", "#71677d", .5+daylight*.08]} />
      <directionalLight position={[7, 11, 8]} intensity={.55+daylight*1.4} color={daylight>.5?"#ffe4c4":"#c4d1e9"} castShadow shadow-mapSize={[2048, 2048]} shadow-bias={-.00012} shadow-normalBias={.018} shadow-radius={3} shadow-camera-left={-11} shadow-camera-right={11} shadow-camera-top={11} shadow-camera-bottom={-11} shadow-camera-far={40} />
      <directionalLight position={[-7, 5, -5]} intensity={.08+daylight*.07} color="#b2c5e9" />
      <pointLight position={[-2.4,4.6,2.8]} intensity={daylight*.37} color="#ffd0aa" distance={9} />
    </>
  );
}

// The stage's turn, zoom and slide by hand ({rotationY, scale, pan}), kept outside the house's state: a drag changes
// it on every move of the pointer, and only the stage needs to hear of that, not everything standing on it.
function viewStore(initial) {
  let value = initial;
  const heard = new Set();
  return {
    get: () => value,
    set(next) {
      next = typeof next === "function" ? next(value) : next;
      if (next === value) return;
      value = next;
      heard.forEach((f) => f());
    },
    subscribe(f) { heard.add(f); return () => heard.delete(f); }
  };
}

// scale and position: the stage's own, before the hand's zoom; slides: whether a pan moves it (inside only).
function RotatingStage({ children, view, scale: baseScale = 1, position: basePosition = [0, 0, 0], slides = false }) {
  const stage = useRef();
  const { rotationY, scale: zoom, pan } = useSyncExternalStore(view.subscribe, view.get);
  const scale = zoom * baseScale;
  const position = slides ? [basePosition[0] + pan.x * .72, basePosition[1] + pan.y, basePosition[2] - pan.x * .72] : basePosition;
  const targetPosition = useMemo(() => new THREE.Vector3(...position), [position[0], position[1], position[2]]);
  const targetScale = useMemo(() => new THREE.Vector3(scale, scale, scale), [scale]);

  useQuietMotion(stage,'position','x',targetPosition.x,7);
  useQuietMotion(stage,'position','y',targetPosition.y,7);
  useQuietMotion(stage,'position','z',targetPosition.z,7);
  useQuietMotion(stage,'scale','x',targetScale.x,7);
  useQuietMotion(stage,'scale','y',targetScale.y,7);
  useQuietMotion(stage,'scale','z',targetScale.z,7);

  return <group ref={stage} rotation={[0, rotationY, 0]} position={position} scale={scale}>{children}</group>;
}

function useDragOrbit({ panEnabled, resetKey }) {
  const defaultScale = () => window.innerWidth <= 700 ? 0.82 : 1;
  const view = useMemo(() => viewStore({ rotationY: 0, scale: defaultScale(), pan: { x: 0, y: 0 } }), []);
  const pointers = useRef(new Map());
  const lastPoint = useRef({ x: 0, y: 0 });
  const pinch = useRef(null);
  const gestureStart = useRef(null);
  const dragged = useRef(false);

  useEffect(() => {
    view.set({ rotationY: 0, scale: defaultScale(), pan: { x: 0, y: 0 } });
    pointers.current.clear();
    pinch.current = null;
  }, [resetKey]);

  const handlers = useMemo(() => ({
    onPointerDown(event) {
      if (event.target.tagName !== 'CANVAS') return;
      if (!pointers.current.size) {
        gestureStart.current = {x:event.clientX,y:event.clientY};
        dragged.current = false;
      }
      pointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
      lastPoint.current = { x: event.clientX, y: event.clientY };
      // Keep pointerup/click on the canvas. Capturing on the app div
      // retargeted clicks away from R3F and made every 3D object inert.
      event.target.setPointerCapture?.(event.pointerId);
      if (pointers.current.size === 2) {
        dragged.current = true;
        const [a, b] = [...pointers.current.values()];
        const { scale, pan } = view.get();
        pinch.current = { distance: Math.hypot(a.x - b.x, a.y - b.y), scale, center:{x:(a.x+b.x)/2,y:(a.y+b.y)/2}, pan };
      }
    },
    onPointerMove(event) {
      if (!pointers.current.has(event.pointerId)) return;
      pointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
      if (pointers.current.size === 1) {
        if (!dragged.current) {
          if (!gestureStart.current || Math.hypot(event.clientX-gestureStart.current.x,event.clientY-gestureStart.current.y)<6) return;
          dragged.current = true;
        }
        const deltaX = event.clientX - lastPoint.current.x;
        const deltaY = event.clientY - lastPoint.current.y;
        lastPoint.current = { x: event.clientX, y: event.clientY };
        if (panEnabled || event.shiftKey || event.buttons===2) {
          view.set((v) => ({ ...v, pan: {
            x: Math.max(-2.7, Math.min(2.7, v.pan.x + deltaX * .012)),
            y: Math.max(-1.35, Math.min(1.35, v.pan.y - deltaY * .009))
          } }));
        } else {
          // The exterior is a real model, not a fixed beauty shot.  Keep the
          // orbit unbounded so the left side, back garden and future extension
          // slots remain reachable instead of disappearing behind a clamp.
          view.set((v) => ({ ...v, rotationY: v.rotationY + deltaX * 0.008 }));
        }
      } else if (pointers.current.size === 2 && pinch.current) {
        const [a, b] = [...pointers.current.values()];
        const distance = Math.hypot(a.x - b.x, a.y - b.y);
        const p = pinch.current;
        view.set((v) => ({ ...v,
          scale: Math.max(0.58, Math.min(1.65, p.scale * distance / Math.max(1,p.distance))),
          pan: {x:Math.max(-3.5,Math.min(3.5,p.pan.x+((a.x+b.x)/2-p.center.x)*.012)),y:Math.max(-2,Math.min(2,p.pan.y-((a.y+b.y)/2-p.center.y)*.009))} }));
      }
    },
    onPointerUp(event) {
      pointers.current.delete(event.pointerId);
      pinch.current = null;
      if(pointers.current.size){const point=[...pointers.current.values()][0];lastPoint.current=point;gestureStart.current=point;}
    },
    onPointerCancel(event) {
      pointers.current.delete(event.pointerId);
      pinch.current = null;
      dragged.current = true;
    },
    onClickCapture(event) {
      if(event.target.tagName === 'CANVAS' && dragged.current) {
        event.stopPropagation();
        dragged.current = false;
      }
    },
    onWheel(event) {
      if(event.target.tagName!=="CANVAS")return;
      view.set((v) => ({ ...v, scale: Math.max(0.58, Math.min(1.65, v.scale - event.deltaY * 0.0007)) }));
    }
  }), [panEnabled, view]);

  return { view, handlers };
}

function Topbar({ subtitle, onHome, onWalk, walkLabel = "去散步", showHome, portrait, lamp, menu, onPlaces }) {
  return (
    <header className={menu ? "topbar inside" : "topbar"}>
      {showHome && (
        <>
          <button className="brand" onClick={onHome} aria-label="返回自家外景"><Icon name="home"/></button>
          {onPlaces
            ? <button className="brand-copy brand-places" onClick={onPlaces} aria-label={`${subtitle}，去别的房间`}><strong>porchlit</strong><small>{subtitle}</small></button>
            : <div className="brand-copy"><strong>porchlit</strong><small>{subtitle}</small></div>}
        </>
      )}
      {lamp}
      <button className="walk-button" onClick={onWalk}><Icon name="walk"/>{walkLabel}</button>
      {portrait}
      {menu}
    </header>
  );
}

function SidebarIcon({kind}){return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{kind==='computer'?<><rect x="3" y="4" width="18" height="12" rx="2"/><path d="M9 20h6m-3-4v4M6 7h12"/></>:kind==='printer'?<><path d="M6 9V3h12v6M6 17H3V9h18v8h-3"/><path d="M6 14h12v7H6zM16 11h2M9 17h6"/></>:<><path d="M3 11h18v3H3zM5 14v7m14-7v7M7 11V7h5v4m1 0V4h5v7M8 5h3m3-3h3"/></>}</svg>;}

function FloorRail({floor,room,onFloor,onRoom,onViewPlace,cameraFocus,queued,decorMode,onBook,open:shown,onOpenChange}) {
 // Open or shut can be held outside (the phone's top bar opens it from the house's name).
 const [own,setOwn]=useState(()=>window.innerWidth>700),open=shown??own,setOpen=v=>{const next=typeof v==='function'?v(open):v;if(onOpenChange)onOpenChange(next);else setOwn(next);};
 useEffect(()=>{if(decorMode)setOpen(false);},[decorMode]);
 const entries=floor==='1F'?[
 ['view:tvUnit','电视机'],['view:sofa','沙发'],['view:refrigerator','冰箱'],['view:island','岛台'],['view:stove','灶台'],['view:diningTable','餐桌']
 ]:room==='bedroom'?[['view:bedroomBed','床边'],['view:bedroomVanity','梳妆台'],['view:bedroomWardrobe','衣柜'],['view:bedroomChair','卧室读书角']]:[['view:studyReading','书房读书角'],['hide:studyTarot','塔罗牌'],['hide:studyComputer','电脑'],['hide:studyPrintPreview','打印机'],['hide:studyCraft','拼搭台'],['hide:studyTailor','小裁缝']];
 return <><button className="sidebar-toggle" aria-label="小屋菜单" aria-expanded={open} onClick={()=>setOpen(v=>!v)}>☰ 小屋</button>{open&&<button className="sidebar-scrim" aria-label="收起菜单" onClick={()=>setOpen(false)}/>}
 <nav id="house-navigation" hidden={!open} className={`rail house-sidebar ${open?'sidebar-open':''}`} aria-label="家具视角" onKeyDown={e=>{if(e.key==='Escape')setOpen(false);}}>
 <div className="sidebar-title"><small>YOUR LITTLE PLACE</small><strong>在家里</strong><p>到喜欢的角落坐一会儿。</p></div>
 <div className="view-switch">{['1F','2F'].map(f=><button key={f} className={floor===f?'active':''} onClick={()=>onFloor(f)}>{f}</button>)}</div>
 {floor==='2F'&&<div className="view-switch" aria-label="二楼房间">{[['bedroom','卧室'],['study','书房']].map(([id,label])=><button key={id} className={room===id?'active':''} onClick={()=>{onViewPlace(null);onRoom(id);}}>{label}</button>)}</div>}
 <button onClick={()=>onViewPlace(null)}>{floor==='2F'?'房间全景':'整层视角'}</button><span className="rail-caption">走近家具</span>
 {entries.map(([id,label])=><button key={id} className={cameraFocus===id?'active':''} onClick={()=>{onViewPlace(id);if(window.innerWidth<=700)setOpen(false);}}>{label}{id==='hide:studyPrintPreview'&&queued>0?` · ${queued}`:''}</button>)}
 {onBook&&<button onClick={()=>{onBook();if(window.innerWidth<=700)setOpen(false);}}>日记</button>}
 <a href="/transfer/" style={{color:"inherit",padding:"12px"}}>搬家箱</a>
 </nav></>;
}

// Four little arrows: moving a piece of furniture.
function MoveIcon(){return <svg className="ui-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 4v16M4 12h16M12 4l-2.5 2.5M12 4l2.5 2.5M12 20l-2.5-2.5M12 20l2.5-2.5M4 12l2.5-2.5M4 12l2.5 2.5M20 12l-2.5-2.5M20 12l-2.5 2.5"/></svg>;}

function DecorDock({ onMaterials,selectedId, creation, onBag, onNudge, onRotate, onReset, color, onColor }) {
  const selected = creation ? {label: creation.name, placement: creation.wall ? 'backWall' : undefined} : selectedId ? furnitureCatalog[selectedId] : null;
  if (!selected) {
    return <div className="decor-prompt">点一件家具或摆件来布置</div>;
  }
  return (
    <aside className="decor-remote" aria-label={`正在布置${selected.label}`}>
      <div className="remote-name"><span>正在布置</span><strong>{selected.label}</strong></div>
      <div className="remote-pad" aria-label="移动与旋转">
        <button className="remote-up" onClick={()=>onNudge(0,-.25)} aria-label="向后移动"><Icon name="up"/></button>
        <button className="remote-left" onClick={()=>onNudge(-.25,0)} aria-label="向左移动"><Icon name="back"/></button>
        <button className="remote-turn" disabled={selected.placement?.endsWith('Wall')} onClick={onRotate} aria-label="旋转四十五度"><Icon name="turn"/></button>
        <button className="remote-right" onClick={()=>onNudge(.25,0)} aria-label="向右移动"><Icon name="forward"/></button>
        <button className="remote-down" onClick={()=>onNudge(0,.25)} aria-label="向前移动"><Icon name="down"/></button>
      </div>
      {creation ? <button className="remote-reset" onClick={onBag}>收回背包</button> : <button className="remote-reset" onClick={onReset}>位置复位</button>}
      {creation&&!creation.wall&&<small>{creation.kind==='build'?'点地面、台面或墙，它就过去':'点地面或台面，它就过去'} · 每步 5 厘米</small>}
      {selected.placement?.endsWith('Wall')&&<small>沿墙面上下左右移动</small>}
      {selected.placement==='surface'&&<small>台面微调 · 每步 5 厘米</small>}
      {floorPieces[selectedId]&&<small>也可以直接点地板</small>}
    </aside>
  );
}

function StorageCloseup({onContainerChange,containers,onFridgeToggle,onFridgeSelect,onOpenLetter,label,theme,kind,gift,note,onNote,onStore,onTake,onClose,onPower,items,storageId,onMove,onShift,onInstall,onUse,onFound,color,seekable=false,lives=false,him='他',onStash}) {
  const [reading,setReading]=useState(false);
  const [stashing,setStashing]=useState(false);
  // Hiding what she puts here next for the AI living here to find (翻一格), with a line to go on.
  const [forHim,setForHim]=useState(false);
  const [stashHint,setStashHint]=useState('');
  const stash=seekable&&forHim?{hint:stashHint.trim()}:null;
  // Once something goes in: hidden for him to find, or only put away (he can turn it over, but not read a letter
  // there, nor count a thing as found), or somewhere he can't turn over at all.
  const [told,setTold]=useState(null);
  const toldFor=letter=>{const thing=letter?'信':'';
    if(stash)return {title:`${thing}藏好了`,line:`藏给${him}找的。${him}那边看这一格是空的，一天能翻三格。`};
    if(seekable)return {title:`${thing}放好了`,line:`没点「藏给${him}找」，${him}翻到${letter?'这一格也读不到':'也不算找到'}。要${him}来找，先点上「藏给${him}找」再藏。`};
    return {title:`${thing}放好了`,line:lives?`这一格${him}翻不到。`:''};};
  useEffect(()=>{if(!told)return;const t=setTimeout(()=>setTold(null),9000);return ()=>clearTimeout(t);},[told]);
  const [letterSpot,setLetterSpot]=useState(null);
  const [letterError,setLetterError]=useState('');
  const linkedContainer=!storageId.startsWith('hide:');
  const [localSearchValues,setSearchValues]=useState(()=>{
    const saved=loadSearch(storageId);
    for(const [id] of searchParts(kind))if(clickSearchPart(kind,id))saved[id]=0;
    if(linkedContainer)saved.open=storageId.startsWith('tv:')?Number(!!containers.tvUnit?.[storageId.slice(3)+'Open']):Number(!!containers[storageId]?.open);
    return saved;
  });
  const [closing,setClosing]=useState(false);
  const exitTimer=useRef(null);
  const closeContainers=()=>{if(['fridge','freezer'].includes(kind))Object.values(fridgeSlots).forEach(id=>onContainerChange(id,{open:false}));else if(linkedContainer)onContainerChange(storageId,{open:false});};
  useEffect(()=>()=>{clearTimeout(exitTimer.current);closeContainers();
    const saved=loadSearch(storageId);for(const [id] of searchParts(kind))if(clickSearchPart(kind,id))saved[id]=0;
    try{localStorage.setItem('porchlit-search-v1:'+storageId,JSON.stringify(saved));}catch{}
  },[]);
  const leaveStorage=()=>{
    if(closing)return;
    const needsClosing=['fridge','freezer'].includes(kind)?Object.values(fridgeSlots).some(id=>containers[id]?.open):searchParts(kind).some(([id])=>clickSearchPart(kind,id)&&searchValues[id]>.001);
    if(!needsClosing){onClose();return;}
    setClosing(true);closeContainers();
    setSearchValues(old=>Object.fromEntries(Object.entries(old).map(([id,v])=>[id,clickSearchPart(kind,id)?0:v])));
    exitTimer.current=setTimeout(onClose,650);
  };
  const isFridge=['fridge','freezer'].includes(kind);
  const fridgeOpen=!!containers?.[storageId]?.open;
  const linkedOpen=storageId.startsWith('tv:')?!!containers.tvUnit?.[storageId.slice(3)+'Open']:!!containers[storageId]?.open;
  const searchValues=useMemo(()=>linkedContainer&&!isFridge?{...localSearchValues,open:Number(linkedOpen)}:localSearchValues,[localSearchValues,linkedContainer,isFridge,linkedOpen]);
  const searching=!isFridge&&searchParts(kind).length>0;
  const manipulating=useRef(false),closeupModel=useRef(null);
  const setSearch=(id,v)=>{if(closing)return;const was=(searchValues[id]||0)>.5,now=clamp(v)>.5;if(was!==now)playPart(searchParts(kind).find(([part])=>part===id)?.[1],now);setSearchValues(old=>({...old,[id]:clamp(v)}));if(linkedContainer&&id==='open')onContainerChange(storageId,{open:clamp(v)>.5});};
  useEffect(()=>{if(searching){try{localStorage.setItem('porchlit-search-v1:'+storageId,JSON.stringify(searchValues));}catch{}}},[searchValues,storageId,searching]);
  const [frameAngle,setFrameAngle]=useState(0);
  const visibleSlot=slot=>isFridge?fridgeOpen:!searching||slotVisible(kind,searchValues,slot,frameAngle);
  // The coffee table's top also shows what was left on it ('table': a letter, something made for her), on the same
  // four places as what is set down here.
  const here=i=>i.location===storageId||(storageId==='hide:coffeeTable'&&i.location==='table');
  const shownItems=items.filter(i=>!here(i)||visibleSlot(i.slot));
  const giftVisible=visibleSlot(1);
  const availableSpots=spotsFor(storageId).filter(s=>visibleSlot(s.slot)&&!items.some(i=>i.location===storageId&&i.slot===s.slot)&&!(storageId==='hide:coffeeTable'&&tableTaken(items,s.slot)));
  const targetSpot=availableSpots.find(s=>s.id===letterSpot)||availableSpots[0];
  const canPlace=availableSpots.length>0;

  const [selectedObject,setSelectedObject]=useState(null);
  const selectedLetter=shownItems.find(i=>i.id===selectedObject&&here(i)&&i.kind==='note');
  const letterOpen=reading||!!selectedLetter;
  const closeLetter=()=>{setReading(false);setSelectedObject(null);setLetterError('');};
  // A clue card that shows goes into the backpack by itself a moment later (src/clue-pickup.js); not while a letter is open.
  const [pickedUp,setPickedUp]=useState(0);
  useEffect(()=>{if(letterOpen||closing)return;const found=cluesShowing(items,storageId,visibleSlot);if(!found.length)return;const t=setTimeout(()=>{found.forEach(c=>onMove(c.id,'bag'));play('found');setPickedUp(n=>n+found.length);},700);return ()=>clearTimeout(t);},[items,storageId,searchValues,letterOpen,closing]);
  // Something an AI living here hid, showing now: found (src/machine-acts.js); what it is shows in the found card.
  useEffect(()=>{if(closing||!onFound)return;const ids=foundNow(items,storageId,visibleSlot).map(i=>i.id);if(!ids.length)return;const t=setTimeout(()=>{play('found');onFound(ids);},450);return ()=>clearTimeout(t);},[items,storageId,searchValues,frameAngle,closing]);
  const panel=useRef();
  useEffect(()=>{if(!letterOpen){panel.current?.focus();const overlay=panel.current?.closest('.storage-closeup');if(overlay)overlay.scrollTop=0;}},[letterOpen]);
  const drag=useRef(null);
  const closeupDragged=useRef(false);
  const mountedPhoto=items.find(i=>i.location==='frame:'+storageId);
  const backVisible=kind!=='frame'||Math.cos(frameAngle)<-.25;
  const contentVisible=(!isFridge||fridgeOpen)&&kind!=='bedroom-table'&&backVisible&&(!searching||spotsFor(storageId).some(s=>visibleSlot(s.slot)));
  useEffect(()=>{if(!isFridge)setFrameAngle(0);setReading(false);setSelectedObject(null);},[storageId]);
  useEffect(()=>{if(!contentVisible){setReading(false);setSelectedObject(null);}else if(selectedObject&&!shownItems.some(i=>i.id===selectedObject))setSelectedObject(null);if(gift&&!giftVisible)setReading(false);},[contentVisible,giftVisible,searchValues]);
  const turn=d=>setFrameAngle(a=>a+d);

  useEffect(()=>{
    const previous=document.activeElement;
    panel.current?.focus();
    return ()=>previous?.focus?.();
  },[]);
  const keys=e=>{
    if(e.key==='Escape'){e.stopPropagation();if(letterOpen)closeLetter();else if(stashing)setStashing(false);else leaveStorage();}
    if(e.key==='Tab'){
      const nodes=[...panel.current.querySelectorAll('button,textarea,input,summary,select')].filter(n=>!n.disabled&&n.getClientRects().length);
      const first=nodes[0],last=nodes[nodes.length-1];
      if(e.shiftKey&&(document.activeElement===first||document.activeElement===panel.current)){e.preventDefault();last?.focus();}
      else if(!e.shiftKey&&(document.activeElement===last||document.activeElement===panel.current)){e.preventDefault();first?.focus();}
    }
  };
  return <div className="storage-closeup" onPointerDown={e=>e.stopPropagation()} onWheel={e=>e.stopPropagation()} onClick={e=>{if(e.target===e.currentTarget)leaveStorage();}}>
    <section className="storage-scene" ref={panel} tabIndex={-1} role="dialog" aria-modal="true" aria-labelledby="storage-title" onKeyDown={keys}>
      <header><div><span>A LITTLE SOMETHING</span><h2 id="storage-title">{isFridge?'冰箱':kind==='frame'?`${label.split(' · ')[0]} · ${backVisible?'背面':'正面'}`:label}</h2></div><button className="storage-back" disabled={closing} onClick={leaveStorage}>{closing?"正在合上…":"返回小屋"} <Icon name="leave"/></button></header>
      {letterOpen?<LetterSurface onOpen={onOpenLetter} letter={selectedLetter||(reading&&gift?gift:null)} note={note} onNote={onNote} spots={availableSpots} spotId={targetSpot?.id} onSpot={setLetterSpot} error={letterError} onBack={closeLetter} onSave={()=>{try{onStore(targetSpot.id,stash);setTold(toldFor(true));closeLetter();setForHim(false);setStashHint('');}catch(e){setLetterError(e.message);}}} onTake={()=>{if(selectedLetter)onMove(selectedLetter.id,'bag');else onTake();closeLetter();}}/>:<div className="storage-detail-layout" style={closing?{pointerEvents:"none"}:undefined}>
        <div className="storage-model" onClickCapture={e=>{if(closeupDragged.current){e.stopPropagation();closeupDragged.current=false;}}} aria-label={`${label}近景`} style={{touchAction:'none'}}
          onPointerDown={e=>{if(manipulating.current)return;closeupDragged.current=false;drag.current={id:e.pointerId,x:e.clientX,start:e.clientX};e.target.setPointerCapture?.(e.pointerId);}}
          onPointerMove={e=>{if(!manipulating.current&&drag.current?.id===e.pointerId){if(Math.abs(e.clientX-drag.current.start)>5)closeupDragged.current=true;turn((e.clientX-drag.current.x)*.012);drag.current.x=e.clientX;}}}
          onPointerUp={()=>{drag.current=null;}} onPointerLeave={()=>{drag.current=null;}} onPointerCancel={()=>{drag.current=null;}} >
          <QuietCanvas orthographic camera={{position:kind==='frame'?[0,0,6]:['cupboard','fridge','freezer'].includes(kind)?[1.5,1.8,6]:[2.8,4.6,5],zoom:67}} dpr={[1,1.5]} shadows><CloseupCamera kind={kind} target={closeupModel}/>
            <ambientLight intensity={1.2}/><directionalLight position={[2,5,3]} intensity={2} color="#fff5e6" castShadow/>
            <SearchContext.Provider value={searching?{values:searchValues,set:setSearch,clickPart:id=>clickSearchPart(kind,id),busy:v=>{manipulating.current=v;drag.current=null;}}:null}><group ref={closeupModel} rotation={[0,kind==='frame'?0:frameAngle,0]}><SurfaceScope id={storageId.replace(/^hide:/,'')}><FurnitureTint color={color}>{kind==='curtain'?<CurtainHiding theme={theme} cat={storageId==='hide:livingWindow'} lights={storageId==='hide:bedroomWindow'}><ContainerObjects layout={kind} items={shownItems.filter(here)} onSelect={setSelectedObject}/></CurtainHiding>:kind==='book'?<group scale={7}><SearchBook color={storageId.includes('rose')?'#d6a4b2':'#c8b8a8'}><ContainerObjects layout={kind} items={shownItems.filter(here)} onSelect={setSelectedObject}/></SearchBook></group>:kind==='living-rug'?<group scale={.65}><SearchLivingRug theme={theme}/><group position={[0,.04,.95]} scale={[6,1,1]}><ContainerObjects layout={kind} items={shownItems.filter(here)} onSelect={setSelectedObject}/></group></group>:kind?.startsWith('diorama-')?<StudyPalette theme={theme}><DioramaPreview kind={kind}><ContainerObjects layout={kind} items={shownItems.filter(here)} onSelect={setSelectedObject}/>{gift&&giftVisible&&<mesh position={[.22,.07,-.02]} onClick={e=>{e.stopPropagation();setReading(true);}}><boxGeometry args={[.19,.012,.13]}/><meshStandardMaterial color="#fff3e8"/></mesh>}</DioramaPreview></StudyPalette>:kind?.startsWith('bedroom-')?<StudyPalette theme={theme}><BedroomPreview kind={kind}><ContainerObjects layout={kind} items={shownItems.filter(here)} onSelect={setSelectedObject}/>{gift&&giftVisible&&<mesh position={[.22,.07,-.02]} onClick={e=>{e.stopPropagation();setReading(true);}}><boxGeometry args={[.19,.012,.13]}/><meshStandardMaterial color="#fff3e8"/></mesh>}</BedroomPreview></StudyPalette>:['study-shelf','study-reading','study-rug','study-workbench','study-computer','study-print-preview'].includes(kind)?<StudyPalette theme={theme}><UpstairsContext.Provider value={{onStorage:()=>{},onSelect:()=>{}}}><StudyObjectPreview kind={kind}><ContainerObjects layout={kind} items={shownItems.filter(here)} onSelect={setSelectedObject}/>{gift&&giftVisible&&<mesh position={[.22,.07,-.02]} onClick={e=>{e.stopPropagation();setReading(true);}}><boxGeometry args={[.19,.012,.13]}/><meshStandardMaterial color="#fff3e8"/></mesh>}</StudyObjectPreview></UpstairsContext.Provider></StudyPalette>:isFridge?<RefrigeratorPreview theme={theme} containers={containers} active={storageId} onToggle={onFridgeToggle}><ContainerObjects layout={kind} items={shownItems.filter(here)} onSelect={setSelectedObject}/>{gift&&giftVisible&&<mesh position={[.22,.06,0]} onClick={e=>{e.stopPropagation();setReading(true);}}><boxGeometry args={[.19,.012,.13]}/><meshStandardMaterial color="#fff3e8"/></mesh>}</RefrigeratorPreview>:<StudyPalette theme={theme}><DrawerDetail theme={theme} kind={kind} portrait={storageId.includes("studyFrame")||storageId.includes("bedroomFrame")} photo={mountedPhoto} angle={frameAngle} backVisible={backVisible} gift={backVisible&&giftVisible?gift:null} onGift={()=>setReading(true)}><ContainerObjects layout={kind} items={backVisible?shownItems.filter(here):[]} onSelect={setSelectedObject}/></DrawerDetail></StudyPalette>}</FurnitureTint></SurfaceScope></group></SearchContext.Provider>
          </QuietCanvas>
        </div>
        <aside className="storage-tools"><p className="closeup-hint">{isFridge?'点上门或下门，各自打开和关上；拖空白处转动视角。':searchHint(kind)}</p>{told&&<div className="storage-found-card storage-told" role="status"><h3>{told.title}</h3>{told.line&&<p>{told.line}</p>}</div>}{pickedUp>0&&<div className="storage-found-card" role="status"><h3>{pickupWords(pickedUp)}</h3><p>已经收进背包。去背包里拆开读一读，再回电脑上。</p></div>}{isFridge&&<div className="fridge-compartments">{Object.entries(fridgeSlots).map(([part,id])=><div key={id}><button aria-pressed={storageId===id} onClick={()=>onFridgeSelect(id)}>{part==='upper'?'冷藏室':'冷冻室'} · 查看</button><button aria-pressed={!!containers[id]?.open} onClick={()=>onFridgeToggle(id)}>{containers[id]?.open?'关上':'打开'}{part==='upper'?'上门':'下门'}</button></div>)}{!fridgeOpen&&<p>打开这一层的门，再留信或藏小物。</p>}</div>}{searching&&<details className="search-controls"><summary>轻触操作</summary>{searchParts(kind).map(([id,label])=><label key={id}>{label}{clickSearchPart(kind,id)?<button aria-pressed={(searchValues[id]||0)>.5} onClick={()=>setSearch(id,(searchValues[id]||0)>.5?0:1)}>{(searchValues[id]||0)>.5?"关上":"打开"}</button>:<input type="range" aria-label={label} min="0" max="1" step=".01" value={searchValues[id]||0} onChange={e=>setSearch(id,e.target.value)}/>}</label>)}</details>}{onUse&&<button className="storage-power" onClick={onUse}>{kind==='study-workbench'?'开始拼搭':kind==='study-computer'?'打开电脑':'使用打印机'}</button>}
          {kind==='frame'&&<div className="storage-simple"><p>拖动相框，转到另一面看看。</p><div style={{display:'flex',gap:8}}><button onClick={()=>turn(-Math.PI/4)} aria-label="向左转相框"><Icon name="turn"/></button><button onClick={()=>setFrameAngle(0)}>正面归位</button><button onClick={()=>turn(Math.PI/4)} aria-label="向右转相框"><Icon name="turn"/></button></div></div>}
          {kind==='study-shelf'&&<button className="storage-power" onClick={()=>setFrameAngle(Math.cos(frameAngle)<-.25?0:Math.PI)}>{Math.cos(frameAngle)<-.25?'转回书架正面':'转到背面 · 藏东西'}</button>}{searching&&!contentVisible&&<p className="storage-simple">先打开柜门、盒盖或移开遮挡物，露出空位后就能留信或藏小物。也可以展开「轻触操作」。</p>}{kind==='frame'&&!backVisible&&<div className="storage-simple"><p>{mountedPhoto?mountedPhoto.name:'从背包挑一张相纸，放进这个框里。'}</p>{mountedPhoto&&<button onClick={()=>onMove(mountedPhoto.id,'bag')}>取下相纸</button>}{items.filter(i=>i.kind==='photo'&&i.location==='bag').map(i=><button key={i.id} onClick={()=>onInstall(i.id,storageId)}>{mountedPhoto?'换成':'装入'} · {i.name}</button>)}</div>}
          {contentVisible&&!['study-workbench','study-computer','study-print-preview'].includes(kind)&&<>
          {onPower&&<button className="storage-power" onClick={onPower}>电视开 / 关</button>}
          {stashing?<><button className="stash-back" onClick={()=>setStashing(false)}><Icon name="back"/>继续找找</button><StorageInventory mode="place" canPlace={canPlace} visibleSlot={visibleSlot} items={shownItems} storageId={storageId} onMove={(...args)=>{onMove(...args);if(stash)onStash?.(args[0],stash);setTold(toldFor(false));setStashing(false);setForHim(false);setStashHint('');}} onShift={onShift} selected={selectedObject} onSelect={setSelectedObject}/></>:<>
          <StorageInventory mode="find" items={shownItems} storageId={storageId} onMove={onMove} selected={selectedObject} onSelect={setSelectedObject} him={him}/>
          {seekable&&<div className="stash-for-him"><button type="button" aria-pressed={forHim} onClick={()=>setForHim(v=>!v)}>{forHim?'✓ ':''}藏给{him}找</button>{forHim&&<><input value={stashHint} maxLength={40} onChange={e=>setStashHint(e.target.value)} placeholder="留一句提示（可以不写）" aria-label="给他的提示"/><small>接下来留的信、藏的小物，{him}那边看这一格是空的，只能一格一格翻，一天三格。过一天，家里会告诉{him}在哪间屋。</small></>}</div>}
          <div className="storage-intentions"><button disabled={!targetSpot} onClick={()=>{setSelectedObject(null);setTold(null);setReading(true);}}><Icon name="decor"/>留封信</button><button disabled={!canPlace} onClick={()=>{setSelectedObject(null);setTold(null);setStashing(true);}}><Icon name="bag"/>藏件小物</button></div>
          </>}
          </>}
        </aside>
      </div>}
    </section>
  </div>;
}

function App() {
  const decoration=useDecoration();
  const [bookOpen,setBookOpen]=useState(false);
  const [residentOpen,setResidentOpen]=useState(null);
  const [residentCommand,setResidentCommand]=useState(null);
  const moveResident=(type,seat,more)=>setResidentCommand(c=>({type,seat,...more,id:(c?.id||0)+1}));
  const [seatMenu,setSeatMenu]=useState(null);
  // Which seat the partner is sitting on (the residents say), for the sofa's 靠着他; and whether the two of them are
  // asleep in bed, for the bed's 起床.
  const [partnerSeat,setPartnerSeat]=useState(null),[inBed,setInBed]=useState(false),[dancingNow,setDancingNow]=useState(false);
  // The gramophone: while a record plays, tapping it asks (another record, or a dance); otherwise it puts one on.
  // A record going on may bring him over to dance (resident-dance.js).
  const tapGramophone=anchor=>{if(musicState().playing&&anchor){openSeatMenu({id:'gramophone',gramophone:true,anchor,labelPoint:[0,1.62,0]});return;}setToast(gramophoneNext());moveResident('tune');};
  const seatActionsRef=useRef(),cameraActionsRef=useRef();
  const [bookLauncherHost,setBookLauncherHost]=useState(null);
  // Up close to the bed already (床边): tapping it searches it, as it always has, rather than flying back out to ask.
  const openSeatMenu=menu=>{if(catchPartner('seat:'+menu?.id))return;if(menu?.bed&&!menu.sleeping&&!inBed&&furnitureFocus==='view:'+menu.id){requestStorage('hide:'+menu.id);return;}setFurnitureFocus(null);setSeatMenu(menu);};
  const {zone,setZone,daylight,preview,setPreview}=useHomeClock();
 const houseLights=useHouseLights();
  const [scene, setScene] = useState("exterior");
  const [floor, setFloor] = useState("1F");
  const [room, setRoom] = useState("overview");
  // Music while someone is home: on by default every time they come in, and it follows day and night.
  const musicMood=moodFor(daylight);
  useEffect(()=>{if(scene==='interior')musicHome(musicMood);else musicAway();},[scene==='interior']);
  useEffect(()=>{setMusicMood(musicMood);},[musicMood]);
  // At home at night 雨夜 may come on: make its rain at a quiet moment beforehand (a few hundred milliseconds on a phone), not on the tap.
  useEffect(()=>{if(scene!=='interior'||musicMood!=='night')return;const idle=window.requestIdleCallback,id=idle?idle(()=>prepareRain(),{timeout:8000}):setTimeout(prepareRain,4000);return()=>idle?window.cancelIdleCallback(id):clearTimeout(id);},[scene==='interior',musicMood]);
  const themeKey="creamRose";
  const [floorFinishKey, setFloorFinishKey] = useState(()=>{try{return (k=>floorFinishes[k]?k:"oak")(JSON.parse(localStorage.getItem("porchlit-home-layout-v1"))?.appearance?.floorFinishKey);}catch{return "oak";}});
  const [homeState, setHomeState] = useState(loadHomeState);
  const shellKey = shellOf(homeState, dayIn(zone));
  const homeNow = useRef(homeState); homeNow.current = homeState;
  // What has been sewn at home is worn like any other outfit: registered before anything below reads a look.
  useMemo(()=>registerSewn(homeState.tailor),[homeState.tailor]);
  const [decorMode, setDecorMode] = useState(false);
  const moveOrigin = useRef(null);
  const [bookResume, setBookResume] = useState(0);
  useEffect(()=>{if(scene!=='interior'&&moveOrigin.current){moveOrigin.current=null;decoration.cancel();}},[scene]);
  const [selectedId, setSelectedId] = useState(null);
  const [storageId,setStorageId]=useState(null);
  const [furnitureFocus,setFurnitureFocus]=useState(null);
  const [pendingView,setPendingView]=useState(null);
  const [overviewRevision,setOverviewRevision]=useState(0);
  const cameraFocus=cameraPlaces[storageId]?storageId:furnitureFocus;
  useEffect(()=>{if(cameraPlaces[storageId])setFurnitureFocus(null);},[storageId]);
  const requestStorage=id=>{if(catchPartner(id))return;pendingDevice.current=null;if(id&&!id.startsWith('hide:')){setStorageId(id);return;}const owner=id?.startsWith('hide:')?id.slice(5):id?.split(':')[0];const key='view:'+owner;if(['bedroomWardrobe','studyDesk','studyPrinter','studyShelf','bedroomNightstand','bedroomShelf'].includes(owner)){setFurnitureFocus(null);setStorageId(id);return;}if(owner==='refrigerator'){setFurnitureFocus(null);setStorageId(id.startsWith('refrigerator:')?id:fridgeSlots.upper);return;}if(owner==='tvUnit'){setStorageId(null);if(furnitureFocus===key)setHomeState(s=>({...s,tvOn:!s.tvOn}));else setFurnitureFocus(key);return;}if(owner==='stove'){setStorageId(null);if(furnitureFocus!==key)setFurnitureFocus(key);else{setCookingStart([]);setCookingOpen(true);}return;}if(furnitureViews[owner]&&furnitureFocus!==key){setStorageId(null);setFurnitureFocus(key);}else if(owner!=='diningTable')setStorageId(id);};
  const [craftOpen,setCraftOpen]=useState(false);
  const [tailorOpen,setTailorOpen]=useState(false);
  const [artOpen,setArtOpen]=useState(null);
  const pendingDevice=useRef(null),settledCamera=useRef(null);
  const [focusRevision,setFocusRevision]=useState(0);
  const showDevice=id=>{pendingDevice.current=null;if(id==='hide:studyCraft')setCraftOpen(true);else if(id==='hide:studyTailor')setTailorOpen(true);else setArtOpen(id==='hide:studyTarot'?'tarot':id==='hide:studyComputer'?'draw':'print');};
  const openDevice=id=>{if(cameraFocus===id&&settledCamera.current===id){showDevice(id);return;}pendingDevice.current=id;settledCamera.current=null;setFurnitureFocus(null);setStorageId(id);setFocusRevision(v=>v+1);};
  const cameraSettled=id=>{settledCamera.current=id;if(id&&pendingDevice.current===id)showDevice(id);};
  useEffect(()=>{pendingDevice.current=null;settledCamera.current=null;},[scene,floor,room,decorMode]);

  const [bagOpen,setBagOpen]=useState(false);
  const [placing,setPlacing]=useState(null);
  const placementApi=useRef(null);
  const [bagFocus,setBagFocus]=useState(null),[bagTab,setBagTab]=useState('items');
  // The backpack opens at one of its pages; something to look at opens the things.
  const openBag=(tab='items',focus=null)=>{if(tab==='diary')play('page',{volume:.8});setBagTab(focus?'items':tab);setBagFocus(focus);setBagOpen(true);};
  useEffect(()=>{if(bookOpen&&(bagOpen||craftOpen||artOpen||scene!=="interior")){decoration.cancel();setBookOpen(false);setDecorMode(false);}},[bagOpen,craftOpen,artOpen,scene,bookOpen]);
  const creations=homeState.creations||[];
  // While arranging the house, a placed thing can be picked like furniture.
  const movingCreation=decorMode&&!bookOpen&&selectedId?.startsWith('creation:')&&creations.some(i=>i.id===selectedId.slice(9)&&i.location==='room')?selectedId.slice(9):null;
  // Furniture-sized builds standing on the floor follow the furniture's rules
  // (furniture-range.js): what one being arranged stands on shows in red, and so
  // do the builds a piece of furniture being arranged stands on.
  const builtHere=useMemo(()=>builtPieces(creations,floor,room),[creations,floor,room]);
  const movingBuilt=movingCreation?builtHere.find(b=>b.id==='creation:'+movingCreation)||null:null;
  const builtClash=movingBuilt?builtOverlaps(movingBuilt,homeState.furniture,shownIn(floor,room),builtHere):[];
  const redBuilds=decorMode?[...(builtClash.length?[movingCreation]:[]),...(movingBuilt?builtClash:floorPieces[selectedId]?overlapsFor(selectedId,homeState.furniture,defaultHomeState.furniture,shownIn(floor,room),.08,builtHere):[]).filter(id=>id.startsWith('creation:')).map(id=>id.slice(9))]:[];
  const openLetter=id=>setHomeState(s=>({...s,creations:(s.creations||[]).map(i=>i.id===id&&i.kind==='note'&&!i.opened?{...i,opened:true}:i)}));
  // The computer's puzzle folder: its clue goes into hiding the first time the
  // folder is opened (false when every place is full); opening it keeps the day
  // and gives what it holds (folder-open.js).
  const hidePuzzleClue=(id=GARDEN)=>{if(clueOf(creations,id))return true;if(hideClue(creations,{id})===creations)return false;setHomeState(s=>({...s,creations:hideClue(s.creations||[],{id})}));return true;};
  const solvePuzzle=(id=GARDEN)=>{const keyId=crypto.randomUUID();setHomeState(s=>openFolder(s,id,{day:dayIn(zone),newId:()=>keyId}));};
  // The coffee table's top is shared by what is set down in its close-up and letters left on it (src/machine-acts.js);
  // taking out something an AI hid counts as having found it.
  const transfer=(id,location,slot)=>setHomeState(s=>{const others=(s.creations||[]).filter(i=>i.id!==id);if(slot!==undefined&&(!Number.isInteger(slot)||slot<0||slot>=spotsFor(location).length||others.some(i=>i.location===location&&i.slot===slot)||(location==='hide:coffeeTable'||location==='table')&&tableTaken(others,slot)))return s;const next=moveItem(s.creations||[],id,location);return {...s,creations:markHiddenFound(next.map(i=>i.id===id&&i.location===location?{...unstash(i),slot:slot??i.slot,spotId:location==='bag'?undefined:spotsFor(location)[slot??i.slot]?.id}:i),[id],dayIn(zone))};});
  // A placed thing goes where a tap (or the remote) sends it: the floor, a piece
  // of furniture, or the top of a build.
  // Where a placed thing ends up for a surface found under a tap (or the remote):
  // the floor, a piece of furniture, the top of a build, or a wall. null when it
  // can't go there, with the reason.
  const placementFor=(item,result)=>{
    // A build tapped onto a wall hangs there, its back against it.
    if(result.wall){
      const hung=item?.kind==='build'&&hangOn(result.wall,buildSize(item),result.point);
      return hung?{at:{position:hung.position,support:null,rotationY:hung.rotationY,wall:hung.wall}}:{why:'墙上挂不下它。'};
    }
    // A furniture-sized build set down on the floor (a rug under it doesn't carry
    // it) stands straight in the room and stays inside its floor.
    if(item?.kind==='build'&&item.scale==='furniture'&&result.preview[1]<FLOOR_LEVEL&&(!result.support||floorPieces[result.support]?.flat)){
      const standing={...item,location:'room',support:null,wall:null,position:result.preview},spec=builtPiece(standing,floor==='1F'?'downstairs':room),fit=spec&&placeAt(spec,standing,result.preview[0],result.preview[2]);
      return fit?{at:{position:fit.position,support:null,wall:null}}:{why:'这里放不下它。'};
    }
    return {at:{position:result.position,support:result.support,wall:null}};
  };
  const placeCreation=(id,result,quiet=false)=>{
    if(!id||!result)return;
    const item=creations.find(i=>i.id===id),{at,why}=placementFor(item,result);
    if(!at){setToast(why);return;}
    if(!quiet)play(placedSound(item));
    setHomeState(s=>({...s,creations:placeItem(s.creations,id,at,floor,room)}));
    if(id===placing)setPlacing(null);
  };
  // An eighth of a turn; a build standing on the floor steps in from a wall it would turn into.
  const turnCreation=id=>{if(creations.find(i=>i.id===id)?.wall)return;play('turn');setHomeState(s=>({...s,creations:s.creations.map(i=>{
    if(i.id!==id)return i;
    const rotationY=Math.round(((i.rotationY||0)/(Math.PI/4)+1)%8)*Math.PI/4,spec=builtPiece(i,i.floor==='1F'?'downstairs':i.room||'study');
    return spec?turnBy(spec,i,rotationY-(i.rotationY||0)):{...i,rotationY};
  })}));};
  const rearrange=(id,x,z)=>setHomeState(s=>({...s,creations:shiftItem(s.creations||[],id,x,z).map(i=>({...i,spotId:i.location==='bag'?undefined:spotsFor(i.location)[i.slot]?.id}))}));
  const updateCraftDraft=next=>setHomeState(s=>({...s,craftDraft:next,craftDrafts:{...(s.craftDrafts||{}),[s.craftDraft?.kind||'bricks']:s.craftDraft,[next.kind||'bricks']:next}}));
  // What the benches have to work with, and using some of it up (src/bench-stock.js).
  // Lace laid on a table is only lent there (src/lace-cloth.js): the benches have what is left in the drawer; the
  // sample book counts what is laid in what it tries on (benchBase).
  const laidLace=lacedPieces(decoration.committed).length;
  const benchBase=useMemo(()=>stockOf(homeState),[homeState.explore,homeState.spent]);
  const benchStock=useMemo(()=>stockOf(homeState,{laid:laidLace}),[homeState.explore,homeState.spent,laidLace]);
  const spendStock=cost=>setHomeState(s=>({...s,spent:spend(s.spent,cost)}));
  const finishCreation=(provided)=>setHomeState(s=>{
    const d=provided?.kind?provided:s.craftDraft;
    if(!d.name.trim()||!(d.kind==='animal'?validAnimal(d):d.kind==='bouquet'?validBouquet(d):d.kind==='build'?validRecipe(d):d.kind==='dessert'?validDessert(d):d.kind==='dish'?validDish(d):validBuild(d.bricks)))return s;
    const item={...structuredClone(d),id:crypto.randomUUID(),name:d.name.trim(),location:'bag',slot:0,madeOn:d.madeOn||dayIn(zone)};
    // A doll's dyes, a dessert's essences and fruit, a dish's tomato or greens are used up now it is made (src/bench-stock.js).
    const cost=['animal','dessert','dish'].includes(item.kind)?costOf(item,{own:ownColours(availableSpecies(cleanCaught(s.caught)))}):null;
    if(cost&&short(stockOf(s),cost))return s;
    return rememberAlbum({...s,creations:[...(s.creations||[]),item],...(cost?{spent:spend(s.spent,cost)}:{})});
  });
  const [giftNote,setGiftNote]=useState('给你藏的一点小惊喜');
  // The kitchen: the dessert table on the island, the glass dome on the dining table, the dessert book.
  const [cookingOpen,setCookingOpen]=useState(false),[cookingStart,setCookingStart]=useState([]),[dessertOpen,setDessertOpen]=useState(false),[dessertBookOpen,setDessertBookOpen]=useState(false),[meal,setMeal]=useState(null),[domeTagOpen,setDomeTagOpen]=useState(false),[dessertWritingId,setDessertWritingId]=useState(null);
  const dome=domeItem(creations);
  // When a meal starts the two residents should walk to these two chairs and sit down to eat; their walking wires in here.
  // The two of them walk over and sit down first; the dome lifts once both are sitting
  // (or after a while, if they can't get to the table from here).
  const onDessertEat=({chairs})=>{const begin=()=>setMeal(m=>m&&!m.started?{...m,started:performance.now()}:m);moveResident('dine',null,{chairs,onSeated:begin});setTimeout(begin,7000);};
  // The table with nothing under the dome has one way on: a dessert from the bag, or the island to make one.
  const bagDessert=creations.filter(i=>(i.kind==='dessert'||i.kind==='dish')&&i.location==='bag').at(-1);
  const fillDome=()=>{if(bagDessert)openBag('items',bagDessert.id);else visitFurniture('view:island');};
  const startMeal=()=>{if(!dome||meal)return;if(cameraFocus!=='view:diningTable')visitFurniture('view:diningTable');setMeal({id:dome.id,started:null});onDessertEat({chairs:DINING_PAIR,item:dome});};
  const endMeal=id=>{setMeal(null);const now=new Date(),day=dayIn(zone),hour=Number(new Intl.DateTimeFormat('en-GB',{timeZone:zone,hour:'2-digit',hourCycle:'h23'}).format(now));setHomeState(s=>finishMeal(s,id,day,{hour}));setToast(<span>记进甜品簿了。 <button className="dessert-toast-write" onClick={()=>{setDessertWritingId(id);setDessertBookOpen(true);setToast('');}}>写一句</button></span>);};
  // Tapping the dome from across the room first brings the table close; tapping it there reads its tag. Eating is the bar's button.
  const tapDome=()=>{if(cameraFocus!=='view:diningTable')visitFurniture('view:diningTable');else if(!meal)setDomeTagOpen(v=>!v);};
  useEffect(()=>{setDomeTagOpen(false);},[cameraFocus,meal?.id,dome?.id]);
  useEffect(()=>{setMeal(null);},[scene,floor]);
  useEffect(()=>{if(meal&&dome?.id!==meal.id)setMeal(null);},[dome?.id]);
  const updateStorage=(id,patch)=>{
    if(decorMode)return;
    setHomeState(current=>{
      if(id.startsWith('tv:')){
        const side=id.slice(3),cabinet=current.containers.tvUnit;
        return {...current,containers:{...current.containers,tvUnit:{...cabinet,...('open' in patch?{[`${side}Open`]:patch.open}:{}),slots:{...cabinet.slots,...('gift' in patch?{[side]:patch.gift}:{})}}}};
      }
      return {...current,containers:{...current.containers,[id]:{...current.containers[id],...patch}}};
    });
  };
  const storedGift=storageId?.startsWith('tv:')?homeState.containers.tvUnit.slots[storageId.slice(3)]:homeState.containers[storageId]?.gift;
  useEffect(()=>{setStorageId(null);setFurnitureFocus(null);setSeatMenu(null);},[scene,floor,room,decorMode]);
  useEffect(()=>setSeatMenu(null),[storageId,bagOpen,artOpen,craftOpen,residentOpen]);
  useEffect(()=>{if(!pendingView)return;if(pendingView.startsWith('view:')){setStorageId(null);setFurnitureFocus(pendingView);}else{setFurnitureFocus(null);setStorageId(pendingView);}setPendingView(null);},[pendingView,floor,room]);
  const visitFurniture=id=>{pendingDevice.current=null;settledCamera.current=null;setStorageId(null);setFurnitureFocus(null);setDecorMode(false);if(!id){setPendingView(null);setOverviewRevision(v=>v+1);setRoom(floor==='1F'?'overview':room);return;}setRoom(floor==='1F'?'overview':id.includes('bedroom')?'bedroom':'study');setPendingView(id);};

  const [toast, setToast] = useState("");
  // A kiss between the two residents counts towards the rose castle (src/roses.js): nine a day, ninety-nine in all.
  // The ninety-ninth says so a little longer than a plain toast (not a string: seven seconds).
  const countKiss=()=>{const day=dayIn(zone),{counted,reached}=addKiss(homeState.roses,day);if(!counted)return;setHomeState(s=>({...s,roses:addKiss(s.roses,day).roses}));if(reached){play('found');setToast(<span>第九十九下。{partnerKind==='girl'?'她':'他'}把玫瑰城堡送给你了：点门廊灯，在「外观」里换上它。</span>);}};
  const porchState = usePorch(porch);
  // Whether the account signed in here is this home's, as the server said: its own things are fetched (once) when it
  // is, and the house draws again when they come in later than it did.
  const [oursTick,setOursIn]=useState(0);
  useEffect(()=>onOursLoaded(()=>setOursIn(n=>n+1)),[]);
  useEffect(()=>{if(porchState.status==='signed-out')noteOurs(null,false);else if(porchState.account&&typeof porchState.ours==='boolean')noteOurs(porchState.account,porchState.ours);},[porchState.status,porchState.account?.id,porchState.ours]);
  const [porchOpen, setPorchOpen] = useState(false);
  // Out on the street (the community map), and at someone's door: walking out needs the porch light on (signed in).
  const [visiting, setVisiting] = useState(null);
  // The capsule machine on a street's plaza: a ticket in, and what comes out is kept at once.
  const [machine, setMachine] = useState(null);
  const turnCapsule=pool=>{const r=turnDial(homeNow.current,{day:dayIn(zone),notes:homeNotes,pool});if(r.problem)return r;homeNow.current=r.state;setHomeState(r.state);return r;};
  const swapScraps=(prize,pool)=>{const r=exchange(homeNow.current,prize,{day:dayIn(zone),pool});if(r.problem)return r;homeNow.current=r.state;setHomeState(r.state);return r;};
  // The claw machine: a ticket goes in as the claw goes down; a doll that's coming out is kept at once.
  const payForClaw=()=>{const r=payClaw(homeNow.current,dayIn(zone));if(r.problem)return false;homeNow.current=r.state;setHomeState(r.state);return true;};
  const keepCaught=doll=>{const next=rememberAlbum(keepDoll(homeNow.current,doll,{day:dayIn(zone),id:crypto.randomUUID()}));homeNow.current=next;setHomeState(next);};
  // The blind box machine: a ticket goes in with the box chosen, and what's in it is kept at once.
  const chooseBox=thing=>{const day=dayIn(zone),r=payBox(homeNow.current,day);if(r.problem)return false;const next=keepThing(r.state,thing,{day,id:crypto.randomUUID()});homeNow.current=next;setHomeState(next);return true;};
  // At someone's door (door.jsx): knocking, and leaving something in their mailbox.
  const visit=useVisit({visiting:scene==='visit'?visiting:null,porch,accountId:porchState.account?.id,day:dayIn(zone),onLeft:async id=>{const next={...rememberAlbum(homeNow.current),creations:(homeNow.current.creations||[]).filter(i=>i.id!==id)};localStorage.setItem('porchlit-home-layout-v1',JSON.stringify({...next,appearance:{themeKey,floorFinishKey}}));homeNow.current=next;setHomeState(next);porch.poll();await porch.flush();if(porch.getState().status!=='saved')throw Error('已经寄出，背包还在等保存；再点一次确认即可。');},say:setToast});
  // At this home's own door: what's waiting there, taking it in or not, the guestbook.
  const ownDoor=useOwnDoor({porch,signedIn:!!porchState.account,scene});
  const [doorOpen,setDoorOpen]=useState(false);
  const openDoorPanel=()=>{if(!porchState.account){setToast('点亮门廊灯（登录）以后，邮箱才接通。');return;}play('lid',{volume:.6});ownDoor.refresh();setDoorOpen(true);};
  const takeGift=async w=>{
    const r=await porch.takeMail(w.id), next=rememberAlbum(receiveMail(homeNow.current,r,dayIn(zone)));
    // Persist before claiming success; a failed write leaves the parcel recoverable at the door.
    localStorage.setItem('porchlit-home-layout-v1',JSON.stringify({...next,appearance:{themeKey,floorFinishKey}}));
    homeNow.current=next;setHomeState(next);porch.poll();await porch.flush();
    play('boxOpen');setToast('收下了，放进背包里了');await ownDoor.refresh();
  };
  const declineGift=async w=>{await porch.declineMail(w.id);await ownDoor.refresh();};
  const blockVisitor=async v=>{await porch.block(v.id);await ownDoor.refresh();},unblockVisitor=async b=>{await porch.unblock(b.id);await ownDoor.refresh();};
  // Reporting what was left at the door, or the home being visited (server/reports.mjs); either blocks them too.
  const reportVisit=async(v,reason,words)=>{await porch.report({visit:v.id,reason,words});await ownDoor.refresh();},reportHome=(reason,words)=>porch.report({door:{street:Number(visiting.street),lot:Number(visiting.lot)},reason,words});
  // Coming up to the house with something waiting at the door, once for each new thing.
  const doorHeard=useRef('');
  useEffect(()=>{if(scene!=='exterior'||!ownDoor.door)return;const ids=ownDoor.door.waiting.map(w=>w.id).join(',');if(!ids||ids===doorHeard.current)return;doorHeard.current=ids;const knockers=[...new Set(ownDoor.knocks.map(k=>k.from?.nickname||k.from?.name))];setToast(ownDoor.letters?'门口有东西等你收，点邮箱看看。':`${leading(knockers.join('、'))}来敲过门。`);},[scene,ownDoor.door]);
  const goWalk=()=>{setDecorMode(false);setMenuOpen(false);if(!porchState.account){setPorchOpen(true);setToast('先点亮门廊灯（登录），才能出门散步。');return;}setScene('map');};
  // Hide-and-seek (hide-and-seek.js): on the first visit of each day the
  // partner hides somewhere; finding him gets a kiss and a line in the diary.
  // Coming in writes nothing to the home (so devices never fall out over it):
  // where he hides follows from the day, and when she came in is this
  // device's own visit. Only a find is saved.
  const partnerKind=readWardrobe(homeState.residents?.wardrobeV1).playerKind==='boy'?'girl':'boy';
  const [seekVisit,setSeekVisit]=useState(()=>{try{return cleanVisit(JSON.parse(localStorage.getItem(VISIT_KEY)));}catch{return null;}});
  // While this page holds an out-of-date copy of the home (a newer one is in the
  // cloud, or it's waiting to be chosen), it may not know he was already found today.
  const seekPaused=['newer','choose','stale'].includes(porchState.status);
  const seekId=seekPaused?null:hidingOn(homeState.hideSeek,seekVisit?.day,availableSpots(homeState.furniture));
  const seekSpot=seekId?spotPlacement(seekId,homeState.furniture):null;
  const [reunion,setReunion]=useState(null),[seekFidget,setSeekFidget]=useState(false);
  const openDiary=()=>openBag('diary');
  const greetHideSeek=()=>{const day=dayIn(zone),{visit,first}=enterVisit(seekVisit,day,Date.now());if(first){setSeekVisit(visit);try{localStorage.setItem(VISIT_KEY,JSON.stringify(visit));}catch{}}const message=enterMessage({first,hiding:!seekPaused&&!!hidingOn(homeState.hideSeek,day,availableSpots(homeState.furniture))},partnerKind);if(message)setToast(message);};
  const enterHouse=()=>{greetHideSeek();setScene("interior");};
  const findPartner=()=>{if(!seekSpot||!seekVisit)return;play('found');const now=Date.now(),seconds=Math.max(0,Math.round((now-seekVisit.enteredAt)/1000)),found={day:seekVisit.day,spot:seekSpot.id,seconds,seed:newSeed()};setHomeState(s=>{const before=cleanHideSeek(s.hideSeek),after=markFound(before,found);return after.total>before.total?{...s,hideSeek:after,tickets:earnTicket(s.tickets,'seek',found.day)}:{...s,hideSeek:after};});setReunion({id:now,kiss:kissFor(seconds),spot:seekSpot});setToast(foundMessage(markFound(homeState.hideSeek,found),seekVisit.day)+' · 得了一张券');};
  // Opening the furniture he's in or behind finds him, instead of its close-up.
  const catchPartner=id=>{if(!seekSpot||decorMode||!(spotOpeners[seekSpot.id]||[]).includes(id))return false;if(id==='island')updateStorage('island',{open:false});findPartner();return true;};
  useEffect(()=>{setSeekFidget(false);if(!seekSpot||!seekVisit)return;const timer=setTimeout(()=>setSeekFidget(true),Math.max(0,seekVisit.enteredAt+WIGGLE_AFTER*1000-Date.now()));return()=>clearTimeout(timer);},[seekVisit?.enteredAt,!!seekSpot]);
  // Left open overnight: coming back to the page on a new day counts as coming in.
  const greetRef=useRef(greetHideSeek);greetRef.current=greetHideSeek;
  useEffect(()=>{const check=()=>{if(!document.hidden&&scene==='interior'&&seekVisit?.day!==dayIn(zone))greetRef.current();};document.addEventListener('visibilitychange',check);return()=>document.removeEventListener('visibilitychange',check);},[scene,seekVisit?.day,zone]);
  // What an AI living here asked to do (src/machine-acts.js): let in at a quiet moment by the same rules as her own
  // hands, kept here and sent on as a parcel taken in at the door is; the save that carries it tells the server. A card
  // then says who came and what they did (src/machine-visit.jsx); what they hid waits to be found, hints on asking.
  // While she is looking for him, a hiding place he chose goes to tomorrow, so he doesn't move under her.
  // A change of clothes (dress) is kept where the wardrobe keeps it too, cleaned as the wardrobe itself keeps it.
  // If the house can't be kept, the wardrobe goes back as it was too.
  // The decoration and the lights an AI changed (src/machine-decor.js) are kept beside the house, at once, so the save
  // that answers the acts carries them.
  const commitActs=(next,{decor=null,lights=null}={})=>{const before=homeNow.current.residents?.wardrobeV1,dressed=next.residents?.wardrobeV1&&next.residents.wardrobeV1!==before?cleanWardrobe(wearOnlyDrawn(next.residents.wardrobeV1,cleanDrawn(cleanCapsules(next.capsules)))):null;const home=dressed?{...next,residents:{...next.residents,wardrobeV1:dressed}}:next;let worn=null;try{if(dressed){worn=localStorage.getItem(wardrobeKey);localStorage.setItem(wardrobeKey,JSON.stringify(dressed));}if(decor)localStorage.setItem('porchlit-decoration-v1',JSON.stringify(decor));if(lights)localStorage.setItem('porchlit-lights-v1',JSON.stringify(lights));localStorage.setItem('porchlit-home-layout-v1',JSON.stringify({...home,appearance:{themeKey,floorFinishKey}}));}catch{try{if(dressed){if(worn===null)localStorage.removeItem(wardrobeKey);else localStorage.setItem(wardrobeKey,worn);}if(decor)localStorage.setItem('porchlit-decoration-v1',JSON.stringify(decoration.committed));if(lights)localStorage.setItem('porchlit-lights-v1',JSON.stringify(houseLights.all()));}catch{}setToast('浏览器存不下了，家里住的机做的事先没接进来。');return;}if(decor)decoration.replace(decor);if(lights)houseLights.set(lights);homeNow.current=home;setHomeState(home);porch.poll();porch.flush();};
  const actsQuiet=!decorMode&&!bookOpen&&!placing&&!(storageId&&!cameraPlaces[storageId])&&!craftOpen&&!tailorOpen&&!artOpen&&!dessertOpen&&!cookingOpen&&!dessertBookOpen&&!bagOpen&&!meal&&!residentOpen;
  const searchingNow=!!seekSpot&&seekVisit?.day===dayIn(zone);
  // The wardrobe as the AIs living here are told it (src/machine-closet.js): worked out from what the home has once
  // this home's own things are here (they are in it), sent to the server whenever it changes, and what their asks to
  // dress the two of them are let in against.
  // Asked when it's needed (the home's own things may come in between): ready once they're here, or when this isn't
  // a home that has any; and only while this page knows everything the two of them have on.
  const closetFor=home=>{if(!(oursLoaded()||!(oursExpected()||porchState.ours===true)))return null;if(!wardrobeKnown(storedWardrobe(home.residents?.wardrobeV1)))return null;return closetOf({wardrobe:readWardrobe(home.residents?.wardrobeV1),drawn:cleanDrawn(cleanCapsules(home.capsules)),day:dayIn(zone)});};
  const closetNow=useMemo(()=>closetFor(homeState),[oursTick,porchState.ours,homeState.residents,homeState.capsules,homeState.tailor,dayIn(zone)]);
  // Sent while this page holds the home as the server has it; tried again a while after it didn't go.
  const closetSent=useRef(''),[closetAgain,setClosetAgain]=useState(0);
  useEffect(()=>{if(!closetNow||!porchState.account||!porchState.residents?.length||!['saved','idle','dirty'].includes(porchState.status))return;const text=JSON.stringify(closetNow);if(text===closetSent.current)return;let gone=false,again=null;const timer=setTimeout(()=>{porch.closet(closetNow).then(()=>{closetSent.current=text;},()=>{if(!gone)again=setTimeout(()=>setClosetAgain(n=>n+1),30000);});},1500);return()=>{gone=true;clearTimeout(timer);clearTimeout(again);};},[closetNow,porchState.account?.id,porchState.residents?.length,porchState.status,closetAgain]);
  // Going out together (src/door-outing.jsx, src/explore-trips.js): waiting at the door, setting off when he has said
  // 走, and home again. Each is kept at once, so the AIs see her at the door and the day's count holds whatever device
  // she comes back on.
  const keepHere=next=>{localStorage.setItem('porchlit-home-layout-v1',JSON.stringify({...next,appearance:{themeKey,floorFinishKey}}));homeNow.current=next;setHomeState(next);porch.poll();};
  const keepNow=async next=>{keepHere(next);await porch.flush();};
  const [outingOpen,setOutingOpen]=useState(false);
  const outing={
    wait:async()=>{play('lid',{volume:.5});await keepNow({...homeNow.current,explore:waitAtDoor(homeNow.current.explore,Date.now())});},
    stop:()=>keepNow({...homeNow.current,explore:leaveDoor(homeNow.current.explore)}),
    // The basket first: a browser that can't hold it doesn't use up one of the day's trips. And only on the home as the
    // server has it: another device may have set out on this 走 already (it would be two walks for one), so a newer
    // copy is taken first (the page reloads with it).
    go:async()=>{if(readTrip()||readStrayTrip())throw Error('上一趟还没收进家里，等一下再出门。');await porch.look();if(porch.getState().status==='newer'){porch.takeNewer();throw Error('别的设备刚改过家里，先换上新的。');}const r=startTrip(homeNow.current.explore,dayIn(zone),String(porchState.account?.id||''),{him:partnerKind==='girl'?'她':'他'});if(r.problem)throw Error(r.problem);if(!writeTrip(r.trip))throw Error('这个浏览器记不住出门的篮子，换个浏览器再试。');try{await keepNow({...homeNow.current,explore:r.explore});}catch{dropTrip();throw Error('浏览器存不下了，这趟没出成。');}play('page');location.href='/?explore=book';},
  };
  // Waiting at the door here while another device let his 走 in (and saved): this page's copy never lights the door,
  // because acts go only into the copy the server has. Nothing has changed here (that's what newer means), so the newer
  // home is taken (the page reloads with the door lit).
  useEffect(()=>{if(porchState.status==='newer'&&!document.hidden&&outingNow(homeNow.current.explore,dayIn(zone))==='door')porch.takeNewer();},[porchState.status]);
  // Back from going out: what was in the basket is kept and the trip goes into the diary, once this page holds the
  // home as the server has it. Being home at all means they came back, however she got here. One that never got into
  // the book (she turned back at the cover) is given back: not one of the day's two, and his 走 stands
  // (src/explore-trips.js homecoming); one home already (a copy of the tab) brings nothing again, bottles included.
  const tripBack=useRef(false);
  useEffect(()=>{if(tripBack.current||['checking','newer','choose','stale'].includes(porchState.status))return;const trip=readTrip()||readStrayTrip();tripBack.current=true;if(!trip)return;
    const {explore,back}=homecoming(homeNow.current.explore,trip),n=trip.basket.length,got=[...new Set(trip.basket.map(f=>findName(f.place,f.id)).filter(Boolean))];
    try{keepHere({...homeNow.current,explore,...(back==='home'?{bottles:awaitBottles(homeNow.current.bottles,bottlesIn(trip))}:{})});}catch{setToast('浏览器存不下了，篮子先放在门口，下次进门再收。');return;}
    // Kept here, the basket is put away at once: going back into the book now finds no trip.
    dropTrip();porch.flush();
    if(back==='given')setToast(`这趟还没翻进书里就回来了，不算数；${partnerKind==='girl'?'她':'他'}说的「走」还在。`);
    else if(back==='home')setToast(!n?'回家了。这趟什么也没捡，日记里记了一笔。':got.length<=2?`回家了，带回来${got.join('、')}。`:`回家了，篮子里 ${n} 样都收进图鉴了。`);},[porchState.status]);
  // Drift bottles brought home from the lake (src/bottles.js): each opened by asking the sea what's in it, once the
  // porch light is on and this page holds the home as the server has it; a stranger's words go into the backpack. One
  // at a time. One that couldn't be asked, or not today (the home has opened enough), is asked again a while later (the
  // same find opens the same bottle); one the sea won't open at all is an empty bottle, so the rest aren't held up.
  const bottleTry=useRef(false),bottlesWaiting=cleanBottles(homeState.bottles).waiting,[bottleAgain,setBottleAgain]=useState(0);
  // A drift bottle reported (server/reports.mjs): the bottle is thrown away, and its writer's don't wash up here again.
  // Reported already (the answer lost on the way) is reported.
  const reportBottle=async(item,reason,words)=>{try{await porch.report({bottle:item.bottle.id,reason,words});}catch(err){if(err?.code!=='already')throw err;}await keepNow({...homeNow.current,creations:(homeNow.current.creations||[]).filter(i=>i.id!==item.id)});setToast('举报了。这只瓶子扔掉了，写它的人的瓶子不会再漂来。');};
  // The drift bottle on the study computer (src/bottle-desk.jsx): one thrown is kept for the diary too.
  const sea={signedIn:!!porchState.account,thrownToday:thrownToday(homeState.bottles,dayIn(zone)),list:()=>porch.bottles(dayIn(zone)),
    throwBottle:async({words,requestId})=>{const day=dayIn(zone);await porch.throwBottle({words,day,requestId});await keepNow({...homeNow.current,bottles:threwBottle(homeNow.current.bottles,{day})}).catch(()=>{});}};
  useEffect(()=>{if(bottleTry.current||!bottlesWaiting.length||!porchState.account||!['saved','idle','dirty'].includes(porchState.status))return;bottleTry.current=true;const key=bottlesWaiting[0];
    const again=ms=>setTimeout(()=>{bottleTry.current=false;setBottleAgain(n=>n+1);},ms);
    const opened=(found,said)=>keepNow(openBottle(homeNow.current,key,found,dayIn(zone))).then(()=>{if(said){play(found?'note':'tap',{volume:.7});setToast(found?'湖边捞回来的漂流瓶拆开了：里面是一张陌生人写的纸条，收在背包里。':'湖边捞回来的瓶子是空的，只倒出来一点沙。');}bottleTry.current=false;});
    porch.openBottle(key).then(r=>bottleAnswer(r),err=>bottleAnswer(null,err)).then(a=>a.later?again(a.later):opened(a.found,a.said).catch(()=>again(60000)));},[bottlesWaiting.join(','),porchState.account?.id,porchState.status,bottleAgain]);
  useMachineActs({porch,state:porchState,home:()=>homeNow.current,commit:commitActs,quiet:actsQuiet,context:()=>({day:dayIn(zone),defaults:defaultHomeState.furniture,available:availableSpots(homeNow.current.furniture),searching:searchingNow,him:partnerKind==='girl'?'她':'他',wardrobe:readWardrobe(homeNow.current.residents?.wardrobeV1),closet:closetFor(homeNow.current),decor:decoration.committed,lights:houseLights.all()})});
  // What an AI asked the two of them to do (together: he hugs her, steals a kiss, takes her hand…) plays once she's
  // home: inside, looking at the room (no close-up, nothing open over the house), he isn't hiding, they aren't asleep
  // or dancing, the page is in view and holds the home as the server has it. One at a time: the figures say what he
  // did, or that it can't be now (something she asked for is under way, he can't get to her), and then it's tried
  // again a little later. The home says what he actually did (a kiss on his lap rather than a hug).
  // One that waits for its moment (a dance for a record playing, bed for the bedroom, the sofa downstairs) lets those
  // behind it go first.
  const [,setMusicTick]=useState(0);useEffect(()=>onMusicChange(()=>setMusicTick(n=>n+1)),[]);
  const nextScene=sceneNow(homeState.machine,{floor,room,playing:musicState().playing}),lastScene=useRef(0),[sceneTry,setSceneTry]=useState(0);
  const sceneFree=scene==='interior'&&!seekSpot&&!(reunion&&Date.now()-reunion.id<7000)&&actsQuiet&&!storageId&&!porchOpen&&!doorOpen&&!cameraFocus&&!inBed&&!dancingNow&&!['newer','choose','stale'].includes(porchState.status);
  useEffect(()=>{if(!nextScene||!sceneFree)return;
   if(document.hidden){const seen=()=>{if(!document.hidden)setSceneTry(n=>n+1);};document.addEventListener('visibilitychange',seen);return()=>document.removeEventListener('visibilitychange',seen);}
   // An answer that comes after this has been called off still counts (it happened); only the trying again stops.
   const key=nextScene.key,action=nextScene.action;let answered=false,over=false,later=null;
   // Watching together: the television goes on as they go to sit down, not before (it may not be now).
   const done=did=>{if(answered)return;answered=true;clearTimeout(later);if(did){lastScene.current=Date.now();setHomeState(s=>({...s,...(did==='watch'&&!s.tvOn?{tvOn:true}:{}),machine:playScene(s.machine,key,{him:partnerKind==='girl'?'她':'他',as:did})}));}else if(!over)later=setTimeout(()=>setSceneTry(n=>n+1),8000);};
   const timer=setTimeout(()=>{if(document.hidden){setSceneTry(n=>n+1);return;}moveResident('machine',null,{touch:action,onDone:done});later=setTimeout(()=>done(null),9000);},Math.max(1800,lastScene.current+6000-Date.now()));
   return()=>{over=true;clearTimeout(timer);clearTimeout(later);};},[nextScene?.key,sceneFree,sceneTry]);
  // One whose moment hasn't come by the end of the next day is let go (the card and the diary say so).
  useEffect(()=>{if(lapseScenes(homeState.machine,dayIn(zone))!==homeState.machine)setHomeState(s=>({...s,machine:lapseScenes(s.machine,dayIn(zone))}));},[homeState.machine,zone]);
  const [hiddenOpen,setHiddenOpen]=useState(false);
  const visitEntries=unseen(homeState.machine),stillHidden=hiddenThings(creations);
  // What she calls each AI here (a pet name rather than its own name), for everything that names one.
  const called=useMemo(()=>cleanMachine(homeState.machine).called,[homeState.machine]);
  const callFor=useMemo(()=>by=>called[by?.id]||by?.name||'',[called]);
  const callAI=(id,name)=>setHomeState(s=>({...s,machine:callAs(s.machine,id,name)}));
  const closeVisit=()=>{setHiddenOpen(false);if(visitEntries.length)setHomeState(s=>({...s,machine:markSeen(s.machine)}));};
  const askForHint=id=>{play('page',{volume:.5});setHomeState(s=>({...s,creations:askHint(s.creations||[],id)}));};
  const markFoundHere=ids=>setHomeState(s=>({...s,creations:markHiddenFound(s.creations||[],ids,dayIn(zone))}));
  // The phone's top bar (house-menu.jsx): the rooms open from the house's
  // name, the rest from one menu.
  const [railOpen,setRailOpen]=useState(()=>window.innerWidth>700),[menuOpen,setMenuOpen]=useState(false),[lightsOpen,setLightsOpen]=useState(false);
  // The two sound switches live on the light remote: the little sounds, and
  // the music (which the gramophone also starts and stops). Both are kept on
  // this device.
  const [soundOff,setSoundOff]=useState(()=>isMuted()),[musicOn,setMusicOnShown]=useState(()=>musicState().on);
  useEffect(()=>{setMuted(soundOff);},[soundOff]);
  useEffect(()=>onMusicChange(s=>setMusicOnShown(s.on)),[]);
  // While 雨夜 plays, a fine rain falls outside: it stops with the piece, when the music stops or someone leaves, and while the page is hidden.
  useEffect(()=>{const rain=m=>{if(m.home&&m.playing&&m.piece==='rain'&&!document.hidden)startRain({volume:.6});else if(isRaining())stopRain({fade:3});};const look=()=>rain(musicState());const off=onMusicChange(rain);document.addEventListener('visibilitychange',look);look();return()=>{off();document.removeEventListener('visibilitychange',look);stopRain({fade:1});};},[]);
  const soundSwitches={music:musicOn,effects:!soundOff},flipSound=p=>{if('music' in p)setMusicOn(p.music);if('effects' in p)setSoundOff(!p.effects);};
  const openSampleBook=()=>{setSeatMenu(null);setFurnitureFocus(null);if(cameraPlaces[cameraFocus])setSelectedId(cameraPlaces[cameraFocus].id);else setSelectedId(id=>id?.startsWith('creation:')?null:id);setBookOpen(true);setDecorMode(true);};
  const startMoving=()=>{moveOrigin.current=null;setSeatMenu(null);setFurnitureFocus(null);setSelectedId(null);setDecorMode(true);};
  // Returning from a catalogue move keeps the page, material draft and selected furniture.
  const moveFromBook=()=>{moveOrigin.current={owner:selectedId,floor,room};setBookOpen(false);};
  const finishMoving=()=>{
    const origin=moveOrigin.current;
    if(origin){moveOrigin.current=null;setSelectedId(origin.owner);setFloor(origin.floor);setRoom(origin.room);setBookResume(n=>n+1);setBookOpen(true);}
    else setSelectedId(null);
  };
  const returnToBook=()=>{if(moveOrigin.current)finishMoving();else openSampleBook();};
  const leaveDecoration=()=>{moveOrigin.current=null;decoration.cancel();setBookOpen(false);setDecorMode(false);setSelectedId(null);};
  const menuItems=[
    {label:'背包',icon:<Icon name="bag"/>,note:creations.filter(i=>i.location==='bag').length,onClick:()=>openBag()},
    // What an AI living here hid, still waiting to be found: its card, with the hints.
    ...(stillHidden.length?[{label:hiddenLabel(stillHidden,callFor),icon:<HiddenIcon/>,note:stillHidden.length,onClick:()=>setHiddenOpen(true)}]:[]),
    ...(!decorMode&&!bookOpen?[{label:'挪家具',icon:<MoveIcon/>,onClick:startMoving},{label:'布置',icon:menuIcons.decor,onClick:openSampleBook}]:[]),
    {label:'灯光',icon:menuIcons.light,onClick:()=>{setRailOpen(false);setLightsOpen(true);}},
    {label:'日记',icon:menuIcons.seek,onClick:()=>openDiary()},
    'line',
    {label:'去散步',icon:<Icon name="walk"/>,onClick:goWalk},
    {label:'出门',icon:<Icon name="leave"/>,onClick:()=>{setScene('exterior');setDecorMode(false);}}
  ];
  // When both copies of the home changed, or another tab changed it, the card comes up by itself.
  useEffect(() => { if (porchState.status === "choose" || porchState.status === "stale") setPorchOpen(true); }, [porchState.status]);
  useEffect(() => { if (porchState.note) { setToast(porchState.note); porch.clearNote(); } }, [porchState.note]);
  // The porch light's little chime when someone lights it (signs in), not each time a page opens with it already on.
  const porchWasLit=useRef(!!porchState.account);
  useEffect(()=>{const lit=!!porchState.account;if(lit&&!porchWasLit.current)play('porchLight');porchWasLit.current=lit;},[porchState.account]);
  const [viewMode,setViewMode]=useState("rotate");
  const isMobile = window.innerWidth <= 700;
  const focusedRoom = scene === "interior" && floor === "1F" && room !== "overview";
  const { view, handlers } = useDragOrbit({
    panEnabled: viewMode === "pan",
    resetKey: `${scene}:${floor}:${room}:${overviewRevision}`
  });
  const focusMagnification = room === "living" ? (isMobile ? 1.44 : 1.38) : (isMobile ? 1.34 : 1.28);
  // Before the hand's own zoom (useDragOrbit), which the stage adds itself.
  const stageScale = (scene === "interior" ? (isMobile ? .94 : .92) : 1) * (focusedRoom ? focusMagnification : 1);
  // Outside, the house stands in the middle, whichever room she came out of.
  const baseStagePosition = scene !== "interior" || floor !== "1F" || room === "overview"
    ? [0, 0, 0]
    : room === "living"
      ? [isMobile ? 2.62 : 2.58, isMobile ? -.25 : -.2, isMobile ? -.3 : -.3]
      : [isMobile ? -1.42 : -1.72, 0, .18];
  // At a neighbour's door: what their house wears.
  const visitShell = visiting ? shownShell(visiting, dayIn(zone)) : null;
  // Outside (her own house, or a neighbour's door): the whole house in view, however tall (RoomCamera fits it to
  // the canvas at its size at rest; a pinch or the wheel then zooms on from there).
  const outside = scene === "exterior" || (scene === "visit" && visiting) ? {shell: scene === "visit" ? visitShell : shellKey, scale: isMobile ? .82 : 1} : null;
  const roomLabel = roomData[floor].find((item) => item.id === room)?.label;

  useEffect(() => {
    try {localStorage.setItem("porchlit-home-layout-v1", JSON.stringify({...homeState,appearance:{themeKey,floorFinishKey}}));}
    catch {setToast("浏览器没有保存成功，请先别关闭页面。");}
  }, [homeState,themeKey,floorFinishKey]);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(""), typeof toast==='string'?2800:7000);
    return () => window.clearTimeout(timer);
  }, [toast]);

  const updateFurniture = (id, updater) => {
    setHomeState((current) => ({
      ...current,
      furniture: {
        ...current.furniture,
        [id]: updater(current.furniture[id])
      }
    }));
  };

  const nudgeSelected = (dx, dz) => {
    if (!selectedId) return;
    // A placed thing slides five centimetres a press over what it stands on.
    if (movingCreation) {
      // On a wall it slides along and up the wall; anywhere else over what it stands on.
      const hung = creations.find(i => i.id === movingCreation);
      if (hung?.wall) { const next = nudgeHung(hung, buildSize(hung), Math.sign(dx) * .05, Math.sign(dz) * .05); if (next) setHomeState(s => ({...s, creations: s.creations.map(i => i.id === movingCreation ? {...i, position: next.position} : i)})); return; }
      placeCreation(movingCreation, placementApi.current?.nudge(movingCreation, Math.sign(dx) * .05, Math.sign(dz) * .05), true); return;
    }
    if (!furnitureCatalog[selectedId]) return;
    updateFurniture(selectedId, (item) => {
      const onFloor=moveBy(selectedId,item,dx,dz,defaultHomeState.furniture[selectedId]);
      if(onFloor)return onFloor;
      const rest=restingPieces[selectedId];
      if(rest)return moveResting(selectedId,item,Math.sign(dx)*rest.step,Math.sign(dz)*rest.step,homeState.furniture);
      const [x,y,z] = item.position;
      const meta=furnitureCatalog[selectedId];
      if(meta.placement?.endsWith('Wall')){
        const [min,max,minY,maxY]=meta.bounds;
        const nextY=THREE.MathUtils.clamp(y-dz*.4,minY,maxY);
        return {...item,position:meta.placement==='backWall'?[THREE.MathUtils.clamp(x+dx*.4,min,max),nextY,z]:[x,nextY,THREE.MathUtils.clamp(z-dx*.4,min,max)]};
      }
      const stepScale=meta.step?meta.step/.25:1;
      const [minX,maxX,minZ,maxZ]=furnitureCatalog[selectedId].bounds||[-4.15,.65,-3.05,1.65];
      const nextX = Math.max(minX, Math.min(maxX, Math.round((x + dx*stepScale) * 100) / 100));
      const nextZ = Math.max(minZ, Math.min(maxZ, Math.round((z + dz*stepScale) * 100) / 100));
      return { ...item, position: [nextX,y,nextZ] };
    });
  };

  const rotateSelected = () => {
    if (!selectedId) return;
    if (movingCreation) { turnCreation(movingCreation); return; }
    if (!furnitureCatalog[selectedId]) return;
    play('turn');
    updateFurniture(selectedId, (item) => turnBy(selectedId,item,Math.PI/4,defaultHomeState.furniture[selectedId]) || ({ ...item, rotationY: item.rotationY + Math.PI/4 }));
  };

  const resetSelected = () => {
    if (!selectedId || !furnitureCatalog[selectedId]) return;
    updateFurniture(selectedId, item => ({...freshHomeState().furniture[selectedId],color:item.color}));
  };

  const updateTvCabinet = (next) => {
    setHomeState((current) => ({
      ...current,
      containers: { ...current.containers, tvUnit: next }
    }));
  };

  const toggleDrawer = (side) => {
    const cabinet = homeState.containers.tvUnit;
    updateTvCabinet({ ...cabinet, [`${side}Open`]: !cabinet[`${side}Open`] });
  };

  const toggleStash = () => {
    const cabinet = homeState.containers.tvUnit;
    const hasGift = Boolean(cabinet.slots.right);
    updateTvCabinet({
      ...cabinet,
      rightOpen: true,
      slots: { ...cabinet.slots, right: hasGift ? null : { id: "sample-gift", type: "gift", note: "a little light left for you" } }
    });
    setToast(hasGift ? "小礼物已经取出来了。" : "小礼物藏进右边电视柜了。");
  };

  const chooseFloor = (value) => {
    if (value !== floor) play('tap');
    setPlacing(null);
    setFloor(value);
    setRoom(roomData[value][0].id);
    setDecorMode(false);
    setSelectedId(null);
  };

  return (
    <CalledContext.Provider value={callFor}>
    <div onContextMenu={e=>{if(e.target.tagName==='CANVAS')e.preventDefault();}} className={`app ${daylight<.5?"is-night":"is-day"} scene-${scene} ${decorMode ? "is-decorating" : ""}`} {...(decorMode || cameraFocus ? {} : handlers)}>
      <Topbar menu={scene==='interior'&&<HouseMenu open={menuOpen} onOpenChange={next=>{setMenuOpen(next);if(next){setLightsOpen(false);if(window.innerWidth<=700)setRailOpen(false);}}} items={menuItems}/>} onPlaces={scene==='interior'?()=>{setMenuOpen(false);setRailOpen(v=>!v);}:undefined} lamp={<PorchLamp porch={porch} onOpen={() => setPorchOpen(v => !v)} />} portrait={!residentOpen&&!decorMode&&<ResidentPortraits value={homeState.residents} onSelect={setResidentOpen}/>} showHome={scene === "interior"||scene==="map"||scene==="visit"} subtitle={scene==="map"?"街上":scene==="visit"?`${visiting?.nickname||visiting?.name||''} 家门口`:`${floor} · ${roomLabel}`} onHome={() => {setScene("exterior");setDecorMode(false);}} onWalk={scene==="map"?()=>setScene("exterior"):scene==="visit"?()=>setScene("map"):goWalk} walkLabel={scene==="map"?"回家":scene==="visit"?"回街上":"去散步"} />
      {porchOpen && <PorchCard porch={porch} onClose={() => setPorchOpen(false)}><ShellPicker className="in-card" home={homeState} day={dayIn(zone)} onChoose={key=>setHomeState(s=>wearShell(s,key,dayIn(zone)))}/><RoseCount roses={homeState.roses} day={dayIn(zone)}/></PorchCard>}
      {scene === "map" ? <><Sky daylight={daylight}/><StreetMap porch={porch} daylight={daylight} shell={shellKey} day={dayIn(zone)} onVisit={home=>{setVisiting(home);setScene('visit');}} onHome={()=>setScene('exterior')} onMachine={setMachine}/>{machine?.kind==='blindbox'?<BlindBoxMachine street={machine} tickets={homeState.tickets} found={cleanBlindBox(homeState.blindbox).found} night={daylight<.5} him={partnerKind==='girl'?'她':'他'} onChoose={chooseBox} onClose={()=>setMachine(null)}/>:machine?.kind==='claw'?<ClawMachine street={machine} tickets={homeState.tickets} day={dayIn(zone)} caught={cleanCaught(homeState.caught)} night={daylight<.5} him={partnerKind==='girl'?'她':'他'} onPay={payForClaw} onCatch={keepCaught} onClose={()=>setMachine(null)}/>:machine&&<CapsuleMachine street={machine} tickets={homeState.tickets} capsules={cleanCapsules(homeState.capsules)} day={dayIn(zone)} night={daylight<.5} him={partnerKind==='girl'?'她':'他'} partner={partnerKind} onTurn={turnCapsule} onExchange={swapScraps} onClose={()=>setMachine(null)}/>}</> : (
        <>
          {/* Clouds by day, stars at night; only outside, where the house floats in open sky. */}
          {(scene === "exterior"||scene==="visit") && <Sky daylight={daylight} />}
          <div className="copy">
            <p className="eyebrow">{scene === "interior" ? `${floor} · room` : scene==="visit" ? "at the door" : "our little place"}</p>
            <h1>{scene === "interior" ? roomLabel : scene==="visit" ? (visiting?.name||"") : "Porchlit"}</h1>
            <p>{scene === "interior" ? "留一块空地，慢慢把这里住成自己的样子。" : scene==="visit" ? `${visiting?.nickname?visiting.nickname+'家，':''}${porchLook(visiting?.porch).label}。` : "门廊的灯亮着，就是有人在等。"}</p>
          </div>

          <div className="canvas-wrap" aria-label="可拖动旋转的三维小屋" onPointerDown={()=>setSeatMenu(null)}>
            <QuietCanvas
              paused={!!(storageId && !cameraPlaces[storageId] && !decorMode || craftOpen || tailorOpen || artOpen || bagOpen || residentOpen || dessertOpen || cookingOpen || dessertBookOpen)}
              orthographic
              camera={{ position: [10, 8, 10], zoom: isMobile ? 42 : 76 }}
              shadows
              dpr={[1, 1.6]}
              gl={{ antialias: true, alpha: true }}
              onPointerMissed={() => { if (decorMode) setSelectedId(null); }}
            >
              <FurnitureLabels seatMenu={seatMenu} seatRef={seatActionsRef} cameraFocus={cameraFocus} cameraRef={cameraActionsRef}/><RoomCamera preserveView={decorMode} roomKey={`${scene}:${floor}:${room}`} focusRevision={focusRevision} onSettled={cameraSettled} interactive={!decorMode&&!artOpen&&!craftOpen&&!bagOpen&&!residentOpen&&!dessertOpen&&!cookingOpen&&!dessertBookOpen} focus={cameraFocus} overviewRevision={overviewRevision} homeZoom={isMobile?42:76} outside={outside}/><SceneLights daylight={daylight} /><StillShadows /><RoomLightContext.Provider value={{...houseLights.get(floor==='1F'?'downstairs':room),editing:decorMode,patch:p=>houseLights.patch(floor==='1F'?'downstairs':room,p)}}><TvPictureContext.Provider value={homeState.creations?.find(i=>i.id===homeState.tvPicture)?.image||homeState.tvPicture||'window'}><DaylightContext.Provider value={daylight}><HomeZoneContext.Provider value={zone}>
              <RotatingStage view={view} scale={stageScale} position={baseStagePosition} slides={scene === "interior"}>
                {scene === "interior" ? (
                  <SeatContext.Provider value={{decorMode,open:openSeatMenu,offer:menu=>setSeatMenu(m=>m||menu),close:id=>setSeatMenu(m=>m?.id===id?null:m)}}><HideContext.Provider value={requestStorage}><DessertContext.Provider value={{dome,meal,onDome:tapDome,onMealEnd:endMeal,onBook:()=>{play('page',{volume:.8});setDessertWritingId(null);setDessertBookOpen(true);},decorMode}}><FreePlacement items={creations.filter(i=>i.location==='room'&&i.floor===floor&&(floor==='1F'||(i.room||'study')===room))} pending={placing} moving={movingCreation} red={redBuilds} onSettle={fixes=>setHomeState(s=>({...s,creations:s.creations.map(i=>{const f=fixes.find(([id])=>id===i.id),at=f&&placementFor(i,f[1]).at;return at?{...i,...at}:i;})}))} hangable={creations.find(i=>i.id===(placing||movingCreation))?.kind==='build'} api={placementApi} onSelect={id=>{if(bookOpen)return;if(decorMode){setSelectedId('creation:'+id);return;}openBag('items',id);}} onPlace={result=>placeCreation(placing||movingCreation,result)}/><Room
                    motionEnabled={!decorMode&&!placing&&!residentOpen&&!bagOpen&&!artOpen&&!craftOpen&&!storageId}
                    residentCommand={residentCommand}
                    onTogether={({act,seat,on})=>{if(act==='seated'){setPartnerSeat(seat);return;}if(act==='kiss'){countKiss();return;}if(act==='dance'){setDancingNow(!!on);return;}if(act==='sleep'){setInBed(!!on);houseLights.night('bedroom',!!on);if(on){const night=nightOf(dayIn(zone),hourIn(zone));setHomeState(s=>({...s,nights:addNight(s.nights,night)}));}return;}const view=SEAT_VIEWS[seat];if(view&&cameraFocus!==view&&(floor!=='1F'||room==='overview'))visitFurniture(view);}}
                    onGround={()=>setSeatMenu(null)} onSit={()=>{setFurnitureFocus(null);moveResident("sit");}} onSofaSearch={()=>{setFurnitureFocus(null);setStorageId("hide:sofa");}}
                    room={room}
                    floor={floor}
                    theme={interiorThemes[themeKey]}
                    floorFinish={floorFinishes[decorValue(decoration.state,"room:"+(floor==='1F'?'downstairs':room),"floor",floorFinishKey)]||floorFinishes.oak}
                    onResident={setResidentOpen} onTarot={()=>openDevice('hide:studyTarot')} onCraft={()=>openDevice('hide:studyCraft')} onArt={kind=>openDevice(kind==='print'?'hide:studyPrintPreview':'hide:studyComputer')}
                    onObject={id=>openBag('items',id)}
                    onPower={()=>setHomeState(s=>({...s,tvOn:!s.tvOn}))}
                    homeState={homeState}
                    hideSeek={{partner:partnerKind,hidden:!!seekSpot,spot:seekSpot||reunion?.spot||null,fidget:seekFidget,reunion,onFound:findPartner}}
                    decorMode={decorMode}
                    selectedId={selectedId}
                    built={builtHere} movingBuilt={movingBuilt} builtClash={builtClash}
                    onSelect={setSelectedId}
                    onPlace={(id,next)=>{play('click');updateFurniture(id,item=>({...item,position:next.position,rotationY:next.rotationY}));}}
                    onCabinet={updateTvCabinet}
                    onNotice={setToast}
                    onGramophone={tapGramophone}
                    onStorage={requestStorage}
                    onStorageChange={updateStorage}
                  /></DessertContext.Provider></HideContext.Provider></SeatContext.Provider>
                ) : (
                  <Suspense fallback={null}>
                    {scene==="visit"&&visiting
                      ? <AssetHouse themeKey={themeKey} shellKey={visitShell} level={porchLook(visiting.porch).lamp} windows={porchLook(visiting.porch).windows} onEnter={visit.knock} onMailbox={visit.openMail} />
                      : <AssetHouse themeKey={themeKey} shellKey={shellKey} lit={!!porchState.account} onLamp={() => setPorchOpen(true)} onEnter={enterHouse} letter={ownDoor.letters>0} gift={ownDoor.gifts>0} onMailbox={openDoorPanel} onGift={openDoorPanel} />}
                  </Suspense>
                )}
              </RotatingStage></HomeZoneContext.Provider></DaylightContext.Provider></TvPictureContext.Provider></RoomLightContext.Provider>
            </QuietCanvas>
          </div>

          {scene === "interior" && <FloorRail onBook={()=>openDiary()} open={railOpen} onOpenChange={setRailOpen} onViewPlace={visitFurniture} cameraFocus={cameraFocus} floor={floor} room={room} onFloor={chooseFloor} onRoom={next=>{if(next!==room)play('tap');setRoom(next);setSelectedId(null);setPlacing(null);}} onBag={()=>openBag()} bagCount={creations.filter(i=>i.location==='bag').length} onArt={kind=>setStorageId(kind==='print'?'hide:studyPrintPreview':'hide:studyComputer')} onCraft={()=>setStorageId('hide:studyCraft')} queued={(homeState.printJobs||[]).length} decorMode={decorMode} onDecor={()=>{if(decorMode)leaveDecoration();else startMoving();}} viewMode={viewMode} onView={setViewMode} />}
          {scene==='interior'&&<div className="house-actions">{!decorMode&&<HiddenTag hidden={stillHidden} onOpen={()=>setHiddenOpen(true)}/>}<button onClick={()=>openBag()}><Icon name="bag"/>背包 <small>{creations.filter(i=>i.location==='bag').length}</small></button>{!decorMode&&!bookOpen&&<button className="move-launch" aria-label="挪动家具" onClick={startMoving}><MoveIcon/><span className="move-launch-label">挪家具</span></button>}<span ref={setBookLauncherHost} className="book-toolbar-slot" hidden={decorMode||bookOpen}/>{decorMode&&(bookOpen?<button className="active house-done" onClick={leaveDecoration}>完成</button>:<><button className="house-arrange" onClick={returnToBook}><Icon name="decor"/>布置</button>{selectedId&&<button className="active house-done" onClick={finishMoving}>完成</button>}<button className="house-arrange" onClick={leaveDecoration} aria-label="退出布置" title="退出布置"><Icon name="close"/></button></>)}<button onClick={()=>{setScene('exterior');setDecorMode(false);}}><Icon name="leave"/>出门</button></div>}
          {scene === "interior" && decorMode && !bookOpen && (
            <DecorDock onMaterials={()=>setBookOpen(true)}
              selectedId={selectedId}
              creation={movingCreation&&creations.find(i=>i.id===movingCreation)}
              onBag={()=>{transfer(movingCreation,'bag');setSelectedId(null);}}
              color={homeState.furniture[selectedId]?.color} onColor={color=>updateFurniture(selectedId,item=>({...item,color}))}
              onNudge={nudgeSelected}
              onRotate={rotateSelected}
              onReset={resetSelected}
              cabinet={homeState.containers.tvUnit}
              onDrawer={toggleDrawer}
              onStash={toggleStash}
            />
          )}
          {seatMenu&&scene==='interior'&&!decorMode&&!storageId&&!residentOpen&&!bagOpen&&!artOpen&&!craftOpen&&<div className="seat-actions" role="group" aria-label={seatMenu.partner||seatMenu.self?'两个人':seatMenu.bed?'床':'座椅'} ref={seatActionsRef}>{seatMenu.self?<button onClick={()=>{moveResident('touch',null,{touch:'fuss'});setSeatMenu(null);}}><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M11 4.5l1.6 4.3 4.4 1.7-4.4 1.7-1.6 4.3-1.6-4.3-4.4-1.7 4.4-1.7Z"/><path d="M18 14.5l.7 1.7 1.7.7-1.7.7-.7 1.7-.7-1.7-1.7-.7 1.7-.7Z"/></svg>撒个娇</button>:seatMenu.partner?seatMenu.dancing?<><button onClick={()=>{moveResident('undance');setSeatMenu(null);}}><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 7l10 10M17 7 7 17"/></svg>不跳了</button><button onClick={()=>{moveResident('touch',null,{touch:'kiss'});setSeatMenu(null);}}><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3.5 12.5c2.2-2.8 4.4-4.3 6.2-4.3 1 0 1.6.6 2.3.6s1.3-.6 2.3-.6c1.8 0 4 1.5 6.2 4.3-2.4 2.9-5.2 4.3-8.5 4.3s-6.1-1.4-8.5-4.3Z"/><path d="M3.5 12.5c3 .9 5.8 1.3 8.5 1.3s5.5-.4 8.5-1.3"/></svg>偷亲一口</button></>:<>{!seatMenu.onLap&&!seatMenu.invite&&!seatMenu.sitting&&!seatMenu.hand&&<button onClick={()=>{moveResident('touch',null,{touch:'hug'});setSeatMenu(null);}}><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4.5 13.5c0 3.3 3.4 6 7.5 6s7.5-2.7 7.5-6"/><path d="M12 13.2s-2.8-1.7-2.8-3.6A1.6 1.6 0 0 1 12 8.7a1.6 1.6 0 0 1 2.8.9c0 1.9-2.8 3.6-2.8 3.6Z"/></svg>抱一下</button>}{!seatMenu.onLap&&!seatMenu.invite&&!seatMenu.sitting&&<button onClick={()=>{moveResident('hand',null,{release:!!seatMenu.hand});setSeatMenu(null);}}><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="7" cy="7.5" r="3"/><circle cx="17" cy="7.5" r="3"/><path d="M7 12.5v7M17 12.5v7"/><path d="M7 14.5c2.2 2.2 7.8 2.2 10 0"/></svg>{seatMenu.hand?'松开手':'牵手'}</button>}{!seatMenu.onLap&&(seatMenu.invite||seatMenu.sitting)&&<button onClick={()=>{moveResident('lap');setSeatMenu(null);}}><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 19.5s-7-4.3-7-9.2A3.9 3.9 0 0 1 12 8a3.9 3.9 0 0 1 7 2.3c0 4.9-7 9.2-7 9.2Z"/></svg>{seatMenu.invite?'过来坐':`坐${partnerKind==='girl'?'她':'他'}腿上`}</button>}{!seatMenu.onLap&&!seatMenu.invite&&seatMenu.sofa&&<button onClick={()=>{moveResident('nestle');setSeatMenu(null);}}><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="8.8" cy="11.2" r="4"/><circle cx="15.6" cy="12.6" r="4"/></svg>{`靠着${partnerKind==='girl'?'她':'他'}`}</button>}{!seatMenu.invite&&<button onClick={()=>{moveResident('touch',null,{touch:'kiss'});setSeatMenu(null);}}><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3.5 12.5c2.2-2.8 4.4-4.3 6.2-4.3 1 0 1.6.6 2.3.6s1.3-.6 2.3-.6c1.8 0 4 1.5 6.2 4.3-2.4 2.9-5.2 4.3-8.5 4.3s-6.1-1.4-8.5-4.3Z"/><path d="M3.5 12.5c3 .9 5.8 1.3 8.5 1.3s5.5-.4 8.5-1.3"/></svg>偷亲一口</button>}</>:seatMenu.gramophone?<><button onClick={()=>{setToast(gramophoneNext());moveResident('tune');setSeatMenu(null);}}><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 18V6l10-2v12"/><circle cx="6.5" cy="18" r="2.5"/><circle cx="16.5" cy="16" r="2.5"/></svg>换一首</button>{dancingNow?<button onClick={()=>{moveResident('undance');setSeatMenu(null);}}><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 7l10 10M17 7 7 17"/></svg>不跳了</button>:<button onClick={()=>{moveResident('dance');setSeatMenu(null);}}><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="8" cy="6.5" r="2.5"/><circle cx="16" cy="6.5" r="2.5"/><path d="M8 10v5l-2 5M16 10v5l2 5M8 12.5h8"/></svg>跳一支舞</button>}</>:seatMenu.bed?<>{seatMenu.sleeping||inBed?<button onClick={()=>{moveResident('wake');setSeatMenu(null);}}><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="4"/><path d="M12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6 7 7M17 17l1.4 1.4M5.6 18.4 7 17M17 7l1.4-1.4"/></svg>起床</button>:<button onClick={()=>{moveResident('sleep');setSeatMenu(null);}}><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15.5 4.5a7.5 7.5 0 1 0 4 13.5 8.5 8.5 0 0 1-4-13.5Z"/></svg>一起睡</button>}{!(seatMenu.sleeping||inBed)&&seatMenu.search&&<button onClick={()=>{setSeatMenu(null);requestStorage('hide:'+seatMenu.id);}}><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="10" cy="10" r="6"/><path d="m15 15 6 6"/></svg>翻找</button>}</>:<><button onClick={()=>{moveResident('sit',{...seatMenu.seat,id:seatMenu.id});setSeatMenu(null);}}><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 3v11h13M6 10h11v4M7 14v7m11-7v7"/></svg>坐下</button>{['armchair','bedroomChair','studyReading'].includes(seatMenu.id)&&<button onClick={()=>{moveResident('read',{...seatMenu.seat,id:seatMenu.id});setSeatMenu(null);}}><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 6.5c-2-1.5-4.6-2-7.5-1.5v12c2.9-.5 5.5 0 7.5 1.5 2-1.5 4.6-2 7.5-1.5V5c-2.9-.5-5.5 0-7.5 1.5Z"/><path d="M12 6.5v12"/></svg>一起看书</button>}{seatMenu.id==='sofa'&&partnerSeat==='sofa'&&<button onClick={()=>{moveResident('nestle');setSeatMenu(null);}}><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="8.8" cy="11.2" r="4"/><circle cx="15.6" cy="12.6" r="4"/></svg>{`靠着${partnerKind==='girl'?'她':'他'}`}</button>}{seatMenu.search&&<button onClick={()=>{setSeatMenu(null);if(!catchPartner('hide:'+seatMenu.id))setStorageId('hide:'+seatMenu.id);}}><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="10" cy="10" r="6"/><path d="m15 15 6 6"/></svg>翻找</button>}</>}</div>}
          {cameraFocus&&!decorMode&&!bookOpen&&!['view:sofa','view:studyReading','view:bedroomChair'].includes(cameraFocus)&&!storageId&&!artOpen&&!craftOpen&&!bagOpen&&!meal&&<div ref={cameraActionsRef} className="room-camera-actions" role="region" aria-label={cameraPlaces[cameraFocus].label}><span>{cameraPlaces[cameraFocus].label}</span>{cameraFocus==='view:tvUnit'&&<button onClick={()=>setHomeState(s=>({...s,tvOn:!s.tvOn}))}>{homeState.tvOn?'关电视':'开电视'}</button>}{cameraFocus==='view:tvUnit'&&<button onClick={()=>{setHomeState(s=>({...s,tvOn:true}));visitFurniture(null);setTimeout(()=>moveResident('watch'),250);}}>一起看</button>}{cameraFocus==='view:tvUnit'&&<label className="tv-picture-picker">屏幕画面 <select aria-label="电视画面" value={homeState.tvPicture||'window'} onChange={e=>setHomeState(s=>({...s,tvPicture:e.target.value,tvOn:true}))}><option value="window">窗边暮色</option><option value="flowers">花束画</option>{creations.filter(i=>i.image).map(i=><option key={i.id} value={i.id}>{i.name||'我的画作'}</option>)}</select></label>}{cameraFocus==='view:diningTable'&&(dome?<DomeTag item={dome} open={domeTagOpen} onClose={()=>setDomeTagOpen(false)} onEat={startMeal}/>:<button onClick={fillDome}>{bagDessert?(bagDessert.kind==='dish'?'端一盘菜上来':'放一份甜品'):'去岛台做一份'}</button>)}{cameraFocus==='view:island'&&<button className="dessert-entry" onClick={()=>setDessertOpen(true)}>做甜品</button>}{cameraFocus==='view:stove'&&<button className="dessert-entry" onClick={()=>{setCookingStart([]);setCookingOpen(true);}}>做饭</button>}{cameraPlaces[cameraFocus].action&&<button onClick={()=>{const id=cameraPlaces[cameraFocus].storage||'hide:'+cameraPlaces[cameraFocus].id;if(catchPartner(id))return;if(!id.startsWith('hide:')){play('lid');updateStorage(id,{open:true});}setStorageId(id);}}>{cameraPlaces[cameraFocus].action}</button>}<button aria-label="返回小屋" onClick={()=>visitFurniture(null)}>×</button></div>}
          {cameraFocus&&!decorMode&&!bookOpen&&cameraPlaces[storageId]&&!artOpen&&!craftOpen&&!tailorOpen&&<div ref={cameraActionsRef} className="room-camera-actions"><span>{cameraPlaces[cameraFocus].label}</span><button onClick={()=>openDevice(cameraFocus)}>{cameraPlaces[cameraFocus].action}</button><button aria-label="返回小屋" onClick={()=>visitFurniture(null)}>×</button></div>}
          {residentOpen&&<ResidentPanel kind={residentOpen} onKind={setResidentOpen} value={homeState.residents} drawn={cleanCapsules(homeState.capsules)} day={dayIn(zone)} sewn={homeState.tailor?.made} onChange={patch=>setHomeState(s=>({...s,residents:{...(s.residents||{}),...patch}}))} onClose={()=>setResidentOpen(null)}/>}
          {artOpen==='tarot'&&<Tarot onClose={()=>setArtOpen(null)}/>}
          {artOpen==='draw'&&<StudyComputer sea={sea} data={homeState.computer||{}} onData={patch=>setHomeState(s=>({...s,computer:typeof patch==='function'?patch(s.computer||{}):{...(s.computer||{}),...patch}}))} clue={id=>clueOf(creations,id)} onHideClue={hidePuzzleClue} onSolvePuzzle={solvePuzzle} drafts={homeState.artDrafts||[]} onSave={draft=>setHomeState(s=>({...s,artDrafts:[draft,...(s.artDrafts||[]).filter(d=>d.id!==draft.id)]}))} onQueue={job=>{setHomeState(s=>({...s,printJobs:[...(s.printJobs||[]),job]}));}} onClose={()=>setArtOpen(null)}/>}
          {placing&&<div className="placement-bar">{creations.find(i=>i.id===placing)?.kind==='build'?'点桌面、柜面、地面或墙面放下':'点桌面、柜面或地面放下'} · 拖动仍可转视角<button onClick={()=>setPlacing(null)}>取消</button></div>}
          {cookingOpen&&<CookingTable stock={benchStock} start={cookingStart} onFinish={finishCreation} onClose={()=>setCookingOpen(false)}/>}
          {dessertOpen&&<DessertTable stock={benchStock} draft={homeState.craftDrafts?.dessert} learned={homeState.dessertRecipes||[]} onDraft={next=>setHomeState(s=>({...s,craftDrafts:{...(s.craftDrafts||{}),dessert:next}}))} onFinish={finishCreation} onClose={()=>setDessertOpen(false)}/>}
          {dessertBookOpen&&<DessertBook pages={homeState.dessertBook||[]} writingId={dessertWritingId} onWords={(id,words)=>setHomeState(s=>writeTasteWords(s,id,words))} onClose={()=>{setDessertBookOpen(false);setDessertWritingId(null);}}/>}
          {craftOpen&&<Workshop stock={benchStock} drawn={cleanCapsules(homeState.capsules).dolls} caught={cleanCaught(homeState.caught)} creations={homeState.creations||[]} draft={homeState.craftDraft||emptyDraft()} drafts={homeState.craftDrafts||{}} onDraft={updateCraftDraft} onFinish={finishCreation} onClose={()=>setCraftOpen(false)}/>}
          {tailorOpen&&<Tailor stock={benchStock} onSpend={spendStock} tailor={homeState.tailor} wardrobe={readWardrobe(homeState.residents?.wardrobeV1)} day={dayIn(zone)} onChange={next=>setHomeState(s=>({...s,tailor:next(s.tailor)}))} onUnpick={id=>{const r=unpickAt(homeNow.current,id,readWardrobe(homeNow.current.residents?.wardrobeV1));if(r.wardrobe)try{localStorage.setItem(wardrobeKey,JSON.stringify(r.wardrobe));}catch{}setHomeState(r.home);}} onWardrobe={kind=>{setTailorOpen(false);setResidentOpen(kind);}} onClose={()=>setTailorOpen(false)}/>}
          {artOpen==='print'&&<PrintStation jobs={homeState.printJobs||[]} onReady={id=>setHomeState(s=>({...s,printJobs:(s.printJobs||[]).map(j=>j.id===id?{...j,status:'ready'}:j)}))} onCollect={id=>setHomeState(s=>collectPrint(s,id))} onCancel={id=>setHomeState(s=>({...s,printJobs:(s.printJobs||[]).filter(j=>j.id!==id)}))} onClose={()=>setArtOpen(null)}/>}
          {bagOpen&&<Backpack pantry={pantryOf(benchStock)} onCook={id=>{setBagOpen(false);setCookingStart([id]);setCookingOpen(true);}} tab={bagTab} tickets={homeState.tickets} album={albumOf(homeState)} finds={foundShelf(homeState.explore)} days={diaryDays(homeState,{him:partnerKind==='girl'?'她':'他',today:dayIn(zone)})} hideSeek={homeState.hideSeek} today={dayIn(zone)} him={partnerKind==='girl'?'她':'他'} hiding={!!seekSpot} onOpenLetter={openLetter} items={creations.filter(i=>(i.kind!=='note'||['bag','room','table'].includes(i.location))&&!stillHidden.includes(i))} focusId={bagFocus} onPlace={id=>{setFurnitureFocus(null);setStorageId(null);setPlacing(id);setBagOpen(false);setDecorMode(false);if(floor==='1F')setRoom('overview');}} onDome={id=>{play('glass',{volume:.7});setHomeState(s=>({...s,creations:putInDome(s.creations||[],id)}));setBagOpen(false);setToast((homeState.creations||[]).find(i=>i.id===id)?.kind==='dish'?'端上桌了，先盖在玻璃罩里保温。':'放进餐桌的玻璃罩里了。');if(floor==='1F')visitFurniture('view:diningTable');}} onMove={transfer} onShift={rearrange} onTurn={turnCreation} onReportBottle={reportBottle} onDrop={id=>{setHomeState(s=>({...s,creations:dropItem(s.creations||[],id)}));if(placing===id)setPlacing(null);}} onClose={()=>setBagOpen(false)}/>}
          {scene==='interior'&&!bookOpen&&!storageId&&!bagOpen&&!craftOpen&&!artOpen&&<LightRemote open={lightsOpen} onOpenChange={setLightsOpen} room={floor==='1F'?'downstairs':room} value={houseLights.get(floor==='1F'?'downstairs':room)} onChange={p=>houseLights.patch(floor==='1F'?'downstairs':room,p)} sound={soundSwitches} onSound={flipSound}/>}<HomeClockSettings zone={zone} onZone={setZone} preview={preview} onPreview={setPreview}/>{scene==='interior'&&!storageId&&!bagOpen&&!craftOpen&&!artOpen&&<SampleBook open={bookOpen} resumeKey={bookResume} launcherTarget={bookLauncherHost} launcherHidden={decorMode} onOpen={openSampleBook} onClose={()=>{setBookOpen(false);setDecorMode(false);}} owner={selectedId} room={floor==='1F'?'downstairs':room} catalog={furnitureCatalog} stock={benchBase} onSelect={setSelectedId} onRoomPreview={next=>{setSelectedId(null);setFloor(next==='downstairs'?'1F':'2F');setRoom(next==='downstairs'?'overview':next);setOverviewRevision(v=>v+1);}} onMove={moveFromBook}/>}
          {storageId && !cameraPlaces[storageId] && !decorMode && scene==='interior' && <StorageCloseup onOpenLetter={openLetter} key={storageId.startsWith('refrigerator:')?'refrigerator':storageId}
            onContainerChange={updateStorage} containers={homeState.containers} onFridgeToggle={id=>{const opening=!homeState.containers[id]?.open;play(opening?'lid':'wood',{volume:opening?1:.6});updateStorage(id,{open:opening});setStorageId(id);}} onFridgeSelect={setStorageId}
            color={homeState.furniture[storageId.startsWith("tv:")?"tvUnit":storageId.startsWith("hide:")?({studyComputer:"studyDesk",studyPrintPreview:"studyPrinter"}[storageId.slice(5)]||storageId.slice(5)):storageId.split(":")[0]]?.color}
            onUse={['hide:studyCraft','hide:studyComputer','hide:studyPrintPreview'].includes(storageId)?()=>openDevice(storageId):undefined}
            theme={interiorThemes[themeKey]} kind={storageAppearance(storageId).kind} onPower={storageId==='hide:tvUnit'?()=>setHomeState(s=>({...s,tvOn:!s.tvOn})):undefined}
            label={storageAppearance(storageId).label||(furnitureCatalog[storageId.split(':')[0]]?.label||'小柜子')}
            items={creations} storageId={storageId} onInstall={(id,frame)=>setHomeState(s=>({...s,creations:installPhoto(s.creations||[],id,frame)}))} onMove={transfer} onShift={rearrange} onFound={markFoundHere}
            seekable={!!porchState.residents?.length&&seekableAt(storageId)} lives={!!porchState.residents?.length} him={partnerKind==='girl'?'她':'他'} onStash={(id,stash)=>setHomeState(s=>({...s,creations:markStash(s.creations||[],id,{day:dayIn(zone),hint:stash?.hint})}))}
            gift={storedGift} note={giftNote} onNote={setGiftNote}
            onStore={(spotId,stash)=>{const id=crypto.randomUUID();placeLetter(creations,{id,note:giftNote,spotId,location:storageId});setHomeState(s=>{try{const placed=placeLetter(s.creations||[],{id,note:giftNote,spotId,location:storageId});return {...s,creations:stash?markStash(placed,id,{day:dayIn(zone),hint:stash.hint}):placed};}catch{return s;}});setGiftNote('');}}
            onTake={()=>{if(storedGift?.note)setHomeState(s=>({...s,creations:[...(s.creations||[]),{id:crypto.randomUUID(),kind:'note',name:'一封信',note:storedGift.note,location:'bag',slot:0}]}));updateStorage(storageId,{gift:null});setToast('信已收进背包。');}}
            onClose={()=>setStorageId(null)} />}
          <div className="gesture-hint"><span>{decorMode ? (floorPieces[selectedId] ? "点地板，它就过去；遥控器微调" : movingCreation ? (creations.find(i=>i.id===movingCreation)?.kind==="build" ? "点地面、台面或墙，它就过去；遥控器微调" : "点地面或台面，它就过去；遥控器微调") : "点家具或摆件，用遥控器挪动") : viewMode==="pan" ? "↔ 拖动画面" : "↔ 拖动旋转"}</span><span>{decorMode ? (floorPieces[selectedId] ? "点屋子外面取消选择" : "点空白取消选择") : "双指缩放 / 平移 · Shift 拖动平移"}</span></div>
          {toast && <div className="house-toast">{toast}</div>}
          {(visitEntries.length>0||hiddenOpen)&&['interior','exterior'].includes(scene)&&!porchOpen&&!doorOpen&&!bagOpen&&!(storageId&&!cameraPlaces[storageId])&&!craftOpen&&!tailorOpen&&!artOpen&&!dessertOpen&&!cookingOpen&&!dessertBookOpen&&!residentOpen&&!decorMode&&!bookOpen&&!outingOpen&&<MachineVisit entries={visitEntries} hidden={stillHidden} called={called} onCall={callAI} onHint={askForHint} onRead={id=>{closeVisit();openBag('items',id);}} onOuting={()=>{closeVisit();setDecorMode(false);setScene('exterior');setOutingOpen(true);}} onClose={closeVisit}/>}
          {scene === "exterior" && <button className="door-hint" onClick={enterHouse}>点亮着的门，进屋。</button>}
          {scene === "exterior" && <OutingButton explore={homeState.explore} today={dayIn(zone)} him={partnerKind==='girl'?'她':'他'} onOpen={()=>{play('page',{volume:.6});setOutingOpen(true);}}/>}
          {outingOpen&&scene==='exterior'&&<OutingPanel explore={homeState.explore} today={dayIn(zone)} him={partnerKind==='girl'?'她':'他'} signedIn={!!porchState.account} living={porchState.residents||[]} name={by=>calledName(homeState.machine,by)} onWait={outing.wait} onStop={outing.stop} onGo={outing.go} onClose={()=>setOutingOpen(false)}/>}
          {scene==="visit"&&visiting&&<VisitPlate key={`${visiting.street}:${visiting.lot}`} visiting={visiting} visit={visit} onBack={()=>setScene('map')} onReport={reportHome}/>}
          {scene==="visit"&&visiting&&visit.mailOpen&&<MailPanel draft={visit.draft} visiting={visiting} items={creations} onLeave={visit.leave} onClose={visit.closeMail}/>}
          {doorOpen&&scene==='exterior'&&<DoorPanel door={ownDoor.door} onTake={takeGift} onDecline={declineGift} onBlock={blockVisitor} onUnblock={unblockVisitor} onReport={reportVisit} onSeen={()=>porch.seeKnocks().catch(()=>{})} onClose={()=>setDoorOpen(false)}/>}
        </>
      )}
    </div>
    </CalledContext.Provider>
  );
}

// If someone is signed in on this device, the house first checks the copy on
// the server, so it starts from the right one (a few seconds at most).
// From the moment it starts drawing, the house holds the home in memory, so
// another tab changing it from then on makes this page out of date.
// This home's own things are fetched meanwhile, when this device knows it's this home (src/ours-load.js), so
// nothing of them is missing when it's first drawn.
// /?explore=book: the exploring book's cover and title map (src/explore-cover.jsx); /?explore=woods, hill, lake, tea,
// field, mine or deep: one of its pages (src/explore-book.jsx). Loaded only then; they hold no home, so the house isn't marked
// as drawn.
const exploring = {woods: () => import('./explore-woods-layout.js').then(m => m.WOODS), hill: () => import('./explore-hill-layout.js').then(m => m.HILL),
  lake: () => import('./explore-lake-layout.js').then(m => m.LAKE), tea: () => import('./explore-tea-layout.js').then(m => m.TEA),
  field: () => import('./explore-field-layout.js').then(m => m.FIELD), mine: () => import('./explore-mine-layout.js').then(m => m.MINE),
  deep: () => import('./explore-deep-layout.js').then(m => m.DEEP),
  book: () => Promise.resolve('book')}[new URLSearchParams(location.search).get('explore')];
Promise.allSettled([porch.start(), oursExpected() ? loadOurs({timeout: 8000}) : null]).then(async () => {
  if (exploring) {
    // The book opens only on a walk the two of them set out on from the door (src/door-outing.jsx), while they're out
    // on it: without one, or on one that has come home already (a tab taken back to it), home. A page, only once its
    // place is open (the deep woods after three trips to the woods); else the map.
    const trip = readTrip(), saved = savedExplore();
    if (!trip || isHome(saved, trip)) {
      if (trip) dropTrip();
      location.replace('/');
      return;
    }
    const which = new URLSearchParams(location.search).get('explore');
    if (which !== 'book' && !placesOpen(saved, trip).includes(which)) {
      location.replace('/?explore=book&open=1');
      return;
    }
    const place = await exploring();
    if (place === 'book') {
      const {ExploreCover} = await import('./explore-cover.jsx');
      createRoot(document.getElementById("root")).render(<ExploreCover />);
      return;
    }
    const {ExploreBook} = await import('./explore-book.jsx');
    createRoot(document.getElementById("root")).render(<ExploreBook place={place} />);
    return;
  }
  porch.ready();
  createRoot(document.getElementById("root")).render(<DecorationProvider><SurfaceProvider><App /></SurfaceProvider></DecorationProvider>);
});

