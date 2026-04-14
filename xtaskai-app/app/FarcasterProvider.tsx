"use client";

import { useEffect } from "react";
import sdk from "@farcaster/frame-sdk";

export default function FarcasterProvider({ children }: any) {
  useEffect(() => {
    const init = async () => {
      if (window.parent !== window) {
        try {
          await sdk.actions.ready();
          console.log("✅ Farcaster ready");
        } catch (e) {
          console.error("Farcaster error:", e);
        }
      }
    };
    init();
  }, []);

  return children;
}