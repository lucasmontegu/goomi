"use client";

import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";

import type { SurpriseCopy } from "../i18n/types";
import { useInView, useReducedMotion } from "../lib/hooks";

const CLAYS = ["#D9FF6B", "#C8B6FF", "#B6F3C6", "#FAFAF8"];

/**
 * A carousel of every challenge type on a 3D ring. It idles, you can drag it, and "Surprise me" spins
 * it with a spring and lands on something you didn't pick.
 */
export function SurpriseRing({ copy }: { copy: SurpriseCopy }) {
  const count = copy.types.length;
  const step = 360 / count;
  const stage = useRef<HTMLDivElement>(null);
  const ring = useRef<HTMLDivElement>(null);
  const chips = useRef<(HTMLLIElement | null)[]>([]);
  const inView = useInView(stage);
  const reduced = useReducedMotion();
  const [radius, setRadius] = useState(300);
  const [picked, setPicked] = useState<number | null>(null);
  const [spinning, setSpinning] = useState(false);
  const motion = useRef({ angle: 0, velocity: 0, target: null as number | null, dragging: false, lastX: 0, lastT: 0, pointer: -1 });

  useEffect(() => {
    const element = stage.current;
    if (!element) return;
    const observer = new ResizeObserver(([entry]) => {
      const width = entry?.contentRect.width ?? 360;
      setRadius(width < 640 ? 230 : width < 1024 ? 300 : 360);
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  const apply = (angle: number) => {
    if (ring.current) ring.current.style.transform = `translateZ(${-radius}px) rotateX(-9deg) rotateY(${angle}deg)`;
    chips.current.forEach((chip, i) => {
      if (!chip) return;
      const facing = Math.cos(((angle + i * step) * Math.PI) / 180);
      chip.style.opacity = String(0.22 + Math.max(0, facing) * 0.78);
    });
  };

  useEffect(() => {
    apply(motion.current.angle);
    if (!inView) return;
    let frame = 0;
    let last = performance.now();
    const tick = (now: number) => {
      const dt = Math.min(0.033, (now - last) / 1000);
      last = now;
      const m = motion.current;
      if (m.target !== null) {
        m.velocity += (-26 * (m.angle - m.target) - 7.5 * m.velocity) * dt;
        m.angle += m.velocity * dt;
        if (Math.abs(m.angle - m.target) < 0.3 && Math.abs(m.velocity) < 2) {
          m.angle = m.target;
          m.velocity = 0;
          m.target = null;
          const front = ((Math.round(-m.angle / step) % count) + count) % count;
          setPicked(front);
          setSpinning(false);
        }
      } else if (!m.dragging) {
        m.velocity *= Math.pow(0.08, dt);
        m.angle += m.velocity * dt + (reduced ? 0 : -7 * dt);
      }
      apply(m.angle);
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [inView, reduced, radius, step, count]);

  const surprise = () => {
    const m = motion.current;
    const current = ((Math.round(-m.angle / step) % count) + count) % count;
    let pick = Math.floor(Math.random() * (count - 1));
    if (pick >= current) pick += 1;
    // Land chip `pick` in front after at least one full turn.
    const base = -pick * step;
    let target = base - 360 * Math.ceil((m.angle - base) / 360) - 360;
    if (reduced) target = base;
    setPicked(null);
    if (reduced || !inView) {
      m.angle = target;
      m.velocity = 0;
      apply(target);
      setPicked(pick);
      return;
    }
    setSpinning(true);
    m.target = target;
    m.velocity = -140;
  };

  const onPointerDown = (event: ReactPointerEvent) => {
    const m = motion.current;
    m.dragging = true;
    m.target = null;
    m.lastX = event.clientX;
    m.lastT = performance.now();
    m.pointer = event.pointerId;
    setSpinning(false);
  };
  const onPointerMove = (event: ReactPointerEvent) => {
    const m = motion.current;
    if (!m.dragging || event.pointerId !== m.pointer) return;
    const now = performance.now();
    const dx = event.clientX - m.lastX;
    m.angle += dx * 0.32;
    m.velocity = (dx * 0.32) / Math.max(0.008, (now - m.lastT) / 1000);
    m.lastX = event.clientX;
    m.lastT = now;
    if (reduced || !inView) apply(m.angle);
  };
  const onPointerUp = () => {
    motion.current.dragging = false;
  };

  const chosen = picked === null ? null : copy.types[picked]!;

  return (
    <div className="mt-8 flex flex-col items-center">
      <div
        ref={stage}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onPointerLeave={onPointerUp}
        aria-hidden
        className="relative h-[210px] w-full cursor-grab touch-pan-y overflow-hidden select-none active:cursor-grabbing sm:h-[260px] [mask-image:linear-gradient(90deg,transparent,black_18%,black_82%,transparent)] [perspective:1100px]"
      >
        <div ref={ring} className="absolute top-1/2 left-1/2 [transform-style:preserve-3d]" style={{ transform: `translateZ(${-radius}px) rotateX(-9deg)` }}>
          <ul className="[transform-style:preserve-3d]">
            {copy.types.map((type, i) => (
              <li
                key={type.label}
                ref={(node) => void (chips.current[i] = node)}
                className="absolute -mt-8 -ml-[64px] flex h-16 w-[128px] [backface-visibility:hidden] items-center gap-2.5 rounded-[22px] px-3.5 text-[0.9rem] leading-tight font-bold text-ink sm:-ml-[80px] sm:w-[160px] sm:text-base"
                style={{
                  transform: `rotateY(${i * step}deg) translateZ(${radius}px)`,
                  background: CLAYS[i % CLAYS.length],
                  boxShadow: "inset 0 2px 0 rgba(255,255,255,0.6), inset 0 -4px 0 rgba(0,0,0,0.08), 0 18px 30px -18px rgba(38,44,20,0.55)",
                }}
              >
                <span className="grid size-7 shrink-0 place-items-center rounded-full bg-ink text-[0.7rem] text-ivory">{i + 1}</span>
                {type.label}
              </li>
            ))}
          </ul>
        </div>
      </div>
      <p className="font-display mt-1 text-sm text-g-muted">{copy.dragHint}</p>

      <button
        type="button"
        onClick={surprise}
        disabled={spinning}
        className="clay-press btn-lime mt-5 inline-flex h-14 items-center gap-2.5 rounded-full px-7 text-base font-bold disabled:opacity-80"
      >
        <DiceGlyph spinning={spinning} />
        {copy.spin}
      </button>

      <div aria-live="polite" className="mt-6 min-h-[132px] w-full max-w-[30rem]">
        {chosen && (
          <div key={picked} className="pop-in clay-slab rounded-[26px] bg-g-surface p-5 ring-1 ring-g-line">
            <p className="text-[0.72rem] font-bold tracking-[0.14em] text-g-muted uppercase">{chosen.label}</p>
            <p className="mt-1.5 text-[1.15rem] leading-snug font-bold tracking-[-0.02em] text-g-text">{chosen.prompt}</p>
            <details className="group mt-3">
              <summary className="inline-flex cursor-pointer list-none items-center gap-1.5 rounded-full bg-g-soft px-3 py-1.5 text-sm font-semibold text-g-text [&::-webkit-details-marker]:hidden">
                {copy.answer}
                <svg aria-hidden viewBox="0 0 24 24" className="size-3.5 transition-transform group-open:rotate-180" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round">
                  <path d="m6 9 6 6 6-6" />
                </svg>
              </summary>
              <p className="mt-2 text-[0.98rem] text-g-muted">{chosen.answer}</p>
            </details>
          </div>
        )}
      </div>

      {/* The full list for assistive tech: the ring itself is decorative. */}
      <ul className="sr-only">
        {copy.types.map((type) => (
          <li key={type.label}>{type.label}</li>
        ))}
      </ul>
    </div>
  );
}

function DiceGlyph({ spinning }: { spinning: boolean }) {
  return (
    <svg
      aria-hidden
      viewBox="0 0 24 24"
      className={`size-5 transition-transform duration-700 ease-spring ${spinning ? "rotate-[360deg]" : ""}`}
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    >
      <rect x="3.5" y="3.5" width="17" height="17" rx="5" />
      <circle cx="8.5" cy="8.5" r="1.3" fill="currentColor" />
      <circle cx="15.5" cy="15.5" r="1.3" fill="currentColor" />
      <circle cx="12" cy="12" r="1.3" fill="currentColor" />
    </svg>
  );
}
