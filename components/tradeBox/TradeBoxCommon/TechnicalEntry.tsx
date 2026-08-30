import React, { useCallback, useMemo } from "react";
import {
  ComparisonOperator,
  TechnicalLogicType,
  ComparableConditionType,
  GroupNodeType,
  TechnicalWeightsType,
  WeightConditionType,
  isConditionNode,
  isGroupNode,
} from "@/type/order";

import {
  FiTrash2,
  FiPlus,
  FiActivity,
  FiLayers,
} from "react-icons/fi";
import { TbChartLine, TbChartDonut } from "react-icons/tb";
import {
  INDICATORS_KEY,
  TECHNICAL_INDICATORS,
  PERP_ORDERFLOW_METRICS,
  SPOT_ORDERFLOW_METRICS,
} from "@/constants/common/frontend";
import { useChartDataStore } from "@/store/useChartData";
import { useShallow } from "zustand/shallow";

// ─── Constants ──────────────────────────────────────────────────────────────

const TIMEFRAMES = [
  { value: "1m", label: "1m" },
  { value: "5m", label: "5m" },
  { value: "15m", label: "15m" },
  { value: "1h", label: "1h" },
  { value: "4h", label: "4h" },
  { value: "1d", label: "1d" },
];

const COMPARISON_OPERATORS: { value: ComparisonOperator; label: string }[] = [
  { value: "GREATER_THAN", label: ">" },
  { value: "LESS_THAN", label: "<" },
  { value: "GREATER_THAN_OR_EQUAL", label: "≥" },
  { value: "LESS_THAN_OR_EQUAL", label: "≤" },
  { value: "EQUAL", label: "=" },
  { value: "NOT_EQUAL", label: "≠" },
];

// Default condition uses the first metric's buyThreshold if available
const getDefaultCondition = (metricsList: any[]): ComparableConditionType => {
  const defaultMetric = metricsList[0] || { id: "rsi", buyThreshold: 30 };
  return {
    operator: "GREATER_THAN",
    metric: defaultMetric.id,
    timeframe: "1m",
    period: defaultMetric.defaultPeriod || 14,
    value: String(defaultMetric.buyThreshold ?? 30),
  };
};

const getDefaultGroup = (metricsList: any[]): GroupNodeType => ({
  operator: "AND",
  logic: [getDefaultCondition(metricsList)],
});

const getDefaultWeights = (metricsList: any[]): TechnicalWeightsType => {
  const defaultMetric = metricsList[0] || { id: "rsi", buyThreshold: 30 };
  return {
    targetWeight: 50,
    weights: [
      {
        metric: defaultMetric.id,
        timeframe: "1m",
        operator: "GREATER_THAN",
        value: String(defaultMetric.buyThreshold ?? 30),
        weight: 50,
      },
    ],
  };
};

// ─── Helper: get TradingView indicator name ──────────────────────────────

const getTradingViewIndicatorName = (indicatorId: string): string => {
  const indicator = INDICATORS_KEY.find((i: any) => i.id === indicatorId);
  return indicator?.indicatorName || indicatorId;
};

// ─── Helper: is this metric a technical indicator (needs timeframe/period)? ──
const isIndicatorMetric = (metricId: string | undefined, list: any[]): boolean => {
  if (!metricId) return false;
  const found = list.find((i: any) => i.id === metricId);
  return found?.type === "indicator";
};

// ─── Helper: detect entry type ──────────────────────────────────────────

const isWeightedEntry = (entry: any): entry is TechnicalWeightsType => {
  return entry && "targetWeight" in entry && "weights" in entry;
};

// ─── LogicNode (unchanged except using metricsList and proper defaults) ──

interface LogicNodeProps {
  node: TechnicalLogicType;
  onChange: (newNode: TechnicalLogicType) => void;
  onDelete?: () => void;
  depth?: number;
  indexLabel?: string;
  onRenderIndicator?: (indicatorName: string, period: number, resolution: string) => void;
  metricsList: any[];
}

const LogicNode = React.memo<LogicNodeProps>(
  ({
    node,
    onChange,
    onDelete,
    depth = 0,
    indexLabel = "1",
    onRenderIndicator,
    metricsList,
  }) => {
    const handleFieldChange = useCallback(
      (field: keyof ComparableConditionType, value: any) => {
        if (isConditionNode(node)) {
          onChange({ ...node, [field]: value });
        }
      },
      [node, onChange]
    );

    const handleIndicatorChange = useCallback(
      (e: React.ChangeEvent<HTMLSelectElement>) => {
        if (isConditionNode(node)) {
          const sel = metricsList.find((i: any) => i.id === e.target.value);
          const newNode: ComparableConditionType = {
            ...node,
            metric: e.target.value,
            timeframe: node.timeframe || "1m",
          };
          // Apply default period and threshold from the selected metric
          if (sel?.defaultPeriod !== undefined) newNode.period = sel.defaultPeriod;
          if (sel?.buyThreshold !== undefined && sel?.buyThreshold !== null) {
            newNode.value = String(sel.buyThreshold);
          }
          onChange(newNode);
        }
      },
      [node, onChange, metricsList]
    );

    const handleGroupOperatorChange = useCallback(
      (e: React.ChangeEvent<HTMLSelectElement>) => {
        if (isGroupNode(node)) {
          onChange({ ...node, operator: e.target.value as "AND" | "OR" });
        }
      },
      [node, onChange]
    );

    const addChild = useCallback(
      (newChild: TechnicalLogicType) => {
        if (isGroupNode(node)) {
          onChange({ ...node, logic: [...node.logic, newChild] });
        }
      },
      [node, onChange]
    );

    const updateChild = useCallback(
      (idx: number, child: TechnicalLogicType) => {
        if (isGroupNode(node)) {
          const newLogic = [...node.logic];
          newLogic[idx] = child;
          onChange({ ...node, logic: newLogic });
        }
      },
      [node, onChange]
    );

    const removeChild = useCallback(
      (idx: number) => {
        if (isGroupNode(node)) {
          onChange({
            ...node,
            logic: node.logic.filter((_, i) => i !== idx),
          });
        }
      },
      [node, onChange]
    );

    const handleRenderIndicator = useCallback(() => {
      if (isConditionNode(node) && onRenderIndicator) {
        const tvIndicatorName = getTradingViewIndicatorName(node.metric as string);
        onRenderIndicator(
          tvIndicatorName,
          node.period || 14,
          node.timeframe || "1"
        );
      }
    }, [node, onRenderIndicator]);

    // Condition Node
    if (isConditionNode(node)) {
      return (
        <div className="bg-white dark:bg-gray-800 rounded-md p-2 space-y-2 border border-gray-200 dark:border-gray-700 shadow-sm transition-all hover:border-blue-300 dark:hover:border-blue-700">
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wide">
              Condition {indexLabel}
            </span>
            <div className="flex items-center gap-1">
              {TECHNICAL_INDICATORS.includes(node.metric as string) && (
                <button
                  onClick={handleRenderIndicator}
                  className="p-1 text-gray-400 hover:text-blue-500 transition-colors"
                  title="Render indicator on chart"
                >
                  <TbChartLine className="w-5 h-5" />
                </button>
              )}
              {onDelete && (
                <button
                  onClick={onDelete}
                  className="p-1 text-gray-400 hover:text-red-500 transition-colors"
                >
                  <FiTrash2 className="w-3 h-3" />
                </button>
              )}
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2">
            <div>
              <label className="text-[10px] text-gray-400 mb-0.5 block">Indicator</label>
              <select
                className="w-full px-2 py-1 text-xs rounded bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 focus:ring-1 focus:ring-blue-500 outline-none"
                value={node.metric}
                onChange={handleIndicatorChange}
              >
                {metricsList.map((i: any) => (
                  <option key={i.id} value={i.id}>
                    {i.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-[10px] text-gray-400 mb-0.5 block">Operator</label>
              <select
                className="w-full px-2 py-1 text-xs rounded bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 focus:ring-1 focus:ring-blue-500 outline-none"
                value={node.operator}
                onChange={(e) => handleFieldChange("operator", e.target.value)}
              >
                {COMPARISON_OPERATORS.map((op) => (
                  <option key={op.value} value={op.value}>
                    {op.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-[10px] text-gray-400 mb-0.5 block">Threshold</label>
              <input
                type="number"
                className="w-full px-2 py-1 text-xs rounded bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 focus:ring-1 focus:ring-blue-500 outline-none"
                value={node.value}
                onChange={(e) => handleFieldChange("value", parseFloat(e.target.value))}
              />
            </div>
          </div>

          {isIndicatorMetric(node.metric as string, metricsList) && (
            <div className="pt-1 border-t border-dashed border-gray-100 dark:border-gray-700">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] text-gray-400 mb-0.5 block">Timeframe</label>
                  <select
                    className="w-full px-2 py-1 text-xs rounded bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 focus:ring-1 focus:ring-blue-500 outline-none"
                    value={node.timeframe || "1m"}
                    onChange={(e) => handleFieldChange("timeframe", e.target.value)}
                  >
                    {TIMEFRAMES.map((op) => (
                      <option key={op.value} value={op.value}>
                        {op.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-[10px] text-gray-400 mb-0.5 block">Period</label>
                  <input
                    type="number"
                    className="w-full px-2 py-1 text-xs rounded bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 focus:ring-1 focus:ring-blue-500 outline-none"
                    value={node.period || 14}
                    onChange={(e) => handleFieldChange("period", parseFloat(e.target.value))}
                  />
                </div>
              </div>
            </div>
          )}
        </div>
      );
    }

    // Group Node
    if (isGroupNode(node)) {
      return (
        <div
          className={`rounded-lg p-3 border-l-4 ${node.operator === "AND"
              ? "border-l-blue-400 bg-blue-50/50 dark:bg-blue-900/10"
              : "border-l-orange-400 bg-orange-50/50 dark:bg-orange-900/10"
            } border-y border-r border-gray-200 dark:border-gray-700 ${depth > 0 ? "mt-2" : ""}`}
        >
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-gray-700 dark:text-gray-300 uppercase">
                Logic Group
              </span>
              <select
                className={`px-2 py-0.5 text-xs font-bold rounded border ${node.operator === "AND"
                    ? "text-blue-600 border-blue-200 bg-blue-100"
                    : "text-orange-600 border-orange-200 bg-orange-100"
                  } focus:outline-none cursor-pointer`}
                value={node.operator}
                onChange={handleGroupOperatorChange}
              >
                <option value="AND">AND (All Match)</option>
                <option value="OR">OR (Any Match)</option>
              </select>
            </div>
            {onDelete && (
              <button
                onClick={onDelete}
                className="text-gray-400 hover:text-red-500 transition-colors"
              >
                <FiTrash2 className="w-3 h-3" />
              </button>
            )}
          </div>

          <div className="space-y-3 pl-2">
            {node.logic.map((logic, idx) => (
              <LogicNode
                key={idx}
                node={logic}
                onChange={(c) => updateChild(idx, c)}
                onDelete={() => removeChild(idx)}
                depth={depth + 1}
                indexLabel={`${indexLabel}.${idx + 1}`}
                onRenderIndicator={onRenderIndicator}
                metricsList={metricsList}
              />
            ))}

            <div className="flex gap-2 pt-2 border-t border-gray-200 dark:border-gray-700/50">
              <button
                onClick={() => addChild(getDefaultCondition(metricsList))}
                className="flex-1 py-1.5 text-[10px] border border-dashed border-gray-300 text-gray-600 dark:text-gray-400 rounded hover:bg-white dark:hover:bg-gray-800 hover:border-blue-400 transition-all flex justify-center items-center gap-1"
              >
                <FiPlus /> Condition
              </button>
              <button
                onClick={() => addChild(getDefaultGroup(metricsList))}
                className="flex-1 py-1.5 text-[10px] border border-dashed border-blue-300 text-blue-600 rounded hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-all flex justify-center items-center gap-1"
              >
                <FiLayers /> Group
              </button>
            </div>
          </div>
        </div>
      );
    }
    return null;
  }
);

// ─── WeightedLogic UI (updated to use buyThreshold) ──────────────────────

interface WeightedLogicProps {
  weights: TechnicalWeightsType;
  onChange: (weights: TechnicalWeightsType) => void;
  metricsList: any[];
}

const WeightedLogic = ({ weights, onChange, metricsList }: WeightedLogicProps) => {
  const handleTargetWeightChange = (value: number) => {
    onChange({ ...weights, targetWeight: value });
  };

  const handleWeightChange = (idx: number, field: keyof WeightConditionType, value: any) => {
    const newWeights = [...weights.weights];
    newWeights[idx] = { ...newWeights[idx], [field]: value };
    onChange({ ...weights, weights: newWeights });
  };

  const handleWeightIndicatorChange = (idx: number, metricId: string) => {
    const sel = metricsList.find((i: any) => i.id === metricId);
    const current = weights.weights[idx];
    const updated: WeightConditionType = {
      ...current,
      metric: metricId,
      timeframe: current.timeframe || "1m",
    };
    if (sel?.defaultPeriod !== undefined) updated.period = sel.defaultPeriod;
    if (sel?.buyThreshold !== undefined && sel?.buyThreshold !== null) {
      updated.value = String(sel.buyThreshold);
    }
    const newWeights = [...weights.weights];
    newWeights[idx] = updated;
    onChange({ ...weights, weights: newWeights });
  };

  const addWeightCondition = () => {
    const defaultMetric = metricsList[0] || { id: "rsi", buyThreshold: 30 };
    onChange({
      ...weights,
      weights: [
        ...weights.weights,
        {
          metric: defaultMetric.id,
          timeframe: "1m",
          operator: "GREATER_THAN",
          value: String(defaultMetric.buyThreshold ?? 30),
          weight: 10,
        },
      ],
    });
  };

  const removeWeightCondition = (idx: number) => {
    const newWeights = weights.weights.filter((_, i) => i !== idx);
    onChange({ ...weights, weights: newWeights });
  };

  return (
    <div className="space-y-4">
      {/* Target Weight */}
      <div className="bg-white dark:bg-gray-800 rounded-xl p-3 border border-gray-200 dark:border-gray-700">
        <label className="text-[10px] text-gray-400 mb-1.5 block font-bold uppercase tracking-wider">
          Target Weight to Trigger Order
        </label>
        <input
          type="number"
          className="w-full px-3 py-2 text-sm rounded bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 focus:ring-1 focus:ring-blue-500 outline-none text-black dark:text-white font-bold"
          value={weights.targetWeight}
          onChange={(e) => handleTargetWeightChange(parseInt(e.target.value) || 0)}
        />
      </div>

      {/* Weight Conditions */}
      <div className="space-y-3">
        {weights.weights.map((w, idx) => (
          <div
            key={idx}
            className="bg-white dark:bg-gray-800 rounded-xl p-3 border border-gray-200 dark:border-gray-700 shadow-sm relative group"
          >
            <div className="flex justify-between items-center mb-3">
              <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">
                Weight Condition {idx + 1}
              </span>
              <button
                onClick={() => removeWeightCondition(idx)}
                className="p-1 text-gray-400 hover:text-red-500 transition-colors"
              >
                <FiTrash2 className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="mb-2">
              <label className="text-[10px] text-gray-400 mb-0.5 block">Indicator</label>
              <select
                className="w-full px-2 py-1.5 text-xs rounded bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 focus:ring-1 focus:ring-blue-500 outline-none"
                value={w.metric}
                onChange={(e) => handleWeightIndicatorChange(idx, e.target.value)}
              >
                {metricsList.map((i: any) => (
                  <option key={i.id} value={i.id}>
                    {i.name}
                  </option>
                ))}
              </select>
            </div>

            {isIndicatorMetric(w.metric, metricsList) && (
              <div className="grid grid-cols-2 gap-3 mb-2 pt-2 border-t border-dashed border-gray-100 dark:border-gray-700">
                <div>
                  <label className="text-[10px] text-gray-400 mb-0.5 block">Timeframe</label>
                  <select
                    className="w-full px-2 py-1.5 text-xs rounded bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 focus:ring-1 focus:ring-blue-500 outline-none"
                    value={w.timeframe || "1m"}
                    onChange={(e) => handleWeightChange(idx, "timeframe", e.target.value)}
                  >
                    {TIMEFRAMES.map((tf) => (
                      <option key={tf.value} value={tf.value}>
                        {tf.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-[10px] text-gray-400 mb-0.5 block">Period</label>
                  <input
                    type="number"
                    className="w-full px-2 py-1.5 text-xs rounded bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 focus:ring-1 focus:ring-blue-500 outline-none"
                    value={w.period || 14}
                    onChange={(e) => handleWeightChange(idx, "period", parseFloat(e.target.value) || 14)}
                  />
                </div>
              </div>
            )}

            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="text-[10px] text-gray-400 mb-0.5 block">Operator</label>
                <select
                  className="w-full px-2 py-1.5 text-xs rounded bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 focus:ring-1 focus:ring-blue-500 outline-none"
                  value={w.operator}
                  onChange={(e) => handleWeightChange(idx, "operator", e.target.value)}
                >
                  {COMPARISON_OPERATORS.map((op) => (
                    <option key={op.value} value={op.value}>
                      {op.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-[10px] text-gray-400 mb-0.5 block">Threshold</label>
                <input
                  type="text"
                  className="w-full px-2 py-1.5 text-xs rounded bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 focus:ring-1 focus:ring-blue-500 outline-none"
                  value={w.value || "0"}
                  onChange={(e) => handleWeightChange(idx, "value", e.target.value)}
                />
              </div>
              <div>
                <label className="text-[10px] text-gray-400 mb-0.5 block">Weight</label>
                <input
                  type="number"
                  className="w-full px-2 py-1.5 text-xs rounded bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 focus:ring-1 focus:ring-blue-500 outline-none"
                  value={w.weight}
                  onChange={(e) => handleWeightChange(idx, "weight", parseInt(e.target.value) || 0)}
                />
              </div>
            </div>
          </div>
        ))}
        <button
          onClick={addWeightCondition}
          className="w-full py-2.5 text-xs font-bold uppercase tracking-wider border border-dashed border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-400 rounded-xl hover:bg-white dark:hover:bg-gray-800 hover:border-blue-400 transition-all flex justify-center items-center gap-1.5"
        >
          <FiPlus /> Add Weight Condition
        </button>
      </div>
    </div>
  );
};

// ─── Main Component ──────────────────────────────────────────────────────

interface TechnicalEntryProps {
  technicalEntries: TechnicalLogicType | TechnicalWeightsType | null;
  setTechnicalEntries: (logic: TechnicalLogicType | TechnicalWeightsType | null) => void;
  title?: string;
  isPerp?: boolean;
  isAdvancedSymbol?: boolean;
}

const TechnicalEntry: React.FC<TechnicalEntryProps> = ({
  technicalEntries,
  setTechnicalEntries,
  title = "Technical Entry Conditions",
  isPerp = false,
  isAdvancedSymbol = false,
}) => {
  const { setIndicatorOnChart } = useChartDataStore(
    useShallow((state: any) => ({
      setIndicatorOnChart: state.setIndicatorOnChart,
    }))
  );

  const handleRenderIndicator = useCallback(
    (indicatorName: string, period: number, resolution: string) => {
      setIndicatorOnChart({
        indicatorName,
        period,
        resolution,
      });
    },
    [setIndicatorOnChart]
  );

  // ── Build the combined metrics list with buyThreshold from frontend ────
  const metricsList = useMemo(() => {
    const list: any[] = [...INDICATORS_KEY];
    if (isPerp && isAdvancedSymbol) {
      list.push(
        ...PERP_ORDERFLOW_METRICS.map((m) => ({
          id: m.id,
          name: m.name,
          indicatorName: m.name,
          type: "orderFlow",
          defaultPeriod: undefined,
          buyThreshold: m.buyThreshold, // ensure buyThreshold is passed
        }))
      );
    } else if (!isPerp) {
      // spot (or any non‑perp context)
      list.push(
        ...SPOT_ORDERFLOW_METRICS.map((m) => ({
          id: m.id,
          name: m.name,
          indicatorName: m.name,
          type: "orderFlow",
          defaultPeriod: undefined,
          buyThreshold: m.buyThreshold,
        }))
      );
    }
    return list;
  }, [isPerp, isAdvancedSymbol]);

  // ── Defaults that depend on metricsList ──────────────────────────────
  const defaultCondition = useMemo(() => getDefaultCondition(metricsList), [metricsList]);
  const defaultGroup = useMemo(() => getDefaultGroup(metricsList), [metricsList]);
  const defaultWeights = useMemo(() => getDefaultWeights(metricsList), [metricsList]);

  const isWeighted = technicalEntries && isWeightedEntry(technicalEntries);

  return (
    <div className="space-y-3 bg-gray-50/50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-2xl p-4 shadow-sm">
      <div className="flex justify-between items-center pb-2 border-b border-gray-200 dark:border-white/10">
        <h3 className="text-sm font-black text-gray-900 dark:text-white uppercase tracking-wider">
          {title}
        </h3>
        {technicalEntries && (
          <button
            onClick={() => setTechnicalEntries(null)}
            className="text-xs text-red-500 hover:text-red-600 font-bold uppercase tracking-wider"
          >
            Clear All
          </button>
        )}
      </div>

      {!technicalEntries ? (
        <div className="grid grid-cols-3 gap-3 mt-2">
          <button
            onClick={() => setTechnicalEntries(defaultCondition)}
            className="p-4 border border-dashed border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 hover:border-blue-400 transition-all group flex flex-col items-center gap-2"
          >
            <FiActivity className="w-5 h-5 text-gray-400 group-hover:text-blue-500" />
            <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500 group-hover:text-gray-700 dark:group-hover:text-gray-300">
              Single Condition
            </span>
          </button>
          <button
            onClick={() => setTechnicalEntries(defaultGroup)}
            className="p-4 border border-dashed border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 hover:border-blue-400 transition-all group flex flex-col items-center gap-2"
          >
            <FiLayers className="w-5 h-5 text-gray-400 group-hover:text-blue-500" />
            <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500 group-hover:text-gray-700 dark:group-hover:text-gray-300">
              Group Logic
            </span>
          </button>
          <button
            onClick={() => setTechnicalEntries(defaultWeights)}
            className="p-4 border border-dashed border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 hover:border-blue-400 transition-all group flex flex-col items-center gap-2"
          >
            <TbChartDonut className="w-5 h-5 text-gray-400 group-hover:text-blue-500" />
            <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500 group-hover:text-gray-700 dark:group-hover:text-gray-300">
              Weighted Logic
            </span>
          </button>
        </div>
      ) : isWeighted ? (
        <WeightedLogic
          weights={technicalEntries}
          onChange={setTechnicalEntries}
          metricsList={metricsList}
        />
      ) : (
        <LogicNode
          node={technicalEntries}
          onChange={setTechnicalEntries}
          onRenderIndicator={handleRenderIndicator}
          metricsList={metricsList}
        />
      )}
    </div>
  );
};

export default TechnicalEntry;