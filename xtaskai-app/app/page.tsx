"use client";

import { useEffect, useState } from "react";

export default function Home() {
  const [msg, setMsg] = useState("Connecting...");

  useEffect(() => {
    const init = async () => {
      try {
        const { sdk } = await import("@farcaster/frame-sdk");
        
        // Ready call করুন
        await sdk.actions.ready();

        // Wallet address নিন
        const accounts = await sdk.wallet.ethProvider.request({
          method: "eth_requestAccounts"
        }) as string[];

        if (accounts?.[0]) {
          setMsg("✅ Connected! Redirecting...");
          setTimeout(() => {
            window.location.href = `https://xtaskai.com/base-mini-app/dashboard.php?wallet=${accounts[0]}`;
          }, 1000);
        } else {
          setMsg("❌ Please open inside Farcaster.");
        }
      } catch (e) {
        setMsg("❌ Please open inside Farcaster.");
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
      background: "linear-gradient(135deg, #0f0a1e 0%, #1a0a2e 50%, #0d0d1a 100%)",
      color: "white",
      fontFamily: "Arial, sans-serif",
    }}>
      <div style={{ textAlign: "center", padding: "0 24px" }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>⬡</div>
        <h1 style={{ fontSize: "2rem", fontWeight: 800, marginBottom: "0.5rem" }}>XTaskAI</h1>
        <p style={{ color: "#7c3aed", marginBottom: "1.5rem" }}>Earn USDC on Base</p>
        <p style={{ color: "#a78bfa", fontSize: 14 }}>{msg}</p>
      </div>
    </div>
  );
}
