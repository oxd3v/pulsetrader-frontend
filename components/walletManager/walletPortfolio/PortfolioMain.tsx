"use client";
import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  FiBarChart2,
  FiPieChart,
  FiShield,
  FiList,
  FiActivity,
  FiPlus,
  FiGlobe,
  FiCopy,
  FiRefreshCw,
  FiChevronDown,
  FiCheck,
  FiLayers,
  FiTrendingUp,
} from "react-icons/fi";
import { IoWallet } from "react-icons/io5";

import { chains } from "@/constants/common/chain";
import toast from "react-hot-toast";

import { OrderType } from "@/type/order";
import { ActivityType, UserType, WalletType } from "@/type/common";

import { getWalletBalance } from "@/lib/blockchain/balance";
import { fetchCodexWalletBalances } from "@/lib/oracle/codex";

import ChainSelection from "@/components/navbar/chainSelection";
import WalletOverview from "./walletOverview";
import MyTokenPortfolio from "./UserTokensList";
import OrderList from "@/components/order/dashboard/OrderList";
import ActivityModel from "@/components/activity/activityTable";
import Analytics from "@/components/walletManager/walletPortfolio/walletAnalytics";
import WalletSettings from "@/components/walletManager/walletPortfolio/walletSettings";
import PerpTab from "./PerpTab";
import CreationModel from "@/components/walletManager/modal/CreateWalletModel";
import { safeParseUnits } from "@/utility/handy";
import { PRECISION_DECIMALS } from "@/constants/common/utils";
import Service from "@/service/user-service";

interface PortfolioMainProps {
  user: UserType;
  chainId: number;
  setChainId: (chainId: number) => void;
  userOrders: OrderType[];
  userWallets: WalletType[];
  userHistories: ActivityType[];
  userConnectedWallet: unknown;
}

// Centralised shape — every consumer reads from this
export interface BalanceData {
  nativeBalance: string;
  holdingTokens: Array<Record<string, unknown>>;
  totalSpotUsd: string;
  totalPerpUsd: string;
  /** Raw perp balances keyed by DEX so child tabs never have to re-fetch */
  perpBalances: {
    asterdex: string;
    hyperliquid: string;
  };
  /** Order counts derived from userOrders for the selected wallet */
  orderSummary: {
    total: number;
    active: number;
    pending: number;
    opened: number;
  };
}

const EMPTY_BALANCE_DATA: BalanceData = {
  nativeBalance: "0",
  holdingTokens: [],
  totalSpotUsd: "0",
  totalPerpUsd: "0",
  perpBalances: { asterdex: "0", hyperliquid: "0" },
  orderSummary: { total: 0, active: 0, pending: 0, opened: 0 },
};

const TABS = [
  { id: "overview", label: "Overview", icon: FiPieChart, description: "Wallet snapshot, balances, and health checks." },
  { id: "holdings", label: "Holdings", icon: FiLayers, description: "Token balances for this wallet." },
  { id: "perp", label: "Perp", icon: FiTrendingUp, description: "Fund perp accounts and approve agents." },
  { id: "orders", label: "Orders", icon: FiList, description: "Live and pending automation orders." },
  { id: "activity", label: "Activity", icon: FiActivity, description: "Recent transfers and fills." },
  { id: "analytics", label: "Analytics", icon: FiBarChart2, description: "Historical balance and transfer patterns." },
  { id: "settings", label: "Settings", icon: FiShield, description: "Security and wallet preferences." },
] as const;

type TabId = typeof TABS[number]["id"];

export default function PortfolioMain(props: PortfolioMainProps) {
  const { user, chainId, setChainId, userOrders, userWallets } = props;

  const [activeTab, setActiveTab] = useState<TabId>("overview");
  const [isWalletDropdownOpen, setIsWalletDropdownOpen] = useState(false);
  const [isCreationModelOpen, setIsCreationModelOpen] = useState(false);
  const [selectedWallet, setSelectedWallet] = useState<WalletType | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [balanceData, setBalanceData] = useState<BalanceData>(EMPTY_BALANCE_DATA);

  const isInitialMount = useRef(true);
  const prevWalletRef = useRef<string | null>(null);
  const prevChainRef = useRef<number | null>(null);
  const fetchIdRef = useRef(0);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // ── Derived lists ──────────────────────────────────────────────────────────
  const filteredWallets = useMemo(
    () =>
      userWallets
        .filter((w) => (chainId === chains.Solana ? w.network === "SVM" : w.network === "EVM"))
        .filter((w) => !w.isPerpAgentWallet),
    [userWallets, chainId]
  );

  // ── Order summary for the selected wallet ─────────────────────────────────
  const walletOrderSummary = useMemo(() => {
    const orders = (userOrders || []).filter((o) => {
      const wId = typeof o.wallet === "object" ? o.wallet?._id : o.wallet;
      return wId?.toString() === selectedWallet?._id?.toString();
    });
    return orders.reduce(
      (acc, o) => {
        const s = String(o.orderStatus || "").toUpperCase();
        if (["PENDING", "OPENED", "PROCESSING"].includes(s) && o.isActive !== false) acc.active++;
        if (s === "PENDING") acc.pending++;
        if (s === "OPENED") acc.opened++;
        acc.total++;
        return acc;
      },
      { total: 0, active: 0, pending: 0, opened: 0 }
    );
  }, [selectedWallet?._id, userOrders]);

  // Keep balanceData.orderSummary in sync whenever orders or wallet changes
  // without triggering a full balance re-fetch
  useEffect(() => {
    setBalanceData((prev) => ({ ...prev, orderSummary: walletOrderSummary }));
  }, [walletOrderSummary]);

  // ── Main fetch ─────────────────────────────────────────────────────────────
  const handleSelectedWallet = useCallback(
    async (walletAddress: string, walletId: string) => {
      if (!walletAddress) return;
      const currentFetchId = ++fetchIdRef.current;
      setIsLoading(true);

      // Use allSettled so one failing API does not break the whole flow
      const results = await Promise.allSettled([
        fetchCodexWalletBalances({ walletAddress, chainId, limit: 100 }),
        getWalletBalance({ walletAddress, chainId }),
        Service.getPerpBalance({ walletAddress, exchange: "asterdex" }) as Promise<any>,
        Service.getPerpBalance({ walletAddress, exchange: "hyperliquid" }) as Promise<any>,
      ]);

      // Guard against stale requests
      if (currentFetchId !== fetchIdRef.current) {
        setIsLoading(false);
        return;
      }

      // Extract results with safe defaults
      const [walletInfoResult, nativeBalanceResult, asterdexResult, hyperResult] = results;

      const walletInfo = walletInfoResult.status === "fulfilled" ? walletInfoResult.value : [];
      const nativeBalance = nativeBalanceResult.status === "fulfilled" ? nativeBalanceResult.value : BigInt(0);
      const asterdexRes = asterdexResult.status === "fulfilled" ? asterdexResult.value : { balance: 0 };
      const hyperRes = hyperResult.status === "fulfilled" ? hyperResult.value : { balance: 0 };

      // Extract perp balances (same logic as before)
      const extractPerpBal = (res: any): string => {
        const raw = res?.availableValue ?? 0;
        return String(safeParseUnits(String(Number(raw)), PRECISION_DECIMALS));
      };
      const asterdexBal = extractPerpBal(asterdexRes);
      const hyperliquidBal = extractPerpBal(hyperRes);

      // Compute spot totals
      let totalSpotUsd = BigInt(0);
      let holdingTokens: Array<Record<string, unknown>> = [];
      if (walletInfo && Array.isArray(walletInfo)) {
        totalSpotUsd = walletInfo.reduce((acc: bigint, item: any) => {
          const balance = BigInt(item.balance || 0);
          const priceScaled = safeParseUnits(item.tokenPriceUsd || "0", PRECISION_DECIMALS);
          const decimals = item.token?.decimals || 18;
          return acc + (balance * priceScaled) / BigInt(10 ** decimals);
        }, BigInt(0));
        holdingTokens = walletInfo.filter((w: any) => w.tokenId !== `native:${chainId}`);
      }

      const totalPerpUsd = String(BigInt(asterdexBal) + BigInt(hyperliquidBal));

      setBalanceData({
        nativeBalance: nativeBalance.toString(),
        holdingTokens,
        totalSpotUsd: totalSpotUsd.toString(),
        totalPerpUsd,
        perpBalances: {
          asterdex: asterdexBal,
          hyperliquid: hyperliquidBal,
        },
        orderSummary: walletOrderSummary,
      });

      setIsLoading(false);
    },
    [chainId] // walletOrderSummary is handled separately
  );

  // ── Wallet selection helpers ───────────────────────────────────────────────
  const handleWalletChange = useCallback((wallet: WalletType) => {
    setSelectedWallet(wallet);
    setIsWalletDropdownOpen(false);
    setBalanceData(EMPTY_BALANCE_DATA);
  }, []);

  // Auto-select first wallet when the filtered list changes
  useEffect(() => {
    if (filteredWallets.length > 0) {
      const stillValid = selectedWallet?._id && filteredWallets.some((w) => w._id === selectedWallet._id);
      if (!stillValid) setSelectedWallet(filteredWallets[0]);
    } else {
      setSelectedWallet(null);
    }
  }, [filteredWallets]);

  // Re-fetch whenever wallet address or chainId changes
  useEffect(() => {
    if (isInitialMount.current) { isInitialMount.current = false; return; }
    const walletChanged = selectedWallet?.address !== prevWalletRef.current;
    const chainChanged = chainId !== prevChainRef.current;
    if (!walletChanged && !chainChanged) return;
    prevWalletRef.current = selectedWallet?.address ?? null;
    prevChainRef.current = chainId;
    if (selectedWallet?.address) {
      handleSelectedWallet(selectedWallet.address, selectedWallet._id);
    } else {
      setBalanceData(EMPTY_BALANCE_DATA);
    }
  }, [selectedWallet?.address, chainId, handleSelectedWallet]);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsWalletDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  // ── Derived display values ─────────────────────────────────────────────────
  const currentTab = TABS.find((t) => t.id === activeTab) || TABS[0];
  const networkLabel = chainId === chains.Solana ? "Solana" : "EVM";
  const isEVM = chainId !== chains.Solana;

  const totalPortfolioUsd = useMemo(
    () => Number(balanceData.totalSpotUsd || "0") + Number(balanceData.totalPerpUsd || "0"),
    [balanceData.totalSpotUsd, balanceData.totalPerpUsd]
  );

  const portfolioDisplay = totalPortfolioUsd;

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="h-full w-full overflow-y-auto overflow-x-hidden bg-[#f5f5f7] dark:bg-[#0a0a0c] text-black dark:text-white font-sans">

      {/* ── TOP HEADER ───────────────────────────────────── */}
      <header className="sticky top-0 z-30 bg-white/80 dark:bg-[#0a0a0c]/80 backdrop-blur-xl border-b border-black/5 dark:border-white/5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between gap-3">
          {/* Wallet selector */}
          <div className="relative flex-1 min-w-0 max-w-xs" ref={dropdownRef}>
            <button
              onClick={() => setIsWalletDropdownOpen(!isWalletDropdownOpen)}
              className="flex items-center gap-2 w-full bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 px-3 py-2 rounded-xl transition-colors"
            >
              <div className={`w-7 h-7 rounded-lg flex items-center justify-center text-white text-sm flex-shrink-0 ${isEVM ? "bg-blue-500" : "bg-purple-500"}`}>
                <IoWallet size={14} />
              </div>
              <div className="flex-1 min-w-0 text-left">
                <p className="text-xs font-bold text-black dark:text-white truncate">
                  {selectedWallet ? `Wallet ${selectedWallet._id.slice(0, 6)}` : "No Wallet"}
                </p>
                {selectedWallet && (
                  <p className="text-[10px] text-gray-500 font-mono truncate">
                    {selectedWallet.address.slice(0, 8)}…{selectedWallet.address.slice(-4)}
                  </p>
                )}
              </div>
              <FiChevronDown size={14} className={`text-gray-400 flex-shrink-0 transition-transform ${isWalletDropdownOpen ? "rotate-180" : ""}`} />
            </button>

            <AnimatePresence>
              {isWalletDropdownOpen && (
                <motion.div
                  initial={{ opacity: 0, y: 6, scale: 0.97 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 6, scale: 0.97 }}
                  transition={{ duration: 0.15 }}
                  className="absolute top-full mt-1 left-0 w-64 bg-white dark:bg-[#18181c] border border-black/10 dark:border-white/10 rounded-2xl shadow-2xl overflow-hidden z-50"
                >
                  <div className="p-1.5 overflow-y-auto max-h-[300px] scrollbar-thin scrollbar-thumb-gray-200 dark:scrollbar-thumb-gray-700">
                    {filteredWallets.length === 0 && (
                      <p className="text-xs text-gray-500 text-center py-4">No wallets on this network</p>
                    )}
                    {filteredWallets.map((wallet) => {
                      const isActive = selectedWallet?._id === wallet._id;
                      return (
                        <button
                          key={wallet._id}
                          onClick={() => handleWalletChange(wallet)}
                          className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-colors ${isActive ? "bg-blue-500/10 text-blue-600 dark:text-blue-400" : "hover:bg-black/5 dark:hover:bg-white/5"}`}
                        >
                          <IoWallet size={16} className={isActive ? "text-blue-500" : "text-gray-400"} />
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-bold">Wallet {wallet._id.slice(0, 6)}</p>
                            <p className="text-[10px] font-mono text-gray-500 truncate">{wallet.address.slice(0, 14)}…</p>
                          </div>
                          {isActive && <FiCheck size={13} className="text-blue-500 flex-shrink-0" />}
                        </button>
                      );
                    })}
                  </div>
                  <div className="border-t border-black/5 dark:border-white/5 p-1.5">
                    <button
                      onClick={() => { setIsWalletDropdownOpen(false); setIsCreationModelOpen(true); }}
                      className="w-full flex items-center gap-2 px-3 py-2.5 rounded-xl text-xs font-bold text-blue-600 dark:text-blue-400 hover:bg-blue-500/10 transition-colors"
                    >
                      <FiPlus size={14} /> Add New Wallet
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2 flex-shrink-0">
            <div className="">
              <ChainSelection selectChain={chainId} setSelectChain={setChainId} pathName={null} />
            </div>
            <button
              onClick={() => selectedWallet?.address && handleSelectedWallet(selectedWallet.address, selectedWallet._id)}
              disabled={!selectedWallet || isLoading}
              className="p-2 rounded-xl bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 transition-colors disabled:opacity-40"
              title="Refresh"
            >
              <FiRefreshCw size={14} className={`text-gray-500 ${isLoading ? "animate-spin" : ""}`} />
            </button>
            <button
              onClick={() => setIsCreationModelOpen(true)}
              className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold px-3 py-2 rounded-xl transition-colors shadow-sm"
            >
              <FiPlus size={13} />
              <span className="hidden sm:inline">Wallet</span>
            </button>
          </div>
        </div>
      </header>

      {/* ── MAIN LAYOUT ──────────────────────────────────── */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 sm:py-6 flex flex-col lg:flex-row gap-4 lg:gap-6">

        {/* ── SIDEBAR NAV ─────────────────────────────── */}
        <aside className="w-full lg:w-52 xl:w-56 flex-shrink-0">
          {/* Mobile: horizontal scroll tabs */}
          <div className="lg:hidden bg-white dark:bg-[#13131a] border border-black/5 dark:border-white/5 rounded-2xl p-1.5 flex gap-1 overflow-x-auto no-scrollbar">
            {TABS.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex-shrink-0 flex flex-col items-center gap-1 px-3 py-2 rounded-xl text-[10px] font-bold uppercase tracking-wide transition-all ${isActive
                    ? "bg-blue-600 text-white"
                    : "text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-black/5 dark:hover:bg-white/5"
                    }`}
                >
                  <Icon size={14} />
                  {tab.label}
                </button>
              );
            })}
          </div>

          {/* Desktop: vertical sidebar */}
          <nav className="hidden lg:block bg-white dark:bg-[#13131a] border border-black/5 dark:border-white/5 rounded-2xl p-2 space-y-0.5 sticky top-20">
            {TABS.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all ${isActive
                    ? "bg-blue-600 text-white shadow-sm"
                    : "text-gray-500 dark:text-gray-400 hover:text-black dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/5"
                    }`}
                >
                  <Icon size={15} className={isActive ? "text-white" : ""} />
                  {tab.label}
                </button>
              );
            })}

            {/* Wallet copy shortcut */}
            {selectedWallet && (
              <div className="mt-3 pt-3 border-t border-black/5 dark:border-white/5 px-2">
                <button
                  onClick={() => { navigator.clipboard.writeText(selectedWallet.address); toast.success("Copied!"); }}
                  className="w-full flex items-center gap-2 text-[10px] text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
                >
                  <FiCopy size={11} />
                  <span className="font-mono truncate">{selectedWallet.address.slice(0, 12)}…</span>
                </button>
              </div>
            )}
          </nav>
        </aside>

        {/* ── CONTENT AREA ────────────────────────────── */}
        <main className="flex-1 min-w-0 pb-12">
          {/* Tab header strip */}
          {selectedWallet && (
            <div className="mb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h1 className="text-xl font-black text-black dark:text-white">{currentTab.label}</h1>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{currentTab.description}</p>
              </div>
              {/* Mobile quick stats */}
              {/* <div className="sm:hidden flex gap-2">
                <div className="bg-white dark:bg-[#13131a] border border-black/5 dark:border-white/5 rounded-xl px-3 py-2 flex-1 text-center">
                  <p className="text-[9px] font-bold uppercase tracking-widest text-gray-500">Portfolio</p>
                  <p className="text-sm font-black">${portfolioDisplay}</p>
                </div>
                <div className="bg-white dark:bg-[#13131a] border border-black/5 dark:border-white/5 rounded-xl px-3 py-2 flex-1 text-center">
                  <p className="text-[9px] font-bold uppercase tracking-widest text-gray-500">Tokens</p>
                  <p className="text-sm font-black">{balanceData.holdingTokens.length}</p>
                </div>
              </div> */}
            </div>
          )}

          {/* Content */}
          <AnimatePresence mode="wait">
            {selectedWallet ? (
              <motion.div
                key={`${activeTab}-${selectedWallet._id}`}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.18 }}
              >
                {activeTab === "overview" && (
                  <WalletOverview
                    selectedWallet={selectedWallet}
                    balanceData={balanceData}
                    chainId={chainId}
                    user={user}
                  />
                )}
                {activeTab === "holdings" && (
                  <MyTokenPortfolio
                    holdingTokens={balanceData.holdingTokens}
                    walletAddress={selectedWallet.address}
                    walletId={selectedWallet._id}
                    chainId={chainId}
                    user={user}
                  />
                )}
                {activeTab === "perp" && (
                  <PerpTab
                    selectedWallet={selectedWallet}
                    perpBalances={balanceData.perpBalances}
                    onRefresh={() => handleSelectedWallet(selectedWallet.address, selectedWallet._id)}
                    user={user}
                  />
                )}
                {activeTab === "orders" && (
                  <OrderList network={chainId} userOrders={userOrders} orderCategory={'all'} walletAddress={selectedWallet.address} walletId={selectedWallet._id} isConnected={true} />
                )}
                {activeTab === "activity" && (
                  <ActivityModel user={user} walletAddress={selectedWallet.address} walletId={selectedWallet._id} />
                )}
                {activeTab === "analytics" && (
                  <Analytics address={selectedWallet.address} chainId={chainId} />
                )}
                {activeTab === "settings" && (
                  <WalletSettings wallet={selectedWallet} />
                )}
              </motion.div>
            ) : (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex flex-col items-center justify-center min-h-[400px] text-center bg-white dark:bg-[#13131a] border border-black/5 dark:border-white/5 rounded-2xl px-6 py-12"
              >
                <div className="w-14 h-14 rounded-2xl bg-gray-100 dark:bg-white/5 flex items-center justify-center mb-4">
                  <FiGlobe size={24} className="text-gray-400" />
                </div>
                <h3 className="text-lg font-bold text-gray-700 dark:text-gray-300">No wallets on {networkLabel}</h3>
                <p className="text-sm text-gray-500 dark:text-gray-500 mt-2 max-w-sm">
                  Create a wallet to start managing balances, tokens, and automated orders.
                </p>
                <button
                  onClick={() => setIsCreationModelOpen(true)}
                  className="mt-5 flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white text-sm font-bold px-5 py-2.5 rounded-xl transition-colors"
                >
                  <FiPlus size={15} /> Create Wallet
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </main>
      </div>

      {/* Modals */}
      {isCreationModelOpen && (
        <CreationModel
          isOpen={isCreationModelOpen}
          onClose={() => setIsCreationModelOpen(false)}
        />
      )}
    </div>
  );
}