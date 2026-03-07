import { useEffect, useRef, useState } from 'react';

interface Coords {
  top: number;
  left?: number;
  right?: number;
}

/**
 * Manages open state and fixed-position coordinates for a portal-rendered
 * dropdown menu. The dropdown is anchored to a trigger element and rendered
 * via createPortal so it escapes any overflow:hidden ancestors.
 *
 * @param align - 'left' aligns menu left-edge to trigger left-edge;
 *                'right' aligns menu right-edge to trigger right-edge.
 */
export function usePortalMenu(align: 'left' | 'right' = 'left') {
  const [open, setOpen] = useState(false);
  const [coords, setCoords] = useState<Coords>({ top: 0, left: 0 });
  const triggerRef = useRef<HTMLElement>(null);

  const toggle = () => {
    if (!open && triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      if (align === 'right') {
        setCoords({ top: rect.bottom + 4, right: window.innerWidth - rect.right });
      } else {
        setCoords({ top: rect.bottom + 4, left: rect.left });
      }
    }
    setOpen((v) => !v);
  };

  const close = () => setOpen(false);

  // Close on click outside
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (triggerRef.current?.contains(e.target as Node)) return;
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
    top: coords.top,
    ...(coords.left !== undefined ? { left: coords.left } : {}),
    ...(coords.right !== undefined ? { right: coords.right } : {}),
    zIndex: 9999,
  };

  return { open, toggle, close, triggerRef, menuStyle };
}
