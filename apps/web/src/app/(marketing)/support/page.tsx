import type { Metadata } from "next";

import { LegalPage, SupportContact } from "@/landing/components/legal-page";
import { getCopy, getLegal } from "@/landing/i18n";

const doc = getLegal().support;

export const metadata: Metadata = {
  title: doc.metaTitle,
  description: doc.metaDescription,
  alternates: { canonical: "/support" },
  openGraph: { url: "/support", title: doc.metaTitle, description: doc.metaDescription },
};

export default function SupportPage() {
  return (
    <LegalPage
      doc={doc}
      ui={getCopy().legal}
      aside={<SupportContact title={doc.contactTitle} body={doc.contactBody} cta={doc.contactCta} />}
    />
  );
}
