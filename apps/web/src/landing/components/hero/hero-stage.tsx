"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useRef, useState, type CSSProperties } from "react";

import type { Pose } from "../../i18n/types";
import { useMood } from "../../lib/goomi-mood";
import { clamp, useInView, useReducedMotion } from "../../lib/hooks";
import { ClayBall, PoseImage } from "../ui";
import type { SceneInput } from "./goomi-scene";

const GoomiScene = dynamic(() => import("./goomi-scene"), { ssr: false });

type OrientationPermission = { requestPermission?: () => Promise<"granted" | "denied"> };

function supportsWebGL() {
  try {
    const canvas = document.createElement("canvas");
    return Boolean(canvas.getContext("webgl2") ?? canvas.getContext("webgl"));
  } catch {
    return false;
  }
}

function prefersLightweight() {
  const connection = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection;
  return Boolean(connection?.saveData);
}

const FALLBACK_POSES: Pose[] = ["wave", "celebrate", "think"];

/**
 * The hero's Goomi. A static composition paints first (it is the LCP candidate on phones); the WebGL
 * scene loads when the browser is idle and cross-fades in on its first frame. Reduced motion, no WebGL
 * or Save-Data keep the static composition, which still reacts to the challenge.
 */
export function HeroStage({ label, tiltLabel }: { label: string; tiltLabel: string }) {
  const stage = useRef<HTMLDivElement>(null);
  const input = useRef<SceneInput>({ x: 0, y: 0, scroll: 0 });
  const reduced = useReducedMotion();
  const inView = useInView(stage, "0px");
  const [load, setLoad] = useState(false);
  const [ready, setReady] = useState(false);
  const [askTilt, setAskTilt] = useState(false);
  const mood = useMood();

  useEffect(() => {
    if (reduced || !supportsWebGL() || prefersLightweight()) return;
    const idle = window.requestIdleCallback ?? ((callback: () => void) => window.setTimeout(callback, 350));
    const cancel = window.cancelIdleCallback ?? window.clearTimeout;
    const handle = idle(() => setLoad(true), { timeout: 1600 });
    return () => cancel(handle);
  }, [reduced]);

  // Pointer anywhere on the page steers the scene; scroll progress through the hero lifts it away.
  useEffect(() => {
    const fine = window.matchMedia("(pointer: fine)").matches;
    const onPointer = (event: PointerEvent) => {
      if (!fine) return;
      input.current.x = (event.clientX / window.innerWidth) * 2 - 1;
      input.current.y = (event.clientY / window.innerHeight) * 2 - 1;
    };
    const onScroll = () => {
      const element = stage.current;
      if (!element) return;
      const rect = element.getBoundingClientRect();
      input.current.scroll = clamp(-rect.top / Math.max(1, rect.height));
    };
    onScroll();
    window.addEventListener("pointermove", onPointer, { passive: true });
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("pointermove", onPointer);
      window.removeEventListener("scroll", onScroll);
    };
  }, []);

  const onOrientation = useCallback((event: DeviceOrientationEvent) => {
    if (event.gamma == null || event.beta == null) return;
    input.current.x = clamp(event.gamma / 28, -1, 1);
    input.current.y = clamp((event.beta - 45) / 30, -1, 1);
  }, []);

  // Phones: tilt steers Goomi. iOS asks for permission, which must come from a tap.
  useEffect(() => {
    if (!load || !window.matchMedia("(pointer: coarse)").matches || typeof DeviceOrientationEvent === "undefined") return;
    const needsPermission = typeof (DeviceOrientationEvent as unknown as OrientationPermission).requestPermission === "function";
    if (needsPermission) {
      setAskTilt(true);
      return;
    }
    window.addEventListener("deviceorientation", onOrientation);
    return () => window.removeEventListener("deviceorientation", onOrientation);
  }, [load, onOrientation]);

  useEffect(() => () => window.removeEventListener("deviceorientation", onOrientation), [onOrientation]);

  const enableTilt = async () => {
    setAskTilt(false);
    try {
      const result = await (DeviceOrientationEvent as unknown as OrientationPermission).requestPermission?.();
      if (result === "granted") window.addEventListener("deviceorientation", onOrientation);
    } catch {
      /* Tilt is a bonus; the pointer and taps still work. */
    }
  };

  const onReady = useCallback(() => setReady(true), []);

  return (
    <div ref={stage} className="relative mx-auto aspect-[1/0.92] w-full max-w-[560px] select-none xl:aspect-[1/0.98] xl:max-w-none">
      <div role="img" aria-label={label} className="absolute inset-0">
      {/* Static composition: same layout as the 3D scene so the cross-fade is barely noticeable. */}
      <div aria-hidden className={`absolute inset-0 transition-opacity duration-700 xl:-translate-x-[22%] ${ready ? "opacity-0" : "opacity-100"}`}>
        <div className="absolute inset-x-[16%] bottom-[9%] h-[9%] rounded-[50%] bg-[radial-gradient(closest-side,var(--g-shadow-strong),transparent)]" />
        <div className="absolute inset-x-[12%] bottom-[8%] top-[8%]">
          {FALLBACK_POSES.map((pose) => (
            <div
              key={pose}
              className={`absolute inset-0 transition-opacity duration-150 ${mood.pose === pose ? "opacity-100" : "opacity-0"}`}
            >
              <PoseImage
                key={mood.pose === pose ? mood.beat : undefined}
                pose={pose}
                size={560}
                priority={pose === "wave"}
                sizes="(min-width: 1024px) 420px, 76vw"
                alt=""
                className={`size-full object-contain ${mood.pose === pose && mood.beat > 0 ? "boing" : ""}`}
              />
            </div>
          ))}
        </div>
        <ClayBall color="#C8B6FF" size="9%" className="float absolute top-[14%] left-[26%]" style={{ "--dur": "5.5s" } as CSSProperties} />
        <ClayBall color="#D9FF6B" size="10%" className="float absolute top-[40%] left-[4%]" style={{ "--dur": "6.5s", "--delay": "-2s" } as CSSProperties} />
        <ClayBall color="#B6F3C6" size="12%" className="float absolute top-[30%] right-[2%]" style={{ "--dur": "7s", "--delay": "-1s" } as CSSProperties} />
        <ClayBall color="#D9FF6B" size="6%" className="float absolute top-[10%] right-[28%]" style={{ "--dur": "5s", "--delay": "-3s" } as CSSProperties} />
        <ClayBall color="#F2F1EC" size="10%" className="absolute bottom-[8%] left-[8%]" />
      </div>

      {load && (
        /* On wide screens the canvas reaches left into the gap so Goomi can sit clear of the challenge card. */
        <div className={`absolute inset-[-6%] transition-opacity duration-700 xl:right-[16%] xl:left-[-34%] ${ready ? "opacity-100" : "opacity-0"}`}>
          <GoomiScene input={input} active={inView} onReady={onReady} />
        </div>
      )}
      </div>

      {askTilt && ready && (
        <button
          type="button"
          onClick={enableTilt}
          className="clay-press absolute top-2 right-2 z-10 inline-flex h-11 items-center gap-2 rounded-full bg-g-surface/90 px-4 text-sm font-semibold text-g-text shadow-[0_8px_20px_-10px_var(--g-shadow-strong)] backdrop-blur"
        >
          <svg aria-hidden viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <rect x="7" y="3" width="10" height="18" rx="2.5" transform="rotate(-14 12 12)" />
            <path d="M3.5 9.5a8 8 0 0 0 0 5M20.5 9.5a8 8 0 0 1 0 5" />
          </svg>
          {tiltLabel}
        </button>
      )}
    </div>
  );
}
