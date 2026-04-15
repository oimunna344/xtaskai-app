"use client";

import { useEffect } from "react";
import sdk from "@farcaster/frame-sdk";
import { useConnect, useAccount } from "wagmi";
import { injected } from "wagmi/connectors";

export default function FarcasterProvider({ children }: any) {
  const { connect } = useConnect();
  const { isConnected } = useAccount();

  useEffect(() => {
    const init = async () => {
      if (window.parent !== window) {
        try {
          await sdk.actions.ready();
          console.log("✅ Farcaster ready");

          // Farcaster-এ injected wallet auto-connect করে
          if (!isConnected) {
            connect({ connector: injected() });
          }
        } catch (e) {
          console.error("Farcaster error:", e);
        }
      }
    };
    init();
  }, []);

  return children;
}
