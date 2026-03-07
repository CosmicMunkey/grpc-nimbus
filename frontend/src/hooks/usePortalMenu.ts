import { useEffect, useLayoutEffect, useRef, useState } from 'react';

interface Coords {
  top?: number;
  bottom?: number;
  left?: number;
  right?: number;
  maxHeight: number;
}

/**
 * Manages open state and fixed-position coordinates for a portal-rendered
 * dropdown menu. Uses a two-pass render: first pass places the menu below the
 * trigger (invisible), then measures actual overflow and flips above if needed.
 *
 * @param align - 'left' aligns menu left-edge to trigger left-edge;
 *                'right' aligns menu right-edge to trigger right-edge.
 */
export function usePortalMenu(align: 'left' | 'right' = 'left') {
  const [open, setOpen] = useState(false);
  const [coords, setCoords] = useState<Coords>({ top: 0, left: 0, maxHeight: 600 });
  // visible=false during first-pass measurement so we never show wrong position
  const [visible, setVisible] = useState(false);
  const triggerRef = useRef<HTMLElement>(null);
  const menuRef = useRef<HTMLElement>(null);

  const toggle = () => {
    if (!open && triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      const GAP = 4;
      const horizontal = align === 'right'
        ? { right: window.innerWidth - rect.right }
        : { left: rect.left };
      // First pass: place below with generous height, hidden until measured
      setCoords({ top: rect.bottom + GAP, maxHeight: 600, ...horizontal });
      setVisible(false);
    }
    setOpen((v) => !v);
  };

  const close = () => setOpen(false);

  // Second pass: after portal renders, measure actual overflow and flip if needed
  useLayoutEffect(() => {
    if (!open || visible || !menuRef.current || !triggerRef.current) return;
    const menu = menuRef.current.getBoundingClientRect();
    const trig = triggerRef.current.getBoundingClientRect();
    const GAP = 4;
    const MARGIN = 8;
    const horizontal = align === 'right'
      ? { right: window.innerWidth - trig.right }
      : { left: trig.left };

    if (menu.bottom > window.innerHeight - MARGIN) {
      // Menu overflows bottom — flip above trigger
      const spaceAbove = trig.top - MARGIN;
      setCoords({ bottom: window.innerHeight - trig.top + GAP, maxHeight: spaceAbove, ...horizontal });
    } else {
      // Fits below — just cap height
      const spaceBelow = window.innerHeight - trig.bottom - MARGIN;
      setCoords({ top: trig.bottom + GAP, maxHeight: spaceBelow, ...horizontal });
    }
    setVisible(true);
  }, [open, visible, align]);

  // Close on click outside — check BOTH trigger and portal content
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      const target = e.target as Node;
      if (triggerRef.current?.contains(target)) return;
      if (menuRef.current?.contains(target)) return;
      setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [open]);

  const menuStyle: React.CSSProperties = {
    position: 'fixed',
    ...(coords.top !== undefined ? { top: coords.top } : {}),
    ...(coords.bottom !== undefined ? { bottom: coords.bottom } : {}),
    ...(coords.left !== undefined ? { left: coords.left } : {}),
    ...(coords.right !== undefined ? { right: coords.right } : {}),
    maxHeight: coords.maxHeight,
    overflowY: 'auto',
    zIndex: 9999,
    visibility: visible ? 'visible' : 'hidden',
  };

  return { open, toggle, close, triggerRef, menuRef, menuStyle };
}
