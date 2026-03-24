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

  // Live Stats from PHP backend
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

  // Auto redirect when wallet connects
  useEffect(() => {
    if (isConnected && address) {
      const urlParams = new URLSearchParams(window.location.search);
      const ref = urlParams.get('ref') || '';
      window.location.href = `https://xtaskai.com/base-mini-app/dashboard.php?wallet=${address}&ref=${ref}`;
    }
  }, [isConnected, address]);

  if (!isConnected) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#0a0f1e] to-[#1a1f2e]">
        <div className="text-center w-full max-w-md mx-auto px-4">
          {/* Logo */}
          <div className="mb-6">
            <img src="/logo.png" alt="XTaskAI" className="w-24 h-24 mx-auto mb-4 rounded-2xl shadow-2xl" />
            <h1 className="text-4xl font-bold bg-gradient-to-r from-white to-blue-400 bg-clip-text text-transparent">
              XTASKAI
            </h1>
            <p className="text-gray-400 text-sm mt-2">Complete Tasks • Earn USDC • Base Chain</p>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-3 gap-4 mb-8">
            <div className="bg-white/5 backdrop-blur-lg rounded-2xl p-4 text-center border border-white/10">
              <div className="text-2xl font-bold text-green-400">{loading ? "..." : stats.tasks}</div>
              <div className="text-xs text-gray-500 mt-1">TASKS</div>
            </div>
            <div className="bg-white/5 backdrop-blur-lg rounded-2xl p-4 text-center border border-white/10">
              <div className="text-2xl font-bold text-blue-400">{loading ? "..." : `$${stats.earned}`}</div>
              <div className="text-xs text-gray-500 mt-1">EARNED</div>
            </div>
            <div className="bg-white/5 backdrop-blur-lg rounded-2xl p-4 text-center border border-white/10">
              <div className="text-2xl font-bold text-orange-400">{loading ? "..." : stats.users}</div>
              <div className="text-xs text-gray-500 mt-1">USERS</div>
            </div>
          </div>

          {/* Loading Bar */}
          <div className="mb-8">
            <div className="w-full bg-white/10 rounded-full h-2 overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-blue-500 to-green-500 rounded-full transition-all duration-100"
                style={{ width: `${progress}%` }}
              ></div>
            </div>
            <p className="text-gray-500 text-xs mt-2">INITIALIZING {progress}%</p>
          </div>

          {/* Enter Button */}
          <button
            onClick={() => connect({ connector: connectors[0] })}
            className="w-full bg-gradient-to-r from-blue-600 to-green-500 text-white font-semibold py-3 rounded-xl hover:opacity-90 transition transform hover:scale-105 duration-200 shadow-lg"
          >
            ENTER PLATFORM
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#0a0f1e] to-[#1a1f2e]">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-500 mx-auto mb-4"></div>
        <p className="text-gray-400">Redirecting to dashboard...</p>
      </div>
    </div>
  );
}