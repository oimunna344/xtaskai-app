// app/lib/contract.ts
import { ethers } from "ethers";

const CONTRACT_ADDRESS = "0x0f50aD6a61434CbE672Ec50009ED3EC0181731b0";
const USDC_ADDRESS = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913";

// 🆕 Base App Builder Code
const BUILDER_CODE = "bc_08dcvsfy";

const CONTRACT_ABI = [
  {
    "type": "constructor",
    "inputs": [
      {
        "name": "_usdcAddress",
        "type": "address",
        "internalType": "address"
      }
    ],
    "stateMutability": "nonpayable"
  },
  {
    "name": "Deposited",
    "type": "event",
    "inputs": [
      {
        "name": "user",
        "type": "address",
        "indexed": true,
        "internalType": "address"
      },
      {
        "name": "amount",
        "type": "uint256",
        "indexed": false,
        "internalType": "uint256"
      }
    ],
    "anonymous": false
  },
  {
    "name": "OwnerWithdrawn",
    "type": "event",
    "inputs": [
      {
        "name": "amount",
        "type": "uint256",
        "indexed": false,
        "internalType": "uint256"
      },
      {
        "name": "to",
        "type": "address",
        "indexed": true,
        "internalType": "address"
      }
    ],
    "anonymous": false
  },
  {
    "name": "Withdrawn",
    "type": "event",
    "inputs": [
      {
        "name": "user",
        "type": "address",
        "indexed": true,
        "internalType": "address"
      },
      {
        "name": "amount",
        "type": "uint256",
        "indexed": false,
        "internalType": "uint256"
      },
      {
        "name": "admin",
        "type": "address",
        "indexed": true,
        "internalType": "address"
      }
    ],
    "anonymous": false
  },
  {
    "name": "adminWithdraw",
    "type": "function",
    "inputs": [
      {
        "name": "user",
        "type": "address",
        "internalType": "address"
      },
      {
        "name": "amount",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "name": "deposit",
    "type": "function",
    "inputs": [
      {
        "name": "amount",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "name": "depositBalances",
    "type": "function",
    "inputs": [
      {
        "name": "",
        "type": "address",
        "internalType": "address"
      }
    ],
    "outputs": [
      {
        "name": "",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "stateMutability": "view"
  },
  {
    "name": "getContractUSDCBalance",
    "type": "function",
    "inputs": [],
    "outputs": [
      {
        "name": "",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "stateMutability": "view"
  },
  {
    "name": "getDepositBalance",
    "type": "function",
    "inputs": [
      {
        "name": "user",
        "type": "address",
        "internalType": "address"
      }
    ],
    "outputs": [
      {
        "name": "",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "stateMutability": "view"
  },
  {
    "name": "getTotalDeposits",
    "type": "function",
    "inputs": [],
    "outputs": [
      {
        "name": "",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "stateMutability": "view"
  },
  {
    "name": "owner",
    "type": "function",
    "inputs": [],
    "outputs": [
      {
        "name": "",
        "type": "address",
        "internalType": "address"
      }
    ],
    "stateMutability": "view"
  },
  {
    "name": "ownerWithdraw",
    "type": "function",
    "inputs": [
      {
        "name": "amount",
        "type": "uint256",
        "internalType": "uint256"
      },
      {
        "name": "to",
        "type": "address",
        "internalType": "address"
      }
    ],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "name": "totalDeposits",
    "type": "function",
    "inputs": [],
    "outputs": [
      {
        "name": "",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "stateMutability": "view"
  },
  {
    "name": "usdc",
    "type": "function",
    "inputs": [],
    "outputs": [
      {
        "name": "",
        "type": "address",
        "internalType": "contract IUSDC"
      }
    ],
    "stateMutability": "view"
  }
];

const USDC_ABI = [
  "function approve(address spender, uint256 amount) external returns (bool)",
  "function balanceOf(address account) external view returns (uint256)",
  "function transfer(address to, uint256 amount) external returns (bool)",
  "function transferFrom(address from, address to, uint256 amount) external returns (bool)"
];

// ============================================
// ডিপোজিট ফাংশন (Builder Code যোগ)
// ============================================
export async function depositUSDC(amount: string, signer: ethers.Signer) {
  try {
    const usdc = new ethers.Contract(USDC_ADDRESS, USDC_ABI, signer);
    const contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, signer);
    
    const amountInWei = ethers.utils.parseUnits(amount, 6);
    
    const userAddress = await signer.getAddress();
    const balance = await usdc.balanceOf(userAddress);
    
    if (balance.lt(amountInWei)) {
      throw new Error(`Insufficient USDC. You have ${ethers.utils.formatUnits(balance, 6)} USDC`);
    }
    
    // Step 1: Approve
    const approveTx = await usdc.approve(CONTRACT_ADDRESS, amountInWei);
    await approveTx.wait();
    
    // Step 2: Deposit with Builder Code
    const depositTx = await contract.deposit(amountInWei, {
      customData: {
        builder_id: BUILDER_CODE
      }
    });
    await depositTx.wait();
    
    return {
      success: true,
      txHash: depositTx.hash,
      message: `✅ Deposit successful! ${amount} USDC added`
    };
    
  } catch (error: any) {
    console.error("Deposit error:", error);
    return {
      success: false,
      error: error.message || "Transaction failed"
    };
  }
}

// ============================================
// ইউজারের ডিপোজিট ব্যালেন্স দেখার ফাংশন
// ============================================
export async function getUserDepositBalance(address: string, provider: ethers.providers.Provider) {
  try {
    const contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, provider);
    const balance = await contract.getDepositBalance(address);
    return ethers.utils.formatUnits(balance, 6);
  } catch (error) {
    console.error("Balance check error:", error);
    return "0";
  }
}

// ============================================
// কন্ট্র্যাক্টের মোট USDC ব্যালেন্স
// ============================================
export async function getContractUSDCBalance(provider: ethers.providers.Provider) {
  try {
    const contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, provider);
    const balance = await contract.getContractUSDCBalance();
    return ethers.utils.formatUnits(balance, 6);
  } catch (error) {
    console.error("Contract balance error:", error);
    return "0";
  }
}