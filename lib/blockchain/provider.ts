import { JsonRpcProvider } from "ethers";
import { chainConfig } from "@/constants/common/chain";



export const getConnectionProvider = (chainId: number, networkType: "evm" | "svm" = "evm") => {
    const chain = chainConfig[chainId];
    if (!chain) return null;
    if (networkType === "evm") {
        const randomRpcUrl = chain.rpcUrls[Math.floor(Math.random() * chain.rpcUrls.length)];
        return new JsonRpcProvider(randomRpcUrl);
    }
}