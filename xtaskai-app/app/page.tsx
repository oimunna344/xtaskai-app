"use client";

import { useState } from "react";
import { useAccount, useConnect, useDisconnect } from "wagmi";

export default function Home() {
  const { address, isConnected } = useAccount();
  const { connect, connectors } = useConnect();
  const { disconnect } = useDisconnect();
  const [referralCode, setReferralCode] = useState("");

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
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#0a0f1e] to-[#1a1f2e] p-4">
      <div className="bg-white/5 backdrop-blur-lg rounded-2xl p-8 w-full max-w-md border border-white/10">
        <h1 className="text-2xl font-bold text-center mb-6 text-white">
          Welcome {address?.slice(0, 6)}...{address?.slice(-4)}
        </h1>

        <div className="mb-4">
          <label className="block text-gray-400 text-sm mb-2">
            Referral Code (Optional)
          </label>
          <input
            type="text"
            value={referralCode}
            onChange={(e) => setReferralCode(e.target.value.toUpperCase())}
            placeholder="REFXXXXXX"
            className="w-full bg-black/30 border border-white/10 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-green-500"
          />
          <p className="text-xs text-gray-500 mt-2">
            Enter referral code to get 100 XTP bonus!
          </p>
        </div>

        <button
          onClick={() => {
            // Correct redirect – Dashboard (PHP)
            window.location.href = `https://xtaskai.com/base-mini-app/dashboard.php?wallet=${address}&ref=${referralCode}`;
          }}
          className="w-full bg-gradient-to-r from-green-600 to-blue-500 text-white font-semibold py-3 rounded-xl hover:opacity-90 transition"
        >
          Continue to Dashboard
        </button>

        <button
          onClick={() => disconnect()}
          className="w-full mt-3 bg-transparent border border-gray-600 text-gray-400 font-semibold py-2 rounded-xl hover:bg-white/5 transition"
        >
          Disconnect Wallet
        </button>
      </div>
    </div>
  );
}