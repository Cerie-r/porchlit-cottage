// On a phone the top bar keeps only the home button, the house's name (which
// opens the rooms), the porch lamp and the portraits. Everything else lives
// in this one menu. On wider screens the menu button isn't shown.
import React, {useEffect, useRef} from 'react';

export function HouseMenu({open, onOpenChange, items}) {
  const panel = useRef(), button = useRef();
  useEffect(() => {
    if (!open) return;
    panel.current?.querySelector('button')?.focus();
    return () => button.current?.focus?.();
  }, [open]);
  const keys = e => {
    if (e.key === 'Escape') {
      e.stopPropagation();
      onOpenChange(false);
    }
  };
  return <>
    <button ref={button} className="house-menu-button" aria-label="更多" aria-haspopup="true" aria-expanded={open} aria-controls="house-menu" onClick={() => onOpenChange(!open)}>
      <svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"><path d="M5.5 8h13M5.5 12h13M5.5 16h13"/></svg>
    </button>
    {open && <>
      <button className="house-menu-scrim" aria-label="收起菜单" tabIndex={-1} onClick={() => onOpenChange(false)}/>
      <nav id="house-menu" className="house-menu" ref={panel} aria-label="小屋菜单" onKeyDown={keys}>
        {items.map((item, i) => item === 'line'
          ? <span key={i} className="house-menu-line" aria-hidden="true"/>
          : <button key={item.label} onClick={() => {onOpenChange(false); item.onClick();}}>
            <span className="house-menu-icon" aria-hidden="true">{item.icon}</span>
            <span className="house-menu-label">{item.label}</span>
            {item.note != null && <small>{item.note}</small>}
          </button>)}
      </nav>
    </>}
  </>;
}

// Small line icons for the menu rows that don't have one elsewhere.
const line = path => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">{path}</svg>;
export const menuIcons = {
  light: line(<><path d="M9 17h6M10 20h4"/><path d="M12 3a6 6 0 0 0-3.6 10.8c.6.5 1 1.2 1 2V17h5.2v-1.2c0-.8.4-1.5 1-2A6 6 0 0 0 12 3z"/></>),
  decor: line(<><path d="M4 18.5V7a2 2 0 0 1 2-2h4.5L13 7.5V18.5"/><path d="M13 9.5 17.5 6l2.3 2.3a1.4 1.4 0 0 1 0 2L13 17"/><circle cx="8.5" cy="15" r="1.4"/></>),
  // A little book with a heart on its cover.
  seek: line(<><path d="M6 4.5h11a1 1 0 0 1 1 1V20H7a2 2 0 0 1-2-2V5.5a1 1 0 0 1 1-1z"/><path d="M5 18a2 2 0 0 1 2-2h11"/><path d="M11.5 12.2c-1.6-1-2.6-1.9-2.6-3a1.4 1.4 0 0 1 2.6-.7 1.4 1.4 0 0 1 2.6.7c0 1.1-1 2-2.6 3z"/></>)
};