"use client";

import { useState, useEffect } from "react";
import { useAccount, useConnect } from "wagmi";

export default function Home() {
  const { address, isConnected } = useAccount();
  const { connect, connectors } = useConnect();
  const [isFarcaster, setIsFarcaster] = useState(false);

  useEffect(() => {
    // Check if inside Farcaster iframe
    if (window.parent !== window) {
      setIsFarcaster(true);
    }
  }, []);

  useEffect(() => {
    if (isConnected && address) {
      window.location.href = `https://xtaskai.com/base-mini-app/dashboard.php?wallet=${address}`;
    }
  }, [isConnected, address]);

  const handleConnect = () => {
    if (connectors[0]) {
      connect({ connector: connectors[0] });
    }
  };

  return (
    <div style={{ 
      minHeight: "100vh", 
      display: "flex", 
      alignItems: "center", 
      justifyContent: "center",
      background: "#0a0f1e",
      color: "white"
    }}>
      <div style={{ textAlign: "center", padding: "20px" }}>
        <h1 style={{ fontSize: "28px", fontWeight: "bold", marginBottom: "20px" }}>
          XTaskAI
        </h1>
        <p style={{ marginBottom: "30px", opacity: 0.7 }}>
          Earn USDC on Base Chain
        </p>
        {!isConnected && (
          <button
            onClick={handleConnect}
            style={{
              background: "linear-gradient(135deg, #0052ff, #0037b3)",
              color: "white",
              border: "none",
              padding: "14px 28px",
              borderRadius: "12px",
              fontSize: "16px",
              fontWeight: "bold",
              cursor: "pointer"
            }}
          >
            {isFarcaster ? "🔌 Connect Farcaster Wallet" : "🔌 Connect Wallet"}
          </button>
        )}
        {isConnected && (
          <p style={{ marginTop: "20px" }}>Redirecting to Dashboard...</p>
        )}
      </div>
    </div>
  );
}