"use client";

import { useCallback, useEffect, useMemo, useRef, useState, memo } from "react";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import { FiPlus, FiX } from "react-icons/fi";
import { useShallow } from "zustand/shallow";


import PerpTradingCaution from "@/components/common/Confirmation/PerpCaution";
import ChartBox from "./ChartBox";
import OrderBox from "@/components/order/dashboard/OrderList";
import TradeBox from "@/components/tradeBox/perpTradeBox";
import { useStore } from "@/store/useStore";
import {
  useAsterMarketStats,
  type AsterMarketStats,
} from "@/hooks/useAsterhooks/useAsterMarketStats";
import type { OrderType } from "@/type/order";
import type {
  LiveMarketSnapshot,
  MarketSnapshotRef,
  StableMarketTokenInfo,
} from "@/type/market";
import { normalizeAsterSymbol, normalizeCoin } from "@/utility/perpUtils";

interface ASTER_PERP_MAIN_PROPS {
  tokenSymbol: string;
}

type AsterPerpTokenInfo = StableMarketTokenInfo & {
  address: string;
  pairAddress: string;
  quoteToken: { symbol: string; address: string; decimals: number };
  createdAt: number;
  chainId: number;
  maxLeverage: number;
  minQty: string;
  maxQty: string;
  name: string;
  symbol: string;
  priceUsd: string;
};

const DEFAULT_CHAIN_ID = 43114;

const toPriceString = (value: number) => {
  return value > 0 ? value.toString() : "0";
};

// ── Memoized Chart Section ──────────────────────────────────────────────
const ChartSection = memo(
  ({
    selectedSymbol,
    stats,
    userConnected,
    asterConnected,
    userOrders,
    loading,
    error,
    onSymbolChange,
    leftWidth,
    isDesktop,
    isTradeBoxOpen,
    perpTokenInfo,
    marketSnapshotRef,
    isAdvancedSymbol
  }: {
    selectedSymbol: string;
    stats: AsterMarketStats;
    userConnected: boolean;
    asterConnected: boolean;
    userOrders: OrderType[];
    loading: boolean;
    error: string | null;
    onSymbolChange: (symbol: string) => void;
    leftWidth: number;
    isDesktop: boolean;
    isTradeBoxOpen: boolean;
    perpTokenInfo: AsterPerpTokenInfo;
    marketSnapshotRef: MarketSnapshotRef;
    isAdvancedSymbol: boolean;
  }) => (
    <div
      style={isDesktop ? { width: `${leftWidth}%` } : undefined}
      className={`h-full flex flex-col transition-all duration-300 ${isTradeBoxOpen ? "hidden lg:flex" : "flex"
        }`}
    >
      <ChartBox
        tokenSymbol={selectedSymbol}
        onSymbolChange={onSymbolChange}
        stats={stats}
        connected={asterConnected}
        loading={loading}
        error={error}
        isAdvancedSymbol={isAdvancedSymbol}
      />
      <OrderBox
        orderCategory="perpetual"
        tokenInfo={perpTokenInfo}
        userOrders={userOrders}
        isConnected={userConnected}
        protocol="asterdex"
        marketSnapshotRef={marketSnapshotRef}
      />
    </div>
  )
);
ChartSection.displayName = "ChartSection";

// ── Memoized Resize Divider ─────────────────────────────────────────────
const ResizeDivider = memo(({ onMouseDown }: { onMouseDown: () => void }) => (
  <div
    onMouseDown={onMouseDown}
    className="hidden lg:flex w-2 h-full cursor-col-resize items-center justify-center group transition-colors hover:bg-blue-500/10"
  >
    <div className="h-12 w-1 bg-gray-200 dark:bg-gray-700 group-hover:bg-blue-500 rounded-full transition-colors" />
  </div>
));
ResizeDivider.displayName = "ResizeDivider";

// ── Memoized Trade Box Section ──────────────────────────────────────────
const TradeBoxSection = memo(
  ({
    rightWidth,
    isDesktop,
    renderTradeBox,
  }: {
    rightWidth: number;
    isDesktop: boolean;
    renderTradeBox: React.ReactNode;
  }) => (
    <div
      style={isDesktop ? { width: `${rightWidth}%` } : undefined}
      className="hidden lg:block h-full flex-none min-w-[320px]"
    >
      {renderTradeBox}
    </div>
  )
);
TradeBoxSection.displayName = "TradeBoxSection";

// ── Memoized Mobile Trade Modal ──────────────────────────────────────────
const MobileTradeModal = memo(
  ({
    isOpen,
    onClose,
    perpTokenInfo,
    renderTradeBox,
  }: {
    isOpen: boolean;
    onClose: () => void;
    perpTokenInfo: any;
    renderTradeBox: React.ReactNode;
  }) => (
    <AnimatePresence>
      {isOpen ? (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40 lg:hidden"
          />

          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="fixed inset-x-0 bottom-0 h-[85vh] bg-white dark:bg-gray-900 z-50 lg:hidden rounded-t-3xl flex flex-col shadow-2xl"
          >
            <div className="p-4 border-b border-gray-100 dark:border-gray-800 flex justify-between items-center">
              <div className="flex items-center gap-3">
                <Image
                  src={perpTokenInfo?.imageUrl || "/tokenLogo.png"}
                  alt="Token"
                  width={32}
                  height={32}
                  className="w-8 h-8 rounded-full"
                />
                <div>
                  <h3 className="font-bold text-gray-900 dark:text-white">
                    Trade {perpTokenInfo.symbol}
                  </h3>
                  <p className="text-xs text-gray-500">
                    ${Number(perpTokenInfo.priceUsd || 0).toFixed(4)}
                  </p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-2 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 rounded-full transition-colors"
              >
                <FiX className="w-5 h-5 dark:text-white" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-2">{renderTradeBox}</div>
          </motion.div>
        </>
      ) : null}
    </AnimatePresence>
  )
);
MobileTradeModal.displayName = "MobileTradeModal";

// ── Memoized Trade Button ───────────────────────────────────────────────
const TradeButton = memo(({ onClick }: { onClick: () => void }) => (
  <AnimatePresence>
    <motion.button
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      exit={{ scale: 0, opacity: 0 }}
      whileTap={{ scale: 0.95 }}
      onClick={onClick}
      className="fixed bottom-6 right-6 lg:hidden z-30 h-14 px-6 bg-blue-600 text-white rounded-full shadow-lg shadow-blue-600/30 flex items-center gap-2 font-bold"
    >
      <FiPlus className="w-5 h-5" />
      Trade
    </motion.button>
  </AnimatePresence>
));
TradeButton.displayName = "TradeButton";

// ─── Main Component ──────────────────────────────────────────────────────

export default function AsterPerpMain({ tokenSymbol }: ASTER_PERP_MAIN_PROPS) {
  const { user, isConnected, network, userOrders, userWallets, systemInfo } = useStore(
    useShallow((state) => {
      const typedState = state as {
        user: unknown;
        network: number | null | undefined;
        userOrders: OrderType[];
        userWallets: unknown[];
        isConnected: boolean;
        systemInfo: any;
      };

      return {
        user: typedState.user,
        network: typedState.network,
        userOrders: typedState.userOrders,
        userWallets: typedState.userWallets,
        isConnected: typedState.isConnected,
        systemInfo: typedState.systemInfo,
      };
    })
  );

  const [selectedSymbol, setSelectedSymbol] = useState(() =>
    normalizeAsterSymbol(tokenSymbol)
  );
  const [isTradeBoxOpen, setIsTradeBoxOpen] = useState(false);
  const [leftWidth, setLeftWidth] = useState(75);
  const [isDesktop, setIsDesktop] = useState(false);
  const [showCaution, setShowCaution] = useState(true);
  const [isDraggingH, setIsDraggingH] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const marketSnapshotRef = useRef<LiveMarketSnapshot>({ priceUsd: "0" });

  const { stats, connected, loading, error } =
    useAsterMarketStats(selectedSymbol);

  // ── Compute advanced symbol flag ──────────────────────────────────────
  const isAdvancedSymbol = useMemo(() => {
    const baseSymbol = normalizeCoin(selectedSymbol);
    return systemInfo.advancedAlgoPerpSymbols.includes(baseSymbol);
  }, [selectedSymbol]);

  // ── Caution modal ──────────────────────────────────────────────────────
  useEffect(() => {
    const accepted = localStorage.getItem("perp_caution_asterdex") === "accepted";
    setShowCaution(!accepted);
  }, []);

  const handleAcceptCaution = useCallback(() => {
    setShowCaution(false);
    if (typeof window !== "undefined") {
      localStorage.setItem("perp_caution_asterdex", "accepted");
    }
  }, []);

  const handleDeclineCaution = useCallback(() => {
    if (typeof window !== "undefined") {
      window.history.back();
    }
  }, []);

  // ── Reset ref + symbol on token change ────────────────────────────────
  useEffect(() => {
    marketSnapshotRef.current = { priceUsd: "0" };
    setSelectedSymbol(normalizeAsterSymbol(tokenSymbol));
  }, [tokenSymbol]);

  // ── Viewport handling ──────────────────────────────────────────────────
  useEffect(() => {
    const handleViewport = () => {
      setIsDesktop(window.innerWidth >= 1024);
    };

    handleViewport();
    window.addEventListener("resize", handleViewport);
    return () => window.removeEventListener("resize", handleViewport);
  }, []);

  // ── Symbol change handler ──────────────────────────────────────────────
  const handleSymbolChange = useCallback((symbol: string) => {
    marketSnapshotRef.current = { priceUsd: "0" };
    setSelectedSymbol(normalizeAsterSymbol(symbol));
  }, []);

  // ── Drag handlers ──────────────────────────────────────────────────────
  const onMouseMove = useCallback(
    (event: MouseEvent) => {
      if (!isDraggingH || !containerRef.current) return;

      const rect = containerRef.current.getBoundingClientRect();
      if (rect.width <= 0) return;

      const relativeX = event.clientX - rect.left;
      const newWidth = (relativeX / rect.width) * 100;

      if (newWidth > 45 && newWidth < 85) {
        setLeftWidth(newWidth);
      }
    },
    [isDraggingH]
  );

  const onMouseUp = useCallback(() => {
    setIsDraggingH(false);
  }, []);

  useEffect(() => {
    if (!isDraggingH) return undefined;

    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
    document.body.style.cursor = "col-resize";

    return () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
      document.body.style.cursor = "default";
    };
  }, [isDraggingH, onMouseMove, onMouseUp]);

  // ── Chain ID ────────────────────────────────────────────────────────────
  const chainId = useMemo(
    () => (typeof network === "number" ? network : DEFAULT_CHAIN_ID),
    [network]
  );

  // ── Live market data into ref ──────────────────────────────────────────
  useEffect(() => {
    marketSnapshotRef.current = {
      priceUsd: toPriceString(stats.lastPrice),
      lastPrice: stats.lastPrice,
      markPrice: stats.markPrice,
      indexPrice: stats.indexPrice,
      fundingRate: stats.fundingRate,
      nextFundingTime: stats.nextFundingTime,
      quoteVolume: stats.quoteVolume,
      openInterest: stats.openInterest,
      openInterestUsd: stats.openInterestUsd,
      eventTime: stats.eventTime,
    };
  }, [
    stats.eventTime,
    stats.fundingRate,
    stats.indexPrice,
    stats.lastPrice,
    stats.markPrice,
    stats.nextFundingTime,
    stats.openInterest,
    stats.openInterestUsd,
    stats.quoteVolume,
  ]);

  // ── Perp token info ────────────────────────────────────────────────────
  const perpTokenInfo = useMemo<AsterPerpTokenInfo>(() => {
    const normalizedSymbol = normalizeAsterSymbol(selectedSymbol);
    const baseSymbol = normalizeCoin(normalizedSymbol);
    return {
      address: baseSymbol,
      pairAddress: normalizedSymbol,
      quoteToken: { symbol: "USDT", address: "USDT", decimals: 6 },
      createdAt: 0,
      chainId,
      maxLeverage: stats.maxLeverage,
      minQty: stats.minQty,
      maxQty: stats.maxQty,
      name: baseSymbol,
      symbol: baseSymbol,
      priceUsd: "0",
    };
  }, [chainId, selectedSymbol, stats.maxLeverage, stats.minQty, stats.maxQty]);

  // ── Render trade box ────────────────────────────────────────────────────
  const renderTradeBox = useMemo(() => {
    return (
      <TradeBox
        chainId={chainId}
        tokenInfo={perpTokenInfo}
        isConnected={isConnected}
        user={user}
        userPrevOrders={userOrders}
        userWallets={userWallets}
        protocol="asterdex"
        marketSnapshotRef={marketSnapshotRef}
        isAdvancedSymbol={isAdvancedSymbol}
        config={{ minimumOrderSize: systemInfo?.minimumOrderSize || 15, maxGridNumber: systemInfo?.maxGridNumber || 3, userLevels: systemInfo.userLevels }}
      />
    );
  }, [
    chainId,
    isConnected,
    perpTokenInfo,
    user,
    userOrders,
    userWallets,
    marketSnapshotRef,
    isAdvancedSymbol,
  ]);

  // ── Callbacks ──────────────────────────────────────────────────────────
  const handleResizeDividerMouseDown = useCallback(() => {
    setIsDraggingH(true);
  }, []);

  const handleTradeBoxOpen = useCallback(() => {
    setIsTradeBoxOpen(true);
  }, []);

  const handleTradeBoxClose = useCallback(() => {
    setIsTradeBoxOpen(false);
  }, []);

  const rightWidth = 100 - leftWidth;

  return (
    <>
      <PerpTradingCaution
        isOpen={showCaution}
        onAccept={handleAcceptCaution}
        onDecline={handleDeclineCaution}
        dex="asterdex"
      />
      <div
        className={`w-full h-full relative select-none ${showCaution ? "pointer-events-none opacity-30 blur-sm" : ""
          }`}
      >
        <div className="w-full h-full overflow-hidden flex flex-col">
          <div
            ref={containerRef}
            className="flex-1 flex flex-col lg:flex-row bg-gray-50 dark:bg-gray-900 gap-0 p-2 overflow-hidden"
          >
            <ChartSection
              selectedSymbol={selectedSymbol}
              userOrders={userOrders}
              stats={stats}
              userConnected={isConnected}
              asterConnected={connected}
              loading={loading}
              error={error}
              onSymbolChange={handleSymbolChange}
              leftWidth={leftWidth}
              isDesktop={isDesktop}
              isTradeBoxOpen={isTradeBoxOpen}
              perpTokenInfo={perpTokenInfo}
              marketSnapshotRef={marketSnapshotRef}
              isAdvancedSymbol={isAdvancedSymbol}
            />

            <ResizeDivider onMouseDown={handleResizeDividerMouseDown} />

            <TradeBoxSection
              rightWidth={rightWidth}
              isDesktop={isDesktop}
              renderTradeBox={renderTradeBox}
            />
          </div>
        </div>

        <MobileTradeModal
          isOpen={isTradeBoxOpen}
          onClose={handleTradeBoxClose}
          perpTokenInfo={perpTokenInfo}
          renderTradeBox={renderTradeBox}
        />

        {!isTradeBoxOpen && <TradeButton onClick={handleTradeBoxOpen} />}
      </div>
    </>
  );
}