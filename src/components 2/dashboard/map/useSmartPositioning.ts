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

    // Default: position card so cursor is at the lower-left corner
    // Card goes above the cursor and to the right
    let localX = input.clientX - input.containerRect.left + offsetX;
    let localY = input.clientY - input.containerRect.top - cardHeight - offsetY;

    const maxX = Math.max(8, input.containerRect.width - cardWidth - 8);

    // If card would go above the container, flip below cursor
    if (localY < 8) {
      localY = input.clientY - input.containerRect.top + offsetY;
    }

    // If card would go past right edge, flip to left side of cursor
    if (localX > maxX) {
      localX = Math.max(8, input.clientX - input.containerRect.left - cardWidth - offsetX);
    }

    const maxY = Math.max(8, input.containerRect.height - cardHeight - 8);

    return {
      left: Math.min(Math.max(8, localX), maxX),
      top: Math.min(Math.max(8, localY), maxY),
    };
  }, []);
}

