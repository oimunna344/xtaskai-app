"use client";

import { useState, useEffect } from "react";
import { useAccount, useConnect } from "wagmi";

export default function Home() {
  const { address, isConnected } = useAccount();
  const { connect, connectors } = useConnect();

  const [isFarcaster, setIsFarcaster] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined" && window.parent !== window) {
      setIsFarcaster(true);
    }
  }, []);

  useEffect(() => {
    if (isConnected && address) {
      const url = `https://xtaskai.com/base-mini-app/dashboard.php?wallet=${address}`;

      if (isFarcaster) {
        window.open(url, "_blank");
      } else {
        window.location.href = url;
      }
    }
  }, [isConnected, address, isFarcaster]);

  const handleConnect = () => {
    if (isFarcaster) {
      alert("Farcaster wallet auto ব্যবহার হবে");
      return;
    }

    if (connectors && connectors.length > 0) {
      connect({ connector: connectors[0] });
    } else {
      alert("No wallet found");
    }
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#0a0f1e",
        color: "white",
      }}
    >
      <div style={{ textAlign: "center" }}>
        <h1>XTaskAI</h1>
        <p>Earn USDC on Base</p>

        {!isConnected && (
          <button onClick={handleConnect}>
            {isFarcaster ? "Use Farcaster Wallet" : "Connect Wallet"}
          </button>
        )}

        {isConnected && <p>Redirecting...</p>}
      </div>
    </div>
  );
}