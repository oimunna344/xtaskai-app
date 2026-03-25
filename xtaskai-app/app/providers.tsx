"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { WagmiProvider, createConfig, http } from "wagmi";
import { base } from "wagmi/chains";
import { injected, baseAccount } from "wagmi/connectors";
import { Attribution } from "ox/erc8021";  // 🆕 Builder code এর জন্য

const queryClient = new QueryClient();

// 🆕 Builder Code যোগ করা
const DATA_SUFFIX = Attribution.toDataSuffix({
  codes: ["bc_08dcvsfy"]  // তোমার Builder Code
});

const config = createConfig({
  chains: [base],
  connectors: [injected(), baseAccount({ appName: "XTaskAI" })],
  transports: {
    [base.id]: http("https://mainnet.base.org"),
  },
  dataSuffix: DATA_SUFFIX,  // 🆕 এটা যোগ করলেই সব ট্রানজেকশনে Builder Code যাবে
  ssr: false,
});

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </WagmiProvider>
  );
}