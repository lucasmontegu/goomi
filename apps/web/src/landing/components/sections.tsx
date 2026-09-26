import Link from "next/link";
import type { CSSProperties } from "react";

import { PLUS } from "../config";
import type { LandingCopy } from "../i18n";
import { ClayBall, Logo, PoseImage, SectionHeading, StoreButton } from "./ui";

function Tick({ className }: { className?: string }) {
  return (
    <svg aria-hidden viewBox="0 0 24 24" className={className ?? "size-4"} fill="none" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="m5 12.5 4.5 4.5L19 7.5" />
    </svg>
  );
}

export function Privacy({ copy }: { copy: LandingCopy["privacy"] }) {
  return (
    <section id="privacy" aria-labelledby="privacy-title" className="scroll-mt-20 px-2 sm:px-4">
      <div className="grain relative isolate mx-auto max-w-[1320px] overflow-hidden rounded-[40px] bg-ink px-4 py-16 text-ivory sm:rounded-[56px] sm:px-10 sm:py-24 lg:px-16 dark:bg-[#0A0A0B] dark:ring-1 dark:ring-white/8">
        <div aria-hidden className="absolute -top-32 -right-24 -z-10 size-[34rem] rounded-full bg-lime/12 blur-[120px]" />
        <div aria-hidden className="absolute -bottom-40 -left-24 -z-10 size-[28rem] rounded-full bg-lavender/14 blur-[110px]" />
        <div className="grid gap-12 lg:grid-cols-[1.1fr_1fr] lg:items-center lg:gap-16">
          <div>
            <SectionHeading id="privacy-title" eyebrow={copy.eyebrow} title={copy.title} lead={copy.lead} tone="ink" invert />
            <ul className="mt-10 grid gap-3 sm:grid-cols-2">
              {copy.points.map((point, i) => (
                <li key={point.title} className="reveal rounded-[26px] bg-white/[0.05] p-5 ring-1 ring-white/8" style={{ "--i": i } as CSSProperties}>
                  <span className="grid size-8 place-items-center rounded-xl bg-lime text-ink">
                    <Tick />
                  </span>
                  <p className="mt-4 text-[1.05rem] leading-snug font-bold">{point.title}</p>
                  <p className="mt-1.5 text-[0.95rem] leading-relaxed text-ivory/65">{point.body}</p>
                </li>
              ))}
            </ul>
            <Link
              href="/privacy"
              className="clay-press mt-8 inline-flex h-12 items-center gap-2 rounded-full bg-white/10 px-5 font-semibold text-ivory ring-1 ring-white/15 hover:bg-white/15"
            >
              {copy.more}
              <span aria-hidden>→</span>
            </Link>
          </div>
          <TokenVault copy={copy} />
        </div>
      </div>
    </section>
  );
}

/** Apple's picker gives Goomi opaque tokens, and Goomi sleeps through the rest. */
function TokenVault({ copy }: { copy: LandingCopy["privacy"] }) {
  return (
    <figure className="reveal group relative mx-auto flex w-full max-w-[420px] flex-col items-end">
      <div className="relative w-full rounded-[34px] bg-[#1A1C18] p-5 pb-12 ring-1 ring-white/10 shadow-[0_40px_80px_-40px_rgba(0,0,0,0.8)]">
        <figcaption className="mb-4 text-[0.9rem] leading-snug text-ivory/60">{copy.tokenCaption}</figcaption>
        <ul className="flex flex-col gap-2.5">
          {copy.tokenRows.map((row, i) => (
            <li key={row} className="relative flex h-14 items-center gap-3 overflow-hidden rounded-[18px] bg-white/[0.04] px-3.5">
              <span className="size-8 shrink-0 rounded-[10px]" style={{ background: ["#C8B6FF", "#B6F3C6", "#FFCBA4"][i] }} />
              <span className="relative flex-1">
                <span
                  className="block font-semibold text-ivory transition-[opacity,filter,transform] duration-700 in-[.is-in]:-translate-y-1 in-[.is-in]:opacity-0 in-[.is-in]:blur-sm"
                  style={{ transitionDelay: `${600 + i * 180}ms` }}
                >
                  {row}
                </span>
                <span
                  aria-hidden
                  className="absolute inset-y-0 left-0 flex items-center gap-1 opacity-0 transition-[opacity,transform] duration-700 ease-spring in-[.is-in]:opacity-100"
                  style={{ transitionDelay: `${800 + i * 180}ms` }}
                >
                  {Array.from({ length: 7 }, (_, dot) => (
                    <span key={dot} className="size-2 rounded-full bg-lime/80" />
                  ))}
                </span>
              </span>
              <svg aria-hidden viewBox="0 0 24 24" className="size-5 text-lime" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <rect x="5" y="11" width="14" height="10" rx="3" />
                <path d="M8 11V8a4 4 0 0 1 8 0v3" />
              </svg>
            </li>
          ))}
        </ul>
      </div>
      <div className="relative -mt-14 mr-1 flex flex-col items-center sm:-mr-8">
        <PoseImage pose="sleep" size={200} alt="" className="w-36 sm:w-44" />
        <p className="font-display -mt-2 -rotate-3 text-lavender">{copy.notLooking}</p>
      </div>
    </figure>
  );
}

export function Plus({ copy, store }: { copy: LandingCopy["plus"]; store: LandingCopy["store"] }) {
  return (
    <section id="plus" aria-labelledby="plus-title" className="scroll-mt-20 px-2 sm:px-4">
      <div className="grain relative isolate mx-auto grid max-w-[1320px] overflow-hidden rounded-[40px] bg-lime text-ink shadow-[inset_0_3px_0_rgba(255,255,255,0.55),inset_0_-8px_0_rgba(73,99,0,0.12)] sm:rounded-[56px] lg:grid-cols-[1.15fr_1fr]">
        <div className="relative z-10 px-5 pt-14 pb-6 sm:px-10 sm:pt-20 lg:px-16 lg:pb-20">
          <p className="reveal inline-flex items-center gap-2 rounded-full bg-ink px-3 py-1.5 text-[0.72rem] font-bold tracking-[0.14em] text-lime uppercase">
            <span aria-hidden className="size-1.5 rounded-full bg-current" />
            {copy.eyebrow}
          </p>
          <h2 id="plus-title" className="reveal mt-4 max-w-[14ch] text-[2.5rem] leading-[0.98] font-extrabold tracking-[-0.05em] text-balance sm:text-6xl">
            {copy.title}
          </h2>
          <p className="reveal mt-4 max-w-[44ch] text-[1.05rem] leading-relaxed text-ink/75 sm:text-lg">{copy.lead}</p>
          <ul className="mt-8 grid gap-2.5 sm:grid-cols-2">
            {copy.benefits.map((benefit, i) => (
              <li key={benefit} className="reveal flex items-start gap-3 text-[1rem] leading-snug font-semibold" style={{ "--i": i } as CSSProperties}>
                <span className="mt-px grid size-6 shrink-0 place-items-center rounded-full bg-ink text-lime">
                  <Tick className="size-3.5" />
                </span>
                {benefit}
              </li>
            ))}
          </ul>
          <div className="reveal mt-10 flex flex-col items-start gap-4">
            <StoreButton copy={store} tone="ink" className="!bg-ink !text-ivory" />
            <div className="max-w-[52ch] space-y-1.5 text-[0.85rem] leading-relaxed text-ink/70">
              {PLUS.trialDays ? <p className="font-semibold text-ink">{copy.trial.replace("{days}", String(PLUS.trialDays))}</p> : null}
              <p>{copy.prices}</p>
              <p>{copy.legal}</p>
            </div>
          </div>
        </div>
        <div aria-hidden className="relative flex min-h-[320px] items-end justify-center lg:min-h-0">
          <div className="absolute bottom-[12%] left-1/2 h-[12%] w-[58%] -translate-x-1/2 rounded-[50%] bg-[radial-gradient(closest-side,rgba(73,99,0,0.35),transparent)]" />
          <ClayBall color="#C8B6FF" size="min(72vw,400px)" className="absolute bottom-[16%] left-1/2 -translate-x-1/2" style={{ fontSize: "min(24vw,130px)" }} />
          <ClayBall color="#FAFAF8" size={40} className="float absolute top-[18%] right-[10%]" style={{ "--dur": "5s", "--delay": "-2s" } as CSSProperties} />
          <ClayBall color="#B6F3C6" size={28} className="float absolute top-[6%] right-[36%]" style={{ "--dur": "7s", "--delay": "-1s" } as CSSProperties} />
          <PoseImage pose="celebrate" size={520} sizes="(min-width: 1024px) 460px, 80vw" alt="" className="relative mb-[4%] w-[min(82vw,460px)]" />
        </div>
      </div>
    </section>
  );
}

export function Faq({ copy }: { copy: LandingCopy["faq"] }) {
  return (
    <section id="faq" aria-labelledby="faq-title" className="mx-auto max-w-[1240px] scroll-mt-20 px-4 py-20 sm:px-6 lg:py-32">
      <div className="grid gap-10 lg:grid-cols-[0.8fr_1.2fr] lg:gap-16">
        <div className="lg:sticky lg:top-28 lg:self-start">
          <SectionHeading id="faq-title" eyebrow={copy.eyebrow} title={copy.title} tone="lavender" />
          <PoseImage pose="think" size={220} alt="" className="reveal mt-6 hidden w-44 lg:block" />
        </div>
        <div className="flex flex-col gap-3">
          {copy.items.map((item, i) => (
            <details
              key={item.q}
              open={i === 0}
              className="reveal group rounded-[26px] bg-g-surface ring-1 ring-g-line transition-shadow open:shadow-[0_24px_48px_-32px_var(--g-shadow-strong)]"
              style={{ "--i": Math.min(i, 3) } as CSSProperties}
            >
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 p-5 text-left text-[1.08rem] leading-snug font-bold tracking-[-0.015em] text-g-text sm:p-6 sm:text-[1.15rem] [&::-webkit-details-marker]:hidden">
                {item.q}
                <span className="grid size-9 shrink-0 place-items-center rounded-full bg-g-soft text-g-text transition-[transform,background-color] duration-500 ease-spring group-open:rotate-45 group-open:bg-lime group-open:text-ink">
                  <svg aria-hidden viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round">
                    <path d="M12 5v14M5 12h14" />
                  </svg>
                </span>
              </summary>
              <p className="-mt-1 max-w-[62ch] px-5 pb-6 text-[1rem] leading-relaxed text-g-muted sm:px-6">{item.a}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}

export function FinalCta({ copy, store }: { copy: LandingCopy["final"]; store: LandingCopy["store"] }) {
  return (
    <section aria-labelledby="final-title" className="relative isolate overflow-hidden px-4 pt-10 pb-24 text-center sm:px-6">
      <div aria-hidden className="absolute bottom-0 left-1/2 -z-10 size-[40rem] -translate-x-1/2 translate-y-1/3 rounded-full bg-lime/30 blur-[120px] dark:bg-lime/10" />
      <div className="reveal mx-auto flex max-w-[48rem] flex-col items-center">
        <PoseImage pose="wave" size={300} alt="" className="float w-52 sm:w-64" />
        <h2 id="final-title" className="mt-2 text-[2.4rem] leading-[1] font-extrabold tracking-[-0.05em] text-balance text-g-text sm:text-6xl">
          {copy.title}{" "}
          <span className="font-display font-bold tracking-[-0.02em] text-g-accent">{copy.accent}</span>
        </h2>
        <div className="mt-9">
          <StoreButton copy={store} />
        </div>
      </div>
    </section>
  );
}

export function SiteFooter({ copy }: { copy: LandingCopy }) {
  const f = copy.footer;
  const year = 2026;
  return (
    <footer className="border-t border-g-line bg-g-bg">
      <div className="mx-auto grid max-w-[1240px] grid-cols-2 gap-10 px-4 py-14 sm:px-6 md:grid-cols-[1.4fr_1fr_1fr]">
        <div className="col-span-2 flex flex-col items-start gap-3 md:col-span-1">
          <Logo label={copy.nav.home} />
          <p className="font-display text-lg text-g-muted">{f.tagline}</p>
        </div>
        <nav aria-label={f.product} className="flex flex-col gap-3">
          <p className="text-[0.72rem] font-bold tracking-[0.14em] text-g-muted uppercase">{f.product}</p>
          <a className="font-semibold text-g-text hover:text-g-muted" href="/#how">{f.links.how}</a>
          <a className="font-semibold text-g-text hover:text-g-muted" href="/#modes">{f.links.modes}</a>
          <a className="font-semibold text-g-text hover:text-g-muted" href="/#plus">{f.links.plus}</a>
          <a className="font-semibold text-g-text hover:text-g-muted" href="/#faq">{f.links.faq}</a>
        </nav>
        <nav aria-label={f.legal} className="flex flex-col gap-3">
          <p className="text-[0.72rem] font-bold tracking-[0.14em] text-g-muted uppercase">{f.legal}</p>
          <Link className="font-semibold text-g-text hover:text-g-muted" href="/privacy">{f.links.privacy}</Link>
          <Link className="font-semibold text-g-text hover:text-g-muted" href="/terms">{f.links.terms}</Link>
          <Link className="font-semibold text-g-text hover:text-g-muted" href="/support">{f.links.support}</Link>
        </nav>
      </div>
      <div className="mx-auto flex max-w-[1240px] flex-col gap-1 border-t border-g-line px-4 py-6 text-[0.82rem] text-g-muted sm:flex-row sm:justify-between sm:px-6">
        <p>
          © {year} {f.rights}
        </p>
        <p>{f.apple}</p>
      </div>
    </footer>
  );
}
