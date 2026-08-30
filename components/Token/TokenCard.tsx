import { useState, useEffect, useCallback, memo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  FiArrowUpRight,
  FiArrowDownLeft,
  FiActivity,
  FiTrendingUp,
  FiExternalLink,
} from "react-icons/fi";

// Internal Libs
import { getWalletTokenBalance } from "@/lib/blockchain/balance";
import { VeryLowDecimalPriceDisplay } from '@/utility/displayPrice'
import { formateAmountWithFixedDecimals } from "@/utility/handy";

// Components
import RenderTokenFundingModal from "@/components/walletManager/modal/PulseWalletFundingModal";

interface TokenInfo {
  address: string;
  name: string;
  symbol: string;
  decimals: number;
  imageUrl: string;
}

const TokenCard = memo(
  ({ tokenInfo, walletAddress, walletId, chainId, user }: any) => {

    const [tokenBalance, setTokenBalance] = useState<string>(tokenInfo.balance);
    const [isLoading, setIsLoading] = useState(false);
    const [isOpenTokenFundModal, setIsOpenTokenFundModal] = useState(false);

    const fetchTokenBalance = async () => {
      try {
        let balance = await getWalletTokenBalance({ walletAddress, tokenAddress: tokenInfo.token.address, chainId })
        setTokenBalance(balance.toString());
      } catch (e) {
        console.error("Error fetching token data", e);
      }
    };

    const handleCloseFundingModel = () => {
      fetchTokenBalance();
      setIsOpenTokenFundModal(false)
    }

    useEffect(() => {
      fetchTokenBalance();
    }, [tokenInfo]);

    if (isLoading)
      return (
        <div className="w-full h-24 bg-gray-100/50 dark:bg-white/5 animate-pulse rounded-2xl border border-gray-200 dark:border-white/10" />
      );

    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        whileHover={{ y: -2 }}
        className="group relative flex flex-col sm:flex-row items-center gap-4 p-5 bg-white/80 dark:bg-[#0d1117]/80 backdrop-blur-xl border border-gray-200 dark:border-white/10 rounded-2xl hover:border-blue-500/50 hover:shadow-xl hover:shadow-blue-500/5 transition-all duration-300"
      >
        {/* Token Identity */}
        <div className="flex items-center gap-4 w-full sm:w-[250px]">
          <div className="relative flex-shrink-0">
            <div className="absolute inset-0 bg-blue-500/20 blur-lg rounded-full opacity-0 group-hover:opacity-100 transition-opacity" />
            <img
              src={tokenInfo?.imageUrl || "/placeholder-token.png"}
              alt={tokenInfo?.token.symbol}
              className="relative w-12 h-12 rounded-full border-2 border-white dark:border-gray-800 shadow-sm"
            />
            <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-emerald-500 border-2 border-white dark:border-[#0d1117] rounded-full shadow-sm" />
          </div>

          <div className="flex flex-col min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-black text-lg text-gray-900 dark:text-white leading-tight">
                {tokenInfo?.token.symbol}
              </span>
              <FiTrendingUp className="w-3.5 h-3.5 text-emerald-500 opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
            <span className="text-xs text-gray-500 font-medium truncate">
              {tokenInfo?.token.name}
            </span>
          </div>
        </div>

        {/* Financial Stats Grid */}
        <div className="grid grid-cols-2 sm:flex flex-1 items-center justify-between w-full gap-4 px-2">
          {/* Balance */}
          <div className="flex flex-col">
            <span className="text-[10px] uppercase tracking-widest text-gray-400 font-bold mb-1">
              Portfolio Balance
            </span>
            <div className="flex items-baseline gap-1">
              <span className="text-base font-bold text-gray-900 dark:text-gray-100">
                {formateAmountWithFixedDecimals(
                  tokenBalance,
                  tokenInfo?.token.decimals || 18,
                  7
                )}
              </span>
              <span className="text-[10px] text-gray-500 font-semibold">{tokenInfo?.symbol}</span>
            </div>
          </div>

          {/* Price */}
          <div className="flex flex-col sm:items-end">
            <span className="text-[10px] uppercase tracking-widest text-gray-400 font-bold mb-1">
              Current Price
            </span>
            <div className="flex items-center gap-2 bg-blue-50 dark:bg-blue-500/10 px-2 py-0.5 rounded-md">
              <span className="text-sm font-bold text-blue-600 dark:text-blue-400">
                {VeryLowDecimalPriceDisplay(Number(tokenInfo.priceUsd))}
              </span>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 w-full sm:w-auto mt-2 sm:mt-0 border-t sm:border-t-0 pt-4 sm:pt-0 border-gray-100 dark:border-white/5">
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={() => setIsOpenTokenFundModal(true)}
            className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2.5 bg-gray-900 dark:bg-white text-white dark:text-black rounded-xl font-bold text-sm hover:bg-blue-600 dark:hover:bg-blue-500 dark:hover:text-white transition-colors"
          >
            <div className="flex -space-x-1">
              <FiArrowUpRight className="w-4 h-4" />
              <FiArrowDownLeft className="w-4 h-4" />
            </div>
            <span>Manage</span>
          </motion.button>

          <button className="p-2.5 text-gray-400 hover:text-blue-500 hover:bg-blue-500/5 rounded-xl transition-all" title="View Details">
            <FiExternalLink className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Portal */}
        <AnimatePresence>
          {isOpenTokenFundModal && tokenInfo && (
            <RenderTokenFundingModal
              isOpen={isOpenTokenFundModal}
              onClose={handleCloseFundingModel}
              wallet={walletAddress}
              walletId={walletId}
              tokenInfo={({ ...tokenInfo.token, imageUrl: tokenInfo?.imageUrl })}
              chainId={chainId}
              isNative={false}
              user={user}
            />
          )}
        </AnimatePresence>
      </motion.div>
    );
  }
);

export default TokenCard;