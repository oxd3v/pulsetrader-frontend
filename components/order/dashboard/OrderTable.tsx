import { OrderType, OrderStatusType } from "@/type/order";
import { formatUnits } from "ethers";
import {
  FiClock,
  FiCheckCircle,
  FiX,
  FiActivity,
  FiCopy,
} from "react-icons/fi";
import LogicSummary from "../common/LogicDisplay";
import WeightDisplay from "../common/WeightDisplay";
import PriceDisplay from "../common/entryPriceDisplay";
import { displayNumber } from "@/utility/displayPrice";
import { handleCopy } from "@/lib/utils";
import OrderActions from "./OrderAction";
import {
  formateAmountWithFixedDecimals,
  safeFormatNumber,
} from "@/utility/handy";
import { PRECISION_DECIMALS } from "@/constants/common/utils";
import { useMemo, memo } from "react";
import { cn } from "@/lib/utils"; // Ensure this utility exists or use a simple classNames helper

// ─── Helpers ──────────────────────────────────────────────────────────
const formatUSD = (value: string | bigint) => {
  if (!value) return "$0.00";
  const num = Number(safeFormatNumber(value.toString(), PRECISION_DECIMALS, 8));
  return <div className="flex gap-1">${displayNumber(num)}</div>;
};

const STATUS_ICONS: Record<OrderStatusType, React.ReactNode> = {
  PENDING: <FiClock className="w-4 h-4 text-yellow-500" />,
  PROCESSING: <FiActivity className="w-4 h-4 text-blue-500" />,
  OPENED: <FiActivity className="w-4 h-4 text-blue-500" />,
  CLOSED: <FiCheckCircle className="w-4 h-4 text-green-500" />,
  CANCELLED: <FiX className="w-4 h-4 text-red-500" />,
  REVERTED: <FiX className="w-4 h-4 text-red-500" />,
  FAILED: <FiX className="w-4 h-4 text-red-500" />,
};

// ─── Order Mode Badge ──────────────────────────────────────────────
const getOrderModeBadge = (mode?: string) => {
  const modeMap: Record<string, { label: string; className: string }> = {
    Live: {
      label: "Live",
      className: "bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300",
    },
    Demo: {
      label: "Demo",
      className: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300",
    },
    Testnet: {
      label: "Testnet",
      className: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300",
    },
  };
  const entry = modeMap[mode || "Live"] || modeMap.Live;
  return (
    <span className={`px-1.5 py-0.5 text-[10px] font-medium rounded-full ${entry.className}`}>
      {entry.label}
    </span>
  );
};

// ─── Memoized Row ─────────────────────────────────────────────────────
const OrderTableRow = memo(
  ({ order }: { order: OrderType }) => {
    const isBuy = order.orderType === "BUY";
    const isSpot = order.category === "spot";
    const isPerp = order.category === "perpetual";

    // ─── Asset & Amount ──────────────────────────────────────────────
    const asset = useMemo(() => {
      if (isSpot) {
        return isBuy ? order.orderAsset.collateralToken : order.orderAsset.orderToken;
      } else {
        return isBuy ? order.orderAsset.collateralToken : order.orderAsset.orderToken;
      }
    }, [isSpot, order.orderAsset, isBuy]);

    const amountDisplay = useMemo(() => {
      if (isSpot && order.spot) {
        const { amount } = order.spot;
        const decimals = asset?.decimals || 18;
        if (isBuy) {
          const size = BigInt(amount.orderSize || "0");
          return formateAmountWithFixedDecimals(size, decimals, 10);
        } else {
          const tokenAmt = BigInt(amount.tokenAmount || "0");
          return formateAmountWithFixedDecimals(tokenAmt, decimals, 10);
        }
      }
      if (isPerp && order.perp) {
        if (isBuy) {
          const decimals = asset?.decimals || 18;
          const size = BigInt(order.perp.amount.orderSize || "0");
          return formateAmountWithFixedDecimals(size, decimals, 10);
        } else {
          return parseFloat(order?.perp.amount?.quantity || "0");
        }
      }
      return "0";
    }, [isSpot, isPerp, isBuy, order.spot, order.perp, order.orderAsset]);

    const amountSymbol = asset?.symbol || "UNK";

    // ─── Cost ──────────────────────────────────────────────────────────
    const totalCost = useMemo(() => {
      const txFee = BigInt(order.cost?.txFeeInUsd || "0");
      const pay = BigInt(order.cost?.payInUsd || "0");
      const protocolFee = BigInt(order.cost?.protocolFeeInUsd || "0");
      return txFee + pay + protocolFee;
    }, [order.cost]);

    // ─── Entry Display ──────────────────────────────────────────────
    const entryDisplay = useMemo(() => {
      const { entry } = order;
      if (!entry) return <span className="text-gray-400 text-xs">—</span>;

      if (entry.entryCriteria === "price" && entry.priceEntry) {
        return <PriceDisplay priceEntry={entry.priceEntry} />;
      }

      if (entry.entryCriteria === "logic" && entry.technicalLogic) {
        return (
          <div className="max-w-[200px] overflow-x-auto scrollbar-thin">
            <LogicSummary node={entry.technicalLogic} />
          </div>
        );
      }

      if (entry.entryCriteria === "weight" && entry.technicalWeights) {
        return (
          <div className="max-w-[200px] overflow-x-auto scrollbar-thin">
            <WeightDisplay weights={entry.technicalWeights} />
          </div>
        );
      }

      return <span className="text-gray-400 text-xs">—</span>;
    }, [order.entry]);

    // ─── Exit Display (TP / SL) ─────────────────────────────────────
    const exitDisplay = useMemo(() => {
      const { exit } = order;
      if (!exit) return <span className="text-gray-400 text-xs">—</span>;

      const tp = exit.takeProfit;
      const sl = exit.stopLoss;

      const trailingLabel = exit.isTrailingMode ? (
        <span className="text-[9px] font-bold text-blue-500 uppercase">Trailing</span>
      ) : null;

      return (
        <div className="flex flex-col gap-0.5">
          {tp && tp.takeProfitPrice !== "0" ? (
            <div className="flex items-center gap-1 text-xs">
              <span className="text-green-600 dark:text-green-400 font-medium">TP</span>
              <PriceDisplay priceEntry={{ operator: tp.operator, targetPriceUsd: tp.takeProfitPrice }} />
              {tp.takeProfitPctBps > 0 && (
                <span className="text-[10px] text-gray-400">
                  ({tp.takeProfitPctBps / 100}%)
                </span>
              )}
            </div>
          ) : (
            <div className="text-xs text-green-600 dark:text-green-400">
              TP: {tp?.takeProfitPctBps ? `${tp.takeProfitPctBps / 100}%` : "—"}
            </div>
          )}

          {sl?.isActive && sl.stopLossPrice !== "0" ? (
            <div className="flex items-center gap-1 text-xs">
              <span className="text-red-600 dark:text-red-400 font-medium">SL</span>
              <PriceDisplay priceEntry={{ operator: sl.operator, targetPriceUsd: sl.stopLossPrice }} />
              {sl.stopLossPctBps > 0 && (
                <span className="text-[10px] text-gray-400">
                  ({sl.stopLossPctBps / 100}%)
                </span>
              )}
            </div>
          ) : sl?.isActive ? (
            <div className="text-xs text-red-600 dark:text-red-400">
              SL: {sl?.stopLossPctBps ? `${sl.stopLossPctBps / 100}%` : "—"}
            </div>
          ) : null}

          {trailingLabel && <div>{trailingLabel}</div>}
        </div>
      );
    }, [order.exit]);

    // ─── Trigger Prices (Entry/Exit executed) ──────────────────────
    const triggerDisplay = useMemo(() => {
      const exec = order.executionDetails;
      if (!exec) return null;
      const { entryPriceUsd, exitPriceUsd } = exec;
      return (
        <div className="flex flex-wrap gap-1 mt-1">
          {entryPriceUsd && (
            <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 text-[10px] font-medium">
              Entry ${displayNumber(Number(safeFormatNumber(entryPriceUsd, PRECISION_DECIMALS, 8)))}
            </span>
          )}
          {exitPriceUsd && (
            <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-[10px] font-medium">
              Exit ${displayNumber(Number(safeFormatNumber(exitPriceUsd, PRECISION_DECIMALS, 2)))}
            </span>
          )}
        </div>
      );
    }, [order.executionDetails]);

    // ─── Wallet Address ──────────────────────────────────────────────
    const walletAddress = order.wallet?.address || order.wallet?._id;

    // ─── Row styling based on order mode ─────────────────────────────
    // ─── Row styling based on order mode ─────────────────────────────
    const rowClass = cn(
      "transition-colors border-l-4",
      order.orderMode === "Live" && "border-l-transparent hover:bg-gray-50 dark:hover:bg-gray-900/50",
      order.orderMode === "Demo" &&
      "bg-red-100/70 dark:bg-red-900/30 border-l-red-500 hover:bg-red-200/70 dark:hover:bg-red-900/50",
      order.orderMode === "Testnet" &&
      "bg-yellow-100/70 dark:bg-yellow-900/30 border-l-yellow-500 hover:bg-yellow-200/70 dark:hover:bg-yellow-900/50"
    );

    return (
      <tr className={rowClass}>
        {/* Asset / ID */}
        <td className="px-4 py-3 whitespace-nowrap">
          <div className="flex flex-col">
            <div className="flex gap-1 items-center font-medium text-sm text-gray-900 dark:text-gray-200">
              {isPerp && order.perp && (
                <span
                  className={`text-xs font-bold ${order.perp.isLong
                    ? "text-green-600 dark:text-green-400"
                    : "text-red-600 dark:text-red-400"
                    }`}
                >
                  {order.perp.isLong ? "LONG" : "SHORT"}
                </span>
              )}
              {asset?.symbol || "UNK"}
            </div>
            <div className="flex items-center gap-1">
              <div className="flex items-center gap-1 text-xs text-gray-500">
                #{order._id?.slice(-6)}
                <FiCopy
                  className="cursor-pointer hover:text-blue-500"
                  onClick={() => handleCopy(order._id as string, "Order ID")}
                />
              </div>
              {/* Order Mode Badge */}
              {getOrderModeBadge(order.orderMode)}
              {isPerp && order.perp?.leverage && (
                <div className="flex items-center gap-1 text-xs text-gray-500">
                  {order.perp.leverage}x
                  <img
                    src={
                      order.perp.protocol === "asterdex"
                        ? "https://static.asterindex.com/cloud-futures/static/images/aster/logo.svg"
                        : order.perp.protocol === "hyperliquid"
                          ? "https://avatars.githubusercontent.com/u/129421375?s=200&v=4"
                          : "./gmx.svg"
                    }
                    alt={order.perp.protocol}
                    className="w-4 h-4"
                  />
                </div>
              )}
            </div>
          </div>
        </td>

        {/* Type */}
        <td className="px-4 py-3 whitespace-nowrap">
          <div className="flex flex-col">
            <span
              className={`text-xs font-bold ${order.orderType === "BUY"
                ? "text-green-600 dark:text-green-400"
                : "text-red-600 dark:text-red-400"
                }`}
            >
              {order.orderType}
            </span>
            <span className="text-[10px] text-gray-500 uppercase">
              {order.strategy}
            </span>
          </div>
        </td>

        {/* Entry */}
        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-700 dark:text-gray-300">
          {entryDisplay}
        </td>

        {/* Exit (TP/SL) */}
        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-700 dark:text-gray-300">
          {exitDisplay}
        </td>

        {/* Amount */}
        <td className="px-4 py-3 whitespace-nowrap">
          <div className="flex flex-col gap-1 text-xs">
            <div className="flex items-center gap-1">
              <span className="flex gap-1 font-medium text-gray-700 dark:text-gray-300">
                {amountDisplay} {amountSymbol}
              </span>
            </div>
          </div>
        </td>

        {/* Cost */}
        <td className="px-4 py-3 whitespace-nowrap">
          <span className="flex gap-1 text-gray-900 dark:text-gray-100 font-mono">
            {formatUSD(totalCost)}
          </span>
        </td>

        {/* Trigger */}
        <td className="px-4 py-3 whitespace-nowrap">
          {triggerDisplay || <span className="text-gray-400 text-xs">—</span>}
        </td>

        {/* Wallet */}
        <td className="px-4 py-3 whitespace-nowrap text-xs text-gray-500">
          {walletAddress ? (
            <div
              className="flex items-center gap-1 group cursor-pointer"
              onClick={() =>
                handleCopy(
                  typeof walletAddress === "string" ? walletAddress : "",
                  "Wallet"
                )
              }
              title={typeof walletAddress === "string" ? walletAddress : ""}
            >
              {typeof walletAddress === "string"
                ? `${walletAddress.slice(0, 4)}...${walletAddress.slice(-4)}`
                : "—"}
              <FiCopy className="opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
          ) : (
            "—"
          )}
        </td>

        {/* Status */}
        <td className="px-4 py-3 whitespace-nowrap">
          <div className="flex items-center gap-1.5">
            {STATUS_ICONS[order.orderStatus] || STATUS_ICONS.PENDING}
            <span className="text-xs font-medium text-gray-700 dark:text-gray-300 capitalize">
              {order.orderStatus.toLowerCase()}
            </span>
          </div>
        </td>

        {/* Action */}
        <td className="px-4 py-3 whitespace-nowrap text-right">
          <OrderActions order={order} />
        </td>
      </tr>
    );
  },
  (prevProps, nextProps) => prevProps.order === nextProps.order
);

OrderTableRow.displayName = "OrderTableRow";

// ─── Main Component ────────────────────────────────────────────────────
interface OrderTableProps {
  orders: OrderType[];
}

export default function OrderTable({ orders }: OrderTableProps) {
  return (
    <div className="w-full h-full rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 overflow-hidden flex flex-col">
      <div className="overflow-x-auto flex-1 custom-scrollbar">
        <table className="w-full divide-y divide-gray-200 dark:divide-gray-800">
          <thead className="bg-gray-50 dark:bg-gray-900/50 sticky top-0 z-10">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Asset / ID
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Type
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Entry
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                EXIT | TP / SL
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Amount
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Cost
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Trigger
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Wallet
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Status
              </th>
              <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Action
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 dark:divide-gray-800 bg-white dark:bg-gray-950">
            {orders.map((order, index) => (
              <OrderTableRow key={order._id || `order-${index}`} order={order} />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}