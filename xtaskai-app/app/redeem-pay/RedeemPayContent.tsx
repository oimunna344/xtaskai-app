"use client";

import { useState, useEffect } from "react";
import { useAccount, useWriteContract, useWaitForTransactionReceipt, useReadContract, useConnect } from "wagmi";
import { parseUnits } from "viem";
import { useSearchParams } from "next/navigation";

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

export default function RedeemPayContent() {
  const searchParams = useSearchParams();
  const { address, isConnected } = useAccount();
  const { connect, connectors } = useConnect();
  const { writeContractAsync, data: approveHash, isPending: isApprovePending } = useWriteContract();
  const { writeContractAsync: writeDeposit, data: depositHash, isPending: isDepositPending } = useWriteContract();
  const { isLoading: isApproveConfirming, isSuccess: isApproveConfirmed } = useWaitForTransactionReceipt({ hash: approveHash });
  const { isLoading: isDepositConfirming, isSuccess: isDepositConfirmed } = useWaitForTransactionReceipt({ hash: depositHash });
  
  // Get data from URL parameters
  const code_id = searchParams.get("code_id");
  const code = searchParams.get("code");
  const reward_usdc = parseFloat(searchParams.get("reward_usdc") || "0");
  const reward_xtp = parseInt(searchParams.get("reward_xtp") || "0");
  
  const [status, setStatus] = useState<"idle" | "approving" | "depositing" | "success" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const [needsApproval, setNeedsApproval] = useState(false);

  const CLAIM_FEE = 0.005;
  const amountInWei = parseUnits(CLAIM_FEE.toString(), 6);

  useEffect(() => {
    if (!code_id || !code) {
      setErrorMsg("No redeem data found. Please go back and enter your code first.");
    }
  }, [code_id, code]);

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

  const processClaim = async (txHash: string) => {
    if (!code_id || !code) {
      setStatus("error");
      setErrorMsg("No redeem data found");
      return;
    }

    try {
      const res = await fetch("https://xtaskai.com/base-mini-app/api/process-redeem.php", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_wallet: address,
          code_id: parseInt(code_id),
          code: code,
          tx_hash: txHash,
          reward_usdc: reward_usdc,
          reward_xtp: reward_xtp
        })
      });

      const data = await res.json();
      
      if (data.success) {
        setStatus("success");
        setTimeout(() => {
          window.location.href = `https://xtaskai.com/base-mini-app/redeem.php?success=1&reward_usdc=${reward_usdc}&reward_xtp=${reward_xtp}`;
        }, 2000);
      } else {
        setStatus("error");
        setErrorMsg(data.error || "Failed to process claim");
      }
    } catch (error) {
      setStatus("error");
      setErrorMsg("Failed to process claim");
    }
  };

  useEffect(() => {
    if (isDepositConfirmed && depositHash) {
      processClaim(depositHash);
    }
  }, [isDepositConfirmed, depositHash]);

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
          <div className="text-5xl mb-4">🎁</div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Connect Wallet</h2>
          <p className="text-gray-500 mb-6">Connect your wallet to claim your reward</p>
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
          <h2 className="text-2xl font-bold text-green-600 mb-2">Reward Claimed!</h2>
          <p className="text-gray-600">
            You received:
            {reward_usdc > 0 && ` $${reward_usdc} USDC`}
            {reward_xtp > 0 && ` ${reward_xtp} XTP`}
          </p>
          <p className="text-gray-400 text-sm mt-4">Redirecting back...</p>
        </div>
      </div>
    );
  }

  // Show error if no data
  if (!code_id || !code) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="text-center max-w-md w-full bg-white rounded-2xl shadow-lg p-8">
          <div className="text-6xl mb-4">❌</div>
          <h2 className="text-2xl font-bold text-red-600 mb-2">No Redeem Data</h2>
          <p className="text-gray-600 mb-6">Please go back and enter your redeem code first.</p>
          <button
            onClick={() => window.location.href = "https://xtaskai.com/base-mini-app/redeem.php"}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-xl transition"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-lg p-8">
        <div className="text-center">
          <div className="text-5xl mb-4">🎁</div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Claim Reward</h1>
          <p className="text-gray-500 mb-6">Pay fee to claim your reward</p>
        </div>

        <div className="bg-gray-50 rounded-xl p-4 mb-6">
          <div className="mb-3 pb-2 border-b border-gray-200">
            <div className="text-sm text-gray-500">Redeem Code</div>
            <div className="font-mono font-semibold text-gray-900">{code}</div>
          </div>
          <div className="mb-3 pb-2 border-b border-gray-200">
            <div className="text-sm text-gray-500">Your Reward</div>
            <div className="font-semibold text-green-600 text-lg">
              {reward_usdc > 0 && `$${reward_usdc} USDC`}
              {reward_usdc > 0 && reward_xtp > 0 && " + "}
              {reward_xtp > 0 && `${reward_xtp} XTP`}
            </div>
          </div>
          <div className="mb-3">
            <div className="text-sm text-gray-500">Claim Fee (from MetaMask)</div>
            <div className="font-semibold text-orange-500">0.005 USDC</div>
          </div>
        </div>

        <div className="bg-blue-50 rounded-xl p-3 mb-4">
          <div className="text-sm text-blue-800">
            💡 After paying the fee, your reward will be added to your XTaskAI balance!
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
              "Pay 0.005 USDC & Claim Reward"
            )}
          </button>
        )}

        <button
          onClick={() => window.location.href = "https://xtaskai.com/base-mini-app/redeem.php"}
          className="w-full mt-3 text-gray-500 text-sm py-2 hover:text-gray-700 transition"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}