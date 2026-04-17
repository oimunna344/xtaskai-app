"use client";

import dynamic from "next/dynamic";

const NeynarScoreContent = dynamic(
  () => import("./NeynarScoreContent"),
  {
    ssr: false,
    loading: () => (
      <div style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "linear-gradient(135deg, #0f0a1e 0%, #1a0a2e 50%, #0d0d1a 100%)",
        fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
      }}>
        <div style={{
          background: "rgba(255,255,255,0.04)",
          backdropFilter: "blur(20px)",
          borderRadius: 24,
          padding: 40,
          textAlign: "center",
          border: "1px solid rgba(124,58,237,0.2)",
        }}>
          <div style={{ fontSize: 48, color: "#7c3aed", marginBottom: 16 }}>⬡</div>
          <p style={{ color: "#a78bfa", margin: 0 }}>Loading...</p>
        </div>
      </div>
    ),
  }
);

export default function NeynarScorePage() {
  return <NeynarScoreContent />;
}