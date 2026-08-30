"use client";

import React, { useMemo } from "react";
import { usePerpAggregateInfo } from "@/hooks/userPerpAggregateInfo";
import { FiRefreshCw } from "react-icons/fi";
import { formatPrice, toFiniteNumber } from "@/utility/handy";

interface PerpAggregatorProps {
    symbol: string;
    pollIntervalMs?: number;
    exchange?: string;
}

const PerpAggregator: React.FC<PerpAggregatorProps> = ({
    symbol,
    pollIntervalMs = 30000,
    exchange = "All",
}) => {
    // ── Stable symbols array ──────────────────────────────────────────────────
    const symbols = useMemo(() => [symbol], [symbol]);

    const { data, loading, error, refetch } = usePerpAggregateInfo({
        symbols,
        exchange,
        pollIntervalMs,
        enabled: !!symbol,
    });

    const item = data && data[symbol] ? data[symbol] : null;

    // ─── Loading (only on initial mount) ──────────────────────────────────────
    if (loading && !item) {
        return (
            <div className="flex justify-center items-center h-full">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
            </div>
        );
    }

    if (error && !item) {
        return (
            <div className="text-red-500 p-4 text-center">
                <p>{error}</p>
                <button
                    onClick={refetch}
                    className="mt-2 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                >
                    Retry
                </button>
            </div>
        );
    }

    if (!item) {
        return (
            <div className="text-gray-500 p-4 text-center">
                No detailed data available for {symbol}
            </div>
        );
    }

    // ─── Helpers ──────────────────────────────────────────────────────────────
    const formatChange = (value: number) => {
        if (!Number.isFinite(value)) return "--";
        const sign = value >= 0 ? "+" : "";
        return `${sign}${value.toFixed(2)}%`;
    };

    const formatUsd = (value: number) => {
        if (!Number.isFinite(value)) return "--";
        return `$${value.toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
    };

    const formatLargeUsd = (value: number) => {
        if (!Number.isFinite(value)) return "--";
        if (value >= 1e9) return `$${(value / 1e9).toFixed(2)}B`;
        if (value >= 1e6) return `$${(value / 1e6).toFixed(2)}M`;
        return `$${value.toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
    };

    const changeColor = (value: number) => {
        if (value > 0) return "text-green-500";
        if (value < 0) return "text-red-500";
        return "text-gray-500";
    };

    // ─── Extract metrics ─────────────────────────────────────────────────────
    const price = toFiniteNumber(item.currentPrice);
    const change24h = toFiniteNumber(item.priceChangePct24h);
    const volume24h = toFiniteNumber(item.oiAmount || item.oi || 0);
    const openInterest = toFiniteNumber(item.oi);
    const oiMcRatio = toFiniteNumber(item.oiMarketCapRatio);
    const marketCap = toFiniteNumber(item.marketCap);

    const changes = [
        { label: "5m", value: toFiniteNumber(item.priceChangePct5m) },
        { label: "15m", value: toFiniteNumber(item.priceChangePct15m) },
        { label: "30m", value: toFiniteNumber(item.priceChangePct30m) },
        { label: "1h", value: toFiniteNumber(item.priceChangePct1h) },
        { label: "4h", value: toFiniteNumber(item.priceChangePct4h) },
        { label: "12h", value: toFiniteNumber(item.priceChangePct12h) },
        { label: "24h", value: toFiniteNumber(item.priceChangePct24h) },
    ];

    const oiChanges = [
        { label: "24h", value: toFiniteNumber(item.oiChangePercent24h) },
    ];

    const volumeChanges = [
        { label: "5m", value: toFiniteNumber(item.volumeChangePct5m) },
        { label: "15m", value: toFiniteNumber(item.volumeChangePct15m) },
        { label: "30m", value: toFiniteNumber(item.volumeChangePct30m) },
        { label: "1h", value: toFiniteNumber(item.volumeChangePct1h) },
        { label: "4h", value: toFiniteNumber(item.volumeChangePct4h) },
        { label: "24h", value: toFiniteNumber(item.volumeChangePct24h) },
    ];

    const lsRatios = [
        { label: "5m", value: toFiniteNumber(item.longShortRatio5m) },
        { label: "15m", value: toFiniteNumber(item.longShortRatio15m) },
        { label: "30m", value: toFiniteNumber(item.longShortRatio30m) },
        { label: "1h", value: toFiniteNumber(item.longShortRatio1h) },
        { label: "24h", value: toFiniteNumber(item.longShortRatio24h) },
    ];

    const liq24h = toFiniteNumber(item.liquidationUsd24h);
    const liq12h = toFiniteNumber(item.liquidationUsd12h);
    const liq1h = toFiniteNumber(item.liquidationUsd1h);
    const longLiqRatio24h = toFiniteNumber(item.longLiquidationRatio24h);
    const longLiqRatio12h = toFiniteNumber(item.longLiquidationRatio12h);
    const longLiqRatio4h = toFiniteNumber(item.longLiquidationRatio4h);
    const longLiqRatio1h = toFiniteNumber(item.longLiquidationRatio1h);
    const oiVolRatio = toFiniteNumber(item.oiVolRatio);
    const oiVolRatioChange24h = toFiniteNumber(item.oiVolRatioChangePct24h);

    return (
        <div className="p-4 bg-gray-50 dark:bg-gray-900 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 h-full overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold text-gray-800 dark:text-white flex items-center gap-2">
                    <span className="bg-blue-100 dark:bg-blue-900 px-2 py-1 rounded text-blue-800 dark:text-blue-200">
                        {symbol}
                    </span>
                    <span className="text-sm font-normal text-gray-500">Detailed Market Data</span>
                </h2>
                <button
                    onClick={refetch}
                    className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-colors"
                >
                    <FiRefreshCw className={`w-5 h-5 text-gray-600 dark:text-gray-300 ${loading ? "animate-spin" : ""}`} />
                </button>
            </div>

            {/* ── Main Metrics ── */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
                    <div className="text-xs text-gray-500 uppercase tracking-wider">Price</div>
                    <div className="text-2xl font-bold text-gray-900 dark:text-white">
                        ${formatPrice(price)}
                    </div>
                    <div className={`text-sm font-semibold ${changeColor(change24h)}`}>
                        {formatChange(change24h)}
                    </div>
                </div>

                <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
                    <div className="text-xs text-gray-500 uppercase tracking-wider">24h Volume</div>
                    <div className="text-xl font-bold text-gray-900 dark:text-white">
                        {formatLargeUsd(volume24h)}
                    </div>
                </div>

                <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
                    <div className="text-xs text-gray-500 uppercase tracking-wider">Open Interest</div>
                    <div className="text-xl font-bold text-gray-900 dark:text-white">
                        {formatLargeUsd(openInterest)}
                    </div>
                    <div className="flex gap-2 text-xs">
                        {oiChanges.map((item) => (
                            <span key={item.label} className={changeColor(item.value)}>
                                {item.label}: {formatChange(item.value)}
                            </span>
                        ))}
                    </div>
                </div>

                <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
                    <div className="text-xs text-gray-500 uppercase tracking-wider">Market Cap</div>
                    <div className="text-xl font-bold text-gray-900 dark:text-white">
                        {formatLargeUsd(marketCap)}
                    </div>
                    <div className="text-xs text-gray-500">
                        OI/MC: {oiMcRatio.toFixed(3)}
                    </div>
                </div>
            </div>

            {/* ── Price Changes ── */}
            <div className="mb-6">
                <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Price Changes</h3>
                <div className="grid grid-cols-3 md:grid-cols-7 gap-2">
                    {changes.map((item) => (
                        <div key={item.label} className="bg-white dark:bg-gray-800 p-2 rounded text-center">
                            <div className="text-xs text-gray-500">{item.label}</div>
                            <div className={`text-sm font-semibold ${changeColor(item.value)}`}>
                                {formatChange(item.value)}
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* ── Volume Changes ── */}
            <div className="mb-6">
                <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Volume Changes</h3>
                <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
                    {volumeChanges.map((item) => (
                        <div key={item.label} className="bg-white dark:bg-gray-800 p-2 rounded text-center">
                            <div className="text-xs text-gray-500">{item.label}</div>
                            <div className={`text-sm font-semibold ${changeColor(item.value)}`}>
                                {formatChange(item.value)}
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* ── Long / Short Ratios ── */}
            <div className="mb-6">
                <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Long / Short Ratio</h3>
                <div className="grid grid-cols-3 md:grid-cols-5 gap-2">
                    {lsRatios.map((item) => (
                        <div key={item.label} className="bg-white dark:bg-gray-800 p-2 rounded text-center">
                            <div className="text-xs text-gray-500">{item.label}</div>
                            <div className="text-sm font-semibold text-gray-900 dark:text-white">
                                {item.value.toFixed(2)}
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* ── Liquidations ── */}
            <div className="mb-6">
                <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Liquidations</h3>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                    <div className="bg-white dark:bg-gray-800 p-2 rounded">
                        <div className="text-xs text-gray-500">24h</div>
                        <div className="text-sm font-semibold text-gray-900 dark:text-white">{formatUsd(liq24h)}</div>
                        <div className="text-xs text-gray-500">Long ratio: {(longLiqRatio24h * 100).toFixed(1)}%</div>
                    </div>
                    <div className="bg-white dark:bg-gray-800 p-2 rounded">
                        <div className="text-xs text-gray-500">12h</div>
                        <div className="text-sm font-semibold text-gray-900 dark:text-white">{formatUsd(liq12h)}</div>
                        <div className="text-xs text-gray-500">Long ratio: {(longLiqRatio12h * 100).toFixed(1)}%</div>
                    </div>
                    <div className="bg-white dark:bg-gray-800 p-2 rounded">
                        <div className="text-xs text-gray-500">1h</div>
                        <div className="text-sm font-semibold text-gray-900 dark:text-white">{formatUsd(liq1h)}</div>
                        <div className="text-xs text-gray-500">Long ratio: {(longLiqRatio1h * 100).toFixed(1)}%</div>
                    </div>
                </div>
                <div className="mt-1 text-xs text-gray-500">
                    <span className="mr-4">4h long ratio: {(longLiqRatio4h * 100).toFixed(1)}%</span>
                </div>
            </div>

            {/* ── OI / Volume Ratio ── */}
            <div>
                <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">OI / Volume Ratio</h3>
                <div className="bg-white dark:bg-gray-800 p-3 rounded-lg flex flex-wrap justify-between items-center gap-2">
                    <span className="text-sm">Current: <strong>{oiVolRatio.toFixed(3)}</strong></span>
                    <span className={`text-sm font-semibold ${changeColor(oiVolRatioChange24h)}`}>
                        24h Change: {formatChange(oiVolRatioChange24h)}
                    </span>
                </div>
            </div>
        </div>
    );
};

export default PerpAggregator;