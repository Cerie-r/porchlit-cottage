import React from 'react';
import {ROSES, cleanRoses, kissesLeftToday} from './roses.js';
import './shell-picker.css';

// In the porch light card, under the outsides: how many kisses are counted towards the rose castle (src/roses.js),
// once there is one, until the ninety-ninth opens it.
export function RoseCount({roses, day}) {
  const r = cleanRoses(roses);
  if (!r.n || r.n >= ROSES.goal) return null;
  const left = kissesLeftToday(r, day);
  return <p className="rose-count">
    <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 21v-8m0 3c-2.5-.2-4-1.4-4.5-3m4.5 1c2-.4 3.4-1.6 4-3.4"/><path d="M12 13c-3 0-5-2-5-4.6C7 5.6 9.2 4 12 4s5 1.6 5 4.4C17 11 15 13 12 13Z"/><path d="M12 4c-1 1.4-1.2 3 0 4.6 1.2-1.6 1-3.2 0-4.6"/></svg>
    <span>玫瑰城堡 · 亲了 <b>{r.n}</b> / {ROSES.goal} 下{left ? '' : '，今天的九下记满了'}</span>
  </p>;
}
