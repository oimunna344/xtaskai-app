"use client";

import { useState, useEffect } from "react";
import { useAccount, useConnect, useWriteContract, useReadContract } from "wagmi";
import { parseUnits } from "viem";
import { injected } from "wagmi/connectors";
import sdk from "@farcaster/frame-sdk";

const CONTRACT_ADDRESS = "0x0f50aD6a61434CbE672Ec50009ED3EC0181731b0" as `0x${string}`;
const USDC_ADDRESS = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913" as `0x${string}`;

const USDC_ABI = [
  { type: "function", name: "approve", inputs: [{ name: "spender", type: "address" }, { name: "amount", type: "uint256" }], outputs: [{ type: "bool" }], stateMutability: "nonpayable" },
  { type: "function", name: "balanceOf", inputs: [{ name: "account", type: "address" }], outputs: [{ type: "uint256" }], stateMutability: "view" },
  { type: "function", name: "allowance", inputs: [{ name: "owner", type: "address" }, { name: "spender", type: "address" }], outputs: [{ type: "uint256" }], stateMutability: "view" },
] as const;

const CONTRACT_ABI = [
  { type: "function", name: "deposit", inputs: [{ name: "amount", type: "uint256" }], outputs: [], stateMutability: "nonpayable" },
] as const;

const QUICK_AMOUNTS = [0.5, 1, 5, 10];

export default function DepositPage() {
  const { address, isConnected } = useAccount();
  const { connect } = useConnect();
  const [amount, setAmount] = useState("1");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [step, setStep] = useState<"idle" | "approving" | "depositing" | "done">("idle");

  const { writeContract: writeApprove, isPending: isApprovePending } = useWriteContract();
  const { writeContract: writeDeposit, isPending: isDepositPending } = useWriteContract();
  const isPending = isApprovePending || isDepositPending;

  const { data: usdcBalance, refetch: refetchBalance } = useReadContract({
    address: USDC_ADDRESS, abi: USDC_ABI,
    functionName: "balanceOf",
    args: address ? [address] : undefined,
    query: { enabled: !!address },
  });

  const { data: allowance, refetch: refetchAllowance } = useReadContract({
    address: USDC_ADDRESS, abi: USDC_ABI,
    functionName: "allowance",
    args: address ? [address, CONTRACT_ADDRESS] : undefined,
    query: { enabled: !!address },
  });

  const balance = usdcBalance !== undefined ? Number(usdcBalance) / 1e6 : null;
  const needsApproval = allowance !== undefined && allowance < parseUnits(amount || "0", 6);

  // Farcaster SDK ready + injected connect
  useEffect(() => {
    const init = async () => {
      try {
        await sdk.actions.ready();
      } catch (e) {
        console.log("SDK:", e);
      }
      if (!isConnected) {
        connect({ connector: injected() });
      }
      setLoading(false);
    };
    init();
  }, []);

  const handleApprove = () => {
    if (!address || !amount) return;
    setStep("approving");
    setError("");
    writeApprove({
      address: USDC_ADDRESS, abi: USDC_ABI,
      functionName: "approve",
      args: [CONTRACT_ADDRESS, parseUnits(amount, 6)],
    }, {
      onSuccess: () => setTimeout(() => { refetchAllowance(); setStep("idle"); }, 3000),
      onError: (e) => { setError(e.message?.includes("rejected") ? "Transaction cancelled" : "Approval failed"); setStep("idle"); },
    });
  };

  const handleDeposit = () => {
    if (!address) return;
    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) { setError("Enter valid amount"); return; }
    if (balance !== null && numAmount > balance) { setError(`Insufficient balance. You have ${balance.toFixed(2)} USDC`); return; }
    setStep("depositing");
    setError("");
    writeDeposit({
      address: CONTRACT_ADDRESS, abi: CONTRACT_ABI,
      functionName: "deposit",
      args: [parseUnits(amount, 6)],
    }, {
      onSuccess: async (hash) => {
        try {
          await fetch("https://xtaskai.com/base-mini-app/api/update_balance.php", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ wallet: address, amount: numAmount, tx_hash: hash }),
          });
        } catch (e) { console.log("API error:", e); }
        setStep("done");
        setTimeout(() => {
          window.location.href = `https://xtaskai.com/base-mini-app/dashboard.php?wallet=${address}&tx=${hash}`;
        }, 1500);
      },
      onError: (e) => { setError(e.message?.includes("rejected") ? "Transaction cancelled" : "Transaction failed"); setStep("idle"); },
    });
  };

  if (loading) {
    return (
      <div style={styles.bg}>
        <div style={styles.card}>
          <div style={styles.logo}>⬡</div>
          <p style={styles.loadingText}>Connecting wallet...</p>
          <div style={styles.spinner} />
        </div>
      </div>
    );
  }

  if (!isConnected) {
    return (
      <div style={styles.bg}>
        <div style={styles.card}>
          <div style={styles.logo}>⬡</div>
          <h1 style={styles.title}>XTaskAI</h1>
          <p style={{ color: "#a78bfa", marginTop: 8, marginBottom: 20 }}>Connect your wallet to deposit</p>
          <button
            onClick={() => connect({ connector: injected() })}
            style={{ ...styles.btn, background: "linear-gradient(135deg, #7c3aed, #4f46e5)" }}
          >
            🔌 Connect Wallet
          </button>
        </div>
      </div>
    );
  }

  if (step === "done") {
    return (
      <div style={styles.bg}>
        <div style={styles.card}>
          <div style={{ fontSize: 56, marginBottom: 16 }}>✅</div>
          <h2 style={styles.title}>Deposit Successful!</h2>
          <p style={{ color: "#a78bfa", marginTop: 8 }}>Redirecting to dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.bg}>
      <div style={styles.blob1} />
      <div style={styles.blob2} />

      <div style={{ ...styles.card, textAlign: "left" }}>
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 800, color: "#fff", margin: 0 }}>Deposit USDC</h1>
            <p style={{ fontSize: 12, color: "#7c3aed", margin: 0, marginTop: 2 }}>Base Network</p>
          </div>
          <div style={styles.badge}>
            <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#4ade80", display: "inline-block", marginRight: 6 }} />
            Connected
          </div>
        </div>

        {/* Wallet info */}
        <div style={styles.walletBox}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <p style={{ fontSize: 11, color: "#7c3aed", margin: 0, fontWeight: 600, textTransform: "uppercase" as const, letterSpacing: "0.05em" }}>Wallet</p>
              <p style={{ fontSize: 13, color: "#e2d9f3", margin: 0, marginTop: 2, fontFamily: "monospace" }}>
                {address?.slice(0, 6)}...{address?.slice(-4)}
              </p>
            </div>
            <div style={{ textAlign: "right" as const }}>
              <p style={{ fontSize: 11, color: "#7c3aed", margin: 0, fontWeight: 600, textTransform: "uppercase" as const, letterSpacing: "0.05em" }}>USDC Balance</p>
              <p style={{ fontSize: 20, color: "#4ade80", margin: 0, marginTop: 2, fontWeight: 800 }}>
                {balance !== null ? `$${balance.toFixed(2)}` : "—"}
              </p>
            </div>
          </div>
        </div>

        {/* Amount */}
        <div style={{ marginBottom: 16 }}>
          <label style={{ fontSize: 12, color: "#a78bfa", fontWeight: 600, textTransform: "uppercase" as const, letterSpacing: "0.05em", display: "block", marginBottom: 8 }}>
            Amount (USDC)
          </label>
          <div style={styles.inputWrapper}>
            <span style={{ color: "#7c3aed", fontSize: 20, fontWeight: 700, paddingLeft: 16 }}>$</span>
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              step="0.01" min="0.01"
              style={styles.input}
              placeholder="0.00"
            />
            <span style={{ color: "#7c3aed", fontSize: 13, fontWeight: 700, paddingRight: 16 }}>USDC</span>
          </div>
        </div>

        {/* Quick amounts */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 8, marginBottom: 20 }}>
          {QUICK_AMOUNTS.map((v) => (
            <button key={v} onClick={() => setAmount(v.toString())} style={{
              ...styles.quickBtn,
              background: amount === v.toString() ? "rgba(124,58,237,0.4)" : "rgba(255,255,255,0.05)",
              borderColor: amount === v.toString() ? "#7c3aed" : "rgba(255,255,255,0.1)",
            }}>
              ${v}
            </button>
          ))}
        </div>

        {error && <div style={styles.errorBox}>⚠️ {error}</div>}

        {needsApproval && (
          <button onClick={handleApprove} disabled={isPending} style={{ ...styles.btn, background: isPending ? "#4b2d8a" : "linear-gradient(135deg, #f59e0b, #d97706)", marginBottom: 10, opacity: isPending ? 0.7 : 1 }}>
            {step === "approving" ? "⏳ Approving..." : "🔓 Approve USDC First"}
          </button>
        )}

        <button onClick={handleDeposit} disabled={isPending || balance === null || needsApproval} style={{ ...styles.btn, background: (isPending || needsApproval) ? "#2d1b69" : "linear-gradient(135deg, #7c3aed, #4f46e5)", opacity: (isPending || needsApproval) ? 0.6 : 1 }}>
          {step === "depositing" ? "⏳ Processing..." : "💎 Deposit USDC"}
        </button>

        <button onClick={() => window.location.href = `https://xtaskai.com/base-mini-app/dashboard.php?wallet=${address}`} style={styles.backBtn}>
          ← Back to Dashboard
        </button>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  bg: { minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "linear-gradient(135deg, #0f0a1e 0%, #1a0a2e 50%, #0d0d1a 100%)", padding: 16, position: "relative", overflow: "hidden", fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" },
  blob1: { position: "absolute", top: -100, right: -100, width: 300, height: 300, borderRadius: "50%", background: "radial-gradient(circle, rgba(124,58,237,0.3) 0%, transparent 70%)", pointerEvents: "none" },
  blob2: { position: "absolute", bottom: -100, left: -100, width: 300, height: 300, borderRadius: "50%", background: "radial-gradient(circle, rgba(79,70,229,0.2) 0%, transparent 70%)", pointerEvents: "none" },
  card: { background: "rgba(255,255,255,0.04)", backdropFilter: "blur(20px)", borderRadius: 24, padding: 24, width: "100%", maxWidth: 380, border: "1px solid rgba(124,58,237,0.2)", boxShadow: "0 25px 50px rgba(0,0,0,0.5)", position: "relative", zIndex: 1, textAlign: "center" },
  walletBox: { background: "rgba(124,58,237,0.08)", border: "1px solid rgba(124,58,237,0.2)", borderRadius: 16, padding: "14px 16px", marginBottom: 20 },
  inputWrapper: { display: "flex", alignItems: "center", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(124,58,237,0.3)", borderRadius: 16, overflow: "hidden" },
  input: { flex: 1, background: "transparent", border: "none", outline: "none", color: "#fff", fontSize: 24, fontWeight: 700, padding: "14px 12px", width: "100%" },
  quickBtn: { border: "1px solid", borderRadius: 10, padding: "8px 4px", color: "#a78bfa", fontSize: 13, fontWeight: 600, cursor: "pointer" },
  btn: { width: "100%", padding: "16px", borderRadius: 16, border: "none", color: "#fff", fontSize: 16, fontWeight: 700, cursor: "pointer", display: "block", letterSpacing: "0.02em" },
  backBtn: { width: "100%", marginTop: 10, padding: "12px", borderRadius: 12, border: "1px solid rgba(255,255,255,0.08)", background: "transparent", color: "#6b7280", fontSize: 14, cursor: "pointer" },
  errorBox: { background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)", borderRadius: 12, padding: "10px 14px", color: "#f87171", fontSize: 13, marginBottom: 12, textAlign: "left" },
  badge: { background: "rgba(74,222,128,0.1)", border: "1px solid rgba(74,222,128,0.2)", borderRadius: 20, padding: "4px 12px", color: "#4ade80", fontSize: 12, fontWeight: 600, display: "flex", alignItems: "center" },
  logo: { fontSize: 48, marginBottom: 8, color: "#7c3aed" },
  title: { fontSize: 24, fontWeight: 800, color: "#fff", margin: 0 },
  loadingText: { color: "#a78bfa", marginTop: 12 },
  spinner: { width: 32, height: 32, border: "3px solid rgba(124,58,237,0.2)", borderTop: "3px solid #7c3aed", borderRadius: "50%", margin: "16px auto 0" },
};
