import type { Metadata } from "next";
import { Newsreader, Outfit } from "next/font/google";
import { getPublicSiteBranding } from "@/lib/cms";
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

export async function generateMetadata(): Promise<Metadata> {
  const branding = await getPublicSiteBranding("vi");
  const origin = siteOrigin();
  const favicon = branding.faviconUrl.trim();

  return {
    metadataBase: origin ? new URL(origin) : undefined,
    title: {
      default: "VARC",
      template: "%s | VARC",
    },
    description:
      "Cổng thông tin Hiệp hội Vô tuyến Nghiệp dư Việt Nam / Vietnam Amateur Radio Club portal",
    // Point every icon slot at /api/favicon so nothing competes with a
    // leftover file-based /favicon.ico from older Docker layers.
    icons: favicon
      ? {
          icon: [{ url: "/api/favicon" }],
          shortcut: [{ url: "/api/favicon" }],
          apple: [{ url: "/api/favicon" }],
        }
      : undefined,
  };
}

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
