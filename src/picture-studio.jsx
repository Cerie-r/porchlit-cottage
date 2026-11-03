import React,{useEffect,useMemo} from 'react';
import * as THREE from 'three';
import {createPortal} from '@react-three/fiber';
import {drawObjects} from './brick-pictures.js';

// A button's little picture; an empty circle until it is drawn, or if it
// can't be.
export const Picture = ({src, big}) => src ? <img className={`bench-picture${big ? ' big' : ''}`} src={src} alt="" aria-hidden="true" draggable={false}/> : <span className={`bench-picture${big ? ' big' : ''}`} aria-hidden="true"/>;

// Takes pictures of React three things. Put it inside a Canvas with the
// items ({key, node}) that still need a picture: each is set up in a scene of
// its own, away from what's on screen, drawn by the picture renderer along
// `view` (`size` pixels square), and the pictures handed to onPictures. The parent then stops
// passing those items, and their scenes go.
export function PictureStudio({items, view, size, onPictures}) {
  const keys = items.map(item => item.key).join('|');
  const scenes = useMemo(() => Object.fromEntries(items.map(item => [item.key, new THREE.Scene()])), [keys]);
  useEffect(() => {
    if (!keys) return;
    let gone = false;
    const frame = window.requestAnimationFrame(() => {if (!gone) onPictures(drawObjects(scenes, {view, size}));});
    return () => {gone = true; window.cancelAnimationFrame(frame);};
  }, [scenes]);
  return <>{items.map(item => <React.Fragment key={item.key}>{createPortal(item.node, scenes[item.key])}</React.Fragment>)}</>;
}
