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
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="text-center w-full max-w-md mx-auto px-4">
          {/* Logo */}
          <div className="mb-8">
            <div className="w-20 h-20 mx-auto mb-4 bg-gradient-to-r from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center shadow-lg">
              <span className="text-3xl font-bold text-white">X</span>
            </div>
            <h1 className="text-3xl font-bold text-gray-800">XTASKAI</h1>
            <p className="text-gray-600 text-sm mt-2">Complete Tasks • Earn USDC • Base Chain</p>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-3 gap-3 mb-8">
            <div className="bg-gradient-to-br from-green-400 to-green-500 rounded-xl p-3 text-center shadow-lg">
              <div className="text-2xl font-bold text-white">{loading ? "..." : stats.tasks}</div>
              <div className="text-[10px] text-white/80 mt-1">TASKS</div>
            </div>
            <div className="bg-gradient-to-br from-blue-400 to-blue-500 rounded-xl p-3 text-center shadow-lg">
              <div className="text-2xl font-bold text-white">{loading ? "..." : `$${stats.earned}`}</div>
              <div className="text-[10px] text-white/80 mt-1">EARNED</div>
            </div>
            <div className="bg-gradient-to-br from-orange-400 to-orange-500 rounded-xl p-3 text-center shadow-lg">
              <div className="text-2xl font-bold text-white">{loading ? "..." : stats.users}</div>
              <div className="text-[10px] text-white/80 mt-1">USERS</div>
            </div>
          </div>

          {/* Loading Bar */}
          <div className="mb-6">
            <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-green-400 to-blue-500 rounded-full transition-all duration-100"
                style={{ width: `${progress}%` }}
              ></div>
            </div>
            <p className="text-gray-500 text-xs mt-2">INITIALIZING {progress}%</p>
          </div>

          {/* Enter Button */}
          <button
            onClick={() => connect({ connector: connectors[0] })}
            className="w-full bg-gradient-to-r from-blue-500 to-purple-600 text-white font-semibold py-3 rounded-xl hover:opacity-90 transition shadow-lg"
          >
            ENTER PLATFORM
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="text-center">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-500 mx-auto mb-3"></div>
        <p className="text-gray-600 text-sm">Redirecting to dashboard...</p>
      </div>
    </div>
  );
}