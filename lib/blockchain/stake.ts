"use server";

import StakeAbi from "@/constants/abis/stake"; // ensure this exports the ABI array
import { Contract, formatUnits } from "ethers";
import { getConnectionProvider } from "./provider";

const GLADIATOR_CONTRACT = "0x9d2B270361f2bD35aC39E8dA230a1fd54de6BE8E";
const CHAIN_ID = 43114; // Avalanche C‑chain

/**
 * Get the staked amount (GLADIATOR tokens) for a wallet.
 * Returns formatted string with 18 decimals.
 */
export const getGladiatorStakeAmount = async (
   walletAddress: string,
): Promise<string> => {
   const provider = getConnectionProvider(CHAIN_ID);
   if (!provider) throw new Error("Could not get provider for Avalanche");

   const stakeContract = new Contract(GLADIATOR_CONTRACT, StakeAbi, provider);
   const stakeAmount = await stakeContract.stacked(walletAddress);
   return formatUnits(stakeAmount, 18);
};