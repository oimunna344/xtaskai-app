import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "XTaskAI - Earn USDC on Base",
  description: "Complete microtasks, join tournaments, play PvP games & earn USDC on Base network",
  icons: {
    icon: "/favicon.ico",
  },
  openGraph: {
    title: "XTaskAI - Earn USDC on Base",
    description: "Complete microtasks, join tournaments, play PvP games & earn USDC",
    url: "https://xtaskai-app.vercel.app",
    siteName: "XTaskAI",
    images: [
      {
        url: "https://xtaskai-app.vercel.app/og-image.jpg",
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
    description: "Complete microtasks, join tournaments, play PvP games & earn USDC",
    images: ["https://xtaskai-app.vercel.app/og-image.jpg"],
  },
  other: {
    "base:app_id": "69c0256cfa9c0ad39d2bcd03",
  },
  manifest: "/manifest.json",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <meta name="base:app_id" content="69c0256cfa9c0ad39d2bcd03" />
        <link rel="manifest" href="/manifest.json" />
      </head>
      <body className={inter.className}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}