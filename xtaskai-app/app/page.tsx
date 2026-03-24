"use client";

import { useState, useEffect } from "react";
import { useAccount, useConnect, useDisconnect } from "wagmi";

export default function Home() {
  const { address, isConnected } = useAccount();
  const { connect, connectors } = useConnect();
  const { disconnect } = useDisconnect();
  const [stats, setStats] = useState({ users: 0, tasks: 0, earned: 0 });
  const [loading, setLoading] = useState(true);

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
        <div className="bg-white/5 backdrop-blur-lg rounded-2xl p-8 w-full max-w-md border border-white/10">
          <h1 className="text-3xl font-bold text-center mb-2 bg-gradient-to-r from-white to-blue-400 bg-clip-text text-transparent">
            XTaskAI
          </h1>
          <p className="text-center text-gray-400 mb-8">
            Connect your wallet to start earning
          </p>
          
          {/* Live Stats */}
          <div className="grid grid-cols-3 gap-3 mb-6 text-center">
            <div className="bg-black/30 rounded-lg p-2">
              <div className="text-xl font-bold text-green-400">
                {loading ? "..." : stats.tasks}
              </div>
              <div className="text-xs text-gray-500">Tasks</div>
            </div>
            <div className="bg-black/30 rounded-lg p-2">
              <div className="text-xl font-bold text-blue-400">
                {loading ? "..." : `$${stats.earned}`}
              </div>
              <div className="text-xs text-gray-500">Earned</div>
            </div>
            <div className="bg-black/30 rounded-lg p-2">
              <div className="text-xl font-bold text-orange-400">
                {loading ? "..." : stats.users}
              </div>
              <div className="text-xs text-gray-500">Users</div>
            </div>
          </div>
          
          <button
            onClick={() => connect({ connector: connectors[0] })}
            className="w-full bg-gradient-to-r from-blue-600 to-green-500 text-white font-semibold py-3 rounded-xl hover:opacity-90 transition"
          >
            🔌 Connect Wallet
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