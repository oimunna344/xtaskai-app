"use client";

import { useState, useEffect, useRef } from "react";
import { useSearchParams } from "next/navigation";
import { parseUnits } from "viem";
import { getFarcasterProvider, getAccounts, switchToBase, waitForTx, checkAllowance, approveUSDC, depositUSDC, isUserRejection } from "../lib/farcaster-wallet";

const USDC_ADDRESS = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913";
const CONTRACT_ADDRESS = "0x0f50aD6a61434CbE672Ec50009ED3EC0181731b0";
const PLATFORM_FEE = 0.003;

export default function TournamentJoinContent() {
  const searchParams = useSearchParams();
  const tournamentId = searchParams.get("id");
  const entryFee = searchParams.get("fee");
  const gameType = searchParams.get("game_type") || "solo";
  const playersParam = searchParams.get("players");

  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [playerNames, setPlayerNames] = useState<string[]>([]);
  const [status, setStatus] = useState<"connecting"|"idle"|"approving"|"depositing"|"success"|"error">("connecting");
  const [errorMsg, setErrorMsg] = useState("");
  const [needsApproval, setNeedsApproval] = useState(true);
  const providerRef = useRef<any>(null);
  const amountInUnits = parseUnits(PLATFORM_FEE.toString(), 6);

  useEffect(() => {
    if (playersParam) { try { setPlayerNames(JSON.parse(decodeURIComponent(playersParam))); } catch { setErrorMsg("Invalid player data"); } }
    else setErrorMsg("Player names not found.");
  }, [playersParam]);

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
      await registerJoin(txHash);
    } catch (err: any) {
      if (isUserRejection(err)) { setStatus("idle"); return; }
      setErrorMsg(err?.message || "Transaction failed"); setStatus("error");
    }
  }

  async function registerJoin(txHash: string) {
    if (!tournamentId || playerNames.length === 0) { setErrorMsg("Missing data"); setStatus("error"); return; }
    try {
      const res = await fetch("https://xtaskai.com/base-mini-app/join-tournament.php", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_wallet: walletAddress, tournament_id: parseInt(tournamentId), player_names: playerNames, tx_hash: txHash, entry_fee: parseFloat(entryFee || "0"), platform_fee: PLATFORM_FEE }),
      });
      const data = await res.json();
      if (data.success) { setStatus("success"); setTimeout(() => { window.location.href = "https://xtaskai.com/base-mini-app/tournaments.php?success=joined"; }, 2000); }
      else { setErrorMsg(data.error || "Failed"); setStatus("error"); }
    } catch { setErrorMsg("Failed to join"); setStatus("error"); }
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
        <div className="text-7xl mb-6 animate-bounce">🏆</div>
        <h2 className="text-3xl font-bold text-white mb-2">You're In!</h2>
        <p className="text-gray-400">Tournament #{tournamentId}</p>
        <p className="text-2xl font-bold text-yellow-400 mt-2">+50 XTP</p>
        <p className="text-gray-600 text-sm mt-6">Redirecting...</p>
      </div>
    </div>
  );

  if (!tournamentId || playerNames.length === 0) return (
    <div className="min-h-screen bg-black flex items-center justify-center px-4">
      <div className="text-center w-full max-w-sm">
        <div className="text-6xl mb-4">❌</div>
        <h2 className="text-2xl font-bold text-white mb-2">Missing Info</h2>
        <p className="text-gray-400 mb-6">{errorMsg}</p>
        <button onClick={() => window.location.href="https://xtaskai.com/base-mini-app/tournaments.php"} className="w-full bg-white text-black font-bold py-4 rounded-2xl">Go Back</button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-black flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        {/* Header */}
        <div className="bg-gradient-to-b from-yellow-900 to-gray-900 rounded-3xl p-8 mb-4 text-center border border-gray-800">
          <div className="text-6xl mb-3">🏆</div>
          <h1 className="text-2xl font-bold text-white">Join Tournament</h1>
          <p className="text-gray-400 text-sm mt-1">#{tournamentId} • {gameType === "squad" ? "Squad" : "Solo"}</p>
          <div className="mt-3 bg-black/40 rounded-full px-4 py-2 inline-block">
            <span className="text-gray-300 text-sm">{playerNames.join(", ")}</span>
          </div>
          <div className="mt-2 inline-flex items-center gap-2 bg-black/40 rounded-full px-4 py-2">
            <span className="text-yellow-400 font-bold">+50 XTP</span>
            <span className="text-gray-500 text-sm">for joining</span>
          </div>
        </div>

        {/* Details */}
        <div className="bg-gray-900 rounded-2xl p-4 mb-4 border border-gray-800">
          <div className="flex justify-between items-center py-2 border-b border-gray-800">
            <span className="text-gray-400 text-sm">Entry Fee</span>
            <span className="text-blue-400 font-semibold">${entryFee} USDC (App Balance)</span>
          </div>
          <div className="flex justify-between items-center py-2 border-b border-gray-800">
            <span className="text-gray-400 text-sm">Platform Fee</span>
            <span className="text-white font-semibold">0.003 USDC</span>
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
            {status === "depositing" ? <span className="flex items-center justify-center gap-2"><div className="w-5 h-5 border-2 border-black border-t-transparent rounded-full animate-spin"/>Processing...</span> : "Pay 0.003 USDC & Join"}
          </button>
        )}
        <button onClick={() => window.location.href="https://xtaskai.com/base-mini-app/tournaments.php"} className="w-full mt-3 text-gray-600 text-sm py-3 hover:text-gray-400 transition">Cancel</button>
      </div>
    </div>
  );
}
