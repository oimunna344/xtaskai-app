"use client";

import { useState, useEffect, useRef } from "react";
import { useSearchParams } from "next/navigation";
import { parseUnits } from "viem";
import { getFarcasterProvider, getAccounts, switchToBase, waitForTx, checkAllowance, approveUSDC, depositUSDC, isUserRejection } from "../lib/farcaster-wallet";

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
      const needs = await checkAllowance(address, CONTRACT_ADDRESS, USDC_ADDRESS, amountInUnits);
      setNeedsApproval(needs); setStatus("idle");
    } catch (err: any) { setErrorMsg(err?.message || "Failed to connect"); setStatus("error"); }
  }

  async function handleApprove() {
    if (!walletAddress) return;
    setStatus("approving"); setErrorMsg("");
    try {
      await switchToBase(providerRef.current);
      const txHash = await approveUSDC(providerRef.current, walletAddress, USDC_ADDRESS, CONTRACT_ADDRESS, amountInUnits);
      await waitForTx(txHash);
      await new Promise(r => setTimeout(r, 3000));
      const stillNeeds = await checkAllowance(walletAddress, CONTRACT_ADDRESS, USDC_ADDRESS, amountInUnits);
      setNeedsApproval(stillNeeds); setStatus("idle");
    } catch (err: any) {
      if (isUserRejection(err)) { setStatus("idle"); return; }
      setErrorMsg(err?.message || "Approval failed"); setStatus("error");
    }
  }

  async function handlePayFee() {
    if (!walletAddress) return;
    setStatus("depositing"); setErrorMsg("");
    try {
      await switchToBase(providerRef.current);
      const txHash = await depositUSDC(providerRef.current, walletAddress, CONTRACT_ADDRESS, amountInUnits);
      await waitForTx(txHash);
      await registerJoin(txHash);
    } catch (err: any) {
      if (isUserRejection(err)) { setStatus("idle"); return; }
      setErrorMsg(err?.message || "Transaction failed"); setStatus("error");
    }
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

  if (status === "connecting") return (
    <div style={s.bg}><div style={s.blob1}/><div style={s.blob2}/>
      <div style={{...s.card,textAlign:"center"}}><div style={s.logo}>⬡</div><p style={{color:"#a78bfa",marginTop:12}}>Connecting wallet...</p><div style={s.spinner}/></div>
    </div>
  );

  if (status === "success") return (
    <div style={s.bg}><div style={s.blob1}/><div style={s.blob2}/>
      <div style={{...s.card,textAlign:"center"}}>
        <div style={{fontSize:64,marginBottom:16}}>🏆</div>
        <h2 style={s.title}>You're In!</h2>
        <p style={{color:"#a78bfa",marginTop:8}}>Tournament #{tournamentId}</p>
        <p style={{fontSize:28,fontWeight:800,color:"#fbbf24",margin:"8px 0"}}>+50 XTP</p>
        <p style={{color:"#4b5563",fontSize:13,marginTop:16}}>Redirecting...</p>
      </div>
    </div>
  );

  if (!tournamentId || playerNames.length === 0) return (
    <div style={s.bg}><div style={s.blob1}/><div style={s.blob2}/>
      <div style={{...s.card,textAlign:"center"}}>
        <div style={{fontSize:56,marginBottom:16}}>❌</div>
        <h2 style={s.title}>Missing Info</h2>
        <p style={{color:"#a78bfa",marginTop:8,marginBottom:20}}>{errorMsg}</p>
        <button onClick={()=>window.location.href="https://xtaskai.com/base-mini-app/tournaments.php"} style={{...s.btn,background:"linear-gradient(135deg,#7c3aed,#4f46e5)"}}>← Go Back</button>
      </div>
    </div>
  );

  return (
    <div style={s.bg}><div style={s.blob1}/><div style={s.blob2}/>
      <div style={s.card}>
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:20}}>
          <div>
            <h1 style={{fontSize:20,fontWeight:800,color:"#fff",margin:0}}>🏆 Join Tournament</h1>
            <p style={{fontSize:12,color:"#7c3aed",margin:0,marginTop:2}}>#{tournamentId} • {gameType==="squad"?"Squad":"Solo"}</p>
          </div>
          <div style={s.badge}><span style={{width:8,height:8,borderRadius:"50%",background:"#4ade80",display:"inline-block",marginRight:6}}/>Connected</div>
        </div>
        <div style={s.walletBox}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
            <div><p style={s.label}>Wallet</p><p style={s.mono}>{walletAddress?.slice(0,6)}...{walletAddress?.slice(-4)}</p></div>
            <div style={{textAlign:"right"}}><p style={s.label}>Players</p><p style={{fontSize:13,color:"#e2d9f3",margin:0,maxWidth:120,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{playerNames.join(", ")}</p></div>
          </div>
        </div>
        <div style={s.infoBox}>
          {[["Entry Fee",`$${entryFee} USDC (App Balance)`],["Platform Fee","0.003 USDC"],["You Earn","+50 XTP"],["Network","Base"]].map(([k,v],i,arr)=>(
            <div key={k} style={{display:"flex",justifyContent:"space-between",padding:"10px 0",borderBottom:i<arr.length-1?"1px solid rgba(124,58,237,0.15)":"none"}}>
              <span style={{color:"#a78bfa",fontSize:14}}>{k}</span>
              <span style={{color:k==="You Earn"?"#fbbf24":k==="Network"?"#4ade80":k==="Entry Fee"?"#60a5fa":"#fff",fontWeight:700,fontSize:13}}>{v}</span>
            </div>
          ))}
        </div>
        {status === "error" && errorMsg && <div style={s.errorBox}>⚠️ {errorMsg}<button onClick={connectWallet} style={{display:"block",color:"#f87171",fontSize:12,marginTop:6,background:"none",border:"none",cursor:"pointer",padding:0,textDecoration:"underline"}}>Retry</button></div>}
        {needsApproval ? (
          <button onClick={handleApprove} disabled={status==="approving"} style={{...s.btn,background:status==="approving"?"#4b2d8a":"linear-gradient(135deg,#f59e0b,#d97706)",opacity:status==="approving"?0.7:1,marginBottom:10}}>
            {status==="approving"?"⏳ Approving USDC...":"🔓 Approve USDC First"}
          </button>
        ) : (
          <button onClick={handlePayFee} disabled={status==="depositing"} style={{...s.btn,background:status==="depositing"?"#2d1b69":"linear-gradient(135deg,#7c3aed,#4f46e5)",opacity:status==="depositing"?0.7:1}}>
            {status==="depositing"?"⏳ Processing...":"🎮 Pay 0.003 USDC & Join"}
          </button>
        )}
        <button onClick={()=>window.location.href="https://xtaskai.com/base-mini-app/tournaments.php"} style={s.backBtn}>← Back to Tournaments</button>
      </div>
    </div>
  );
}

const s: Record<string, React.CSSProperties> = {
  bg:{minHeight:"100vh",display:"flex",alignItems:"center",justifyContent:"center",background:"linear-gradient(135deg,#0f0a1e 0%,#1a0a2e 50%,#0d0d1a 100%)",padding:16,position:"relative",overflow:"hidden",fontFamily:"-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif"},
  blob1:{position:"absolute",top:-100,right:-100,width:300,height:300,borderRadius:"50%",background:"radial-gradient(circle,rgba(124,58,237,0.3) 0%,transparent 70%)",pointerEvents:"none"},
  blob2:{position:"absolute",bottom:-100,left:-100,width:300,height:300,borderRadius:"50%",background:"radial-gradient(circle,rgba(79,70,229,0.2) 0%,transparent 70%)",pointerEvents:"none"},
  card:{background:"rgba(255,255,255,0.04)",backdropFilter:"blur(20px)",borderRadius:24,padding:24,width:"100%",maxWidth:380,border:"1px solid rgba(124,58,237,0.2)",boxShadow:"0 25px 50px rgba(0,0,0,0.5),inset 0 1px 0 rgba(255,255,255,0.05)",position:"relative",zIndex:1},
  walletBox:{background:"rgba(124,58,237,0.08)",border:"1px solid rgba(124,58,237,0.2)",borderRadius:16,padding:"14px 16px",marginBottom:16},
  infoBox:{background:"rgba(255,255,255,0.03)",border:"1px solid rgba(124,58,237,0.15)",borderRadius:16,padding:"0 16px",marginBottom:16},
  label:{fontSize:11,color:"#7c3aed",margin:0,fontWeight:600,textTransform:"uppercase",letterSpacing:"0.05em"},
  mono:{fontSize:13,color:"#e2d9f3",margin:0,marginTop:2,fontFamily:"monospace"},
  btn:{width:"100%",padding:16,borderRadius:16,border:"none",color:"#fff",fontSize:16,fontWeight:700,cursor:"pointer",display:"block",letterSpacing:"0.02em"},
  backBtn:{width:"100%",marginTop:10,padding:12,borderRadius:12,border:"1px solid rgba(255,255,255,0.08)",background:"transparent",color:"#6b7280",fontSize:14,cursor:"pointer"},
  errorBox:{background:"rgba(239,68,68,0.1)",border:"1px solid rgba(239,68,68,0.3)",borderRadius:12,padding:"10px 14px",color:"#f87171",fontSize:13,marginBottom:12},
  badge:{background:"rgba(74,222,128,0.1)",border:"1px solid rgba(74,222,128,0.2)",borderRadius:20,padding:"4px 12px",color:"#4ade80",fontSize:12,fontWeight:600,display:"flex",alignItems:"center"},
  logo:{fontSize:48,marginBottom:8,color:"#7c3aed"},
  title:{fontSize:24,fontWeight:800,color:"#fff",margin:0},
  spinner:{width:32,height:32,border:"3px solid rgba(124,58,237,0.2)",borderTop:"3px solid #7c3aed",borderRadius:"50%",animation:"spin 1s linear infinite",margin:"16px auto 0"},
};
