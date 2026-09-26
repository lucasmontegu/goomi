import type { Metadata } from "next";

import { LegalPage } from "@/landing/components/legal-page";
import { getCopy, getLegal } from "@/landing/i18n";

const doc = getLegal().terms;

export const metadata: Metadata = {
  title: doc.metaTitle,
  description: doc.metaDescription,
  alternates: { canonical: "/terms" },
  openGraph: { url: "/terms", title: doc.metaTitle, description: doc.metaDescription },
};

export default function Page() {
  return <LegalPage doc={doc} ui={getCopy().legal} />;
}
