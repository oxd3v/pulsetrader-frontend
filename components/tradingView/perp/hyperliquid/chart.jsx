'use client';

import TradingViewHyperliquidChart from "./tradingViewHyperliquid";



/**
 * DefinedChart Component
 * 
 * Wrapper component for TradingView chart integration
 * 
 * Props:
 * - symbol: string - Trading symbol (e.g., "BTC", "ETH") - will be converted to "BTCUSDT" format
 * 
 * Example usage:
 * <DefinedChart symbol="BTC" />
 */
const DefinedChart = ({ symbol }) => {
  // Guard: symbol is required
  if (!symbol) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-gray-900 rounded-lg">
        <span className="text-gray-500">Select a symbol to view chart</span>
      </div>
    );
  }

  return <TradingViewHyperliquidChart symbol={symbol} />;
};

export default DefinedChart;
