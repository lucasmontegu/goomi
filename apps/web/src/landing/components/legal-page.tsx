import Link from "next/link";
import type { CSSProperties, ReactNode } from "react";

import { LEGAL_UPDATED, SUPPORT_EMAIL } from "../config";
import type { LegalDoc, LegalUi } from "../i18n/legal-types";
import { ClayBall, PoseImage } from "./ui";

function formatDate(iso: string, lang: string) {
  return new Date(`${iso}T12:00:00Z`).toLocaleDateString(lang, { year: "numeric", month: "long", day: "numeric", timeZone: "UTC" });
}

/** The same document in other languages. */
export type LegalAlternate = { lang: string; label: string; href: string };

function SmartLink({ href, children, className }: { href: string; children: ReactNode; className?: string }) {
  if (href.startsWith("/")) {
    return (
      <Link href={href as "/privacy"} className={className}>
        {children}
      </Link>
    );
  }
  return (
    <a href={href} className={className} rel="noopener" target="_blank">
      {children}
    </a>
  );
}

export function LegalPage({ doc, ui, aside, alternates = [] }: { doc: LegalDoc; ui: LegalUi; aside?: ReactNode; alternates?: LegalAlternate[] }) {
  return (
    <article lang={ui.lang} className="mx-auto max-w-[1100px] px-4 pt-6 pb-24 sm:px-6 sm:pt-10">
      <header className="reveal grain relative isolate overflow-hidden rounded-[36px] bg-g-lavender-soft px-6 pt-10 pb-8 sm:rounded-[44px] sm:px-10 sm:pt-14">
        <ClayBall color="#D9FF6B" size={34} className="float absolute top-8 right-[38%] hidden sm:block" />
        <div className="grid items-end gap-4 sm:grid-cols-[1fr_auto]">
          <div className="flex flex-col gap-3">
            <p className="text-[0.72rem] font-bold tracking-[0.14em] text-g-muted uppercase">{doc.eyebrow}</p>
            <h1 className="max-w-[16ch] text-[2.4rem] leading-[1] font-extrabold tracking-[-0.05em] text-balance text-g-text sm:text-6xl">{doc.title}</h1>
            <p className="max-w-[46ch] text-pretty text-[1.05rem] leading-relaxed text-g-muted sm:text-lg">{doc.lead}</p>
            <p className="mt-2 text-sm text-g-muted">
              {ui.updated} <time dateTime={LEGAL_UPDATED}>{formatDate(LEGAL_UPDATED, ui.lang)}</time>
            </p>
            {alternates.length > 0 && (
              <p className="text-sm text-g-muted">
                {ui.otherLanguages}{" "}
                {alternates.map((alternate, i) => (
                  <span key={alternate.lang}>
                    {i > 0 && " · "}
                    <Link href={alternate.href as "/privacy"} hrefLang={alternate.lang} lang={alternate.lang} className="font-semibold text-g-text underline decoration-lime decoration-2 underline-offset-4">
                      {alternate.label}
                    </Link>
                  </span>
                ))}
              </p>
            )}
          </div>
          <PoseImage pose={doc.pose} size={220} priority className="-mb-8 w-36 justify-self-end sm:-mb-10 sm:w-52" />
        </div>
      </header>

      <div className="mt-12 grid gap-12 lg:grid-cols-[220px_1fr] lg:gap-16">
        <nav aria-label={ui.onThisPage} className="hidden lg:block">
          <div className="sticky top-28 flex flex-col gap-1">
            <p className="mb-2 text-[0.72rem] font-bold tracking-[0.14em] text-g-muted uppercase">{ui.onThisPage}</p>
            {doc.sections.map((section) => (
              <a
                key={section.id}
                href={`#${section.id}`}
                className="rounded-xl px-3 py-2 text-[0.92rem] leading-snug font-medium text-g-muted transition-colors hover:bg-g-soft hover:text-g-text"
              >
                {section.heading}
              </a>
            ))}
          </div>
        </nav>

        <div className="flex max-w-[68ch] flex-col gap-11">
          {aside}
          {doc.notice && (
            <p role="note" className="reveal rounded-[24px] border border-g-line bg-g-soft p-5 text-[1rem] leading-[1.65] font-semibold text-g-text sm:p-6">
              {doc.notice}
            </p>
          )}
          {doc.sections.map((section, i) => (
            <section key={section.id} id={section.id} aria-labelledby={`${section.id}-h`} className="reveal scroll-mt-28" style={{ "--i": Math.min(i, 2) } as CSSProperties}>
              <h2 id={`${section.id}-h`} className="text-[1.45rem] leading-tight font-bold tracking-[-0.03em] text-g-text">
                {section.heading}
              </h2>
              <div className="mt-3 flex flex-col gap-3.5 text-[1.03rem] leading-[1.7] text-g-text/85">
                {section.body?.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
                {section.bullets && (
                  <ul className="flex flex-col gap-2.5">
                    {section.bullets.map((bullet) => (
                      <li key={bullet} className="flex gap-3">
                        <span aria-hidden className="mt-[0.62em] size-2 shrink-0 rounded-full bg-lime ring-1 ring-ink/15" />
                        <span>{bullet}</span>
                      </li>
                    ))}
                  </ul>
                )}
                {section.links && (
                  <p className="flex flex-wrap gap-2 pt-1">
                    {section.links.map((link) => (
                      <SmartLink
                        key={link.href}
                        href={link.href}
                        className="clay-press inline-flex h-11 items-center gap-2 rounded-full bg-g-soft px-4 text-[0.95rem] font-semibold text-g-text hover:bg-g-sunk"
                      >
                        {link.label}
                        <span aria-hidden>{link.href.startsWith("/") ? "→" : "↗"}</span>
                      </SmartLink>
                    ))}
                  </p>
                )}
              </div>
            </section>
          ))}
          <p className="border-t border-g-line pt-8 text-[0.98rem] text-g-muted">
            {ui.contact}{" "}
            <a className="font-semibold text-g-text underline decoration-lime decoration-[3px] underline-offset-4" href={`mailto:${SUPPORT_EMAIL}`}>
              {SUPPORT_EMAIL}
            </a>
            .
          </p>
        </div>
      </div>
    </article>
  );
}

export function SupportContact({ title, body, cta }: { title: string; body: string; cta: string }) {
  return (
    <div className="reveal clay-slab flex flex-col items-start gap-3 rounded-[28px] bg-lime p-6 text-ink sm:p-7">
      <p className="text-[1.45rem] leading-tight font-extrabold tracking-[-0.03em]">{title}</p>
      <p className="max-w-[48ch] text-[1rem] leading-relaxed text-ink/75">{body}</p>
      <a href={`mailto:${SUPPORT_EMAIL}`} className="clay-press mt-1 inline-flex h-12 items-center gap-2 rounded-full bg-ink px-5 font-bold text-ivory">
        {cta}
        <span className="font-medium text-ivory/60">{SUPPORT_EMAIL}</span>
      </a>
    </div>
  );
}
