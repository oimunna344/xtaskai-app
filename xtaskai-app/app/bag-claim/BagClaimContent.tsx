"use client";

import { useState, useEffect, useRef } from "react";
import { useSearchParams } from "next/navigation";
import { parseUnits } from "viem";
import { getFarcasterProvider, getAccounts, switchToBase, waitForTx, checkAllowance, approveUSDC, depositUSDC } from "../lib/farcaster-wallet";

const USDC_ADDRESS = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913";
const CONTRACT_ADDRESS = "0x0f50aD6a61434CbE672Ec50009ED3EC0181731b0";

export default function BagClaimContent() {
  const searchParams = useSearchParams();
  const day = searchParams.get("day") || "0";
  const fee = searchParams.get("fee") || "0.01";
  const xtp = searchParams.get("xtp") || "100";

  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [status, setStatus] = useState<"connecting"|"idle"|"approving"|"depositing"|"success"|"error">("connecting");
  const [errorMsg, setErrorMsg] = useState("");
  const [needsApproval, setNeedsApproval] = useState(true);
  const providerRef = useRef<any>(null);
  const amountInUnits = parseUnits(fee, 6);

  useEffect(() => { connectWallet(); }, []);

  async function connectWallet() {
    try {
      setStatus("connecting");
      const provider = await getFarcasterProvider();
      providerRef.current = provider;
      const address = await getAccounts(provider);
      setWalletAddress(address);
      const needs = await checkAllowance(address, CONTRACT_ADDRESS, USDC_ADDRESS, amountInUnits);
      setNeedsApproval(needs);
      setStatus("idle");
    } catch (err: any) {
      setErrorMsg(err?.message || "Failed to connect wallet");
      setStatus("error");
    }
  }

  async function handleApprove() {
    if (!walletAddress) return;
    setStatus("approving"); setErrorMsg("");
    try {
      await switchToBase(providerRef.current);
      const txHash = await approveUSDC(providerRef.current, walletAddress, USDC_ADDRESS, CONTRACT_ADDRESS, amountInUnits);
      await waitForTx(txHash);
      setNeedsApproval(false);
      setStatus("idle");
    } catch (err: any) {
      setErrorMsg(err?.message || "Approval failed");
      setStatus("error");
    }
  }

  async function handleDeposit() {
    if (!walletAddress) return;
    setStatus("depositing"); setErrorMsg("");
    try {
      await switchToBase(providerRef.current);
      const txHash = await depositUSDC(providerRef.current, walletAddress, CONTRACT_ADDRESS, amountInUnits);
      await waitForTx(txHash);
      await registerClaim(txHash);
    } catch (err: any) {
      setErrorMsg(err?.message || "Transaction failed");
      setStatus("error");
    }
  }

  async function registerClaim(txHash: string) {
    try {
      const res = await fetch("https://xtaskai.com/base-mini-app/api/bag_claim.php", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_wallet: walletAddress, day: parseInt(day), fee: parseFloat(fee), xtp: parseInt(xtp), tx_hash: txHash }),
      });
      const data = await res.json();
      if (data.success) {
        setStatus("success");
        setTimeout(() => { window.location.href = `https://xtaskai.com/base-mini-app/quests.php?success=Bag+${parseInt(day)+1}+claimed!+${xtp}+XTP`; }, 2000);
      } else { setErrorMsg(data.error || "Failed to claim bag"); setStatus("error"); }
    } catch { setErrorMsg("Failed to claim bag"); setStatus("error"); }
  }

  const bagNames = ["Bronze","Silver","Gold","Platinum","Diamond","Ruby","Legendary"];
  const bagIcons = ["🥉","🥈","🥇","💎","💎","🔴","👑"];
  const dayNum = parseInt(day);

  if (status === "connecting") return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-500 border-t-transparent mx-auto mb-4"/>
        <p className="text-gray-500">Connecting wallet...</p>
      </div>
    </div>
  );

  if (status === "success") return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="text-center max-w-md w-full bg-white rounded-2xl shadow-lg p-8">
        <div className="text-6xl mb-4">✅</div>
        <h2 className="text-2xl font-bold text-green-600 mb-2">Bag Claimed!</h2>
        <p className="text-gray-600">You earned +{xtp} XTP</p>
        <p className="text-gray-400 text-sm mt-4">Redirecting back...</p>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-lg p-8">
        <div className="text-center">
          <div className="text-5xl mb-4">{bagIcons[dayNum]}</div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Claim {bagNames[dayNum]} Bag</h1>
          <p className="text-gray-500 mb-6">Day {dayNum + 1} Reward</p>
        </div>
        <div className="bg-gray-50 rounded-xl p-4 mb-6 space-y-2">
          <div className="flex justify-between border-b border-gray-100 pb-2"><span className="text-gray-500">Claim Fee:</span><span className="font-bold">${fee} USDC</span></div>
          <div className="flex justify-between border-b border-gray-100 pb-2"><span className="text-gray-500">Reward:</span><span className="font-bold text-purple-600">+{xtp} XTP</span></div>
          <div className="flex justify-between"><span className="text-gray-500">Wallet:</span><span className="font-mono text-sm">{walletAddress?.slice(0,8)}...{walletAddress?.slice(-6)}</span></div>
        </div>
        {status === "error" && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
            <p className="text-red-600 text-sm">{errorMsg}</p>
            <button onClick={connectWallet} className="text-blue-500 text-xs mt-1 underline">Retry</button>
          </div>
        )}
        {needsApproval ? (
          <button onClick={handleApprove} disabled={status === "approving"} className="w-full bg-yellow-500 hover:bg-yellow-600 text-white font-semibold py-3 rounded-xl disabled:opacity-50">
            {status === "approving" ? <span className="flex items-center justify-center gap-2"><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"/>Approving...</span> : "Approve USDC"}
          </button>
        ) : (
          <button onClick={handleDeposit} disabled={status === "depositing"} className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-xl disabled:opacity-50">
            {status === "depositing" ? <span className="flex items-center justify-center gap-2"><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"/>Processing...</span> : `Pay $${fee} USDC & Claim Bag`}
          </button>
        )}
        <button onClick={() => window.location.href = "https://xtaskai.com/base-mini-app/quests.php"} className="w-full mt-3 text-gray-500 text-sm py-2">Cancel</button>
      </div>
    </div>
  );
}
