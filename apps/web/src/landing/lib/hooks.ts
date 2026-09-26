"use client";

import { useEffect, useState, useSyncExternalStore, type RefObject } from "react";

const REDUCED = "(prefers-reduced-motion: reduce)";

function subscribeReduced(callback: () => void) {
  const query = window.matchMedia(REDUCED);
  query.addEventListener("change", callback);
  return () => query.removeEventListener("change", callback);
}

/** Live `prefers-reduced-motion`. Server render assumes motion is fine; nothing animates before hydration anyway. */
export function useReducedMotion(): boolean {
  return useSyncExternalStore(
    subscribeReduced,
    () => window.matchMedia(REDUCED).matches,
    () => false,
  );
}

/** True while the element is (nearly) on screen. Used to pause render loops off-screen. */
export function useInView(ref: RefObject<Element | null>, rootMargin = "120px 0px"): boolean {
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    const observer = new IntersectionObserver(([entry]) => setInView(Boolean(entry?.isIntersecting)), { rootMargin });
    observer.observe(element);
    return () => observer.disconnect();
  }, [ref, rootMargin]);
  return inView;
}

export function clamp(value: number, min = 0, max = 1) {
  return Math.min(max, Math.max(min, value));
}

/**
 * Pointer tilt for CSS 3D objects. Writes `--rx` / `--ry` (degrees) straight onto the element so React
 * never re-renders on pointer move, and eases back to rest when the pointer leaves.
 */
export function usePointerTilt(ref: RefObject<HTMLElement | null>, strength = 10, enabled = true) {
  useEffect(() => {
    const element = ref.current;
    if (!element || !enabled) return;
    if (!window.matchMedia("(hover: hover) and (pointer: fine)").matches) return;
    let frame = 0;
    const move = (event: PointerEvent) => {
      const rect = element.getBoundingClientRect();
      const x = (event.clientX - rect.left) / rect.width - 0.5;
      const y = (event.clientY - rect.top) / rect.height - 0.5;
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        element.style.setProperty("--ry", `${(x * strength).toFixed(2)}deg`);
        element.style.setProperty("--rx", `${(-y * strength).toFixed(2)}deg`);
      });
    };
    const leave = () => {
      cancelAnimationFrame(frame);
      element.style.setProperty("--ry", "0deg");
      element.style.setProperty("--rx", "0deg");
    };
    element.addEventListener("pointermove", move);
    element.addEventListener("pointerleave", leave);
    return () => {
      cancelAnimationFrame(frame);
      element.removeEventListener("pointermove", move);
      element.removeEventListener("pointerleave", leave);
    };
  }, [ref, strength, enabled]);
}
