import "./globals.css";
import { Providers } from "./providers";
import FarcasterProvider from "./FarcasterProvider";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <meta name="base:app_id" content="69c0256cfa9c0ad39d2bcd03" />
        <link rel="manifest" href="/manifest.json" />
        <link rel="icon" href="/favicon.ico" />

        <meta property="og:title" content="XTaskAI - Earn USDC on Base" />
        <meta property="og:description" content="Complete tasks and earn USDC" />
        <meta property="og:image" content="https://xtaskai-app.vercel.app/og.png" />
      </head>
      <body>
        <Providers>
          <FarcasterProvider>{children}</FarcasterProvider>
        </Providers>
      </body>
    </html>
  );
}