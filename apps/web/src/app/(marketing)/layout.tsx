import { SiteFooter } from "@/landing/components/sections";
import { RevealObserver } from "@/landing/components/reveal-observer";
import { SiteNav } from "@/landing/components/site-nav";
import { getCopy } from "@/landing/i18n";

export default function MarketingLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const copy = getCopy();
  return (
    <div className="flex min-h-svh flex-col bg-g-bg text-g-text">
      <SiteNav copy={{ nav: copy.nav, store: copy.store }} />
      <main id="main" className="flex-1">
        {children}
      </main>
      <SiteFooter copy={copy} />
      <RevealObserver />
    </div>
  );
}
