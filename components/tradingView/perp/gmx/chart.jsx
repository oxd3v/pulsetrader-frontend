"use client";

import TradingViewGmxChart from "./tradingViewGmx";

const GmxChart = ({ symbol }) => {
  if (!symbol) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-gray-900 rounded-lg">
        <span className="text-gray-500">Select a symbol to view chart</span>
      </div>
    );
  }

  return <TradingViewGmxChart symbol={symbol} />;
};

export default GmxChart;
