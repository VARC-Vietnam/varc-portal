import type { Metadata } from "next";
import { Newsreader, Outfit } from "next/font/google";
import "./globals.css";

const outfit = Outfit({
  subsets: ["latin", "latin-ext"],
  variable: "--font-outfit",
  display: "swap",
});

const newsreader = Newsreader({
  subsets: ["latin", "latin-ext"],
  variable: "--font-newsreader",
  display: "swap",
});

function siteOrigin(): string | undefined {
  const raw =
    process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ||
    process.env.AUTH_URL?.replace(/\/$/, "") ||
    process.env.NEXTAUTH_URL?.replace(/\/$/, "");
  if (!raw) return undefined;
  try {
    return new URL(raw).origin;
  } catch {
    return undefined;
  }
}

const origin = siteOrigin();

// Keep this static (no DB). /_not-found is prerendered at build time; CMS
// favicon is resolved at request time via /api/favicon.
export const metadata: Metadata = {
  metadataBase: origin ? new URL(origin) : undefined,
  title: {
    default: "VARC",
    template: "%s | VARC",
  },
  description:
    "Cổng thông tin Hiệp hội Vô tuyến Nghiệp dư Việt Nam / Vietnam Amateur Radio Club portal",
  icons: {
    icon: [{ url: "/api/favicon" }],
    shortcut: [{ url: "/api/favicon" }],
    apple: [{ url: "/api/favicon" }],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="vi" className={`${outfit.variable} ${newsreader.variable}`}>
      <body className="min-h-[100dvh] antialiased">{children}</body>
    </html>
  );
}
