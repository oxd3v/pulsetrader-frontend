import { nativeFetchRequest } from "./fetchRequest";
import { resolutionIntervalMap } from "@/constants/common/chart";
import { normalizeAsterSymbol } from "@/utility/perpUtils";

// ─── Endpoint configurations ──────────────────────────────────────────────
const ASTER_API_URL = [
  {
    url: "https://fapi.asterdex.com",
    headers: {
      "Content-Type": "application/json",
    },
    urlRateLimiter: {
      id: 'asterFapi001',
      requestCount: 30,
      requestIntervalMs: 30000,
    }
  },
  {
    url: "https://www.asterdex.com",
    headers: {
      "Content-Type": "application/json",
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36 Edg/139.0.0.0",
    },
    urlRateLimiter: {
      id: 'asterMainnetApi001',
      requestCount: 50,
      requestIntervalMs: 30000,
    }
  },
];

// ─── WebSocket streams (unchanged) ─────────────────────────────────────
export const ASTER_WS = "wss://fstream.asterdex.com";

export const ASTER_WEBSOCKET_STREAMS = {
  orderBook: (symbol: string, speed: string = "100ms") =>
    `${ASTER_WS}/${symbol.toLowerCase()}@depth@${speed}`,
  trades: (symbol: string) => `${ASTER_WS}/${symbol.toLowerCase()}@trade`,
  klines: (symbol: string, interval: string) =>
    `${ASTER_WS}/${symbol.toLowerCase()}@kline_${interval}`,
};

// ─── Helpers ──────────────────────────────────────────────────────────────
function parseOracleCandle(rawCandle: any) {
  const [
    time,
    open,
    high,
    low,
    close,
    volume,
    closeTime,
    quoteAssetVolume,
    numberOfTrades,
    takerBuyBaseAssetVolume,
    takerBuyQuoteAssetVolume,
  ] = rawCandle;

  return {
    time: Number(time),
    open: parseFloat(open),
    high: parseFloat(high),
    low: parseFloat(low),
    close: parseFloat(close),
    volume: parseFloat(volume),
    closeTime: Number(closeTime),
    quoteAssetVolume: parseFloat(quoteAssetVolume),
    numberOfTrades,
    takerBuyBaseAssetVolume: parseFloat(takerBuyBaseAssetVolume),
    takerBuyQuoteAssetVolume: parseFloat(takerBuyQuoteAssetVolume),
  };
}



// ─── Public API functions ────────────────────────────────────────────────


export const getAsterKLines = async ({
  symbol,
  resolution,
  from,
  to,
  limit,
}: {
  symbol: string;
  resolution: string;
  from: number;
  to: number;
  limit: number;
}) => {
  const fromTimestampMili = Math.floor(from * 1000);
  const toTimestampMil = Math.floor(to * 1000);
  const interval = resolutionIntervalMap[resolution] || "1h";
  const asterSymbol = normalizeAsterSymbol(symbol)

  for (const cfg of ASTER_API_URL) {
    try {
      const url = `${cfg.url}/fapi/v3/klines?symbol=${asterSymbol}&interval=${interval}&startTime=${fromTimestampMili}&endTime=${toTimestampMil}&limit=${limit}`;
      const candleData: any[] = await nativeFetchRequest({
        url,
        method: "GET",
        headers: cfg.headers,
        urlRateLimiter: cfg.urlRateLimiter
      });

      const candles = candleData?.map(parseOracleCandle);
      return candles;
    } catch {
      continue;
    }
  }
  return null;
};


export const getAsterTrade = async (symbol: string, limit = 100) => {
  const safeLimit = Math.min(limit, 1000);
  const asterSymbol = normalizeAsterSymbol(symbol);

  for (const cfg of ASTER_API_URL) {
    try {
      const url = `${cfg.url}/fapi/v3/trades?symbol=${asterSymbol}&limit=${safeLimit}`;
      const trades = await nativeFetchRequest({
        url,
        method: "GET",
        headers: cfg.headers,
        urlRateLimiter: cfg.urlRateLimiter
      });

      return {
        trades: trades || [],
        success: true as const,
      };
    } catch {
      continue;
    }
  }

  return {
    trades: [],
    success: false as const,
    error: "All AsterDEX endpoints failed for trades",
  };
};


export const getAsterOrderBook = async (symbol: string, limit = 20) => {
  const validLimits = [5, 10, 20, 50, 100, 500, 1000];
  const safeLimit = validLimits.includes(limit) ? limit : 20;
  const asterSymbol = normalizeAsterSymbol(symbol);
  for (const cfg of ASTER_API_URL) {
    try {
      const url = `${cfg.url}/fapi/v3/depth?symbol=${asterSymbol}&limit=${safeLimit}`;
      const depth = await nativeFetchRequest({
        url,
        method: "GET",
        headers: cfg.headers,
        urlRateLimiter: cfg.urlRateLimiter
      });

      return {
        depth,
        success: true as const,
      };
    } catch {
      continue;
    }
  }

  return {
    depth: null,
    success: false as const,
    error: "All AsterDEX endpoints failed for order book",
  };
};


export const getAster24hrTicker = async (symbol?: string) => {
  const path = symbol
    ? `/fapi/v3/ticker/24hr?symbol=${normalizeAsterSymbol(symbol)}`
    : "/fapi/v3/ticker/24hr";

  for (const cfg of ASTER_API_URL) {
    try {
      const url = `${cfg.url}${path}`;
      const ticker = await nativeFetchRequest({
        url,
        method: "GET",
        headers: cfg.headers,
        urlRateLimiter: cfg.urlRateLimiter
      });

      return {
        ticker,
        success: true as const,
      };
    } catch {
      continue;
    }
  }

  return {
    ticker: null,
    success: false as const,
    error: "All AsterDEX endpoints failed for 24hr ticker",
  };
};


export const getAsterPrice = async (symbol: string) => {
  const asterSymbol = normalizeAsterSymbol(symbol);
  for (const cfg of ASTER_API_URL) {
    try {
      const url = `${cfg.url}/fapi/v3/ticker/price?symbol=${asterSymbol}`;
      const priceData = await nativeFetchRequest({
        url,
        method: "GET",
        headers: cfg.headers,
        urlRateLimiter: cfg.urlRateLimiter
      });

      return {
        price: parseFloat(priceData.price),
        symbol: priceData.symbol,
        time: priceData.time,
        success: true as const,
      };
    } catch {
      continue;
    }
  }

  return {
    price: 0,
    success: false as const,
    error: "All AsterDEX endpoints failed for price",
  };
};


export const getAsterExchangeInfo = async () => {
  let lastError: unknown;

  for (const cfg of ASTER_API_URL) {
    try {
      const url = `${cfg.url}/fapi/v3/exchangeInfo`;
      const info = await nativeFetchRequest({
        url,
        method: "GET",
        headers: cfg.headers,
        urlRateLimiter: cfg.urlRateLimiter
      });

      return {
        symbols: info.symbols || [],
        timezone: info.timezone,
        serverTime: info.serverTime,
        success: true as const,
      };
    } catch (err) {
      lastError = err;
      continue;
    }
  }

  return {
    symbols: [],
    success: false as const,
    error: lastError instanceof Error ? lastError.message : "Unknown error",
  };
};


export const getMaxLeverage = async (symbol: string) => {
  const asterSymbol = normalizeAsterSymbol(symbol);
  try {
    const url = `https://www.asterdex.com/bapi/futures/v1/public/future/common/symbol/leverageoi/remaining?symbol=${asterSymbol}`;
    const response = await nativeFetchRequest({
      url,
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36 Edg/139.0.0.0",
      },
    });

    if (!response.success) {
      throw new Error(response.error || "API returned success=false");
    }

    const leverageOiRemainingMap = response.data?.leverageOiRemainingMap || {};
    const maxLeverage = Object.keys(leverageOiRemainingMap)
      .map(Number)
      .sort((a, b) => b - a)[0] || 0;

    return {
      maxLeverage,
      leverageOiRemainingMap,
      success: true as const,
    };
  } catch (error) {

    return {
      maxLeverage: 0,
      leverageOiRemainingMap: {},
      success: false as const,
      error: "All AsterDEX endpoints failed for max leverage",
    };
  }



};

export const getAsterOpenInterest = async (symbol: string) => {
  const asterSymbol = normalizeAsterSymbol(symbol)
  for (const cfg of ASTER_API_URL) {
    try {
      const url = `${cfg.url}/fapi/v3/openInterest?symbol=${asterSymbol}`;
      const openInterestResult = await nativeFetchRequest({
        url,
        method: "GET",
        headers: cfg.headers,
        urlRateLimiter: cfg.urlRateLimiter
      });

      return openInterestResult;
    } catch {
      continue;
    }
  }

  return null;
};

export const getAsterPremiumIndex = async () => {
  let lastError: unknown;

  for (const cfg of ASTER_API_URL) {
    try {
      const url = `${cfg.url}/fapi/v3/premiumIndex`;
      const info = await nativeFetchRequest({
        url,
        method: "GET",
        headers: cfg.headers,
        urlRateLimiter: cfg.urlRateLimiter
      });

      return info;
    } catch (err) {
      lastError = err;
      continue;
    }
  }

  return null;
};