"use client";

import { useEffect, useState } from "react";
import sdk from "@farcaster/frame-sdk";

export default function Home() {
  const [msg, setMsg] = useState("Verifying identity...");

  useEffect(() => {
    const init = async () => {
      try {
        // First call ready(), then get context
        await sdk.actions.ready();
        const context = await sdk.context;

        if (context?.user?.fid) {
          setMsg("✅ Verified! Redirecting...");
          window.location.href = `https://xtaskai.com/base-mini-app/dashboard.php?fid=${context.user.fid}&username=${encodeURIComponent(context.user.username ?? "")}&wallet=${context.user.fid}`;
        } else {
          // No FID — try wallet
          try {
            const accounts = await sdk.wallet.ethProvider.request({
              method: "eth_requestAccounts"
            }) as string[];
            if (accounts?.[0]) {
              setMsg("✅ Wallet connected! Redirecting...");
              window.location.href = `https://xtaskai.com/base-mini-app/dashboard.php?wallet=${accounts[0]}`;
            } else {
              setMsg("Please open inside Farcaster.");
            }
          } catch (e) {
            setMsg("Please open inside Farcaster.");
          }
        }
      } catch (e) {
        setMsg("Please open inside Farcaster.");
      }
    };
    init();
  }, []);

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
        <h1 style={{ fontSize: "2rem", fontWeight: 800, marginBottom: "0.5rem" }}>XTaskAI</h1>
        <p style={{ color: "#6b7280", marginBottom: "1.5rem" }}>Earn USDC on Base</p>
        <p style={{ color: "#a78bfa" }}>{msg}</p>
      </div>
    </div>
  );
}
