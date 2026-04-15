"use client";

import { useState, useEffect } from "react";
import { useAccount, useConnect } from "wagmi";
import { injected } from "wagmi/connectors";
import sdk from "@farcaster/frame-sdk";

export default function Home() {
  const { address, isConnected } = useAccount();
  const { connect } = useConnect();
  const [stats, setStats] = useState({ users: 0, tasks: 0, earned: 0 });
  const [loading, setLoading] = useState(true);
  const [progress, setProgress] = useState(0);
  const [isInFarcaster, setIsInFarcaster] = useState(false);

  // Live Stats
  useEffect(() => {
    fetch("/api/stats")
      .then(res => res.json())
      .then(data => { setStats(data); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  // Loading animation
  useEffect(() => {
    const interval = setInterval(() => {
      setProgress(prev => {
        if (prev >= 100) { clearInterval(interval); return 100; }
        return prev + 1;
      });
    }, 30);
    return () => clearInterval(interval);
  }, []);

  // Farcaster detect + auto wallet
  useEffect(() => {
    const init = async () => {
      try {
        await sdk.actions.ready();
        setIsInFarcaster(true);

        // Farcaster wallet address নিন
        const accounts = await sdk.wallet.ethProvider.request({
          method: "eth_requestAccounts"
        }) as string[];

        if (accounts?.[0]) {
          const urlParams = new URLSearchParams(window.location.search);
          const ref = urlParams.get("ref") || "";
          window.location.href = `https://xtaskai.com/base-mini-app/dashboard.php?wallet=${accounts[0]}&ref=${ref}`;
        }
      } catch (e) {
        // Browser-এ খুললে Farcaster SDK কাজ করবে না — normal
        setIsInFarcaster(false);
      }
    };
    init();
  }, []);

  // wagmi connect হলে redirect
  useEffect(() => {
    if (isConnected && address) {
      const urlParams = new URLSearchParams(window.location.search);
      const ref = urlParams.get("ref") || "";
      window.location.href = `https://xtaskai.com/base-mini-app/dashboard.php?wallet=${address}&ref=${ref}`;
    }
  }, [isConnected, address]);

  if (!isConnected) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)" }}>
        <div className="text-center w-[280px] mx-auto px-3">
          <div className="mb-5">
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
              />
            </div>
            <p className="text-white/60 text-[10px] mt-1">INITIALIZING {progress}%</p>
          </div>

          {/* Farcaster-এ থাকলে connecting দেখাবে, browser-এ থাকলে connect button */}
          {isInFarcaster ? (
            <div className="w-full bg-white/10 rounded-xl py-2.5 text-center">
              <p className="text-white/70 text-sm">Connecting wallet...</p>
            </div>
          ) : (
            <button
              onClick={() => connect({ connector: injected() })}
              className="w-full bg-gradient-to-r from-pink-500 to-purple-600 text-white font-semibold py-2.5 rounded-xl text-sm hover:opacity-90 transition shadow-lg"
            >
              🔌 Connect Wallet
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)" }}>
      <div className="text-center">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white mx-auto mb-2" />
        <p className="text-white/70 text-xs">Redirecting...</p>
      </div>
    </div>
  );
}
