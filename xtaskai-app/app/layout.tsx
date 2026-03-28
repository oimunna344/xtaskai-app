import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  // ✅ VERY IMPORTANT (OG fix)
  metadataBase: new URL("https://xtaskai-app.vercel.app"),

  title: "XTaskAI - Earn USDC on Base",
  description:
    "Complete microtasks, join tournaments, play PvP games & earn USDC on Base network",

  icons: {
    icon: "/favicon.ico",
  },

  openGraph: {
    title: "XTaskAI - Earn USDC on Base",
    description:
      "Complete microtasks, join tournaments, play PvP games & earn USDC",
    url: "/",
    siteName: "XTaskAI",
    images: [
      {
        url: "/og.png", // ✅ তোমার new OG image
        width: 1200,
        height: 630,
        alt: "XTaskAI - Earn USDC on Base",
      },
    ],
    type: "website",
  },

  twitter: {
    card: "summary_large_image",
    title: "XTaskAI - Earn USDC on Base",
    description:
      "Complete microtasks, join tournaments, play PvP games & earn USDC",
    images: ["/og.png"], // ✅ same image
  },

  // ✅ Base App প্রয়োজন
  other: {
    "base:app_id": "69c0256cfa9c0ad39d2bcd03",
  },

  manifest: "/manifest.json",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}