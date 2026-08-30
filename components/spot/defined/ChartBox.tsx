'use client';

import React, { useEffect, useState, useMemo, useCallback, memo } from "react";
import { FiChevronUp, FiChevronDown } from "react-icons/fi";
import { LuChartCandlestick } from "react-icons/lu";
import { TbChartArcs } from "react-icons/tb";
import { motion, AnimatePresence } from "framer-motion";

import TvChartContainer from "@/components/tradingView/spot/defined/chart";
import TokenDataRender from "@/components/spot/defined/spotTokenData";
import { formatCompactNumber } from "@/utility/handy";
import { displayNumber } from "@/utility/displayPrice";

// ─── Stat Card Component ────────────────────────────────────────────────
const StatCard = memo(({ label, value, isChange = false }: { label: string; value: number | string; isChange?: boolean }) => {
  const formattedValue = useMemo(() => {
    if (isChange) {
      const num = typeof value === 'string' ? parseFloat(value) : value;
      if (isNaN(num)) return '0%';
      const sign = num >= 0 ? '+' : '';
      return `${sign}${num.toFixed(2)}%`;
    }
    return formatCompactNumber(typeof value === 'string' ? parseFloat(value) : value, 2);
  }, [value, isChange]);

  const changeColor = useMemo(() => {
    if (!isChange) return 'text-gray-800 dark:text-gray-200';
    const num = typeof value === 'string' ? parseFloat(value) : value;
    if (num > 0) return 'text-green-500';
    if (num < 0) return 'text-red-500';
    return 'text-gray-500';
  }, [value, isChange]);

  return (
    <div className="hidden lg:block stat-card">
      <div className="text-xs xl:text-sm font-medium text-gray-500 dark:text-gray-400">
        {label}
      </div>
      <div className={`text-md font-bold font-mono ${changeColor}`}>
        {formattedValue}
      </div>
    </div>
  );
});

StatCard.displayName = 'StatCard';

// ─── Main Component ──────────────────────────────────────────────────────

interface ChartBoxProps {
  tokenInfo: {
    name: string;
    symbol: string;
    quoteToken: string;
    chainId: number;
    pairAddress: string;
    createdAt: number;
    imageUrl: string;
    address: string;
    decimals: number;
  } | null;
  tokenState: any;
  handleTokenSelect: () => void;
}

const ChartBox = memo(function ChartBox({
  tokenInfo,
  tokenState,
  handleTokenSelect,
}: ChartBoxProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isDisplayTokenData, setIsDisplayTokenData] = useState(false);

  // ─── Responsive collapse ──────────────────────────────────────────────
  useEffect(() => {
    const handleResize = () => {
      setIsCollapsed(window.innerWidth < 1026);
    };

    handleResize(); // set initial
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // ─── Price display memo ───────────────────────────────────────────────
  const priceDisplay = useMemo(() => {
    const price = Number(tokenState?.priceUSD || 0);
    return displayNumber(price);
  }, [tokenState?.priceUSD]);

  // ─── Toggle handlers ──────────────────────────────────────────────────
  const toggleDataView = useCallback(() => {
    setIsDisplayTokenData(prev => !prev);
  }, []);

  const toggleCollapse = useCallback(() => {
    setIsCollapsed(prev => !prev);
  }, []);

  return (
    <div className="bg-white dark:bg-gray-900 rounded-2xl font-mono shadow-sm p-1 lg:p-2 border border-gray-100 dark:border-gray-800">
      <div className="flex justify-between items-center p-1">
        {/* Left: Token info */}
        <div className="flex-1 cursor-pointer group" onClick={handleTokenSelect}>
          <div className="flex justify-between items-center transition-all duration-300">
            {tokenInfo ? (
              <div className="flex gap-1 items-center justify-center">
                <div className="transition-all duration-200 group-hover:translate-x-1">
                  <h2 className="text-lg 2xl:text-2xl font-bold text-gray-800 dark:text-white flex items-center gap-2">
                    <img
                      src={tokenInfo.imageUrl || "/tokenLogo.png"}
                      className="w-7 xl:w-8 h-7 xl:h-8 rounded-full"
                      alt={tokenInfo.symbol}
                    />
                    <span className="text-sm xl:text-lg bg-blue-100 dark:bg-blue-900 px-2 py-1 rounded">
                      {tokenInfo.symbol}
                    </span>
                    <span className="text-sm xl:text-md text-yellow-500">|Spot</span>
                  </h2>
                </div>
              </div>
            ) : (
              <div className="w-8 h-10 animate-pulse bg-gray-200 dark:bg-gray-800 rounded" />
            )}

            {/* Stats Cards */}
            <div className="flex justify-end gap-4">
              <StatCard label="Liquidity" value={tokenState?.liquidity || 0} />
              <StatCard label="Market Cap" value={tokenState?.marketCap || 0} />
              <StatCard label="24h Vol" value={tokenState?.volume24 || 0} />
              <StatCard label="24h Chg" value={tokenState?.change24 || 0} isChange />
              <div className="stat-card border-l pl-4 dark:border-gray-700">
                <div className="text-xs xl:text-sm font-medium text-gray-500 dark:text-gray-400">
                  Price
                </div>
                <div className="text-right">
                  <AnimatePresence mode="wait">
                    <motion.div
                      key={`price-${tokenState?.priceUSD || 0}`}
                      initial={{ opacity: 0.8, y: 0 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0.8, y: 0 }}
                      transition={{ duration: 0.15 }}
                      className="flex items-center justify-end gap-2"
                    >
                      {!tokenState && !tokenInfo ? (
                        <div className="h-8 w-32 bg-gray-200 dark:bg-gray-700 animate-pulse rounded" />
                      ) : (
                        <motion.span
                          className="text-lg lg:text-lg 2xl:text-2xl font-bold text-gray-800 dark:text-gray-200"
                          animate={{ scale: 1 }}
                          transition={{ duration: 0.2 }}
                        >
                          {priceDisplay}
                        </motion.span>
                      )}
                    </motion.div>
                  </AnimatePresence>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right: Toggle buttons */}
        <div className="flex items-center gap-1">
          <button
            onClick={toggleDataView}
            className={`flex gap-1 items-center text-sm border border-gray-300 dark:border-gray-700 p-2 rounded-lg transition-colors ${isDisplayTokenData ? "bg-blue-500 text-white" : "bg-gray-900 text-white"
              }`}
            title="Toggle market overview"
          >
            {isDisplayTokenData ? (
              <LuChartCandlestick className="w-5 h-5" />
            ) : (
              <TbChartArcs className="w-5 h-5" />
            )}
            {isDisplayTokenData ? "Back to chart" : "Token Data"}
          </button>
          <button
            onClick={toggleCollapse}
            className="ml-4 p-2 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-lg transition-colors"
          >
            {isCollapsed ? (
              <LuChartCandlestick className="w-5 h-5 text-gray-600" />
            ) : (
              <FiChevronUp className="w-5 h-5 text-gray-600" />
            )}
          </button>
        </div>
      </div>

      {/* Content Area */}
      <div
        className={`overflow-hidden transition-all duration-300 border-t border-gray-300 dark:border-gray-800 ${isCollapsed ? "h-0 border-none" : "h-[400px] lg:h-[380px] 2xl:h-[380px]"
          }`}
      >
        {tokenInfo ? (
          isDisplayTokenData ? (
            <TokenDataRender tokenData={tokenState} tokenInfo={tokenInfo} />
          ) : (
            <TvChartContainer
              pairAddress={tokenInfo.pairAddress}
              quoteToken={tokenInfo.quoteToken}
              createdAt={tokenInfo.createdAt}
              chainId={tokenInfo.chainId}
              symbol={tokenInfo.symbol}
              address={tokenInfo.address}
            />
          )
        ) : (
          <div className="w-full h-full bg-gray-200 dark:bg-gray-800 animate-pulse" />
        )}
      </div>
    </div>
  );
});

export default ChartBox;