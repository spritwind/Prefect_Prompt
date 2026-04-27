"use client";

import { useEffect } from "react";

export function usePullToOpen(onOpen: () => void) {
  useEffect(() => {
    let startY: number | null = null;
    function onTouchStart(e: TouchEvent) {
      if (window.scrollY > 0) return;
      startY = e.touches[0].clientY;
    }
    function onTouchMove(e: TouchEvent) {
      if (startY === null) return;
      const dy = e.touches[0].clientY - startY;
      if (dy > 80) {
        onOpen();
        startY = null;
      }
    }
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        onOpen();
      }
    }
    window.addEventListener("touchstart", onTouchStart, { passive: true });
    window.addEventListener("touchmove", onTouchMove, { passive: true });
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("touchstart", onTouchStart);
      window.removeEventListener("touchmove", onTouchMove);
      window.removeEventListener("keydown", onKey);
    };
  }, [onOpen]);
}
