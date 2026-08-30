"use client";
import { useEffect, useState, useCallback, useMemo, useRef } from "react";
import Link from "next/link";
import { fetchCodexFilterTokens } from "@/lib/oracle/codex";
import { motion, AnimatePresence } from "framer-motion";
import { formateDuration } from "@/utility/handy";
import {
  FiFilter,
  FiSearch,
  FiArrowUp,
  FiArrowDown,
  FiActivity,
  FiDroplet,
  FiClock,
  FiBarChart2,
  FiArrowUpRight,
  FiArrowDownLeft,
  FiRefreshCw,
} from "react-icons/fi";
import { BiRocket, BiCoinStack } from "react-icons/bi";
import { useStore } from "@/store/useStore";
import { useShallow } from "zustand/shallow";

import RenderTokenFundingModal from "@/components/walletManager/modal/PulseWalletFundingModal";

import { formatPrice, formatCompactNumber } from "@/utility/handy";





export default function TokenExplorer({
  handleTradeNow,
}: {
  handleTradeNow: (tokenAddress: string) => void;
}) {
  const { network, user } = useStore(
    useShallow((state: any) => ({
      network: state.network,
      user: state.user,
    })),
  );

  // --- State ---
  const [tokens, setTokens] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [limit] = useState(20);
  const [offset, setOffset] = useState(0);
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [selectedToken, setSelectedToken] = useState<any>(null);

  // Sorting State
  const [sortConfig, setSortConfig] = useState<{
    key: string;
    direction: "ASC" | "DESC";
  }>({
    key: "trendingScore24",
    direction: "DESC",
  });

  // Filters State (initial values)
  const initialFilters = {
    minLiquidity: 1000,
    minVolume: 0,
    maxAge: 0,
    minChange: 0,
  };
  const [filters, setFilters] = useState(initialFilters);

  // --- Debounce search term ---
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 400);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  // --- Fetch Logic (accepts explicit offset) ---
  const fetchTokens = useCallback(
    async (isAppend = false, overrideOffset?: number) => {
      setIsLoading(true);
      try {
        // Use overrideOffset if provided, otherwise current offset state
        const currentOffset = overrideOffset !== undefined ? overrideOffset : offset;

        // Build API filters
        const apiFilters: any = {
          network: [network],
          liquidity: { gte: filters.minLiquidity },
          volume24: { gte: filters.minVolume },
        };

        if (filters.minChange !== 0) {
          apiFilters.change24 = { gte: filters.minChange };
        }

        if (filters.maxAge > 0) {
          const cutoff = Math.floor(Date.now() / 1000) - filters.maxAge * 3600;
          apiFilters.createdAt = { gte: cutoff };
        }

        const variables = {
          filters: apiFilters,
          creatorAddress: null,
          statsType: "FILTERED",
          limit,
          offset: currentOffset,
          rankings: [
            { attribute: sortConfig.key, direction: sortConfig.direction },
          ],
          ...(debouncedSearchTerm && { phrase: debouncedSearchTerm }),
        };

        const data = await fetchCodexFilterTokens({ variables });

        if (isAppend) {
          setTokens((prev) => [...prev, ...data]);
        } else {
          setTokens(data || []);
        }
      } catch (error) {
        console.error("Failed to fetch tokens", error);
      } finally {
        setIsLoading(false);
      }
    },
    [network, limit, offset, filters, sortConfig, debouncedSearchTerm]
  );

  // Reset offset and fetch when filters/search/sort change
  useEffect(() => {
    setOffset(0);
    fetchTokens(false, 0); // explicitly fetch from offset 0
  }, [network, debouncedSearchTerm, filters, sortConfig, fetchTokens]);

  // --- Handlers ---
  const handleSort = useCallback((key: string) => {
    setSortConfig((prev) => ({
      key,
      direction: prev.key === key && prev.direction === "DESC" ? "ASC" : "DESC",
    }));
  }, []);



  const handleResetFilters = useCallback(() => {
    setFilters(initialFilters);
  }, []);

  const handleLoadMore = useCallback(() => {
    const newOffset = offset + limit;
    setOffset(newOffset);
    fetchTokens(true, newOffset);
  }, [offset, limit, fetchTokens]);




  return (
    <div className="w-full min-h-screen bg-gray-50 dark:bg-[#0d1117] text-gray-900 dark:text-white transition-colors duration-200">
      <div className="max-w-[1600px] mx-auto p-4 lg:p-6 flex flex-col h-full">
        {/* --- Header & Controls --- */}
        <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-black tracking-tight flex items-center gap-2">
              <FiActivity className="text-blue-600 dark:text-blue-500" />
              Market Screener
            </h1>
            <p className="text-xs text-gray-500 font-medium mt-1">
              Real-time analytics for{" "}
              {network === 1
                ? "Ethereum"
                : network === 139
                  ? "Solana"
                  : "Avalanche"}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
            {/* Search */}
            <div className="relative flex-grow md:flex-grow-0 md:w-80 group">
              <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-blue-500 transition-colors" />
              <input
                type="text"
                placeholder="Search symbol, pair, or address..."
                className="w-full bg-white dark:bg-[#161b22] border border-gray-200 dark:border-white/10 rounded-xl py-2.5 pl-10 pr-4 text-sm outline-none focus:ring-2 focus:ring-blue-500/50 transition-all shadow-sm"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            {/* Filter Toggle */}
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`p-2.5 rounded-xl border transition-all flex items-center gap-2 text-sm font-bold ${showFilters
                ? "bg-blue-50 dark:bg-blue-500/10 border-blue-200 dark:border-blue-500/20 text-blue-600 dark:text-blue-400"
                : "bg-white dark:bg-[#161b22] border-gray-200 dark:border-white/10 hover:bg-gray-50 dark:hover:bg-white/5"
                }`}
            >
              <FiFilter />
              <span className="hidden sm:inline">Filters</span>
            </button>

            <button
              onClick={() => fetchTokens(false, 0)}
              className="p-2.5 bg-white dark:bg-[#161b22] border border-gray-200 dark:border-white/10 rounded-xl hover:bg-gray-50 dark:hover:bg-white/5 transition-colors text-gray-500"
            >
              <FiRefreshCw className={isLoading ? "animate-spin" : ""} />
            </button>
          </div>
        </header>

        {/* --- Filter Panel (Collapsible) --- */}
        <AnimatePresence>
          {showFilters && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden mb-6"
            >
              <div className="bg-white dark:bg-[#161b22] border border-gray-200 dark:border-white/10 rounded-2xl p-6 shadow-sm grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6">
                {/* Liquidity Filter */}
                <div className="space-y-2">
                  <label className="text-[10px] uppercase font-bold text-gray-500 tracking-wider">
                    Min Liquidity
                  </label>
                  <div className="relative">
                    <FiDroplet className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <select
                      className="w-full bg-gray-50 dark:bg-black/20 border border-gray-200 dark:border-white/10 rounded-lg py-2 pl-9 pr-3 text-sm outline-none focus:border-blue-500"
                      value={filters.minLiquidity}
                      onChange={(e) =>
                        setFilters({
                          ...filters,
                          minLiquidity: Number(e.target.value),
                        })
                      }
                    >
                      <option value="0">Any</option>
                      <option value="1000">$1,000+</option>
                      <option value="10000">$10,000+</option>
                      <option value="50000">$50,000+</option>
                      <option value="100000">$100,000+</option>
                    </select>
                  </div>
                </div>

                {/* Volume Filter */}
                <div className="space-y-2">
                  <label className="text-[10px] uppercase font-bold text-gray-500 tracking-wider">
                    Min 24h Volume
                  </label>
                  <div className="relative">
                    <FiBarChart2 className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <select
                      className="w-full bg-gray-50 dark:bg-black/20 border border-gray-200 dark:border-white/10 rounded-lg py-2 pl-9 pr-3 text-sm outline-none focus:border-blue-500"
                      value={filters.minVolume}
                      onChange={(e) =>
                        setFilters({
                          ...filters,
                          minVolume: Number(e.target.value),
                        })
                      }
                    >
                      <option value="0">Any</option>
                      <option value="1000">$1,000+</option>
                      <option value="10000">$10,000+</option>
                      <option value="100000">$100,000+</option>
                    </select>
                  </div>
                </div>

                {/* Age Filter */}
                <div className="space-y-2">
                  <label className="text-[10px] uppercase font-bold text-gray-500 tracking-wider">
                    Token Age
                  </label>
                  <div className="relative">
                    <FiClock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <select
                      className="w-full bg-gray-50 dark:bg-black/20 border border-gray-200 dark:border-white/10 rounded-lg py-2 pl-9 pr-3 text-sm outline-none focus:border-blue-500"
                      value={filters.maxAge}
                      onChange={(e) =>
                        setFilters({
                          ...filters,
                          maxAge: Number(e.target.value),
                        })
                      }
                    >
                      <option value="0">Any Time</option>
                      <option value="1">New (&lt; 1h)</option>
                      <option value="24">Recent (&lt; 24h)</option>
                      <option value="168">This Week (&lt; 7d)</option>
                    </select>
                  </div>
                </div>

                {/* Reset Button */}
                <div className="flex items-end">
                  <button
                    onClick={handleResetFilters}
                    className="w-full py-2 bg-gray-100 dark:bg-white/5 hover:bg-gray-200 dark:hover:bg-white/10 text-gray-600 dark:text-gray-300 rounded-lg text-sm font-bold transition-colors"
                  >
                    Reset All
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* --- Main Data Table (Desktop) --- */}
        <div className="hidden md:block flex-1 overflow-hidden bg-white dark:bg-[#161b22] border border-gray-200 dark:border-white/5 rounded-2xl shadow-sm flex flex-col">
          <div className="overflow-x-auto custom-scrollbar flex-1">
            <table className="w-full text-left border-collapse">
              <thead className="bg-gray-50 dark:bg-black/20 sticky top-0 z-10 backdrop-blur-md">
                <tr className="text-[10px] uppercase tracking-wider text-gray-500 font-bold border-b border-gray-200 dark:border-white/5">
                  <SortableHeader
                    label="Token Name"
                    sortKey="name"
                    currentSort={sortConfig}
                    onSort={() => { }} // Name is not sortable in this table, keep as is
                    className="pl-6"
                  />
                  <SortableHeader
                    label="Price"
                    sortKey="priceUSD"
                    currentSort={sortConfig}
                    onSort={handleSort}
                    align="right"
                  />
                  <SortableHeader
                    label="Age"
                    sortKey="createdAt"
                    currentSort={sortConfig}
                    onSort={handleSort}
                    align="right"
                  />
                  <SortableHeader
                    label="Txns (24h)"
                    sortKey="txnCount24"
                    currentSort={sortConfig}
                    onSort={handleSort}
                    align="right"
                  />
                  <SortableHeader
                    label="Volume"
                    sortKey="volume24"
                    currentSort={sortConfig}
                    onSort={handleSort}
                    align="right"
                  />
                  <SortableHeader
                    label="Liquidity"
                    sortKey="liquidity"
                    currentSort={sortConfig}
                    onSort={handleSort}
                    align="right"
                  />
                  <SortableHeader
                    label="FDV"
                    sortKey="marketCap"
                    currentSort={sortConfig}
                    onSort={handleSort}
                    align="right"
                  />
                  <SortableHeader
                    label="24h Change"
                    sortKey="change24"
                    currentSort={sortConfig}
                    onSort={handleSort}
                    align="right"
                  />
                  <th className="py-4 px-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-white/5">
                {isLoading && tokens.length === 0
                  ? [...Array(10)].map((_, i) => <SkeletonRow key={i} />)
                  : tokens.map((token: any) => (
                    <tr
                      key={token.token.address} // Use unique address as key
                      className="hover:bg-blue-50/50 dark:hover:bg-white/[0.02] transition-colors group"
                    >
                      {/* Token Identity */}
                      <td className="py-4 px-6">
                        <div className="flex items-center gap-3">
                          <div className="relative">
                            <img
                              src={
                                token.token.imageSmallUrl || "/tokenLogo.png"
                              }
                              className="w-10 h-10 rounded-full border border-gray-100 dark:border-white/10"
                              alt={token.token.symbol}
                            />
                            <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-gray-100 dark:bg-[#161b22] rounded-full flex items-center justify-center">
                              <div
                                className={`w-2 h-2 rounded-full ${network === 1
                                  ? "bg-indigo-500"
                                  : network === 139
                                    ? "bg-purple-500"
                                    : "bg-red-500"
                                  }`}
                              />
                            </div>
                          </div>
                          <div className="flex flex-col">
                            <span className="font-bold text-sm text-gray-900 dark:text-white flex items-center gap-1.5">
                              {token.token.symbol}
                              {token.token.isScam && (
                                <span className="text-[8px] bg-red-500 text-white px-1 rounded uppercase">
                                  Scam
                                </span>
                              )}
                            </span>
                            <span className="text-xs text-gray-500 font-mono">
                              {token.token.name}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Price */}
                      <td className="py-4 px-6 text-right font-mono text-sm font-medium text-gray-900 dark:text-gray-200">
                        {formatPrice(token.priceUSD)}
                      </td>

                      {/* Age */}
                      <td className="py-4 px-6 text-right text-xs text-gray-500 font-medium">
                        {formateDuration(token.createdAt)}
                      </td>

                      {/* Txns */}
                      <td className="py-4 px-6 text-right text-sm text-gray-600 dark:text-gray-400">
                        {formatCompactNumber(token.txnCount24 || 0)}
                      </td>

                      {/* Volume */}
                      <td className="py-4 px-6 text-right text-sm text-gray-600 dark:text-gray-400">
                        {formatCompactNumber(token.volume24 || 0)}
                      </td>

                      {/* Liquidity */}
                      <td className="py-4 px-6 text-right text-sm text-gray-600 dark:text-gray-400">
                        {formatCompactNumber(token.liquidity || 0)}
                      </td>

                      {/* FDV/Mkt Cap */}
                      <td className="py-4 px-6 text-right text-sm text-gray-600 dark:text-gray-400">
                        {formatCompactNumber(token.marketCap || 0)}
                      </td>

                      {/* 24h Change */}
                      <td className="py-4 px-6 text-right">
                        <div
                          className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-bold ${token.change24 >= 0
                            ? "bg-emerald-100 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
                            : "bg-red-100 dark:bg-red-500/10 text-red-700 dark:text-red-400"
                            }`}
                        >
                          {token.change24 >= 0 ? (
                            <FiArrowUp />
                          ) : (
                            <FiArrowDown />
                          )}
                          {Math.abs(token.change24 || 0).toFixed(2)}%
                        </div>
                      </td>

                      {/* Actions */}
                      <td className="py-4 px-6 text-right">
                        <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">

                          <button
                            onClick={() => setSelectedToken(token.token)}
                            className="p-2 text-gray-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-500/10 rounded-lg transition-colors"
                            title="Fund token"
                          >
                            <div className="flex -space-x-1">
                              <FiArrowUpRight className="w-4 h-4" />
                              <FiArrowDownLeft className="w-4 h-4" />
                            </div>
                          </button>
                          <Link
                            href={`/strategy/spot/${token.token.address}`}
                            className="p-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg shadow-sm transition-all"
                            title="Trade now"
                          >
                            <BiRocket size={18} />
                          </Link>
                        </div>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* --- Mobile Card View (Hidden on Desktop) --- */}
        <div className="md:hidden space-y-3">
          {tokens.map((token: any) => (
            <div
              key={token.token.address} // Use unique address as key
              className="bg-white dark:bg-[#161b22] border border-gray-200 dark:border-white/5 rounded-2xl p-4 shadow-sm active:scale-[0.99] transition-transform"
            >
              <div className="flex justify-between items-start mb-3">
                <div className="flex items-center gap-3">
                  <img
                    src={token.token.imageSmallUrl || "/tokenLogo.png"}
                    className="w-10 h-10 rounded-full bg-gray-100 dark:bg-black"
                    alt={token.token.symbol}
                  />
                  <div>
                    <h3 className="font-bold text-gray-900 dark:text-white">
                      {token.token.symbol}
                    </h3>
                    <p className="text-xs text-gray-500">{token.token.name}</p>
                  </div>
                </div>
                <div
                  className={`px-2 py-1 rounded-lg text-xs font-bold ${token.change24 >= 0
                    ? "bg-emerald-100 dark:bg-emerald-500/10 text-emerald-600"
                    : "bg-red-100 dark:bg-red-500/10 text-red-600"
                    }`}
                >
                  {token.change24 >= 0 ? "+" : ""}
                  {Number(token.change24).toFixed(2)}%
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <p className="text-[10px] uppercase text-gray-400 font-bold mb-0.5">
                    Price
                  </p>
                  <p className="font-mono text-sm text-gray-900 dark:text-white">
                    {formatPrice(token.priceUSD)}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] uppercase text-gray-400 font-bold mb-0.5">
                    Liquidity
                  </p>
                  <p className="font-mono text-sm text-gray-900 dark:text-white">
                    {formatCompactNumber(token.liquidity)}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] uppercase text-gray-400 font-bold mb-0.5">
                    Volume (24h)
                  </p>
                  <p className="font-mono text-sm text-gray-900 dark:text-white">
                    {formatCompactNumber(token.volume24)}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] uppercase text-gray-400 font-bold mb-0.5">
                    Mkt Cap
                  </p>
                  <p className="font-mono text-sm text-gray-900 dark:text-white">
                    {formatCompactNumber(token.marketCap)}
                  </p>
                </div>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => handleTradeNow(token.token.address)}
                  className="flex-1 py-3 bg-blue-600 text-white rounded-xl font-bold text-sm"
                >
                  Trade
                </button>
                <button
                  onClick={() => setSelectedToken(token.token)}
                  className="px-4 py-3 bg-gray-100 dark:bg-white/5 text-gray-600 dark:text-gray-300 rounded-xl font-bold"
                >
                  <BiCoinStack size={20} />
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Load More */}
        <div className="mt-6 flex justify-center pb-8">
          <button
            onClick={handleLoadMore}
            disabled={isLoading}
            className="px-8 py-3 bg-white dark:bg-[#161b22] border border-gray-200 dark:border-white/10 rounded-xl text-sm font-bold text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/5 transition-all shadow-sm"
          >
            {isLoading ? "Loading..." : "Load More Assets"}
          </button>
        </div>

        {/* --- Portal Modal --- */}
        {selectedToken && (
          <RenderTokenFundingModal
            isOpen={!!selectedToken}
            onClose={() => setSelectedToken(null)}
            wallet={user?.account}
            tokenInfo={selectedToken}
            chainId={network === 139 ? 139 : 1}
            isNative={false}
            user={user}
          />
        )}
      </div>
    </div>
  );
}

// --- Sub-Components ---

const SortableHeader = ({
  label,
  sortKey,
  currentSort,
  onSort,
  align = "left",
  className = "",
}: any) => {
  const isActive = currentSort.key === sortKey;
  return (
    <th
      className={`py-4 px-6 cursor-pointer hover:text-blue-500 transition-colors select-none ${className}`}
      onClick={() => onSort(sortKey)}
    >
      <div
        className={`flex items-center gap-1 ${align === "right" ? "justify-end" : "justify-start"
          }`}
      >
        {label}
        <div className="flex flex-col text-[8px] leading-[8px]">
          <FiArrowUp
            className={`${isActive && currentSort.direction === "ASC"
              ? "text-blue-500"
              : "text-gray-300"
              }`}
          />
          <FiArrowDown
            className={`${isActive && currentSort.direction === "DESC"
              ? "text-blue-500"
              : "text-gray-300"
              }`}
          />
        </div>
      </div>
    </th>
  );
};

const SkeletonRow = () => (
  <tr className="animate-pulse border-b border-gray-100 dark:border-white/5">
    <td className="py-4 px-6">
      <div className="h-10 w-40 bg-gray-200 dark:bg-white/5 rounded-lg" />
    </td>
    <td className="py-4 px-6">
      <div className="h-4 w-20 bg-gray-200 dark:bg-white/5 rounded ml-auto" />
    </td>
    <td className="py-4 px-6">
      <div className="h-4 w-16 bg-gray-200 dark:bg-white/5 rounded ml-auto" />
    </td>
    <td className="py-4 px-6">
      <div className="h-4 w-24 bg-gray-200 dark:bg-white/5 rounded ml-auto" />
    </td>
    <td className="py-4 px-6">
      <div className="h-4 w-24 bg-gray-200 dark:bg-white/5 rounded ml-auto" />
    </td>
    <td className="py-4 px-6">
      <div className="h-4 w-24 bg-gray-200 dark:bg-white/5 rounded ml-auto" />
    </td>
    <td className="py-4 px-6">
      <div className="h-4 w-24 bg-gray-200 dark:bg-white/5 rounded ml-auto" />
    </td>
    <td className="py-4 px-6">
      <div className="h-8 w-16 bg-gray-200 dark:bg-white/5 rounded ml-auto" />
    </td>
    <td className="py-4 px-6">
      <div className="h-8 w-8 bg-gray-200 dark:bg-white/5 rounded ml-auto" />
    </td>
  </tr>
);