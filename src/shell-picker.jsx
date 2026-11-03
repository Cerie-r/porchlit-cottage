import React from 'react';
import {houseShells, openShells, seasons, shellOf} from './house-shells.js';
import {play} from './sounds.js';
import './shell-picker.css';

// Choosing which outside the home wears: one little card per shell this home
// may wear on `day`. While there is only one there is nothing to choose, so
// nothing shows. A seasonal one is marked 限定. Small enough to sit as a row
// in a card, or on its own by the door.
export function ShellPicker({home, day, onChoose, className = ''}) {
  const open = openShells(home, day), current = shellOf(home, day);
  if (open.length < 2) return null;
  return <section className={'shell-picker ' + className} aria-label="换外观">
    <p className="shell-picker-title">外观</p>
    <div className="shell-picker-row">
      {open.map(key => {
        const season = houseShells[key].season;
        return <button key={key} type="button" className={key === current ? 'active' : ''} aria-pressed={key === current}
          onClick={() => {if (key !== current) {play('tap'); onChoose(key);}}}>
          <ShellGlyph kind={key}/><span>{houseShells[key].label}</span>{season && <small title={`${seasons[season].label}那几天才能换`}>限定</small>}
        </button>;
      })}
    </div>
  </section>;
}

// A line drawing of each outside, in the same ink as the other little icons.
function ShellGlyph({kind}) {
  return <svg viewBox="0 0 48 40" fill="none" aria-hidden="true" stroke="#a88d77" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    {kind === 'roseCastle' ? <>
      <path d="M7 37V15h8v22M33 37V15h8v22" fill="#f8eee6"/>
      <path d="M6 15l5-11 5 11M32 15l5-11 5 11" fill="#e3a3b6"/>
      <path d="M15 37V21h18v16" fill="#fbf3ea"/>
      <path d="M15 21v-3h3v3m3 0v-3h3v3m3 0v-3h3v3"/>
      <path d="M21 37v-6a3 3 0 0 1 6 0v6" fill="#d9a3b6"/>
      <path d="M11 4V1l3 1-3 1M37 4V1l3 1-3 1"/>
      <g stroke="#cf7d98" fill="#f2c1cf" strokeWidth="1.1"><circle cx="10" cy="24" r="1.4"/><circle cx="12.5" cy="29" r="1.4"/><circle cx="36" cy="22.5" r="1.4"/><circle cx="38" cy="28.5" r="1.4"/><circle cx="4.5" cy="36" r="1.6"/><circle cx="44" cy="36" r="1.6"/></g>
    </> : kind === 'castle' ? <>
      <path d="M7 37V17h8v20M33 37V17h8v20" fill="#f6ebe0"/>
      <path d="M6 17l5-9 5 9M32 17l5-9 5 9" fill="#6f6470"/>
      <path d="M15 37V21h18v16" fill="#fbf3ea"/>
      <path d="M15 21v-3h3v3m3 0v-3h3v3m3 0v-3h3v3"/>
      <path d="M21 37v-6a3 3 0 0 1 6 0v6" fill="#d9a3b6"/>
      <path d="M11 8V4l3 1-3 1M37 8V4l3 1-3 1"/>
      <path d="M9 24c2 3 0 6 3 8m24-10c-2 3 1 6-2 9" stroke="#b896d0"/>
    </> : kind === 'haunted' ? <>
      <path d="M17 37V19h22v18" fill="#8a7d9a"/>
      <path d="M15 19l3-5h20l3 5z" fill="#4a4352"/>
      <path d="M6 37l1-17h9l1 17" fill="#8a7d9a"/>
      <path d="M5 20l7-15c1 3 4 5 8 4-3 1-4 4-3 11z" fill="#4a4352"/>
      <path d="M25 37v-5a3 3 0 0 1 6 0v5" fill="#76558f"/>
      <path d="M20 23h4v5h-4zM32 23h4v5h-4z" fill="#ffd894"/>
      <circle cx="11.5" cy="31.5" r="3.3" fill="#e8893b" stroke="#c4682c"/>
      <path d="M11.5 28.2v-1.5"/>
      <path d="M38 8l2-2 2 2 2-2 2 2-2 1-2-1-2 1z" fill="#4a4352" stroke="#4a4352" strokeWidth="1"/>
    </> : <>
      <path d="M9 37V19h30v18" fill="#fbf3ea"/>
      <path d="M5 21 24 7l19 14" fill="#6f6470"/>
      <path d="M21 37v-7a3 3 0 0 1 6 0v7" fill="#d9a3b6"/>
      <path d="M13 24h5v5h-5zM30 24h5v5h-5z" fill="#f1dcc0"/>
      <path d="M33 12V8h4v7"/>
    </>}
  </svg>;
}
