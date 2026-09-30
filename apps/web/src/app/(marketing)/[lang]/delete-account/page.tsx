import type { Metadata } from "next";

import { LegalRoute, legalMetadata, prefixedLocale } from "@/landing/legal-route";

type Props = { params: Promise<{ lang: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  return legalMetadata(prefixedLocale((await params).lang), "deleteAccount");
}

export default async function Page({ params }: Props) {
  return <LegalRoute locale={prefixedLocale((await params).lang)} doc="deleteAccount" />;
}
