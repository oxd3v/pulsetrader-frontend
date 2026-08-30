import { nativeFetchRequest } from "./fetchRequest"


export const getHyperliquidAvailableBalance = async (userAddress: string) => {
    const state = await nativeFetchRequest({
        url: 'https://api.hyperliquid.xyz/info',
        method: 'POST',
        data: {
            type: "clearinghouseState",
            user: userAddress,
        },
    });
    if (!state) return;
    return parseFloat(state.withdrawable)
}

export const getHyperliquidTestnetAvailableBalance = async (userAddress: string) => {
    const state = await nativeFetchRequest({
        url: 'https://api.hyperliquid-testnet.xyz/info',
        method: 'POST',
        data: {
            type: "spotClearinghouseState",
            user: userAddress,
        },
    });
    if (!state) return;
    const availableValue = parseFloat(state?.tokenToAvailableAfterMaintenance?.[0]?.[1])
    return availableValue;
}


export const getPerpExchangeAvailableBalance = async (userAddress: string, exchange: string, isMainnet: boolean) => {
    if (exchange == 'hyperliquid') {
        if (isMainnet) {
            return getHyperliquidAvailableBalance(userAddress)
        } else {
            return getHyperliquidTestnetAvailableBalance(userAddress)
        }
    }
}