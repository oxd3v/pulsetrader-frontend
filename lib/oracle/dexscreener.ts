import { nativeFetchRequest, withQuery } from "./fetchRequest";
import { chains } from "@/constants/common/chain";

export const DEXSCREENER_NETWORK_IDENTIFIER = {
  [chains.Avalanche]: 'avalanche',
  [chains.Ethereum]: 'ethereum',
  [chains.Arbitrum]: 'arbitrum',
  [chains.Solana]: 'solana'
}
const DEXSCREENER_API = 'https://api.dexscreener.com'
const DEXSCREENER_HEADER = {
  "Content-Type": "application/json",
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36 Edg/139.0.0.0",
};


const dexScreenerRateLimiter = {
  id: 'dexScreenerRateLimiter',
  requestCount: 30,
  requestIntervalMs: 30000,
};

export const getDexScreenerPairDetails = async ({ tokenAddress, chainId }: { tokenAddress: string, chainId: number }) => {
  const networkIdentifier = DEXSCREENER_NETWORK_IDENTIFIER[chainId];
  const url = `${DEXSCREENER_API}/token-pairs/v1/${networkIdentifier}/${tokenAddress}`;
  try {
    const response = await nativeFetchRequest({
      url,
      method: 'GET',
      headers: {
        ...DEXSCREENER_HEADER,
      },
      timeoutMs: 10000,
      urlRateLimiter: dexScreenerRateLimiter,
    });
    return response
  } catch (err) {
    // Log error silently – caller should handle
    return undefined;
  }
};

export const getDexScreenerTokenDetails = async ({ tokenAddress, chainId }: { tokenAddress: string, chainId: number }) => {
  const pairs = await getDexScreenerPairDetails({ tokenAddress, chainId })
  if (!pairs) {
    return null;
  }
  let tokenDetails: any = {}
  for (const pair of pairs) {
    if (pair.baseToken.address.toLowerCase() == tokenAddress.toLowerCase()) {
      tokenDetails.name = pair.baseToken.name;
      tokenDetails.symbol = pair.baseToken.symbol;
      tokenDetails.decimals = pair.baseToken?.decimals || null;
      tokenDetails.address = pair.baseToken.address;
      tokenDetails.priceUsd = pair.priceUsd;
      tokenDetails.imageUrl = pair.info.imageUrl;
      tokenDetails.pairAddress = pair.pairAddress;
      tokenDetails.quoteTokenAddress = pair.quoteToken.address;
      tokenDetails.quoteTokenSymbol = pair.quoteToken.symbol;
      tokenDetails.quoteTokenName = pair.quoteToken.name;
      tokenDetails.marketCap = parseFloat(pair.marketCap);
      tokenDetails.fdv = parseFloat(pair.fdv);
      tokenDetails.holderCount = null;
      tokenDetails.dataProvider = 'dexscreener',
        tokenDetails.priceChangePct1h = pair.priceChange.h1;
      tokenDetails.priceChangePct24h = pair.priceChange.h24;
      tokenDetails.volume5m = parseFloat(pair.volume.m5);
      tokenDetails.volume24h = parseFloat(pair.volume.h24);
      tokenDetails.volume1h = parseFloat(pair.volume.h1);
      tokenDetails.liquidity = parseFloat(pair.liquidity.usd);
      tokenDetails.buyCount5m = pair.txns.m5.buys;
      tokenDetails.sellCount5m = pair.txns.m5.sells;
      tokenDetails.buyCount24h = pair.txns.h24.buys;
      tokenDetails.sellCount24h = pair.txns.h24.sells;
      tokenDetails.buyCount1h = pair.txns.h1.buys;
      tokenDetails.sellCount1h = pair.txns.h1.sells;
      return tokenDetails
    }
  }
}

export const fetchDexScreenerTokenPrice = async ({ tokenAddress, chainId }: { tokenAddress: string, chainId: number }) => {
  const pairs = await getDexScreenerPairDetails({ tokenAddress, chainId })
  if (!pairs) {
    return null;
  }
  for (const pair of pairs) {
    if (pair.baseToken.address.toLowerCase() == tokenAddress.toLowerCase()) {
      return pair.priceUsd
    }
  }
}

//getDexScreenerTokenDetails({ tokenAddress: "0xB8d7710f7d8349A506b75dD184F05777c82dAd0C", chainId: 43114 }).then(console.log)
//fetchDexScreenerTokenPrice({ tokenAddress: "Ai66LHZG9MCzg1WKdawwqduVAXpNDUuV8M3uyq5ppump", chainId: 1399811149 }).then(console.log)
