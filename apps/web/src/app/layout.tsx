import type { Metadata, Viewport } from "next";
import { Balsamiq_Sans, Plus_Jakarta_Sans } from "next/font/google";

import "../index.css";
import Providers from "@/components/providers";
import { APP_STORE, SITE_URL } from "@/landing/config";
import { getCopy } from "@/landing/i18n";

const jakarta = Plus_Jakarta_Sans({
  variable: "--font-jakarta",
  subsets: ["latin", "latin-ext"],
  display: "swap",
});

const balsamiq = Balsamiq_Sans({
  variable: "--font-balsamiq",
  weight: ["400", "700"],
  subsets: ["latin"],
  display: "swap",
});

const copy = getCopy();

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: copy.meta.title, template: "%s · Goomi" },
  description: copy.meta.description,
  applicationName: "Goomi",
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    siteName: "Goomi",
    url: "/",
    locale: "en_US",
    title: copy.meta.title,
    description: copy.meta.description,
  },
  twitter: {
    card: "summary_large_image",
    title: copy.meta.title,
    description: copy.meta.description,
  },
  appleWebApp: { title: "Goomi" },
  // Smart App Banner in Safari, only once there is something to open.
  ...(APP_STORE.live ? { itunes: { appId: APP_STORE.id } } : {}),
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#FAFAF8" },
    { media: "(prefers-color-scheme: dark)", color: "#121311" },
  ],
  colorScheme: "light dark",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${jakarta.variable} ${balsamiq.variable} font-sans antialiased`}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
