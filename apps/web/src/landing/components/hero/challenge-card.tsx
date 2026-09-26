"use client";

import { useRef, useState } from "react";

import type { ChallengeCopy } from "../../i18n/types";
import { react } from "../../lib/goomi-mood";
import { usePointerTilt } from "../../lib/hooks";
import { PoseImage } from "../ui";

type Phase = "ask" | "result" | "unlocked";

function LockGlyph({ open }: { open: boolean }) {
  return (
    <svg aria-hidden viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="5" y="11" width="14" height="10" rx="3" />
      <path
        d={open ? "M8 11V8a4 4 0 0 1 7.6-1.7" : "M8 11V8a4 4 0 0 1 8 0v3"}
        className="transition-[d] duration-500"
      />
    </svg>
  );
}

function Check() {
  return (
    <span aria-hidden className="grid size-5 shrink-0 place-items-center rounded-full bg-lime text-ink">
      <svg viewBox="0 0 24 24" className="size-3.5" fill="none" stroke="currentColor" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round">
        <path d="m5.5 12.5 4 4 9-9.5" />
      </svg>
    </span>
  );
}

/**
 * A real Goomi challenge, as it appears when you open a shielded app: dark, immersive, four tactile
 * answers, then a reaction that teaches instead of just marking right or wrong.
 */
export function ChallengeCard({ copy }: { copy: ChallengeCopy }) {
  const [index, setIndex] = useState(0);
  const [choice, setChoice] = useState<number | null>(null);
  const [phase, setPhase] = useState<Phase>("ask");
  const card = useRef<HTMLDivElement>(null);
  const resultHeading = useRef<HTMLParagraphElement>(null);
  usePointerTilt(card, 7);

  const item = copy.items[index]!;
  const correct = choice === item.answer;
  const total = copy.items.length;

  const answer = (value: number) => {
    if (phase !== "ask") return;
    setChoice(value);
    setPhase("result");
    react(value === item.answer ? "celebrate" : "think");
    if ("vibrate" in navigator) navigator.vibrate?.(value === item.answer ? [12, 40, 18] : 10);
    requestAnimationFrame(() => resultHeading.current?.focus({ preventScroll: true }));
  };

  const next = () => {
    setIndex((current) => (current + 1) % total);
    setChoice(null);
    setPhase("ask");
    react("wave");
  };

  const unlock = () => {
    setPhase("unlocked");
    react("wave");
  };

  const twoUp = item.choices.length <= 2;

  return (
    <div className="[perspective:1400px]">
      <div
        ref={card}
        className="relative overflow-hidden rounded-[30px] bg-ink p-4 text-ivory shadow-[0_40px_80px_-40px_rgba(15,15,16,0.7),0_12px_24px_-12px_rgba(15,15,16,0.4)] ring-1 ring-white/8 transition-transform duration-700 ease-spring [transform:rotateX(var(--rx,0deg))_rotateY(var(--ry,0deg))] [transform-style:preserve-3d] sm:p-5"
      >
        {/* Lime glow behind the question, like the app's dark interruption surface. */}
        <div aria-hidden className="pointer-events-none absolute -top-24 -right-16 size-64 rounded-full bg-lime/12 blur-3xl" />

        <div className="relative flex items-center justify-between gap-3">
          <p className="flex items-center gap-2 text-[0.8rem] font-semibold text-ivory/70">
            <span className="grid size-6 place-items-center rounded-lg bg-lime text-ink">
              <LockGlyph open={phase === "unlocked"} />
            </span>
            {copy.before}
          </p>
          <p className="flex items-center gap-1" aria-label={`${copy.progress} ${index + 1} ${copy.of} ${total}`}>
            {copy.items.map((_, i) => (
              <span key={i} className={`h-1.5 rounded-full transition-all duration-500 ease-spring ${i === index ? "w-5 bg-lime" : "w-1.5 bg-white/20"}`} />
            ))}
          </p>
        </div>

        {phase !== "unlocked" ? (
          <div key={index} className="pop-in relative">
            <p className="mt-5 inline-flex rounded-full bg-lavender/15 px-2.5 py-1 text-[0.68rem] font-bold uppercase tracking-[0.14em] text-lavender">
              {item.kind}
            </p>
            <h3 id="hero-challenge" className="mt-2.5 text-pretty text-[1.3rem] leading-snug font-bold tracking-[-0.02em] sm:text-[1.45rem]">
              {item.question}
            </h3>

            <div role="group" aria-labelledby="hero-challenge" className={`mt-4 grid gap-2.5 ${twoUp ? "grid-cols-1 sm:grid-cols-2" : "grid-cols-2"}`}>
              {item.choices.map((label, i) => {
                const picked = choice === i;
                const isAnswer = i === item.answer;
                const reveal = phase === "result";
                const state = reveal && isAnswer ? "right" : reveal && picked ? "wrong" : "idle";
                return (
                  <button
                    key={label}
                    type="button"
                    disabled={phase !== "ask"}
                    aria-pressed={picked}
                    onClick={() => answer(i)}
                    className={`group/tile flex min-h-[68px] items-center gap-2.5 rounded-[20px] border-[1.5px] p-3 text-left text-[0.95rem] leading-tight font-semibold transition-[transform,background-color,border-color,opacity] duration-300 ease-pop enabled:hover:-translate-y-0.5 enabled:hover:border-white/35 enabled:active:scale-[0.96] ${
                      state === "right"
                        ? "border-lime bg-lime/12 text-lime"
                        : state === "wrong"
                          ? "border-[#F8AA98] bg-[#F8AA98]/10 text-[#FFC9BC]"
                          : reveal
                            ? "border-white/10 bg-[#1A1C18] text-ivory/45"
                            : "border-[#42443C] bg-[#1A1C18] text-ivory"
                    }`}
                  >
                    <span
                      className={`grid size-6 shrink-0 place-items-center rounded-lg text-[0.68rem] font-bold ${
                        state === "right" ? "bg-lime text-ink" : state === "wrong" ? "bg-[#F8AA98] text-ink" : "bg-[#33362F] text-[#ABABA8]"
                      }`}
                    >
                      {String.fromCharCode(65 + i)}
                    </span>
                    <span className="flex-1">{label}</span>
                    {state === "right" && <Check />}
                  </button>
                );
              })}
            </div>

            <div aria-live="polite">
              {phase === "result" && (
                <div className="pop-in mt-4 rounded-[22px] bg-white/[0.06] p-4 ring-1 ring-white/8">
                  <div className="flex items-start gap-3">
                    <PoseImage pose={correct ? "celebrate" : "think"} size={64} alt="" className="-my-1 size-16 shrink-0 boing" />
                    <div className="min-w-0 flex-1">
                      <p ref={resultHeading} tabIndex={-1} className={`font-display text-[1.35rem] leading-none font-bold outline-none ${correct ? "text-lime" : "text-lavender"}`}>
                        {correct ? copy.correct : copy.wrong}
                      </p>
                      <p className="mt-1.5 text-[0.93rem] leading-snug text-ivory/85">
                        {!correct && (
                          <>
                            {copy.answerIs} <strong className="text-ivory">{item.choices[item.answer]}</strong>.{" "}
                          </>
                        )}
                        {item.explain}
                      </p>
                      <p className="mt-2 inline-flex rounded-full bg-lime/15 px-2.5 py-1 text-[0.72rem] font-bold text-lime">
                        {correct ? copy.memory : copy.later}
                      </p>
                    </div>
                  </div>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <button type="button" onClick={unlock} className="clay-press btn-lime inline-flex h-11 items-center gap-2 rounded-full px-5 text-sm font-bold">
                      {copy.back}
                      <span aria-hidden>→</span>
                    </button>
                    <button type="button" onClick={next} className="clay-press inline-flex h-11 items-center rounded-full bg-white/10 px-5 text-sm font-semibold text-ivory hover:bg-white/15">
                      {copy.next}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="pop-in relative flex flex-col items-center py-6 text-center" aria-live="polite">
            <UnlockRing />
            <p className="mt-4 max-w-[26ch] text-balance text-[1.05rem] leading-snug font-semibold">{copy.backDone}</p>
            <button type="button" onClick={next} className="clay-press btn-lime mt-5 inline-flex h-11 items-center rounded-full px-5 text-sm font-bold">
              {copy.next}
            </button>
          </div>
        )}

        {phase === "ask" && (
          <p className="relative mt-4 flex items-center gap-2 border-t border-white/8 pt-3.5 text-[0.8rem] text-ivory/55">
            <LockGlyph open={false} />
            {copy.unlocks}
          </p>
        )}
      </div>
    </div>
  );
}

/** The five minutes of use you earned, drawn as the app's progress ring. */
function UnlockRing() {
  const r = 38;
  const c = 2 * Math.PI * r;
  return (
    <div className="relative grid size-24 place-items-center">
      <svg viewBox="0 0 88 88" className="absolute inset-0 -rotate-90" aria-hidden>
        <circle cx="44" cy="44" r={r} stroke="rgba(255,255,255,0.12)" strokeWidth="8" fill="none" />
        <circle
          cx="44"
          cy="44"
          r={r}
          stroke="#D9FF6B"
          strokeWidth="8"
          fill="none"
          strokeLinecap="round"
          strokeDasharray={c}
          className="animate-[goomi-ring_1.2s_var(--ease-goomi)_both] motion-reduce:animate-none"
          style={{ ["--c" as string]: `${c}` }}
        />
      </svg>
      <span className="text-xl font-extrabold tracking-tight tabular-nums">5:00</span>
    </div>
  );
}
