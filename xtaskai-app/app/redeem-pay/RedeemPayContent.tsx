"use client";

import { useState, useEffect, useRef } from "react";
import { useSearchParams } from "next/navigation";
import { parseUnits } from "viem";
import { getFarcasterProvider, getAccounts, switchToBase, waitForTx, checkAllowance, approveUSDC, depositUSDC, isUserRejection } from "../lib/farcaster-wallet";

const USDC_ADDRESS = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913";
const CONTRACT_ADDRESS = "0x0f50aD6a61434CbE672Ec50009ED3EC0181731b0";
const CLAIM_FEE = 0.005;

export default function RedeemPayContent() {
  const searchParams = useSearchParams();
  const code_id = searchParams.get("code_id");
  const code = searchParams.get("code");
  const reward_usdc = parseFloat(searchParams.get("reward_usdc") || "0");
  const reward_xtp = parseInt(searchParams.get("reward_xtp") || "0");

  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [status, setStatus] = useState<"connecting"|"idle"|"approving"|"depositing"|"success"|"error">("connecting");
  const [errorMsg, setErrorMsg] = useState("");
  const [needsApproval, setNeedsApproval] = useState(true);
  const providerRef = useRef<any>(null);
  const amountInUnits = parseUnits(CLAIM_FEE.toString(), 6);

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

  async function handlePayFee() {
    if (!walletAddress) return;
    setStatus("depositing"); setErrorMsg("");
    try {
      await switchToBase(providerRef.current);
      const txHash = await depositUSDC(providerRef.current, walletAddress, CONTRACT_ADDRESS, amountInUnits);
      await waitForTx(txHash);
      await processClaim(txHash);
    } catch (err: any) {
      if (isUserRejection(err)) { setStatus("idle"); return; }
      setErrorMsg(err?.message || "Transaction failed"); setStatus("error");
    }
  }

  async function processClaim(txHash: string) {
    if (!code_id || !code) { setErrorMsg("No redeem data"); setStatus("error"); return; }
    try {
      const res = await fetch("https://xtaskai.com/base-mini-app/api/process-redeem.php", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_wallet: walletAddress, code_id: parseInt(code_id), code, tx_hash: txHash, reward_usdc, reward_xtp }),
      });
      const data = await res.json();
      if (data.success) { setStatus("success"); setTimeout(() => { window.location.href = `https://xtaskai.com/base-mini-app/redeem.php?success=1&reward_usdc=${reward_usdc}&reward_xtp=${reward_xtp}`; }, 2000); }
      else { setErrorMsg(data.error || "Failed"); setStatus("error"); }
    } catch { setErrorMsg("Failed to process claim"); setStatus("error"); }
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
        <div className="text-7xl mb-6 animate-bounce">🎁</div>
        <h2 className="text-3xl font-bold text-white mb-2">Reward Claimed!</h2>
        <div className="flex items-center justify-center gap-3 mt-2">
          {reward_usdc > 0 && <span className="text-2xl font-bold text-green-400">${reward_usdc} USDC</span>}
          {reward_usdc > 0 && reward_xtp > 0 && <span className="text-gray-600">+</span>}
          {reward_xtp > 0 && <span className="text-2xl font-bold text-yellow-400">{reward_xtp} XTP</span>}
        </div>
        <p className="text-gray-600 text-sm mt-6">Redirecting...</p>
      </div>
    </div>
  );

  if (!code_id || !code) return (
    <div className="min-h-screen bg-black flex items-center justify-center px-4">
      <div className="text-center w-full max-w-sm">
        <div className="text-6xl mb-4">❌</div>
        <h2 className="text-2xl font-bold text-white mb-2">No Redeem Data</h2>
        <p className="text-gray-400 mb-6">Please go back and enter your code.</p>
        <button onClick={() => window.location.href="https://xtaskai.com/base-mini-app/redeem.php"} className="w-full bg-white text-black font-bold py-4 rounded-2xl">Go Back</button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-black flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        {/* Header */}
        <div className="bg-gradient-to-b from-amber-900 to-gray-900 rounded-3xl p-8 mb-4 text-center border border-gray-800">
          <div className="text-6xl mb-3">🎁</div>
          <h1 className="text-2xl font-bold text-white">Claim Reward</h1>
          <p className="text-gray-400 text-sm mt-1 font-mono">{code}</p>
          <div className="mt-4 flex items-center justify-center gap-3">
            {reward_usdc > 0 && (
              <div className="bg-black/40 rounded-full px-4 py-2">
                <span className="text-green-400 font-bold">${reward_usdc} USDC</span>
              </div>
            )}
            {reward_xtp > 0 && (
              <div className="bg-black/40 rounded-full px-4 py-2">
                <span className="text-yellow-400 font-bold">{reward_xtp} XTP</span>
              </div>
            )}
          </div>
        </div>

        {/* Info */}
        <div className="bg-gray-900 rounded-2xl p-4 mb-4 border border-gray-800">
          <div className="flex justify-between items-center py-2 border-b border-gray-800">
            <span className="text-gray-400 text-sm">Claim Fee</span>
            <span className="text-white font-semibold">0.005 USDC</span>
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
          <button onClick={handlePayFee} disabled={status === "depositing"} className="w-full bg-white hover:bg-gray-100 text-black font-bold py-4 rounded-2xl transition disabled:opacity-50 text-lg">
            {status === "depositing" ? <span className="flex items-center justify-center gap-2"><div className="w-5 h-5 border-2 border-black border-t-transparent rounded-full animate-spin"/>Processing...</span> : "Pay 0.005 USDC & Claim"}
          </button>
        )}
        <button onClick={() => window.location.href="https://xtaskai.com/base-mini-app/redeem.php"} className="w-full mt-3 text-gray-600 text-sm py-3 hover:text-gray-400 transition">Cancel</button>
      </div>
    </div>
  );
}
