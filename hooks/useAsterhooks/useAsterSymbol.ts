import { useEffect, useMemo, useRef, useState } from "react";
import {
  getAsterExchangeInfo,
  getAster24hrTicker,
  getAsterPremiumIndex,
  ASTER_WS,
} from "@/lib/oracle/asterdex";
import { toFiniteNumber } from "@/utility/handy";

export interface SymbolData {
  symbol: string;
  baseAsset: string;
  quoteAsset: string;
  lastPrice: string;
  priceChange: string;
  priceChangePercent: string;
  volume: string;
  quoteVolume: string;
  fundingRate?: string;
  markPrice?: string;
  indexPrice?: string;
  nextFundingTime?: number;
  openInterest?: string;
  status: string;
  contractType: string;
  maxQty?: string;
  minQty?: string;
}

interface UseAsterSymbolsResult {
  symbols: SymbolData[];
  filteredSymbols: SymbolData[];
  loading: boolean;
  error: string | null;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  category: string;
  setCategory: (category: string) => void;
  tab: "Futures" | "Spot";
  setTab: (tab: "Futures" | "Spot") => void;
}

interface UseAsterSymbolsOptions {
  enabled?: boolean;
}

type RawExchangeInfoPayload = {
  symbols?: Array<{
    symbol?: string;
    baseAsset?: string;
    quoteAsset?: string;
    status?: string;
    contractType?: string;
    filters?: Array<{ filterType: string; minQty?: string; maxQty?: string }>;
  }>;
};

type RawTickerPayload = {
  s?: string;
  c?: string | number;
  p?: string | number;
  P?: string | number;
  v?: string | number;
  q?: string | number;
  lastPrice?: string | number;
  priceChange?: string | number;
  priceChangePercent?: string | number;
  volume?: string | number;
  quoteVolume?: string | number;
};

type RawMarkPricePayload = {
  s?: string;
  p?: string | number;
  i?: string | number;
  r?: string | number;
  T?: string | number;
  markPrice?: string | number;
  indexPrice?: string | number;
  lastFundingRate?: string | number;
  nextFundingTime?: string | number;
};

const RECONNECT_DELAY_MS = 10000;

const CATEGORIES = {
  "All markets": [],
  Top: ["BTC", "ETH", "BNB", "SOL", "XRP"],
  New: ["NEW"],
  Meme: ["DOGE", "SHIB"],
  Stocks: ["AAPL", "TSLA", "NVDA"],
  AI: [],
  "Pre-launch": [],
  Metals: ["GOLD", "SILVER"],
} as const;

const normalizeStringField = (value: unknown, fallback: string): string => {
  if (value === null || value === undefined) return fallback;
  const next = String(value);
  return next.length > 0 ? next : fallback;
};

const toArray = <T>(value: unknown): T[] => {
  if (Array.isArray(value)) return value as T[];
  if (value && typeof value === "object") return [value as T];
  return [];
};

const toErrorMessage = (error: unknown, fallback: string): string => {
  if (error instanceof Error && error.message) return error.message;
  return fallback;
};

const applyTickerUpdates = (
  previousSymbols: SymbolData[],
  updates: RawTickerPayload[]
): SymbolData[] => {
  if (!previousSymbols.length || !updates.length) return previousSymbols;

  const updatesBySymbol = new Map<string, RawTickerPayload>();
  for (const update of updates) {
    const symbolCode = normalizeStringField(update.s, "").toUpperCase();
    if (!symbolCode) continue;
    updatesBySymbol.set(symbolCode, update);
  }

  if (!updatesBySymbol.size) return previousSymbols;

  let hasChanges = false;
  const nextSymbols = previousSymbols.map((symbolItem) => {
    const update = updatesBySymbol.get(symbolItem.symbol);
    if (!update) return symbolItem;

    const nextLastPrice = normalizeStringField(
      update.c ?? update.lastPrice,
      symbolItem.lastPrice
    );
    const nextPriceChange = normalizeStringField(
      update.p ?? update.priceChange,
      symbolItem.priceChange
    );
    const nextPriceChangePercent = normalizeStringField(
      update.P ?? update.priceChangePercent,
      symbolItem.priceChangePercent
    );
    const nextVolume = normalizeStringField(update.v ?? update.volume, symbolItem.volume);
    const nextQuoteVolume = normalizeStringField(
      update.q ?? update.quoteVolume,
      symbolItem.quoteVolume
    );

    if (
      nextLastPrice === symbolItem.lastPrice &&
      nextPriceChange === symbolItem.priceChange &&
      nextPriceChangePercent === symbolItem.priceChangePercent &&
      nextVolume === symbolItem.volume &&
      nextQuoteVolume === symbolItem.quoteVolume
    ) {
      return symbolItem;
    }

    hasChanges = true;
    return {
      ...symbolItem,
      lastPrice: nextLastPrice,
      priceChange: nextPriceChange,
      priceChangePercent: nextPriceChangePercent,
      volume: nextVolume,
      quoteVolume: nextQuoteVolume,
    };
  });

  return hasChanges ? nextSymbols : previousSymbols;
};

const applyMarkPriceUpdates = (
  previousSymbols: SymbolData[],
  updates: RawMarkPricePayload[]
): SymbolData[] => {
  if (!previousSymbols.length || !updates.length) return previousSymbols;

  const updatesBySymbol = new Map<string, RawMarkPricePayload>();
  for (const update of updates) {
    const symbolCode = normalizeStringField(update.s, "").toUpperCase();
    if (!symbolCode) continue;
    updatesBySymbol.set(symbolCode, update);
  }

  if (!updatesBySymbol.size) return previousSymbols;

  let hasChanges = false;
  const nextSymbols = previousSymbols.map((symbolItem) => {
    const update = updatesBySymbol.get(symbolItem.symbol);
    if (!update) return symbolItem;

    const nextFundingRate = normalizeStringField(
      update.r ?? update.lastFundingRate,
      symbolItem.fundingRate ?? "0"
    );
    const nextMarkPrice = normalizeStringField(
      update.p ?? update.markPrice,
      symbolItem.markPrice ?? symbolItem.lastPrice
    );
    const nextIndexPrice = normalizeStringField(
      update.i ?? update.indexPrice,
      symbolItem.indexPrice ?? "0"
    );
    const nextFundingTimeValue = Math.trunc(
      toFiniteNumber(update.T ?? update.nextFundingTime ?? symbolItem.nextFundingTime)
    );
    const nextFundingTime = nextFundingTimeValue > 0 ? nextFundingTimeValue : symbolItem.nextFundingTime;

    if (
      nextFundingRate === symbolItem.fundingRate &&
      nextMarkPrice === symbolItem.markPrice &&
      nextIndexPrice === symbolItem.indexPrice &&
      nextFundingTime === symbolItem.nextFundingTime
    ) {
      return symbolItem;
    }

    hasChanges = true;
    return {
      ...symbolItem,
      fundingRate: nextFundingRate,
      markPrice: nextMarkPrice,
      indexPrice: nextIndexPrice,
      nextFundingTime,
    };
  });

  return hasChanges ? nextSymbols : previousSymbols;
};

export const useAsterSymbols = (
  options: UseAsterSymbolsOptions = {}
): UseAsterSymbolsResult => {
  const { enabled = true } = options;

  const [symbols, setSymbols] = useState<SymbolData[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [category, setCategory] = useState("All markets");
  const [tab, setTab] = useState<"Futures" | "Spot">("Futures");

  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!enabled) {
      setLoading(false);
      return undefined;
    }

    let isMounted = true;
    const controller = new AbortController();

    const fetchSymbols = async () => {
      try {
        setLoading(true);
        setError(null);

        const [exchangeResult, tickerResult, premiumResult] = await Promise.all([
          getAsterExchangeInfo(),
          getAster24hrTicker(),
          getAsterPremiumIndex(),
        ]);

        if (!exchangeResult.success) {
          return
        }
        if (!tickerResult.success) {
          return
        }

        const exchangeData = exchangeResult as RawExchangeInfoPayload;
        const tickerData = toArray<RawTickerPayload>(tickerResult.ticker);
        const premiumData = toArray<RawMarkPricePayload>(premiumResult);

        const tickerMap = new Map<string, RawTickerPayload>();
        tickerData.forEach((item) => {
          const symbolCode = normalizeStringField(item.s, "").toUpperCase();
          if (!symbolCode) return;
          tickerMap.set(symbolCode, item);
        });

        const premiumMap = new Map<string, RawMarkPricePayload>();
        premiumData.forEach((item) => {
          const symbolCode = normalizeStringField(item.s, "").toUpperCase();
          if (!symbolCode) return;
          premiumMap.set(symbolCode, item);
        });

        const mergedData: SymbolData[] = (exchangeData.symbols ?? [])
          .filter((symbolItem) => {
            return symbolItem.contractType === "PERPETUAL" && symbolItem.status === "TRADING";
          })
          .map((symbolItem) => {
            // ── FIX: safe access filters ──
            const filters = (symbolItem as any).filters || [];
            const lotSizeFilter = filters.find(
              (f: any) => f.filterType === "LOT_SIZE"
            );
            const symbolCode = normalizeStringField(symbolItem.symbol, "").toUpperCase();
            const ticker = tickerMap.get(symbolCode);
            const premium = premiumMap.get(symbolCode);
            const nextFundingTimeValue = Math.trunc(
              toFiniteNumber(premium?.T ?? premium?.nextFundingTime)
            );

            return {
              symbol: symbolCode,
              maxQty: lotSizeFilter?.maxQty || "0",
              minQty: lotSizeFilter?.minQty || "0",
              baseAsset: normalizeStringField(symbolItem.baseAsset, symbolCode),
              quoteAsset: normalizeStringField(symbolItem.quoteAsset, "USDT"),
              lastPrice: normalizeStringField(ticker?.c ?? ticker?.lastPrice, "0"),
              priceChange: normalizeStringField(ticker?.p ?? ticker?.priceChange, "0"),
              priceChangePercent: normalizeStringField(
                ticker?.P ?? ticker?.priceChangePercent,
                "0"
              ),
              volume: normalizeStringField(ticker?.v ?? ticker?.volume, "0"),
              quoteVolume: normalizeStringField(ticker?.q ?? ticker?.quoteVolume, "0"),
              fundingRate: normalizeStringField(premium?.r ?? premium?.lastFundingRate, "0"),
              markPrice: normalizeStringField(
                premium?.p ?? premium?.markPrice,
                normalizeStringField(ticker?.c ?? ticker?.lastPrice, "0")
              ),
              indexPrice: normalizeStringField(premium?.i ?? premium?.indexPrice, "0"),
              nextFundingTime: nextFundingTimeValue > 0 ? nextFundingTimeValue : 0,
              status: normalizeStringField(symbolItem.status, "TRADING"),
              contractType: normalizeStringField(symbolItem.contractType, "PERPETUAL"),
            };
          })
          .sort((first, second) => {
            return toFiniteNumber(second.quoteVolume) - toFiniteNumber(first.quoteVolume);
          });

        if (isMounted) {
          setSymbols(mergedData);
        }
      } catch (fetchError) {
        if (isMounted && !controller.signal.aborted) {
          setError(toErrorMessage(fetchError, "Failed to fetch Aster symbols"));
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    fetchSymbols();

    return () => {
      isMounted = false;
      controller.abort();
    };
  }, [enabled, tab]);

  useEffect(() => {
    if (!enabled) {
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }
      return undefined;
    }

    let disposed = false;

    const clearReconnectTimer = () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }
    };

    const connectWebSocket = () => {
      if (disposed) return;

      const ws = new WebSocket(
        `${ASTER_WS}/stream?streams=!ticker@arr/!markPrice@arr@1s`
      );
      wsRef.current = ws;

      ws.onopen = () => {
        if (disposed) return;
        setError(null);
      };

      ws.onmessage = (event) => {
        if (disposed) return;

        try {
          const message = JSON.parse(event.data) as { stream?: string; data?: unknown };
          const streamName = normalizeStringField(message.stream, "").toLowerCase();
          const payload = message.data ?? message;

          if (streamName.includes("!ticker@arr")) {
            const tickerUpdates = toArray<RawTickerPayload>(payload);
            if (tickerUpdates.length) {
              setSymbols((previous) => applyTickerUpdates(previous, tickerUpdates));
            }
            return;
          }

          if (streamName.includes("!markprice@arr")) {
            const markPriceUpdates = toArray<RawMarkPricePayload>(payload);
            if (markPriceUpdates.length) {
              setSymbols((previous) => applyMarkPriceUpdates(previous, markPriceUpdates));
            }
          }
        } catch (parseError) {
          setError(toErrorMessage(parseError, "Failed to parse market stream payload"));
        }
      };

      ws.onerror = () => {
        if (disposed) return;
        setError("Market stream connection error");
      };

      ws.onclose = () => {
        if (disposed) return;
        clearReconnectTimer();
        reconnectTimeoutRef.current = setTimeout(connectWebSocket, RECONNECT_DELAY_MS);
      };
    };

    connectWebSocket();

    return () => {
      disposed = true;
      clearReconnectTimer();
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
    };
  }, [enabled]);

  const filteredSymbols = useMemo(() => {
    let filtered = symbols;

    if (category !== "All markets" && CATEGORIES[category as keyof typeof CATEGORIES].length > 0) {
      const categoryAssets = CATEGORIES[category as keyof typeof CATEGORIES];
      filtered = filtered.filter((symbolItem) =>
        categoryAssets.some((asset) => symbolItem.symbol.includes(asset))
      );
    }

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter((symbolItem) => {
        return (
          symbolItem.symbol.toLowerCase().includes(query) ||
          symbolItem.baseAsset.toLowerCase().includes(query)
        );
      });
    }

    return filtered;
  }, [symbols, category, searchQuery]);

  return {
    symbols,
    filteredSymbols,
    loading,
    error,
    searchQuery,
    setSearchQuery,
    category,
    setCategory,
    tab,
    setTab,
  };
};