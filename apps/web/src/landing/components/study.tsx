"use client";

import { useState, type CSSProperties } from "react";

import type { StudyCopy } from "../i18n/types";
import { PoseImage } from "./ui";

const SOURCE_STYLE = [
  { bg: "#FFFFFF", tag: "#F87171", rotate: -9, x: -8 },
  { bg: "#EFEAFF", tag: "#C8B6FF", rotate: 4, x: 10 },
  { bg: "#FFF8E6", tag: "#FACC15", rotate: -2, x: -2 },
  { bg: "#E4F9E9", tag: "#22C55E", rotate: 8, x: 6 },
];

/** Paper in, flashcards out: the Study mode pipeline as objects you can poke. */
export function StudyShowcase({ copy }: { copy: StudyCopy }) {
  return (
    <div className="mt-12 grid items-center gap-10 lg:mt-16 lg:grid-cols-[0.9fr_auto_1.1fr] lg:gap-6">
      <Sources sources={copy.sources} />
      <div aria-hidden className="relative mx-auto flex items-center justify-center lg:w-44">
        <PoseImage pose="read" size={220} className="float w-40 lg:w-44" alt="" />
        <svg viewBox="0 0 120 40" className="absolute -bottom-6 hidden h-8 w-28 text-g-faint lg:block" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeDasharray="1 8">
          <path d="M6 20c30-14 72-14 106 0" />
        </svg>
      </div>
      <Deck copy={copy} />
    </div>
  );
}

function Sources({ sources }: { sources: string[] }) {
  return (
    <ul className="reveal group relative mx-auto flex w-full max-w-[380px] justify-center [perspective:1200px] lg:grid lg:max-w-[360px] lg:grid-cols-2 lg:gap-4">
      {sources.map((source, i) => {
        const style = SOURCE_STYLE[i % SOURCE_STYLE.length]!;
        return (
          <li
            key={source}
            className="clay-slab relative -ml-[6%] flex aspect-[3/4] w-[30%] shrink-0 flex-col justify-between rounded-[16px] p-2.5 text-ink first:ml-0 lg:ml-0 lg:aspect-[4/5] lg:w-auto lg:rounded-[22px] lg:p-4 transition-transform duration-700 ease-spring [transform:rotate(var(--rot))_translateX(var(--tx))] group-hover:[--rot:0deg] group-hover:[--tx:0px]"
            style={{ background: style.bg, "--rot": `${style.rotate}deg`, "--tx": `${style.x}px`, transitionDelay: `${i * 40}ms` } as CSSProperties}
          >
            <span className="self-start rounded-md px-1.5 py-0.5 text-[0.55rem] leading-tight font-bold tracking-wider text-white uppercase lg:px-2 lg:text-[0.68rem]" style={{ background: style.tag }}>
              {source}
            </span>
            <span aria-hidden className="flex flex-col gap-1.5">
              <span className="h-1.5 w-[85%] rounded-full bg-ink/12" />
              <span className="h-1.5 w-[70%] rounded-full bg-ink/12" />
              <span className="h-1.5 w-[92%] rounded-full bg-ink/12" />
              <span className="h-1.5 w-[55%] rounded-full bg-ink/12" />
            </span>
          </li>
        );
      })}
    </ul>
  );
}

function Deck({ copy }: { copy: StudyCopy }) {
  const [top, setTop] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [tossing, setTossing] = useState(false);
  const cards = copy.cards;

  const next = () => {
    if (tossing) return;
    setTossing(true);
    window.setTimeout(() => {
      setTop((value) => (value + 1) % cards.length);
      setFlipped(false);
      setTossing(false);
    }, 380);
  };

  return (
    <div className="reveal mx-auto flex w-full max-w-[440px] flex-col items-center gap-5" style={{ "--i": 2 } as CSSProperties}>
      <p className="font-display text-g-muted">{copy.deckLabel}</p>
      <div className="relative aspect-[5/3.6] w-full [perspective:1400px]">
        {cards.map((card, i) => {
          const depth = (i - top + cards.length) % cards.length;
          const isTop = depth === 0;
          const tossed = isTop && tossing;
          return (
            <div
              key={card.subject}
              className="absolute inset-0 transition-[transform,opacity] duration-500 ease-spring"
              style={{
                zIndex: cards.length - depth,
                transform: tossed
                  ? "translate3d(60%, -12%, 0) rotate(18deg)"
                  : `translate3d(0, ${depth * 14}px, ${-depth * 40}px) rotate(${depth === 0 ? 0 : depth % 2 ? 3 : -3}deg)`,
                opacity: tossed ? 0 : 1,
              }}
            >
              <button
                type="button"
                disabled={!isTop}
                onClick={() => setFlipped((value) => !value)}
                aria-label={isTop ? (flipped ? copy.flipBack : copy.flip) : undefined}
                aria-hidden={!isTop}
                tabIndex={isTop ? 0 : -1}
                className="relative size-full rounded-[28px] text-left transition-transform duration-700 ease-spring [transform-style:preserve-3d] enabled:cursor-pointer"
                style={{ transform: isTop && flipped ? "rotateY(180deg)" : "none" }}
              >
                <span className="clay-slab absolute inset-0 flex flex-col rounded-[28px] bg-g-surface p-5 ring-1 ring-g-line [backface-visibility:hidden] sm:p-6">
                  <span className="text-[0.72rem] font-bold tracking-[0.12em] text-g-muted uppercase">{card.subject}</span>
                  <span className="mt-3 text-pretty text-[1.2rem] leading-snug font-bold tracking-[-0.02em] text-g-text sm:text-[1.35rem]">{card.question}</span>
                  <span className="mt-auto inline-flex items-center gap-2 text-sm font-semibold text-g-muted">
                    <FlipGlyph />
                    {copy.flip}
                  </span>
                </span>
                <span className="absolute inset-0 flex flex-col rounded-[28px] bg-lime p-5 text-ink shadow-[inset_0_2px_0_rgba(255,255,255,0.6),0_24px_40px_-24px_rgba(73,99,0,0.6)] [backface-visibility:hidden] [transform:rotateY(180deg)] sm:p-6">
                  <span className="text-[0.72rem] font-bold tracking-[0.12em] text-ink/60 uppercase">{card.subject}</span>
                  <span className="mt-3 text-[1.8rem] leading-none font-extrabold tracking-[-0.04em]">{card.answer}</span>
                  <span className="mt-auto rounded-2xl bg-ink/8 p-3 text-[0.9rem] leading-snug">
                    <span className="block text-[0.7rem] font-bold tracking-wider text-ink/60 uppercase">{copy.yourNotes}</span>
                    “{card.quote}”
                  </span>
                </span>
              </button>
            </div>
          );
        })}
      </div>
      <button
        type="button"
        onClick={next}
        className="clay-press mt-6 inline-flex h-12 items-center gap-2 rounded-full bg-g-text px-5 text-sm font-bold text-g-bg"
      >
        {copy.nextCard}
        <span aria-hidden>→</span>
      </button>
      <div className="mt-2 w-full rounded-[24px] bg-g-soft p-4 sm:p-5">
        <p className="text-[0.95rem] font-bold text-g-text">{copy.repetition.title}</p>
        <div className="mt-3 grid gap-2 text-[0.9rem] text-g-muted">
          <Rhythm tone="#C8B6FF" gaps={[1, 1.4, 2]} label={copy.repetition.missed} />
          <Rhythm tone="#D9FF6B" gaps={[2, 3.6, 6]} label={copy.repetition.knew} />
        </div>
      </div>
    </div>
  );
}

/** Dots spaced like review intervals: tight when you miss, wider when you know it. */
function Rhythm({ tone, gaps, label }: { tone: string; gaps: number[]; label: string }) {
  return (
    <div className="flex items-center gap-3">
      <span aria-hidden className="flex h-4 w-24 shrink-0 items-center">
        <span className="size-2.5 rounded-full bg-g-text" />
        {gaps.map((gap, i) => (
          <span key={i} className="flex items-center" style={{ marginLeft: `${gap * 6}px` }}>
            <span className="size-2.5 rounded-full" style={{ background: tone, boxShadow: "inset 0 -1px 0 rgba(0,0,0,0.15)" }} />
          </span>
        ))}
      </span>
      <span>{label}</span>
    </div>
  );
}

function FlipGlyph() {
  return (
    <svg aria-hidden viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 12a9 9 0 0 1 15.5-6.2L21 8M21 3v5h-5M21 12a9 9 0 0 1-15.5 6.2L3 16M3 21v-5h5" />
    </svg>
  );
}
