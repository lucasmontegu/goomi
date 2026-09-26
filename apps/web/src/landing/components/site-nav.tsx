"use client";

import { useEffect, useState } from "react";

import type { LandingCopy } from "../i18n";
import { Logo, StoreButton } from "./ui";

export function SiteNav({ copy }: { copy: Pick<LandingCopy, "nav" | "store"> }) {
  const [raised, setRaised] = useState(false);
  useEffect(() => {
    const onScroll = () => setRaised(window.scrollY > 12);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <>
      <a
        href="#main"
        className="sr-only z-50 rounded-full bg-g-text px-4 py-2 text-g-bg focus:not-sr-only focus:fixed focus:top-3 focus:left-3"
      >
        {copy.nav.skip}
      </a>
      <header className="sticky top-0 z-40 px-3 pt-3 sm:px-5">
        <nav
          aria-label="Main"
          className={`mx-auto flex h-14 max-w-[1240px] items-center justify-between gap-4 rounded-full pr-2 pl-3 transition-[background-color,box-shadow,backdrop-filter] duration-500 sm:pl-4 ${
            raised
              ? "bg-g-surface/80 shadow-[0_12px_30px_-18px_var(--g-shadow-strong)] ring-1 ring-g-line backdrop-blur-xl"
              : "bg-transparent"
          }`}
        >
          <Logo label={copy.nav.home} />
          <ul className="hidden items-center gap-1 md:flex">
            {copy.nav.links.map((link) => (
              <li key={link.href}>
                <a
                  href={link.href}
                  className="rounded-full px-3.5 py-2 text-[0.93rem] font-semibold text-g-muted transition-colors hover:bg-g-soft hover:text-g-text"
                >
                  {link.label}
                </a>
              </li>
            ))}
          </ul>
          <StoreButton copy={copy.store} tone="lime" compact />
        </nav>
      </header>
    </>
  );
}
