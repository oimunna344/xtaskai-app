"use client";

import { useState, useEffect, useRef } from "react";
import { useSearchParams } from "next/navigation";
import { createPublicClient, createWalletClient, custom, parseUnits, encodeFunctionData } from "viem";
import { base } from "viem/chains";

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

const PLATFORM_FEE = 0.003;

export default function TournamentJoinContent() {
  const searchParams = useSearchParams();

  const tournamentId = searchParams.get("id");
  const entryFee = searchParams.get("fee");
  const gameType = searchParams.get("game_type") || "solo";
  const playersParam = searchParams.get("players");

  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [playerNames, setPlayerNames] = useState<string[]>([]);
  const [status, setStatus] = useState<"connecting" | "idle" | "approving" | "depositing" | "success" | "error">("connecting");
  const [errorMsg, setErrorMsg] = useState("");
  const [needsApproval, setNeedsApproval] = useState(true);
  const providerRef = useRef<any>(null);

  const amountInUnits = parseUnits(PLATFORM_FEE.toString(), 6);

  // Parse player names from URL
  useEffect(() => {
    if (playersParam) {
      try {
        const names = JSON.parse(decodeURIComponent(playersParam));
        setPlayerNames(names);
      } catch {
        setErrorMsg("Invalid player names data. Please go back and try again.");
      }
    } else {
      setErrorMsg("Player names not found. Please go back and try again.");
    }
  }, [playersParam]);

  // Auto-connect on mount
  useEffect(() => {
    connectWallet();
  }, []);

  async function connectWallet() {
    try {
      setStatus("connecting");
      const sdk = (await import("@farcaster/frame-sdk")).default;
      await sdk.actions.ready();
      const provider = sdk.wallet.ethProvider;
      providerRef.current = provider;

      const accounts: string[] = await provider.request({ method: "eth_requestAccounts" });
      if (!accounts || accounts.length === 0) throw new Error("No wallet found");

      setWalletAddress(accounts[0]);
      await checkAllowance(accounts[0], provider);
      setStatus("idle");
    } catch (err: any) {
      setErrorMsg(err?.message || "Failed to connect wallet");
      setStatus("error");
    }
  }

  async function checkAllowance(owner: string, provider: any) {
    try {
      const publicClient = createPublicClient({ chain: base, transport: custom(provider) });
      const allowance = await publicClient.readContract({
        address: USDC_ADDRESS,
        abi: USDC_ABI,
        functionName: "allowance",
        args: [owner as `0x${string}`, CONTRACT_ADDRESS as `0x${string}`],
      });
      setNeedsApproval(allowance < amountInUnits);
    } catch {
      setNeedsApproval(true);
    }
  }

  async function switchToBase() {
    try {
      await providerRef.current.request({
        method: "wallet_switchEthereumChain",
        params: [{ chainId: "0x2105" }],
      });
    } catch (err: any) {
      if (err.code === 4902) {
        await providerRef.current.request({
          method: "wallet_addEthereumChain",
          params: [{
            chainId: "0x2105",
            chainName: "Base",
            nativeCurrency: { name: "ETH", symbol: "ETH", decimals: 18 },
            rpcUrls: ["https://mainnet.base.org"],
            blockExplorerUrls: ["https://basescan.org"],
          }],
        });
      } else throw err;
    }
  }

  async function handleApprove() {
    if (!walletAddress || !providerRef.current) return;
    setStatus("approving");
    setErrorMsg("");
    try {
      await switchToBase();
      const walletClient = createWalletClient({ chain: base, transport: custom(providerRef.current) });
      const publicClient = createPublicClient({ chain: base, transport: custom(providerRef.current) });

      const tx = await walletClient.sendTransaction({
        account: walletAddress as `0x${string}`,
        to: USDC_ADDRESS as `0x${string}`,
        data: encodeFunctionData({
          abi: USDC_ABI,
          functionName: "approve",
          args: [CONTRACT_ADDRESS as `0x${string}`, amountInUnits],
        }),
      });

      await publicClient.waitForTransactionReceipt({ hash: tx });
      setNeedsApproval(false);
      setStatus("idle");
    } catch (err: any) {
      setErrorMsg(err?.message || "Approval failed");
      setStatus("error");
    }
  }

  async function handlePayPlatformFee() {
    if (!walletAddress || !providerRef.current) return;
    setStatus("depositing");
    setErrorMsg("");
    try {
      await switchToBase();
      const walletClient = createWalletClient({ chain: base, transport: custom(providerRef.current) });
      const publicClient = createPublicClient({ chain: base, transport: custom(providerRef.current) });

      const tx = await walletClient.sendTransaction({
        account: walletAddress as `0x${string}`,
        to: CONTRACT_ADDRESS as `0x${string}`,
        data: encodeFunctionData({
          abi: CONTRACT_ABI,
          functionName: "deposit",
          args: [amountInUnits],
        }),
      });

      await publicClient.waitForTransactionReceipt({ hash: tx });
      await registerJoin(tx);
    } catch (err: any) {
      setErrorMsg(err?.message || "Transaction failed");
      setStatus("error");
    }
  }

  async function registerJoin(txHash: string) {
    if (!tournamentId || playerNames.length === 0) {
      setErrorMsg("Missing tournament data");
      setStatus("error");
      return;
    }
    try {
      const res = await fetch("https://xtaskai.com/base-mini-app/join-tournament.php", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_wallet: walletAddress,
          tournament_id: parseInt(tournamentId),
          player_names: playerNames,
          tx_hash: txHash,
          entry_fee: parseFloat(entryFee || "0"),
          platform_fee: PLATFORM_FEE,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setStatus("success");
        setTimeout(() => {
          window.location.href = "https://xtaskai.com/base-mini-app/tournaments.php?success=joined";
        }, 2000);
      } else {
        setErrorMsg(data.error || "Failed to join tournament");
        setStatus("error");
      }
    } catch {
      setErrorMsg("Failed to join tournament");
      setStatus("error");
    }
  }

  // Connecting state
  if (status === "connecting") {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-500 border-t-transparent mx-auto mb-4" />
          <p className="text-gray-500">Connecting wallet...</p>
        </div>
      </div>
    );
  }

  // Success state
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

  // Missing data state
  if (!tournamentId || playerNames.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="text-center max-w-md w-full bg-white rounded-2xl shadow-lg p-8">
          <div className="text-6xl mb-4">❌</div>
          <h2 className="text-2xl font-bold text-red-600 mb-2">Missing Information</h2>
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

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-lg p-8">
        <div className="text-center">
          <div className="text-5xl mb-4">🏆</div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Join Tournament</h1>
          <p className="text-gray-500 mb-6">Pay platform fee to join</p>
        </div>

        <div className="bg-gray-50 rounded-xl p-4 mb-6">
          <div className="mb-3 pb-2 border-b border-gray-200">
            <div className="text-sm text-gray-500">Tournament ID</div>
            <div className="font-semibold text-gray-900">#{tournamentId}</div>
          </div>
          <div className="mb-3 pb-2 border-b border-gray-200">
            <div className="text-sm text-gray-500">Game Type</div>
            <div className="font-semibold text-gray-900">{gameType === "squad" ? "Squad" : "Solo"}</div>
          </div>
          <div className="mb-3 pb-2 border-b border-gray-200">
            <div className="text-sm text-gray-500">Players</div>
            <div className="font-semibold text-gray-900">{playerNames.join(", ")}</div>
          </div>
          <div className="mb-3 pb-2 border-b border-gray-200">
            <div className="text-sm text-gray-500">Entry Fee</div>
            <div className="font-semibold text-blue-600">${entryFee} USDC (from App Balance)</div>
          </div>
          <div className="mb-3 pb-2 border-b border-gray-200">
            <div className="text-sm text-gray-500">Platform Fee (from Farcaster Wallet)</div>
            <div className="font-semibold text-orange-500">0.003 USDC</div>
          </div>
          <div className="mt-2">
            <div className="text-sm text-gray-500">Your Wallet</div>
            <div className="font-mono text-sm text-gray-600">
              {walletAddress ? `${walletAddress.slice(0, 8)}...${walletAddress.slice(-6)}` : "—"}
            </div>
          </div>
          <div className="mt-2 text-center text-xs text-gray-400">
            💡 You will earn <strong className="text-purple-600">+50 XTP</strong> for joining!
          </div>
        </div>

        <div className="bg-blue-50 rounded-xl p-3 mb-4">
          <div className="text-sm text-blue-800">
            💡 After paying the platform fee, entry fee will be deducted from your App Balance.
          </div>
        </div>

        {status === "error" && errorMsg && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
            <p className="text-red-600 text-sm">{errorMsg}</p>
            <button onClick={connectWallet} className="text-blue-500 text-xs mt-1 underline">
              Retry connection
            </button>
          </div>
        )}

        {needsApproval ? (
          <button
            onClick={handleApprove}
            disabled={status === "approving"}
            className="w-full bg-yellow-500 hover:bg-yellow-600 text-white font-semibold py-3 rounded-xl transition disabled:opacity-50"
          >
            {status === "approving" ? (
              <span className="flex items-center justify-center gap-2">
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Approving...
              </span>
            ) : "Approve USDC"}
          </button>
        ) : (
          <button
            onClick={handlePayPlatformFee}
            disabled={status === "depositing"}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-xl transition disabled:opacity-50"
          >
            {status === "depositing" ? (
              <span className="flex items-center justify-center gap-2">
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Processing...
              </span>
            ) : "Pay 0.003 USDC & Join Tournament"}
          </button>
        )}

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