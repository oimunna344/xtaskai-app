"use client";

import { useState, useEffect } from "react";
import { useAccount, useWriteContract } from "wagmi";
import { parseUnits } from "viem";
import { adminWithdraw } from "@/app/lib/contract";

// Contract ABI (adminWithdraw function)
const CONTRACT_ABI = [
  {
    type: "function",
    name: "adminWithdraw",
    inputs: [
      { name: "user", type: "address" },
      { name: "amount", type: "uint256" }
    ],
    outputs: [],
    stateMutability: "nonpayable"
  }
] as const;

const CONTRACT_ADDRESS = "0x0f50aD6a61434CbE672Ec50009ED3EC0181731b0";

export default function AdminWithdrawPage() {
  const { address, isConnected } = useAccount();
  const [withdrawRequests, setWithdrawRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState<number | null>(null);
  const [message, setMessage] = useState<{ type: string; text: string } | null>(null);

  const { writeContractAsync } = useWriteContract();

  // Check if connected wallet is admin
  const isAdmin = address?.toLowerCase() === "0x48d8d23f5463f83954558ef5d54c8bee6251ee45".toLowerCase();

  // Fetch pending withdraw requests
  const fetchRequests = async () => {
    try {
      const res = await fetch("https://xtaskai.com/base-mini-app/api/get_withdraw_requests.php");
      const data = await res.json();
      if (data.success) {
        setWithdrawRequests(data.requests);
      }
    } catch (error) {
      console.error("Failed to fetch requests:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, []);

  // Handle approve and withdraw
  const handleApprove = async (request: any) => {
    if (!isConnected) {
      setMessage({ type: "error", text: "Please connect your admin wallet first!" });
      return;
    }

    if (!isAdmin) {
      setMessage({ type: "error", text: "You are not authorized! Only admin can approve withdrawals." });
      return;
    }

    setProcessing(request.id);
    setMessage(null);

    try {
      const amountInWei = parseUnits(request.net_amount.toString(), 6);
      
      const tx = await writeContractAsync({
        address: CONTRACT_ADDRESS,
        abi: CONTRACT_ABI,
        functionName: "adminWithdraw",
        args: [request.wallet_address, amountInWei],
      });

      // Update status in PHP database
      await fetch("https://xtaskai.com/base-mini-app/api/update_withdraw_status.php", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: request.id,
          status: "approved",
          tx_hash: tx
        })
      });

      setMessage({ type: "success", text: `✅ Withdrawal approved! ${request.net_amount} USDC sent. TX: ${tx.slice(0, 10)}...` });
      
      // Refresh list
      setTimeout(fetchRequests, 2000);
      
    } catch (error: any) {
      console.error("Withdraw error:", error);
      setMessage({ type: "error", text: error.message || "Transaction failed!" });
    } finally {
      setProcessing(null);
    }
  };

  const handleReject = async (id: number) => {
    if (!confirm("Reject this withdrawal request?")) return;
    
    try {
      const res = await fetch("https://xtaskai.com/base-mini-app/api/update_withdraw_status.php", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, status: "rejected" })
      });
      
      const data = await res.json();
      if (data.success) {
        setMessage({ type: "success", text: "Withdrawal rejected!" });
        fetchRequests();
      }
    } catch (error) {
      setMessage({ type: "error", text: "Failed to reject!" });
    }
  };

  if (!isConnected) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-600 to-pink-500">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-white mb-6">Admin Panel</h1>
          <p className="text-white mb-4">Please connect your admin wallet</p>
          <button className="bg-white text-purple-600 px-8 py-3 rounded-full font-semibold">
            Connect Wallet
          </button>
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-600 to-pink-500">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-white mb-6">Access Denied</h1>
          <p className="text-white">This wallet is not authorized as admin.</p>
          <p className="text-white/70 text-sm mt-4">Connected: {address}</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-600 to-pink-500">
        <div className="text-white text-xl">Loading withdrawal requests...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-600 to-pink-500 p-8">
      <div className="max-w-6xl mx-auto">
        <div className="bg-white/20 backdrop-blur-lg rounded-2xl p-8 mb-6">
          <h1 className="text-3xl font-bold text-white mb-2">Admin Withdraw Panel</h1>
          <p className="text-white/80">Approve or reject withdrawal requests</p>
          <p className="text-white/60 text-sm mt-2">Admin Wallet: {address}</p>
        </div>

        {message && (
          <div className={`mb-6 p-4 rounded-xl ${
            message.type === "success" ? "bg-green-500/20 border border-green-500" : "bg-red-500/20 border border-red-500"
          }`}>
            <p className={message.type === "success" ? "text-green-400" : "text-red-400"}>{message.text}</p>
          </div>
        )}

        {withdrawRequests.length === 0 ? (
          <div className="bg-white/20 backdrop-blur-lg rounded-2xl p-12 text-center">
            <div className="text-6xl mb-4">💰</div>
            <h2 className="text-2xl text-white mb-2">No Pending Withdrawals</h2>
            <p className="text-white/70">All withdrawal requests have been processed</p>
          </div>
        ) : (
          <div className="space-y-4">
            {withdrawRequests.map((req) => (
              <div key={req.id} className="bg-white/20 backdrop-blur-lg rounded-2xl p-6">
                <div className="flex justify-between items-start flex-wrap gap-4">
                  <div>
                    <div className="text-white/70 text-sm mb-1">Request #{req.id}</div>
                    <div className="text-white font-mono text-sm mb-3">User: {req.wallet_address?.slice(0, 10)}...{req.wallet_address?.slice(-8)}</div>
                    <div className="flex gap-6">
                      <div>
                        <div className="text-white/50 text-xs">Requested</div>
                        <div className="text-orange-400 font-bold text-xl">${parseFloat(req.amount).toFixed(4)} USDC</div>
                      </div>
                      <div>
                        <div className="text-white/50 text-xs">Fee (5%)</div>
                        <div className="text-yellow-400">${parseFloat(req.fee).toFixed(4)}</div>
                      </div>
                      <div>
                        <div className="text-white/50 text-xs">Net to Send</div>
                        <div className="text-green-400 font-bold text-xl">${parseFloat(req.net_amount).toFixed(4)} USDC</div>
                      </div>
                    </div>
                    <div className="text-white/40 text-xs mt-2">
                      {new Date(req.created_at).toLocaleString()}
                    </div>
                  </div>
                  
                  <div className="flex gap-3">
                    <button
                      onClick={() => handleApprove(req)}
                      disabled={processing === req.id}
                      className="bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-xl font-semibold transition disabled:opacity-50"
                    >
                      {processing === req.id ? "Processing..." : "✅ Approve & Send"}
                    </button>
                    <button
                      onClick={() => handleReject(req.id)}
                      disabled={processing === req.id}
                      className="bg-red-600 hover:bg-red-700 text-white px-6 py-3 rounded-xl font-semibold transition disabled:opacity-50"
                    >
                      ❌ Reject
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}