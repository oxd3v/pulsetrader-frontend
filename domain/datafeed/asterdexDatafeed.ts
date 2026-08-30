
import { ASTER_WS } from "@/lib/oracle/asterdex";
import { SUPPORTED_RESOLUTIONS } from "@/constants/common/chart";
import { getAsterKLines } from "@/lib/oracle/asterdex";

// ============================================================================
// WebSocket Connection Management (Singleton per symbol+resolution)
// ============================================================================
interface WSConnection {
  ws: WebSocket;
  subscribers: Map<string, (bar: Bar) => void>; // subscriberUID -> callback
  pingInterval?: NodeJS.Timeout;
  lastUpdateId?: number;
}

const wsConnections = new Map<string, WSConnection>();
const lastBarsCache = new Map<string, Bar>();

// Resolution mapping: TradingView → AsterDEX interval
const RESOLUTION_MAP: Record<string, string> = {
  "1": "1m", "3": "3m", "5": "5m", "15": "15m", "30": "30m",
  "60": "1h", "120": "2h", "240": "4h", "360": "6h", "480": "8h",
  "720": "12h", "1D": "1d", "3D": "3d", "1W": "1w", "1M": "1M",
};

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Parse AsterDEX kline payload to TradingView Bar format
 * API Reference: https://asterdex.github.io/aster-api-website/futures-v3/websocket-market-streams/#klinecandlestick-streams
 */
function parseAsterKline(kline: any): Bar {
  return {
    time: kline.t, // Already in milliseconds ✅
    open: parseFloat(kline.o),
    high: parseFloat(kline.h),
    low: parseFloat(kline.l),
    close: parseFloat(kline.c),
    volume: parseFloat(kline.v),
  };
}

/**
 * Get or create WebSocket connection for symbol+resolution
 * Reuses connections to avoid exceeding AsterDEX limits (max 200 streams/connection)
 */
function getOrCreateWSConnection(
  symbol: string,
  resolution: string,
  subscriberUID: string,
  onRealtimeCallback: (bar: Bar) => void
): string {
  const asterInterval = RESOLUTION_MAP[resolution] || "1m";
  const wsSymbol = symbol.toLowerCase(); // AsterDEX requires lowercase
  const streamName = `${wsSymbol}@kline_${asterInterval}`;

  // Reuse existing connection
  const existing = wsConnections.get(streamName);
  if (existing?.ws.readyState === WebSocket.OPEN) {
    existing.subscribers.set(subscriberUID, onRealtimeCallback);
    return streamName;
  }

  // Create new connection
  const ws = new WebSocket(`${ASTER_WS}/${streamName}`);
  const connection: WSConnection = {
    ws,
    subscribers: new Map([[subscriberUID, onRealtimeCallback]]),
  };
  wsConnections.set(streamName, connection);

  ws.onopen = () => {
    //console.log(`[WS] Connected: ${streamName}`);

    // Setup ping/pong keepalive (AsterDEX sends ping every 3 min)
    connection.pingInterval = setInterval(() => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ method: "PING", id: Date.now() }));
      }
    }, 150000); // Ping every 2.5 min (before server timeout)
  };

  ws.onmessage = (event) => {
    try {
      const message = JSON.parse(event.data);

      // Handle kline event
      if (message.e === "kline" && message.k) {
        const bar = parseAsterKline(message.k);
        const isClosed = message.k.x; // true = candle closed

        // Notify all subscribers
        connection.subscribers.forEach((callback) => {
          callback(bar);
        });

        // Update last bar cache for continuity
        if (isClosed) {
          lastBarsCache.set(`${symbol}_${resolution}`, bar);
        }
      }

      // Handle pong response
      if (message.method === "PONG") {
        // Connection healthy
      }
    } catch (err) {
      //console.error(`[WS] Parse error for ${streamName}:`, err);
    }
  };

  ws.onerror = (error) => {
    //console.error(`[WS] Error for ${streamName}:`, error);
  };

  ws.onclose = () => {
    // console.log(`[WS] Closed: ${streamName}`);

    if (connection.pingInterval) {
      clearInterval(connection.pingInterval);
    }
    wsConnections.delete(streamName);

    // Auto-reconnect after 3 seconds for active subscribers
    if (connection.subscribers.size > 0) {
      setTimeout(() => {
        // Re-subscribe all callbacks
        connection.subscribers.forEach((callback, uid) => {
          getOrCreateWSConnection(symbol, resolution, uid, callback);
        });
      }, 3000);
    }
  };

  return streamName;
}

/**
 * Unsubscribe and cleanup WebSocket connection
 */
function unsubscribeWSConnection(
  symbol: string,
  resolution: string,
  subscriberUID: string
): void {
  const asterInterval = RESOLUTION_MAP[resolution] || "1m";
  const wsSymbol = symbol.toLowerCase();
  const streamName = `${wsSymbol}@kline_${asterInterval}`;

  const connection = wsConnections.get(streamName);
  if (!connection) return;

  // Remove subscriber
  connection.subscribers.delete(subscriberUID);

  // Close connection if no more subscribers
  if (connection.subscribers.size === 0) {
    if (connection.pingInterval) {
      clearInterval(connection.pingInterval);
    }
    if (connection.ws.readyState === WebSocket.OPEN) {
      connection.ws.close();
    }
    wsConnections.delete(streamName);
    //console.log(`[WS] Cleaned up: ${streamName}`);
  }
}

// ============================================================================
// Type Definitions
// ============================================================================
interface Bar {
  time: number; // Unix timestamp in milliseconds
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

// ============================================================================
// AsterDexDataFeed Class
// ============================================================================
class AsterDexDataFeed {
  private symbol: string;

  constructor(symbol: string) {
    this.symbol = symbol;
  }

  /**
   * onReady: Called by the charting library to get configuration
   */
  onReady(callback: any) {
    const config = {
      supported_resolutions: SUPPORTED_RESOLUTIONS,
      supports_search: false,
      supports_group_request: false,
      supports_marks: false,
      supports_timescale_marks: false,
      exchange: "Aster DEX",
      timezone: "UTC",
      pricescale: 100,
    };
    setTimeout(() => callback(config), 0);
  }

  /**
   * searchSymbols: Search for symbols (not implemented for now)
   */
  searchSymbols(
    userInput: string,
    exchange: string,
    symbolType: string,
    onResultReadyCallback: any,
  ) {
    onResultReadyCallback([]);
  }

  /**
   * resolveSymbol: Resolve symbol information
   */
  resolveSymbol(
    symbolName: string,
    onSymbolResolvedCallback: any,
    onResolveErrorCallback: any,
    extension?: any,
  ) {
    try {
      const symbolInfo = {
        name: symbolName,
        full_name: `${symbolName}`,
        ticker: symbolName,
        description: `${symbolName}`,
        type: "crypto",
        session: "24x7",
        timezone: "UTC",
        minmov: 1,
        pricescale: 100000000, // 8 decimal places
        has_intraday: true,
        has_daily: true,
        has_weekly_and_monthly: true,
        data_status: "streaming",
        default_bar_type: "candle",
        visible_plots_set: "ohlcv",
        has_seconds: false,
        intraday_multipliers: ["1", "5", "15", "60", "240"],
        supported_resolutions: SUPPORTED_RESOLUTIONS,
        volume_precision: 5,
      };
      setTimeout(() => onSymbolResolvedCallback(symbolInfo), 0);
    } catch (error) {
      onResolveErrorCallback("Unable to resolve symbol");
    }
  }

  /**
   * getBars: Fetch candlestick data from Aster DEX API
   */
  async getBars(
    symbolInfo: any,
    resolution: string,
    periodParams: any,
    onHistoryCallback: (bars: Bar[], meta: { noData: boolean }) => void,
    onErrorCallback: (error: Error) => void,
  ): Promise<void> {
    const { from, to, firstDataRequest } = periodParams;

    try {
      const bars: any = await getAsterKLines({
        symbol: symbolInfo.name,
        resolution,
        from,
        to,
        limit: 500,
      });

      // Validate bars are within requested range (convert seconds → ms)
      let filteredBars = bars
        .filter((bar: Bar) => !isNaN(bar.time))
        .filter((bar: Bar) => bar.time >= from * 1000 && bar.time <= to * 1000);

      // Sort ascending (TradingView requirement)
      filteredBars.sort((a: Bar, b: Bar) => a.time - b.time);

      // Cache last bar for real-time continuity
      if (firstDataRequest && filteredBars.length > 0) {
        lastBarsCache.set(`${symbolInfo.name}_${resolution}`, {
          ...filteredBars[filteredBars.length - 1],
        });
      }

      onHistoryCallback(filteredBars, {
        noData: filteredBars.length === 0,
      });
    } catch (error) {
      onErrorCallback(error as Error);
    }
  }

  /**
   * subscribeBars: Subscribe to real-time kline data via WebSocket
   * API Reference: https://asterdex.github.io/aster-api-website/futures-v3/websocket-market-streams/#klinecandlestick-streams
   */
  subscribeBars(
    symbolInfo: any,
    resolution: string,
    onRealtimeCallback: (bar: Bar) => void,
    subscriberUID: string,
    onResetCacheCallback?: any,
  ): void {
    const cacheKey = `${symbolInfo.name}_${resolution}`;

    // Create wrapper callback that handles candle update logic
    const wrappedCallback = (bar: Bar) => {
      const lastBar = lastBarsCache.get(cacheKey);

      if (!lastBar) {
        // First bar received
        lastBarsCache.set(cacheKey, bar);
        onRealtimeCallback(bar);
        return;
      }

      if (bar.time === lastBar.time) {
        // Update current (unclosed) candle in-place
        const updatedBar: Bar = {
          ...lastBar,
          close: bar.close,
          high: Math.max(lastBar.high, bar.high),
          low: Math.min(lastBar.low, bar.low),
          volume: bar.volume,
        };
        lastBarsCache.set(cacheKey, updatedBar);
        onRealtimeCallback(updatedBar);
      }
      else if (bar.time > lastBar.time) {
        // New candle started
        lastBarsCache.set(cacheKey, bar);
        onRealtimeCallback(bar);
      }
      // Ignore older bars (bar.time < lastBar.time)
    };

    // Connect to WebSocket stream
    getOrCreateWSConnection(
      symbolInfo.name,
      resolution,
      subscriberUID,
      wrappedCallback
    );
  }

  /**
   * unsubscribeBars: Unsubscribe from real-time data and cleanup
   */
  unsubscribeBars(subscriberUID: string): void {
    // Find and remove subscription across all active connections
    for (const [streamName, connection] of wsConnections.entries()) {
      if (connection.subscribers.has(subscriberUID)) {
        // Extract symbol and resolution from streamName
        // Format: {symbol}@kline_{interval}
        const [symbol, rest] = streamName.split("@");
        const interval = rest.replace("kline_", "");
        const resolution = Object.keys(RESOLUTION_MAP).find(
          key => RESOLUTION_MAP[key] === interval
        );

        if (resolution) {
          unsubscribeWSConnection(symbol, resolution, subscriberUID);
        }
        break;
      }
    }
  }

  /**
   * getMarks: Get marks for the chart (optional)
   */
  getMarks(
    symbolInfo: any,
    from: number,
    to: number,
    onDataCallback: any,
    resolution: string,
  ) {
    onDataCallback([]);
  }

  /**
   * getTimescaleMarks: Get timescale marks (optional)
   */
  getTimescaleMarks(
    symbolInfo: any,
    from: number,
    to: number,
    onDataCallback: any,
    resolution: string,
  ) {
    onDataCallback([]);
  }
}

export default AsterDexDataFeed;