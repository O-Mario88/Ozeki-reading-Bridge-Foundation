"use client";

import { useCallback } from "react";

export type SmartPositionInput = {
  clientX: number;
  clientY: number;
  containerRect: DOMRect;
  cardWidth?: number;
  cardHeight?: number;
  offsetX?: number;
  offsetY?: number;
};

export function useSmartPositioning() {
  return useCallback((input: SmartPositionInput) => {
    const cardWidth = input.cardWidth ?? 320;
    const cardHeight = input.cardHeight ?? 220;
    const offsetX = input.offsetX ?? 6;
    const offsetY = input.offsetY ?? 6;
    const minMargin = 8;

    const cursorLocalX = input.clientX - input.containerRect.left;
    const cursorLocalY = input.clientY - input.containerRect.top;

    const maxX = Math.max(minMargin, input.containerRect.width - cardWidth - minMargin);
    const maxY = Math.max(minMargin, input.containerRect.height - cardHeight - minMargin);

    // Default anchor: card appears above/right of cursor so pointer stays near its lower-left corner.
    let localX = cursorLocalX + offsetX;
    let localY = cursorLocalY - cardHeight - offsetY;

    // If right edge overflows, place card on the left side of cursor.
    if (localX > maxX) {
      localX = cursorLocalX - cardWidth - offsetX;
    }

    // If top edge overflows, place card below the cursor.
    if (localY < minMargin) {
      localY = cursorLocalY + offsetY;
    }

    // Clamp final position to keep entire card visible within canvas bounds.
    localX = Math.min(Math.max(minMargin, localX), maxX);
    localY = Math.min(Math.max(minMargin, localY), maxY);

    return {
      left: localX,
      top: localY,
    };
  }, []);
}
