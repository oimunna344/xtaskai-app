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

  // Go to Dashboard
  const goToDashboard = () => {
    if (address) {
      const urlParams = new URLSearchParams(window.location.search);
      const ref = urlParams.get('ref') || '';
      window.location.href = `https://xtaskai.com/base-mini-app/dashboard.php?wallet=${address}&ref=${ref}`;
    }
  };

  if (!isConnected) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)" }}>
        <div className="text-center w-[280px] mx-auto px-3">
          {/* Logo */}
          <div className="mb-5">
            <div className="w-16 h-16 bg-white/20 rounded-2xl mx-auto mb-3 flex items-center justify-center backdrop-blur-sm">
              <span className="text-3xl font-bold text-white">X</span>
            </div>
            <h1 className="text-2xl font-bold text-white">XTASKAI</h1>
            <p className="text-white/70 text-xs mt-1">Complete Tasks • Earn USDC • Base Chain</p>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-3 gap-2 mb-6">
            <div className="bg-gradient-to-br from-green-400 to-green-500 rounded-xl py-2.5 text-center shadow-lg">
              <div className="text-xl font-bold text-white">{loading ? "..." : stats.tasks}</div>
              <div className="text-[10px] text-white/80">TASKS</div>
            </div>
            <div className="bg-gradient-to-br from-blue-400 to-blue-500 rounded-xl py-2.5 text-center shadow-lg">
              <div className="text-xl font-bold text-white">{loading ? "..." : `$${stats.earned}`}</div>
              <div className="text-[10px] text-white/80">EARNED</div>
            </div>
            <div className="bg-gradient-to-br from-orange-400 to-orange-500 rounded-xl py-2.5 text-center shadow-lg">
              <div className="text-xl font-bold text-white">{loading ? "..." : stats.users}</div>
              <div className="text-[10px] text-white/80">USERS</div>
            </div>
          </div>

          {/* Loading Bar */}
          <div className="mb-5">
            <div className="w-full bg-white/30 rounded-full h-1.5 overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-yellow-400 to-pink-500 rounded-full transition-all duration-100"
                style={{ width: `${progress}%` }}
              ></div>
            </div>
            <p className="text-white/60 text-[10px] mt-1">INITIALIZING {progress}%</p>
          </div>

          {/* Connect Wallet Button */}
          <button
            onClick={() => connect({ connector: connectors[0] })}
            className="w-full bg-gradient-to-r from-pink-500 to-purple-600 text-white font-semibold py-2.5 rounded-xl text-sm hover:opacity-90 transition shadow-lg"
          >
            🔌 Connect Wallet
          </button>
        </div>
      </div>
    );
  }

  // Connected state - Show Dashboard Button (No Auto Redirect)
  return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)" }}>
      <div className="text-center w-[320px] mx-auto px-4">
        {/* Success Icon */}
        <div className="w-20 h-20 bg-green-500/20 rounded-full mx-auto mb-6 flex items-center justify-center">
          <svg className="w-10 h-10 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        
        {/* Wallet Address */}
        <div className="bg-white/10 backdrop-blur-sm rounded-xl p-3 mb-6">
          <p className="text-white/60 text-xs mb-1">Connected Wallet</p>
          <p className="text-white font-mono text-sm">{address?.slice(0, 8)}...{address?.slice(-6)}</p>
        </div>
        
        {/* Go to Dashboard Button */}
        <button
          onClick={goToDashboard}
          className="w-full bg-gradient-to-r from-green-500 to-blue-500 text-white font-semibold py-3 rounded-xl text-base hover:opacity-90 transition shadow-lg mb-3"
        >
          🚀 Go to Dashboard
        </button>
        
        {/* Disconnect Button */}
        <button
          onClick={() => disconnect()}
          className="w-full bg-white/10 text-white/70 font-semibold py-2 rounded-xl text-sm hover:bg-white/20 transition"
        >
          Disconnect Wallet
        </button>
      </div>
    </div>
  );
}