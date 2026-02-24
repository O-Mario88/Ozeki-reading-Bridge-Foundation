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
    const offsetX = input.offsetX ?? 14;
    const offsetY = input.offsetY ?? 14;

    let localX = input.clientX - input.containerRect.left + offsetX;
    let localY = input.clientY - input.containerRect.top + offsetY;

    const maxX = Math.max(8, input.containerRect.width - cardWidth - 8);
    const maxY = Math.max(8, input.containerRect.height - cardHeight - 8);

    if (localX > maxX) {
      localX = Math.max(8, input.clientX - input.containerRect.left - cardWidth - offsetX);
    }
    if (localY > maxY) {
      localY = Math.max(8, input.clientY - input.containerRect.top - cardHeight - offsetY);
    }

    return {
      left: Math.min(Math.max(8, localX), maxX),
      top: Math.min(Math.max(8, localY), maxY),
    };
  }, []);
}
