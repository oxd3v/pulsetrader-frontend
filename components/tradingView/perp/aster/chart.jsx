'use client';

import TradingViewAsterChart from "./tradingViewAster";



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

const AsterChart = ({symbol}) => {
   return <TradingViewAsterChart symbol={symbol} />
}

export default AsterChart
