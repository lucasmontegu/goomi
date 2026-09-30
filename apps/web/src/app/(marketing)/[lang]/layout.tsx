import { legalLocaleParams } from "@/landing/legal-route";

/** Spanish and Portuguese versions of the legal pages (/es/privacy, /pt/terms, …). */
export const dynamicParams = false;

export function generateStaticParams() {
  return legalLocaleParams();
}

export default function LegalLocaleLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return children;
}
