import type { Metadata } from "next";

import { LegalPage, SupportContact } from "@/landing/components/legal-page";
import { getLegal, support } from "@/landing/i18n";

export const metadata: Metadata = {
  title: support.metaTitle,
  description: support.metaDescription,
  alternates: { canonical: "/support" },
  openGraph: { url: "/support", title: support.metaTitle, description: support.metaDescription },
};

export default function SupportPage() {
  return (
    <LegalPage
      doc={support}
      ui={getLegal("en").ui}
      aside={<SupportContact title={support.contactTitle} body={support.contactBody} cta={support.contactCta} />}
    />
  );
}
