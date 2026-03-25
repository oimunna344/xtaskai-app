"use client";

import { useState, useEffect } from "react";
import { useAccount, useConnect, useDisconnect } from "wagmi";
import { ethers } from "ethers";

declare global {
  interface Window {
    ethereum: any;
  }
}

const CONTRACT_ADDRESS = "0x0f50aD6a61434CbE672Ec50009ED3EC0181731b0";
const USDC_ADDRESS = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913";
const BASE_CHAIN_ID = 8453;

// ✅ ঠিক করা USDC_ABI
const USDC_ABI = [
  "function approve(address spender, uint256 amount) returns (bool)",
  "function balanceOf(address account) view returns (uint256)",
  "function transferFrom(address from, address to, uint256 amount) returns (bool)",
  "function allowance(address owner, address spender) view returns (uint256)"
];

const CONTRACT_ABI = [
  "function deposit(uint256 amount) external",
  "function depositBalances(address) view returns (uint256)"
];

export default function DepositPage() {
  const { address, isConnected } = useAccount();
  const { connect, connectors } = useConnect();
  
  const [amount, setAmount] = useState("0.001");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [balance, setBalance] = useState<number | null>(null);
  const [checking, setChecking] = useState(false);
  const [networkOk, setNetworkOk] = useState(false);

  // 🆕 Check and switch network
  const switchToBaseNetwork = async () => {
    if (!window.ethereum) return false;
    
    try {
      // Check current network
      const chainId = await window.ethereum.request({ method: 'eth_chainId' });
      const currentChainId = parseInt(chainId, 16);
      
      if (currentChainId === BASE_CHAIN_ID) {
        setNetworkOk(true);
        return true;
      }
      
      // Try to switch to Base
      try {
        await window.ethereum.request({
          method: 'wallet_switchEthereumChain',
          params: [{ chainId: '0x2105' }] // 8453 in hex
        });
        setNetworkOk(true);
        return true;
      } catch (switchError: any) {
        // If Base network not added, add it
        if (switchError.code === 4902) {
          await window.ethereum.request({
            method: 'wallet_addEthereumChain',
            params: [{
              chainId: '0x2105',
              chainName: 'Base Mainnet',
              nativeCurrency: { name: 'ETH', symbol: 'ETH', decimals: 18 },
              rpcUrls: ['https://mainnet.base.org'],
              blockExplorerUrls: ['https://basescan.org']
            }]
          });
          setNetworkOk(true);
          return true;
        }
        throw switchError;
      }
    } catch (err) {
      console.error("Network switch failed:", err);
      setError("Please switch to Base Mainnet in MetaMask manually");
      return false;
    }
  };

  // Check network on load and when wallet connects
  useEffect(() => {
    const checkNetwork = async () => {
      if (isConnected) {
        await switchToBaseNetwork();
      }
    };
    checkNetwork();
  }, [isConnected]);

  // Get balance
  useEffect(() => {
    const getBalance = async () => {
      if (!isConnected || !address) {
        setBalance(null);
        return;
      }
      
      // First ensure network is correct
      const networkOk = await switchToBaseNetwork();
      if (!networkOk) return;
      
      setChecking(true);
      try {
        const provider = new ethers.providers.Web3Provider(window.ethereum);
        const usdc = new ethers.Contract(USDC_ADDRESS, USDC_ABI, provider);
        const bal = await usdc.balanceOf(address);
        const balNum = parseFloat(ethers.utils.formatUnits(bal, 6));
        setBalance(balNum);
        console.log("Balance loaded:", balNum);
      } catch (err) {
        console.error("Balance error:", err);
        setBalance(0);
      } finally {
        setChecking(false);
      }
    };
    
    getBalance();
  }, [isConnected, address]);

  const handleDeposit = async () => {
    if (!isConnected || !address) {
      setError("Connect wallet first");
      return;
    }
    
    // Check network again before deposit
    const networkOk = await switchToBaseNetwork();
    if (!networkOk) {
      setError("Please switch to Base Mainnet network");
      return;
    }
    
    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      setError("Enter valid amount");
      return;
    }
    
    if (balance === null || numAmount > balance) {
      setError(`Insufficient balance. You have ${balance?.toFixed(4) || "0"} USDC`);
      return;
    }
    
    setLoading(true);
    setError("");
    
    try {
      const provider = new ethers.providers.Web3Provider(window.ethereum);
      const signer = provider.getSigner();
      
      const amountInWei = ethers.utils.parseUnits(amount, 6);
      
      // Create USDC contract with signer
      const usdc = new ethers.Contract(USDC_ADDRESS, USDC_ABI, signer);
      
      // Check allowance
      const allowance = await usdc.allowance(address, CONTRACT_ADDRESS);
      console.log("Current allowance:", ethers.utils.formatUnits(allowance, 6), "USDC");
      
      // Approve if needed
      if (allowance.lt(amountInWei)) {
        console.log("Approving USDC...");
        const approveTx = await usdc.approve(CONTRACT_ADDRESS, amountInWei);
        await approveTx.wait();
        console.log("Approved!");
      }
      
      // Deposit
      const contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, signer);
      console.log("Depositing...");
      const depositTx = await contract.deposit(amountInWei);
      await depositTx.wait();
      console.log("Deposited!");
      
      alert(`✅ Deposit successful! ${amount} USDC added`);
      window.location.href = `https://xtaskai.com/base-mini-app/dashboard.php?wallet=${address}`;
      
    } catch (err: any) {
      console.error("Deposit error:", err);
      
      if (err.message?.includes("user rejected")) {
        setError("Transaction cancelled");
      } else if (err.message?.includes("insufficient funds")) {
        setError("Insufficient ETH for gas");
      } else {
        setError(err.message || "Transaction failed");
      }
    } finally {
      setLoading(false);
    }
  };

  if (!isConnected) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-600 to-pink-500">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-white mb-6">XTASKAI</h1>
          <button
            onClick={() => connect({ connector: connectors[0] })}
            className="bg-white text-purple-600 px-8 py-3 rounded-full font-semibold hover:shadow-lg transition"
          >
            🔌 Connect Wallet
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-600 to-pink-500">
      <div className="bg-white/20 backdrop-blur-lg rounded-2xl p-8 w-96">
        <h1 className="text-2xl font-bold text-white text-center mb-6">Deposit USDC</h1>
        
        {/* Network Status */}
        {!networkOk && (
          <div className="bg-yellow-500/20 border border-yellow-500 rounded-xl p-3 mb-4 text-center">
            <p className="text-yellow-300 text-sm">⚠️ Please switch to Base Mainnet</p>
            <button 
              onClick={switchToBaseNetwork}
              className="mt-2 bg-yellow-500 text-black px-4 py-1 rounded-lg text-sm"
            >
              Switch Network
            </button>
          </div>
        )}
        
        <div className="bg-black/30 rounded-xl p-4 mb-6">
          <div className="text-white/70 text-sm">Connected Wallet</div>
          <div className="text-white font-mono text-sm">{address?.slice(0, 8)}...{address?.slice(-6)}</div>
          <div className="flex justify-between mt-3">
            <span className="text-white/70">USDC Balance:</span>
            <span className="text-green-400 font-bold">
              {checking ? "Loading..." : balance !== null ? `${balance.toFixed(4)} USDC` : "Connect wallet"}
            </span>
          </div>
        </div>
        
        <div className="mb-6">
          <label className="block text-white mb-2">Amount (USDC)</label>
          <input
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            step="0.0001"
            min="0.0001"
            className="w-full bg-black/30 border border-white/20 rounded-xl px-4 py-3 text-white text-lg"
          />
          <div className="grid grid-cols-4 gap-2 mt-3">
            {[0.0001, 0.001, 0.01, 0.1].map((v) => (
              <button 
                key={v} 
                onClick={() => setAmount(v.toString())} 
                className="bg-white/10 hover:bg-white/20 rounded-lg py-2 text-sm transition"
              >
                {v}
              </button>
            ))}
          </div>
        </div>
        
        {error && (
          <div className="bg-red-500/20 border border-red-500 rounded-xl p-3 mb-4">
            <p className="text-red-400 text-sm">{error}</p>
          </div>
        )}
        
        <button
          onClick={handleDeposit}
          disabled={loading || checking || balance === null || !networkOk}
          className="w-full bg-gradient-to-r from-green-500 to-blue-500 text-white font-bold py-3 rounded-xl disabled:opacity-50 hover:opacity-90 transition"
        >
          {loading ? "Processing..." : checking ? "Loading..." : "💎 Deposit USDC"}
        </button>
        
        <button
          onClick={() => window.location.href = `https://xtaskai.com/base-mini-app/dashboard.php?wallet=${address}`}
          className="w-full mt-3 bg-white/10 hover:bg-white/20 rounded-xl py-2 text-sm transition"
        >
          ← Back
        </button>
      </div>
    </div>
  );
}