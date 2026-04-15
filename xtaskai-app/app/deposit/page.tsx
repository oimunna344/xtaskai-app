"use client";

import { useState, useEffect } from "react";
import { useAccount, useConnect, useWriteContract, useReadContract } from "wagmi";
import { parseUnits } from "viem";
import { farcasterFrame } from "@farcaster/frame-wagmi-connector";
import { injected } from "wagmi/connectors";

const CONTRACT_ADDRESS = "0x0f50aD6a61434CbE672Ec50009ED3EC0181731b0";
const USDC_ADDRESS = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913";

const USDC_ABI = [
  {
    type: "function", name: "approve",
    inputs: [{ name: "spender", type: "address" }, { name: "amount", type: "uint256" }],
    outputs: [{ type: "bool" }], stateMutability: "nonpayable"
  },
  {
    type: "function", name: "balanceOf",
    inputs: [{ name: "account", type: "address" }],
    outputs: [{ type: "uint256" }], stateMutability: "view"
  },
  {
    type: "function", name: "allowance",
    inputs: [{ name: "owner", type: "address" }, { name: "spender", type: "address" }],
    outputs: [{ type: "uint256" }], stateMutability: "view"
  }
] as const;

const CONTRACT_ABI = [
  {
    type: "function", name: "deposit",
    inputs: [{ name: "amount", type: "uint256" }],
    outputs: [], stateMutability: "nonpayable"
  }
] as const;

export default function DepositPage() {
  const { address, isConnected } = useAccount();
  const { connect } = useConnect();

  const [amount, setAmount] = useState("0.001");
  const [error, setError] = useState("");
  const [balance, setBalance] = useState<number | null>(null);
  const [needsApproval, setNeedsApproval] = useState(false);

  const { writeContract: writeApprove, isPending: isApprovePending } = useWriteContract();
  const { writeContract: writeDeposit, isPending: isDepositPending } = useWriteContract();

  const { data: usdcBalance, refetch: refetchBalance } = useReadContract({
    address: USDC_ADDRESS,
    abi: USDC_ABI,
    functionName: "balanceOf",
    args: address ? [address] : undefined,
    query: { enabled: !!address },
  });

  const { data: allowance, refetch: refetchAllowance } = useReadContract({
    address: USDC_ADDRESS,
    abi: USDC_ABI,
    functionName: "allowance",
    args: address ? [address, CONTRACT_ADDRESS] : undefined,
    query: { enabled: !!address },
  });

  // Auto-connect Farcaster wallet when inside Farcaster
  useEffect(() => {
    if (!isConnected && window.parent !== window) {
      connect({ connector: farcasterFrame() });
    }
  }, [isConnected, connect]);

  useEffect(() => {
    if (usdcBalance !== undefined) {
      setBalance(Number(usdcBalance) / 1e6);
    }
  }, [usdcBalance]);

  useEffect(() => {
    if (amount && allowance !== undefined) {
      const amountInWei = parseUnits(amount, 6);
      setNeedsApproval(allowance < amountInWei);
    }
  }, [amount, allowance]);

  const handleApprove = () => {
    if (!amount) return;
    const amountInWei = parseUnits(amount, 6);
    writeApprove({
      address: USDC_ADDRESS,
      abi: USDC_ABI,
      functionName: "approve",
      args: [CONTRACT_ADDRESS, amountInWei],
    }, {
      onSuccess: () => setTimeout(() => refetchAllowance(), 3000),
      onError: (err) => setError(err.message || "Approval failed"),
    });
  };

  const handleDeposit = () => {
    if (!isConnected || !address) { setError("Connect wallet first"); return; }
    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) { setError("Enter valid amount"); return; }
    if (balance === null || numAmount > balance) {
      setError(`Insufficient balance. You have ${balance?.toFixed(4) || "0"} USDC`);
      return;
    }
    setError("");
    const amountInWei = parseUnits(amount, 6);
    writeDeposit({
      address: CONTRACT_ADDRESS,
      abi: CONTRACT_ABI,
      functionName: "deposit",
      args: [amountInWei],
    }, {
      onSuccess: async (hash) => {
        try {
          await fetch("https://xtaskai.com/base-mini-app/api/update_balance.php", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ wallet: address, amount: parseFloat(amount), tx_hash: hash }),
          });
        } catch (e) {
          console.log("API error but deposit successful:", e);
        }
        alert(`✅ Deposit successful! ${amount} USDC added`);
        refetchBalance();
        window.location.href = `https://xtaskai.com/base-mini-app/dashboard.php?wallet=${address}&tx=${hash}`;
      },
      onError: (err) => {
        setError(err.message?.includes("user rejected") ? "Transaction cancelled" : err.message || "Transaction failed");
      },
    });
  };

  // Not connected — show connect options
  if (!isConnected) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-600 to-pink-500">
        <div className="text-center px-6">
          <h1 className="text-3xl font-bold text-white mb-8">XTASKAI</h1>
          <button
            onClick={() => connect({ connector: farcasterFrame() })}
            className="bg-white text-purple-600 px-8 py-3 rounded-full font-semibold hover:shadow-lg transition mb-3 w-full block"
          >
            🟣 Connect Farcaster Wallet
          </button>
          <button
            onClick={() => connect({ connector: injected() })}
            className="bg-white/20 text-white px-8 py-3 rounded-full font-semibold hover:shadow-lg transition w-full block"
          >
            🦊 Connect MetaMask
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-600 to-pink-500">
      <div className="bg-white/20 backdrop-blur-lg rounded-2xl p-8 w-96">
        <h1 className="text-2xl font-bold text-white text-center mb-6">Deposit USDC</h1>

        <div className="bg-black/30 rounded-xl p-4 mb-6">
          <div className="text-white/70 text-sm">Connected Wallet</div>
          <div className="text-white font-mono text-sm">{address?.slice(0, 8)}...{address?.slice(-6)}</div>
          <div className="flex justify-between mt-3">
            <span className="text-white/70">USDC Balance:</span>
            <span className="text-green-400 font-bold">
              {balance !== null ? `${balance.toFixed(4)} USDC` : "Loading..."}
            </span>
          </div>
        </div>

        <div className="mb-6">
          <label className="block text-white mb-2">Amount (USDC)</label>
          <input
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            step="0.0001"
            min="0.0001"
            className="w-full bg-black/30 border border-white/20 rounded-xl px-4 py-3 text-white text-lg"
          />
          <div className="grid grid-cols-4 gap-2 mt-3">
            {[0.0001, 0.001, 0.01, 0.1].map((v) => (
              <button
                key={v}
                onClick={() => setAmount(v.toString())}
                className="bg-white/10 hover:bg-white/20 rounded-lg py-2 text-sm text-white transition"
              >
                {v}
              </button>
            ))}
          </div>
        </div>

        {error && (
          <div className="bg-red-500/20 border border-red-500 rounded-xl p-3 mb-4">
            <p className="text-red-400 text-sm">{error}</p>
          </div>
        )}

        {needsApproval && (
          <button
            onClick={handleApprove}
            disabled={isApprovePending}
            className="w-full bg-yellow-500 text-white font-bold py-3 rounded-xl disabled:opacity-50 hover:opacity-90 transition mb-3"
          >
            {isApprovePending ? "Approving..." : "🔓 Approve USDC"}
          </button>
        )}

        <button
          onClick={handleDeposit}
          disabled={isDepositPending || balance === null || needsApproval}
          className="w-full bg-gradient-to-r from-green-500 to-blue-500 text-white font-bold py-3 rounded-xl disabled:opacity-50 hover:opacity-90 transition"
        >
          {isDepositPending ? "Processing..." : "💎 Deposit USDC"}
        </button>

        <button
          onClick={() => window.location.href = `https://xtaskai.com/base-mini-app/dashboard.php?wallet=${address}`}
          className="w-full mt-3 bg-white/10 hover:bg-white/20 rounded-xl py-2 text-sm text-white transition"
        >
          ← Back
        </button>
      </div>
    </div>
  );
}
