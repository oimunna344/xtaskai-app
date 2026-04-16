export async function getFarcasterProvider() {
  const sdk = (await import("@farcaster/frame-sdk")).default;
  await sdk.actions.ready();
  return sdk.wallet.ethProvider;
}

export async function getAccounts(provider: any): Promise<string> {
  const accounts = await provider.request({
    method: "eth_requestAccounts",
  }) as string[];
  if (!accounts || accounts.length === 0) throw new Error("No wallet found");
  return accounts[0];
}

export async function switchToBase(provider: any) {
  try {
    await provider.request({
      method: "wallet_switchEthereumChain",
      params: [{ chainId: "0x2105" }],
    });
  } catch (err: any) {
    if (err.code === 4902) {
      await provider.request({
        method: "wallet_addEthereumChain",
        params: [{
          chainId: "0x2105",
          chainName: "Base",
          nativeCurrency: { name: "ETH", symbol: "ETH", decimals: 18 },
          rpcUrls: ["https://mainnet.base.org"],
          blockExplorerUrls: ["https://basescan.org"],
        }],
      });
    }
    // ignore — Farcaster already on Base
  }
}

export async function waitForTx(txHash: string): Promise<void> {
  for (let i = 0; i < 40; i++) {
    await new Promise(r => setTimeout(r, 3000));
    try {
      const res = await fetch("https://mainnet.base.org", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jsonrpc: "2.0", id: 1,
          method: "eth_getTransactionReceipt",
          params: [txHash],
        }),
      });
      const json = await res.json();
      if (json.result && json.result.status === "0x1") return;
    } catch {}
  }
  throw new Error("Transaction timeout — please check your wallet");
}

export async function checkAllowance(
  owner: string,
  spender: string,
  tokenAddress: string,
  amount: bigint
): Promise<boolean> {
  try {
    const res = await fetch("https://mainnet.base.org", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0", id: 1,
        method: "eth_call",
        params: [{
          to: tokenAddress,
          data: `0xdd62ed3e${owner.slice(2).padStart(64, "0")}${spender.slice(2).padStart(64, "0")}`,
        }, "latest"],
      }),
    });
    const json = await res.json();
    if (json.result) return BigInt(json.result) < amount;
    return true;
  } catch {
    return true;
  }
}

export async function approveUSDC(
  provider: any,
  walletAddress: string,
  usdcAddress: string,
  spender: string,
  amount: bigint
): Promise<string> {
  const spenderPadded = spender.slice(2).padStart(64, "0");
  const amountHex = amount.toString(16).padStart(64, "0");
  const txHash = await provider.request({
    method: "eth_sendTransaction",
    params: [{ from: walletAddress, to: usdcAddress, data: `0x095ea7b3${spenderPadded}${amountHex}` }],
  });
  return txHash as string;
}

export async function depositUSDC(
  provider: any,
  walletAddress: string,
  contractAddress: string,
  amount: bigint
): Promise<string> {
  const amountHex = amount.toString(16).padStart(64, "0");
  const txHash = await provider.request({
    method: "eth_sendTransaction",
    params: [{ from: walletAddress, to: contractAddress, data: `0xb6b55f25${amountHex}` }],
  });
  return txHash as string;
}

export function isUserRejection(err: any): boolean {
  return err?.code === 4001 || 
    err?.message?.toLowerCase().includes("rejected") ||
    err?.message?.toLowerCase().includes("denied") ||
    err?.message?.toLowerCase().includes("cancelled");
}
