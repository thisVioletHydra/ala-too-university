import type { RefObject } from 'react';

import { useLayoutEffect } from 'react';

type OverlayPosition = {
  anchor: RefObject<HTMLDivElement | null>;
  overlay: RefObject<HTMLElement | null>;
  placement: 'center' | 'below';
  text?: string;
};

export function useAnchoredOverlay({ anchor: anchorRef, overlay: overlayRef, placement, text }: OverlayPosition): void {
  useLayoutEffect(() => {
    function place(): void {
      const cell = anchorRef.current;
      const label = overlayRef.current;
      if (!cell || !label) return;

      const rect = cell.getBoundingClientRect();
      if (placement === 'center') {
        label.style.left = `${rect.left + rect.width / 2}px`;
        label.style.top = `${rect.top + rect.height / 2}px`;
        label.style.maxWidth = `${Math.max(0, rect.width - 16)}px`;

        return;
      }

      const left = Math.max(8, Math.min(rect.left, window.innerWidth - label.offsetWidth - 8));
      label.style.insetBlockStart = `${rect.bottom + 4}px`;
      label.style.insetInlineStart = `${left}px`;
      label.style.visibility = 'visible';
    }

    place();
    window.addEventListener('scroll', place, true);
    window.addEventListener('resize', place);
    return () => {
      window.removeEventListener('scroll', place, true);
      window.removeEventListener('resize', place);
    };
  }, [anchorRef, overlayRef, placement, text]);
}
