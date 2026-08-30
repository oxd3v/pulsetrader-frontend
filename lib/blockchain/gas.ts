"use server";

import {
    chains,
    chainConfig,
} from "@/constants/common/chain";
import {
    GAS_BUFFER,
    GAS_LIMIT,
    DEFAULT_GAS_PRICE,
    DEFAULT_SOLANA_PRIORITY_FEE,
    DEFAULT_SOLANA_COMPUTE_UNITS,
    SOLANA_BASE_FEE,
} from "@/constants/common/order";
import { BASIS_POINT_DIVISOR_BIGINT, } from "@/constants/common/utils"
import { getConnectionProvider } from "./provider";
import { JsonRpcProvider } from "ethers";

// ─── Solana ──────────────────────────────────────────────────────────────

export async function getSolanaPriorityFeeEstimate(
    accounts: string[] = []
): Promise<bigint> {
    try {
        const rpcUrl = chainConfig[chains.Solana]?.rpcUrls?.[0];
        if (!rpcUrl) return DEFAULT_SOLANA_PRIORITY_FEE;

        const response = await fetch(rpcUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                jsonrpc: "2.0",
                id: 1,
                method: "getRecentPrioritizationFees",
                params: accounts.length ? [accounts] : [],
            }),
        });

        const { result: fees } = await response.json();
        if (!fees?.length) return DEFAULT_SOLANA_PRIORITY_FEE;

        fees.sort((a: any, b: any) => a.prioritizationFee - b.prioritizationFee);
        const idx = Math.min(fees.length - 1, Math.floor(fees.length * 0.9));
        const priorityFee = BigInt(
            fees[idx]?.prioritizationFee ?? DEFAULT_SOLANA_PRIORITY_FEE
        );

        return priorityFee === BigInt(0) ? DEFAULT_SOLANA_PRIORITY_FEE : priorityFee;
    } catch {
        return DEFAULT_SOLANA_PRIORITY_FEE;
    }
}

// ─── EVM ──────────────────────────────────────────────────────────────────

export async function getEVMSpotGasFee(chainId: number): Promise<bigint> {
    try {
        const provider = getConnectionProvider(chainId) as JsonRpcProvider | null;
        if (!provider) throw new Error("No provider");
        const feeData = await provider.getFeeData();
        return feeData.gasPrice ?? DEFAULT_GAS_PRICE[chainId] ?? BigInt(0);
    } catch {
        return DEFAULT_GAS_PRICE[chainId] ?? BigInt(0);
    }
}

// ─── Generic gas fee ─────────────────────────────────────────────────────

export const getGasFee = async (chainId: number): Promise<bigint> => {
    if (chainId === chains.Solana) {
        return getSolanaPriorityFeeEstimate([]);
    }
    return getEVMSpotGasFee(chainId);
};

// ─── Spot network fee (with buffer) ─────────────────────────────────────

export const spotNetworkFee = async (chainId: number): Promise<bigint> => {
    let networkFee = BigInt(0);

    try {
        if (chainId === chains.Solana) {
            const priorityFee = await getSolanaPriorityFeeEstimate([]);
            const gasLimit = GAS_LIMIT["SPOT"]?.[chains.Solana] ?? DEFAULT_SOLANA_COMPUTE_UNITS;
            networkFee = SOLANA_BASE_FEE + (gasLimit * priorityFee) / BigInt(1_000_000);
        } else {
            const gasFee = await getEVMSpotGasFee(chainId);
            const gasLimit = GAS_LIMIT["SPOT"]?.[chainId] ?? BigInt(100_000);
            networkFee = gasFee * gasLimit;
        }

        // Apply buffer
        const buffer = BigInt(GAS_BUFFER[chainId] ?? 11000);
        networkFee = (networkFee * buffer) / BASIS_POINT_DIVISOR_BIGINT;
    } catch {
        // Fallback: return 0 if any part fails
        networkFee = BigInt(0);
    }

    return networkFee;
};