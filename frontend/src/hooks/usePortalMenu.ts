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
 * Usage:
 *   const { open, toggle, close, triggerRef, menuRef, menuStyle } = usePortalMenu('right');
 *   // attach triggerRef to the button, menuRef to the portal <div>
 *
 * @param align - 'left' aligns menu left-edge to trigger left-edge;
 *                'right' aligns menu right-edge to trigger right-edge.
 */
export function usePortalMenu(align: 'left' | 'right' = 'left') {
  const [open, setOpen] = useState(false);
  const [coords, setCoords] = useState<Coords>({ top: 0, left: 0 });
  const triggerRef = useRef<HTMLElement>(null);
  const menuRef = useRef<HTMLElement>(null);

  const toggle = () => {
    if (!open && triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      if (align === 'right') {
        setCoords({ top: rect.bottom + 4, right: window.innerWidth - rect.right });
      } else {
        // Left-align but clamp so we don't overflow the right edge.
        // We don't know menu width yet so we'll rely on min-width + right-edge check on render.
        setCoords({ top: rect.bottom + 4, left: rect.left });
      }
    }
    setOpen((v) => !v);
  };

  const close = () => setOpen(false);

  // Close on click outside — must check BOTH the trigger AND the portal content
  // so that clicks inside the menu aren't intercepted before they fire.
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
    top: coords.top,
    ...(coords.left !== undefined ? { left: coords.left } : {}),
    ...(coords.right !== undefined ? { right: coords.right } : {}),
    zIndex: 9999,
  };

  return { open, toggle, close, triggerRef, menuRef, menuStyle };
}
