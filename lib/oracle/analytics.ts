import { nativeFetchRequest } from "./fetchRequest";
import { chainConfig } from "@/constants/common/chain";
export const getWalletTokenTransferForAnalytics = async (address: string, chainId: number) => {
    let res = await nativeFetchRequest({ url: `https://cdn.routescan.io/api/evm/all/address/${address}/daily-erc20-transfers?ecosystem=${chainConfig[chainId].name.toLowerCase()}&excludedChainIds=1234%2C124816`, method: 'GET' })
    //let res = await fetch(`https://cdn.routescan.io/api/evm/address/${address}/daily-erc20-transfers?ecosystem=${chainConfig[chainId].name.toLowerCase()}&excludedChainIds=1234`);
    return res;
}

export const getNativeBalanceTransferForAnalytics = async (address: string, chainId: number) => {
    let res = await nativeFetchRequest({ url: `https://cdn.routescan.io/api/evm/${chainId}/address/${address}/daily-balance?ecosystem=${chainConfig[chainId].name.toLowerCase()}&excludedChainIds=1234%2C124816&includedChainIds=${chainId}`, method: 'GET' })
    //let res = await fetch(`https://cdn.routescan.io/api/evm/${chainId}/address/${address}/daily-balance?ecosystem=${chainConfig[chainId].name.toLowerCase()}&excludedChainIds=1234&includedChainIds=${chainId}`);
    return res;
}