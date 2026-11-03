// The exploring book from the outside in: its cover (painted), opened, and the title map with the places on it
// (src/explore-places.js). From the map, a place opens its page (src/explore-book.jsx); home is the village at the
// bottom. Out on a trip (src/explore-trips.js, started at the door), the map says which trip of the day it is and
// how full the basket is, and home brings the basket home. It opens only on a trip (src/main.jsx sends anyone without
// one home).
// Also the book's diary of trips, from what the home keeps. Reached at /?explore=book (&open=1: already open, back
// from a page).
import React, {useEffect, useMemo, useRef, useState} from 'react';
import {BOOK_TITLE, ON_MAP, HOME_ON_MAP, MAP, NAMES, OPENS, PLACES, placesOpen} from './explore-places.js';
import {BASKET, cleanExplore, goHome, tripLine} from './explore-trips.js';
import {readTrip, savedExplore, writeTrip} from './explore-session.js';
import {readWardrobe} from '../body/wardrobe-state.js';
import {dateLabel} from './diary-days.js';
import {play} from './sounds.js';
import './explore.css';

// Written small in the corner of the map, for the day the book came out (10/28: five months together).
const DEDICATION = '写在我们在一起五个月的这一天';

// How he's spoken of here: as his figure is (him, unless she plays the boy).
function himHere() {
  let kept;
  try { kept = JSON.parse(localStorage.getItem('porchlit-home-layout-v1') || 'null')?.residents?.wardrobeV1; } catch {}
  return readWardrobe(kept).playerKind === 'boy' ? '她' : '他';
}

export function ExploreCover() {
  const trip = useMemo(readTrip, []), him = useMemo(himHere, []);
  const trips = useMemo(() => cleanExplore(savedExplore()).trips.slice().reverse(), []);
  // The places on the map now, and one opened by going out that they haven't been to yet.
  const here = useMemo(() => placesOpen(savedExplore(), trip), [trip]);
  const fresh = id => !!OPENS[id] && !trips.some(t => t.places.includes(id)) && !trip?.places.includes(id);
  const opened = here.find(fresh);
  const [open, setOpen] = useState(() => new URLSearchParams(location.search).get('open') === '1');
  const [opening, setOpening] = useState(false), [diary, setDiary] = useState(false);
  const scroller = useRef(), [slides, setSlides] = useState(false);
  // On a narrow screen the map is wider than the screen: start in the middle of it, and say it slides.
  useEffect(() => {
    const s = scroller.current;
    if (!open || !s) return;
    s.scrollLeft = (s.scrollWidth - s.clientWidth) / 2;
    setSlides(s.scrollWidth > s.clientWidth + 8);
  }, [open]);
  const openBook = () => {
    if (opening || open) return;
    play('page');
    setOpening(true);
    setTimeout(() => setOpen(true), 850);
  };
  const go = id => { play('page'); location.href = `/?explore=${id}`; };
  const backHome = () => { if (trip) writeTrip(goHome(trip)); location.href = '/'; };
  const sub = trip ? `今天第 ${trip.n} 趟 · 篮子 ${trip.basket.length}/${BASKET}` : '';
  return <div className={`explore explore-book${open ? ' is-open' : ''}`}>
    <header className="explore-top">
      <button className="explore-home" onClick={backHome}>回家</button>
      <div className="explore-title"><b>{BOOK_TITLE}</b><span>{sub}</span></div>
      <button className="explore-basket" onClick={() => setDiary(true)}>日记</button>
    </header>
    {!open && <div className="explore-cover-stage" onClick={openBook}>
      <div className={`explore-cover${opening ? ' opening' : ''}`} role="button" aria-label="翻开书">
        <img src="/explore/book-cover.webp" alt="" draggable={false}/>
        <div className="explore-cover-title"><b>{BOOK_TITLE}</b><span>{`两个人一起出门`}</span></div>
      </div>
      <p className="explore-hint">点一下，翻开</p>
    </div>}
    {open && <div className="explore-map-scroll" ref={scroller}>
      <div className="explore-map" style={{aspectRatio: `${MAP.size[0]} / ${MAP.size[1]}`}}>
        <img src={MAP.art} alt="" draggable={false}/>
        {here.map(id => <button key={id} className={`explore-map-tag${trip?.places.includes(id) ? ' been' : ''}${fresh(id) ? ' fresh' : ''}`} style={{left: `${ON_MAP[id][0] * 100}%`, top: `${ON_MAP[id][1] * 100}%`}} onClick={() => go(id)}>{PLACES[id].name}</button>)}
        <button className="explore-map-tag home" style={{left: `${HOME_ON_MAP[0] * 100}%`, top: `${HOME_ON_MAP[1] * 100}%`}} onClick={backHome}>回家</button>
      </div>
    </div>}
    {open && <p className="explore-hint">{trip && trip.basket.length >= BASKET ? '篮子满了，回家吧。' : opened ? `${PLACES[opened].name}翻开了一页。` : slides ? '左右滑一滑，去哪儿点哪儿。' : '去哪儿？点地图上的地方。'}</p>}
    {/* The day the book was finished, in the corner of the map. */}
    {open && <p className="explore-dedication">{DEDICATION}</p>}
    {diary && <div className="explore-diary" onClick={e => { if (e.target === e.currentTarget) setDiary(false); }}>
      <section role="dialog" aria-label="出门的日记">
        <header><h2>出门的日记</h2><button onClick={() => setDiary(false)}>合上</button></header>
        {/* The trip they're on: written in as it goes, kept once they're home. */}
        {trip?.places.length > 0 && <ol className="now"><li><span>这一趟 · 还在路上</span>{tripLine(trip, {names: NAMES, him})}</li></ol>}
        {trips.length ? <ol>{trips.map((t, i) => <li key={i}><span>{dateLabel(t.day)}{t.n > 1 ? ` · 第 ${t.n} 趟` : ''}</span>{tripLine(t, {names: NAMES, him})}</li>)}</ol>
          : !trip?.places.length && <p className="empty">还没出过门。从家门口和{him}一起出门，回来一趟就记一笔。</p>}
      </section>
    </div>}
  </div>;
}
