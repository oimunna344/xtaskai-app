"use client";

import { useEffect } from "react";
import sdk from "@farcaster/frame-sdk";

export default function Home() {
  useEffect(() => {
    const init = async () => {
      try {
        const context = await sdk.context;
        await sdk.actions.ready();

        if (context?.user?.fid) {
          // Farcaster user পেয়েছি — সরাসরি redirect
          window.location.href = `https://xtaskai.com/base-mini-app/dashboard.php?fid=${context.user.fid}&username=${encodeURIComponent(context.user.username ?? "")}`;
        } else {
          // Browser-এ খুললে wallet connect দেখাবে
          document.getElementById("msg")!.innerText = "Please open inside Farcaster.";
        }
      } catch (e) {
        document.getElementById("msg")!.innerText = "Please open inside Farcaster.";
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
        <h1 style={{ fontSize: "2rem", marginBottom: "0.5rem" }}>XTaskAI</h1>
        <p style={{ color: "#888", marginBottom: "2rem" }}>Earn USDC on Base</p>
        <p id="msg" style={{ color: "#888" }}>Verifying identity...</p>
      </div>
    </div>
  );
}
