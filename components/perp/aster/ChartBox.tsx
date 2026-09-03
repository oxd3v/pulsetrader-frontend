"use client";

import { memo, useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { FiChevronUp } from "react-icons/fi";
import { LuChartCandlestick } from "react-icons/lu";
import { RiArrowDropDownLine } from "react-icons/ri";
import { TbChartArcs } from "react-icons/tb";

import TvChartContainer from "@/components/tradingView/perp/aster/chart";
import OrderBook from "./OrderBook";
import AssetSelect from "./assetSelect";
import PerpAggregator from "../PerpAggregator";
import { formatCompactNumber, toFiniteNumber, formatPrice } from "@/utility/handy";

import type { AsterMarketStats } from "@/hooks/useAsterhooks/useAsterMarketStats";
import { normalizeAsterSymbol, normalizeCoin } from "@/utility/perpUtils";

interface ChartBoxProps {
  tokenSymbol: string;
  handleTokenSelect?: () => void;
  onSymbolChange?: (symbol: string) => void;
  stats: AsterMarketStats;
  connected: boolean;
  loading: boolean;
  error: string | null;
  isAdvancedSymbol: boolean;
}

interface MetricItem {
  label: string;
  value: string;
  helper?: ReactNode;
}



const formatPercent = (value: number): string => {
  if (!Number.isFinite(value)) return "--";
  const sign = value >= 0 ? "+" : "";
  return `${sign}${value.toFixed(2)}%`;
};

const formatCompactMetric = (value: number): string => {
  if (!Number.isFinite(value) || value <= 0) return "--";
  return formatCompactNumber(value, 2);
};

const formatFundingRate = (value: number): string => {
  if (!Number.isFinite(value)) return "--";
  return `${(value * 100).toFixed(4)}%`;
};

const formatCountdown = (nextFundingTime: number, now: number): string => {
  if (!Number.isFinite(nextFundingTime) || nextFundingTime <= now) {
    return "--:--:--";
  }

  const remainingMs = nextFundingTime - now;
  const totalSeconds = Math.floor(remainingMs / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  const hoursText = String(hours).padStart(2, "0");
  const minutesText = String(minutes).padStart(2, "0");
  const secondsText = String(seconds).padStart(2, "0");

  return `${hoursText}:${minutesText}:${secondsText}`;
};

const FundingCountdown = memo(function FundingCountdown({
  nextFundingTime,
}: {
  nextFundingTime: number;
}) {
  const [currentTime, setCurrentTime] = useState(() => Date.now());

  useEffect(() => {
    if (!Number.isFinite(nextFundingTime) || nextFundingTime <= 0) {
      return undefined;
    }

    const intervalId = setInterval(() => {
      setCurrentTime(Date.now());
    }, 1000);

    return () => clearInterval(intervalId);
  }, [nextFundingTime]);

  return (
    <span className="mt-0.5 text-[11px] text-gray-500 dark:text-gray-400 truncate">
      ({formatCountdown(nextFundingTime, currentTime)})
    </span>
  );
});

const ChartBox = memo(function ChartBox({
  tokenSymbol,
  handleTokenSelect,
  onSymbolChange,
  stats,
  connected,
  loading,
  error,
  isAdvancedSymbol,
}: ChartBoxProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isPerpAggregator, setIsPerpAggregator] = useState(false);
  const [showAssetSelect, setShowAssetSelect] = useState(false);

  const selectedSymbol = useMemo(
    () => normalizeAsterSymbol(tokenSymbol),
    [tokenSymbol]
  );

  void error;

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 1026) {
        setIsCollapsed(true);
      } else {
        setIsCollapsed(false);
      }
    };

    if (window.innerWidth < 1026) {
      setIsCollapsed(true);
    }

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const handleSelectSymbol = useCallback(
    (symbol: string) => {
      const normalizedSymbol = normalizeAsterSymbol(symbol);
      if (onSymbolChange) {
        onSymbolChange(normalizedSymbol);
      }
      if (handleTokenSelect) {
        handleTokenSelect();
      }
    },
    [handleTokenSelect, onSymbolChange]
  );

  const memoizedOrderBook = useMemo(
    () => <OrderBook key={selectedSymbol} symbol={selectedSymbol} />,
    [selectedSymbol]
  );

  const metrics = useMemo<MetricItem[]>(() => {
    return [
      { label: "Mark Price", value: formatPrice(stats.markPrice) },
      { label: "Index Price", value: formatPrice(stats.indexPrice) },
      {
        label: "Funding Rate",
        value: formatFundingRate(stats.fundingRate),
        helper: <FundingCountdown nextFundingTime={stats.nextFundingTime} />,
      },
      {
        label: "Open Interest",
        value: formatCompactMetric(stats.openInterestUsd),
      },
      {
        label: "24h Volume",
        value: formatCompactMetric(stats.quoteVolume),
      },
    ];
  }, [stats]);

  const changeValue = toFiniteNumber(stats.priceChangePercent);
  const hasSymbol = Boolean(selectedSymbol);
  const normalizeSymbol = normalizeCoin(selectedSymbol);
  const showAggregatorToggle = isAdvancedSymbol;

  return (
    <>
      <div className="bg-white dark:bg-gray-900 rounded-2xl font-mono shadow-sm p-1 lg:p-2 border border-gray-100 dark:border-gray-800">
        <div className="p-1 space-y-3">
          <div className="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
            <div className="xl:flex min-w-0 xl:flex-1 items-start gap-3">
              <div
                className="min-w-0 flex-1 rounded-lg p-1 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
                onClick={() => setShowAssetSelect(true)}
              >
                <div className="flex flex-col gap-2">
                  <div className="flex min-w-0 flex-wrap items-center gap-3">
                    <h2 className="flex items-center gap-2 text-lg lg:text-xl 2xl:text-2xl font-bold text-gray-800 dark:text-white">
                      <span className="flex gap-1 items-center bg-blue-100 dark:bg-blue-900 px-3 py-1 rounded">
                        {selectedSymbol || "SYMBOL"} <RiArrowDropDownLine />
                      </span>
                      <span className="text-sm lg:text-md text-yellow-400">Perp</span>
                    </h2>

                    <div className="flex items-center gap-2 text-xs">
                      <span className="text-gray-900 dark:text-gray-100 font-semibold">
                        {formatPrice(stats.lastPrice)}
                      </span>
                      <span
                        className={`font-semibold ${changeValue >= 0 ? "text-green-500" : "text-red-500"
                          }`}
                      >
                        {formatPercent(changeValue)}
                      </span>
                      <span
                        className={`h-1.5 w-1.5 rounded-full ${connected
                          ? "bg-emerald-400"
                          : loading
                            ? "bg-amber-400"
                            : "bg-red-400"
                          }`}
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex justify-end items-center gap-2">
                <div className="flex w-full items-stretch justify-end gap-3 xl:w-auto xl:max-w-[760px]">
                  {metrics.map((item) => (
                    <div key={item.label}>
                      <p className="text-[5px] xl:text-[11px] text-gray-500 dark:text-gray-400 truncate">
                        {item.label}
                      </p>
                      <p className="flex gap-1 text-xs xl:text-sm font-semibold text-gray-900 dark:text-gray-100 truncate">
                        {item.value} {item.helper ?? null}
                      </p>
                    </div>
                  ))}
                </div>

                {showAggregatorToggle && (
                  <button
                    onClick={() => setIsPerpAggregator(!isPerpAggregator)}
                    className="p-2 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-lg transition-colors"
                    title="Toggle market overview"
                  >
                    <TbChartArcs className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                  </button>
                )}

                <button
                  onClick={(event) => {
                    event.stopPropagation();
                    setIsCollapsed(!isCollapsed);
                  }}
                  className="mt-1 shrink-0 p-2 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-lg transition-colors"
                  title={isCollapsed ? "Expand chart" : "Collapse chart"}
                >
                  {isCollapsed ? (
                    <LuChartCandlestick className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                  ) : (
                    <FiChevronUp className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>

        <div
          className={`overflow-hidden transition-all duration-300 border-t border-gray-300 dark:border-gray-800 ${isCollapsed
            ? "h-0 border-none"
            : "h-[400px] lg:h-[500px] 2xl:h-[500px]"
            }`}
        >
          {isPerpAggregator ? (
            <div className="w-full h-full p-2">
              <PerpAggregator symbol={normalizeSymbol} />
            </div>
          ) : (
            <div className="lg:flex w-full h-full p-2">
              <div className="grow h-full rounded-lg overflow-hidden bg-gray-50 dark:bg-gray-800">
                {hasSymbol ? (
                  <TvChartContainer symbol={selectedSymbol} />
                ) : (
                  <div className="w-full h-full bg-gray-200 dark:bg-gray-700 animate-pulse flex items-center justify-center">
                    <span className="text-gray-500 dark:text-gray-400">
                      Select a symbol to view chart
                    </span>
                  </div>
                )}
              </div>

              <div className="hidden lg:block lg:max-w-[300px] h-full">
                {hasSymbol ? (
                  <div className="w-full h-full">{memoizedOrderBook}</div>
                ) : (
                  <div className="bg-gray-50 dark:bg-gray-800 rounded-lg flex items-center justify-center h-full">
                    <span className="text-gray-500 dark:text-gray-400 text-sm">
                      Select a symbol to view order book
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      <AssetSelect
        isOpen={showAssetSelect}
        onClose={() => setShowAssetSelect(false)}
        onSelectSymbol={handleSelectSymbol}
        currentSymbol={selectedSymbol}
      />
    </>
  );
});

export default ChartBox;