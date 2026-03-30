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

export default function CheckinContent() {
  const { address, isConnected } = useAccount();
  const { connect, connectors } = useConnect();
  const { writeContractAsync, data: hash, isPending } = useWriteContract();
  const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({ hash });
  
  const [status, setStatus] = useState<"idle" | "approving" | "depositing" | "success" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const [needsApproval, setNeedsApproval] = useState(false);

  const CHECKIN_FEE = 0.001;
  const amountInWei = parseUnits(CHECKIN_FEE.toString(), 6);

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

  const handleConnect = () => {
    const connector = connectors.find(c => c.id === 'injected');
    if (connector) connect({ connector });
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
      
      setTimeout(() => refetchAllowance(), 3000);
      setStatus("idle");
      
    } catch (error: any) {
      setStatus("error");
      setErrorMsg(error.message || "Approval failed");
    }
  };

  const handleCheckin = async () => {
    if (!isConnected) {
      setErrorMsg("Please connect your wallet first!");
      return;
    }

    setStatus("depositing");
    setErrorMsg("");

    try {
      await writeContractAsync({
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

  const registerCheckin = async (txHash: string) => {
    try {
      const res = await fetch("https://xtaskai.com/base-mini-app/api/checkin.php", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_wallet: address,
          amount: CHECKIN_FEE,
          tx_hash: txHash
        })
      });

      const data = await res.json();
      
      if (data.success) {
        setStatus("success");
        setTimeout(() => {
          window.location.href = "https://xtaskai.com/base-mini-app/quests.php?success=Check-in+successful!+100+XTP";
        }, 2000);
      } else {
        setStatus("error");
        setErrorMsg(data.error || "Failed to register checkin");
      }
    } catch (error) {
      setStatus("error");
      setErrorMsg("Failed to register checkin");
    }
  };

  useEffect(() => {
    if (isConfirmed && hash) {
      registerCheckin(hash);
    }
  }, [isConfirmed, hash]);

  if (!isConnected) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="text-center max-w-md w-full bg-white rounded-2xl shadow-lg p-8">
          <div className="text-5xl mb-4">📅</div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Connect Wallet</h2>
          <p className="text-gray-500 mb-6">Connect your wallet to check-in</p>
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
              {address?.slice(0, 8)}...{address?.slice(-6)}
            </span>
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
            disabled={isPending || status === "approving"}
            className="w-full bg-yellow-500 hover:bg-yellow-600 text-white font-semibold py-3 rounded-xl transition disabled:opacity-50"
          >
            {status === "approving" ? "Approving..." : "Approve USDC"}
          </button>
        ) : (
          <button
            onClick={handleCheckin}
            disabled={isPending || status === "depositing" || isConfirming}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-xl transition disabled:opacity-50"
          >
            {status === "depositing" || isConfirming ? (
              <span className="flex items-center justify-center gap-2">
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Processing...
              </span>
            ) : (
              "Pay 0.001 USDC & Check-in"
            )}
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