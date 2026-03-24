import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "XTaskAI - Earn USDC on Base",
  description: "Complete tasks and earn USDC on Base network",
  icons: {
    icon: "/favicon.ico",        // ← এই লাইন যোগ করো
  },
  other: {
    "base:app_id": "69c0256cfa9c0ad39d2bcd03",
  },
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
      </head>
      <body className={inter.className}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}