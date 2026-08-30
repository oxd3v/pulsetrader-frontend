import { memo, useMemo, useCallback } from 'react';
import { ActivityType } from "@/type/common";
import {
  FiRepeat,
  FiArrowUpRight,
  FiArrowDownLeft,
  FiClock,
  FiCheckCircle,
  FiXCircle,
  FiExternalLink,
  FiCopy
} from "react-icons/fi";
import { FaWallet } from "react-icons/fa";
import { formatUnits } from "ethers";
import { displayNumber } from "@/utility/displayPrice";
import { PRECISION_DECIMALS } from "@/constants/common/utils";
import { chainConfig } from '@/constants/common/chain';
import Link from 'next/link';
import { handleCopy } from '@/lib/utils';
import { cn } from '@/lib/utils';

// ── Helpers ──────────────────────────────────────────────────────────────

const shortenAddress = (addr: string) =>
  addr ? `${addr.slice(0, 6)}...${addr.slice(-4)}` : '';

const formatDate = (date: Date | string) =>
  new Date(date).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
  });

const formatUsd = (amountInUsd: string) =>
  displayNumber(Number(formatUnits(BigInt(amountInUsd || "0"), PRECISION_DECIMALS)));

const formatAmount = (amount: string, decimals: number) =>
  displayNumber(Number(formatUnits(BigInt(amount || "0"), decimals)));

// ── Mode Badge (matching OrderCard) ──────────────────────────────────

const getModeBadge = (mode?: string) => {
  const modeMap: Record<string, { label: string; className: string }> = {
    Live: {
      label: "Live",
      className: "bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300",
    },
    Demo: {
      label: "Demo",
      className: "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300",
    },
    Testnet: {
      label: "Testnet",
      className: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-300",
    },
  };
  const entry = modeMap[mode || "Live"] || modeMap.Live;
  return (
    <span className={`px-1.5 py-0.5 text-[10px] font-medium rounded-full ${entry.className}`}>
      {entry.label}
    </span>
  );
};

// ── Component ──────────────────────────────────────────────────────────

const ActivityCard = memo(({ activityDetails }: { activityDetails: ActivityType }) => {
  const {
    _id,
    type,
    status,
    createdAt,
    payToken,
    receiveToken,
    txHash,
    chainId,
    wallet,
    txFee,
    mode,
    explorerUrl
  } = activityDetails;

  // ── Type config ──────────────────────────────────────────────────────
  const typeConfig = useMemo(() => {
    const t = type?.toUpperCase() || '';
    switch (status) {
      case 'Success':
        return { icon: <FiCheckCircle className="w-5 h-5" />, color: 'text-blue-600', bg: 'bg-blue-50 dark:bg-blue-900/20', label: type };
      case 'Failed':
        return { icon: <FiXCircle className="w-5 h-5" />, color: 'text-red-600', bg: 'bg-red-50 dark:bg-red-900/20', label: type };
      default:
        return { icon: <FiClock className="w-5 h-5" />, color: 'text-gray-600', bg: 'bg-gray-100 dark:bg-gray-800', label: type };
    }
  }, [status]);


  // ── Explorer link ──────────────────────────────────────────────────
  const explorerLink = useMemo(() => {
    if (explorerUrl) return `${explorerUrl}${txHash}`;
    if (chainConfig?.[chainId]?.explorerUrl) return `${chainConfig[chainId].explorerUrl}tx/${txHash}`;
    return "#";
  }, [explorerUrl, chainId, txHash]);

  // ── Card styling based on mode ──────────────────────────────────
  const cardClasses = cn(
    "group relative bg-white dark:bg-zinc-900 border rounded-2xl p-5 transition-all duration-300 hover:shadow-xl hover:border-indigo-500/40",
    mode === "Live" && "bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800",
    mode === "Demo" && "bg-red-50 dark:bg-red-900/10 border-red-200 dark:border-red-900/40 hover:border-red-400",
    mode === "Testnet" && "bg-yellow-50 dark:bg-yellow-900/10 border-yellow-200 dark:border-yellow-900/40 hover:border-yellow-400"
  );

  return (
    <div className={cardClasses}>
      {/* Header */}
      <div className="flex justify-between items-start mb-4">
        <div className="flex items-center gap-1">
          <div className={`p-2 rounded-xl ${typeConfig.bg} ${typeConfig.color}`}>
            {typeConfig.icon}
          </div>
          <div>
            <span className="text-xs font-semibold text-zinc-900 dark:text-zinc-100">
              {typeConfig.label}
            </span>
            <div className="flex items-center gap-2 text-xs text-zinc-500 dark:text-zinc-400">
              <span>{formatDate(createdAt)}</span>
              <span className="w-1 h-1 rounded-full bg-zinc-300 dark:bg-zinc-600" />
              <span className="font-mono">{_id?.slice(-6)}</span>
              <button onClick={() => handleCopy(_id, 'Activity ID copied')} className="hover:text-indigo-500 transition-colors">
                <FiCopy className="w-3 h-3" />
              </button>

            </div>
            {getModeBadge(mode)}
          </div>
        </div>
      </div>

      {/* Amounts */}
      <div className="space-y-3 mb-4">
        {payToken?.amount && (
          <div className="flex justify-between items-center bg-zinc-50 dark:bg-zinc-800/50 p-3 rounded-xl border border-zinc-100 dark:border-zinc-800">
            <div>
              <p className="text-[10px] text-zinc-400 uppercase font-bold mb-1">Sent</p>
              <div className="flex items-baseline gap-1.5">
                <span className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">
                  {formatAmount(payToken.amount, payToken.decimals || 18)}
                </span>
                <span className="text-xs text-zinc-400">{payToken.symbol}</span>
              </div>
            </div>
            <div className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
              ${formatUsd(payToken.amountInUsd || "0")}
            </div>
          </div>
        )}
        {receiveToken?.amount && (
          <div className="flex justify-between items-center bg-indigo-50/30 dark:bg-indigo-900/10 p-3 rounded-xl border border-indigo-100/50 dark:border-indigo-900/20">
            <div>
              <p className="text-[10px] text-indigo-400 uppercase font-bold mb-1">Received</p>
              <div className="flex items-baseline gap-1.5">
                <span className="text-sm font-bold text-indigo-700 dark:text-indigo-400">
                  {formatAmount(receiveToken.amount, receiveToken.decimals || 18)}
                </span>
                <span className="text-xs text-indigo-400/70">{receiveToken.symbol}</span>
              </div>
            </div>
            <div className="text-xs font-medium text-indigo-600/80">
              ${formatUsd(receiveToken.amountInUsd || "0")}
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="flex justify-between items-center pt-3 border-t border-zinc-100 dark:border-zinc-800">
        <div className="flex items-center gap-2 group/wallet">
          <FaWallet className="text-zinc-400 group-hover/wallet:text-indigo-500 transition-colors" />
          <span className="text-[11px] font-mono font-medium text-zinc-600 dark:text-zinc-400">
            {shortenAddress(wallet?.address || '')}
          </span>
          {wallet?.network && (
            <span className="text-[9px] text-zinc-400 uppercase tracking-wider">
              {wallet.network}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {txFee?.amount && (
            <span className="text-[10px] text-zinc-400 dark:text-zinc-500 bg-zinc-100 dark:bg-zinc-800 px-2 py-1 rounded-full">
              Fee: ${formatUsd(txFee.amountInUsd || "0")}
            </span>
          )}
          <Link
            href={explorerLink}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 px-3 py-1.5 text-[10px] font-bold text-zinc-500 hover:text-white hover:bg-zinc-900 dark:hover:bg-zinc-100 dark:hover:text-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-700 transition-all"
          >
            Explorer <FiExternalLink className="w-3 h-3" />
          </Link>
        </div>
      </div>
    </div>
  );
});

ActivityCard.displayName = "ActivityCard";
export default ActivityCard;