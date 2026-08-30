"use client";

import React, { useMemo } from "react";
import { formatCompactNumber } from "@/utility/handy";
import { displayNumber } from "@/utility/displayPrice";
import { SPOT_ORDERFLOW_METRICS } from "@/constants/common/frontend";
import InfoTooltip from "@/components/tradeBox/TradeBoxCommon/BoxTooltip";

interface SpotTokenDataProps {
    tokenData: any; // Raw data from Codex (filterTokens query)
    tokenInfo: {
        name: string;
        symbol: string;
        imageUrl: string;
        address: string;
        chainId: number;
        decimals: number;
    } | null;
    isLoading?: boolean;
}

// ─── Map Codex query field names to frontend metric IDs ────────────────
const CODEX_TO_FRONTEND_MAP: Record<string, string> = {
    // Price changes
    priceChangePct5m: "change5m",
    priceChangePct1h: "change1",
    priceChangePct4h: "change4",
    priceChangePct12h: "change12",
    priceChangePct24h: "change24",

    // Buy/Sell counts
    buyCount5m: "buyCount5m",
    buyCount1h: "buyCount1",
    buyCount4h: "buyCount4",
    buyCount12h: "buyCount12",
    buyCount24h: "buyCount24",
    sellCount5m: "sellCount5m",
    sellCount1h: "sellCount1",
    sellCount4h: "sellCount4",
    sellCount12h: "sellCount12",
    sellCount24h: "sellCount24",

    // Transaction counts
    txCount5m: "txnCount5m",
    txCount1h: "txnCount1",
    txCount4h: "txnCount4",
    txCount12h: "txnCount12",
    txCount24h: "txnCount24",

    // Unique transaction counts
    uniqueTxCount5m: "uniqueTransactions5m",
    uniqueTxCount1h: "uniqueTransactions1",
    uniqueTxCount4h: "uniqueTransactions4",
    uniqueTxCount12h: "uniqueTransactions12",
    uniqueTxCount24h: "uniqueTransactions24",
};

// ─── Helper: detect percentage metrics ─────────────────────────────────
const isPercentMetric = (key: string): boolean => {
    return (
        key.includes("Pct") ||
        key.includes("percent") ||
        key === "top10HoldersPercent" ||
        key === "change24"
    );
};

// ─── Format a metric value (with optional percentage handling) ──────────
const formatMetricValue = (value: any, isPercent: boolean = false): string => {
    if (value === undefined || value === null) return "—";
    const num = typeof value === "string" ? parseFloat(value) : value;
    if (isNaN(num)) return "—";
    if (isPercent) {
        // Multiply by 100 and show 4 decimal places
        return `${(num * 100).toFixed(4)}%`;
    }
    return formatCompactNumber(num, 2);
};

// ─── Metric Card Component ─────────────────────────────────────────────
const MetricCard = ({
    label,
    value,
    tooltip,
    change,
    isCurrency = false,
    isPercent = false,
}: {
    label: string;
    value: string | number;
    tooltip?: string;
    change?: number;
    isCurrency?: boolean;
    isPercent?: boolean;
}) => {
    const formattedValue = useMemo(() => {
        if (value === undefined || value === null) return "—";
        const num = typeof value === "string" ? parseFloat(value) : value;
        if (isNaN(num)) return "—";
        if (isCurrency) return `$${formatCompactNumber(num, 2)}`;
        if (isPercent) {
            // Multiply by 100 and show 4 decimal places
            return `${(num * 100).toFixed(4)}%`;
        }
        return formatCompactNumber(num, 2);
    }, [value, isCurrency, isPercent]);

    const changeColor = useMemo(() => {
        if (!change || change === 0) return "text-gray-500";
        return change > 0 ? "text-green-500" : "text-red-500";
    }, [change]);

    return (
        <div className="bg-white dark:bg-gray-800/50 rounded-xl p-4 border border-gray-100 dark:border-gray-700 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center gap-1.5 mb-1">
                <span className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    {label}
                </span>
                {tooltip && <InfoTooltip id={`metric-${label}`} content={tooltip} />}
            </div>
            <div className="flex items-baseline gap-2">
                <span className="text-lg font-bold text-gray-900 dark:text-white">
                    {formattedValue}
                </span>
                {change !== undefined && change !== null && (
                    <span className={`text-sm font-semibold ${changeColor}`}>
                        {change > 0 ? "↑" : "↓"} {Math.abs(change).toFixed(2)}%
                    </span>
                )}
            </div>
        </div>
    );
};

export default function SpotTokenData({
    tokenData,
    tokenInfo,
    isLoading = false,
}: SpotTokenDataProps) {
    // ─── Overview metrics (directly available in tokenData) ──────────────
    const overviewMetrics = useMemo(() => {
        if (!tokenData) return [];
        return [
            {
                label: "Price",
                value: tokenData.priceUSD || 0,
                isCurrency: true,
                change: tokenData.change24,
                tooltip: "Current price in USD",
            },
            {
                label: "Market Cap",
                value: tokenData.marketCap || 0,
                isCurrency: true,
                tooltip: "Fully diluted market capitalization",
            },
            {
                label: "Liquidity",
                value: tokenData.liquidity || 0,
                isCurrency: true,
                tooltip: "Total liquidity in the main pool",
            },
            {
                label: "24h Volume",
                value: tokenData.volume24 || 0,
                isCurrency: true,
                tooltip: "Trading volume over the last 24 hours",
            },
            {
                label: "Holders",
                value: tokenData.holders || 0,
                tooltip: "Number of unique wallet addresses holding this token",
            },
            {
                label: "Top 10 Holders",
                value: tokenData.top10HoldersPercent || 0,
                isPercent: true,
                tooltip: "Percentage of supply held by the top 10 wallets",
            },
        ];
    }, [tokenData]);

    // ─── Order‑flow metrics (mapped from Codex fields) ──────────────────
    const orderFlowMetrics = useMemo(() => {
        if (!tokenData) return {};

        const mapped: Record<string, any> = {};
        SPOT_ORDERFLOW_METRICS.forEach((metric) => {
            const codexField = CODEX_TO_FRONTEND_MAP[metric.id];
            if (codexField) {
                const val = tokenData[codexField];
                if (val !== undefined && val !== null) {
                    mapped[metric.id] = val;
                }
            }
        });
        return mapped;
    }, [tokenData]);

    // ─── Group metrics by category ──────────────────────────────────────
    const groupedMetrics = useMemo(() => {
        const groups: Record<
            string,
            { label: string; items: { key: string; value: any }[] }
        > = {
            priceChanges: { label: "Price Changes", items: [] },
            buySell: { label: "Buy/Sell Activity", items: [] },
            transactions: { label: "Transaction Activity", items: [] },
            other: { label: "Other Metrics", items: [] },
        };

        Object.entries(orderFlowMetrics).forEach(([key, value]) => {
            if (key.startsWith("priceChangePct")) {
                groups.priceChanges.items.push({ key, value });
            } else if (key.startsWith("buyCount") || key.startsWith("sellCount")) {
                groups.buySell.items.push({ key, value });
            } else if (key.startsWith("txCount") || key.startsWith("uniqueTxCount")) {
                groups.transactions.items.push({ key, value });
            } else {
                groups.other.items.push({ key, value });
            }
        });

        // Remove empty groups
        Object.keys(groups).forEach((k) => {
            if (groups[k].items.length === 0) delete groups[k];
        });
        return groups;
    }, [orderFlowMetrics]);

    // ─── Render helpers ─────────────────────────────────────────────────
    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-full bg-white dark:bg-gray-900 rounded-2xl">
                <div className="flex flex-col items-center gap-3">
                    <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
                    <span className="text-sm text-gray-500 dark:text-gray-400">
                        Loading token data...
                    </span>
                </div>
            </div>
        );
    }

    if (!tokenData) {
        return (
            <div className="flex items-center justify-center h-full bg-white dark:bg-gray-900 rounded-2xl">
                <p className="text-gray-500 dark:text-gray-400">No token data available</p>
            </div>
        );
    }

    return (
        <div className="h-full overflow-y-auto bg-white dark:bg-gray-900 rounded-2xl p-4 space-y-6">
            {/* Token Header */}
            <div className="flex items-center gap-4 pb-4 border-b border-gray-200 dark:border-gray-700">
                <img
                    src={tokenInfo?.imageUrl || "/tokenLogo.png"}
                    alt={tokenInfo?.symbol || "Token"}
                    className="w-12 h-12 rounded-full border-2 border-gray-200 dark:border-gray-700"
                />
                <div>
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                        {tokenInfo?.symbol || "Unknown"}
                        <span className="text-sm font-normal text-gray-500 dark:text-gray-400">
                            {tokenInfo?.name || ""}
                        </span>
                    </h2>
                    <div className="flex items-center gap-3 text-xs text-gray-500 dark:text-gray-400">
                        <span>Chain: {tokenInfo?.chainId || "—"}</span>
                        <span>•</span>
                        <span className="truncate max-w-[200px]">
                            {tokenInfo?.address || "—"}
                        </span>
                    </div>
                </div>
            </div>

            {/* Overview Grid */}
            <div>
                <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
                    Overview
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                    {overviewMetrics.map((metric) => (
                        <MetricCard
                            key={metric.label}
                            label={metric.label}
                            value={metric.value}
                            tooltip={metric.tooltip}
                            change={metric.change}
                            isCurrency={metric.isCurrency}
                            isPercent={metric.isPercent}
                        />
                    ))}
                </div>
            </div>

            {/* Order Flow Metrics */}
            {Object.values(groupedMetrics).some((g) => g.items.length > 0) && (
                <div>
                    <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
                        Order Flow Metrics
                    </h3>
                    <div className="space-y-4">
                        {Object.values(groupedMetrics).map(
                            (group) =>
                                group.items.length > 0 && (
                                    <div key={group.label}>
                                        <h4 className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">
                                            {group.label}
                                        </h4>
                                        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                                            {group.items.map(({ key, value }) => {
                                                const isPct = isPercentMetric(key);
                                                const display = formatMetricValue(value, isPct);
                                                const label = key
                                                    .replace(/([A-Z])/g, " $1")
                                                    .replace(/^./, (str) => str.toUpperCase())
                                                    .replace(/Pct/g, "%")
                                                    .replace(/Count/g, " Count")
                                                    .replace(/Tx/g, "Tx");
                                                return (
                                                    <div
                                                        key={key}
                                                        className="bg-gray-50 dark:bg-gray-800/50 rounded-lg px-3 py-2 border border-gray-100 dark:border-gray-700"
                                                    >
                                                        <div className="text-[10px] text-gray-400 uppercase tracking-wider">
                                                            {label}
                                                        </div>
                                                        <div className="text-sm font-semibold text-gray-900 dark:text-white">
                                                            {display}
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                )
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}