import { LegalRoute, legalMetadata } from "@/landing/legal-route";

export const metadata = legalMetadata("en", "deleteAccount");

export default function Page() {
  return <LegalRoute locale="en" doc="deleteAccount" />;
}
