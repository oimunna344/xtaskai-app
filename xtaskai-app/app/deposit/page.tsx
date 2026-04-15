"use client";

import { useState, useEffect } from "react";
import sdk from "@farcaster/frame-sdk";
import { createPublicClient, createWalletClient, custom, parseUnits, http } from "viem";
import { base } from "viem/chains";

const CONTRACT_ADDRESS = "0x0f50aD6a61434CbE672Ec50009ED3EC0181731b0" as `0x${string}`;
const USDC_ADDRESS = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913" as `0x${string}`;

const USDC_ABI = [
  { type: "function", name: "approve", inputs: [{ name: "spender", type: "address" }, { name: "amount", type: "uint256" }], outputs: [{ type: "bool" }], stateMutability: "nonpayable" },
  { type: "function", name: "balanceOf", inputs: [{ name: "account", type: "address" }], outputs: [{ type: "uint256" }], stateMutability: "view" },
  { type: "function", name: "allowance", inputs: [{ name: "owner", type: "address" }, { name: "spender", type: "address" }], outputs: [{ type: "uint256" }], stateMutability: "view" },
] as const;

const CONTRACT_ABI = [
  { type: "function", name: "deposit", inputs: [{ name: "amount", type: "uint256" }], outputs: [], stateMutability: "nonpayable" },
] as const;

export default function DepositPage() {
  const [amount, setAmount] = useState("0.001");
  const [address, setAddress] = useState<`0x${string}` | null>(null);
  const [balance, setBalance] = useState<number | null>(null);
  const [needsApproval, setNeedsApproval] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [isPending, setIsPending] = useState(false);

  const publicClient = createPublicClient({
    chain: base,
    transport: http("https://mainnet.base.org"),
  });

  // Init Farcaster SDK + get wallet address
  useEffect(() => {
    const init = async () => {
      try {
        await sdk.actions.ready();
        const provider = sdk.wallet.ethProvider;
        const accounts = await provider.request({ method: "eth_requestAccounts" }) as string[];
        if (accounts?.[0]) {
          setAddress(accounts[0] as `0x${string}`);
        }
      } catch (e) {
        setError("Could not connect wallet. Open inside Farcaster.");
      } finally {
        setLoading(false);
      }
    };
    init();
  }, []);

  // Load balance
  useEffect(() => {
    if (!address) return;
    const loadBalance = async () => {
      try {
        const bal = await publicClient.readContract({
          address: USDC_ADDRESS, abi: USDC_ABI,
          functionName: "balanceOf", args: [address],
        });
        setBalance(Number(bal) / 1e6);
      } catch (e) { console.error(e); }
    };
    loadBalance();
  }, [address]);

  // Check allowance
  useEffect(() => {
    if (!address || !amount) return;
    const checkAllowance = async () => {
      try {
        const allowance = await publicClient.readContract({
          address: USDC_ADDRESS, abi: USDC_ABI,
          functionName: "allowance", args: [address, CONTRACT_ADDRESS],
        });
        const amountInWei = parseUnits(amount, 6);
        setNeedsApproval(allowance < amountInWei);
      } catch (e) { console.error(e); }
    };
    checkAllowance();
  }, [address, amount]);

  const getWalletClient = () => {
    return createWalletClient({
      chain: base,
      transport: custom(sdk.wallet.ethProvider),
    });
  };

  const handleApprove = async () => {
    if (!address) return;
    setIsPending(true);
    setError("");
    try {
      const walletClient = getWalletClient();
      const amountInWei = parseUnits(amount, 6);
      await walletClient.writeContract({
        address: USDC_ADDRESS, abi: USDC_ABI,
        functionName: "approve", args: [CONTRACT_ADDRESS, amountInWei],
        account: address,
      });
      setTimeout(async () => {
        const allowance = await publicClient.readContract({
          address: USDC_ADDRESS, abi: USDC_ABI,
          functionName: "allowance", args: [address, CONTRACT_ADDRESS],
        });
        setNeedsApproval(allowance < parseUnits(amount, 6));
        setIsPending(false);
      }, 3000);
    } catch (e: any) {
      setError(e.message || "Approval failed");
      setIsPending(false);
    }
  };

  const handleDeposit = async () => {
    if (!address) return;
    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) { setError("Enter valid amount"); return; }
    if (balance === null || numAmount > balance) { setError(`Insufficient balance. You have ${balance?.toFixed(4) || "0"} USDC`); return; }

    setIsPending(true);
    setError("");
    try {
      const walletClient = getWalletClient();
      const amountInWei = parseUnits(amount, 6);
      const hash = await walletClient.writeContract({
        address: CONTRACT_ADDRESS, abi: CONTRACT_ABI,
        functionName: "deposit", args: [amountInWei],
        account: address,
      });

      try {
        await fetch("https://xtaskai.com/base-mini-app/api/update_balance.php", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ wallet: address, amount: parseFloat(amount), tx_hash: hash }),
        });
      } catch (e) { console.log("API error:", e); }

      alert(`✅ Deposit successful! ${amount} USDC added`);
      window.location.href = `https://xtaskai.com/base-mini-app/dashboard.php?wallet=${address}&tx=${hash}`;
    } catch (e: any) {
      setError(e.message?.includes("rejected") ? "Transaction cancelled" : e.message || "Transaction failed");
      setIsPending(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-600 to-pink-500">
        <p className="text-white text-lg">Connecting wallet...</p>
      </div>
    );
  }

  if (!address) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-600 to-pink-500">
        <div className="text-center px-6">
          <h1 className="text-3xl font-bold text-white mb-4">XTASKAI</h1>
          <p className="text-white/70">{error || "Please open inside Farcaster."}</p>
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
            disabled={isPending}
            className="w-full bg-yellow-500 text-white font-bold py-3 rounded-xl disabled:opacity-50 hover:opacity-90 transition mb-3"
          >
            {isPending ? "Approving..." : "🔓 Approve USDC"}
          </button>
        )}

        <button
          onClick={handleDeposit}
          disabled={isPending || balance === null || needsApproval}
          className="w-full bg-gradient-to-r from-green-500 to-blue-500 text-white font-bold py-3 rounded-xl disabled:opacity-50 hover:opacity-90 transition"
        >
          {isPending ? "Processing..." : "💎 Deposit USDC"}
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
