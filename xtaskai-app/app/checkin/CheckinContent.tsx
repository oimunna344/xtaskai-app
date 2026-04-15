"use client";

import { useState, useEffect, useRef } from "react";
import { createPublicClient, custom, parseUnits, encodeFunctionData } from "viem";
import { base } from "viem/chains";

const USDC_ADDRESS = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913";
const CONTRACT_ADDRESS = "0x0f50aD6a61434CbE672Ec50009ED3EC0181731b0";

const USDC_ABI = [
  {
    type: "function",
    name: "approve",
    inputs: [
      { name: "spender", type: "address" },
      { name: "amount", type: "uint256" }
    ],
    outputs: [{ type: "bool" }],
    stateMutability: "nonpayable"
  },
  {
    type: "function",
    name: "allowance",
    inputs: [
      { name: "owner", type: "address" },
      { name: "spender", type: "address" }
    ],
    outputs: [{ type: "uint256" }],
    stateMutability: "view"
  }
] as const;

const CONTRACT_ABI = [
  {
    type: "function",
    name: "deposit",
    inputs: [{ name: "amount", type: "uint256" }],
    outputs: [],
    stateMutability: "nonpayable"
  }
] as const;

const CHECKIN_FEE = 0.001;

export default function CheckinContent() {
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [status, setStatus] = useState<"connecting" | "idle" | "approving" | "depositing" | "success" | "error">("connecting");
  const [errorMsg, setErrorMsg] = useState("");
  const [needsApproval, setNeedsApproval] = useState(true);
  const providerRef = useRef<any>(null);

  const amountInUnits = parseUnits(CHECKIN_FEE.toString(), 6);

  useEffect(() => {
    connectWallet();
  }, []);

  async function connectWallet() {
    try {
      setStatus("connecting");
      const sdk = (await import("@farcaster/frame-sdk")).default;
      await sdk.actions.ready();
      const provider = sdk.wallet.ethProvider;
      providerRef.current = provider;

      const accounts = await provider.request({ method: "eth_requestAccounts" }) as readonly `0x${string}`[];
      if (!accounts || accounts.length === 0) throw new Error("No wallet found");

      setWalletAddress(accounts[0] as string);
      await checkAllowance(accounts[0], provider);
      setStatus("idle");
    } catch (err: any) {
      setErrorMsg(err?.message || "Failed to connect wallet");
      setStatus("error");
    }
  }

  async function checkAllowance(owner: `0x${string}`, provider: any) {
    try {
      const publicClient = createPublicClient({ chain: base, transport: custom(provider) });
      const allowance = await publicClient.readContract({
        address: USDC_ADDRESS,
        abi: USDC_ABI,
        functionName: "allowance",
        args: [owner, CONTRACT_ADDRESS as `0x${string}`],
      });
      setNeedsApproval(allowance < amountInUnits);
    } catch {
      setNeedsApproval(true);
    }
  }

  async function switchToBase() {
    try {
      await providerRef.current.request({
        method: "wallet_switchEthereumChain",
        params: [{ chainId: "0x2105" }],
      });
    } catch (err: any) {
      if (err.code === 4902) {
        await providerRef.current.request({
          method: "wallet_addEthereumChain",
          params: [{
            chainId: "0x2105",
            chainName: "Base",
            nativeCurrency: { name: "ETH", symbol: "ETH", decimals: 18 },
            rpcUrls: ["https://mainnet.base.org"],
            blockExplorerUrls: ["https://basescan.org"],
          }],
        });
      } else throw err;
    }
  }

  async function handleApprove() {
    if (!walletAddress || !providerRef.current) return;
    setStatus("approving");
    setErrorMsg("");
    try {
      await switchToBase();
      const publicClient = createPublicClient({ chain: base, transport: custom(providerRef.current) });

      const txHash = await providerRef.current.request({
        method: 'eth_sendTransaction',
        params: [{
          from: walletAddress,
          to: USDC_ADDRESS,
          data: encodeFunctionData({
            abi: USDC_ABI,
            functionName: "approve",
            args: [CONTRACT_ADDRESS as `0x${string}`, amountInUnits],
          }),
          value: '0x0',
        }],
      });

      await publicClient.waitForTransactionReceipt({ hash: txHash as `0x${string}` });
      setNeedsApproval(false);
      setStatus("idle");
    } catch (err: any) {
      setErrorMsg(err?.message || "Approval failed");
      setStatus("error");
    }
  }

  async function handleCheckin() {
    if (!walletAddress || !providerRef.current) return;
    setStatus("depositing");
    setErrorMsg("");
    try {
      await switchToBase();
      const publicClient = createPublicClient({ chain: base, transport: custom(providerRef.current) });

      const txHash = await providerRef.current.request({
        method: 'eth_sendTransaction',
        params: [{
          from: walletAddress,
          to: CONTRACT_ADDRESS,
          data: encodeFunctionData({
            abi: CONTRACT_ABI,
            functionName: "deposit",
            args: [amountInUnits],
          }),
          value: '0x0',
        }],
      });

      await publicClient.waitForTransactionReceipt({ hash: txHash as `0x${string}` });
      await registerCheckin(txHash as string);
    } catch (err: any) {
      setErrorMsg(err?.message || "Transaction failed");
      setStatus("error");
    }
  }

  async function registerCheckin(txHash: string) {
    try {
      const res = await fetch("https://xtaskai.com/base-mini-app/api/checkin.php", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_wallet: walletAddress,
          amount: CHECKIN_FEE,
          tx_hash: txHash,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setStatus("success");
        setTimeout(() => {
          window.location.href = "https://xtaskai.com/base-mini-app/quests.php?success=Check-in+successful!+100+XTP";
        }, 2000);
      } else {
        setErrorMsg(data.error || "Failed to register checkin");
        setStatus("error");
      }
    } catch {
      setErrorMsg("Failed to register checkin");
      setStatus("error");
    }
  }

  if (status === "connecting") {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-500 border-t-transparent mx-auto mb-4" />
          <p className="text-gray-500">Connecting wallet...</p>
        </div>
      </div>
    );
  }

  if (status === "success") {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="text-center max-w-md w-full bg-white rounded-2xl shadow-lg p-8">
          <div className="text-6xl mb-4">✅</div>
          <h2 className="text-2xl font-bold text-green-600 mb-2">Check-in Successful!</h2>
          <p className="text-gray-600">You earned +100 XTP</p>
          <p className="text-gray-400 text-sm mt-4">Redirecting back...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-lg p-8">
        <div className="text-center">
          <div className="text-5xl mb-4">📅</div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Daily Check-in</h1>
          <p className="text-gray-500 mb-6">Check in daily to earn rewards</p>
        </div>

        <div className="bg-gray-50 rounded-xl p-4 mb-6">
          <div className="flex justify-between mb-2">
            <span className="text-gray-500">Check-in Fee:</span>
            <span className="font-bold text-gray-900">0.001 USDC</span>
          </div>
          <div className="flex justify-between mb-2">
            <span className="text-gray-500">Reward:</span>
            <span className="font-bold text-purple-600">+100 XTP</span>
          </div>
          <div className="flex justify-between mt-2">
            <span className="text-gray-500">Your Wallet:</span>
            <span className="font-mono text-sm text-gray-600">
              {walletAddress ? `${walletAddress.slice(0, 8)}...${walletAddress.slice(-6)}` : "—"}
            </span>
          </div>
        </div>

        {status === "error" && errorMsg && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
            <p className="text-red-600 text-sm">{errorMsg}</p>
            <button onClick={connectWallet} className="text-blue-500 text-xs mt-1 underline">
              Retry connection
            </button>
          </div>
        )}

        {needsApproval ? (
          <button
            onClick={handleApprove}
            disabled={status === "approving"}
            className="w-full bg-yellow-500 hover:bg-yellow-600 text-white font-semibold py-3 rounded-xl transition disabled:opacity-50"
          >
            {status === "approving" ? (
              <span className="flex items-center justify-center gap-2">
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Approving...
              </span>
            ) : "Approve USDC"}
          </button>
        ) : (
          <button
            onClick={handleCheckin}
            disabled={status === "depositing"}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-xl transition disabled:opacity-50"
          >
            {status === "depositing" ? (
              <span className="flex items-center justify-center gap-2">
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Processing...
              </span>
            ) : "Pay 0.001 USDC & Check-in"}
          </button>
        )}

        <button
          onClick={() => window.location.href = "https://xtaskai.com/base-mini-app/quests.php"}
          className="w-full mt-3 text-gray-500 text-sm py-2 hover:text-gray-700 transition"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}