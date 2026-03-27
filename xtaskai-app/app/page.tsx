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
        <div className="text-center w-[320px] mx-auto px-4">
          {/* Logo */}
          <div className="mb-6">
            <div className="w-20 h-20 bg-white/20 rounded-2xl mx-auto mb-4 flex items-center justify-center backdrop-blur-sm">
              <span className="text-4xl font-bold text-white">X</span>
            </div>
            <h1 className="text-3xl font-bold text-white">XTASKAI</h1>
            <p className="text-white/70 text-sm mt-1">Complete Tasks • Earn USDC • Base Chain</p>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-3 gap-3 mb-8">
            <div className="bg-gradient-to-br from-green-400 to-green-500 rounded-xl py-3 text-center shadow-lg">
              <div className="text-2xl font-bold text-white">{loading ? "..." : stats.tasks}</div>
              <div className="text-xs text-white/80">TASKS</div>
            </div>
            <div className="bg-gradient-to-br from-blue-400 to-blue-500 rounded-xl py-3 text-center shadow-lg">
              <div className="text-2xl font-bold text-white">{loading ? "..." : `$${stats.earned}`}</div>
              <div className="text-xs text-white/80">EARNED</div>
            </div>
            <div className="bg-gradient-to-br from-orange-400 to-orange-500 rounded-xl py-3 text-center shadow-lg">
              <div className="text-2xl font-bold text-white">{loading ? "..." : stats.users}</div>
              <div className="text-xs text-white/80">USERS</div>
            </div>
          </div>

          {/* Loading Bar */}
          <div className="mb-8">
            <div className="w-full bg-white/30 rounded-full h-2 overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-yellow-400 to-pink-500 rounded-full transition-all duration-100"
                style={{ width: `${progress}%` }}
              ></div>
            </div>
            <p className="text-white/60 text-xs mt-2">INITIALIZING {progress}%</p>
          </div>

          {/* Connect Wallet Button */}
          <button
            onClick={() => connect({ connector: connectors[0] })}
            className="w-full bg-gradient-to-r from-pink-500 to-purple-600 text-white font-bold py-4 rounded-xl text-lg hover:opacity-90 transition shadow-lg"
          >
            🔌 Connect Wallet
          </button>
        </div>
      </div>
    );
  }

  // Connected state - Big Dashboard Button
  return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)" }}>
      <div className="text-center w-[360px] mx-auto px-4">
        {/* Success Animation */}
        <div className="mb-8">
          <div className="w-24 h-24 bg-green-500/20 rounded-full mx-auto mb-6 flex items-center justify-center animate-pulse">
            <svg className="w-12 h-12 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          
          <h2 className="text-2xl font-bold text-white mb-2">Wallet Connected!</h2>
          <p className="text-white/60 text-sm">You're ready to start earning</p>
        </div>
        
        {/* Wallet Address Card */}
        <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-4 mb-8 border border-white/20">
          <p className="text-white/50 text-xs mb-1">Connected Wallet</p>
          <p className="text-white font-mono text-lg font-semibold tracking-wider">
            {address?.slice(0, 8)}...{address?.slice(-6)}
          </p>
        </div>
        
        {/* BIG Dashboard Button */}
        <button
          onClick={goToDashboard}
          className="w-full bg-gradient-to-r from-green-500 to-emerald-600 text-white font-bold py-5 rounded-2xl text-xl hover:scale-[1.02] transition-all duration-200 shadow-xl mb-4"
        >
          🚀  Go to Dashboard  🚀
        </button>
        
        {/* Disconnect Button */}
        <button
          onClick={() => disconnect()}
          className="w-full bg-white/5 text-white/60 font-medium py-3 rounded-xl text-sm hover:bg-white/10 transition-all duration-200"
        >
          Disconnect Wallet
        </button>
      </div>
    </div>
  );
}