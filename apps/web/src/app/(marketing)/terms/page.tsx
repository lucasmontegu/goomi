import { LegalRoute, legalMetadata } from "@/landing/legal-route";

export const metadata = legalMetadata("en", "terms");

export default function Page() {
  return <LegalRoute locale="en" doc="terms" />;
}
