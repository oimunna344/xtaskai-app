"use client";

import { useEffect } from "react";
import sdk from "@farcaster/frame-sdk";
import { useConnect } from "wagmi";
import { injected } from "wagmi/connectors";

export default function FarcasterProvider({ children }: any) {
  const { connect } = useConnect();

  useEffect(() => {
    const init = async () => {
      try {
        const context = await sdk.context;
        await sdk.actions.ready();

        if (context?.user?.fid) {
          connect({ connector: injected() });
        }
      } catch (e) {
        console.error("Farcaster error:", e);
      }
    };
    init();
  }, []);

  return children;
}
