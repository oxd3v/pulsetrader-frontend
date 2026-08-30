
import { nativeFetchRequest } from "./fetchRequest";
import { resolutionIntervalMap } from "@/constants/common/chart";
import { normalizeCoin } from "@/utility/perpUtils"
export const HYPERLIQUID_API_URLS = [
  {
    url: 'https://api-ui.hyperliquid.xyz',
    headers: {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/[IP_ADDRESS] Safari/537.36",
    },
    urlRateLimiter: {
      id: 'hyperMainnetApiUi001',
      requestCount: 50,          // max 50 requests per window
      requestIntervalMs: 30000,  // 30-second window
    }
  },
  {
    url: 'https://api.hyperliquid.xyz',
    urlRateLimiter: {
      id: 'hyperMainnetApiurl001',
      requestCount: 30,         // max 30 requests per window
      requestIntervalMs: 30000,  // 30-second window
    }
  }
]



export const toHyperliquidMarketSymbol = (coin: string): string => {
  if (!coin) return '';
  return `${coin}USDC`;
};

type HyperliquidCandle = {
  t?: number | string;
  T?: number | string;
  o?: number | string;
  h?: number | string;
  l?: number | string;
  c?: number | string;
  v?: number | string;
};


const parseOracleCandle = (rawCandle: HyperliquidCandle) => {
  return {
    time: Number(rawCandle.t),
    open: Number(rawCandle.o),
    high: Number(rawCandle.h),
    low: Number(rawCandle.l),
    close: Number(rawCandle.c),
    volume: Number(rawCandle.v),
    closeTime: Number(rawCandle.T),
  };
};

const normalizeMetaAndAssetCtxPayload = (
  payload: any
) => {
  const [metaOrUniverse, contexts] = payload;
  const universe = Array.isArray(metaOrUniverse)
    ? metaOrUniverse
    : Array.isArray(metaOrUniverse?.universe)
      ? metaOrUniverse.universe
      : [];

  return [universe, Array.isArray(contexts) ? contexts : []];
};

export const getHyperLiquidCandles = async ({
  symbol,
  from,
  to,
  resolution,
  limit,
}: {
  symbol: string;
  from: number;
  to: number;
  resolution: string;
  limit: number;
}) => {
  const coin = normalizeCoin(symbol);
  if (!coin) {
    return {
      candles: [],
      success: false,
      error: "Invalid symbol",
    };
  }

  const fromTimestampMili = Math.floor(from * 1000);
  const toTimestampMil = Math.floor(to * 1000);

  const interval = resolutionIntervalMap[resolution] || "1h";
  for (const urlCfg of HYPERLIQUID_API_URLS) {
    try {
      const data = await nativeFetchRequest({
        url: `${urlCfg.url}/info`,
        method: "POST",
        data: {
          req: {
            coin,
            endTime: toTimestampMil,
            interval,
            startTime: fromTimestampMili,
          },
          type: "candleSnapshot",
        },
      });

      const candles = Array.isArray(data)
        ? data
          .slice(0, Math.max(1, Math.min(limit, 1000)))
          .map((item) => parseOracleCandle(item as HyperliquidCandle))
          .filter((bar) => Number.isFinite(bar.time))
        : [];

      return candles;

    } catch (err) {

    }
  }

  return null
};

export const getHyperLiquidSymbols = async () => {
  for (const urlCfg of HYPERLIQUID_API_URLS) {
    try {
      const data = await nativeFetchRequest({
        url: `${urlCfg.url}/info`,
        method: "POST",
        data: {
          type: "metaAndAssetCtxs",
        },
        urlRateLimiter: urlCfg.urlRateLimiter
      });

      return normalizeMetaAndAssetCtxPayload(data);
    } catch (err) {
      return null;
    }
  }
  return null;
}

export const getHyperLiquidOrderBookDepth = async (symbol: string) => {
  const coin = normalizeCoin(symbol);
  if (!coin) {
    return null;
  }
  for (const urlCfg of HYPERLIQUID_API_URLS) {
    try {
      const data = await nativeFetchRequest({
        url: `${urlCfg.url}/info`,
        method: "POST",
        data: {
          type: "l2Book",
          coin
        },
        urlRateLimiter: urlCfg.urlRateLimiter
      });

      return data;
    } catch (err) {
      return null;
    }
  }
  return null;
}

export const getHyperLiquidRecentTrades = async (symbol: string) => {
  const coin = normalizeCoin(symbol);
  if (!coin) {
    return null;
  }
  for (const urlCfg of HYPERLIQUID_API_URLS) {
    try {
      const data = await nativeFetchRequest({
        url: `${urlCfg.url}/info`,
        method: "POST",
        data: {
          type: "recentTrades",
          coin
        },
        urlRateLimiter: urlCfg.urlRateLimiter
      });

      return data;
    } catch (err) {
      return null;
    }
  }
  return null;
}


