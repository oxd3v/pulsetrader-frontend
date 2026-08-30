import React from "react";
import { ComparisonOperator } from "@/type/order";
import { formateUsdAmount } from "@/utility/number";

// ─── Operator symbols ────────────────────────────────────────────────────
const opSymbolMap: Record<ComparisonOperator, string> = {
    EQUAL: "=",
    NOT_EQUAL: "≠",
    GREATER_THAN: ">",
    LESS_THAN: "<",
    GREATER_THAN_OR_EQUAL: "≥",
    LESS_THAN_OR_EQUAL: "≤",
};

// ─── Props ──────────────────────────────────────────────────────────────
interface PriceEntryDisplayProps {
    /**
     * The price entry object from the order.entry.priceEntry.
     * If null or undefined, a fallback is shown (configurable).
     */
    priceEntry?: {
        operator: ComparisonOperator;
        targetPriceUsd: string;
    } | null;

    /** Optional prefix (e.g. "$", "€") – defaults to "$" */
    prefix?: string;

    /** Optional suffix (e.g. " USD") – defaults to "" */
    suffix?: string;

    /** Whether to show a placeholder ("—") when priceEntry is missing – defaults to true */
    showEmpty?: boolean;

    /** Whether to show the operator symbol – defaults to true */
    showOperator?: boolean;
}

// ─── Component ──────────────────────────────────────────────────────────
/**
 * Renders a price entry condition in a compact, styled chip.
 * Used in order tables, strategy previews, and wherever a price threshold is displayed.
 *
 * @example
 * <PriceEntryDisplay priceEntry={order.entry.priceEntry} />
 */
const PriceEntryDisplay: React.FC<PriceEntryDisplayProps> = ({
    priceEntry,
    prefix = "$",
    suffix = "",
    showEmpty = true,
    showOperator = true,
}) => {
    // ─── Empty state ─────────────────────────────────────────────────────
    if (!priceEntry) {
        return showEmpty ? <span className="text-gray-400 text-xs">—</span> : null;
    }

    const { operator, targetPriceUsd } = priceEntry;
    const opSymbol = showOperator ? opSymbolMap[operator] || operator : null;

    // Format the price with up to 6 decimal places, but trim trailing zeros.
    const numericPrice = formateUsdAmount(targetPriceUsd, 7);


    // ─── Render chip ──────────────────────────────────────────────────────
    return (
        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-gray-100 dark:bg-gray-700 text-[10px] font-mono border border-gray-200 dark:border-gray-600 whitespace-nowrap">
            {showOperator && opSymbol && (
                <span className="text-gray-500">{opSymbol}</span>
            )}
            <span className="text-gray-800 dark:text-gray-200 font-medium">
                {prefix}
                {numericPrice}
                {suffix}
            </span>
        </span>
    );
};

export default PriceEntryDisplay;