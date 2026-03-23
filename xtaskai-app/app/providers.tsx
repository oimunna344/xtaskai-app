"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { WagmiProvider, createConfig, http } from "wagmi";
import { base } from "wagmi/chains";
import { injected, baseAccount } from "wagmi/connectors";

const queryClient = new QueryClient();

const config = createConfig({
  chains: [base],
  connectors: [injected(), baseAccount({ appName: "XTaskAI" })],
  transports: {
    [base.id]: http("https://mainnet.base.org"),
  },
  ssr: false,
});

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </WagmiProvider>
  );
}