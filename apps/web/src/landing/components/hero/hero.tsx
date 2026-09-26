import type { LandingCopy } from "../../i18n";
import { StoreButton } from "../ui";
import { ChallengeCard } from "./challenge-card";
import { HeroStage } from "./hero-stage";

function Squiggle() {
  return (
    <svg aria-hidden viewBox="0 0 220 24" preserveAspectRatio="none" className="absolute -bottom-[0.12em] left-0 h-[0.32em] w-full text-lime">
      <path d="M3 15c22-9 40-9 58 0s36 9 54 0 38-9 56 0 30 8 46 1" fill="none" stroke="currentColor" strokeWidth="7" strokeLinecap="round" />
    </svg>
  );
}

export function Hero({ copy }: { copy: LandingCopy }) {
  return (
    <section aria-labelledby="hero-title" className="relative isolate overflow-x-clip">
      {/* Soft studio glows: lime key light, lavender fill. */}
      <div aria-hidden className="absolute inset-0 -z-10">
        <div className="absolute -top-40 right-[-20%] size-[42rem] rounded-full bg-lime/35 blur-[120px] dark:bg-lime/10" />
        <div className="absolute top-[30%] -left-40 size-[30rem] rounded-full bg-lavender/35 blur-[110px] dark:bg-lavender/10" />
      </div>

      <div className="mx-auto grid max-w-[1240px] gap-x-12 px-4 pt-6 pb-16 sm:px-6 sm:pt-10 xl:grid-cols-[1fr_1.08fr] xl:items-center xl:pt-8 xl:pb-24">
        <div className="relative z-10 flex flex-col items-start">
          <p className="font-display -rotate-2 text-[1.05rem] text-g-muted sm:text-lg">{copy.hero.note}</p>
          <h1
            id="hero-title"
            className="mt-3 text-[3.1rem] leading-[0.95] font-extrabold tracking-[-0.055em] text-balance text-g-text min-[400px]:text-[3.5rem] sm:text-7xl lg:text-[5.4rem]"
          >
            {copy.hero.titleStart}{" "}
            <span className="relative inline-block whitespace-nowrap">
              {copy.hero.titleAccent}
              <Squiggle />
            </span>
          </h1>
          <p className="mt-6 max-w-[34rem] text-pretty text-[1.08rem] leading-relaxed text-g-muted sm:text-xl">{copy.hero.lead}</p>
          <div className="mt-8 flex flex-wrap items-center gap-3">
            <StoreButton copy={copy.store} />
            <a
              href="#try"
              className="clay-press inline-flex h-14 items-center gap-2 rounded-full border border-g-line bg-g-surface px-6 font-semibold text-g-text shadow-[0_10px_24px_-18px_var(--g-shadow-strong)]"
            >
              {copy.hero.tryOne}
              <svg aria-hidden viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round">
                <path d="M12 5v14M6 13l6 6 6-6" />
              </svg>
            </a>
          </div>
        </div>

        <div className="relative mt-4 xl:mt-0">
          <HeroStage label={copy.hero.sceneLabel} tiltLabel={copy.hero.tilt} />
          <div id="try" className="relative z-10 mx-auto -mt-14 max-w-[440px] scroll-mt-24 sm:-mt-20 xl:absolute xl:right-[-5%] xl:bottom-[2%] xl:mt-0 xl:w-[372px]">
            <ChallengeCard copy={copy.challenge} />
          </div>
        </div>
      </div>
    </section>
  );
}
