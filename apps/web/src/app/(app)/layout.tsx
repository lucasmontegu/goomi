import type { Metadata } from "next";

import Header from "@/components/header";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default function AppLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <div className="grid h-svh grid-rows-[auto_1fr]">
      <Header />
      {children}
    </div>
  );
}
