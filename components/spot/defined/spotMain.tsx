"use client";
import { useEffect, useState, useRef, useMemo, useCallback } from "react";
import {
  fetchCodexFilterTokens,
} from "@/lib/oracle/codex";
import { motion, AnimatePresence } from "framer-motion";
import { FiPlus, FiX, FiAlertCircle } from "react-icons/fi";
import { chains } from "@/constants/common/chain";


// internal components
import ChartBox from "./ChartBox";
import OrderBox from "@/components/order/dashboard/OrderList";
import TradeBox from "@/components/tradeBox/spotTradeBox";
import SelectTokenModal from "@/components/spot/defined/selectToken";

import { useStore } from "@/store/useStore";
import { useShallow } from "zustand/shallow";
import type { LiveMarketSnapshot, StableMarketTokenInfo } from "@/type/market";

interface DefinedSpotMainProps {
  tokenAddress: string;
}

// Separate static metadata from dynamic market data to optimize rendering
interface StaticTokenInfo extends StableMarketTokenInfo {
  address: string;
  pairAddress: string;
  quoteToken: any;
  createdAt: number;
  chainId: number;
  name: string;
  symbol: string;
  decimals: number;
  imageUrl: string;
  priceUsd: string;
  token?: any;
}

interface DynamicTokenData {
  priceUsd: string;
  liquidity: string;
  marketCap: string;
  volume24: string;
  change24: string;
  // Add other raw fields needed by ChartBox/TradeBox
  [key: string]: any;
}

export default function DefinedSpotMain({
  tokenAddress,
}: DefinedSpotMainProps) {
  const { user, isConnected, network, userOrders, userWallets, systemInfo } = useStore(
    useShallow((state: any) => ({
      user: state.user,
      network: state.network,
      userOrders: state.userOrders,
      userWallets: state.userWallets,
      isConnected: state.isConnected,
      systemInfo: state.systemInfo,
    })),
  );
  // --- UI State ---
  const [showTokenSelectionModal, setShowTokenSelectionModal] = useState(false);
  const [isTradeBoxOpen, setIsTradeBoxOpen] = useState(false);

  // --- Data State ---
  const [selectedAddress, setSelectedAddress] = useState(tokenAddress);
  const [staticInfo, setStaticInfo] = useState<StaticTokenInfo | null>(null);
  const [dynamicData, setDynamicData] = useState<DynamicTokenData | null>(null);
  const marketSnapshotRef = useRef<LiveMarketSnapshot>({
    priceUsd: "0",
    liquidity: "0",
    marketCap: "0",
    volume24: "0",
    change24: "0",
  });

  // --- Status State ---
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // --- Refs ---
  const abortControllerRef = useRef<AbortController | null>(null);
  const isMountedRef = useRef(true);

  // --- Resizing State (Percentages) ---
  const [leftWidth, setLeftWidth] = useState(75); // Width of Chart+Orders section
  const [isDraggingH, setIsDraggingH] = useState(false);
  const [isDesktop, setIsDesktop] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);

  // --- Resize Handlers ---
  const startHorizontalDrag = () => setIsDraggingH(true);

  const onMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!containerRef.current) return;

      if (isDraggingH) {
        const containerWidth = containerRef.current.offsetWidth;
        const newWidth = (e.clientX / containerWidth) * 100;
        // Clamp between 40% and 85%
        if (newWidth > 40 && newWidth < 85) setLeftWidth(newWidth);
      }
    },
    [isDraggingH],
  );


  const onMouseUp = useCallback(() => {
    setIsDraggingH(false);
  }, []);

  useEffect(() => {
    const handleViewport = () => {
      setIsDesktop(window.innerWidth >= 1024);
    };

    handleViewport();
    window.addEventListener("resize", handleViewport);
    return () => window.removeEventListener("resize", handleViewport);
  }, []);

  useEffect(() => {
    if (isDraggingH) {
      window.addEventListener("mousemove", onMouseMove);
      window.addEventListener("mouseup", onMouseUp);
      document.body.style.cursor = "col-resize";
    } else {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
      document.body.style.cursor = "default";
    }
    return () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
    };
  }, [isDraggingH, onMouseMove, onMouseUp]);

  // Cleanup on unmount
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  // 1. Initial Data Fetch (Metadata + First Price)
  const fetchTokenData = useCallback(async (addr: string) => {
    if (!addr?.trim()) return;

    // Abort previous pending requests
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();

    setLoading(true);
    setError(null);
    try {
      // Fetch data
      const response = await fetchCodexFilterTokens({
        variables: {
          phrase: addr,
          statsType: "FILTERED",
          limit: 10, // Reduced limit for faster initial load
          filters: { change24: {} },
        },
      });

      if (!isMountedRef.current) return;

      // Filter for valid chains
      // Filter for valid chains, prioritizing the current network
      const validToken =
        response?.find((t: any) => t.token.networkId === network) ||
        response?.find((t: any) => Object.values(chains).includes(t.token.networkId));

      if (!validToken) {
        setError("Token not found on supported chains");
        setStaticInfo(null);
        setDynamicData(null);
        return;
      }

      // Set Static Info (Stable)
      setStaticInfo({
        address: validToken.token.address,
        pairAddress: validToken.pair.address,
        quoteToken: validToken.quoteToken,
        createdAt: validToken.createdAt,
        chainId: validToken.token.networkId,
        name: validToken.token.name,
        symbol: validToken.token.symbol,
        decimals: validToken.token.decimals,
        imageUrl: validToken.token.imageLargeUrl || "/tokenLogo.png",
        priceUsd: validToken.priceUSD || "0",
        token: validToken.token,
      });

      // Set Dynamic Data (Changeable)
      setDynamicData(validToken);
    } catch (err: any) {
      if (err.name !== "AbortError" && isMountedRef.current) {
        console.error("Token fetch error:", err);
        setError("Failed to fetch token data");
      }
    } finally {
      if (isMountedRef.current && !abortControllerRef.current?.signal.aborted) {
        setLoading(false);
      }
    }
  }, [network]);

  // Trigger fetch when selected address changes
  useEffect(() => {
    fetchTokenData(selectedAddress);
  }, [selectedAddress, fetchTokenData]);

  // 2. Polling for Price Updates (Only runs when we have valid static info)
  useEffect(() => {
    if (!staticInfo) return;

    const pollPrice = async () => {
      try {
        const res = await fetchCodexFilterTokens({
          variables: {
            tokens: [`${staticInfo.address}:${staticInfo.chainId}`],
            statsType: "FILTERED",
            limit: 1,
            filters: { change24: {} },
          },
        });

        if (isMountedRef.current && res?.[0]) {
          // Only update dynamic data, keeping static info stable
          setDynamicData(res[0]);
        }
      } catch (e) {
        console.error("Price polling error:", e);
      }
    };

    const intervalId = setInterval(pollPrice, 5000);
    return () => clearInterval(intervalId);
  }, [staticInfo]); // Only re-create interval if static info (identity) changes

  // --- Handlers ---

  const handleTokenSelect = useCallback(() => {
    setShowTokenSelectionModal(true);
  }, []);

  const handleTokenSelected = useCallback(
    (token: string) => {
      if (token === selectedAddress) return;
      setSelectedAddress(token);
      // Reset state immediately to prevent stale data flash
      setStaticInfo(null);
      setDynamicData(null);
      setShowTokenSelectionModal(false);
      setIsTradeBoxOpen(false);
    },
    [selectedAddress],
  );


  // --- Render Helpers ---

  // Combine static and dynamic data for children props
  // We use useMemo to create a stable object reference for children props
  useEffect(() => {
    marketSnapshotRef.current = {
      priceUsd: dynamicData?.priceUSD || staticInfo?.priceUsd || "0",
      liquidity: dynamicData?.liquidity?.toString?.() || "0",
      marketCap: dynamicData?.marketCap?.toString?.() || "0",
      volume24: dynamicData?.volume24?.toString?.() || "0",
      change24: dynamicData?.change24?.toString?.() || "0",
    };
  }, [dynamicData, staticInfo?.priceUsd]);

  const renderTradeBox = useMemo(() => {
    if (!staticInfo) return null;
    return (
      <TradeBox
        chainId={network}
        tokenInfo={staticInfo}
        isConnected={isConnected}
        user={user}
        userPrevOrders={userOrders}
        userWallets={userWallets}
        marketSnapshotRef={marketSnapshotRef}
        config={{ minimumOrderSize: systemInfo?.minimumOrderSize || 15, maxGridNumber: systemInfo?.maxGridNumber || 3, userLevels: systemInfo?.userLevels }}
      />
    );
  }, [network, staticInfo, isConnected, user, userOrders, userWallets]);

  // Loading View
  if (loading && !staticInfo) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center bg-gray-50 dark:bg-gray-900 gap-4">
        <div className="relative">
          <div className="w-16 h-16 border-4 border-blue-100 dark:border-blue-900 rounded-full"></div>
          <div className="absolute top-0 left-0 w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
        </div>
        <p className="text-gray-500 font-medium animate-pulse">
          Loading market data...
        </p>
      </div>
    );
  }

  // Error View
  if (error && !staticInfo) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-gray-50 dark:bg-gray-900 p-2">
        <div className="text-center max-w-sm p-8 bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-red-100 dark:border-red-900/30">
          <div className="w-16 h-16 bg-red-50 dark:bg-red-900/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <FiAlertCircle className="w-8 h-8 text-red-500" />
          </div>
          <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">
            {error}
          </h3>
          <p className="text-gray-500 dark:text-gray-400 mb-6">{error}</p>
          <button
            onClick={handleTokenSelect}
            className="w-full py-3 bg-blue-500 hover:bg-blue-600 text-white rounded-xl font-medium transition-all"
          >
            Select Different Token
          </button>
        </div>
      </div>
    );
  }

  // Empty State
  if (!staticInfo) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <button
          onClick={handleTokenSelect}
          className="flex flex-col items-center gap-4 group"
        >
          <div className="w-20 h-20 bg-gray-100 dark:bg-gray-800 group-hover:bg-blue-50 dark:group-hover:bg-blue-900/20 rounded-full flex items-center justify-center transition-colors">
            <FiPlus className="w-10 h-10 text-gray-400 group-hover:text-blue-500 transition-colors" />
          </div>
          <span className="text-gray-500 group-hover:text-blue-500 font-medium transition-colors">
            Select a token to begin
          </span>
        </button>
      </div>
    );
  }

  return (
    <div className="w-full h-full relative select-none">
      <div className="w-full h-full overflow-hidden flex flex-col">
        {/* Main Layout Container */}
        <div
          ref={containerRef}
          className="flex-1 flex flex-col lg:flex-row bg-gray-50 dark:bg-gray-900 gap-0 p-2  overflow-hidden"
        >
          {/* Desktop Left Column: Chart & Orders (Vertical Split) */}
          <div
            style={{
              width:
                isDesktop ? `${leftWidth}%` : "100%",
            }}
            className={`h-full flex flex-col transition-all duration-300 ${isTradeBoxOpen ? "hidden lg:flex" : "flex"
              }`}
          >
            {/* 1. Chart Section */}

            <ChartBox
              tokenInfo={staticInfo}
              tokenState={dynamicData}
              handleTokenSelect={handleTokenSelect}
            />

            {/* Vertical Resize Handle (Between Chart and Orders) */}
            {/* <div 
              onMouseDown={startVerticalDrag}
              className="hidden lg:flex h-2 w-full cursor-row-resize items-center justify-center group transition-colors hover:bg-blue-500/10"
            >
              <div className="w-12 h-1 bg-gray-200 dark:bg-gray-700 group-hover:bg-blue-500 rounded-full transition-colors" />
            </div> */}

            {/* 2. Order/Transaction List Section */}
            <OrderBox network={network} userOrders={userOrders} orderCategory="spot" walletAddress="" isConnected={isConnected} tokenInfo={staticInfo} />
          </div>

          {/* Horizontal Resize Handle (Between Left Column and TradeBox) */}
          <div
            onMouseDown={startHorizontalDrag}
            className="hidden lg:flex w-2 h-full cursor-col-resize items-center justify-center group transition-colors hover:bg-blue-500/10"
          >
            <div className="h-12 w-1 bg-gray-200 dark:bg-gray-700 group-hover:bg-blue-500 rounded-full transition-colors" />
          </div>

          {/* Right Column: Trade Box (Desktop) */}
          <div
            style={{
              width:
                isDesktop ? `${100 - leftWidth}%` : "100%",
            }}
            className="hidden lg:block h-full flex-none min-w-[320px]"
          >
            {renderTradeBox}
          </div>
        </div>
      </div>

      {/* Mobile Trade Drawer */}
      <AnimatePresence>
        {isTradeBoxOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsTradeBoxOpen(false)}
              className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40 lg:hidden"
            />
            {/* Drawer */}
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="fixed inset-x-0 bottom-0 h-[85vh] bg-white dark:bg-gray-900 z-50 lg:hidden rounded-t-3xl flex flex-col shadow-2xl"
            >
              <div className="p-4 border-b border-gray-100 dark:border-gray-800 flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <img
                    src={staticInfo.imageUrl}
                    className="w-8 h-8 rounded-full"
                    alt="Token"
                  />
                  <div>
                    <h3 className="font-bold text-gray-900 dark:text-white">
                      Trade {staticInfo.symbol}
                    </h3>
                    <p className="text-xs text-gray-500">
                      ${Number(dynamicData?.priceUSD).toFixed(6)}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setIsTradeBoxOpen(false)}
                  className="p-2 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 rounded-full transition-colors"
                >
                  <FiX className="w-5 h-5 dark:text-white" />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto p-2">{renderTradeBox}</div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Mobile FAB (Trade Button) */}
      <AnimatePresence>
        {!isTradeBoxOpen && (
          <motion.button
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setIsTradeBoxOpen(true)}
            className="fixed bottom-6 right-6 lg:hidden z-30 h-14 px-6 bg-blue-600 text-white rounded-full shadow-lg shadow-blue-600/30 flex items-center gap-2 font-bold"
          >
            <FiPlus className="w-5 h-5" />
            Trade
          </motion.button>
        )}
      </AnimatePresence>

      {/* Token Selection Modal */}
      {showTokenSelectionModal && (
        <SelectTokenModal
          selectedToken={selectedAddress}
          setSelectedToken={handleTokenSelected}
          isOpen={showTokenSelectionModal}
          onClose={() => setShowTokenSelectionModal(false)}
        />
      )}
    </div>
  );
}
