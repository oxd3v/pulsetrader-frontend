import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ASTER_WS,
  getAsterOrderBook,
  getAsterTrade,
} from "@/lib/oracle/asterdex";
import { toFiniteNumber } from "@/utility/handy";
import { normalizeAsterSymbol } from "@/utility/perpUtils"

type RawLevel = [string, string];
type RawDepthPayload = {
  a?: RawLevel[];
  asks?: RawLevel[];
  b?: RawLevel[];
  bids?: RawLevel[];
  E?: number;
  T?: number;
  e?: string;
};

type RawWsTradePayload = {
  a?: number | string;
  p?: number | string;
  q?: number | string;
  T?: number | string;
  m?: boolean;
  e?: string;
};

type RawRestTradePayload = {
  id?: number | string;
  price?: number | string;
  qty?: number | string;
  quoteQty?: number | string;
  time?: number | string;
  isBuyerMaker?: boolean;
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

const RECONNECT_DELAY_MS = 3000;
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

const buildLevels = (
  rawLevels: RawLevel[] | undefined,
  side: "bid" | "ask",
  depth: number
): OrderBookLevel[] => {
  if (!Array.isArray(rawLevels)) return [];

  const parsedLevels = rawLevels
    .slice(0, depth)
    .map(([priceValue, quantityValue]) => {
      const price = toFiniteNumber(priceValue);
      const quantity = toFiniteNumber(quantityValue);
      const sizeUSDT = price * quantity;
      return { price, quantity, sizeUSDT };
    })
    .filter((level) => level.price > 0 && level.quantity > 0 && level.sizeUSDT > 0);

  parsedLevels.sort((first, second) =>
    side === "bid" ? second.price - first.price : first.price - second.price
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

const buildSnapshot = (
  rawBids: RawLevel[] | undefined,
  rawAsks: RawLevel[] | undefined,
  depth: number,
  updateTime: number
): OrderBookSnapshot => {
  const bids = buildLevels(rawBids, "bid", depth);
  const asks = buildLevels(rawAsks, "ask", depth);

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
    lastUpdateTime: updateTime,
  };
};

const parseWsTrade = (tradePayload: RawWsTradePayload): TradeItem | null => {
  const price = toFiniteNumber(tradePayload.p);
  const quantity = toFiniteNumber(tradePayload.q);
  const sizeUSDT = price * quantity;
  const time = Math.trunc(toFiniteNumber(tradePayload.T)) || Date.now();
  const id = Math.trunc(toFiniteNumber(tradePayload.a)) || time;

  if (price <= 0 || quantity <= 0 || sizeUSDT <= 0) return null;

  return {
    id,
    price,
    quantity,
    sizeUSDT,
    time,
    isBuyerMaker: Boolean(tradePayload.m),
  };
};

const parseRestTrade = (tradePayload: RawRestTradePayload): TradeItem | null => {
  const price = toFiniteNumber(tradePayload.price);
  const quantity = toFiniteNumber(tradePayload.qty);
  const quoteSize = toFiniteNumber(tradePayload.quoteQty);
  const sizeUSDT = quoteSize > 0 ? quoteSize : price * quantity;
  const time = Math.trunc(toFiniteNumber(tradePayload.time)) || Date.now();
  const id = Math.trunc(toFiniteNumber(tradePayload.id)) || time;

  if (price <= 0 || quantity <= 0 || sizeUSDT <= 0) return null;

  return {
    id,
    price,
    quantity,
    sizeUSDT,
    time,
    isBuyerMaker: Boolean(tradePayload.isBuyerMaker),
  };
};

const mergeTrades = (incoming: TradeItem[], existing: TradeItem[], limit: number): TradeItem[] => {
  const merged: TradeItem[] = [];
  const seen = new Set<string>();

  for (const trade of [...incoming, ...existing]) {
    const tradeKey = `${trade.id}-${trade.time}`;
    if (seen.has(tradeKey)) continue;
    if (trade.price <= 0 || trade.quantity <= 0 || trade.sizeUSDT <= 0) continue;
    seen.add(tradeKey);
    merged.push(trade);
  }

  merged.sort((first, second) => {
    if (second.time !== first.time) return second.time - first.time;
    return second.id - first.id;
  });

  return merged.slice(0, limit);
};

const toErrorMessage = (error: unknown, fallback: string): string => {
  if (error instanceof Error && error.message) return error.message;
  return fallback;
};

export const useRealTimeOrderBook = ({
  symbol,
  depth = 20,
  tradesLimit = DEFAULT_TRADES_LIMIT,
  onOrderBookUpdate,
  onTradesUpdate,
}: UseRealTimeOrderBookOptions): UseRealTimeOrderBookReturn => {
  const marketSymbol = useMemo(() => normalizeAsterSymbol(symbol), [symbol]);
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

  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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
    if (!marketSymbol) {
      setLoading(false);
      setConnected(false);
      setError(null);
      snapshotRef.current = EMPTY_SNAPSHOT;
      tradesRef.current = [];
      setSnapshot(EMPTY_SNAPSHOT);
      setTrades([]);
      if (orderBookCallbackRef.current) {
        orderBookCallbackRef.current(EMPTY_SNAPSHOT);
      }
      if (tradesCallbackRef.current) {
        tradesCallbackRef.current([]);
      }
      return undefined;
    }

    let disposed = false;
    const abortController = new AbortController();

    setLoading(true);
    setError(null);
    setConnected(false);
    snapshotRef.current = EMPTY_SNAPSHOT;
    tradesRef.current = [];
    setSnapshot(EMPTY_SNAPSHOT);
    setTrades([]);
    if (orderBookCallbackRef.current) {
      orderBookCallbackRef.current(EMPTY_SNAPSHOT);
    }
    if (tradesCallbackRef.current) {
      tradesCallbackRef.current([]);
    }

    const clearReconnectTimer = () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }
    };

    const closeSocket = () => {
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
    };

    const fetchInitialData = async () => {
      try {
        const [depthResult, tradesResult] = await Promise.all([
          getAsterOrderBook(marketSymbol, normalizedDepth),
          getAsterTrade(marketSymbol, safeTradesLimit),
        ]);

        if (!depthResult.success) {
          throw new Error(depthResult.error || "Depth request failed");
        }

        const depthPayload = depthResult.depth as RawDepthPayload;
        const initialSnapshot = buildSnapshot(
          depthPayload.bids ?? depthPayload.b,
          depthPayload.asks ?? depthPayload.a,
          normalizedDepth,
          toFiniteNumber(depthPayload.E) || toFiniteNumber(depthPayload.T) || Date.now()
        );

        if (!disposed) {
          publishSnapshot(initialSnapshot);
        }

        if (tradesResult.success) {
          const tradesPayload = tradesResult.trades as RawRestTradePayload[];
          const initialTrades = Array.isArray(tradesPayload)
            ? tradesPayload
              .map(parseRestTrade)
              .filter((trade): trade is TradeItem => trade !== null)
            : [];

          if (!disposed) {
            publishTrades(mergeTrades(initialTrades, [], safeTradesLimit));
          }
        }
      } catch (fetchError) {
        if (!disposed && !abortController.signal.aborted) {
          setError(toErrorMessage(fetchError, "Failed to fetch initial market data"));
        }
      } finally {
        if (!disposed) {
          setLoading(false);
        }
      }
    };

    const connectWebSocket = () => {
      if (disposed) return;

      const wsSymbol = marketSymbol.toLowerCase();
      const streamName = `${wsSymbol}@depth${normalizedDepth}@500ms/${wsSymbol}@aggTrade`;
      const ws = new WebSocket(`${ASTER_WS}/stream?streams=${streamName}`);
      wsRef.current = ws;

      ws.onopen = () => {
        if (disposed) return;
        setConnected(true);
        setError(null);
      };

      ws.onmessage = (event) => {
        if (disposed) return;

        try {
          const rawMessage = JSON.parse(event.data) as { stream?: string; data?: unknown };
          const streamNameFromPayload = (rawMessage.stream ?? "").toLowerCase();
          const data = (rawMessage.data ?? rawMessage) as RawDepthPayload &
            RawWsTradePayload;

          if (streamNameFromPayload.includes("@depth") || data.e === "depthUpdate") {
            const nextSnapshot = buildSnapshot(
              data.bids ?? data.b,
              data.asks ?? data.a,
              normalizedDepth,
              toFiniteNumber(data.E) || toFiniteNumber(data.T) || Date.now()
            );
            publishSnapshot(nextSnapshot);
            setLoading(false);
            return;
          }

          if (streamNameFromPayload.includes("@aggtrade") || data.e === "aggTrade") {
            const parsedTrade = parseWsTrade(data);
            if (!parsedTrade) return;

            const nextTrades = mergeTrades([parsedTrade], tradesRef.current, safeTradesLimit);
            publishTrades(nextTrades);
          }
        } catch (parseError) {
          setError(toErrorMessage(parseError, "Failed to parse market stream payload"));
        }
      };

      ws.onerror = () => {
        if (disposed) return;
        setError("WebSocket error occurred");
      };

      ws.onclose = () => {
        if (disposed) return;
        setConnected(false);
        clearReconnectTimer();
        reconnectTimeoutRef.current = setTimeout(connectWebSocket, RECONNECT_DELAY_MS);
      };
    };

    fetchInitialData();
    connectWebSocket();

    return () => {
      disposed = true;
      abortController.abort();
      clearReconnectTimer();
      closeSocket();
    };
  }, [marketSymbol, normalizedDepth, safeTradesLimit, publishSnapshot, publishTrades]);

  return {
    loading,
    error,
    connected,
    marketSymbol,
    snapshot,
    trades,
  };
};