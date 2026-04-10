"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { WagmiProvider, createConfig, http } from "wagmi";
import { base } from "wagmi/chains";
import { injected } from "wagmi/connectors";
import { Attribution } from "ox/erc8021";

const queryClient = new QueryClient();

// Builder Code
const DATA_SUFFIX = Attribution.toDataSuffix({
  codes: ["bc_08dcvsfy"]
});

const config = createConfig({
  chains: [base],
  connectors: [injected()],  // শুধু injected (MetaMask)
  transports: {
    [base.id]: http("https://mainnet.base.org"),
  },
  dataSuffix: DATA_SUFFIX,
  ssr: false,
});

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </WagmiProvider>
  );
}