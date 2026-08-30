import React, { useState } from "react";
import { fontendDisplayCharts } from "@/constants/common/chart";
// types
import {
  TechnicalLogicType,
  isConditionNode,
  isGroupNode
} from "@/type/order";

const LogicSummary = ({ node }: { node: TechnicalLogicType }) => {
  if (!node) return null;

  if (isConditionNode(node)) {
    const opMap: Record<string, string> = {
      GREATER_THAN: ">",
      LESS_THAN: "<",
      GREATER_THAN_OR_EQUAL: "≥",
      LESS_THAN_OR_EQUAL: "≤",
      EQUAL: "=",
      NOT_EQUAL: "≠",
    };

    return (
      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-gray-100 dark:bg-gray-700 text-[10px] font-mono border border-gray-200 dark:border-gray-600 whitespace-nowrap">
        <span className="font-semibold text-blue-600 dark:text-blue-400">{node.metric}{node.timeframe && <p className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-gray-100 dark:bg-gray-700 text-[10px] font-mono border border-gray-200 dark:border-gray-600 whitespace-nowrap">({node.timeframe in fontendDisplayCharts ? fontendDisplayCharts[node.timeframe as string] : node.timeframe})</p>}</span>
        <span className="text-gray-500">{opMap[node.operator] || node.operator} </span>
        <span className="text-gray-800 dark:text-gray-200">{node.value}</span>
      </span>
    );
  }

  if (isGroupNode(node)) {
    return (
      <div className="flex flex-wrap items-center gap-1 p-1 rounded border border-dashed border-gray-300 dark:border-gray-600 bg-gray-50/50 dark:bg-gray-800/50">
        {node.logic.map((child, idx) => (
          <React.Fragment key={idx}>
            {idx > 0 && (
              <span className={`text-[9px] font-bold px-1 rounded uppercase ${node.operator === 'AND' ? 'text-blue-500 bg-blue-50 dark:bg-blue-900/20' : 'text-orange-500 bg-orange-50 dark:bg-orange-900/20'
                }`}>
                {node.operator}
              </span>
            )}
            <LogicSummary node={child} />
          </React.Fragment>
        ))}
      </div>
    );
  }
  return null;
};

export default LogicSummary;