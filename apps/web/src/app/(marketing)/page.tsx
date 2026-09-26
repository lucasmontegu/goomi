import { Hero } from "@/landing/components/hero/hero";
import { Modes } from "@/landing/components/modes";
import { PhoneStory } from "@/landing/components/phone-story";
import { Faq, FinalCta, Plus, Privacy } from "@/landing/components/sections";
import { StudyShowcase } from "@/landing/components/study";
import { SurpriseRing } from "@/landing/components/surprise-ring";
import { SectionHeading } from "@/landing/components/ui";
import { APP_STORE, SITE_URL } from "@/landing/config";
import { getCopy } from "@/landing/i18n";

export default function Home() {
  const copy = getCopy();
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "MobileApplication",
    name: "Goomi",
    operatingSystem: "iOS",
    applicationCategory: "EducationalApplication",
    description: copy.meta.description,
    url: SITE_URL,
    ...(APP_STORE.live ? { installUrl: APP_STORE.url } : {}),
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <Hero copy={copy} />

      <section id="how" aria-labelledby="how-title" className="relative scroll-mt-16 pt-20 lg:pt-32">
        <div className="mx-auto max-w-[1240px] px-4 sm:px-6">
          <SectionHeading id="how-title" eyebrow={copy.how.eyebrow} title={copy.how.title} lead={copy.how.lead} />
        </div>
        <PhoneStory steps={copy.how.steps} phone={copy.how.phone} />
      </section>

      <section id="modes" aria-labelledby="modes-title" className="mx-auto max-w-[1240px] scroll-mt-16 px-4 py-20 sm:px-6 lg:py-28">
        <SectionHeading id="modes-title" eyebrow={copy.modes.eyebrow} title={copy.modes.title} lead={copy.modes.lead} tone="mint" align="center" />
        <Modes copy={copy.modes} />
      </section>

      <section id="study" aria-labelledby="study-title" className="relative isolate scroll-mt-16 overflow-x-clip py-20 lg:py-28">
        <div aria-hidden className="absolute top-1/3 left-1/2 -z-10 size-[44rem] -translate-x-1/2 rounded-full bg-lavender/25 blur-[140px] dark:bg-lavender/10" />
        <div className="mx-auto max-w-[1240px] px-4 sm:px-6">
          <SectionHeading id="study-title" eyebrow={copy.study.eyebrow} title={copy.study.title} lead={copy.study.lead} tone="lavender" />
          <StudyShowcase copy={copy.study} />
        </div>
      </section>

      <section aria-labelledby="surprise-title" className="overflow-x-clip py-20 lg:py-28">
        <div className="mx-auto max-w-[1240px] px-4 sm:px-6">
          <SectionHeading id="surprise-title" eyebrow={copy.surprise.eyebrow} title={copy.surprise.title} lead={copy.surprise.lead} align="center" />
        </div>
        <SurpriseRing copy={copy.surprise} />
      </section>

      <Privacy copy={copy.privacy} />
      <div className="h-20 lg:h-28" />
      <Plus copy={copy.plus} store={copy.store} />
      <Faq copy={copy.faq} />
      <FinalCta copy={copy.final} store={copy.store} />
    </>
  );
}
