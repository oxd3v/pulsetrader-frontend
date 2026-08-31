import { memo, useCallback, useEffect, useMemo, useState } from "react";
import { TbSettingsExclamation } from "react-icons/tb";
import {
  FiClock,
  FiCheckCircle,
  FiCopy,
  FiX,
  FiActivity,
  FiDollarSign,
  FiCreditCard,
} from "react-icons/fi";
import { IoIosArrowDropdown, IoIosArrowDropright } from "react-icons/io";
import { motion } from "framer-motion";
import { formatUnits } from "ethers";
import toast from "react-hot-toast";

import ToolTip from "@/components/tradeBox/TradeBoxCommon/BoxTooltip";
import OrderAction from "@/components/order/dashboard/OrderAction";
import LogicSummary from "@/components/order/common/LogicDisplay";
import WeightDisplay from "@/components/order/common/WeightDisplay";
import PriceEntry from "@/components/order/common/entryPriceDisplay";
import type { OrderType } from "@/type/order";
import type { MarketSnapshotRef } from "@/type/market";
import {
  formatCustomizeTime,
  formateAmountWithFixedDecimals,
  safeFormatNumber,
  safeParseUnits,
} from "@/utility/handy";
import { displayNumber } from "@/utility/displayPrice";
import { PRECISION, PRECISION_DECIMALS } from "@/constants/common/utils";
import { calculatePerpPnl } from "@/utility/orderUtility";
import { cn } from "@/lib/utils";

// ─── Status Icons ──────────────────────────────────────────────────
const STATUS_ICONS = {
  PENDING: <FiClock className="w-4 h-4 text-yellow-500" />,
  PROCESSING: <TbSettingsExclamation className="w-4 h-4 text-yellow-500" />,
  OPENED: <FiActivity className="w-4 h-4 text-blue-500 dark:text-white" />,
  CLOSED: <FiCheckCircle className="w-4 h-4 text-green-500" />,
  CANCELLED: <FiX className="w-4 h-4 text-red-500" />,
  REVERTED: <FiX className="w-4 h-4 text-red-500" />,
  FAILED: <FiX className="w-4 h-4 text-red-500" />,
} as const;

// ─── Order Mode Badge ──────────────────────────────────────────────
const getOrderModeBadge = (mode?: string) => {
  const modeMap: Record<string, { label: string; className: string }> = {
    Live: {
      label: "Live",
      className: "bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300",
    },
    Demo: {
      label: "Demo",
      className: "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300",
    },
    Testnet: {
      label: "Testnet",
      className: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-300",
    },
  };
  const entry = modeMap[mode || "Live"] || modeMap.Live;
  return (
    <span className={`px-1.5 py-0.5 text-[10px] font-medium rounded-full ${entry.className}`}>
      {entry.label}
    </span>
  );
};

// ─── Props ──────────────────────────────────────────────────────────
interface OrderCardProps {
  order: OrderType;
  marketSnapshotRef?: MarketSnapshotRef;
}

// ─── Component ─────────────────────────────────────────────────────
const OrderCard = ({ order, marketSnapshotRef }: OrderCardProps) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [livePriceUsd, setLivePriceUsd] = useState(
    () => marketSnapshotRef?.current?.priceUsd || "0"
  );
  const [liveMarkPrice, setLiveMarkPrice] = useState(
    () => marketSnapshotRef?.current?.markPrice || 0
  );

  const syncLiveMarketState = useCallback(() => {
    const nextPriceUsd = marketSnapshotRef?.current?.priceUsd || "0";
    const nextMarkPrice = marketSnapshotRef?.current?.markPrice || 0;

    setLivePriceUsd((previous) =>
      previous === nextPriceUsd ? previous : nextPriceUsd
    );
    setLiveMarkPrice((previous) =>
      previous === nextMarkPrice ? previous : nextMarkPrice
    );
  }, [marketSnapshotRef]);

  useEffect(() => {
    syncLiveMarketState();
  }, [syncLiveMarketState, order._id]);

  useEffect(() => {
    if (!marketSnapshotRef) return undefined;

    syncLiveMarketState();
    const intervalId = window.setInterval(syncLiveMarketState, 1000);

    return () => window.clearInterval(intervalId);
  }, [marketSnapshotRef, syncLiveMarketState]);

  const copyWalletAddress = useCallback(() => {
    if (!order?.wallet?.address) return;
    navigator.clipboard.writeText(order.wallet.address);
    toast.success("Wallet address copied");
  }, [order?.wallet?.address]);

  const copyOrderId = useCallback(() => {
    if (!order?._id) return;
    navigator.clipboard.writeText(order._id);
    toast.success("Order ID copied");
  }, [order?._id]);

  const formatUSD = useCallback((value: string | bigint) => {
    if (!value) return "$0.00";
    const num = Number(
      safeFormatNumber(value.toString(), PRECISION_DECIMALS, 8)
    );

    return <div className="flex gap-1">${displayNumber(num)}</div>;
  }, []);

  if (!order) return null;

  const isSpot = order.category === "spot";
  const isPerp = order.category === "perpetual";

  // ─── Asset & Amount ──────────────────────────────────────────────────
  const asset = order.orderAsset.orderToken;
  const collateralToken = order.orderAsset.collateralToken;
  const amountToken = isSpot
    ? order.orderAsset.orderToken
    : order.orderAsset.orderToken;

  const amountDisplay = useMemo(() => {
    if (isSpot && order.spot) {
      const { amount } = order.spot;
      const decimals = order.orderAsset.orderToken.decimals;
      if (order.orderType === "BUY") {
        const size = BigInt(amount.orderSize || "0");
        return displayNumber(Number(formatUnits(size, decimals)));
      } else {
        const tokenAmt = BigInt(amount.tokenAmount || "0");
        return displayNumber(Number(formatUnits(tokenAmt, decimals)));
      }
    }
    if (isPerp && order.perp) {
      const qty = order.perp.amount.quantity;
      return qty;
    }
    return "0";
  }, [isSpot, isPerp, order.orderType, order.spot, order.perp, order.orderAsset]);

  const formattedSize = useMemo(() => {
    if (!order.spot && !order.perp) return "0";
    const amount = isSpot
      ? order.spot?.amount?.orderSize
      : order.perp?.amount?.orderSize;
    const decimals = collateralToken?.decimals || 18;
    return displayNumber(
      Number(formatUnits(BigInt(amount || "0"), decimals))
    );
  }, [collateralToken?.decimals, isSpot, order.perp?.amount?.orderSize, order.spot?.amount?.orderSize]);

  // ─── Costs ──────────────────────────────────────────────────────────
  const totalCost = useMemo(() => {
    const txFee = BigInt(order.cost?.txFeeInUsd || "0");
    const pay = BigInt(order.cost?.payInUsd || "0");
    const protocolFee = BigInt(order.cost?.protocolFeeInUsd || "0");
    return txFee + pay + protocolFee;
  }, [order.cost]);

  const totalFee = useMemo(() => {
    const txFee = BigInt(order.cost?.txFeeInUsd || "0");
    const protocolFee = BigInt(order.cost?.protocolFeeInUsd || "0");
    return txFee + protocolFee;
  }, [order.cost]);

  // ─── Entry & Exit Prices ────────────────────────────────────────────
  const entryPrice = useMemo(() => {
    if (order.executionDetails?.entryPriceUsd) {
      return order.executionDetails.entryPriceUsd;
    }
    if (order.entry?.priceEntry?.targetPriceUsd) {
      return order.entry.priceEntry.targetPriceUsd;
    }
    return "0";
  }, [order.executionDetails?.entryPriceUsd, order.entry?.priceEntry?.targetPriceUsd]);

  const exitPrice = order.executionDetails?.exitPriceUsd || "0";
  const realizedPnl = order.executionDetails?.realizedPnlUsd || "0";

  // ─── PnL ────────────────────────────────────────────────────────────
  const pnl = useMemo(() => {
    if (isSpot) {
      if (order.orderType !== "SELL") return BigInt(0);
      const tokenAmount = BigInt(order.spot?.amount?.tokenAmount || 0);
      if (tokenAmount === BigInt(0)) return BigInt(0);
      const currentPriceUsd = safeParseUnits(livePriceUsd || "0", PRECISION_DECIMALS);
      if (currentPriceUsd === BigInt(0)) return BigInt(0);
      const soldValue = (currentPriceUsd * tokenAmount) / PRECISION;
      const payInUsd = BigInt(order.cost?.payInUsd || 0);
      const doubleFees = totalFee * BigInt(2);
      return soldValue - payInUsd - doubleFees;
    }

    if (order.orderStatus !== "OPENED") return BigInt(0);

    const markPriceUsd = safeParseUnits(
      liveMarkPrice > 0 ? String(liveMarkPrice) : livePriceUsd || "0",
      PRECISION_DECIMALS
    );
    const normalizedEntryPrice = BigInt(entryPrice || "0");
    if (markPriceUsd === BigInt(0) || normalizedEntryPrice === BigInt(0)) {
      return BigInt(0);
    }

    const rawPnl = calculatePerpPnl({
      entryPrice: normalizedEntryPrice,
      markPrice: markPriceUsd,
      quantity: order.perp?.amount?.quantity || "0",
      isLong: order.perp?.isLong !== false,
    });

    const estimatedRoundTripFees = totalFee * BigInt(2);
    const netPnl = rawPnl - estimatedRoundTripFees;
    return netPnl;
  }, [
    entryPrice,
    isSpot,
    liveMarkPrice,
    livePriceUsd,
    order.orderStatus,
    order.orderType,
    order.perp?.isLong,
    order.perp?.amount?.quantity,
    order.spot?.amount?.tokenAmount,
    totalFee,
  ]);



  const shouldShowPnl = useMemo(() => {
    if (isSpot) {
      return order.orderType === "SELL" && pnl !== BigInt(0);
    }
    return order.orderStatus === "OPENED" && pnl !== BigInt(0);
  }, [isSpot, order.orderStatus, order.orderType, pnl]);


  // ─── Entry Display ─────────────────────────────────────────────────
  const isTechEntry =
    order.entry?.entryCriteria === "logic" || order.entry?.entryCriteria === "weight";

  // ─── Exit Display ──────────────────────────────────────────────────
  const tp = order.exit?.takeProfit;
  const sl = order.exit?.stopLoss;
  const hasPriceTP = tp && tp.takeProfitPrice !== "0";
  const hasPriceSL = sl && sl.isActive && sl.stopLossPrice !== "0";

  // ─── Execution Logs ──────────────────────────────────────────────
  const executionLogs = order.executionDetails?.logs || [];
  const sortedLogs = [...executionLogs].sort((a, b) => b.at - a.at);

  // ─── Card Styling based on order mode ─────────────────────────────
  const cardClasses = cn(
    "rounded-lg shadow-sm hover:shadow-md transition-shadow border border-gray-200 dark:border-gray-800",
    order.orderMode === "Live" &&
    "bg-white dark:bg-gray-950 hover:shadow-gray-200/50 dark:hover:shadow-gray-800/50",
    order.orderMode === "Demo" &&
    "bg-red-50/70 dark:bg-red-950/20 border-l-4 border-l-red-500 hover:shadow-red-200/30 dark:hover:shadow-red-900/30",
    order.orderMode === "Testnet" &&
    "bg-yellow-50/70 dark:bg-yellow-950/20 border-l-4 border-l-yellow-500 hover:shadow-yellow-200/30 dark:hover:shadow-yellow-900/30"
  );

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={cardClasses}
    >
      <div className="px-4 py-2 lg:p-4">
        <div className="flex items-center justify-between">
          <div
            className="grow flex flex-col justify-start items-start cursor-pointer"
            onClick={() => setIsExpanded(!isExpanded)}
          >
            <div className="flex items-center gap-1 flex-wrap">
              {STATUS_ICONS[order.orderStatus] || STATUS_ICONS.PENDING}
              <div
                className={`flex gap-1 items-center font-semibold ${order.category === "perpetual"
                  ? "text-blue-500"
                  : order.category === "spot"
                    ? "text-yellow-500"
                    : "text-gray-800 dark:text-gray-200"
                  }`}
              >
                {order.category === "perpetual" && (
                  <span
                    className={`text-xs font-bold ${order.perp?.isLong === false
                      ? "text-red-600 dark:text-red-400"
                      : "text-green-600 dark:text-green-400"
                      }`}
                  >
                    {order.perp?.isLong ? "LONG" : "SHORT"}
                  </span>
                )}
                <span>
                  {asset?.symbol || "UNK"} |
                </span>
                <span>{order._id?.slice(-6)}</span>
                <button
                  onClick={copyOrderId}
                  className="text-blue-500 hover:text-blue-600"
                  title="Copy Order ID"
                >
                  <FiCopy className="text-xs" />
                </button>
                {/* Mode Badge */}
                {getOrderModeBadge(order.orderMode)}
              </div>
              {isExpanded ? <IoIosArrowDropright /> : <IoIosArrowDropdown />}
            </div>
          </div>
          <OrderAction order={order} />
        </div>

        {isExpanded && (
          <>
            <div className="grid grid-cols-2 lg:grid-cols-4 items-center gap-4 mb-3">
              <div>
                <span className="text-xs text-gray-500">Entry Criteria  </span>
                {isTechEntry ? (
                  order.entry?.entryCriteria === "logic" && order.entry?.technicalLogic ? (
                    <div className="overflow-x-auto pb-1 scrollbar-thin">
                      <LogicSummary node={order.entry.technicalLogic} />
                    </div>
                  ) : order.entry?.entryCriteria === "weight" && order.entry?.technicalWeights ? (
                    <WeightDisplay weights={order.entry.technicalWeights} />
                  ) : null
                ) : order.entry?.priceEntry ? (
                  <PriceEntry priceEntry={order.entry.priceEntry!} />
                ) : (
                  "_"
                )}
              </div>

              <div>
                <span className="text-xs text-gray-500">Order Size</span>
                <div className="text-sm font-medium flex items-center gap-1">
                  {formattedSize}
                  <p>{collateralToken?.symbol || "UNK"}</p>
                </div>
              </div>

              <div>
                <span className="text-xs text-gray-500">Exit Criteria</span>
                <div className="text-sm font-medium">
                  <div className="flex flex-col gap-1">
                    {hasPriceTP ? (
                      <div className="flex items-center gap-1 text-xs">
                        <span className="text-green-600 dark:text-green-400 font-medium">TP </span>
                        <PriceEntry priceEntry={{ operator: tp.operator, targetPriceUsd: tp.takeProfitPrice }} />
                        {tp.takeProfitPctBps > 0 && (
                          <span className="text-[10px] text-gray-400">({tp.takeProfitPctBps / 100}%)</span>
                        )}
                      </div>
                    ) : (
                      <div className="text-xs text-green-600 dark:text-green-400">
                        TP: {tp?.takeProfitPctBps ? `${tp.takeProfitPctBps / 100}%` : "—"}
                      </div>
                    )}
                    {sl?.isActive && (
                      hasPriceSL ? (
                        <div className="flex items-center gap-1 text-xs">
                          <span className="text-red-600 dark:text-red-400 font-medium">SL  </span>
                          <PriceEntry priceEntry={{ operator: sl.operator, targetPriceUsd: sl.stopLossPrice }} />
                          {sl.stopLossPctBps > 0 && (
                            <span className="text-[10px] text-gray-400">({sl.stopLossPctBps / 100}%)</span>
                          )}
                        </div>
                      ) : (
                        <div className="text-xs text-red-600 dark:text-red-400">
                          SL: {sl.stopLossPctBps ? `${sl.stopLossPctBps / 100}%` : "—"}
                        </div>
                      )
                    )}
                    {order.exit?.isTrailingMode && (
                      <span className="text-[9px] font-bold text-blue-500 uppercase">Trailing</span>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 text-xs text-gray-500">
                <span title={order.wallet?.address}>
                  {order.wallet?.address?.slice(0, 6)}...
                  {order.wallet?.address?.slice(-4)}
                </span>
                <button
                  onClick={copyWalletAddress}
                  className="text-blue-500 hover:text-blue-600"
                  title="Copy wallet address"
                >
                  <FiCopy className="w-4 h-4" />
                </button>
              </div>

              <div className="text-xs text-gray-500 font-mono">
                {formatCustomizeTime(order.createdAt)}
              </div>
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mt-4 pt-4 border-t border-gray-200 dark:border-gray-800">
              <div>
                <span className="text-xs text-gray-500 flex items-center gap-1">
                  <FiDollarSign className="w-3 h-3" /> Amount
                </span>
                <div className="text-sm font-medium flex items-center gap-1">
                  {amountDisplay} {amountToken?.symbol || "UNK"}
                </div>
              </div>

              <div>
                <span className="text-xs text-gray-500 flex items-center gap-1">
                  <FiCreditCard className="w-3 h-3" /> Total Cost
                </span>
                <div className="text-sm font-mono font-medium">
                  {formatUSD(totalCost)}
                </div>
              </div>

              {entryPrice && entryPrice !== "0" && (
                <div>
                  <span className="text-xs text-gray-500">Entry at</span>
                  <div className="text-sm font-medium flex items-center gap-1">
                    {formatUSD(entryPrice)}
                  </div>
                </div>
              )}

              {shouldShowPnl && (
                <div>
                  <span className="text-xs text-gray-500">
                    {isSpot ? "Est. P&L" : "Est. Net Unrealized P&L"}
                    <ToolTip
                      id="est-pnl-tooltip"
                      content={
                        isSpot
                          ? "Est. P&L"
                          : "Estimated unrealized pnl excluding buffer fee(open & close). Fee calculate not including dex funding rate on close dex will apply some extra fee on top"
                      }
                    />
                  </span>
                  <div
                    className={`text-sm font-medium flex items-center gap-1 ${pnl > BigInt(0)
                      ? "text-green-500"
                      : pnl < BigInt(0)
                        ? "text-red-500"
                        : ""
                      }`}
                  >
                    {formatUSD(pnl.toString())}
                  </div>
                </div>
              )}

              {exitPrice && exitPrice !== "0" && (
                <div>
                  <span className="text-xs text-gray-500">Exit at</span>
                  <div className="text-sm font-medium flex items-center gap-1">
                    {formatUSD(exitPrice)}
                  </div>
                </div>
              )}

              {realizedPnl && realizedPnl !== "0" && (
                <div>
                  <span className="text-xs text-gray-500">Realized P&L</span>
                  <div className="text-sm font-medium flex items-center gap-1">
                    {formatUSD(realizedPnl)}
                  </div>
                </div>
              )}

              {order.category === "perpetual" && order.perp?.leverage && (
                <div>
                  <span className="text-xs text-gray-500 flex items-center gap-1">
                    Leverage & DEX
                  </span>
                  {order.executionDetails?.liquidationPriceUsd && (
                    <div className="flex items-center gap-1 text-xs">
                      <span className="text-red-600 dark:text-red-400 font-mono">Liq Price: </span>
                      {formatUSD(order.executionDetails.liquidationPriceUsd)}
                    </div>
                  )}
                  <div className="text-sm font-medium flex items-center gap-1.5 uppercase">
                    <span
                      className={`text-[15px] font-bold ${order.perp.leverage > 100000
                        ? "text-orange-500"
                        : "text-blue-500"
                        }`}
                    >
                      {order.perp.leverage}x
                    </span>
                    <span className="text-[10px] bg-gray-100 dark:bg-gray-800 px-1.5 rounded text-gray-500">
                      <img
                        src={
                          order.perp.protocol === "asterdex"
                            ? "https://static.asterindex.com/cloud-futures/static/images/aster/logo.svg"
                            : order.perp.protocol === "hyperliquid"
                              ? "https://avatars.githubusercontent.com/u/129421375?s=200&v=4"
                              : "./gmx.svg"
                        }
                        alt="DEX"
                        className="w-4 h-4"
                      />
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* ─── Execution Logs Section ───────────────────────────────── */}
            {executionLogs.length > 0 && (
              <div className="mt-4 pt-3 border-t border-gray-200 dark:border-gray-800">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
                    Execution Logs ({executionLogs.length})
                  </span>
                </div>
                <div className="max-h-36 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-700 pr-1">
                  {sortedLogs.map((log, idx) => (
                    <div
                      key={idx}
                      className="text-xs border-b border-gray-100 dark:border-gray-800 last:border-0 py-1.5 flex  items-center justify-between"
                    >
                      <div className="flex items-center gap-1">
                        <span className="text-gray-400 font-mono min-w-[60px]">
                          [{formatCustomizeTime(log.at)}]
                        </span>
                        <span className="text-gray-700 dark:text-gray-300 flex-1">
                          {log.message || '—'}....
                        </span>
                      </div>

                      <div className="flex flex-wrap items-center gap-1">
                        {log.priceUsd && log.priceUsd !== '0' && (
                          <span className="text-gray-500 font-mono flex gap-1">
                            Px: ${displayNumber(Number(safeFormatNumber(log.priceUsd, PRECISION_DECIMALS, 6)))}
                          </span>
                        )}
                        {log.pnlUsd && log.pnlUsd !== '0' && (
                          <span
                            className={`font-mono flex gap-1 ${BigInt(log.pnlUsd) > 0
                              ? 'text-green-600 dark:text-green-400'
                              : BigInt(log.pnlUsd) < 0
                                ? 'text-red-600 dark:text-red-400'
                                : 'text-gray-500'
                              }`}
                          > P&L:
                            {BigInt(log.pnlUsd) > 0 ? '+' : ''}
                            {displayNumber(Number(safeFormatNumber(log.pnlUsd, PRECISION_DECIMALS, 6)))} $
                          </span>
                        )}
                        {log.weightScore !== undefined && log.weightScore !== null && (
                          <span className="text-blue-500 dark:text-blue-400 font-mono bg-blue-50 dark:bg-blue-950/40 px-1.5 py-0.5 rounded">
                            WS: {log.weightScore}
                          </span>
                        )}
                      </div>

                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </motion.div>
  );
};

const areEqualOrderCardProps = (
  previous: OrderCardProps,
  next: OrderCardProps
) => {
  return (
    previous.order === next.order &&
    previous.marketSnapshotRef === next.marketSnapshotRef
  );
};

export default memo(OrderCard, areEqualOrderCardProps);