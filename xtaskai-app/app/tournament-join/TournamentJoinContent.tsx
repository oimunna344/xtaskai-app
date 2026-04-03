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

export default function TournamentJoinContent() {
  const searchParams = useSearchParams();
  const { address, isConnected } = useAccount();
  const { connect, connectors } = useConnect();
  const { writeContractAsync, data: approveHash, isPending: isApprovePending } = useWriteContract();
  const { writeContractAsync: writeDeposit, data: depositHash, isPending: isDepositPending } = useWriteContract();
  const { isLoading: isApproveConfirming, isSuccess: isApproveConfirmed } = useWaitForTransactionReceipt({ hash: approveHash });
  const { isLoading: isDepositConfirming, isSuccess: isDepositConfirmed } = useWaitForTransactionReceipt({ hash: depositHash });
  
  const tournamentId = searchParams.get("id");
  const entryFee = searchParams.get("fee");
  const gameType = searchParams.get("game_type") || "solo";
  
  const [status, setStatus] = useState<"idle" | "approving" | "depositing" | "success" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const [needsApproval, setNeedsApproval] = useState(false);
  const [showPlayerForm, setShowPlayerForm] = useState(true);
  const [playerNames, setPlayerNames] = useState<string[]>([]);

  const PLATFORM_FEE = 0.003;
  const amountInWei = parseUnits(PLATFORM_FEE.toString(), 6);

  useEffect(() => {
    if (!tournamentId) {
      setErrorMsg("No tournament data found. Please go back and try again.");
    }
  }, [tournamentId]);

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
      
    } catch (error: any) {
      setStatus("error");
      setErrorMsg(error.message || "Approval failed");
    }
  };

  const handlePayPlatformFee = async () => {
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

  const registerJoin = async (txHash: string) => {
    if (!tournamentId) {
      setStatus("error");
      setErrorMsg("No tournament data found");
      return;
    }

    try {
      const res = await fetch("https://xtaskai.com/base-mini-app/join-tournament.php", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_wallet: address,
          tournament_id: parseInt(tournamentId),
          player_names: playerNames,
          tx_hash: txHash,
          platform_fee: PLATFORM_FEE,
          entry_fee: parseFloat(entryFee || "0")
        })
      });

      const data = await res.json();
      
      if (data.success) {
        setStatus("success");
        setTimeout(() => {
          window.location.href = `https://xtaskai.com/base-mini-app/tournaments.php?success=joined`;
        }, 2000);
      } else {
        setStatus("error");
        setErrorMsg(data.error || "Failed to join tournament");
      }
    } catch (error) {
      setStatus("error");
      setErrorMsg("Failed to join tournament");
    }
  };

  useEffect(() => {
    if (isDepositConfirmed && depositHash) {
      registerJoin(depositHash);
    }
  }, [isDepositConfirmed, depositHash]);

  useEffect(() => {
    if (isApproveConfirmed) {
      refetchAllowance();
      setStatus("idle");
    }
  }, [isApproveConfirmed, refetchAllowance]);

  // Not connected
  if (!isConnected) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="text-center max-w-md w-full bg-white rounded-2xl shadow-lg p-8">
          <div className="text-5xl mb-4">🏆</div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Connect Wallet</h2>
          <p className="text-gray-500 mb-6">Connect your wallet to join tournament</p>
          <button onClick={handleConnect} className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-xl transition">
            Connect Wallet
          </button>
        </div>
      </div>
    );
  }

  // Success
  if (status === "success") {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="text-center max-w-md w-full bg-white rounded-2xl shadow-lg p-8">
          <div className="text-6xl mb-4">✅</div>
          <h2 className="text-2xl font-bold text-green-600 mb-2">Tournament Joined!</h2>
          <p className="text-gray-600">You have successfully joined the tournament.</p>
          <p className="text-gray-400 text-sm mt-4">Redirecting back...</p>
        </div>
      </div>
    );
  }

  // No tournament data
  if (!tournamentId) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="text-center max-w-md w-full bg-white rounded-2xl shadow-lg p-8">
          <div className="text-6xl mb-4">❌</div>
          <h2 className="text-2xl font-bold text-red-600 mb-2">No Tournament Data</h2>
          <p className="text-gray-600 mb-6">{errorMsg || "Please go back and try again."}</p>
          <button
            onClick={() => window.location.href = "https://xtaskai.com/base-mini-app/tournaments.php"}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-xl transition"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  // Player Name Form
  if (showPlayerForm) {
    const playerCount = gameType === 'squad' ? 4 : 1;
    
    const handleSubmitNames = () => {
      const names: string[] = [];
      for(let i = 1; i <= playerCount; i++) {
        const input = document.getElementById(`player_${i}`) as HTMLInputElement;
        if(!input || !input.value.trim()) {
          alert(`Please enter Player ${i} name`);
          return;
        }
        names.push(input.value.trim());
      }
      setPlayerNames(names);
      setShowPlayerForm(false);
    };

    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-lg p-8">
          <div className="text-center">
            <div className="text-5xl mb-4">🏆</div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Join Tournament</h1>
            <p className="text-gray-500 mb-6">Enter your player name(s)</p>
          </div>

          <div className="bg-blue-50 rounded-xl p-3 mb-4">
            <div className="text-sm text-blue-800">
              💡 Game Type: <strong>{gameType === 'squad' ? 'Squad (4 Players)' : 'Solo (1 Player)'}</strong>
            </div>
          </div>

          {Array.from({ length: playerCount }).map((_, i) => (
            <div key={i} className="mb-4">
              <label className="block text-gray-700 font-medium mb-2">Player {i + 1} Name</label>
              <input
                type="text"
                id={`player_${i + 1}`}
                className="w-full p-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter in-game name"
              />
            </div>
          ))}

          <div className="bg-gray-50 rounded-xl p-3 mb-4">
            <div className="text-sm text-gray-600">
              💰 Entry Fee: <strong className="text-orange-600">${entryFee} USDC</strong> (from App Balance)<br/>
              💰 Platform Fee: <strong className="text-orange-600">0.003 USDC</strong> (from Wallet)
            </div>
          </div>

          <button
            onClick={handleSubmitNames}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-xl transition"
          >
            Continue to Payment
          </button>

          <button
            onClick={() => window.location.href = "https://xtaskai.com/base-mini-app/tournaments.php"}
            className="w-full mt-3 text-gray-500 text-sm py-2 hover:text-gray-700 transition"
          >
            Cancel
          </button>
        </div>
      </div>
    );
  }

  // Payment Page
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-lg p-8">
        <div className="text-center">
          <div className="text-5xl mb-4">🏆</div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Pay Platform Fee</h1>
          <p className="text-gray-500 mb-6">Pay 0.003 USDC to complete tournament join</p>
        </div>

        <div className="bg-gray-50 rounded-xl p-4 mb-6">
          <div className="mb-3 pb-2 border-b border-gray-200">
            <div className="text-sm text-gray-500">Tournament ID</div>
            <div className="font-semibold text-gray-900">#{tournamentId}</div>
          </div>
          <div className="mb-3 pb-2 border-b border-gray-200">
            <div className="text-sm text-gray-500">Game Type</div>
            <div className="font-semibold text-gray-900">{gameType === 'squad' ? 'Squad (4 Players)' : 'Solo (1 Player)'}</div>
          </div>
          <div className="mb-3 pb-2 border-b border-gray-200">
            <div className="text-sm text-gray-500">Players</div>
            <div className="font-semibold text-gray-900">{playerNames.join(", ")}</div>
          </div>
          <div className="mb-3 pb-2 border-b border-gray-200">
            <div className="text-sm text-gray-500">Entry Fee</div>
            <div className="font-semibold text-blue-600">${entryFee} USDC (from App Balance)</div>
          </div>
          <div className="mb-3">
            <div className="text-sm text-gray-500">Platform Fee (from MetaMask Wallet)</div>
            <div className="font-semibold text-orange-500">0.003 USDC</div>
          </div>
          <div className="mt-2 text-center text-xs text-gray-400">
            💡 You will also earn <strong className="text-purple-600">+50 XTP</strong> for joining!
          </div>
        </div>

        <div className="bg-blue-50 rounded-xl p-3 mb-4">
          <div className="text-sm text-blue-800">
            💡 After paying the platform fee, entry fee will be deducted from your App Balance.
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
            onClick={handlePayPlatformFee}
            disabled={isDepositPending || status === "depositing" || isDepositConfirming}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-xl transition disabled:opacity-50"
          >
            {status === "depositing" || isDepositPending || isDepositConfirming ? (
              <span className="flex items-center justify-center gap-2">
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Processing...
              </span>
            ) : (
              "Pay 0.003 USDC & Join Tournament"
            )}
          </button>
        )}

        <button
          onClick={() => setShowPlayerForm(true)}
          className="w-full mt-3 text-gray-500 text-sm py-2 hover:text-gray-700 transition"
        >
          Back
        </button>
      </div>
    </div>
  );
}