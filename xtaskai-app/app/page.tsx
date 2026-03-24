"use client";

import { useState, useEffect } from "react";
import { useAccount, useConnect, useDisconnect } from "wagmi";

export default function Home() {
  const { address, isConnected } = useAccount();
  const { connect, connectors } = useConnect();
  const { disconnect } = useDisconnect();
  const [stats, setStats] = useState({ users: 0, tasks: 0, earned: 0 });
  const [loading, setLoading] = useState(true);
  const [progress, setProgress] = useState(0);

  // Live Stats
  useEffect(() => {
    fetch("/api/stats")
      .then(res => res.json())
      .then(data => {
        setStats(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  // Loading animation
  useEffect(() => {
    const interval = setInterval(() => {
      setProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval);
          return 100;
        }
        return prev + 1;
      });
    }, 30);
    return () => clearInterval(interval);
  }, []);

  // Auto redirect
  useEffect(() => {
    if (isConnected && address) {
      const urlParams = new URLSearchParams(window.location.search);
      const ref = urlParams.get('ref') || '';
      window.location.href = `https://xtaskai.com/base-mini-app/dashboard.php?wallet=${address}&ref=${ref}`;
    }
  }, [isConnected, address]);

  if (!isConnected) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "linear-gradient(135deg, #0a0f1e, #1a1f2e)" }}>
        <div className="text-center w-[260px] mx-auto px-2">
          {/* Logo */}
          <div className="mb-3">
            <img src="/logo.png" alt="XTaskAI" className="w-12 h-12 mx-auto mb-1 rounded-lg" />
            <h1 className="text-lg font-bold text-white">XTASKAI</h1>
            <p className="text-gray-400 text-[9px] mt-0.5">Complete Tasks • Earn USDC • Base Chain</p>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-3 gap-1.5 mb-4">
            <div className="bg-white/5 rounded-md py-1.5 text-center border border-white/10">
              <div className="text-sm font-bold text-green-400">{loading ? "..." : stats.tasks}</div>
              <div className="text-[8px] text-gray-500">TASKS</div>
            </div>
            <div className="bg-white/5 rounded-md py-1.5 text-center border border-white/10">
              <div className="text-sm font-bold text-blue-400">{loading ? "..." : `$${stats.earned}`}</div>
              <div className="text-[8px] text-gray-500">EARNED</div>
            </div>
            <div className="bg-white/5 rounded-md py-1.5 text-center border border-white/10">
              <div className="text-sm font-bold text-orange-400">{loading ? "..." : stats.users}</div>
              <div className="text-[8px] text-gray-500">USERS</div>
            </div>
          </div>

          {/* Loading Bar */}
          <div className="mb-3">
            <div className="w-full bg-white/10 rounded-full h-0.5 overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-blue-500 to-green-500 rounded-full transition-all duration-100"
                style={{ width: `${progress}%` }}
              ></div>
            </div>
            <p className="text-gray-500 text-[8px] mt-1">INITIALIZING {progress}%</p>
          </div>

          {/* Connect Wallet Button */}
          <button
            onClick={() => connect({ connector: connectors[0] })}
            className="w-full bg-gradient-to-r from-blue-500 to-green-500 text-white font-semibold py-1.5 rounded-md text-xs hover:opacity-90 transition"
          >
            🔌 Connect Wallet
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: "linear-gradient(135deg, #0a0f1e, #1a1f2e)" }}>
      <div className="text-center">
        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-green-500 mx-auto mb-1"></div>
        <p className="text-gray-400 text-[9px]">Redirecting...</p>
      </div>
    </div>
  );
}