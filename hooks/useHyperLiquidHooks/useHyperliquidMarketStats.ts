import { useEffect, useMemo, useState } from 'react';
import { getHyperLiquidSymbols, toHyperliquidMarketSymbol } from '@/lib/oracle/hyperliquid';
import { normalizeCoin } from "@/utility/perpUtils";
import { toFiniteNumber } from "@/utility/handy";

interface UseHyperliquidMarketStatsOptions {
  pollMs?: number;
}

export interface HyperliquidMarketStats {
  symbol: string;
  lastPrice: number;
  maxLeverage: number;
  priceChangePercent: number;
  markPrice: number;
  indexPrice: number;
  fundingRate: number;
  nextFundingTime: number;
  quoteVolume: number;
  openInterest: number;
  openInterestUsd: number;
  eventTime: number;
}

interface UseHyperliquidMarketStatsReturn {
  loading: boolean;
  error: string | null;
  connected: boolean;
  marketSymbol: string;
  stats: HyperliquidMarketStats;
}

type MetaUniverseItem = {
  name?: string;
  maxLeverage?: number;
};

type MetaPayload = {
  universe?: MetaUniverseItem[];
};

type AssetContext = {
  markPx?: string | number;
  midPx?: string | number;
  oraclePx?: string | number;
  funding?: string | number;
  fundingRate?: string | number;
  dayNtlVlm?: string | number;
  dayNtlVolume?: string | number;
  openInterest?: string | number;
  openInterestNtl?: string | number;
  prevDayPx?: string | number;
  prevDayPrice?: string | number;
  nextFundingTime?: string | number;
};

const DEFAULT_POLL_MS = 2500;


const createEmptyStats = (symbol: string): HyperliquidMarketStats => ({
  symbol,
  lastPrice: 0,
  maxLeverage: 0,
  priceChangePercent: 0,
  markPrice: 0,
  indexPrice: 0,
  fundingRate: 0,
  nextFundingTime: 0,
  quoteVolume: 0,
  openInterest: 0,
  openInterestUsd: 0,
  eventTime: 0,
});

const toErrorMessage = (error: unknown, fallback: string): string => {
  if (error instanceof Error && error.message) {
    return error.message;
  }
  return fallback;
};



export const useHyperliquidMarketStats = (
  symbol: string,
  options: UseHyperliquidMarketStatsOptions = {}
): UseHyperliquidMarketStatsReturn => {
  const coin = useMemo(() => normalizeCoin(symbol), [symbol]);
  const marketSymbol = useMemo(() => toHyperliquidMarketSymbol(coin), [coin]);
  const pollMs = useMemo(() => {
    const parsed = Math.trunc(options.pollMs ?? DEFAULT_POLL_MS);
    return Math.max(1000, parsed);
  }, [options.pollMs]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [connected, setConnected] = useState(false);
  const [stats, setStats] = useState<HyperliquidMarketStats>(() => createEmptyStats(marketSymbol));

  useEffect(() => {
    if (!coin) {
      setLoading(false);
      setConnected(false);
      setError(null);
      setStats(createEmptyStats(''));
      return undefined;
    }

    let disposed = false;

    const loadStats = async () => {
      try {
        const data: any = await getHyperLiquidSymbols();
        const [universe, contexts] = data;
        const targetIndex = universe.findIndex((item: any) => {
          const itemCoin = String(item?.name ?? '').toUpperCase();
          return itemCoin === coin;
        });

        if (targetIndex < 0) {
          throw new Error(`HyperLiquid symbol not found: ${coin}`);
        }

        const universeItem = universe[targetIndex] ?? {};
        const context = contexts[targetIndex] ?? {};

        const maxLeverage = toFiniteNumber(universeItem.maxLeverage);
        const markPrice = toFiniteNumber(context.markPx ?? context.midPx);
        const indexPrice = toFiniteNumber(context.oraclePx ?? context.midPx ?? context.markPx);
        const lastPrice = markPrice > 0 ? markPrice : toFiniteNumber(context.midPx);
        const fundingRate = toFiniteNumber(context.fundingRate ?? context.funding);

        const quoteVolume = toFiniteNumber(context.dayNtlVlm ?? context.dayNtlVolume);
        const openInterest = toFiniteNumber(context.openInterest);
        const openInterestNotional = toFiniteNumber(context.openInterestNtl);

        const prevDayPrice = toFiniteNumber(context.prevDayPx ?? context.prevDayPrice);
        const priceChangePercent =
          prevDayPrice > 0 && lastPrice > 0
            ? ((lastPrice - prevDayPrice) / prevDayPrice) * 100
            : 0;

        const openInterestUsd =
          openInterestNotional > 0
            ? openInterestNotional
            : openInterest > 0 && lastPrice > 0
              ? openInterest * lastPrice
              : 0;

        const nextFundingTime = Math.trunc(toFiniteNumber(context.nextFundingTime));

        if (disposed) return;

        setStats({
          symbol: marketSymbol,
          lastPrice,
          maxLeverage,
          priceChangePercent,
          markPrice,
          indexPrice,
          fundingRate,
          nextFundingTime,
          quoteVolume,
          openInterest,
          openInterestUsd,
          eventTime: Date.now(),
        });
        setConnected(true);
        setError(null);
      } catch (loadError) {
        if (disposed) return;
        setConnected(false);
        setError(toErrorMessage(loadError, 'Failed to fetch HyperLiquid market stats'));
      } finally {
        if (!disposed) {
          setLoading(false);
        }
      }
    };

    loadStats();
    const intervalId = setInterval(loadStats, pollMs);

    return () => {
      disposed = true;
      clearInterval(intervalId);
    };
  }, [coin, marketSymbol, pollMs]);

  return {
    loading,
    error,
    connected,
    marketSymbol,
    stats,
  };
};