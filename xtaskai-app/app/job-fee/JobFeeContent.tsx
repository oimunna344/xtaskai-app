"use client";

import { useState, useEffect } from "react";
import { useAccount, useWriteContract, useWaitForTransactionReceipt, useReadContract, useConnect } from "wagmi";
import { parseUnits } from "viem";

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

export default function JobFeeContent() {
  const { address, isConnected } = useAccount();
  const { connect, connectors } = useConnect();
  const { writeContractAsync, data: approveHash, isPending: isApprovePending } = useWriteContract();
  const { writeContractAsync: writeDeposit, data: depositHash, isPending: isDepositPending } = useWriteContract();
  const { isLoading: isApproveConfirming, isSuccess: isApproveConfirmed } = useWaitForTransactionReceipt({ hash: approveHash });
  const { isLoading: isDepositConfirming, isSuccess: isDepositConfirmed } = useWaitForTransactionReceipt({ hash: depositHash });
  
  const [jobData, setJobData] = useState<any>(null);
  const [status, setStatus] = useState<"idle" | "approving" | "depositing" | "success" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const [needsApproval, setNeedsApproval] = useState(false);

  const JOB_FEE = 0.01;
  const amountInWei = parseUnits(JOB_FEE.toString(), 6);

  // Get job data from localStorage
  useEffect(() => {
    const stored = localStorage.getItem('pending_job');
    if (stored) {
      setJobData(JSON.parse(stored));
    } else {
      setErrorMsg("No job data found. Please go back and fill the job form.");
    }
  }, []);

  const { data: allowance, refetch: refetchAllowance } = useReadContract({
    address: USDC_ADDRESS,
    abi: USDC_ABI,
    functionName: "allowance",
    args: address ? [address, CONTRACT_ADDRESS] : undefined,
    query: { enabled: !!address },
  });

  useEffect(() => {
    if (allowance !== undefined) {
      setNeedsApproval(allowance < amountInWei);
    }
  }, [allowance, amountInWei]);

  // Auto redirect to MetaMask on mobile
  useEffect(() => {
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
    if (isMobile && !isConnected) {
      const currentUrl = window.location.href;
      const metaMaskUrl = `https://metamask.app.link/dapp/${currentUrl.replace('https://', '')}`;
      window.location.href = metaMaskUrl;
    }
  }, [isConnected]);

  const handleConnect = () => {
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
    
    if (isMobile) {
      const currentUrl = window.location.href;
      const metaMaskUrl = `https://metamask.app.link/dapp/${currentUrl.replace('https://', '')}`;
      window.location.href = metaMaskUrl;
    } else {
      const connector = connectors.find(c => c.id === 'injected');
      if (connector) connect({ connector });
    }
  };

  const handleApprove = async () => {
    setStatus("approving");
    setErrorMsg("");
    
    try {
      await writeContractAsync({
        address: USDC_ADDRESS,
        abi: USDC_ABI,
        functionName: "approve",
        args: [CONTRACT_ADDRESS, amountInWei],
      });
      
    } catch (error: any) {
      setStatus("error");
      setErrorMsg(error.message || "Approval failed");
    }
  };

  const handlePayFee = async () => {
    if (!isConnected) {
      setErrorMsg("Please connect your wallet first!");
      return;
    }

    setStatus("depositing");
    setErrorMsg("");

    try {
      await writeDeposit({
        address: CONTRACT_ADDRESS,
        abi: CONTRACT_ABI,
        functionName: "deposit",
        args: [amountInWei],
      });
      
    } catch (error: any) {
      setStatus("error");
      setErrorMsg(error.message || "Transaction failed");
    }
  };

  const registerJob = async (txHash: string) => {
    if (!jobData) {
      setStatus("error");
      setErrorMsg("No job data found");
      return;
    }

    try {
      const res = await fetch("https://xtaskai.com/base-mini-app/api/post-job.php", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_wallet: address,
          job_data: jobData,
          tx_hash: txHash,
          fee: JOB_FEE
        })
      });

      const data = await res.json();
      
      if (data.success) {
        localStorage.removeItem('pending_job');
        setStatus("success");
        setTimeout(() => {
          window.location.href = `https://xtaskai.com/base-mini-app/post-job.php?success=1`;
        }, 2000);
      } else {
        setStatus("error");
        setErrorMsg(data.error || "Failed to post job");
      }
    } catch (error) {
      setStatus("error");
      setErrorMsg("Failed to post job");
    }
  };

  // Only deposit transaction成功后 register
  useEffect(() => {
    if (isDepositConfirmed && depositHash) {
      registerJob(depositHash);
    }
  }, [isDepositConfirmed, depositHash]);

  // Approve成功后 allowance refetch
  useEffect(() => {
    if (isApproveConfirmed) {
      refetchAllowance();
      setStatus("idle");
    }
  }, [isApproveConfirmed, refetchAllowance]);

  if (!isConnected) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="text-center max-w-md w-full bg-white rounded-2xl shadow-lg p-8">
          <div className="text-5xl mb-4">💼</div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Connect Wallet</h2>
          <p className="text-gray-500 mb-6">Connect your wallet to pay job posting fee</p>
          <button onClick={handleConnect} className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-xl transition">
            Connect Wallet
          </button>
        </div>
      </div>
    );
  }

  if (status === "success") {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="text-center max-w-md w-full bg-white rounded-2xl shadow-lg p-8">
          <div className="text-6xl mb-4">✅</div>
          <h2 className="text-2xl font-bold text-green-600 mb-2">Job Posted Successfully!</h2>
          <p className="text-gray-600">Your job is pending admin approval.</p>
          <p className="text-gray-400 text-sm mt-4">Redirecting back...</p>
        </div>
      </div>
    );
  }

  const totalRewards = jobData ? (jobData.reward * jobData.total_workers) : 0;
  const xtpEarn = jobData ? jobData.total_workers : 0;

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-lg p-8">
        <div className="text-center">
          <div className="text-5xl mb-4">💼</div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Post Job</h1>
          <p className="text-gray-500 mb-6">Pay fee to publish your job</p>
        </div>

        {jobData && (
          <div className="bg-gray-50 rounded-xl p-4 mb-6">
            <div className="mb-3 pb-2 border-b border-gray-200">
              <div className="text-sm text-gray-500">Job Title</div>
              <div className="font-semibold text-gray-900">{jobData.title}</div>
            </div>
            <div className="mb-3 pb-2 border-b border-gray-200">
              <div className="text-sm text-gray-500">Reward per Worker</div>
              <div className="font-semibold text-gray-900">${jobData.reward} USDC</div>
            </div>
            <div className="mb-3 pb-2 border-b border-gray-200">
              <div className="text-sm text-gray-500">Number of Workers</div>
              <div className="font-semibold text-gray-900">{jobData.total_workers}</div>
            </div>
            <div className="mb-3 pb-2 border-b border-gray-200">
              <div className="text-sm text-gray-500">Total Rewards (from XTaskAI Balance)</div>
              <div className="font-semibold text-blue-600">${totalRewards.toFixed(3)} USDC</div>
            </div>
            <div className="mb-3">
              <div className="text-sm text-gray-500">Fee (from MetaMask Wallet)</div>
              <div className="font-semibold text-orange-500">0.01 USDC</div>
            </div>
          </div>
        )}

        <div className="bg-blue-50 rounded-xl p-3 mb-4">
          <div className="text-sm text-blue-800">
            💡 You will earn <strong>{xtpEarn} XTP</strong> points for posting this job!
          </div>
        </div>

        {status === "error" && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
            <p className="text-red-600 text-sm">{errorMsg}</p>
          </div>
        )}

        {needsApproval ? (
          <button
            onClick={handleApprove}
            disabled={isApprovePending || status === "approving" || isApproveConfirming}
            className="w-full bg-yellow-500 hover:bg-yellow-600 text-white font-semibold py-3 rounded-xl transition disabled:opacity-50"
          >
            {status === "approving" || isApprovePending || isApproveConfirming ? (
              <span className="flex items-center justify-center gap-2">
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Approving...
              </span>
            ) : (
              "Approve USDC"
            )}
          </button>
        ) : (
          <button
            onClick={handlePayFee}
            disabled={isDepositPending || status === "depositing" || isDepositConfirming}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-xl transition disabled:opacity-50"
          >
            {status === "depositing" || isDepositPending || isDepositConfirming ? (
              <span className="flex items-center justify-center gap-2">
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Processing...
              </span>
            ) : (
              "Pay 0.01 USDC & Post Job"
            )}
          </button>
        )}

        <button
          onClick={() => window.location.href = "https://xtaskai.com/base-mini-app/post-job.php"}
          className="w-full mt-3 text-gray-500 text-sm py-2 hover:text-gray-700 transition"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}