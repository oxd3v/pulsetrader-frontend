import { nativeFetchRequest, withQuery } from "./fetchRequest";
import { resolutionIntervalMap } from "@/constants/common/chart";
import { chainConfig } from "@/constants/common/chain";

const DEBRIDGE_HEADER = {
  "Content-Type": "application/json",
  Origin: "https://app.debridge.com",
  Referer: "https://app.debridge.com/",
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36 Edg/139.0.0.0",
};


// rate limiter config
const deBridgeBirdEyeRateLimiter = {
  id: 'deBridgeBirdEyeUrlLimiter',
  requestCount: 30,          // max 30 requests per window
  requestIntervalMs: 30000,  // 30-second window
};

export const fetchBirdEyePrice = async ({ tokenAddress, chainId }: { tokenAddress: string, chainId: number }) => {
  const chainName = chainConfig[chainId].name.toLowerCase();
  const url = withQuery('https://birdeye-rpc.debridge.finance/defi/price', { address: tokenAddress });

  try {
    const response: any = await nativeFetchRequest({
      url,
      method: 'GET',
      headers: {
        ...DEBRIDGE_HEADER,
        "X-Chain": chainName,
      },
      timeoutMs: 10000,
      urlRateLimiter: deBridgeBirdEyeRateLimiter,
    });
    return response?.data?.value;
  } catch (err) {
    // Log error silently – caller should handle
    return undefined;
  }
};

export const fetchBirdEyeCandleBar = async ({ tokenAddress, chainId, resolution }: { tokenAddress: string, chainId: number, resolution: string }) => {
  const chainName = chainConfig[chainId].name.toLowerCase();
  const requestTo = Math.floor(Date.now() / 1000);
  const requestFrom = Math.max(requestTo - 28512000);
  const url = `https://birdeye-rpc.debridge.finance/defi/ohlcv?address=${tokenAddress}&type=${resolutionIntervalMap[resolution]}&time_from=${requestFrom}&time_to=${requestTo}`;

  try {
    const response = await nativeFetchRequest({
      url,
      method: "GET",
      headers: {
        ...DEBRIDGE_HEADER,
        "X-Chain": chainName,
      },
      timeoutMs: 10000,
      urlRateLimiter: deBridgeBirdEyeRateLimiter,
    });
    const candleData = response?.data.items ?? null;
    return candleData.map((candle: any) => {
      return {
        time: (candle.unixTime * 1000),
        open: candle.o,
        high: candle.h,
        low: candle.l,
        close: candle.c,
        volume: candle.v,
      };
    });
  } catch (err) {
    return null;
  }
};

//fetchBirdEyePrice({ tokenAddress: 'NV2RYH954cTJ3ckFUpvfqaQXU4ARqqDH3562nFSpump', chainId: 1399811149 }).then(console.log)
//fetchBirdEyeTokenInfo({ tokenAddress: 'NV2RYH954cTJ3ckFUpvfqaQXU4ARqqDH3562nFSpump', chainId: 1399811149 }).then(console.log)
//fetchBirdEyeCandle({ tokenAddress: 'JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN', chainId: 1399811149, interval: '1m', }).then(console.log)