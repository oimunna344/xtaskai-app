"use client";

import { useState, useEffect, useRef } from "react";
import { useSearchParams } from "next/navigation";
import { parseUnits } from "viem";
import { getFarcasterProvider, getAccounts, switchToBase, waitForTx, checkAllowance, approveUSDC, depositUSDC } from "../lib/farcaster-wallet";

const USDC_ADDRESS = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913";
const CONTRACT_ADDRESS = "0x0f50aD6a61434CbE672Ec50009ED3EC0181731b0";
const JOB_FEE = 0.01;

export default function JobFeeContent() {
  const searchParams = useSearchParams();
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [jobData, setJobData] = useState<any>(null);
  const [status, setStatus] = useState<"connecting"|"idle"|"approving"|"depositing"|"success"|"error">("connecting");
  const [errorMsg, setErrorMsg] = useState("");
  const [needsApproval, setNeedsApproval] = useState(true);
  const providerRef = useRef<any>(null);
  const amountInUnits = parseUnits(JOB_FEE.toString(), 6);

  useEffect(() => {
    const param = searchParams.get("job_data");
    if (param) { try { setJobData(JSON.parse(decodeURIComponent(param))); } catch { setErrorMsg("Invalid job data"); } }
    else setErrorMsg("No job data found.");
  }, [searchParams]);

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
      setNeedsApproval(false); setStatus("idle");
    } catch (err: any) { setErrorMsg(err?.message || "Approval failed"); setStatus("error"); }
  }

  async function handlePayFee() {
    if (!walletAddress) return;
    setStatus("depositing"); setErrorMsg("");
    try {
      await switchToBase(providerRef.current);
      const txHash = await depositUSDC(providerRef.current, walletAddress, CONTRACT_ADDRESS, amountInUnits);
      await waitForTx(txHash);
      await registerJob(txHash);
    } catch (err: any) { setErrorMsg(err?.message || "Transaction failed"); setStatus("error"); }
  }

  async function registerJob(txHash: string) {
    if (!jobData) { setErrorMsg("No job data"); setStatus("error"); return; }
    try {
      const res = await fetch("https://xtaskai.com/base-mini-app/api/post-job.php", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_wallet: walletAddress, job_data: jobData, tx_hash: txHash, fee: JOB_FEE }),
      });
      const data = await res.json();
      if (data.success) { setStatus("success"); setTimeout(() => { window.location.href = "https://xtaskai.com/base-mini-app/post-job.php?success=1"; }, 2000); }
      else { setErrorMsg(data.error || "Failed to post job"); setStatus("error"); }
    } catch { setErrorMsg("Failed to post job"); setStatus("error"); }
  }

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
        <h2 className="text-2xl font-bold text-green-600 mb-2">Job Posted!</h2>
        <p className="text-gray-600">Pending admin approval.</p>
        <p className="text-gray-400 text-sm mt-4">Redirecting...</p>
      </div>
    </div>
  );

  if (!jobData) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="text-center max-w-md w-full bg-white rounded-2xl shadow-lg p-8">
        <div className="text-6xl mb-4">❌</div>
        <h2 className="text-2xl font-bold text-red-600 mb-2">No Job Data</h2>
        <p className="text-gray-600 mb-6">{errorMsg}</p>
        <button onClick={() => window.location.href="https://xtaskai.com/base-mini-app/post-job.php"} className="w-full bg-blue-600 text-white py-3 rounded-xl">Go Back</button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-lg p-8">
        <div className="text-center">
          <div className="text-5xl mb-4">💼</div>
          <h1 className="text-2xl font-bold mb-2">Pay Job Fee</h1>
          <p className="text-gray-500 mb-6">Pay fee to publish your job</p>
        </div>
        <div className="bg-gray-50 rounded-xl p-4 mb-6 space-y-2">
          {[["Job Title", jobData.title], ["Reward/Worker", `$${jobData.reward} USDC`], ["Workers", jobData.total_workers], ["Total Rewards", `$${(jobData.reward * jobData.total_workers).toFixed(3)} USDC`], ["Platform Fee", "0.01 USDC"], ["Wallet", `${walletAddress?.slice(0,8)}...${walletAddress?.slice(-6)}`]].map(([k, v]) => (
            <div key={k as string} className="flex justify-between border-b border-gray-100 pb-2 last:border-0">
              <span className="text-gray-500 text-sm">{k}</span><span className="font-semibold text-sm">{v}</span>
            </div>
          ))}
        </div>
        <div className="bg-blue-50 rounded-xl p-3 mb-4 text-sm text-blue-800">💡 You will earn <strong>{jobData.total_workers} XTP</strong> for posting!</div>
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
          <button onClick={handlePayFee} disabled={status === "depositing"} className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-xl disabled:opacity-50">
            {status === "depositing" ? <span className="flex items-center justify-center gap-2"><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"/>Processing...</span> : "Pay 0.01 USDC & Post Job"}
          </button>
        )}
        <button onClick={() => window.location.href="https://xtaskai.com/base-mini-app/post-job.php"} className="w-full mt-3 text-gray-500 text-sm py-2">Cancel</button>
      </div>
    </div>
  );
}
