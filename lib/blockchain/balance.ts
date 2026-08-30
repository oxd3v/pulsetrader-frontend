"use server";

import { getConnectionProvider } from "./provider";
import { getEvmWalletTokenBalance } from "./evmErc20";
import { EVM_ZERO_ADDRESS } from "@/constants/common/utils";

/**
 * Get native balance for a given wallet and chain.
 * Supports EVM only; for Solana, extend accordingly.
 */
export const getWalletBalance = async ({
  walletAddress,
  chainId,
}: {
  walletAddress: string;
  chainId: number;
}): Promise<bigint> => {
  return getEvmNativeBalance({ walletAddress, chainId });
};

/**
 * Get native EVM balance (in wei).
 */
export const getEvmNativeBalance = async ({
  walletAddress,
  chainId,
}: {
  walletAddress: string;
  chainId: number;
}): Promise<bigint> => {
  const provider = getConnectionProvider(chainId);
  if (!provider) throw new Error(`No provider for chainId ${chainId}`);
  return provider.getBalance(walletAddress);
};

/**
 * Get ERC-20 token balance.
 */
export const getWalletTokenBalance = async ({
  walletAddress,
  tokenAddress,
  chainId,
}: {
  walletAddress: string;
  tokenAddress: string;
  chainId: number;
}): Promise<bigint> => {
  return getEvmWalletTokenBalance({ walletAddress, tokenAddress, chainId });
};


export const getEvmBalance = async ({
  walletAddress,
  chainId,
  tokenAddress,
}: {
  walletAddress: string;
  chainId: number;
  tokenAddress: string;
}): Promise<bigint> => {
  if (tokenAddress == EVM_ZERO_ADDRESS) {
    return getEvmNativeBalance({ walletAddress, chainId });
  }
  return getEvmWalletTokenBalance({ walletAddress, tokenAddress, chainId });
};