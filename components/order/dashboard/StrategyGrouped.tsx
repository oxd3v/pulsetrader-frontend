import { useState, useRef, useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  FiX,
  FiClock,
  FiCheckCircle,
  FiTrash2,
  FiMoreVertical,
  FiChevronUp,
  FiChevronDown,
  FiActivity
} from "react-icons/fi";
import { OrderType } from "@/type/order";
import { useOrder } from "@/hooks/useOrder";
import type { MarketSnapshotRef } from "@/type/market";

import OrderCard from "./OrderCard";
import ConfirmationModal from "@/components/common/Confirmation/ConfirmationBox";

interface StrategyGroupProps {
  strategyName: string;
  groupData: {
    orders: OrderType[];
    strategy: string;
    category: string;
    protocol: string;
    stats: {
      total: number;
      pending: number;
      opened: number;
      reverted: number;
      closed: number;
    }
  };
  marketSnapshotRef?: MarketSnapshotRef;
}

export default function StrategyGroup({
  strategyName,
  groupData,
  marketSnapshotRef,
}: StrategyGroupProps) {
  const { closeStrategy, deleteStrategy } = useOrder();
  const [isExpanded, setIsExpanded] = useState(true);
  const [showStrategyActions, setShowStrategyActions] = useState(false);
  const { orders, strategy, category, stats, protocol } = groupData;

  const [confirmationConfig, setConfirmationConfig] = useState<{
    title: string;
    description: string;
    onSubmit: () => Promise<void>;
    confirmText: string;
    variant?: "default" | "destructive";
  } | null>(null);

  const actionsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (showStrategyActions && actionsRef.current && !actionsRef.current.contains(event.target as Node)) {
        setShowStrategyActions(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showStrategyActions]);

  const handleCloseStrategy = () => {
    setConfirmationConfig({
      title: "Close Strategy Positions",
      description: `Are you sure you want to market close all ${stats.opened} active positions in "${strategyName}"?`,
      onSubmit: async () => {
        await closeStrategy({ strategy, category, strategyName }); // Ensure backend accepts name if needed
        setConfirmationConfig(null);
        setShowStrategyActions(false);
      },
      confirmText: "Close All",
      variant: "destructive",
    });
  };

  const handleDeleteStrategy = () => {
    setConfirmationConfig({
      title: "Delete Strategy",
      description: `Are you sure you want to delete all ${stats.total} orders in "${strategyName}"? This will cancel pending orders.`,
      onSubmit: async () => {
        await deleteStrategy({ strategy, category, strategyName });
        setConfirmationConfig(null);
        setShowStrategyActions(false);
      },
      confirmText: "Delete All",
      variant: "destructive",
    });
  };

  return (
    <div className="mb-4 bg-gray-50 dark:bg-gray-900/50 rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden">
      {/* Header */}
      <div className="bg-white dark:bg-gray-900 p-0 border-b border-gray-100 dark:border-gray-800">
        <div
          className="flex items-center justify-between p-4 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
          onClick={() => setIsExpanded(!isExpanded)}
        >
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-1">
              <h3 className="font-bold text-gray-800 dark:text-gray-100 text-lg">
                {strategyName}
              </h3>
              <span className="bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 text-xs px-2 py-0.5 rounded-full border border-gray-200 dark:border-gray-700">
                {strategy.toUpperCase()}
              </span>
              <img
                src={
                  protocol === "asterdex"
                    ? "https://static.asterindex.com/cloud-futures/static/images/aster/logo.svg"
                    : protocol === "hyperliquid"
                      ? "https://avatars.githubusercontent.com/u/129421375?s=200&v=4"
                      : "./gmx.svg"
                }
                alt="DEX"
                className="w-5 h-5"
              />
            </div>

            <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs">
              <span className="text-gray-500">{category}</span>
              <div className="w-px h-3 bg-gray-300 dark:bg-gray-700"></div>

              {/* Status Pills */}
              {stats.opened > 0 && (
                <span className="flex items-center gap-1 text-blue-600 dark:text-blue-400 font-medium">
                  <FiActivity /> {stats.opened} Active
                </span>
              )}
              {stats.pending > 0 && (
                <span className="flex items-center gap-1 text-yellow-600 dark:text-yellow-400 font-medium">
                  <FiClock /> {stats.pending} Pending
                </span>
              )}
              {stats.reverted > 0 && (
                <span className="flex items-center gap-1 text-red-600 dark:text-red-400">
                  <FiX /> {stats.reverted} Failed
                </span>
              )}
              {stats.closed > 0 && (
                <span className="flex items-center gap-1 text-green-600 dark:text-green-400">
                  <FiCheckCircle /> {stats.closed} Done
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
            <div className="relative" ref={actionsRef}>
              <button
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors text-gray-500"
                onClick={() => setShowStrategyActions(!showStrategyActions)}
              >
                <FiMoreVertical className="w-5 h-5" />
              </button>

              {showStrategyActions && (
                <div className="absolute right-0 top-full mt-1 w-48 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-xl z-20 py-1">
                  {stats.opened > 0 && (
                    <button
                      onClick={handleCloseStrategy}
                      className="w-full px-4 py-2 text-left text-sm hover:bg-orange-50 dark:hover:bg-orange-900/20 text-orange-600 flex items-center gap-2"
                    >
                      <FiX className="w-4 h-4" /> Close All Active
                    </button>
                  )}
                  <button
                    onClick={handleDeleteStrategy}
                    className="w-full px-4 py-2 text-left text-sm hover:bg-red-50 dark:hover:bg-red-900/20 text-red-600 flex items-center gap-2"
                  >
                    <FiTrash2 className="w-4 h-4" /> Delete Strategy
                  </button>
                </div>
              )}
            </div>

            <button className="p-2 text-gray-400">
              {isExpanded ? <FiChevronUp /> : <FiChevronDown />}
            </button>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="p-2 sm:p-4 grid grid-cols-1  gap-4"
          >
            {orders.map((order) => (
              <OrderCard
                key={order._id}
                order={order}
                marketSnapshotRef={marketSnapshotRef}
              />
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {confirmationConfig && (
        <ConfirmationModal
          isOpen={!!confirmationConfig}
          onClose={() => setConfirmationConfig(null)}
          onConfirm={confirmationConfig.onSubmit}
          title={confirmationConfig.title}
          description={confirmationConfig.description}
          confirmText={confirmationConfig.confirmText}
          cancelText="Cancel"
          variant={confirmationConfig.variant}
        />
      )}
    </div>
  );
}
