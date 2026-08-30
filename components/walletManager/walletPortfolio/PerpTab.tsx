import { useState, useCallback, useEffect } from "react";
import { FiArrowDownCircle, FiArrowUpCircle, FiRefreshCw } from "react-icons/fi";
import toast from "react-hot-toast";

import PerpDepositModal from "@/components/walletManager/modal/PerpDepositModal";
import PerpWithdrawModal from "@/components/walletManager/modal/PerpWithdrawModal";
import { PRECISION_DECIMALS } from "@/constants/common/utils";
import Service from "@/service/user-service";
import { WalletType } from "@/type/common";
import { safeFormatNumber, safeParseUnits } from "@/utility/handy";

type DexName = "asterdex" | "hyperliquid";

interface PerpBalances {
  asterdex: string;
  hyperliquid: string;
}

interface PerpTabProps {
  selectedWallet: WalletType;
  perpBalances: PerpBalances;
  onRefresh: () => void;
}

type PerpServiceResponse = {
  success?: boolean;
  balance?: number | string;
  message?: string;
  data?: { success?: boolean; balance?: number | string; message?: string };
};

const DEX_CONFIG = {
  asterdex: {
    label: "AsterDEX",
    color: "text-violet-600 dark:text-violet-400",
    bg: "bg-violet-500/10",
    border: "border-violet-500/20",
    activeBg: "bg-[#eeb36e]",
    gradient: "bg-[#eeb36e]",
  },
  hyperliquid: {
    label: "Hyperliquid",
    color: "text-blue-600 dark:text-blue-400",
    bg: "bg-blue-500/10",
    border: "border-blue-500/20",
    activeBg: "bg-[#97fce4]",
    gradient: "bg-[#97fce4]",
  },
} as const;

function extractBalance(res: PerpServiceResponse | any): string {
  if (res == null) return "0";
  const r = res as any;
  return String(r?.data?.availableValue ?? r?.availableValue ?? r?.data?.balance ?? r?.balance ?? 0);
}

function fmtUsd(val: string): string {
  return safeFormatNumber(String(val), PRECISION_DECIMALS, 4);
}

function hasApprovedAgent(wallet: WalletType, exchange: DexName): boolean {
  return (
    wallet.agentDetails?.some(
      (detail) =>
        detail.exchange?.toLowerCase() === exchange && detail.isApproved === true,
    ) === true
  );
}

export default function PerpTab({
  selectedWallet,
  perpBalances,
  onRefresh,
}: PerpTabProps) {
  const [activeDex, setActiveDex] = useState<DexName>("hyperliquid");
  const [isDepositModalOpen, setIsDepositModalOpen] = useState(false);
  const [isWithdrawModalOpen, setIsWithdrawModalOpen] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [localBalance, setLocalBalance] = useState<Record<DexName, string>>({
    asterdex: String(perpBalances.asterdex),
    hyperliquid: String(perpBalances.hyperliquid),
  });

  useEffect(() => {
    setLocalBalance({
      asterdex: String(perpBalances.asterdex),
      hyperliquid: String(perpBalances.hyperliquid),
    });
  }, [perpBalances]);

  const currentRaw = localBalance[activeDex];
  const hasFunds = Number(currentRaw) > 0;
  const dex = DEX_CONFIG[activeDex];
  const isApproved = hasApprovedAgent(selectedWallet, activeDex);

  const handleRefreshBalance = useCallback(async () => {
    if (!selectedWallet?.address) return;
    setIsRefreshing(true);
    try {
      const res = (await Service.getPerpBalance({
        walletAddress: selectedWallet.address,
        exchange: activeDex,
      })) as PerpServiceResponse;
      const raw = safeParseUnits(extractBalance(res), PRECISION_DECIMALS);
      setLocalBalance((prev) => ({ ...prev, [activeDex]: raw }));
    } catch {
      toast.error("Failed to refresh balance");
    } finally {
      setIsRefreshing(false);
    }
  }, [activeDex, selectedWallet?.address]);

  const handleDexSwitch = useCallback(
    (next: DexName) => {
      setActiveDex(next);
      setLocalBalance((prev) => ({
        ...prev,
        [next]: String(perpBalances[next]),
      }));
    },
    [perpBalances],
  );

  const handleWithdrawSuccess = useCallback(() => {
    handleRefreshBalance();
    onRefresh();
  }, [handleRefreshBalance, onRefresh]);

  return (
    <div className="space-y-4">
      {/* DEX Switcher */}
      <div className="bg-white dark:bg-[#13131a] border border-black/5 dark:border-white/5 rounded-2xl p-1.5 flex gap-1">
        {(["hyperliquid"] as DexName[]).map((d) => (
          <button
            key={d}
            onClick={() => handleDexSwitch(d)}
            className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-all ${activeDex === d
              ? `${DEX_CONFIG[d].activeBg} text-black shadow-sm`
              : "text-gray-500 hover:text-black dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/5"
              }`}
          >
            {DEX_CONFIG[d].label}
          </button>
        ))}
      </div>

      {/* Balance Card */}
      <div className="bg-white dark:bg-[#13131a] border border-black/5 dark:border-white/5 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-gray-500 mb-1">
            Perp Balance
          </p>
          <div className="flex items-center gap-2">
            <p className={`text-3xl font-black ${dex.color}`}>
              ${fmtUsd(String(currentRaw))}
            </p>
            <button
              onClick={handleRefreshBalance}
              disabled={isRefreshing}
              className="p-1.5 rounded-lg hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
              title="Refresh balance"
            >
              <FiRefreshCw
                size={13}
                className={`text-gray-400 ${isRefreshing ? "animate-spin" : ""}`}
              />
            </button>
          </div>
          {!hasFunds && (
            <p className="text-xs text-amber-500 dark:text-amber-400 mt-1 font-medium">
              Deposit at least 10 Arbitrum USDC to start. Estimated deposit time is 10-15 minutes.
            </p>
          )}
          {isApproved && (
            <p className="text-xs text-emerald-500 dark:text-emerald-400 mt-1 font-semibold">
              Agent wallet already approved for trading
            </p>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2">
          <button
            onClick={() => setIsDepositModalOpen(true)}
            className={`px-5 py-2.5 rounded-xl text-sm font-bold text-black transition-all ${dex.gradient} hover:opacity-90 active:scale-[0.98] flex items-center gap-2`}
          >
            <FiArrowDownCircle size={16} />
            Deposit
          </button>
          {hasFunds && (
            <button
              onClick={() => setIsWithdrawModalOpen(true)}
              className="px-5 py-2.5 rounded-xl text-sm font-bold text-white transition-all bg-red-600 hover:bg-red-700 active:scale-[0.98] flex items-center gap-2"
            >
              <FiArrowUpCircle size={16} />
              Withdraw
            </button>
          )}
        </div>
      </div>

      {/* Info Card */}
      <div className={`${dex.bg} ${dex.border} border rounded-2xl p-4`}>
        <p className="text-sm font-bold text-black dark:text-white mb-1">
          Deposit perp collateral
        </p>
        <p className="text-xs text-gray-500 dark:text-gray-400">
          Deposit collateral into your {DEX_CONFIG[activeDex].label} perp account.
        </p>
      </div>

      {isDepositModalOpen && (
        <PerpDepositModal
          isOpen={isDepositModalOpen}
          onClose={() => {
            setIsDepositModalOpen(false);
            setTimeout(() => {
              handleRefreshBalance();
              onRefresh();
            }, 2000);
          }}
          wallet={selectedWallet}
          initialDex={activeDex}
        />
      )}

      {isWithdrawModalOpen && (
        <PerpWithdrawModal
          isOpen={isWithdrawModalOpen}
          onClose={() => setIsWithdrawModalOpen(false)}
          wallet={selectedWallet}
          dex={activeDex}
          currentBalanceUsd={currentRaw}
          onWithdrawSuccess={handleWithdrawSuccess}
        />
      )}
    </div>
  );
}