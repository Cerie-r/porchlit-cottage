import React, {useEffect} from 'react';
import {Icon} from './icons.jsx';
import './machine-overlay.css';

// What the machines on the plaza share around their canvas (capsule-overlay.jsx,
// claw-overlay.jsx): the way back to the street, the machine's name and
// colour, the tickets in hand. Escape goes back too.
export function MachineTop({look, title, note, count, onClose}) {
  useEffect(() => {
    const key = e => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', key);
    return () => window.removeEventListener('keydown', key);
  }, [onClose]);
  return <header className="machine-top">
    <button className="machine-back" onClick={onClose} aria-label="回到街上"><Icon name="back"/><span>回到街上</span></button>
    <div className="machine-title"><small>{look.name}色 · 小广场</small><h2>{title}</h2>{note && <p>{note}</p>}</div>
    <p className="machine-tickets" aria-label={`${count} 张券`}><TicketMark/><strong>{count}</strong><small>张券</small></p>
  </header>;
}

export function TicketMark() {
  return <svg className="machine-ticket-mark" viewBox="0 0 44 30" aria-hidden="true">
    <path d="M4 3h36a2 2 0 0 1 2 2v6a4 4 0 0 0 0 8v6a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2v-6a4 4 0 0 0 0-8V5a2 2 0 0 1 2-2Z"/>
    <path className="perforation" d="M30 6v18"/>
    <path className="star" d="M16 9.5l1.6 3.3 3.6.5-2.6 2.5.6 3.6-3.2-1.7-3.2 1.7.6-3.6-2.6-2.5 3.6-.5Z"/>
  </svg>;
}

// Out of tickets: where they come from. `him` is how the partner is spoken of.
export const noTicket = (him = '他') => `还没有券：找到${him}、解开谜题、收下门口的东西，都会得一张。`;
