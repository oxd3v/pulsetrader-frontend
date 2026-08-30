
import { getConnectionProvider } from "./provider";
import { Contract, Interface, Signer, JsonRpcProvider } from "ethers";
import ERC20Abi from "@/constants/abis/ERC20";

/**
 * Get ERC-20 token balance.
 */
export const getEvmWalletTokenBalance = async ({
    walletAddress,
    tokenAddress,
    chainId,
}: {
    walletAddress: string;
    tokenAddress: string;
    chainId: number;
}): Promise<bigint> => {
    const provider = getConnectionProvider(chainId);
    if (!provider) throw new Error(`No provider for chainId ${chainId}`);
    const tokenContract = new Contract(tokenAddress, ERC20Abi, provider);
    return tokenContract.balanceOf(walletAddress) as Promise<bigint>;
};

/**
 * Transfer ERC-20 tokens using a signer.
 */
export const getEvmTokenTransferAmount = async ({
    signer,
    tokenAddress,
    amount,
    toAddress,
}: {
    signer: Signer;
    tokenAddress: string;
    amount: bigint;
    toAddress: string;
}): Promise<any> => {
    const iface = new Interface(ERC20Abi);
    const data = iface.encodeFunctionData("transfer", [toAddress, amount]);
    const tx = await signer.sendTransaction({ to: tokenAddress, data, value: "0" });
    const receipt = await tx.wait();
    return receipt;
};

/**
 * Get current allowance of a spender for an owner.
 */
export const getEvmAllowance = async ({
    tokenAddress,
    owner,
    spender,
    chainId,
}: {
    tokenAddress: string;
    owner: string;
    spender: string;
    chainId: number;
}): Promise<bigint> => {
    const provider = getConnectionProvider(chainId);
    if (!provider) throw new Error(`No provider for chainId ${chainId}`);
    const tokenContract = new Contract(tokenAddress, ERC20Abi, provider);
    return tokenContract.allowance(owner, spender) as Promise<bigint>;
};

/**
 * Approve a spender to spend tokens.
 */
export const getEvmApprove = async ({
    signer,
    tokenAddress,
    amount,
    toAddress,
}: {
    signer: Signer;
    tokenAddress: string;
    amount: bigint;
    toAddress: string;
}) => {
    console.log(tokenAddress, amount, toAddress)
    try {
        const tokenContract = new Contract(tokenAddress, ERC20Abi, signer);
        const balance = await tokenContract.balanceOf(toAddress);
        console.log(balance)
        // const iface = new Interface(ERC20Abi);
        // const data = iface.encodeFunctionData("approve", [toAddress, amount]);
        //const tx = await signer.sendTransaction({ to: tokenAddress, data, value: "0" });
        const tx = await tokenContract.approve(toAddress, amount);
        const receipt = await tx.wait();
        return { success: true, receipt };
    } catch (error) {
        console.log(error)
        return { success: false };
    }
};