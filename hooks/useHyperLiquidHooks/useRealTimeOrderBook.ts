import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { getHyperLiquidOrderBookDepth, getHyperLiquidRecentTrades, toHyperliquidMarketSymbol } from '@/lib/oracle/hyperliquid';
import { toFiniteNumber } from "@/utility/handy";
import { normalizeCoin } from '@/utility/perpUtils';

type RawBookLevelObject = {
  px?: string | number;
  price?: string | number;
  sz?: string | number;
  size?: string | number;
};

type RawBookLevel = RawBookLevelObject | [string | number, string | number];

type RawL2BookPayload = {
  levels?: RawBookLevel[][];
  time?: number | string;
};

type RawTradePayload = {
  px?: string | number;
  price?: string | number;
  sz?: string | number;
  size?: string | number;
  time?: number | string;
  tid?: number | string;
  side?: string;
};

export interface OrderBookLevel {
  price: number;
  quantity: number;
  sizeUSDT: number;
  totalUSDT: number;
}

export interface OrderBookSnapshot {
  bids: OrderBookLevel[];
  asks: OrderBookLevel[];
  bestBidPrice: number;
  bestAskPrice: number;
  spread: number;
  spreadPercent: number;
  lastUpdateTime: number;
}

export interface TradeItem {
  id: number;
  price: number;
  quantity: number;
  sizeUSDT: number;
  time: number;
  isBuyerMaker: boolean;
}

interface UseRealTimeOrderBookOptions {
  symbol: string;
  depth?: number;
  tradesLimit?: number;
  onOrderBookUpdate?: (snapshot: OrderBookSnapshot) => void;
  onTradesUpdate?: (trades: TradeItem[]) => void;
}

interface UseRealTimeOrderBookReturn {
  loading: boolean;
  error: string | null;
  connected: boolean;
  marketSymbol: string;
  snapshot: OrderBookSnapshot;
  trades: TradeItem[];
}

const API_INFO_URL = 'https://api.hyperliquid.xyz/info';
const POLL_MS = 1000;
const DEFAULT_TRADES_LIMIT = 50;

const EMPTY_SNAPSHOT: OrderBookSnapshot = {
  bids: [],
  asks: [],
  bestBidPrice: 0,
  bestAskPrice: 0,
  spread: 0,
  spreadPercent: 0,
  lastUpdateTime: 0,
};

const normalizeDepth = (depth: number): 5 | 10 | 20 => {
  if (depth >= 20) return 20;
  if (depth >= 10) return 10;
  return 5;
};

const parseLevel = (level: RawBookLevel): { price: number; quantity: number } => {
  if (Array.isArray(level)) {
    return {
      price: toFiniteNumber(level[0]),
      quantity: toFiniteNumber(level[1]),
    };
  }

  return {
    price: toFiniteNumber(level?.px ?? level?.price),
    quantity: toFiniteNumber(level?.sz ?? level?.size),
  };
};

const buildLevels = (
  rawLevels: RawBookLevel[] | undefined,
  side: 'bid' | 'ask',
  depth: number
): OrderBookLevel[] => {
  if (!Array.isArray(rawLevels)) return [];

  const parsedLevels = rawLevels
    .slice(0, depth)
    .map((level) => {
      const { price, quantity } = parseLevel(level);
      const sizeUSDT = price * quantity;
      return { price, quantity, sizeUSDT };
    })
    .filter((level) => level.price > 0 && level.quantity > 0 && level.sizeUSDT > 0);

  parsedLevels.sort((first, second) =>
    side === 'bid' ? second.price - first.price : first.price - second.price
  );

  let runningTotal = 0;
  return parsedLevels.map((level) => {
    runningTotal += level.sizeUSDT;
    return {
      price: level.price,
      quantity: level.quantity,
      sizeUSDT: level.sizeUSDT,
      totalUSDT: runningTotal,
    };
  });
};

const buildSnapshot = (payload: RawL2BookPayload, depth: number): OrderBookSnapshot => {
  const bidLevels = Array.isArray(payload.levels) ? payload.levels[0] : [];
  const askLevels = Array.isArray(payload.levels) ? payload.levels[1] : [];

  const bids = buildLevels(bidLevels, 'bid', depth);
  const asks = buildLevels(askLevels, 'ask', depth);

  const bestBidPrice = bids[0]?.price ?? 0;
  const bestAskPrice = asks[0]?.price ?? 0;
  const spread = bestBidPrice > 0 && bestAskPrice > 0 ? bestAskPrice - bestBidPrice : 0;
  const spreadPercent = bestBidPrice > 0 ? (spread / bestBidPrice) * 100 : 0;

  return {
    bids,
    asks,
    bestBidPrice,
    bestAskPrice,
    spread,
    spreadPercent,
    lastUpdateTime: Math.trunc(toFiniteNumber(payload.time)) || Date.now(),
  };
};

const parseTrade = (tradePayload: RawTradePayload): TradeItem | null => {
  const price = toFiniteNumber(tradePayload.px ?? tradePayload.price);
  const quantity = toFiniteNumber(tradePayload.sz ?? tradePayload.size);
  const sizeUSDT = price * quantity;
  const time = Math.trunc(toFiniteNumber(tradePayload.time)) || Date.now();
  const id = Math.trunc(toFiniteNumber(tradePayload.tid)) || time;
  const side = String(tradePayload.side ?? '').toUpperCase();

  if (price <= 0 || quantity <= 0 || sizeUSDT <= 0) return null;

  return {
    id,
    price,
    quantity,
    sizeUSDT,
    time,
    isBuyerMaker: side === 'SELL' || side === 'A' || side === 'S',
  };
};

const mergeTrades = (incoming: TradeItem[], existing: TradeItem[], limit: number): TradeItem[] => {
  const merged: TradeItem[] = [];
  const seen = new Set<string>();

  for (const trade of [...incoming, ...existing]) {
    const tradeKey = `${trade.id}-${trade.time}`;
    if (seen.has(tradeKey)) continue;
    seen.add(tradeKey);
    merged.push(trade);
  }

  merged.sort((first, second) => {
    if (second.time !== first.time) return second.time - first.time;
    return second.id - first.id;
  });

  return merged.slice(0, limit);
};

const areLevelsEqual = (prev: OrderBookLevel[], next: OrderBookLevel[]): boolean => {
  if (prev === next) return true;
  if (prev.length !== next.length) return false;

  for (let index = 0; index < prev.length; index += 1) {
    if (
      prev[index].price !== next[index].price ||
      prev[index].quantity !== next[index].quantity ||
      prev[index].sizeUSDT !== next[index].sizeUSDT ||
      prev[index].totalUSDT !== next[index].totalUSDT
    ) {
      return false;
    }
  }

  return true;
};

const areSnapshotsEqual = (prev: OrderBookSnapshot, next: OrderBookSnapshot): boolean => {
  return (
    prev.bestBidPrice === next.bestBidPrice &&
    prev.bestAskPrice === next.bestAskPrice &&
    prev.spread === next.spread &&
    prev.spreadPercent === next.spreadPercent &&
    areLevelsEqual(prev.bids, next.bids) &&
    areLevelsEqual(prev.asks, next.asks)
  );
};

const areTradesEqual = (prev: TradeItem[], next: TradeItem[]): boolean => {
  if (prev === next) return true;
  if (prev.length !== next.length) return false;

  for (let index = 0; index < prev.length; index += 1) {
    if (
      prev[index].id !== next[index].id ||
      prev[index].price !== next[index].price ||
      prev[index].quantity !== next[index].quantity ||
      prev[index].sizeUSDT !== next[index].sizeUSDT ||
      prev[index].time !== next[index].time ||
      prev[index].isBuyerMaker !== next[index].isBuyerMaker
    ) {
      return false;
    }
  }

  return true;
};

const toErrorMessage = (error: unknown, fallback: string): string => {
  if (error instanceof Error && error.message) {
    return error.message;
  }
  return fallback;
};

export const useRealTimeOrderBook = ({
  symbol,
  depth = 20,
  tradesLimit = DEFAULT_TRADES_LIMIT,
  onOrderBookUpdate,
  onTradesUpdate,
}: UseRealTimeOrderBookOptions): UseRealTimeOrderBookReturn => {
  const coin = useMemo(() => normalizeCoin(symbol), [symbol]);
  const marketSymbol = useMemo(() => toHyperliquidMarketSymbol(coin), [coin]);
  const normalizedDepth = useMemo(() => normalizeDepth(depth), [depth]);
  const safeTradesLimit = useMemo(
    () => Math.max(10, Math.min(100, Math.trunc(tradesLimit))),
    [tradesLimit]
  );

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [connected, setConnected] = useState(false);
  const [snapshot, setSnapshot] = useState<OrderBookSnapshot>(EMPTY_SNAPSHOT);
  const [trades, setTrades] = useState<TradeItem[]>([]);

  const snapshotRef = useRef<OrderBookSnapshot>(EMPTY_SNAPSHOT);
  const tradesRef = useRef<TradeItem[]>([]);

  const orderBookCallbackRef = useRef(onOrderBookUpdate);
  const tradesCallbackRef = useRef(onTradesUpdate);

  useEffect(() => {
    orderBookCallbackRef.current = onOrderBookUpdate;
  }, [onOrderBookUpdate]);

  useEffect(() => {
    tradesCallbackRef.current = onTradesUpdate;
  }, [onTradesUpdate]);

  const publishSnapshot = useCallback((nextSnapshot: OrderBookSnapshot) => {
    if (areSnapshotsEqual(snapshotRef.current, nextSnapshot)) return;
    snapshotRef.current = nextSnapshot;
    setSnapshot(nextSnapshot);
    if (orderBookCallbackRef.current) {
      orderBookCallbackRef.current(nextSnapshot);
    }
  }, []);

  const publishTrades = useCallback((nextTrades: TradeItem[]) => {
    if (areTradesEqual(tradesRef.current, nextTrades)) return;
    tradesRef.current = nextTrades;
    setTrades(nextTrades);
    if (tradesCallbackRef.current) {
      tradesCallbackRef.current(nextTrades);
    }
  }, []);

  useEffect(() => {
    if (!coin) {
      setLoading(false);
      setConnected(false);
      setError(null);
      setSnapshot(EMPTY_SNAPSHOT);
      setTrades([]);
      return undefined;
    }

    let disposed = false;
    let inFlight = false;

    setLoading(true);
    setConnected(false);
    setError(null);
    snapshotRef.current = EMPTY_SNAPSHOT;
    tradesRef.current = [];
    setSnapshot(EMPTY_SNAPSHOT);
    setTrades([]);

    const loadOrderBook = async () => {
      if (disposed || inFlight) return;
      inFlight = true;

      try {
        // ── FIX: Pass the coin to both functions ──────────────────────────
        const [rawBookPayload, rawTradesPayload] = await Promise.all([
          getHyperLiquidOrderBookDepth(coin),
          getHyperLiquidRecentTrades(coin),
        ]);

        const nextSnapshot = buildSnapshot(rawBookPayload, normalizedDepth);

        if (!disposed) {
          publishSnapshot(nextSnapshot);
        }

        // ── FIX: Removed undefined `tradesResponse.ok` check ──────────────
        const parsedTrades = Array.isArray(rawTradesPayload)
          ? rawTradesPayload
            .map(parseTrade)
            .filter((trade): trade is TradeItem => trade !== null)
          : [];

        if (!disposed) {
          const nextTrades = mergeTrades(parsedTrades, tradesRef.current, safeTradesLimit);
          publishTrades(nextTrades);
        }

        if (!disposed) {
          setConnected(true);
          setError(null);
        }
      } catch (loadError) {
        if (!disposed) {
          setConnected(false);
          setError(toErrorMessage(loadError, 'Failed to fetch HyperLiquid order book'));
        }
      } finally {
        inFlight = false;
        if (!disposed) {
          setLoading(false);
        }
      }
    };

    loadOrderBook();
    const intervalId = setInterval(loadOrderBook, POLL_MS);

    return () => {
      disposed = true;
      clearInterval(intervalId);
    };
  }, [coin, normalizedDepth, safeTradesLimit, publishSnapshot, publishTrades]);

  return {
    loading,
    error,
    connected,
    marketSymbol,
    snapshot,
    trades,
  };
};