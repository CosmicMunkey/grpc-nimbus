import { useEffect, useRef, useState } from 'react';

interface Coords {
  top?: number;
  bottom?: number;
  left?: number;
  right?: number;
  maxHeight: number;
}

/**
 * Manages open state and fixed-position coordinates for a portal-rendered
 * dropdown menu. Anchors to a trigger element, escapes overflow:hidden ancestors,
 * and flips above the trigger when there isn't enough space below.
 *
 * @param align - 'left' aligns menu left-edge to trigger left-edge;
 *                'right' aligns menu right-edge to trigger right-edge.
 */
export function usePortalMenu(align: 'left' | 'right' = 'left') {
  const [open, setOpen] = useState(false);
  const [coords, setCoords] = useState<Coords>({ top: 0, left: 0, maxHeight: 400 });
  const triggerRef = useRef<HTMLElement>(null);
  const menuRef = useRef<HTMLElement>(null);

  const toggle = () => {
    if (!open && triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      const GAP = 4;
      const MARGIN = 8;
      const spaceBelow = window.innerHeight - rect.bottom - MARGIN;
      const spaceAbove = rect.top - MARGIN;

      // Flip above when there's more room above and less than 150px below
      const flipUp = spaceBelow < 150 && spaceAbove > spaceBelow;

      const horizontal = align === 'right'
        ? { right: window.innerWidth - rect.right }
        : { left: rect.left };

      if (flipUp) {
        setCoords({ bottom: window.innerHeight - rect.top + GAP, maxHeight: spaceAbove, ...horizontal });
      } else {
        setCoords({ top: rect.bottom + GAP, maxHeight: Math.max(spaceBelow, 80), ...horizontal });
      }
    }
    setOpen((v) => !v);
  };

  const close = () => setOpen(false);

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
  };

  return { open, toggle, close, triggerRef, menuRef, menuStyle };
}
