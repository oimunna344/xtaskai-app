"use client";

import { useEffect } from "react";
import sdk from "@farcaster/frame-sdk";
import { Inter } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";

const inter = Inter({ subsets: ["latin"] });

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  useEffect(() => {
    const init = async () => {
      // Farcaster environment check
      if (window.parent !== window) {
        try {
          // সঠিকভাবে SDK ready কল
          await sdk.actions.ready();
          console.log("✅ Farcaster SDK ready!");
          
          // Optional: Get context
          const context = await sdk.context;
          console.log("Farcaster context:", context);
        } catch (error) {
          console.error("Farcaster SDK error:", error);
        }
      }
    };
    init();
  }, []);

  return (
    <html lang="en">
      <head>
        <meta name="base:app_id" content="69c0256cfa9c0ad39d2bcd03" />
        <link rel="manifest" href="/manifest.json" />
        <link rel="icon" href="/favicon.ico" />
        <meta property="og:title" content="XTaskAI - Earn USDC on Base" />
        <meta property="og:description" content="Complete tasks and earn USDC on Base network" />
        <meta property="og:image" content="https://xtaskai-app.vercel.app/icon.png" />
        <meta property="og:type" content="website" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="XTaskAI - Earn USDC on Base" />
        <meta name="twitter:description" content="Complete tasks and earn USDC on Base network" />
        <meta name="twitter:image" content="https://xtaskai-app.vercel.app/icon.png" />
      </head>
      <body className={inter.className}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}