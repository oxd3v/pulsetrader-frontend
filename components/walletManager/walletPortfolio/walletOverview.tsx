import { useState, useEffect, useCallback, useMemo } from "react";
import { WalletType } from "@/type/common";
import {
  FiArrowDownLeft,
  FiArrowUpRight,
  FiCopy,
  FiRefreshCw,
  FiList,
  FiClock,
  FiPieChart,
} from "react-icons/fi";
import { IoWallet } from "react-icons/io5";
import toast from "react-hot-toast";
import { chainConfig } from "@/constants/common/chain";
import { formatCompactNumber, safeFormatNumber } from "@/utility/handy";
import RenderWalletFundModal from "@/components/walletManager/modal/PulseWalletFundingModal";
import { PRECISION_DECIMALS } from "@/constants/common/utils";
import { ZeroAddress } from "ethers";
import { getWalletBalance } from "@/lib/blockchain/balance";
import type { BalanceData } from "./PortfolioMain";

interface WalletOverviewProps {
  selectedWallet: WalletType;
  chainId: number;
  balanceData: BalanceData;
  user: any;
}

export default function WalletOverview({ selectedWallet, balanceData, chainId, user }: WalletOverviewProps) {
  const [isFundingModalOpen, setIsFundingModalOpen] = useState(false);
  const [nativeBalance, setNativeBalance] = useState(balanceData.nativeBalance);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Keep local native balance in sync when parent data changes
  useEffect(() => {
    setNativeBalance(balanceData.nativeBalance);
  }, [balanceData.nativeBalance]);

  // Lightweight native-balance-only refresh (avoids triggering a full parent re-fetch)
  const handleRefreshNative = useCallback(async () => {
    if (!selectedWallet?.address) return;
    setIsRefreshing(true);
    try {
      const bal = await getWalletBalance({ walletAddress: selectedWallet.address, chainId });
      setNativeBalance(bal.toString());
    } catch { /* silent */ }
    finally { setIsRefreshing(false); }
  }, [selectedWallet?.address, chainId]);

  // Refresh native balance whenever the selected wallet or chain changes
  useEffect(() => {
    if (selectedWallet?.address) handleRefreshNative();
  }, [selectedWallet?.address, chainId]);

  // ── Derived values ─────────────────────────────────────────────────────────
  const isFunded = BigInt(nativeBalance || "0") > BigInt(0);
  const isEVM = selectedWallet.network !== "SVM";

  const totalPortfolioUsd = useMemo(
    () => BigInt(balanceData.totalSpotUsd || "0") + BigInt(balanceData.totalPerpUsd || "0"),
    [balanceData.totalSpotUsd, balanceData.totalPerpUsd]
  );

  // Formatted display values
  const nativeFormatted = formatCompactNumber(
    Number(safeFormatNumber(nativeBalance || "0", chainConfig[chainId].nativeToken.decimals, 5)),
    4
  );
  const portfolioFormatted = formatCompactNumber(
    Number(safeFormatNumber(totalPortfolioUsd.toString(), PRECISION_DECIMALS, 4)),
    2
  );
  const spotFormatted = formatCompactNumber(
    Number(safeFormatNumber(BigInt(balanceData.totalSpotUsd || "0").toString(), PRECISION_DECIMALS, 4)),
    2
  );
  const perpFormatted = formatCompactNumber(
    Number(safeFormatNumber(BigInt(balanceData.totalPerpUsd || "0").toString(), PRECISION_DECIMALS, 4)),
    2
  );

  // Portfolio counts — sourced directly from balanceData (computed once in parent)
  const tokensTracked = balanceData.holdingTokens?.length ?? 0;
  const { active: activeOrdersCount, total: totalOrdersCount } = balanceData.orderSummary;

  // Perp DEX breakdown — from balanceData.perpBalances (no extra fetch needed)
  const formattedAsterdex = formatCompactNumber(
    Number(safeFormatNumber(balanceData.perpBalances.asterdex, PRECISION_DECIMALS, 4)),
    2
  );
  const formattedHyperliquid = formatCompactNumber(
    Number(safeFormatNumber(balanceData.perpBalances.hyperliquid, PRECISION_DECIMALS, 4)),
    2
  );

  return (
    <div className="space-y-4">
      {/* ── Top Section ────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">

        {/* Wallet info */}
        <div className="bg-white dark:bg-[#13131a] border border-black/5 dark:border-white/5 rounded-2xl p-5 flex flex-col justify-between">
          <div className="flex items-center gap-3 mb-5">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${isEVM ? "bg-blue-500" : "bg-purple-500"}`}>
              <IoWallet className="text-white" size={17} />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs 2xl:text-sm font-bold text-black dark:text-white">Pulse Account</p>
              <button
                onClick={() => { navigator.clipboard.writeText(selectedWallet.address); toast.success("Copied"); }}
                className="flex items-center gap-1 text-[10px] 2xl:text-[11px] font-mono text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 transition-colors group"
              >
                {selectedWallet.address.slice(0, 8)}…{selectedWallet.address.slice(-4)}
                <FiCopy size={10} className="opacity-0 group-hover:opacity-100 transition-opacity" />
              </button>
            </div>
            <span className={`flex-shrink-0 text-[10px] font-bold px-2 py-1 rounded-lg ${isEVM ? "bg-blue-500/10 text-blue-600 dark:text-blue-400" : "bg-purple-500/10 text-purple-600 dark:text-purple-400"}`}>
              {isEVM ? "EVM" : "SOL"}
            </span>
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => setIsFundingModalOpen(true)}
              className="flex-1 flex items-center justify-center gap-1.5 bg-black dark:bg-white text-white dark:text-black hover:opacity-80 py-2.5 rounded-xl text-xs font-bold transition-all active:scale-95"
            >
              <FiArrowDownLeft size={13} /> Deposit
            </button>
            <button
              onClick={() => setIsFundingModalOpen(true)}
              className="flex-1 flex items-center justify-center gap-1.5 border border-black/10 dark:border-white/10 text-black dark:text-white hover:bg-black/5 dark:hover:bg-white/5 py-2.5 rounded-xl text-xs font-bold transition-all active:scale-95"
            >
              <FiArrowUpRight size={13} /> Withdraw
            </button>
          </div>
        </div>

        {/* Native balance */}
        <div className="bg-white dark:bg-[#13131a] border border-black/5 dark:border-white/5 rounded-2xl p-5 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-bold uppercase tracking-widest text-gray-500">Native Balance</p>
            <button
              onClick={handleRefreshNative}
              disabled={isRefreshing}
              className="p-1 rounded-lg hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
              title="Refresh"
            >
              <FiRefreshCw size={12} className={`text-gray-400 ${isRefreshing ? "animate-spin" : ""}`} />
            </button>
          </div>
          <div className="flex items-end gap-2">
            <p className="text-3xl font-black text-black dark:text-white">{nativeFormatted}</p>
            <img src={chainConfig[chainId].imageUrl} className="w-5 h-5 rounded-full mb-1" alt="chain logo" />
          </div>
          <div className={`mt-3 text-xs font-semibold ${isFunded ? "text-emerald-500" : "text-amber-500"}`}>
            {isFunded ? "✓ Ready for gas" : "⚠ Needs funding"}
          </div>
        </div>

        {/* Portfolio breakdown */}
        <div className="bg-white dark:bg-[#13131a] border border-black/5 dark:border-white/5 rounded-2xl p-5">
          <p className="text-xs font-bold uppercase tracking-widest text-gray-500 mb-2">Total Portfolio</p>
          <p className="text-3xl font-black text-black dark:text-white mb-4">${portfolioFormatted}</p>
          <div className="flex gap-2">
            <div className="flex-1 flex flex-col gap-0.5 p-2.5 rounded-xl bg-black/5 dark:bg-white/5">
              <span className="text-[10px] font-bold text-gray-500 dark:text-gray-400">Spot Asset</span>
              <span className="text-sm font-black text-emerald-600 dark:text-emerald-400">${spotFormatted}</span>
            </div>
            <div className="flex-1 flex flex-col gap-0.5 p-2.5 rounded-xl bg-black/5 dark:bg-white/5">
              <span className="text-[10px] font-bold text-gray-500 dark:text-gray-400">Perp Margin</span>
              <span className="text-sm font-black text-blue-600 dark:text-blue-400">${perpFormatted}</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── Bottom Section: Trading Stats ─────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">

        {/* Tokens Tracked */}
        <div className="bg-white dark:bg-[#13131a] border border-black/5 dark:border-white/5 rounded-2xl p-4 flex flex-col gap-2">
          <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400">
            <FiList size={14} />
            <span className="text-[10px] font-bold uppercase tracking-widest">Tokens Tracked</span>
          </div>
          <p className="text-2xl font-black text-black dark:text-white">{tokensTracked}</p>
        </div>

        {/* Orders */}
        <div className="bg-white dark:bg-[#13131a] border border-black/5 dark:border-white/5 rounded-2xl p-4 flex flex-col gap-2">
          <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400">
            <FiClock size={14} />
            <span className="text-[10px] font-bold uppercase tracking-widest">Orders</span>
          </div>
          <div className="flex flex-col gap-1.5">
            <div className="flex justify-between items-center p-2 rounded-xl bg-black/5 dark:bg-white/5">
              <span className="text-xs font-bold text-gray-500 dark:text-gray-400">Total</span>
              <span className="text-sm font-black text-black dark:text-white">{totalOrdersCount}</span>
            </div>
            <div className="flex justify-between items-center p-2 rounded-xl bg-black/5 dark:bg-white/5">
              <span className="text-xs font-bold text-gray-500 dark:text-gray-400">Active</span>
              <span className="text-sm font-black text-blue-600 dark:text-blue-400">{activeOrdersCount}</span>
            </div>
          </div>
        </div>

        {/* Perp DEX Breakdown */}
        <div className="bg-white dark:bg-[#13131a] border border-black/5 dark:border-white/5 rounded-2xl p-4 flex flex-col justify-center gap-3">
          <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400">
            <FiPieChart size={14} />
            <span className="text-[10px] font-bold uppercase tracking-widest">Perp DEX</span>
          </div>
          <div className="space-y-1.5">
            <div className="flex justify-between items-center">
              <span className="text-xs font-semibold text-gray-500">AsterDEX</span>
              <span className="text-xs font-black text-black dark:text-white">${formattedAsterdex}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-xs font-semibold text-gray-500">Hyperliquid</span>
              <span className="text-xs font-black text-black dark:text-white">${formattedHyperliquid}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Fund modal */}
      {isFundingModalOpen && (
        <RenderWalletFundModal
          isOpen={isFundingModalOpen}
          onClose={() => { setIsFundingModalOpen(false); handleRefreshNative(); }}
          isNative={true}
          wallet={selectedWallet.address}
          walletId={selectedWallet._id}
          chainId={chainId}
          user={user}
          tokenInfo={{
            address: ZeroAddress,
            name: isEVM ? chainConfig[chainId].name : "Solana",
            symbol: isEVM ? chainConfig[chainId].symbol : "SOL",
            decimals: isEVM ? 18 : 9,
            imageUrl: chainConfig[chainId].imageUrl,
          }}
        />
      )}
    </div>
  );
}