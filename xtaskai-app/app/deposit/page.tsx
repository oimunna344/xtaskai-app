"use client";

import { useState, useEffect } from "react";
import { useAccount, useConnect, useDisconnect } from "wagmi";
import { useRouter } from "next/navigation";
import { ethers } from "ethers";
import { depositUSDC, getUserUSDCBalance } from "../lib/contract";

declare global {
  interface Window {
    ethereum: any;
  }
}

export default function DepositPage() {
  const { address, isConnected } = useAccount();
  const { connect, connectors } = useConnect();
  const { disconnect } = useDisconnect();
  const router = useRouter();
  
  const [amount, setAmount] = useState("0.001");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [balance, setBalance] = useState(0);
  const [checkingBalance, setCheckingBalance] = useState(true);

  // Get wallet USDC balance
  useEffect(() => {
    const getBalance = async () => {
      if (!isConnected || !address) {
        setCheckingBalance(false);
        return;
      }
      
      setCheckingBalance(true);
      try {
        const provider = new ethers.providers.Web3Provider(window.ethereum);
        const balanceStr = await getUserUSDCBalance(address, provider);
        console.log("Fetched balance:", balanceStr, "USDC");
        setBalance(parseFloat(balanceStr));
      } catch (e) {
        console.log("Balance fetch failed", e);
        setBalance(0);
      } finally {
        setCheckingBalance(false);
      }
    };
    getBalance();
  }, [isConnected, address]);

  const handleDeposit = async () => {
    if (!isConnected || !address) {
      setError("Please connect wallet first");
      return;
    }

    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount < 0.0001) {
      setError("Amount must be at least 0.0001 USDC");
      return;
    }

    if (numAmount > balance) {
      setError(`Insufficient balance. You have ${balance.toFixed(4)} USDC`);
      return;
    }

    setLoading(true);
    setError("");

    try {
      const provider = new ethers.providers.Web3Provider(window.ethereum);
      const signer = provider.getSigner();
      
      console.log("Starting deposit...");
      const result = await depositUSDC(amount, signer);
      console.log("Deposit result:", result);
      
      if (result.success) {
        alert(`✅ Deposit successful!\nAmount: ${amount} USDC\nTx: ${result.txHash.slice(0, 10)}...`);
        window.location.href = `https://xtaskai.com/base-mini-app/dashboard.php?wallet=${address}&deposit_success=1`;
      } else {
        setError(result.error || "Deposit failed");
      }
    } catch (err: any) {
      console.error("Deposit error:", err);
      setError(err.message || "Transaction failed");
    } finally {
      setLoading(false);
    }
  };

  if (!isConnected) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)" }}>
        <div className="text-center w-[280px] mx-auto px-3">
          <div className="mb-5">
            <h1 className="text-2xl font-bold text-white">XTASKAI</h1>
            <p className="text-white/70 text-xs mt-1">Connect wallet to deposit</p>
          </div>
          <button
            onClick={() => connect({ connector: connectors[0] })}
            className="w-full bg-gradient-to-r from-pink-500 to-purple-600 text-white font-semibold py-2.5 rounded-xl text-sm"
          >
            🔌 Connect Wallet
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)" }}>
      <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 w-full max-w-md mx-4 border border-white/20">
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold text-white">Deposit USDC</h1>
          <p className="text-white/70 text-sm mt-1">Base Network</p>
        </div>

        <div className="bg-black/30 rounded-xl p-3 mb-4">
          <div className="text-xs text-white/50 mb-1">Connected Wallet</div>
          <div className="text-white font-mono text-sm">{address?.slice(0, 8)}...{address?.slice(-6)}</div>
          <div className="flex justify-between mt-2 text-sm">
            <span className="text-white/50">USDC Balance:</span>
            <span className="text-green-400 font-bold">
              {checkingBalance ? "Loading..." : `${balance.toFixed(4)} USDC`}
            </span>
          </div>
        </div>

        <div className="mb-5">
          <label className="block text-white/70 text-sm mb-2">Amount (USDC)</label>
          <input
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            step="0.0001"
            min="0.0001"
            className="w-full bg-black/30 border border-white/20 rounded-xl px-4 py-3 text-white text-lg font-semibold focus:outline-none focus:border-green-500"
          />
          <div className="grid grid-cols-4 gap-2 mt-3">
            {[0.0001, 0.001, 0.01, 0.1].map((val) => (
              <button
                key={val}
                onClick={() => setAmount(val.toString())}
                className="bg-white/10 hover:bg-white/20 rounded-lg py-2 text-sm text-white transition"
              >
                {val}
              </button>
            ))}
          </div>
        </div>

        <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-3 mb-5">
          <div className="text-blue-400 text-xs font-semibold mb-1">💡 Info</div>
          <div className="text-white/60 text-xs">
            • Minimum: 0.0001 USDC<br />
            • Instant approval<br />
            • USDC held in smart contract
          </div>
        </div>

        {error && (
          <div className="bg-red-500/20 border border-red-500 rounded-xl p-3 mb-4">
            <p className="text-red-400 text-sm">{error}</p>
          </div>
        )}

        <button
          onClick={handleDeposit}
          disabled={loading || checkingBalance}
          className="w-full bg-gradient-to-r from-green-500 to-blue-600 text-white font-semibold py-3 rounded-xl hover:opacity-90 transition disabled:opacity-50"
        >
          {loading ? "Processing..." : checkingBalance ? "Loading balance..." : "💎 Deposit USDC"}
        </button>

        <button
          onClick={() => {
            window.location.href = `https://xtaskai.com/base-mini-app/dashboard.php?wallet=${address}`;
          }}
          className="w-full mt-3 bg-white/10 hover:bg-white/20 rounded-xl py-2 text-sm text-white/70 transition"
        >
          ← Back to Dashboard
        </button>
      </div>
    </div>
  );
}