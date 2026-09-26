"use client";

import { useId, useRef, useState, type CSSProperties, type KeyboardEvent } from "react";

import type { ModeId, ModesCopy } from "../i18n/types";
import { usePointerTilt } from "../lib/hooks";
import { ClayBall, PoseImage } from "./ui";

const TINT: Record<ModeId, { clay: string; accent: string; panel: string; glyph: string }> = {
  free: { clay: "#D9FF6B", accent: "#B6F3C6", panel: "bg-g-lime-soft", glyph: "M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18Zm0 0c2.5 2.4 3.8 5.4 3.8 9s-1.3 6.6-3.8 9m0-18c-2.5 2.4-3.8 5.4-3.8 9s1.3 6.6 3.8 9M3.5 9h17M3.5 15h17" },
  study: { clay: "#C8B6FF", accent: "#D9FF6B", panel: "bg-g-lavender-soft", glyph: "M4 5.5A2.5 2.5 0 0 1 6.5 3H20v15H6.5A2.5 2.5 0 0 0 4 20.5v-15ZM4 20.5A2.5 2.5 0 0 1 6.5 18H20v3H6.5A2.5 2.5 0 0 1 4 20.5Z" },
  work: { clay: "#B6F3C6", accent: "#C8B6FF", panel: "bg-g-mint-soft", glyph: "M4 6.5A1.5 1.5 0 0 1 5.5 5h13A1.5 1.5 0 0 1 20 6.5V15H4V6.5ZM2 18h20" },
  sleep: { clay: "#C8B6FF", accent: "#DCD2FF", panel: "bg-night", glyph: "M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5Z" },
};

export function Modes({ copy }: { copy: ModesCopy }) {
  const items = copy.items;
  const [active, setActive] = useState(0);
  const [beat, setBeat] = useState(0);
  const tabs = useRef<(HTMLButtonElement | null)[]>([]);
  const panel = useRef<HTMLDivElement>(null);
  const id = useId();
  usePointerTilt(panel, 6);

  const mode = items[active]!;
  const tint = TINT[mode.id];
  const night = mode.id === "sleep";

  const select = (index: number) => {
    if (index === active) return;
    setActive(index);
    setBeat((value) => value + 1);
  };

  const onKey = (event: KeyboardEvent) => {
    const delta = event.key === "ArrowRight" ? 1 : event.key === "ArrowLeft" ? -1 : 0;
    if (!delta && event.key !== "Home" && event.key !== "End") return;
    event.preventDefault();
    const next = event.key === "Home" ? 0 : event.key === "End" ? items.length - 1 : (active + delta + items.length) % items.length;
    select(next);
    tabs.current[next]?.focus();
  };

  return (
    <div className="mt-10 flex flex-col gap-6 lg:mt-14">
      <div
        role="tablist"
        aria-label={copy.tablist}
        onKeyDown={onKey}
        className="relative mx-auto grid w-full max-w-[34rem] grid-cols-4 rounded-full bg-g-soft p-1.5"
        style={{ "--i": active } as CSSProperties}
      >
        <span
          aria-hidden
          className="absolute top-1.5 bottom-1.5 left-1.5 w-[calc((100%-0.75rem)/4)] rounded-full shadow-[inset_0_2px_0_rgba(255,255,255,0.55),0_10px_18px_-10px_rgba(38,44,20,0.5)] transition-[transform,background-color] duration-500 ease-spring"
          style={{ transform: "translateX(calc(var(--i) * 100%))", background: tint.clay }}
        />
        {items.map((item, i) => {
          const selected = i === active;
          return (
            <button
              key={item.id}
              ref={(node) => void (tabs.current[i] = node)}
              role="tab"
              type="button"
              id={`${id}-tab-${item.id}`}
              aria-selected={selected}
              aria-controls={`${id}-panel`}
              tabIndex={selected ? 0 : -1}
              onClick={() => select(i)}
              className={`relative z-10 flex h-14 flex-col items-center justify-center gap-0.5 rounded-full text-[0.8rem] transition-colors duration-300 sm:h-12 sm:flex-row sm:gap-2 sm:text-[0.95rem] ${
                selected ? "font-bold text-ink" : "font-medium text-g-muted hover:text-g-text"
              }`}
            >
              <svg aria-hidden viewBox="0 0 24 24" className="size-[1.15rem]" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
                <path d={TINT[item.id].glyph} />
              </svg>
              {item.label}
            </button>
          );
        })}
      </div>

      <div className="[perspective:1800px]">
        <div
          ref={panel}
          id={`${id}-panel`}
          role="tabpanel"
          aria-labelledby={`${id}-tab-${mode.id}`}
          className={`grain relative isolate grid overflow-hidden rounded-[36px] transition-[background-color,transform] duration-700 ease-spring [transform:rotateX(var(--rx,0deg))_rotateY(var(--ry,0deg))] md:grid-cols-[1.05fr_1fr] md:rounded-[44px] ${tint.panel} ${
            night ? "text-ivory" : "text-g-text"
          }`}
        >
          {night && <Stars />}
          <div className="relative order-2 flex flex-col justify-center gap-4 p-6 pt-2 sm:p-10 md:order-1 md:p-14">
            <h3 key={`t-${beat}`} className="pop-in text-[2rem] leading-[1.02] font-extrabold tracking-[-0.045em] text-balance sm:text-5xl">
              {mode.title}
            </h3>
            <p className={`max-w-[40ch] text-pretty text-[1.05rem] leading-relaxed sm:text-lg ${night ? "text-ivory/75" : "text-g-muted"}`}>{mode.body}</p>
            <ul className="mt-2 flex flex-wrap gap-2" aria-label={copy.examples}>
              {mode.examples.map((example, i) => (
                <li
                  key={`${mode.id}-${example}`}
                  className={`pop-in rounded-full px-3.5 py-2 text-[0.85rem] font-semibold ${
                    night ? "bg-white/10 text-ivory" : "bg-g-surface text-g-text shadow-[0_6px_14px_-10px_var(--g-shadow-strong)]"
                  }`}
                  style={{ animationDelay: `${80 + i * 60}ms` }}
                >
                  {example}
                </li>
              ))}
            </ul>
          </div>
          <div className="relative order-1 flex min-h-[300px] items-end justify-center overflow-hidden pt-8 sm:min-h-[380px] md:order-2 md:min-h-[480px]">
            <div
              aria-hidden
              className="absolute bottom-[10%] left-1/2 h-[16%] w-[62%] -translate-x-1/2 rounded-[50%] transition-colors duration-700"
              style={{ background: night ? "rgba(200,182,255,0.18)" : "rgba(255,255,255,0.7)", boxShadow: "0 18px 40px -20px rgba(38,44,20,0.5)" }}
            />
            <ClayBall color={tint.clay} size={54} className="float absolute top-[14%] left-[12%]" style={{ "--dur": "6s" } as CSSProperties} />
            <ClayBall color={tint.accent} size={30} className="float absolute top-[26%] right-[14%]" style={{ "--dur": "5s", "--delay": "-2s" } as CSSProperties} />
            <ClayBall color="#FAFAF8" size={22} className="float absolute top-[8%] right-[34%]" style={{ "--dur": "7s", "--delay": "-4s" } as CSSProperties} />
            <div key={`p-${beat}`} className={beat > 0 ? "boing" : ""}>
              <PoseImage pose={mode.pose} size={420} sizes="(min-width: 768px) 400px, 80vw" className="relative -mb-[4%] w-[min(78vw,400px)]" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Stars() {
  const stars = [
    [12, 18, 3],
    [28, 8, 2],
    [44, 22, 2],
    [66, 12, 3],
    [82, 26, 2],
    [90, 8, 2],
    [58, 34, 2],
    [20, 40, 2],
  ];
  return (
    <div aria-hidden className="absolute inset-0 -z-10">
      <div className="absolute -top-20 right-[-10%] size-[26rem] rounded-full bg-lavender/20 blur-[90px]" />
      {stars.map(([x, y, s], i) => (
        <span
          key={i}
          className="absolute animate-pulse rounded-full bg-ivory/70 motion-reduce:animate-none"
          style={{ left: `${x}%`, top: `${y}%`, width: s, height: s, animationDelay: `${i * 0.4}s`, animationDuration: "3s" }}
        />
      ))}
    </div>
  );
}
