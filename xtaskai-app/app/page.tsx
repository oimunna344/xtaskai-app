"use client";

import { useEffect } from "react";
import { useAccount, useConnect } from "wagmi";
import { injected } from "wagmi/connectors";
import sdk from "@farcaster/frame-sdk";

export default function Home() {
  const { address, isConnected } = useAccount();
  const { connect } = useConnect();

  // Farcaster SDK ready + auto-connect
  useEffect(() => {
    const init = async () => {
      try {
        await sdk.actions.ready();
        // Auto-connect wallet
        if (!isConnected) {
          connect({ connector: injected() });
        }
      } catch (e) {
        console.error("SDK error:", e);
      }
    };
    init();
  }, []);

  // Redirect when connected
  useEffect(() => {
    if (isConnected && address) {
      window.location.href = `https://xtaskai.com/base-mini-app/dashboard.php?wallet=${address}`;
    }
  }, [isConnected, address]);

  return (
    <div style={{
      minHeight: "100vh",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      background: "#0a0f1e",
      color: "white",
      fontFamily: "Arial, sans-serif",
    }}>
      <div style={{ textAlign: "center" }}>
        <h1 style={{ fontSize: "2rem", marginBottom: "0.5rem" }}>XTaskAI</h1>
        <p style={{ color: "#888", marginBottom: "2rem" }}>Earn USDC on Base</p>
        {isConnected
          ? <p style={{ color: "#4ade80" }}>✅ Redirecting...</p>
          : <p style={{ color: "#888" }}>Connecting wallet...</p>
        }
      </div>
    </div>
  );
}
