export async function getFarcasterProvider() {
  const sdk = (await import("@farcaster/frame-sdk")).default;
  await sdk.actions.ready();
  return sdk.wallet.ethProvider;
}

export async function getAccounts(provider: any): Promise<string> {
  const accounts = await provider.request({ method: "eth_requestAccounts" }) as string[];
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
    // ignore other errors — Farcaster may already be on Base
  }
}

export async function waitForTx(provider: any, txHash: string): Promise<void> {
  for (let i = 0; i < 30; i++) {
    await new Promise(r => setTimeout(r, 2000));
    try {
      const receipt = await provider.request({
        method: "eth_getTransactionReceipt",
        params: [txHash],
      });
      if (receipt) return;
    } catch {}
  }
  throw new Error("Transaction timeout");
}

export async function checkAllowance(
  provider: any,
  owner: string,
  spender: string,
  tokenAddress: string,
  amount: bigint
): Promise<boolean> {
  try {
    const data = await provider.request({
      method: "eth_call",
      params: [{
        to: tokenAddress,
        data: `0xdd62ed3e${owner.slice(2).padStart(64, "0")}${spender.slice(2).padStart(64, "0")}`,
      }, "latest"],
    });
    return BigInt(data as string) < amount;
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
    params: [{
      from: walletAddress,
      to: usdcAddress,
      data: `0x095ea7b3${spenderPadded}${amountHex}`,
    }],
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
    params: [{
      from: walletAddress,
      to: contractAddress,
      data: `0xb6b55f25${amountHex}`,
    }],
  });
  return txHash as string;
}