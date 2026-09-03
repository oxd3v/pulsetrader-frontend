import { useState, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { FiX, FiRefreshCw, FiCopy, FiCheck, FiUser } from "react-icons/fi";
import { formatUnits } from "ethers";
import { useShallow } from "zustand/shallow";

import { chains } from "@/constants/common/chain";
import QRCodeDisplay from "@/components/common/QRCode/QrCode";
import { isValidEVMWalletAddress, isValidSolWalletFormat, notifyWithResponseError } from "@/lib/utils";
import {
  safeParseUnits,
  formateAmountWithFixedDecimals,
} from "@/utility/handy";
import { getWalletBalance, getWalletTokenBalance } from "@/lib/blockchain/balance";
import { calculateWalletTokenAllocation, isTradeFeeExemptStatus } from "@/utility/orderUtility";
import { useStore } from "@/store/useStore";
import { useUserAuth } from "@/hooks/useAuth";

interface FundingModalProps {
  isOpen: boolean;
  onClose: () => void;
  wallet: string;
  walletId?: string;
  chainId: number;
  isNative: boolean;
  tokenInfo: {
    address: string;
    decimals: number;
    name: string;
    symbol: string;
    imageUrl: string;
  };
  user: { account: string, status: string };
}

export default function FundingModal({
  isOpen,
  onClose,
  isNative,
  wallet,
  walletId,
  tokenInfo,
  chainId,
  user,
}: FundingModalProps) {
  const { withdrawBalance } = useUserAuth();
  const { userOrders, systemInfo } = useStore(
    useShallow((state: any) => ({
      userOrders: state.userOrders || [],
      systemInfo: state.systemInfo || {}
    }))
  );

  const [mode, setMode] = useState<"deposit" | "withdraw">("deposit");
  const [amount, setAmount] = useState("");
  const [decimalsValue, setDecimalsvalue] = useState("0");
  const [receiverAddress, setReceiverAddress] = useState(user?.account || "");
  const [isLoading, setIsLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [balance, setBalance] = useState("0");
  const [lockedBalance, setLockedBalance] = useState("0");
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Mount & unmount
  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  // Prevent body scroll
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isOpen]);

  // Fetch balance
  const fetchBalance = useCallback(async () => {
    if (!wallet || !tokenInfo.address) return;
    setIsRefreshing(true);
    try {
      let bal: bigint;
      if (isNative) {
        bal = await getWalletBalance({ walletAddress: wallet, chainId });
      } else {
        bal = await getWalletTokenBalance({
          walletAddress: wallet,
          tokenAddress: tokenInfo.address,
          chainId,
        });
      }
      setBalance(bal.toString());
    } catch {
      setBalance("0");
      notifyWithResponseError("error", "Failed to fetch balance. Please refresh.");
    } finally {
      setIsRefreshing(false);
    }
  }, [wallet, tokenInfo.address, chainId, isNative]);

  useEffect(() => {
    if (isOpen) {
      fetchBalance();
    }
  }, [isOpen, fetchBalance]);

  // Compute locked balance
  useEffect(() => {
    if (walletId && tokenInfo.address) {
      const locked = calculateWalletTokenAllocation({
        orders: userOrders,
        walletId,
        tokenAddress: tokenInfo.address,
        isFeeExempt: isTradeFeeExemptStatus(systemInfo.userLevels, user.status,)
      });
      setLockedBalance(locked.toString());
    } else {
      setLockedBalance("0");
    }
  }, [walletId, tokenInfo.address, userOrders]);

  const availableBalance =
    BigInt(balance) - BigInt(lockedBalance) > BigInt(0)
      ? (BigInt(balance) - BigInt(lockedBalance)).toString()
      : "0";

  // Convert amount to decimals
  useEffect(() => {
    if (tokenInfo.decimals && amount) {
      try {
        const decimalValue = safeParseUnits(amount, tokenInfo.decimals);
        setDecimalsvalue(decimalValue.toString());
      } catch {
        setDecimalsvalue("0");
      }
    } else {
      setDecimalsvalue("0");
    }
  }, [tokenInfo, amount]);

  // Copy address
  const handleCopyAddress = async () => {
    try {
      await navigator.clipboard.writeText(wallet);
      setCopied(true);
      notifyWithResponseError("success", "Address copied");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      notifyWithResponseError("error", "Failed to copy address");
    }
  };

  // Validate address
  const isSolana = chainId === chains.Solana;
  const isAddressValid = useCallback(() => {
    if (!receiverAddress) return false;
    return isSolana
      ? isValidSolWalletFormat(receiverAddress)
      : isValidEVMWalletAddress(receiverAddress);
  }, [isSolana, receiverAddress]);

  const shouldShowError = receiverAddress.length > 0 && !isAddressValid();

  // Withdraw
  const handleWithdraw = async () => {
    // Client-side validations
    if (!amount || parseFloat(amount) <= 0) {
      notifyWithResponseError("error", "Enter a valid amount");
      return;
    }
    if (BigInt(availableBalance) < BigInt(decimalsValue)) {
      notifyWithResponseError("error", "Insufficient available balance");
      return;
    }
    if (!isAddressValid()) {
      notifyWithResponseError("error", "Invalid receiver address");
      return;
    }

    setIsLoading(true);
    try {
      const result: any = await withdrawBalance({
        receiver: receiverAddress,
        walletAddress: wallet,
        tokenAddress: tokenInfo.address,
        chainId,
        value: decimalsValue,
        tokenSymbol: tokenInfo.symbol,
        tokenDecimals: tokenInfo.decimals,
      });

      if (result?.success) {
        onClose();
        setAmount("");
        setReceiverAddress(user?.account || "");
        await fetchBalance();
      }
      // The hook already shows success/error toasts; no duplicate needed.
    } catch (err: any) {
      notifyWithResponseError("error", err.message || "Withdrawal failed");
    } finally {
      setIsLoading(false);
    }
  };

  if (!mounted || !isOpen) return null;

  const availableBigInt = BigInt(availableBalance);
  const amountBigInt = BigInt(decimalsValue);

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[99] flex items-center justify-center p-3 md:p-4">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/60 dark:bg-black/80 backdrop-blur-sm"
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="relative w-full max-w-md bg-white dark:bg-[#0d1117] border border-gray-200 dark:border-white/10 rounded-3xl md:rounded-[32px] overflow-hidden shadow-2xl max-h-[90vh] overflow-y-auto"
          >
            {/* Header */}
            <div className="p-4 md:p-6 border-b border-gray-200/50 dark:border-white/5 flex items-center justify-between sticky top-0 bg-white/80 dark:bg-[#0d1117]/90 backdrop-blur-sm z-10">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-2xl bg-gray-100 dark:bg-white/5 border border-gray-200 dark:border-white/10 text-gray-900 dark:text-white">
                  <img src={tokenInfo.imageUrl} className="w-5 h-5 rounded-full" alt={tokenInfo.symbol} />
                </div>
                <div>
                  <h2 className="text-base md:text-lg font-black text-gray-900 dark:text-white tracking-tight">
                    {mode === "deposit"
                      ? `Receive ${tokenInfo.symbol}`
                      : `Withdraw ${tokenInfo.symbol}`}
                  </h2>
                  <p className="text-[10px] uppercase tracking-widest font-bold text-gray-500 dark:text-gray-500">
                    {isSolana ? "Solana" : "Ethereum"} Network
                  </p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-2 hover:bg-gray-100 dark:hover:bg-white/5 rounded-xl transition-colors"
              >
                <FiX className="text-gray-500 dark:text-gray-500" size={20} />
              </button>
            </div>

            <div className="p-4 md:p-6">
              {/* Mode Toggle */}
              <div className="flex p-1.5 bg-gray-100 dark:bg-black/40 rounded-2xl mb-6 md:mb-8 border border-gray-200 dark:border-white/5">
                {(["deposit", "withdraw"] as const).map((m) => (
                  <button
                    key={m}
                    onClick={() => setMode(m)}
                    className={`flex-1 py-2.5 md:py-3 text-[10px] md:text-xs font-black rounded-xl transition-all uppercase tracking-widest ${mode === m
                      ? "bg-white dark:bg-white/10 text-gray-900 dark:text-white ring-1 ring-gray-300 dark:ring-white/20 shadow-sm"
                      : "text-gray-500 dark:text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                      }`}
                  >
                    {m}
                  </button>
                ))}
              </div>

              {/* Balance summary with refresh */}
              <div className="flex flex-wrap items-center justify-between gap-2 text-[10px] md:text-[11px] font-mono font-medium mb-4">
                <div className="flex items-center gap-2">
                  <button
                    onClick={fetchBalance}
                    disabled={isRefreshing}
                    className="p-1.5 hover:bg-gray-100 dark:hover:bg-white/10 rounded-lg transition-all disabled:opacity-50"
                    title="Refresh balance"
                  >
                    <FiRefreshCw
                      className={`text-gray-500 dark:text-gray-400 ${isRefreshing ? "animate-spin" : ""}`}
                      size={14}
                    />
                  </button>
                  <span className="text-gray-500 dark:text-gray-500">Available:</span>
                  <span className="text-emerald-600 dark:text-emerald-400 font-bold">
                    {formateAmountWithFixedDecimals(availableBalance, tokenInfo.decimals || 18, 4)}
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  <span className="text-gray-500 dark:text-gray-500">Locked:</span>
                  <span className="text-rose-600 dark:text-red-400">
                    {formateAmountWithFixedDecimals(lockedBalance, tokenInfo.decimals || 18, 4)}
                  </span>
                </div>
              </div>

              {mode === "deposit" ? (
                <div className="space-y-6">
                  <div className="relative bg-gray-50 dark:bg-[#161b22] border border-gray-200 dark:border-white/10 rounded-2xl p-4 md:p-5 flex flex-col items-center gap-4">
                    <div className="bg-white dark:bg-white p-2 rounded-xl shadow-sm">
                      <div className="w-28 h-28 md:w-32 md:h-32 flex items-center justify-center">
                        <QRCodeDisplay value={wallet} size={128} />
                      </div>
                    </div>
                    <div className="w-full space-y-2">
                      <span className="text-[10px] font-bold text-gray-500 dark:text-gray-500 uppercase tracking-widest">
                        Bot Deposit Address
                      </span>
                      <div className="flex items-center gap-2 bg-white dark:bg-black/40 p-2 md:p-3 rounded-xl border border-gray-200 dark:border-white/5">
                        <span className="flex-1 font-mono text-[10px] md:text-[11px] text-blue-600 dark:text-blue-400 truncate">
                          {wallet}
                        </span>
                        <button
                          onClick={handleCopyAddress}
                          className="p-2 bg-gray-100 dark:bg-white/5 hover:bg-gray-200 dark:hover:bg-white/10 rounded-lg transition-all"
                        >
                          {copied ? (
                            <FiCheck className="text-emerald-600 dark:text-emerald-500" />
                          ) : (
                            <FiCopy className="text-gray-500 dark:text-gray-400" />
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                  <p className="text-[10px] md:text-[11px] text-center text-gray-500 dark:text-gray-500 px-2 md:px-4">
                    Only send {tokenInfo.symbol} assets to this address.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex items-start gap-2.5 bg-rose-50/80 dark:bg-red-500/10 border border-rose-200 dark:border-red-500/25 rounded-2xl px-3 md:px-4 py-3">
                    <span className="text-base mt-0.5 shrink-0">⚠️</span>
                    <p className="text-[10px] md:text-[11px] text-rose-700 dark:text-red-300/90 font-semibold leading-relaxed">
                      Withdrawing assets might cancel active orders.{" "}
                      <span className="text-rose-800 dark:text-red-400 font-black">
                        Withdraw at your own risk.
                      </span>
                    </p>
                  </div>

                  <div className="space-y-3">
                    <div
                      className={`bg-gray-50 dark:bg-red-950/20 rounded-2xl border p-3 md:p-4 transition-all ${amount && availableBigInt < amountBigInt
                        ? "border-rose-500 dark:border-red-500"
                        : "border-gray-200 dark:border-red-500/20 focus-within:border-rose-400 dark:focus-within:border-red-400/50"
                        }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-[10px] font-bold text-gray-500 dark:text-red-400/70 uppercase tracking-widest">
                          Amount
                        </label>
                        {!isNative && (
                          <button
                            onClick={() =>
                              setAmount(
                                formatUnits(BigInt(availableBalance), tokenInfo.decimals || 18)
                              )
                            }
                            className="px-2.5 py-0.5 text-[9px] font-black uppercase tracking-widest bg-rose-100 dark:bg-red-500/20 hover:bg-rose-200 dark:hover:bg-red-500/35 text-rose-700 dark:text-red-300 border border-rose-300 dark:border-red-500/30 rounded-md transition-all"
                          >
                            MAX
                          </button>
                        )}
                      </div>
                      <input
                        type="number"
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        placeholder="0.00"
                        className="bg-transparent outline-none text-xl md:text-2xl font-black text-gray-900 dark:text-white w-full"
                      />
                    </div>

                    <div
                      className={`bg-gray-50 dark:bg-red-950/20 rounded-2xl border p-3 md:p-4 transition-all ${shouldShowError
                        ? "border-rose-500 dark:border-red-500/50"
                        : "border-gray-200 dark:border-red-500/20 focus-within:border-rose-400 dark:focus-within:border-red-400/50"
                        }`}
                    >
                      <label className="text-[10px] font-bold text-gray-500 dark:text-red-400/70 uppercase tracking-widest block mb-1">
                        Receiver Address
                      </label>
                      <div className="flex items-center gap-2">
                        <FiUser
                          className={shouldShowError ? "text-rose-500 dark:text-red-500" : "text-gray-400 dark:text-red-400/50"}
                        />
                        <input
                          type="text"
                          value={receiverAddress}
                          onChange={(e) => setReceiverAddress(e.target.value)}
                          placeholder="Enter destination address"
                          className="bg-transparent outline-none text-xs md:text-sm font-mono text-gray-900 dark:text-white w-full placeholder-gray-400 dark:placeholder-white/20"
                        />
                      </div>
                    </div>

                    {shouldShowError && (
                      <p className="text-[10px] text-rose-600 dark:text-red-500 font-bold px-2">
                        Invalid {isSolana ? "Solana" : "EVM"} address format
                      </p>
                    )}
                  </div>

                  <motion.button
                    whileTap={{ scale: 0.98 }}
                    disabled={isLoading}
                    onClick={handleWithdraw}
                    className={`w-full py-3.5 md:py-4 rounded-2xl font-black text-xs md:text-sm uppercase tracking-widest text-white transition-all bg-gradient-to-r from-rose-600 to-red-500 dark:from-red-600 dark:to-rose-500 ${isLoading
                      ? "opacity-70 cursor-not-allowed"
                      : "hover:shadow-lg hover:shadow-rose-500/25 dark:hover:shadow-red-500/25"
                      }`}
                  >
                    <div className="flex items-center justify-center gap-2">
                      {isLoading ? (
                        <FiRefreshCw className="animate-spin" size={18} />
                      ) : (
                        "Confirm Withdrawal"
                      )}
                    </div>
                  </motion.button>
                </div>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body
  );
}