import { SUPPORTED_RESOLUTIONS } from "@/constants/common/chart";
import { getHyperLiquidCandles } from "@/lib/oracle/hyperliquid";

const HYPERLIQUID_WS_URL = "wss://api.hyperliquid.xyz/ws";
const DEFAULT_HISTORY_LIMIT = 500;
const WS_PING_INTERVAL_MS = 50_000;
const WS_RECONNECT_DELAY_MS = 1_500;

type Resolution = string;

interface Bar {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

interface SymbolInfo {
  name: string;
}

interface PeriodParams {
  from: number;
  to: number;
  firstDataRequest: boolean;
}

type RealtimeBarCallback = (bar: Bar) => void;

type CandleSubscriptionRequest = {
  type: "candle";
  coin: string;
  interval: string;
};

type CandleEvent = {
  t?: string | number;
  T?: string | number;
  s?: string;
  coin?: string;
  i?: string;
  interval?: string;
  o?: string | number;
  h?: string | number;
  l?: string | number;
  c?: string | number;
  v?: string | number;
};

type WsMessage = {
  channel?: string;
  data?: CandleEvent;
};

type StreamSubscription = {
  request: CandleSubscriptionRequest;
  callbacks: Map<string, RealtimeBarCallback>;
};

const RESOLUTION_TO_INTERVAL: Record<string, string> = {
  "1": "1m",
  "3": "3m",
  "5": "5m",
  "15": "15m",
  "30": "30m",
  "60": "1h",
  "120": "2h",
  "240": "4h",
  "360": "6h",
  "480": "8h",
  "720": "12h",
  "1D": "1d",
  D: "1d",
  "1d": "1d",
  "3D": "3d",
  "1W": "1w",
  W: "1w",
  "1M": "1M",
  M: "1M",
};

const lastBarsCache = new Map<string, Bar>();

const toFiniteNumber = (value: unknown): number => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const normalizeCoin = (symbol: string): string => {
  const normalized = (symbol ?? "").trim().toUpperCase();
  if (!normalized) return "";
  return normalized.replace(/(USDT|USDC|BUSD)$/i, "") || normalized;
};

const toHyperliquidInterval = (resolution: Resolution): string => {
  return RESOLUTION_TO_INTERVAL[resolution] ?? "1m";
};

const buildCandleKey = (coin: string, interval: string): string => {
  return `candle:${coin.toLowerCase()},${interval.toLowerCase()}`;
};

const buildCacheKey = (symbol: string, resolution: Resolution): string => {
  return `${normalizeCoin(symbol)}_${toHyperliquidInterval(resolution)}`;
};

const parseRealtimeCandle = (event: CandleEvent): Bar | null => {
  const time = Math.trunc(toFiniteNumber(event.t));
  if (!Number.isFinite(time) || time <= 0) {
    return null;
  }

  return {
    time,
    open: toFiniteNumber(event.o),
    high: toFiniteNumber(event.h),
    low: toFiniteNumber(event.l),
    close: toFiniteNumber(event.c),
    volume: toFiniteNumber(event.v),
  };
};

class HyperliquidWsManager {
  private socket: WebSocket | null = null;
  private subscriptions = new Map<string, StreamSubscription>();
  private subscriberToKey = new Map<string, string>();
  private pingTimer: ReturnType<typeof setInterval> | null = null;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private shouldReconnect = false;

  subscribe(
    subscriberUID: string,
    coin: string,
    interval: string,
    callback: RealtimeBarCallback
  ): void {
    const normalizedCoin = normalizeCoin(coin);
    if (!normalizedCoin) return;

    const normalizedInterval = interval || "1m";
    const key = buildCandleKey(normalizedCoin, normalizedInterval);

    const existingKey = this.subscriberToKey.get(subscriberUID);
    if (existingKey && existingKey !== key) {
      this.unsubscribe(subscriberUID);
    }

    let subscription = this.subscriptions.get(key);
    const isNewStream = !subscription;
    if (!subscription) {
      subscription = {
        request: {
          type: "candle",
          coin: normalizedCoin,
          interval: normalizedInterval,
        },
        callbacks: new Map(),
      };
      this.subscriptions.set(key, subscription);
    }

    subscription.callbacks.set(subscriberUID, callback);
    this.subscriberToKey.set(subscriberUID, key);

    this.shouldReconnect = this.subscriptions.size > 0;
    this.ensureConnection();

    if (isNewStream && this.socket?.readyState === WebSocket.OPEN) {
      this.send({
        method: "subscribe",
        subscription: subscription.request,
      });
    }
  }

  unsubscribe(subscriberUID: string): void {
    const key = this.subscriberToKey.get(subscriberUID);
    if (!key) return;

    this.subscriberToKey.delete(subscriberUID);

    const subscription = this.subscriptions.get(key);
    if (!subscription) return;

    subscription.callbacks.delete(subscriberUID);

    if (subscription.callbacks.size === 0) {
      this.subscriptions.delete(key);
      if (this.socket?.readyState === WebSocket.OPEN) {
        this.send({
          method: "unsubscribe",
          subscription: subscription.request,
        });
      }
    }

    this.shouldReconnect = this.subscriptions.size > 0;
    if (!this.shouldReconnect) {
      this.disconnect();
    }
  }

  private ensureConnection(): void {
    if (!this.shouldReconnect) return;

    if (
      this.socket &&
      (this.socket.readyState === WebSocket.OPEN ||
        this.socket.readyState === WebSocket.CONNECTING)
    ) {
      return;
    }

    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    this.socket = new WebSocket(HYPERLIQUID_WS_URL);

    this.socket.onopen = () => {
      this.startPing();
      this.subscriptions.forEach((subscription) => {
        this.send({
          method: "subscribe",
          subscription: subscription.request,
        });
      });
    };

    this.socket.onmessage = (event) => {
      if (typeof event.data !== "string") return;

      let parsedMessage: WsMessage;
      try {
        parsedMessage = JSON.parse(event.data) as WsMessage;
      } catch {
        return;
      }

      if (parsedMessage.channel !== "candle" || !parsedMessage.data) return;

      const candleEvent = parsedMessage.data;
      const coin = String(candleEvent.s ?? candleEvent.coin ?? "").toUpperCase();
      const interval = String(candleEvent.i ?? candleEvent.interval ?? "").toLowerCase();
      if (!coin || !interval) return;

      const key = buildCandleKey(coin, interval);
      const subscription = this.subscriptions.get(key);
      if (!subscription) return;

      const bar = parseRealtimeCandle(candleEvent);
      if (!bar) return;

      subscription.callbacks.forEach((callback) => {
        callback(bar);
      });
    };

    this.socket.onclose = () => {
      this.stopPing();
      this.socket = null;
      if (this.shouldReconnect && this.subscriptions.size > 0) {
        this.scheduleReconnect();
      }
    };

    this.socket.onerror = () => {
      // WebSocket will trigger onclose and reconnect automatically.
    };
  }

  private scheduleReconnect(): void {
    if (this.reconnectTimer) return;
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.ensureConnection();
    }, WS_RECONNECT_DELAY_MS);
  }

  private startPing(): void {
    this.stopPing();
    this.pingTimer = setInterval(() => {
      this.send({ method: "ping" });
    }, WS_PING_INTERVAL_MS);
  }

  private stopPing(): void {
    if (this.pingTimer) {
      clearInterval(this.pingTimer);
      this.pingTimer = null;
    }
  }

  private disconnect(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    this.stopPing();

    if (!this.socket) return;

    const socketRef = this.socket;
    this.socket = null;
    socketRef.onopen = null;
    socketRef.onmessage = null;
    socketRef.onclose = null;
    socketRef.onerror = null;

    if (
      socketRef.readyState === WebSocket.OPEN ||
      socketRef.readyState === WebSocket.CONNECTING
    ) {
      socketRef.close();
    }
  }

  private send(payload: unknown): void {
    if (this.socket?.readyState !== WebSocket.OPEN) return;
    this.socket.send(JSON.stringify(payload));
  }
}

const wsManager = new HyperliquidWsManager();

class HyperliquidDataFeed {
  private symbol: string;

  constructor(symbol: string) {
    this.symbol = symbol;
  }

  onReady(callback: (config: Record<string, unknown>) => void): void {
    const config = {
      supported_resolutions: SUPPORTED_RESOLUTIONS,
      supports_search: false,
      supports_group_request: false,
      supports_marks: false,
      supports_timescale_marks: false,
      supports_time: true,
      exchange: "Hyperliquid",
      timezone: "UTC",
      pricescale: 100000000,
    };
    setTimeout(() => callback(config), 0);
  }

  searchSymbols(
    userInput: string,
    exchange: string,
    symbolType: string,
    onResultReadyCallback: (result: unknown[]) => void
  ): void {
    void userInput;
    void exchange;
    void symbolType;
    onResultReadyCallback([]);
  }

  resolveSymbol(
    symbolName: string,
    onSymbolResolvedCallback: (symbolInfo: Record<string, unknown>) => void,
    onResolveErrorCallback: (error: string) => void,
    extension?: unknown
  ): void {
    void extension;
    try {
      const normalizedSymbol = symbolName || this.symbol;
      const symbolInfo = {
        name: normalizedSymbol,
        full_name: normalizedSymbol,
        ticker: normalizedSymbol,
        description: normalizedSymbol,
        type: "crypto",
        session: "24x7",
        timezone: "UTC",
        minmov: 1,
        pricescale: 100000000,
        has_intraday: true,
        has_daily: true,
        has_weekly_and_monthly: true,
        data_status: "streaming",
        default_bar_type: "candle",
        visible_plots_set: "ohlc",
        has_seconds: false,
        intraday_multipliers: ["1", "5", "15", "60", "240"],
        supported_resolutions: SUPPORTED_RESOLUTIONS,
        volume_precision: 5,
      };

      setTimeout(() => onSymbolResolvedCallback(symbolInfo), 0);
    } catch {
      onResolveErrorCallback("Unable to resolve symbol");
    }
  }

  async getBars(
    symbolInfo: SymbolInfo,
    resolution: Resolution,
    periodParams: PeriodParams,
    onHistoryCallback: (bars: Bar[], meta: { noData: boolean }) => void,
    onErrorCallback: (error: Error) => void
  ): Promise<void> {
    const { from, to, firstDataRequest } = periodParams;

    try {
      const response = await getHyperLiquidCandles({
        symbol: symbolInfo.name || this.symbol,
        resolution,
        from,
        to,
        limit: DEFAULT_HISTORY_LIMIT,
      });

      const fromMs = Math.floor(from * 1000);
      const toMs = Math.floor(to * 1000);

      const bars = Array.isArray(response)
        ? response
          .map((bar: any) => ({
            time: Math.trunc(toFiniteNumber(bar.time)),
            open: toFiniteNumber(bar.open),
            high: toFiniteNumber(bar.high),
            low: toFiniteNumber(bar.low),
            close: toFiniteNumber(bar.close),
            volume: toFiniteNumber(bar.volume),
          }))
          .filter((bar: any) => bar.time > 0 && bar.time >= fromMs && bar.time <= toMs)
        : [];

      bars.sort((first: Bar, second: Bar) => first.time - second.time);

      const cacheKey = buildCacheKey(symbolInfo.name || this.symbol, resolution);
      if (firstDataRequest && bars.length > 0) {
        lastBarsCache.set(cacheKey, bars[bars.length - 1]);
      }

      onHistoryCallback(bars, { noData: bars.length === 0 });
    } catch (error) {
      onErrorCallback(error as Error);
    }
  }

  subscribeBars(
    symbolInfo: SymbolInfo,
    resolution: Resolution,
    onRealtimeCallback: RealtimeBarCallback,
    subscriberUID: string,
    onResetCacheNeededCallback?: () => void
  ): void {
    void onResetCacheNeededCallback;

    const symbolName = symbolInfo.name || this.symbol;
    const coin = normalizeCoin(symbolName);
    const interval = toHyperliquidInterval(resolution);
    const cacheKey = buildCacheKey(symbolName, resolution);

    wsManager.subscribe(subscriberUID, coin, interval, (incomingBar) => {
      const lastBar = lastBarsCache.get(cacheKey);

      if (!lastBar) {
        lastBarsCache.set(cacheKey, incomingBar);
        onRealtimeCallback(incomingBar);
        return;
      }

      if (incomingBar.time > lastBar.time) {
        lastBarsCache.set(cacheKey, incomingBar);
        onRealtimeCallback(incomingBar);
        return;
      }

      if (incomingBar.time === lastBar.time) {
        const mergedBar: Bar = {
          ...lastBar,
          close: incomingBar.close,
          high: Math.max(lastBar.high, incomingBar.high),
          low: Math.min(lastBar.low, incomingBar.low),
          volume: incomingBar.volume,
        };
        lastBarsCache.set(cacheKey, mergedBar);
        onRealtimeCallback(mergedBar);
      }
    });
  }

  unsubscribeBars(subscriberUID: string): void {
    wsManager.unsubscribe(subscriberUID);
  }

  getMarks(
    symbolInfo: SymbolInfo,
    from: number,
    to: number,
    onDataCallback: (data: unknown[]) => void,
    resolution: Resolution
  ): void {
    void symbolInfo;
    void from;
    void to;
    void resolution;
    onDataCallback([]);
  }

  getTimescaleMarks(
    symbolInfo: SymbolInfo,
    from: number,
    to: number,
    onDataCallback: (data: unknown[]) => void,
    resolution: Resolution
  ): void {
    void symbolInfo;
    void from;
    void to;
    void resolution;
    onDataCallback([]);
  }
}

export default HyperliquidDataFeed;
