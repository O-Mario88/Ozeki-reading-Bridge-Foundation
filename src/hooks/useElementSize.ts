"use client";

import { useEffect, useRef, useState } from "react";

export type ElementSize = {
  width: number;
  height: number;
};

export function useElementSize<T extends HTMLElement = HTMLElement>(enabled = true) {
  const ref = useRef<T | null>(null);
  const [size, setSize] = useState<ElementSize>({ width: 0, height: 0 });

  useEffect(() => {
    if (!enabled || !ref.current || typeof ResizeObserver === "undefined") {
      return;
    }
    const node = ref.current;
    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry) {
        return;
      }
      const { width, height } = entry.contentRect;
      setSize({
        width: Math.round(width),
        height: Math.round(height),
      });
    });
    observer.observe(node);
    return () => {
      observer.disconnect();
    };
  }, [enabled]);

  return {
    ref,
    size,
  };
}

