// app/admin/withdraw/page.tsx
"use client";

import { useState, useEffect } from "react";
import { useAccount, useWriteContract } from "wagmi";
import { parseUnits } from "viem";

const CONTRACT_ADDRESS = "0x0f50aD6a61434CbE672Ec50009ED3EC0181731b0";
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

interface WithdrawRequest {
  id: number;
  user_id: number;
  username: string;
  email: string;
  amount: number;
  fee: number;
  net_amount: number;
  wallet_address: string;
  status: string;
  created_at: string;
}

export default function AdminWithdrawPage() {
  const { address, isConnected } = useAccount();
  const { writeContractAsync } = useWriteContract();
  
  const [requests, setRequests] = useState<WithdrawRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<number | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const isAdmin = address?.toLowerCase() === "0x48d8d23f5463f83954558ef5d54c8bee6251ee45".toLowerCase();

  const fetchRequests = async () => {
    setLoading(true);
    try {
      const res = await fetch("https://xtaskai.com/base-mini-app/api/get_withdraw_requests.php");
      const data = await res.json();
      if (data.success) {
        setRequests(data.requests);
      }
    } catch (error) {
      console.error("Failed to fetch:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, []);

  const handleApprove = async (request: WithdrawRequest) => {
    if (!isConnected) {
      setMessage({ type: "error", text: "Please connect your admin wallet first!" });
      return;
    }
    if (!isAdmin) {
      setMessage({ type: "error", text: "You are not authorized!" });
      return;
    }

    setProcessingId(request.id);
    setMessage(null);

    try {
      const amountInWei = parseUnits(request.net_amount.toString(), 6);
      
      const tx = await writeContractAsync({
        address: CONTRACT_ADDRESS,
        abi: CONTRACT_ABI,
        functionName: "adminWithdraw",
        args: [request.wallet_address as `0x${string}`, amountInWei],
      });

      await fetch("https://xtaskai.com/base-mini-app/api/update_withdraw_status.php", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: request.id,
          status: "approved",
          tx_hash: tx
        })
      });

      setMessage({ type: "success", text: `✅ Approved! ${request.net_amount} USDC sent.` });
      fetchRequests();
      
    } catch (error: any) {
      setMessage({ type: "error", text: error.message || "Transaction failed!" });
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = async (id: number) => {
    if (!confirm("Reject this withdrawal?")) return;
    
    try {
      await fetch("https://xtaskai.com/base-mini-app/api/update_withdraw_status.php", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, status: "rejected" })
      });
      setMessage({ type: "success", text: "Withdrawal rejected!" });
      fetchRequests();
    } catch (error) {
      setMessage({ type: "error", text: "Failed to reject!" });
    }
  };

  const stats = {
    total: requests.length,
    pending: requests.filter(r => r.status === "pending").length,
    completed: requests.filter(r => r.status === "approved").length
  };

  const pendingRequests = requests.filter(r => r.status === "pending");

  if (!isConnected) {
    return <ConnectWalletPrompt />;
  }

  if (!isAdmin) {
    return <UnauthorizedAccess address={address} />;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-8">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
              📋 Admin Withdraw Panel
            </h1>
            <p className="text-gray-500 mt-1">
              Manage and approve withdrawal requests
            </p>
            <div className="flex items-center gap-2 mt-2">
              <div className="bg-gray-100 text-gray-600 px-3 py-1 rounded-full text-xs font-mono">
                {address?.slice(0, 6)}...{address?.slice(-4)}
              </div>
              <span className="text-xs text-green-600 bg-green-100 px-2 py-1 rounded-full">
                👑 Admin
              </span>
            </div>
          </div>
          
          <button
            onClick={fetchRequests}
            className="mt-4 sm:mt-0 inline-flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 text-sm font-medium rounded-lg transition shadow-sm"
          >
            🔄 Refresh
          </button>
        </div>

        {/* Message Toast */}
        {message && (
          <div className={`mb-6 p-4 rounded-lg border-l-4 ${
            message.type === "success" 
              ? "bg-green-50 border-green-500 text-green-800" 
              : "bg-red-50 border-red-500 text-red-800"
          }`}>
            <p className="text-sm">{message.text}</p>
          </div>
        )}

        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-8">
          <StatCard title="Total Requests" value={stats.total} emoji="📊" color="blue" />
          <StatCard title="Pending Requests" value={stats.pending} emoji="⏳" color="yellow" />
          <StatCard title="Completed Requests" value={stats.completed} emoji="✅" color="green" />
        </div>

        {/* Withdrawals Table */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
            <h2 className="text-lg font-semibold text-gray-900">
              💰 Pending Withdrawals
            </h2>
            <p className="text-sm text-gray-500 mt-0.5">
              Approve or reject withdrawal requests
            </p>
          </div>

          {loading ? (
            <div className="flex justify-center items-center py-16">
              <div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-500 border-t-transparent"></div>
            </div>
          ) : pendingRequests.length === 0 ? (
            <EmptyState />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">👤 User</th>
                    <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">🔗 Wallet Address</th>
                    <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">💰 Amount</th>
                    <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">📌 Status</th>
                    <th className="text-right px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">⚡ Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {pendingRequests.map((request) => (
                    <tr key={request.id} className="hover:bg-gray-50 transition">
                      <td className="px-6 py-4">
                        <div>
                          <div className="font-medium text-gray-900">{request.username || "User"}</div>
                          <div className="text-xs text-gray-400">ID: #{request.id}</div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="font-mono text-sm text-gray-600">
                          {request.wallet_address?.slice(0, 8)}...{request.wallet_address?.slice(-6)}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div>
                          <span className="font-semibold text-gray-900">
                            ${request.amount?.toFixed(4)}
                          </span>
                          <div className="text-xs text-gray-400">
                            Fee: ${request.fee?.toFixed(4)} | Net: ${request.net_amount?.toFixed(4)}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-700">
                          ⏳ Pending
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex justify-end gap-2">
                          <button
                            onClick={() => handleApprove(request)}
                            disabled={processingId === request.id}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white text-xs font-medium rounded-lg transition disabled:opacity-50 shadow-sm"
                          >
                            {processingId === request.id ? (
                              <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                            ) : (
                              "✅"
                            )}
                            Approve
                          </button>
                          <button
                            onClick={() => handleReject(request.id)}
                            disabled={processingId === request.id}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white text-xs font-medium rounded-lg transition disabled:opacity-50 shadow-sm"
                          >
                            ❌ Reject
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ========== Subcomponents ==========

function ConnectWalletPrompt() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="text-center max-w-md">
        <div className="w-16 h-16 bg-blue-100 rounded-2xl flex items-center justify-center mx-auto mb-4 text-3xl">
          🔌
        </div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Connect Wallet</h2>
        <p className="text-gray-500 mb-6">Please connect your admin wallet to continue</p>
        <button className="px-6 py-3 bg-blue-600 text-white rounded-lg font-medium shadow-sm hover:shadow-md transition">
          Connect Wallet
        </button>
      </div>
    </div>
  );
}

function UnauthorizedAccess({ address }: { address?: string }) {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="text-center max-w-md">
        <div className="w-16 h-16 bg-red-100 rounded-2xl flex items-center justify-center mx-auto mb-4 text-3xl">
          ⛔
        </div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Access Denied</h2>
        <p className="text-gray-500 mb-2">This wallet is not authorized as admin.</p>
        <p className="text-sm text-gray-400 font-mono">{address}</p>
      </div>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="py-16 text-center">
      <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4 text-3xl">
        🎉
      </div>
      <h3 className="text-lg font-medium text-gray-900 mb-1">No Pending Withdrawals</h3>
      <p className="text-gray-500 text-sm">All withdrawal requests have been processed</p>
    </div>
  );
}

function StatCard({ title, value, emoji, color }: { 
  title: string; 
  value: number; 
  emoji: string;
  color: 'blue' | 'yellow' | 'green';
}) {
  const colorClasses = {
    blue: 'bg-blue-50 text-blue-600',
    yellow: 'bg-yellow-50 text-yellow-600',
    green: 'bg-green-50 text-green-600'
  };
  
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-500 font-medium">{title}</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
        </div>
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-xl ${colorClasses[color]}`}>
          {emoji}
        </div>
      </div>
    </div>
  );
}