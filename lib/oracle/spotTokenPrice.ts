import { fetchCodexTokenPrice } from "./codex";
import { fetchBirdEyePrice } from "./birdEye";
import { fetchDexScreenerTokenPrice } from "./dexscreener";

export const getTokenPrices = async ({ tokenAddress, chainId }: { tokenAddress: string; chainId: number }) => {
    let tokenPrice;
    try {
        tokenPrice = await fetchBirdEyePrice({ tokenAddress, chainId });
        if (!tokenPrice) {
            tokenPrice = await fetchDexScreenerTokenPrice({ tokenAddress, chainId });
        }
        if (!tokenPrice) {
            tokenPrice = await fetchCodexTokenPrice({ tokenAddress, chainId });
        }
        return tokenPrice;
    } catch (err) {
        return null;
    }
}