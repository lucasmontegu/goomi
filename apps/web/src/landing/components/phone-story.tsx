"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

import type { PhoneCopy } from "../i18n/types";
import { clamp, useReducedMotion } from "../lib/hooks";
import { PoseImage } from "./ui";

type Step = { title: string; body: string };

const LAYERS = 12;

/**
 * Sticky scroll story. The section is tall; while it passes, a CSS 3D phone stays pinned, turns with the
 * scroll, and plays the loop: pick apps → shield → challenge → back to the app.
 */
export function PhoneStory({ steps, phone }: { steps: Step[]; phone: PhoneCopy }) {
  const section = useRef<HTMLDivElement>(null);
  const body = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(0);
  const reduced = useReducedMotion();

  useEffect(() => {
    let frame = 0;
    const update = () => {
      frame = 0;
      const element = section.current;
      if (!element) return;
      const rect = element.getBoundingClientRect();
      const travel = Math.max(1, rect.height - window.innerHeight);
      const progress = clamp(-rect.top / travel);
      setActive(Math.min(steps.length - 1, Math.floor(progress * steps.length * 0.999)));
      const target = body.current;
      if (target && !reduced) {
        const swing = Math.sin(progress * Math.PI * 2) * 4;
        target.style.setProperty("--pry", `${(-24 + progress * 44 + swing).toFixed(2)}deg`);
        target.style.setProperty("--prx", `${(10 - progress * 8).toFixed(2)}deg`);
        target.style.setProperty("--prz", `${(-3 + progress * 5).toFixed(2)}deg`);
      }
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, [steps.length, reduced]);

  const jumpTo = (index: number) => {
    const element = section.current;
    if (!element) return;
    const travel = element.offsetHeight - window.innerHeight;
    const top = element.getBoundingClientRect().top + window.scrollY + (travel * (index + 0.5)) / steps.length;
    window.scrollTo({ top, behavior: reduced ? "auto" : "smooth" });
  };

  return (
    <div ref={section} style={{ height: `calc(100svh + ${steps.length * 62}svh)` }} className="relative">
      <div className="sticky top-0 flex h-svh flex-col items-center justify-center gap-6 px-4 pt-16 pb-6 sm:px-6 lg:grid lg:grid-cols-[1fr_1fr] lg:gap-16 lg:pt-0 lg:pb-0 mx-auto max-w-[1240px]">
        <div className="relative flex min-h-0 flex-1 items-center justify-center lg:h-[80vh] lg:flex-none">
          <div className="relative [perspective:1600px]">
            <div aria-hidden className="absolute -bottom-10 left-1/2 h-8 w-[70%] -translate-x-1/2 rounded-[50%] bg-[radial-gradient(closest-side,var(--g-shadow-strong),transparent)]" />
            <div
              ref={body}
              className="relative aspect-[9/19.2] h-[min(56svh,620px)] [container-type:inline-size] [transform-style:preserve-3d] transition-transform duration-300 ease-out lg:h-[min(76vh,680px)]"
              style={{ transform: "rotateX(var(--prx, 6deg)) rotateY(var(--pry, -14deg)) rotateZ(var(--prz, 0deg))" }}
            >
              {Array.from({ length: LAYERS }, (_, i) => (
                <div
                  key={i}
                  aria-hidden
                  className="absolute inset-0 rounded-[16%/7.6%]"
                  style={{
                    transform: `translateZ(${-(i + 1) * 1.1}px)`,
                    background: i === LAYERS - 1 ? "#0b0b0c" : i % 3 === 0 ? "#3a3d36" : "#2a2c27",
                  }}
                />
              ))}
              <div className="absolute inset-0 rounded-[16%/7.6%] bg-[#141512] p-[3.4%] shadow-[inset_0_0_0_1.5px_rgba(255,255,255,0.12)]">
                <div className="relative size-full overflow-hidden rounded-[13%/6.2%] bg-ivory">
                  <Screens active={active} phone={phone} />
                  <div aria-hidden className="absolute top-[2.2%] left-1/2 h-[3.6%] w-[31%] -translate-x-1/2 rounded-full bg-black" />
                  {/* Glass sheen. */}
                  <div
                    aria-hidden
                    className="pointer-events-none absolute inset-0 bg-[linear-gradient(115deg,transparent_35%,rgba(255,255,255,0.14)_48%,transparent_60%)]"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        <ol className="relative w-full max-w-[34rem] lg:max-w-none">
          {steps.map((step, i) => {
            const isActive = i === active;
            return (
              <li
                key={step.title}
                aria-current={isActive ? "step" : undefined}
                className={`transition-[opacity,transform] duration-500 ease-spring max-lg:absolute max-lg:inset-x-0 max-lg:bottom-0 ${
                  isActive ? "opacity-100 max-lg:translate-y-0" : "max-lg:pointer-events-none max-lg:translate-y-3 max-lg:opacity-0 lg:opacity-40"
                } lg:py-4`}
              >
                <button
                  type="button"
                  onClick={() => jumpTo(i)}
                  className="group flex w-full items-start gap-4 rounded-[24px] text-left lg:p-4 lg:hover:bg-g-soft/60"
                >
                  <span
                    className={`grid size-10 shrink-0 place-items-center rounded-2xl text-base font-extrabold transition-colors duration-300 ${
                      isActive ? "btn-lime" : "bg-g-soft text-g-muted"
                    }`}
                  >
                    {i + 1}
                  </span>
                  <span className="flex flex-col gap-1.5">
                    <span className="text-xl leading-tight font-bold tracking-[-0.025em] text-g-text sm:text-2xl">{step.title}</span>
                    <span className="text-pretty text-[0.98rem] leading-relaxed text-g-muted sm:text-[1.05rem]">{step.body}</span>
                  </span>
                </button>
              </li>
            );
          })}
          {/* Keeps the mobile caption area from collapsing, sized by the longest step. */}
          <li aria-hidden className="invisible flex gap-4 lg:hidden">
            <span className="size-10 shrink-0" />
            <span className="flex flex-col gap-1.5">
              <span className="text-xl leading-tight font-bold">{longest(steps).title}</span>
              <span className="text-[0.98rem] leading-relaxed">{longest(steps).body}</span>
            </span>
          </li>
        </ol>
      </div>
    </div>
  );
}

function longest(steps: Step[]) {
  return steps.reduce((a, b) => (b.title.length + b.body.length > a.title.length + a.body.length ? b : a));
}

function Layer({ show, children, className }: { show: boolean; children: ReactNode; className?: string }) {
  return (
    <div
      aria-hidden={!show}
      className={`absolute inset-0 transition-[opacity,transform] duration-500 ease-spring ${show ? "opacity-100" : "pointer-events-none opacity-0"} ${className ?? ""}`}
    >
      {children}
    </div>
  );
}

/** Screens use container-query units so they scale with the phone, like a real screenshot. */
function Screens({ active, phone }: { active: number; phone: PhoneCopy }) {
  return (
    <div className="absolute inset-0 text-[4.2cqw] text-ink">
      <Layer show={active === 0} className={active === 0 ? "" : "-translate-x-[8%]"}>
        <PickScreen phone={phone} />
      </Layer>
      <Layer show={active === 1 || active === 3}>
        <FeedScreen blurred={active === 1} />
      </Layer>
      <Layer show={active === 1} className={active === 1 ? "" : "translate-y-[40%]"}>
        <ShieldSheet phone={phone} />
      </Layer>
      <Layer show={active === 2} className={active === 2 ? "" : "scale-95"}>
        <ChallengeScreen phone={phone} />
      </Layer>
      <Layer show={active === 3} className={active === 3 ? "" : "-translate-y-[10%]"}>
        <BackOverlay phone={phone} />
      </Layer>
    </div>
  );
}

function PickScreen({ phone }: { phone: PhoneCopy }) {
  const tints = ["#C8B6FF", "#B6F3C6", "#FFCBA4", "#D9FF6B"];
  return (
    <div className="flex size-full flex-col bg-[#FAFAF8] px-[7%] pt-[18%]">
      <div className="flex items-end justify-between">
        <div>
          <p className="text-[3.4cqw] font-semibold text-[#72766B]">{phone.pickHint}</p>
          <p className="mt-[1.5cqw] text-[7.4cqw] leading-none font-extrabold tracking-[-0.04em]">{phone.pickTitle}</p>
        </div>
        <PoseImage pose="wave" size={120} alt="" className="-mb-[2cqw] w-[24cqw]" />
      </div>
      <div className="mt-[6cqw] overflow-hidden rounded-[5cqw] bg-white shadow-[0_2cqw_6cqw_-3cqw_rgba(38,44,20,0.18)]">
        {phone.categories.map((category, i) => (
          <div key={category} className="flex items-center gap-[3.5cqw] border-b border-[#EEF0E7] px-[4cqw] py-[3.6cqw] last:border-0">
            <span className="grid size-[9cqw] place-items-center rounded-[2.6cqw]" style={{ background: tints[i % tints.length] }}>
              <span className="size-[3.4cqw] rounded-full bg-white/80" />
            </span>
            <span className="flex-1 text-[4.2cqw] font-semibold">{category}</span>
            <span
              className={`grid size-[6cqw] place-items-center rounded-full ${i < 2 ? "bg-[#D9FF6B]" : "border-[0.6cqw] border-[#D5D8CC]"}`}
            >
              {i < 2 && (
                <svg viewBox="0 0 12 12" className="size-[3.6cqw]" fill="none" stroke="#0F0F10" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="m2.5 6.2 2.3 2.3 4.7-5" />
                </svg>
              )}
            </span>
          </div>
        ))}
      </div>
      <div className="mt-auto mb-[9%] flex h-[12cqw] items-center justify-center rounded-full bg-[#0F0F10] text-[4.2cqw] font-bold text-[#FAFAF8]">
        {phone.pickDone}
      </div>
    </div>
  );
}

/** A stand-in for any app: abstract posts, no real brand. */
function FeedScreen({ blurred }: { blurred: boolean }) {
  const photos = [
    "linear-gradient(140deg,#C8B6FF,#FFCBA4)",
    "linear-gradient(160deg,#B6F3C6,#60A5FA)",
    "linear-gradient(130deg,#FFE08A,#F8AA98)",
  ];
  return (
    <div className={`size-full bg-white px-[5%] pt-[16%] transition-[filter] duration-500 ${blurred ? "blur-[1.4cqw] saturate-75" : ""}`}>
      <div className="flex gap-[3cqw]">
        {photos.concat(photos[0]!).map((photo, i) => (
          <span key={i} className="size-[13cqw] shrink-0 rounded-full p-[0.7cqw]" style={{ background: "linear-gradient(135deg,#D9FF6B,#C8B6FF)" }}>
            <span className="block size-full rounded-full border-[0.8cqw] border-white" style={{ background: photo }} />
          </span>
        ))}
      </div>
      {photos.slice(0, 2).map((photo, i) => (
        <div key={i} className="mt-[5cqw]">
          <div className="flex items-center gap-[2cqw]">
            <span className="size-[7cqw] rounded-full bg-[#E9EBE2]" />
            <span className="h-[2.4cqw] w-[28cqw] rounded-full bg-[#E9EBE2]" />
          </div>
          <div className="mt-[3cqw] aspect-[1/0.95] rounded-[4cqw]" style={{ background: photo }} />
        </div>
      ))}
    </div>
  );
}

function ShieldSheet({ phone }: { phone: PhoneCopy }) {
  return (
    <div className="absolute inset-x-[3%] bottom-[3%] flex flex-col items-center rounded-[8cqw] bg-[#FAFAF8] px-[7%] pt-[3cqw] pb-[7cqw] text-center shadow-[0_-4cqw_10cqw_-4cqw_rgba(0,0,0,0.25)]">
      <PoseImage pose="think" size={200} alt="" className="w-[40cqw]" />
      <p className="text-[7cqw] leading-tight font-extrabold tracking-[-0.03em]">{phone.shieldTitle}</p>
      <p className="mt-[2cqw] text-[4cqw] text-[#72766B]">{phone.shieldBody}</p>
      <span className="mt-[5cqw] flex h-[12cqw] w-full items-center justify-center rounded-full bg-[#D9FF6B] text-[4.4cqw] font-bold">{phone.shieldCta}</span>
    </div>
  );
}

function ChallengeScreen({ phone }: { phone: PhoneCopy }) {
  return (
    <div className="relative flex size-full flex-col bg-[#0F0F10] px-[6%] pt-[18%] text-[#FAFAF8]">
      <div aria-hidden className="absolute -top-[10%] -right-[20%] size-[70cqw] rounded-full bg-[#D9FF6B]/15 blur-[10cqw]" />
      <p className="relative self-start rounded-full bg-[#C8B6FF]/15 px-[3cqw] py-[1.2cqw] text-[3cqw] font-bold tracking-[0.12em] text-[#C8B6FF] uppercase">
        {phone.challengeKind}
      </p>
      <p className="relative mt-[4cqw] text-[6.6cqw] leading-tight font-bold tracking-[-0.02em]">{phone.challengeQuestion}</p>
      <div className="relative mt-[6cqw] grid grid-cols-2 gap-[2.6cqw]">
        {phone.challengeChoices.map((choice, i) => (
          <span
            key={choice}
            className={`flex h-[17cqw] items-center gap-[2cqw] rounded-[4.5cqw] border-[0.4cqw] px-[3cqw] text-[3.9cqw] font-semibold ${
              i === 1 ? "border-[#D9FF6B] bg-[#D9FF6B]/12 text-[#D9FF6B]" : "border-[#42443C] bg-[#1A1C18]"
            }`}
          >
            <span className={`grid size-[5cqw] place-items-center rounded-[1.4cqw] text-[2.6cqw] font-bold ${i === 1 ? "bg-[#D9FF6B] text-[#0F0F10]" : "bg-[#33362F] text-[#ABABA8]"}`}>
              {String.fromCharCode(65 + i)}
            </span>
            {choice}
          </span>
        ))}
      </div>
      <div className="relative mt-[6cqw] flex items-center gap-[3cqw] rounded-[6cqw] bg-white/[0.07] p-[3cqw]">
        <PoseImage pose="celebrate" size={120} alt="" className="w-[17cqw]" />
        <p className="font-display text-[5cqw] leading-tight font-bold text-[#D9FF6B]">{phone.challengeCorrect}</p>
      </div>
      <p className="relative mt-[4cqw] text-[3.8cqw] leading-snug text-white/70">{phone.challengeExplain}</p>
      <span className="relative mt-auto mb-[9%] flex h-[12cqw] items-center justify-center rounded-full bg-[#D9FF6B] text-[4.2cqw] font-bold text-[#0F0F10]">
        {phone.challengeUnlock}
      </span>
    </div>
  );
}

function BackOverlay({ phone }: { phone: PhoneCopy }) {
  return (
    <>
      <div className="absolute top-[7.5%] left-1/2 flex -translate-x-1/2 items-center gap-[2cqw] rounded-full bg-[#0F0F10] py-[1.6cqw] pr-[3.6cqw] pl-[1.8cqw] text-[3.6cqw] font-bold whitespace-nowrap text-[#FAFAF8] shadow-[0_2cqw_5cqw_-2cqw_rgba(0,0,0,0.4)]">
        <svg viewBox="0 0 20 20" className="size-[5cqw] -rotate-90">
          <circle cx="10" cy="10" r="7.5" stroke="rgba(255,255,255,0.2)" strokeWidth="3" fill="none" />
          <circle cx="10" cy="10" r="7.5" stroke="#D9FF6B" strokeWidth="3" fill="none" strokeDasharray="47.1" strokeDashoffset="8" strokeLinecap="round" />
        </svg>
        {phone.unlocked}
      </div>
      <div className="absolute right-[5%] bottom-[5%] flex items-center gap-[2cqw] rounded-[5cqw] rounded-br-[1.5cqw] bg-[#FAFAF8] py-[2cqw] pr-[4cqw] pl-[2cqw] shadow-[0_3cqw_8cqw_-3cqw_rgba(0,0,0,0.35)]">
        <PoseImage pose="wave" size={120} alt="" className="w-[13cqw]" />
        <span className="text-[3.8cqw] font-semibold">{phone.backNote}</span>
      </div>
    </>
  );
}
