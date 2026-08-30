import { useEffect, useMemo, useState } from "react";
import { getHyperLiquidSymbols } from "@/lib/oracle/hyperliquid";
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
}

interface UseHyperliquidSymbolsResult {
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

interface UseHyperliquidSymbolsOptions {
  enabled?: boolean;
}

type MetaUniverseItem = {
  name?: string;
};

type AssetContext = {
  markPx?: string | number;
  midPx?: string | number;
  oraclePx?: string | number;
  funding?: string | number;
  fundingRate?: string | number;
  dayNtlVlm?: string | number;
  dayNtlVolume?: string | number;
  dayBaseVlm?: string | number;
  openInterest?: string | number;
  openInterestNtl?: string | number;
  prevDayPx?: string | number;
  prevDayPrice?: string | number;
  nextFundingTime?: string | number;
};

const POLL_MS = 10000;

const CATEGORIES = {
  "All markets": [],
  Top: ["BTC", "ETH", "SOL", "HYPE"],
  New: ["NEW"],
  Meme: ["DOGE", "PEPE"],
  Stocks: [],
  AI: [],
  "Pre-launch": [],
  Metals: [],
} as const;

const toErrorMessage = (error: unknown, fallback: string): string => {
  if (error instanceof Error && error.message) return error.message;
  return fallback;
};

const areSymbolsEqual = (prev: SymbolData[], next: SymbolData[]): boolean => {
  if (prev === next) return true;
  if (prev.length !== next.length) return false;

  for (let index = 0; index < prev.length; index += 1) {
    const prevItem = prev[index];
    const nextItem = next[index];
    if (
      prevItem.symbol !== nextItem.symbol ||
      prevItem.lastPrice !== nextItem.lastPrice ||
      prevItem.priceChangePercent !== nextItem.priceChangePercent ||
      prevItem.quoteVolume !== nextItem.quoteVolume ||
      prevItem.fundingRate !== nextItem.fundingRate ||
      prevItem.openInterest !== nextItem.openInterest ||
      prevItem.markPrice !== nextItem.markPrice ||
      prevItem.indexPrice !== nextItem.indexPrice
    ) {
      return false;
    }
  }
  return true;
};

const buildSymbolRows = (
  universe: MetaUniverseItem[],
  contexts: AssetContext[]
): SymbolData[] => {
  if (!Array.isArray(universe) || !Array.isArray(contexts)) return [];

  return universe
    .map((item, index) => {
      const baseAsset = String(item?.name ?? "").toUpperCase();
      if (!baseAsset) return null;

      const context = contexts[index] ?? {};
      const markPrice = toFiniteNumber(context.markPx ?? context.midPx);
      const lastPrice = markPrice > 0 ? markPrice : toFiniteNumber(context.midPx);
      const indexPrice = toFiniteNumber(
        context.oraclePx ?? context.midPx ?? context.markPx
      );
      const fundingRate = toFiniteNumber(context.fundingRate ?? context.funding);
      const quoteVolume = toFiniteNumber(context.dayNtlVlm ?? context.dayNtlVolume);
      const volume = toFiniteNumber(context.dayBaseVlm);

      const prevDayPrice = toFiniteNumber(context.prevDayPx ?? context.prevDayPrice);
      const priceChange =
        lastPrice > 0 && prevDayPrice > 0 ? lastPrice - prevDayPrice : 0;
      const priceChangePercent =
        lastPrice > 0 && prevDayPrice > 0 ? (priceChange / prevDayPrice) * 100 : 0;

      const openInterestNotional = toFiniteNumber(context.openInterestNtl);
      const openInterestUnits = toFiniteNumber(context.openInterest);
      const openInterestValue =
        openInterestNotional > 0
          ? openInterestNotional
          : openInterestUnits > 0 && lastPrice > 0
            ? openInterestUnits * lastPrice
            : 0;

      return {
        symbol: `${baseAsset}USDT`,
        baseAsset,
        quoteAsset: "USDT",
        lastPrice: String(lastPrice || 0),
        priceChange: String(priceChange || 0),
        priceChangePercent: String(priceChangePercent || 0),
        volume: String(volume || 0),
        quoteVolume: String(quoteVolume || 0),
        fundingRate: String(fundingRate || 0),
        markPrice: String(markPrice || 0),
        indexPrice: String(indexPrice || 0),
        nextFundingTime: Math.trunc(toFiniteNumber(context.nextFundingTime)),
        openInterest: String(openInterestValue || 0),
        status: "TRADING",
        contractType: "PERPETUAL",
      } as SymbolData;
    })
    .filter((item): item is SymbolData => item !== null)
    .sort(
      (first, second) =>
        toFiniteNumber(second.quoteVolume) - toFiniteNumber(first.quoteVolume)
    );
};

export const useHyperliquidSymbols = (
  options: UseHyperliquidSymbolsOptions = {}
): UseHyperliquidSymbolsResult => {
  const { enabled = true } = options;

  const [symbols, setSymbols] = useState<SymbolData[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [category, setCategory] = useState("All markets");
  const [tab, setTab] = useState<"Futures" | "Spot">("Futures");

  useEffect(() => {
    if (!enabled) {
      setLoading(false);
      return undefined;
    }

    let disposed = false;
    let isInitialLoad = true;

    const loadSymbols = async () => {
      try {
        if (!disposed && isInitialLoad) {
          setLoading(true);
          setError(null);
        }

        const data = await getHyperLiquidSymbols();
        // ── FIX: Check if data is valid ──
        if (!data || !Array.isArray(data) || data.length < 2) {
          //throw new Error("Invalid data from HyperLiquid API");
          return
        }
        const [universe, contexts] = data;
        if (disposed) return;

        const nextSymbols = buildSymbolRows(universe, contexts);
        setSymbols((previous) =>
          areSymbolsEqual(previous, nextSymbols) ? previous : nextSymbols
        );
        setError(null);
      } catch (loadError) {
        if (disposed) return;
        const message = toErrorMessage(loadError, "Failed to fetch HyperLiquid symbols");
        setError((previous) => (previous === message ? previous : message));
      } finally {
        if (!disposed && isInitialLoad) {
          setLoading(false);
          isInitialLoad = false;
        }
      }
    };

    loadSymbols();
    const intervalId = setInterval(loadSymbols, POLL_MS);

    return () => {
      disposed = true;
      clearInterval(intervalId);
    };
  }, [enabled, tab]);

  const filteredSymbols = useMemo(() => {
    let filtered = symbols;

    if (
      category !== "All markets" &&
      CATEGORIES[category as keyof typeof CATEGORIES]?.length > 0
    ) {
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