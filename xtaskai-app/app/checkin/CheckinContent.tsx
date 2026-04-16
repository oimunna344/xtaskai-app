"use client";

import { useState, useEffect, useRef } from "react";
import { parseUnits } from "viem";
import { getFarcasterProvider, getAccounts, switchToBase, waitForTx, checkAllowance, approveUSDC, depositUSDC, isUserRejection } from "../lib/farcaster-wallet";

const USDC_ADDRESS = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913";
const CONTRACT_ADDRESS = "0x0f50aD6a61434CbE672Ec50009ED3EC0181731b0";
const CHECKIN_FEE = 0.001;

export default function CheckinContent() {
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [status, setStatus] = useState<"connecting"|"idle"|"approving"|"depositing"|"success"|"error">("connecting");
  const [errorMsg, setErrorMsg] = useState("");
  const [needsApproval, setNeedsApproval] = useState(true);
  const providerRef = useRef<any>(null);
  const amountInUnits = parseUnits(CHECKIN_FEE.toString(), 6);

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
    } catch (err: any) { setErrorMsg(err?.message || "Failed to connect"); setStatus("error"); }
  }

  async function handleApprove() {
    if (!walletAddress) return;
    setStatus("approving"); setErrorMsg("");
    try {
      await switchToBase(providerRef.current);
      const txHash = await approveUSDC(providerRef.current, walletAddress, USDC_ADDRESS, CONTRACT_ADDRESS, amountInUnits);
      await waitForTx(txHash);
      await new Promise(r => setTimeout(r, 3000));
      const stillNeeds = await checkAllowance(walletAddress, CONTRACT_ADDRESS, USDC_ADDRESS, amountInUnits);
      setNeedsApproval(stillNeeds); setStatus("idle");
    } catch (err: any) {
      if (isUserRejection(err)) { setStatus("idle"); return; }
      setErrorMsg(err?.message || "Approval failed"); setStatus("error");
    }
  }

  async function handleCheckin() {
    if (!walletAddress) return;
    setStatus("depositing"); setErrorMsg("");
    try {
      await switchToBase(providerRef.current);
      const txHash = await depositUSDC(providerRef.current, walletAddress, CONTRACT_ADDRESS, amountInUnits);
      await waitForTx(txHash);
      await registerCheckin(txHash);
    } catch (err: any) {
      if (isUserRejection(err)) { setStatus("idle"); return; }
      setErrorMsg(err?.message || "Transaction failed"); setStatus("error");
    }
  }

  async function registerCheckin(txHash: string) {
    try {
      const res = await fetch("https://xtaskai.com/base-mini-app/api/checkin.php", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_wallet: walletAddress, amount: CHECKIN_FEE, tx_hash: txHash }),
      });
      const data = await res.json();
      if (data.success) { setStatus("success"); setTimeout(() => { window.location.href = "https://xtaskai.com/base-mini-app/quests.php?success=Check-in+successful!+100+XTP"; }, 2000); }
      else { setErrorMsg(data.error || "Failed"); setStatus("error"); }
    } catch { setErrorMsg("Failed to register checkin"); setStatus("error"); }
  }

  if (status === "connecting") return (
    <div className="min-h-screen bg-black flex items-center justify-center">
      <div className="text-center">
        <div className="w-12 h-12 border-2 border-white border-t-transparent rounded-full animate-spin mx-auto mb-4"/>
        <p className="text-gray-400 text-sm">Connecting wallet...</p>
      </div>
    </div>
  );

  if (status === "success") return (
    <div className="min-h-screen bg-black flex items-center justify-center px-4">
      <div className="text-center">
        <div className="text-7xl mb-6 animate-bounce">✅</div>
        <h2 className="text-3xl font-bold text-white mb-2">Checked In!</h2>
        <p className="text-gray-400 mb-1">You earned</p>
        <p className="text-2xl font-bold text-green-400">+100 XTP</p>
        <p className="text-gray-600 text-sm mt-6">Redirecting back...</p>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-black flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        {/* Header */}
        <div className="bg-gradient-to-b from-green-900 to-gray-900 rounded-3xl p-8 mb-4 text-center border border-gray-800">
          <div className="text-6xl mb-3">📅</div>
          <h1 className="text-2xl font-bold text-white">Daily Check-in</h1>
          <p className="text-gray-400 text-sm mt-1">Check in every day to earn rewards</p>
          <div className="mt-4 inline-flex items-center gap-2 bg-black/40 rounded-full px-4 py-2">
            <span className="text-green-400 font-bold text-lg">+100 XTP</span>
            <span className="text-gray-500 text-sm">daily reward</span>
          </div>
        </div>

        {/* Info */}
        <div className="bg-gray-900 rounded-2xl p-4 mb-4 border border-gray-800">
          <div className="flex justify-between items-center py-2 border-b border-gray-800">
            <span className="text-gray-400 text-sm">Check-in Fee</span>
            <span className="text-white font-semibold">0.001 USDC</span>
          </div>
          <div className="flex justify-between items-center py-2">
            <span className="text-gray-400 text-sm">Wallet</span>
            <span className="text-gray-300 font-mono text-xs">{walletAddress?.slice(0,6)}...{walletAddress?.slice(-4)}</span>
          </div>
        </div>

        {status === "error" && (
          <div className="bg-red-950 border border-red-800 rounded-2xl p-4 mb-4">
            <p className="text-red-400 text-sm">{errorMsg}</p>
            <button onClick={connectWallet} className="text-red-300 text-xs mt-2 underline">Retry</button>
          </div>
        )}

        {needsApproval ? (
          <button onClick={handleApprove} disabled={status === "approving"} className="w-full bg-yellow-500 hover:bg-yellow-400 text-black font-bold py-4 rounded-2xl transition disabled:opacity-50 text-lg">
            {status === "approving" ? <span className="flex items-center justify-center gap-2"><div className="w-5 h-5 border-2 border-black border-t-transparent rounded-full animate-spin"/>Approving...</span> : "Approve USDC"}
          </button>
        ) : (
          <button onClick={handleCheckin} disabled={status === "depositing"} className="w-full bg-white hover:bg-gray-100 text-black font-bold py-4 rounded-2xl transition disabled:opacity-50 text-lg">
            {status === "depositing" ? <span className="flex items-center justify-center gap-2"><div className="w-5 h-5 border-2 border-black border-t-transparent rounded-full animate-spin"/>Processing...</span> : "Pay 0.001 USDC & Check-in"}
          </button>
        )}

        <button onClick={() => window.location.href="https://xtaskai.com/base-mini-app/quests.php"} className="w-full mt-3 text-gray-600 text-sm py-3 hover:text-gray-400 transition">Cancel</button>
      </div>
    </div>
  );
}
