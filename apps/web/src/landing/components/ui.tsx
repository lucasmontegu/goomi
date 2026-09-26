import Image from "next/image";
import Link from "next/link";
import type { CSSProperties, ReactNode } from "react";

import { APP_STORE } from "../config";
import type { LandingCopy } from "../i18n";
import type { Pose } from "../i18n/types";

export const POSE_SRC: Record<Pose, string> = {
  wave: "/goomi/poses/wave.png",
  read: "/goomi/poses/read.png",
  globe: "/goomi/poses/globe.png",
  sleep: "/goomi/poses/sleep.png",
  celebrate: "/goomi/poses/celebrate.png",
  think: "/goomi/poses/think.png",
};

export const POSE_ALT: Record<Pose, string> = {
  wave: "Goomi waving from a white cushion",
  read: "Goomi reading a lavender book",
  globe: "Goomi hugging a small globe",
  sleep: "Goomi asleep on a lavender pillow",
  celebrate: "Goomi jumping with joy",
  think: "Goomi thinking, hand on chin",
};

export function PoseImage({
  pose,
  size,
  className,
  priority,
  alt,
  sizes,
}: {
  pose: Pose;
  size: number;
  className?: string;
  priority?: boolean;
  alt?: string;
  sizes?: string;
}) {
  return (
    <Image
      src={POSE_SRC[pose]}
      alt={alt ?? POSE_ALT[pose]}
      width={size}
      height={size}
      priority={priority}
      sizes={sizes ?? `${size}px`}
      className={className}
      draggable={false}
    />
  );
}

export function ClayBall({
  color,
  size,
  className,
  style,
}: {
  color: string;
  size: number | string;
  className?: string;
  style?: CSSProperties;
}) {
  return (
    <span
      aria-hidden
      className={`clay-ball block ${className ?? ""}`}
      style={{ "--clay": color, width: size, height: size, fontSize: typeof size === "number" ? size / 3 : undefined, ...style } as CSSProperties}
    />
  );
}

export function Logo({ label, className }: { label: string; className?: string }) {
  return (
    <Link href="/" aria-label={label} className={`group inline-flex items-center gap-2.5 ${className ?? ""}`}>
      <span className="relative block size-9 overflow-hidden rounded-[11px] shadow-[0_6px_14px_-6px_rgba(73,99,0,0.55)] transition-transform duration-500 ease-pop group-hover:-rotate-6 group-hover:scale-105">
        <Image src="/goomi/app-icon.png" alt="" width={72} height={72} sizes="36px" className="size-full" priority />
      </span>
      <span className="text-[1.35rem] font-extrabold tracking-[-0.04em] text-g-text">goomi</span>
    </Link>
  );
}

export function Eyebrow({ children, tone = "lime", className }: { children: ReactNode; tone?: "lime" | "lavender" | "mint" | "ink"; className?: string }) {
  const tones = {
    lime: "bg-g-lime-soft text-g-accent",
    lavender: "bg-g-lavender-soft text-g-text",
    mint: "bg-g-mint-soft text-g-text",
    ink: "bg-white/10 text-lime",
  } as const;
  return (
    <p className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-[0.72rem] font-bold uppercase tracking-[0.14em] ${tones[tone]} ${className ?? ""}`}>
      <span aria-hidden className="size-1.5 rounded-full bg-current" />
      {children}
    </p>
  );
}

export function SectionHeading({
  eyebrow,
  title,
  lead,
  tone,
  align = "left",
  id,
  invert,
}: {
  eyebrow: string;
  title: ReactNode;
  lead?: string;
  tone?: "lime" | "lavender" | "mint" | "ink";
  align?: "left" | "center";
  id?: string;
  invert?: boolean;
}) {
  return (
    <div className={`reveal flex flex-col gap-4 ${align === "center" ? "items-center text-center" : "items-start"}`}>
      <Eyebrow tone={tone}>{eyebrow}</Eyebrow>
      <h2
        id={id}
        className={`max-w-[18ch] text-balance text-[2.35rem] leading-[1.02] font-extrabold tracking-[-0.045em] sm:text-5xl lg:text-[3.6rem] ${invert ? "text-ivory" : "text-g-text"}`}
      >
        {title}
      </h2>
      {lead && (
        <p className={`max-w-[52ch] text-pretty text-[1.05rem] leading-relaxed sm:text-lg ${invert ? "text-ivory/70" : "text-g-muted"}`}>{lead}</p>
      )}
    </div>
  );
}

function PhoneGlyph() {
  return (
    <svg aria-hidden viewBox="0 0 24 24" className="size-5 shrink-0" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
      <rect x="6" y="2.5" width="12" height="19" rx="3.2" />
      <path d="M10.5 5.2h3" />
    </svg>
  );
}

/**
 * The App Store CTA. While `APP_STORE.live` is false it renders as a "coming soon" badge rather than a
 * link to a listing that doesn't exist yet.
 */
export function StoreButton({
  copy,
  tone = "ink",
  compact,
  className,
}: {
  copy: LandingCopy["store"];
  tone?: "ink" | "lime" | "ivory";
  compact?: boolean;
  className?: string;
}) {
  const tones = {
    ink: "bg-g-text text-g-bg",
    lime: "btn-lime",
    ivory: "bg-ivory text-ink",
  } as const;
  const label = APP_STORE.live ? copy.live : copy.soon;
  const content = compact ? (
    <>
      <PhoneGlyph />
      <span className="text-[0.92rem] font-bold tracking-[-0.01em]">{APP_STORE.live ? label.label : copy.soonShort}</span>
    </>
  ) : (
    <>
      <PhoneGlyph />
      <span className="flex flex-col items-start leading-none">
        <span className="text-[0.66rem] font-semibold tracking-wide opacity-75">{label.eyebrow}</span>
        <span className="mt-0.5 text-[1.05rem] font-bold tracking-[-0.02em]">{label.label}</span>
      </span>
      {!APP_STORE.live && <span aria-hidden className="ml-1 size-2 animate-pulse rounded-full bg-lime ring-2 ring-lime/30 motion-reduce:animate-none" />}
    </>
  );
  const base = `inline-flex items-center rounded-full select-none ${compact ? "h-10 gap-2 pl-3.5 pr-4" : "h-14 gap-3 pl-5 pr-6"} ${tones[tone]} ${className ?? ""}`;
  if (APP_STORE.live) {
    return (
      <a href={APP_STORE.url} className={`${base} clay-press`} rel="noopener">
        {content}
      </a>
    );
  }
  return (
    <span role="note" aria-label={`${label.eyebrow} ${label.label}`} className={base}>
      {content}
    </span>
  );
}
