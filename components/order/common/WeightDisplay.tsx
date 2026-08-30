import React from "react";
import { fontendDisplayCharts } from "@/constants/common/chart";
import {
    TechnicalWeightsType,
    WeightConditionType,
    ComparisonOperator,
} from "@/type/order";

// ─── Helper: operator symbol ─────────────────────────────────────────────
const opSymbolMap: Record<ComparisonOperator, string> = {
    EQUAL: "=",
    NOT_EQUAL: "≠",
    GREATER_THAN: ">",
    LESS_THAN: "<",
    GREATER_THAN_OR_EQUAL: "≥",
    LESS_THAN_OR_EQUAL: "≤",
};

function formatOperator(op?: ComparisonOperator): string {
    if (!op) return "";
    return opSymbolMap[op] || op;
}

// ─── Single Weight Condition ─────────────────────────────────────────────
const WeightCondition = ({ condition }: { condition: WeightConditionType }) => {
    const { metric, timeframe, operator, value, weight } = condition;

    let timeframeDisplay = "";
    if (timeframe && fontendDisplayCharts[timeframe]) {
        timeframeDisplay = fontendDisplayCharts[timeframe];
    } else if (timeframe) {
        timeframeDisplay = timeframe;
    }

    return (
        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-gray-100 dark:bg-gray-700 text-[10px] font-mono border border-gray-200 dark:border-gray-600 whitespace-nowrap">
            <span className="font-semibold text-blue-600 dark:text-blue-400">
                {metric}
                {timeframeDisplay && (
                    <span className="ml-0.5 text-gray-400">({timeframeDisplay})</span>
                )}
            </span>
            {operator && (
                <span className="text-gray-500">{formatOperator(operator)}</span>
            )}
            {value && <span className="text-gray-800 dark:text-gray-200">{value}</span>}
            <span className="ml-1 text-xs font-bold text-green-600 dark:text-green-400">
                {weight}
            </span>
        </span>
    );
};

// ─── Main Component ─────────────────────────────────────────────────────
const WeightDisplay = ({ weights }: { weights: TechnicalWeightsType }) => {
    if (!weights || !weights.weights?.length) {
        return (
            <span className="text-gray-400 text-xs italic">No weight conditions</span>
        );
    }

    return (
        <div className="flex flex-wrap items-center gap-1 p-1 rounded border border-dashed border-gray-300 dark:border-gray-600 bg-gray-50/50 dark:bg-gray-800/50">
            {/* Target weight badge */}
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-blue-100 dark:bg-blue-900/40 text-[10px] font-bold text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-700">
                Target: {weights.targetWeight}
            </span>

            {/* Weight conditions */}
            {weights.weights.map((condition, idx) => (
                <React.Fragment key={idx}>
                    {idx > 0 && (
                        <span className="text-[9px] font-bold px-1 text-gray-400">+</span>
                    )}
                    <WeightCondition condition={condition} />
                </React.Fragment>
            ))}
        </div>
    );
};

export default WeightDisplay;