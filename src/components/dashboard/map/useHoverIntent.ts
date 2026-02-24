"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export type HoverIntentOptions = {
  openDelayMs?: number;
  closeDelayMs?: number;
};

export function useHoverIntent(options?: HoverIntentOptions) {
  const openDelayMs = options?.openDelayMs ?? 100;
  const closeDelayMs = options?.closeDelayMs ?? 320;
  const [isOpen, setIsOpen] = useState(false);
  const openTimerRef = useRef<number | null>(null);
  const closeTimerRef = useRef<number | null>(null);

  const clearTimers = useCallback(() => {
    if (openTimerRef.current !== null) {
      window.clearTimeout(openTimerRef.current);
      openTimerRef.current = null;
    }
    if (closeTimerRef.current !== null) {
      window.clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
  }, []);

  const scheduleOpen = useCallback(() => {
    if (closeTimerRef.current !== null) {
      window.clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
    if (openTimerRef.current !== null) {
      return;
    }
    openTimerRef.current = window.setTimeout(() => {
      setIsOpen(true);
      openTimerRef.current = null;
    }, openDelayMs);
  }, [openDelayMs]);

  const scheduleClose = useCallback(() => {
    if (openTimerRef.current !== null) {
      window.clearTimeout(openTimerRef.current);
      openTimerRef.current = null;
    }
    if (closeTimerRef.current !== null) {
      return;
    }
    closeTimerRef.current = window.setTimeout(() => {
      setIsOpen(false);
      closeTimerRef.current = null;
    }, closeDelayMs);
  }, [closeDelayMs]);

  const forceOpen = useCallback(() => {
    clearTimers();
    setIsOpen(true);
  }, [clearTimers]);

  const forceClose = useCallback(() => {
    clearTimers();
    setIsOpen(false);
  }, [clearTimers]);

  useEffect(() => {
    return () => {
      clearTimers();
    };
  }, [clearTimers]);

  return {
    isOpen,
    scheduleOpen,
    scheduleClose,
    forceOpen,
    forceClose,
  };
}
