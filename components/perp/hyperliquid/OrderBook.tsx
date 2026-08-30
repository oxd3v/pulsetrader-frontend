'use client';

import React, { useMemo, useState } from 'react';
import { OrderBookLevel, TradeItem, useRealTimeOrderBook } from '@/hooks/useHyperLiquidHooks/useRealTimeOrderBook';
import { formatPrice, formatCompactNumber, formateTime } from '@/utility/handy';

type ActiveTab = 'orderbook' | 'trades';

interface OrderBookPriceLevelsProps {
  symbol: string;
  maxDepth?: number;
  displayCount?: number;
  tradesDisplayCount?: number;
  useWebSocket?: boolean;
  updateThrottleMs?: number;
}


const getDepthPercent = (level: OrderBookLevel | undefined, maxTotal: number): number => {
  if (!level || level.totalUSDT <= 0 || maxTotal <= 0) return 0;
  return Math.min((level.totalUSDT / maxTotal) * 100, 100);
};

const getTradePriceClass = (trade: TradeItem | undefined): string => {
  if (!trade || trade.sizeUSDT <= 0) return 'text-slate-400 dark:text-slate-500';
  return trade.isBuyerMaker ? 'text-orange-500 dark:text-orange-400' : 'text-emerald-600 dark:text-emerald-400';
};

const OrderBookPriceLevelsComponent: React.FC<OrderBookPriceLevelsProps> = ({
  symbol,
  maxDepth = 20,
  displayCount = 10,
  tradesDisplayCount = 20,
}) => {
  const [activeTab, setActiveTab] = useState<ActiveTab>('orderbook');

  const { loading, error, connected, marketSymbol, snapshot, trades } = useRealTimeOrderBook({
    symbol,
    depth: maxDepth,
    tradesLimit: tradesDisplayCount,
  });

  const rowSlots = useMemo(() => Array.from({ length: displayCount }, (_, index) => index), [displayCount]);
  const tradeSlots = useMemo(
    () => Array.from({ length: tradesDisplayCount }, (_, index) => index),
    [tradesDisplayCount]
  );

  const asksForDisplay = useMemo(
    () => snapshot.asks.slice(0, displayCount).reverse(),
    [snapshot.asks, displayCount]
  );
  const bidsForDisplay = useMemo(
    () => snapshot.bids.slice(0, displayCount),
    [snapshot.bids, displayCount]
  );
  const visibleTrades = useMemo(
    () => trades.slice(0, tradesDisplayCount),
    [trades, tradesDisplayCount]
  );

  const maxAskTotal = useMemo(
    () => asksForDisplay.reduce((maxValue, level) => Math.max(maxValue, level.totalUSDT), 1),
    [asksForDisplay]
  );
  const maxBidTotal = useMemo(
    () => bidsForDisplay.reduce((maxValue, level) => Math.max(maxValue, level.totalUSDT), 1),
    [bidsForDisplay]
  );

  const midPrice = useMemo(() => {
    if (snapshot.bestBidPrice > 0 && snapshot.bestAskPrice > 0) {
      return (snapshot.bestBidPrice + snapshot.bestAskPrice) / 2;
    }
    return snapshot.bestBidPrice || snapshot.bestAskPrice;
  }, [snapshot.bestAskPrice, snapshot.bestBidPrice]);

  const spreadText = useMemo(() => {
    if (snapshot.spread <= 0) return '-';
    return `${formatPrice(snapshot.spread)} (${snapshot.spreadPercent.toFixed(3)}%)`;
  }, [snapshot.spread, snapshot.spreadPercent]);

  return (
    <div className="h-full min-h-0 overflow-hidden rounded-xl  border-slate-200 bg-white/95 shadow-sm dark:border-slate-800 dark:bg-gray-900 flex flex-col">
      <div className="px-3 pt-2 border-b border-slate-200 dark:border-slate-800">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={() => setActiveTab('orderbook')}
              className={`text-sm leading-none pb-1 border-b transition-colors ${activeTab === 'orderbook'
                ? 'text-slate-900 border-slate-900 dark:text-slate-100 dark:border-slate-100'
                : 'text-slate-500 border-transparent hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
                }`}
            >
              Order book
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('trades')}
              className={`text-sm leading-none pb-1 border-b transition-colors ${activeTab === 'trades'
                ? 'text-slate-900 border-slate-900 dark:text-slate-100 dark:border-slate-100'
                : 'text-slate-500 border-transparent hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
                }`}
            >
              Trades
            </button>
          </div>

          <div className="flex items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400">
            <span className={`h-1.5 w-1.5 rounded-full ${connected ? 'bg-emerald-500' : 'bg-red-500'}`} />
            <span>{connected ? 'Live' : loading ? 'Loading' : 'Disconnected'}</span>
          </div>
        </div>

        {/* <div className="mt-2 pb-2 flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
          <span>{marketSymbol || '--'}</span>
          {error ? <span className="text-red-500 dark:text-red-400">{error}</span> : <span>Depth {maxDepth}</span>}
        </div> */}
      </div>

      <div className={`${activeTab === 'orderbook' ? 'flex' : 'hidden'} flex-1 min-h-0 flex-col`}>
        <div className="grid grid-cols-3 px-3 py-2 text-[11px] text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800">
          <span>Price (USDT)</span>
          <span className="text-right">Size (USDT)</span>
          <span className="text-right">Total (USDT)</span>
        </div>

        <div className="flex-1 min-h-0 overflow-hidden flex flex-col font-mono text-xs">
          <div className="flex-1 min-h-0 overflow-hidden">
            {rowSlots.map((index) => {
              const level = asksForDisplay[index];
              const hasLevel = Boolean(level && level.sizeUSDT > 0 && level.totalUSDT > 0);
              const depthPercent = getDepthPercent(level, maxAskTotal);

              return (
                <div
                  key={`ask-${index}`}
                  className="relative grid grid-cols-3 items-center h-[22px] px-3"
                  style={{ opacity: hasLevel ? 1 : 0.55 }}
                >
                  <div
                    className="pointer-events-none absolute inset-y-0 right-0 bg-red-500/10 dark:bg-red-400/20"
                    style={{ width: `${depthPercent.toFixed(2)}%` }}
                  />
                  <span className="relative z-10 text-orange-500 dark:text-orange-400">
                    {hasLevel ? formatPrice(level.price) : '-'}
                  </span>
                  <span className="relative z-10 text-right text-slate-600 dark:text-slate-300">
                    {hasLevel ? formatCompactNumber(level.sizeUSDT) : '-'}
                  </span>
                  <span className="relative z-10 text-right text-slate-700 dark:text-slate-200">
                    {hasLevel ? formatCompactNumber(level.totalUSDT) : '-'}
                  </span>
                </div>
              );
            })}
          </div>

          <div className="h-10 px-3 border-y border-slate-200 dark:border-slate-800 bg-slate-100/80 dark:bg-slate-900/80 flex items-center justify-between">
            <span className="font-mono text-base font-semibold text-orange-500 dark:text-orange-400">
              {midPrice > 0 ? formatPrice(midPrice) : '-'}
            </span>
            <span className="font-mono text-xs text-slate-500 dark:text-slate-400">{spreadText}</span>
          </div>

          <div className="flex-1 min-h-0 overflow-hidden">
            {rowSlots.map((index) => {
              const level = bidsForDisplay[index];
              const hasLevel = Boolean(level && level.sizeUSDT > 0 && level.totalUSDT > 0);
              const depthPercent = getDepthPercent(level, maxBidTotal);

              return (
                <div
                  key={`bid-${index}`}
                  className="relative grid grid-cols-3 items-center h-[22px] px-3"
                  style={{ opacity: hasLevel ? 1 : 0.55 }}
                >
                  <div
                    className="pointer-events-none absolute inset-y-0 right-0 bg-emerald-500/10 dark:bg-emerald-400/20"
                    style={{ width: `${depthPercent.toFixed(2)}%` }}
                  />
                  <span className="relative z-10 text-emerald-600 dark:text-emerald-400">
                    {hasLevel ? formatPrice(level.price) : '-'}
                  </span>
                  <span className="relative z-10 text-right text-slate-600 dark:text-slate-300">
                    {hasLevel ? formatCompactNumber(level.sizeUSDT) : '-'}
                  </span>
                  <span className="relative z-10 text-right text-slate-700 dark:text-slate-200">
                    {hasLevel ? formatCompactNumber(level.totalUSDT) : '-'}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className={`${activeTab === 'trades' ? 'flex' : 'hidden'} flex-1 min-h-0 flex-col`}>
        <div className="grid grid-cols-3 px-3 py-2 text-[11px] text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800">
          <span>Price (USDT)</span>
          <span className="text-right">Size (USDT)</span>
          <span className="text-right">Time</span>
        </div>

        <div className="flex-1 min-h-0 overflow-hidden font-mono text-xs">
          {tradeSlots.map((index) => {
            const trade = visibleTrades[index];
            const hasTrade = Boolean(trade && trade.sizeUSDT > 0);

            return (
              <div
                key={`trade-${index}`}
                className="grid grid-cols-3 items-center h-[22px] px-3"
                style={{ opacity: hasTrade ? 1 : 0.55 }}
              >
                <span className={getTradePriceClass(trade)}>
                  {hasTrade ? formatPrice(trade.price) : '-'}
                </span>
                <span className="text-right text-slate-600 dark:text-slate-300">
                  {hasTrade ? formatCompactNumber(trade.sizeUSDT) : '-'}
                </span>
                <span className="text-right text-slate-500 dark:text-slate-400">
                  {hasTrade ? formateTime(trade.time) : '--:--:--'}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      <div className="px-3 py-1.5 border-t border-slate-200 dark:border-slate-800 text-[11px] text-slate-500 dark:text-slate-400">
        Positive-only filter active for size and total values.
      </div>
    </div>
  );
};

const OrderBookPriceLevels = React.memo(
  OrderBookPriceLevelsComponent,
  (prev, next) =>
    prev.symbol === next.symbol &&
    prev.maxDepth === next.maxDepth &&
    prev.displayCount === next.displayCount &&
    prev.tradesDisplayCount === next.tradesDisplayCount &&
    prev.useWebSocket === next.useWebSocket &&
    prev.updateThrottleMs === next.updateThrottleMs
);

OrderBookPriceLevels.displayName = 'OrderBookPriceLevels';

export default OrderBookPriceLevels;
