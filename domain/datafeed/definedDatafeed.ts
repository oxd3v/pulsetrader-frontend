import { SUPPORTED_RESOLUTIONS, getResolutionMs } from "@/constants/common/chart";
import {
  fetchCodexCandleBar,
} from "@/lib/oracle/codex";
import { getTokenPrices } from "@/lib/oracle/spotTokenPrice";

const lastBarsCache = new Map();
const intervals = new Map();

// DatafeedConfiguration implementation
const configurationData = {
  // Represents the resolutions for bars supported by your datafeed
  supported_resolutions: SUPPORTED_RESOLUTIONS,

  // The `exchanges` arguments are used for the `searchSymbols` method if a user selects the exchange
  supports_time: true,
  supports_marks: false,
  supports_timescale_marks: false,
};

// Obtains all symbols for all exchanges supported by CryptoCompare API

interface SymbolInfo {
  name: string;
  full_name: string;
  description: string;
  type: string;
  session: string;
  timezone: string;
  ticker: string;
  minmov: number;
  pricescale: number;
  has_intraday: boolean;
  intraday_multipliers: string[];
  supported_resolutions: string[];
  volume_precision: number;
  data_status: string;
}

interface Bar {
  time: number;
  close: string | number;
  low: number;
  high: number;
  volume: number;
}

interface PeriodParams {
  from: number;
  to: number;
  firstDataRequest: boolean;
}

export default class DataFeed {
  private chainId: number;
  private tokenAddress: string;
  private pairAddress: string;
  private quoteToken: string;
  private createdAt: number;

  constructor(
    chainId: number,
    address: string,
    pairAddress: string,
    quoteToken: string,
    createdAt: number
  ) {
    this.chainId = chainId;
    this.tokenAddress = address;
    this.pairAddress = pairAddress;
    this.quoteToken = quoteToken;
    this.createdAt = createdAt;
  }

  onReady(callback: (config: typeof configurationData) => void): void {
    //console.log('[onReady]: Method call');
    setTimeout(() => callback(configurationData), 0);
  }

  searchSymbols(
    userInput: string,
    exchange: string,
    symbolType: string,
    onResultReadyCallback: (result: any[]) => void
  ): void {
    // console.log('[searchSymbols]: Method call', userInput, exchange, symbolType);
    // const newSymbols = tokens.find(token=> token.symbol.toLowerCase() == userInput.toLowerCase());
    // if(!newSymbols) {
    //   console.log('[searchSymbols]: No tokens found');
    // }
    onResultReadyCallback([]);
  }

  resolveSymbol(
    symbolName: string,
    onSymbolResolvedCallback: (symbolInfo: SymbolInfo) => void,
    onResolveErrorCallback: (error: Error) => void,
    extension?: any
  ): void {
    //console.log('[resolveSymbol]: Method call', symbolName);

    // Symbol information object
    const symbolInfo: SymbolInfo = {
      name: symbolName,
      full_name: symbolName,
      description: `${symbolName}/USD`,
      type: "crypto",
      session: "24x7",
      minmov: 1,
      pricescale: 10000000,
      timezone: "Etc/UTC",
      ticker: symbolName,
      has_intraday: true,
      intraday_multipliers: ["1", "5", "15", "60", "240"],
      supported_resolutions: configurationData.supported_resolutions,
      volume_precision: 5,
      data_status: "streaming",
    };

    //console.log('[resolveSymbol]: Symbol resolved', symbolName);
    setTimeout(() => {
      onSymbolResolvedCallback(symbolInfo);
    }, 0);
  }

  async getBars(
    symbolInfo: SymbolInfo,
    resolution: string,
    periodParams: PeriodParams,
    onHistoryCallback: (bars: Bar[], meta: { noData: boolean }) => void,
    onErrorCallback: (error: Error) => void
  ): Promise<void> {
    const { from, to, firstDataRequest } = periodParams;

    try {

      const bars: any = await fetchCodexCandleBar({
        pairAddress: this.pairAddress,
        quoteToken: this.quoteToken,
        chainId: this.chainId,
        resolution,
        from,
        to,
        createdAt: this.createdAt,
        limit: 330, // Fetch enough bars to fill the request
      });


      // Validating bars are within the requested range
      let filteredBars = bars.filter((bar: Bar) => !isNaN(bar.time)).filter((bar: Bar) => {
        // Ensure bar is within the requested window (allowing a small buffer)
        return bar.time >= from * 1000 && bar.time <= to * 1000;;
      });


      // Sort bars by time ascending (TradingView expects this)
      filteredBars.sort((a: Bar, b: Bar) => a.time - b.time);

      if (firstDataRequest && filteredBars.length > 0) {
        lastBarsCache.set(symbolInfo.name, {
          ...filteredBars[filteredBars.length - 1],
        });
      }

      //console.log(`[getBars]: returned ${filteredBars.length} bar(s)`);
      onHistoryCallback(filteredBars, {
        noData: filteredBars.length === 0,
      });
    } catch (error) {
      //console.log("[getBars]: Get error", error);
      onErrorCallback(error as Error);
    }
  }

  subscribeBars(
    symbolInfo: SymbolInfo,
    resolution: string,
    onRealtimeCallback: (bar: Bar) => void,
    subscriberUID: string,
    onResetCacheNeededCallback: () => void
  ): void {
    //console.log('[subscribeBars]: Method call with subscriberUID:', subscriberUID);
    try {
      const candleIntervalMs = getResolutionMs(resolution);
      const now = Date.now();
      let nextFetchAt = now + candleIntervalMs;
      const intervalId = setInterval(async () => {
        const lastReturnedValue = lastBarsCache.get(symbolInfo.name) as Bar;
        let candles;
        let price;
        try {
          if (Date.now() > nextFetchAt) {
            candles = await fetchCodexCandleBar({
              pairAddress: this.pairAddress,
              chainId: this.chainId,
              quoteToken: this.quoteToken,
              resolution,
              from: undefined,
              to: undefined,
              createdAt: this.createdAt,
              limit: 1,
            });
            nextFetchAt = Date.now() + candleIntervalMs;
          }
        } catch (err) {
        }
        try {
          price = await getTokenPrices({
            tokenAddress: this.tokenAddress,
            chainId: this.chainId,
          });
        } catch (err) {
          return;
        }

        if (candles && candles.length > 0) {
          for (const candle of candles) {
            if (lastReturnedValue?.time && candle.time > lastReturnedValue.time) {
              lastBarsCache.set(symbolInfo.name, candle);
              onRealtimeCallback(candle);
            }
          }
        }
        const newBar: Bar = {
          ...lastReturnedValue,
          close: price,
          low: Math.min(lastReturnedValue.low, Number(price)),
          high: Math.max(lastReturnedValue.high, Number(price)),
        };
        onRealtimeCallback(newBar);
      }, 5000);

      intervals.set(subscriberUID, intervalId);
    } catch (error) {
      //console.log("[subscribeBars]: Error", error);
    }
  }

  unsubscribeBars(subscriberUID: string): void {
    //console.log('[unsubscribeBars]: Method call with subscriberUID:', subscriberUID);
    const intervalId = intervals.get(subscriberUID);
    if (intervalId) {
      clearInterval(intervalId);
      intervals.delete(subscriberUID);
    }
  }
}
