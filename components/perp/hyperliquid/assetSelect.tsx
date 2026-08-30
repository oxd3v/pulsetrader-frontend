"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { AiOutlineSearch, AiOutlineStar, AiFillStar, AiOutlineClose } from "react-icons/ai";
import { SymbolData, useHyperliquidSymbols } from "@/hooks/useHyperLiquidHooks/useHyperliquidSymbol";
import { CATEGORIES, normalizeCoin, getCryptoIcon } from "@/utility/perpUtils";
import { toFiniteNumber, formatCompactNumber, formatPrice } from "@/utility/handy";

interface AssetSelectProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectSymbol: (symbol: string) => void;
  currentSymbol?: string;
}

const AssetSelect: React.FC<AssetSelectProps> = ({
  isOpen,
  onClose,
  onSelectSymbol,
  currentSymbol = "",
}) => {
  const {
    filteredSymbols,
    loading,
    error,
    searchQuery,
    setSearchQuery,
    category,
    setCategory,
    tab,
    setTab,
  } = useHyperliquidSymbols({ enabled: isOpen });

  const [favorites, setFavorites] = useState<Set<string>>(() => {
    if (typeof window === "undefined") return new Set();
    const saved = window.localStorage.getItem("hyperliquid_favorites");
    if (!saved) return new Set();
    try {
      const parsedFavorites = JSON.parse(saved) as string[];
      return new Set(parsedFavorites);
    } catch {
      return new Set();
    }
  });
  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    localStorage.setItem("hyperliquid_favorites", JSON.stringify(Array.from(favorites)));
  }, [favorites]);

  const toggleFavorite = useCallback((symbol: string) => {
    setFavorites((previous) => {
      const next = new Set(previous);
      if (next.has(symbol)) {
        next.delete(symbol);
      } else {
        next.add(symbol);
      }
      return next;
    });
  }, []);

  const handleSelectSymbol = useCallback(
    (symbol: string) => {
      onSelectSymbol(symbol);
      onClose();
    },
    [onClose, onSelectSymbol]
  );

  useEffect(() => {
    if (isOpen && searchInputRef.current) {
      setTimeout(() => searchInputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  const displaySymbols = useMemo(() => {
    if (!filteredSymbols || !Array.isArray(filteredSymbols)) return [];
    if (category === "Favorites") {
      return filteredSymbols.filter((symbolItem) => favorites.has(symbolItem.symbol));
    }
    return filteredSymbols;
  }, [category, favorites, filteredSymbols]);

  const normalizedCurrentSymbol = currentSymbol.toUpperCase();

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-20">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/50"
          />

          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.2 }}
            className="relative bg-gray-950 rounded-lg border border-gray-800 w-full max-w-6xl mx-4 max-h-[80vh] overflow-hidden flex flex-col"
          >
            <div className="sticky top-0 bg-gray-950 border-b border-gray-800 p-4 z-40">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-white">Select Trading Pair</h2>
                <button
                  onClick={onClose}
                  className="p-1 hover:bg-gray-900 rounded-lg transition-colors"
                >
                  <AiOutlineClose className="w-6 h-6 text-gray-400" />
                </button>
              </div>

              <div className="relative mb-4">
                <AiOutlineSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                <input
                  ref={searchInputRef}
                  type="text"
                  placeholder="Search symbol or name..."
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-gray-900 border border-gray-800 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-gray-700 focus:ring-1 focus:ring-gray-700"
                />
              </div>

              <div className="flex gap-4 mb-4 border-b border-gray-800 pb-4">
                <button
                  onClick={() => setTab("Futures")}
                  className={`font-medium transition-colors ${tab === "Futures"
                      ? "text-white border-b-2 border-blue-500 -mb-4"
                      : "text-gray-400 hover:text-gray-300"
                    }`}
                >
                  Futures
                </button>
              </div>

              <div className="flex gap-2 overflow-x-auto pb-2">
                {CATEGORIES.map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setCategory(cat)}
                    className={`px-3 py-1 rounded-lg text-sm whitespace-nowrap transition-colors ${category === cat
                        ? "bg-gray-800 text-white"
                        : "bg-gray-900 text-gray-400 hover:text-gray-300 border border-gray-800"
                      }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            <div className="overflow-y-auto flex-1">
              {loading ? (
                <div className="flex items-center justify-center h-64">
                  <div className="text-gray-400">Loading symbols...</div>
                </div>
              ) : error ? (
                <div className="flex items-center justify-center h-64">
                  <div className="text-red-400">{error}</div>
                </div>
              ) : !displaySymbols || displaySymbols.length === 0 ? (
                <div className="flex items-center justify-center h-64">
                  <div className="text-gray-400">No symbols found</div>
                </div>
              ) : (
                <table className="w-full text-sm">
                  <thead className="sticky top-0 bg-gray-900 border-b border-gray-800">
                    <tr className="text-left text-gray-400 text-xs font-medium uppercase">
                      <th className="w-12 px-4 py-3"></th>
                      <th className="px-4 py-3 min-w-[150px]">Symbols</th>
                      <th className="px-4 py-3 text-right min-w-[120px]">Last price</th>
                      <th className="px-4 py-3 text-right min-w-[100px]">24h change</th>
                      <th className="px-4 py-3 text-right min-w-[100px]">Funding Rate</th>
                      <th className="px-4 py-3 text-right min-w-[120px]">Volume</th>
                      <th className="px-4 py-3 text-right min-w-[120px]">Open Interest</th>
                    </tr>
                  </thead>
                  <tbody>
                    {displaySymbols.map((symbolItem: SymbolData) => {
                      const change = toFiniteNumber(symbolItem.priceChangePercent);
                      const isFavorite = favorites.has(symbolItem.symbol);
                      const isSelected =
                        normalizedCurrentSymbol === symbolItem.symbol.toUpperCase();
                      const fundingRate = toFiniteNumber(symbolItem.fundingRate) * 100;
                      const openInterestUsdt = toFiniteNumber(symbolItem.openInterest);

                      return (
                        <motion.tr
                          key={symbolItem.symbol}
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          className={`border-b border-gray-800 hover:bg-gray-900 cursor-pointer transition-colors ${isSelected ? "bg-gray-900" : ""
                            }`}
                          onClick={() => handleSelectSymbol(symbolItem.symbol)}
                        >
                          <td
                            className="w-12 px-4 py-3"
                            onClick={(event) => {
                              event.stopPropagation();
                              toggleFavorite(symbolItem.symbol);
                            }}
                          >
                            <button className="p-1 hover:bg-gray-800 rounded transition-colors">
                              {isFavorite ? (
                                <AiFillStar className="w-4 h-4 text-yellow-500" />
                              ) : (
                                <AiOutlineStar className="w-4 h-4 text-gray-500 hover:text-gray-400" />
                              )}
                            </button>
                          </td>

                          <td className="px-4 py-3">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-full bg-gray-800 flex items-center justify-center text-sm font-bold text-gray-100">
                                <img
                                  src={getCryptoIcon(symbolItem.symbol)}
                                  alt={symbolItem.symbol}
                                  className="w-7 h-7 rounded-full"
                                />
                              </div>
                              <div>
                                <div className="font-semibold text-white">{symbolItem.symbol}</div>
                                <div className="text-xs text-gray-500">Perp</div>
                              </div>
                            </div>
                          </td>

                          <td className="px-4 py-3 text-right font-mono text-white">
                            {formatPrice(symbolItem.lastPrice)}
                          </td>

                          <td
                            className={`px-4 py-3 text-right font-mono font-semibold ${change >= 0 ? "text-green-500" : "text-red-500"
                              }`}
                          >
                            {change >= 0 ? "+" : ""}
                            {change.toFixed(2)}%
                          </td>

                          <td className="px-4 py-3 text-right font-mono text-gray-300">
                            {fundingRate.toFixed(4)}%
                          </td>

                          <td className="px-4 py-3 text-right font-mono text-gray-300">
                            ${formatCompactNumber(symbolItem.quoteVolume, 2)}
                          </td>

                          <td className="px-4 py-3 text-right font-mono text-gray-300">
                            {openInterestUsdt > 0
                              ? `$${formatCompactNumber(openInterestUsdt, 2)}`
                              : "--"}
                          </td>
                        </motion.tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default AssetSelect;