"use client";

import { useState, useEffect, useRef } from "react";
import { useSearchParams } from "next/navigation";
import { parseUnits } from "viem";
import { getFarcasterProvider, getAccounts, switchToBase, waitForTx, checkAllowance, approveUSDC, depositUSDC } from "@/app/lib/farcaster-wallet";

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
      const needs = await checkAllowance(provider, address, CONTRACT_ADDRESS, USDC_ADDRESS, amountInUnits);
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
      await waitForTx(providerRef.current, txHash);
      setNeedsApproval(false); setStatus("idle");
    } catch (err: any) { setErrorMsg(err?.message || "Approval failed"); setStatus("error"); }
  }

  async function handlePayFee() {
    if (!walletAddress) return;
    setStatus("depositing"); setErrorMsg("");
    try {
      await switchToBase(providerRef.current);
      const txHash = await depositUSDC(providerRef.current, walletAddress, CONTRACT_ADDRESS, amountInUnits);
      await waitForTx(providerRef.current, txHash);
      await registerJoin(txHash);
    } catch (err: any) { setErrorMsg(err?.message || "Transaction failed"); setStatus("error"); }
  }

  async function registerJoin(txHash: string) {
    if (!tournamentId || playerNames.length === 0) { setErrorMsg("Missing data"); setStatus("error"); return; }
    try {
      const res = await fetch("https://xtaskai.com/base-mini-app/join-tournament.php", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_wallet: walletAddress, tournament_id: parseInt(tournamentId), player_names: playerNames, tx_hash: txHash, entry_fee: parseFloat(entryFee||"0"), platform_fee: PLATFORM_FEE }),
      });
      const data = await res.json();
      if (data.success) { setStatus("success"); setTimeout(() => { window.location.href = "https://xtaskai.com/base-mini-app/tournaments.php?success=joined"; }, 2000); }
      else { setErrorMsg(data.error || "Failed"); setStatus("error"); }
    } catch { setErrorMsg("Failed to join"); setStatus("error"); }
  }

  if (status === "connecting") return <div className="min-h-screen bg-gray-50 flex items-center justify-center"><div className="text-center"><div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-500 border-t-transparent mx-auto mb-4"/><p className="text-gray-500">Connecting wallet...</p></div></div>;
  if (status === "success") return <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4"><div className="text-center max-w-md w-full bg-white rounded-2xl shadow-lg p-8"><div className="text-6xl mb-4">✅</div><h2 className="text-2xl font-bold text-green-600 mb-2">Tournament Joined!</h2><p className="text-gray-600">Successfully joined.</p><p className="text-gray-400 text-sm mt-4">Redirecting...</p></div></div>;
  if (!tournamentId || playerNames.length === 0) return <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4"><div className="text-center max-w-md w-full bg-white rounded-2xl shadow-lg p-8"><div className="text-6xl mb-4">❌</div><h2 className="text-2xl font-bold text-red-600 mb-2">Missing Info</h2><p className="text-gray-600 mb-6">{errorMsg}</p><button onClick={()=>window.location.href="https://xtaskai.com/base-mini-app/tournaments.php"} className="w-full bg-blue-600 text-white py-3 rounded-xl">Go Back</button></div></div>;

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-lg p-8">
        <div className="text-center"><div className="text-5xl mb-4">🏆</div><h1 className="text-2xl font-bold mb-2">Join Tournament</h1><p className="text-gray-500 mb-6">Pay platform fee to join</p></div>
        <div className="bg-gray-50 rounded-xl p-4 mb-6 space-y-2">
          {[["Tournament","#"+tournamentId],["Game Type",gameType==="squad"?"Squad":"Solo"],["Players",playerNames.join(", ")],["Entry Fee",`$${entryFee} USDC (App Balance)`],["Platform Fee","0.003 USDC"],["Wallet",`${walletAddress?.slice(0,8)}...${walletAddress?.slice(-6)}`]].map(([k,v])=>(
            <div key={k as string} className="flex justify-between border-b border-gray-100 pb-2 last:border-0"><span className="text-gray-500 text-sm">{k}</span><span className="font-semibold text-sm">{v}</span></div>
          ))}
        </div>
        <div className="bg-blue-50 rounded-xl p-3 mb-4 text-sm text-blue-800">💡 You earn <strong>+50 XTP</strong> for joining!</div>
        {status === "error" && <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4"><p className="text-red-600 text-sm">{errorMsg}</p><button onClick={connectWallet} className="text-blue-500 text-xs mt-1 underline">Retry</button></div>}
        {needsApproval ? (
          <button onClick={handleApprove} disabled={status==="approving"} className="w-full bg-yellow-500 hover:bg-yellow-600 text-white font-semibold py-3 rounded-xl disabled:opacity-50">
            {status==="approving"?<span className="flex items-center justify-center gap-2"><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"/>Approving...</span>:"Approve USDC"}
          </button>
        ):(
          <button onClick={handlePayFee} disabled={status==="depositing"} className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-xl disabled:opacity-50">
            {status==="depositing"?<span className="flex items-center justify-center gap-2"><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"/>Processing...</span>:"Pay 0.003 USDC & Join"}
          </button>
        )}
        <button onClick={()=>window.location.href="https://xtaskai.com/base-mini-app/tournaments.php"} className="w-full mt-3 text-gray-500 text-sm py-2">Cancel</button>
      </div>
    </div>
  );
}
