import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  FiX,
  FiRefreshCw,
  FiAlertCircle,
  FiClock,
  FiInfo,
} from "react-icons/fi";
import toast from "react-hot-toast";
import { formatUnits, parseUnits, ZeroAddress } from "ethers";

import { WalletType, UserType } from "@/type/common";
import { getEvmBalance } from "@/lib/blockchain/balance";
import { getKyberSwapEncode } from "@/lib/oracle/kyber";
import Service from "@/service/user-service";
import { useStore } from "@/store/useStore";
import { useShallow } from "zustand/shallow";
import { calculateWalletTokenAllocation } from "@/utility/orderUtility";
import { notifyFromApiError } from "@/lib/utils";
import { formatCompactNumber, safeParseUnits } from "@/utility/handy";
import { getGasFee } from "@/lib/blockchain/gas";
import { useDebounce } from "@/hooks/useDebounce";
import { isTradeFeeExemptStatus } from "@/utility/orderUtility";

// ─── Constants ──────────────────────────────────────────────────────────
const USDC_DEPOSIT_ARB_GAS_LIMIT = 1_000_000;
const SWAP_DEPOSIT_ARB_GAS_LIMIT = 2_500_000;

const TOKEN_OPTIONS: TokenOption[] = [
  {
    symbol: "USDC (Arbitrum)",
    address: "0xaf88d065e77c8cC2239327C5EDb3A432268e5831",
    decimals: 6,
    chainId: 42161,
    isArbUsdc: true,
  },
  {
    symbol: "USDT (Arbitrum)",
    address: "0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9",
    decimals: 6,
    chainId: 42161,
    isArbUsdc: false,
  },
  {
    symbol: "ETH (Arbitrum)",
    address: ZeroAddress,
    decimals: 18,
    chainId: 42161,
    isArbUsdc: false,
  },
];

// ─── Types ──────────────────────────────────────────────────────────────
interface TokenOption {
  symbol: string;
  address: string;
  decimals: number;
  chainId: number;
  isArbUsdc: boolean;
}

interface QuoteInfoType {
  amountOut: bigint;
  isBelowMin: boolean;
  router: string;
  data: string;
  [key: string]: any;
}

interface PerpDepositModalProps {
  isOpen: boolean;
  onClose: () => void;
  wallet: WalletType;
  initialDex: string;
  user: UserType;
}

// ─── Component ──────────────────────────────────────────────────────────
export default function PerpDepositModal({
  isOpen,
  onClose,
  wallet,
  initialDex,
  user
}: PerpDepositModalProps) {
  const [mounted, setMounted] = useState(false);
  const [amount, setAmount] = useState("");
  const [selectedDex, setSelectedDex] = useState(initialDex);
  const [walletBalance, setWalletBalance] = useState<bigint>(BigInt(0));
  const [nativeBalance, setNativeBalance] = useState<bigint>(BigInt(0));
  const [gasCostEstimate, setGasCostEstimate] = useState<bigint>(BigInt(0));
  const [isBalanceLoading, setIsBalanceLoading] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isQuoting, setIsQuoting] = useState(false);
  const [quoteInfo, setQuoteInfo] = useState<QuoteInfoType | null>(null);
  const [quotedForAmount, setQuotedForAmount] = useState<bigint | null>(null);
  const [selectedToken, setSelectedToken] = useState<TokenOption>(TOKEN_OPTIONS[0]);
  const [lockedBalance, setLockedBalance] = useState<bigint>(BigInt(0));

  // ─── Refs ──────────────────────────────────────────────────────────────
  const quoteRequestId = useRef(0);
  const balanceRequestId = useRef(0);
  const lastQuotedTokenRef = useRef<string>("");

  const needsSwap = useMemo(
    () => selectedToken.address.toLowerCase() !== systemInfo?.perpDepositToken?.toLowerCase(),
    [selectedToken.address]
  );

  const { userOrders, systemInfo } = useStore(
    useShallow((state: any) => ({
      userOrders: state.userOrders || [],
      systemInfo: state.systemInfo,
    }))
  );

  // ─── Lifecycle ──────────────────────────────────────────────────────
  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  useEffect(() => {
    setSelectedDex(initialDex);
  }, [initialDex]);

  // ─── Balance fetching ──────────────────────────────────────────────
  const fetchBalances = useCallback(async () => {
    const address = wallet?.address;
    if (!address || !selectedToken) {
      setWalletBalance(BigInt(0));
      setNativeBalance(BigInt(0));
      return;
    }

    const requestId = ++balanceRequestId.current;
    setIsBalanceLoading(true);

    try {
      const [tokenBal, nativeBal] = await Promise.all([
        getEvmBalance({
          walletAddress: address,
          chainId: selectedToken.chainId,
          tokenAddress: selectedToken.address,
        }),
        getEvmBalance({
          walletAddress: address,
          chainId: selectedToken.chainId,
          tokenAddress: ZeroAddress,
        }),
      ]);

      if (requestId !== balanceRequestId.current) return;
      setWalletBalance(tokenBal);
      setNativeBalance(nativeBal);
    } catch {
      if (requestId !== balanceRequestId.current) return;
      setWalletBalance(BigInt(0));
      setNativeBalance(BigInt(0));
    } finally {
      if (requestId === balanceRequestId.current) setIsBalanceLoading(false);
    }
  }, [wallet?.address, selectedToken]);

  // ─── Locked balance ────────────────────────────────────────────────
  useEffect(() => {
    if (wallet?._id && selectedToken?.address) {
      const locked = calculateWalletTokenAllocation({
        orders: userOrders,
        walletId: wallet._id,
        tokenAddress: selectedToken.address,
        isFeeExempt: isTradeFeeExemptStatus(systemInfo.userLevels, user?.status)
      });
      setLockedBalance(locked);
    } else {
      setLockedBalance(BigInt(0));
    }
  }, [wallet?._id, selectedToken?.address, userOrders]);

  // ─── Fetch on open & token change ──────────────────────────────
  useEffect(() => {
    if (isOpen) {
      fetchBalances();
      setQuoteInfo(null);
      setQuotedForAmount(null);
      setAmount("");
      lastQuotedTokenRef.current = "";
    }
  }, [isOpen, selectedToken, fetchBalances]);

  // ─── Gas estimation ──────────────────────────────────────────────
  const estimateGas = useCallback(async () => {
    if (!wallet?.address) {
      setGasCostEstimate(BigInt(0));
      return;
    }

    try {
      const feeData: any = await getGasFee(Number(systemInfo?.perpDepositChain) || 42161);
      let gasPrice = BigInt(0);

      if (feeData?.gasPrice) {
        gasPrice = BigInt(feeData.gasPrice);
      } else if (feeData?.maxFeePerGas) {
        gasPrice = BigInt(feeData.maxFeePerGas);
      } else if (feeData?.result?.gasPrice) {
        gasPrice = BigInt(feeData.result.gasPrice);
      }

      if (gasPrice === BigInt(0)) {
        gasPrice = BigInt(100_000_000); // fallback 0.1 Gwei
      }

      const gasLimit = needsSwap ? SWAP_DEPOSIT_ARB_GAS_LIMIT : USDC_DEPOSIT_ARB_GAS_LIMIT;
      const cost = gasPrice * BigInt(gasLimit);
      setGasCostEstimate(cost);
    } catch {
      setGasCostEstimate(BigInt(500_000_000_000_000)); // fallback 0.0005 ETH
    }
  }, [wallet?.address, needsSwap]);

  useEffect(() => {
    if (isOpen && wallet?.address) {
      estimateGas();
    }
  }, [isOpen, wallet?.address, needsSwap, estimateGas]);

  // ─── Derived state ──────────────────────────────────────────────
  const availableBalance = useMemo(
    () => (walletBalance - lockedBalance > 0 ? walletBalance - lockedBalance : BigInt(0)),
    [walletBalance, lockedBalance]
  );

  const parsedAmount = useMemo(() => {
    try {
      if (!amount || Number(amount) <= 0) return null;
      return parseUnits(amount, selectedToken.decimals);
    } catch {
      return null;
    }
  }, [amount, selectedToken.decimals]);

  const minimumUsdcDeposit = safeParseUnits(systemInfo?.perpMinimumUsdcDeposit, 6) || BigInt(10000000); // 10 USDC
  const isBelowMinimum =
    selectedToken.isArbUsdc &&
    parsedAmount !== null &&
    parsedAmount < minimumUsdcDeposit;

  // When depositing native token (ETH), we need to account for gas fees in the balance check.
  const isInsufficientBalance = parsedAmount !== null &&
    ((selectedToken.address === ZeroAddress ? parsedAmount + gasCostEstimate : parsedAmount) > availableBalance);

  const isInsufficientNative = useMemo(() => {
    if (gasCostEstimate === BigInt(0)) return false;
    // If depositing ETH, we handle gas in isInsufficientBalance.
    if (selectedToken.address === ZeroAddress) return false;
    return nativeBalance < gasCostEstimate;
  }, [nativeBalance, gasCostEstimate, selectedToken.address]);

  const isQuoteStale =
    needsSwap &&
    quoteInfo !== null &&
    quotedForAmount !== null &&
    parsedAmount !== null &&
    parsedAmount !== quotedForAmount;

  // ─── Quote logic ──────────────────────────────────────────────
  const handleQuote = useCallback(
    async (amountToQuote: bigint | null, { silent = false }: { silent?: boolean } = {}) => {
      if (!amountToQuote) {
        if (!silent) toast.error("Enter a valid amount");
        return;
      }
      if (!wallet?.address) {
        if (!silent) toast.error("Pulse wallet not found");
        return;
      }

      const requestId = ++quoteRequestId.current;
      setIsQuoting(true);
      setQuoteInfo(null);

      try {
        const res: any = await getKyberSwapEncode({
          tokenIn: selectedToken.address,
          tokenOut: systemInfo?.perpDepositToken,
          amountIn: amountToQuote.toString(),
          chainId: selectedToken.chainId,
          slippageBps: 50,
          userAddress: wallet.address,
          feeBps: 0,
          feeReceiver: wallet.address,
          feeToken: "tokenIn",
          priority: 1,
        });

        if (requestId !== quoteRequestId.current) return;

        if (res?.success) {
          const amountOut = BigInt(res.amountOut);
          const isBelowMin = amountOut < minimumUsdcDeposit;
          setQuoteInfo({ ...res, amountOut, isBelowMin });
          setQuotedForAmount(amountToQuote);
          lastQuotedTokenRef.current = selectedToken.address;

          if (isBelowMin) {
            toast.error(
              `Estimated USDC output (${formatUnits(amountOut, 6)}) is below the minimum of ${formatUnits(
                minimumUsdcDeposit,
                6
              )} USDC`
            );
          } else if (!silent) {
            toast.success(`Quote received: ~${formatUnits(amountOut, 6)} USDC`);
          }
        } else {
          if (!silent) toast.error(res?.message || "Quote failed");
        }
      } catch {
        if (requestId !== quoteRequestId.current) return;
        if (!silent) toast.error("Failed to get deposit quote");
      } finally {
        if (requestId === quoteRequestId.current) setIsQuoting(false);
      }
    },
    [selectedToken, wallet?.address]
  );

  // ─── Auto‑quote with debounce ────────────────────────────────────
  const debouncedAmount = useDebounce(amount, 450);

  useEffect(() => {
    if (lastQuotedTokenRef.current !== selectedToken.address) {
      lastQuotedTokenRef.current = selectedToken.address;
      // Clear stale quote
      setQuoteInfo(null);
      setQuotedForAmount(null);
      return;
    }

    if (!needsSwap || !isOpen) return;
    if (!debouncedAmount || Number(debouncedAmount) <= 0) return;

    let debouncedParsed: bigint | null = null;
    try {
      debouncedParsed = parseUnits(debouncedAmount, selectedToken.decimals);
    } catch {
      return;
    }

    if (!debouncedParsed || debouncedParsed > availableBalance) return;

    handleQuote(debouncedParsed, { silent: true });
  }, [
    debouncedAmount,
    needsSwap,
    isOpen,
    selectedToken.address,
    selectedToken.decimals,
    availableBalance,
    handleQuote,
  ]);

  // ─── Deposit submission ──────────────────────────────────────────
  const handleApiDeposit = async () => {
    if (!amount || Number(amount) <= 0) return toast.error("Enter a valid amount");
    if (!parsedAmount) return toast.error("Invalid amount");

    // Validate balance
    if (isInsufficientBalance) {
      toast.error("Insufficient Pulse wallet balance");
      return;
    }
    if (isInsufficientNative) {
      toast.error(
        `Insufficient ETH for gas fees. Need at least ${formatUnits(gasCostEstimate, 18)} ETH.`
      );
      return;
    }

    // If swapping, require a valid quote
    if (needsSwap) {
      if (!quoteInfo || quoteInfo.isBelowMin) {
        toast.error(
          `Please get a valid quote first (minimum ${formatUnits(
            minimumUsdcDeposit,
            6
          )} USDC output)`
        );
        return;
      }
      if (isQuoteStale) {
        toast.error("The amount changed since your last quote — please re-quote before depositing.");
        return;
      }
    }

    setIsLoading(true);
    try {
      const res: any = await Service.perpDeposit({
        exchange: selectedDex,
        walletAddress: wallet.address,
        amount: parsedAmount.toString(),
        tokenAddress: selectedToken.address,
        chainId: selectedToken.chainId,
        decimals: selectedToken.decimals,
      });

      if (res?.success || res?.data?.success) {
        const notice = res?.data?.notice || res?.data?.data?.notice || "";
        toast.success(`Deposited to ${selectedDex} successfully!${notice ? ` ${notice}` : ""}`);
        onClose();
        setAmount("");
        setQuoteInfo(null);
        setQuotedForAmount(null);
      } else {
        const msg = res?.data?.message || res?.message || "Deposit failed";
        if (msg === "MINIMUM_DEPOSIT_REQUIRED") {
          toast.error(`Minimum deposit is ${formatUnits(minimumUsdcDeposit, 6)} USDC`);
        } else {
          notifyFromApiError(msg);
        }
      }
    } catch {
      toast.error("Error depositing via Pulse Wallet");
    } finally {
      setIsLoading(false);
    }
  };

  // ─── Can deposit? ────────────────────────────────────────────────
  const canDeposit = useMemo(() => {
    if (!parsedAmount || isBelowMinimum || isInsufficientBalance || isLoading || isQuoting)
      return false;
    if (isInsufficientNative) return false;
    if (needsSwap && isQuoteStale) return false;
    if (needsSwap && (!quoteInfo || quoteInfo.isBelowMin)) return false;
    return true;
  }, [
    parsedAmount,
    isBelowMinimum,
    isInsufficientBalance,
    isLoading,
    isQuoting,
    needsSwap,
    isQuoteStale,
    quoteInfo,
    isInsufficientNative,
  ]);

  // ─── Handlers ────────────────────────────────────────────────────
  const handleInputDepositAmount = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { value } = e.target;
    if (value !== "" && Number(value) < 0) return;
    setAmount(value);
    if (!needsSwap || value === "" || Number(value) <= 0) {
      setQuoteInfo(null);
      setQuotedForAmount(null);
    }
  };

  const handleTokenChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const token = TOKEN_OPTIONS.find((t) => t.address === e.target.value);
    if (token) {
      setSelectedToken(token);
      setQuoteInfo(null);
      setQuotedForAmount(null);
      setAmount("");
      lastQuotedTokenRef.current = "";
    }
  };

  // ─── Render ──────────────────────────────────────────────────────
  if (!mounted || !isOpen) return null;

  const displayBalance = formatUnits(availableBalance, selectedToken.decimals);
  const displayLocked = formatUnits(lockedBalance, selectedToken.decimals);
  const displayNative = formatUnits(nativeBalance, 18);

  const getButtonText = () => {
    if (isLoading) return "Processing...";
    if (needsSwap) {
      if (isQuoting) return "Fetching Quote...";
      if (!quoteInfo) return "Get Quote First";
      if (isQuoteStale) return "Re‑quote";
      if (quoteInfo.isBelowMin) return "Minimum USDC not met";
      return "Swap & Deposit";
    }
    return "Deposit";
  };

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[99] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/50 dark:bg-black/80 backdrop-blur-sm"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="relative w-full max-w-md bg-white dark:bg-[#0d1117] border border-gray-200 dark:border-white/10 rounded-[28px] overflow-hidden shadow-2xl max-h-[90vh] overflow-y-auto"
          >
            {/* Header */}
            <div className="p-6 border-b border-gray-100 dark:border-white/5 flex items-center justify-between sticky top-0 bg-white/80 dark:bg-[#0d1117]/90 backdrop-blur-sm z-10">
              <div>
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                  Deposit to {selectedDex === "asterdex" ? "Asterdex" : "Hyperliquid"}
                </h2>
                <p className="text-[10px] uppercase tracking-widest font-bold text-gray-500 dark:text-gray-500 mt-1">
                  Minimum {formatUnits(minimumUsdcDeposit, 6)} USDC
                </p>
              </div>
              <button
                onClick={onClose}
                className="p-2 hover:bg-gray-100 dark:hover:bg-white/10 rounded-xl text-gray-500 dark:text-gray-500 transition-colors"
              >
                <FiX size={20} />
              </button>
            </div>

            <div className="p-6 space-y-5">
              {/* DEX Selection */}
              {/* <div>
                <label className="text-[10px] font-bold text-gray-500 dark:text-gray-500 uppercase tracking-widest mb-2 block">
                  Target Protocol
                </label>
                <div className="flex gap-2">
                  {["hyperliquid"].map((dex) => (
                    <button
                      key={dex}
                      onClick={() => {
                        setSelectedDex(dex);
                        setQuoteInfo(null);
                      }}
                      className={`flex-1 py-3 rounded-xl font-bold text-xs uppercase tracking-widest transition-all ${selectedDex === dex
                        ? dex === "asterdex"
                          ? "bg-purple-600 text-white"
                          : "bg-blue-600 text-white"
                        : "bg-gray-100 dark:bg-white/5 text-gray-500 dark:text-gray-500 hover:bg-gray-200 dark:hover:bg-white/10"
                        }`}
                    >
                      {dex === "asterdex" ? "Asterdex" : "Hyperliquid"}
                    </button>
                  ))}
                </div>
              </div> */}

              {/* Token Selection */}
              <div>
                <label className="text-[10px] font-bold text-gray-500 dark:text-gray-500 uppercase tracking-widest mb-2 block">
                  Deposit Token
                </label>
                <select
                  value={selectedToken.address}
                  onChange={handleTokenChange}
                  className="w-full bg-white dark:bg-black/40 border border-gray-200 dark:border-white/10 rounded-xl p-3 text-gray-900 dark:text-white outline-none text-sm focus:border-blue-500 transition-colors"
                >
                  {TOKEN_OPTIONS.map((t) => (
                    <option key={t.address} value={t.address}>
                      {t.symbol}
                    </option>
                  ))}
                </select>
              </div>

              {/* Amount Input */}
              <div className="bg-gray-50 dark:bg-[#161b22] border border-gray-200 dark:border-white/10 rounded-2xl p-4">
                <div className="flex justify-between items-center text-[10px] text-gray-500 dark:text-gray-500 mb-2 font-bold uppercase tracking-widest">
                  <span>Amount to Deposit</span>
                  <div className="flex gap-2.5">
                    <div className="flex items-center gap-1.5">
                      <span>Locked:</span>
                      <span className="text-red-500 dark:text-red-400 normal-case">
                        {formatCompactNumber(displayLocked, 4)} {selectedToken.symbol.split(" ")[0]}
                      </span>
                    </div>
                    <button
                      onClick={fetchBalances}
                      className="flex items-center gap-1.5 hover:text-gray-900 dark:hover:text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      disabled={isBalanceLoading}
                    >
                      <FiRefreshCw
                        className={`w-3 h-3 text-emerald-500 dark:text-emerald-400 ${isBalanceLoading ? "animate-spin" : ""
                          }`}
                      />
                      {isBalanceLoading ? (
                        <span className="text-emerald-600/60 dark:text-emerald-400/60 normal-case">
                          Loading...
                        </span>
                      ) : (
                        <span className="text-emerald-600 dark:text-emerald-400 normal-case">
                          {formatCompactNumber(displayBalance, 4)} {selectedToken.symbol.split(" ")[0]}
                        </span>
                      )}
                    </button>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    inputMode="decimal"
                    value={amount}
                    onChange={handleInputDepositAmount}
                    placeholder="0.00"
                    min={0}
                    step="any"
                    className="bg-transparent outline-none text-2xl font-black text-gray-900 dark:text-white w-full [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                  />
                  <button
                    onClick={() => {
                      if (availableBalance > 0) {
                        const maxAmountStr = formatUnits(availableBalance, selectedToken.decimals);
                        setAmount(maxAmountStr);
                        // Debounced effect handles quoting automatically if needsSwap is true
                        if (!needsSwap) {
                          setQuoteInfo(null);
                          setQuotedForAmount(null);
                        }
                      } else {
                        toast.error("No available balance");
                      }
                    }}
                    className="text-xs bg-gray-200 dark:bg-white/10 px-2.5 py-1.5 rounded-lg text-gray-700 dark:text-white font-bold tracking-widest uppercase hover:bg-gray-300 dark:hover:bg-white/20 transition-all"
                  >
                    MAX
                  </button>
                </div>

                {/* Validation messages */}
                {isBelowMinimum && (
                  <p className="text-xs text-red-500 dark:text-red-400 mt-2 flex items-center gap-1">
                    <FiAlertCircle className="w-3 h-3" />
                    Minimum deposit is {formatUnits(minimumUsdcDeposit, 6)} USDC
                  </p>
                )}
                {isInsufficientBalance && !isBelowMinimum && (
                  <p className="text-xs text-red-500 dark:text-red-400 mt-2 flex items-center gap-1">
                    <FiAlertCircle className="w-3 h-3" />
                    Insufficient Pulse wallet balance
                  </p>
                )}
                {isInsufficientNative && (
                  <p className="text-xs text-red-500 dark:text-red-400 mt-2 flex items-center gap-1">
                    <FiAlertCircle className="w-3 h-3" />
                    Insufficient ETH for gas. Need ~{formatUnits(gasCostEstimate, 18)} ETH.
                  </p>
                )}
              </div>

              {/* Quote section – shown for non-USDC tokens */}
              {needsSwap && (
                <>
                  <div className="flex items-start gap-2 p-3 rounded-xl bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800/30">
                    <FiInfo className="w-4 h-4 text-blue-500 dark:text-blue-400 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-xs text-blue-700 dark:text-blue-300 font-medium">
                        {selectedToken.symbol} will be swapped to USDC before depositing.
                      </p>
                      <p className="text-[10px] text-blue-600/70 dark:text-blue-400/70 mt-0.5">
                        The Pulse wallet will execute the swap automatically on-chain.
                      </p>
                    </div>
                  </div>

                  {!quoteInfo ? (
                    <button
                      onClick={() => handleQuote(parsedAmount)}
                      disabled={!parsedAmount || isQuoting}
                      className="w-full py-3 rounded-xl font-bold text-xs uppercase tracking-widest text-white bg-gray-800 dark:bg-white/10 hover:bg-gray-700 dark:hover:bg-white/20 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      {isQuoting ? (
                        <div className="flex items-center justify-center gap-2">
                          <FiRefreshCw className="animate-spin" size={14} />
                          Fetching Quote...
                        </div>
                      ) : parsedAmount ? (
                        "Get Quote"
                      ) : (
                        "Enter amount to see quote"
                      )}
                    </button>
                  ) : (
                    <div
                      className={`p-3 rounded-xl border ${quoteInfo.isBelowMin
                        ? "bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800/30"
                        : isQuoteStale || isQuoting
                          ? "bg-gray-50 dark:bg-white/5 border-gray-200 dark:border-white/10"
                          : "bg-emerald-50 dark:bg-emerald-500/10 border-emerald-200 dark:border-emerald-500/20"
                        }`}
                    >
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-gray-600 dark:text-gray-400">Estimated USDC received</span>
                        <span
                          className={`font-bold flex items-center gap-1.5 ${quoteInfo.isBelowMin
                            ? "text-red-600 dark:text-red-400"
                            : isQuoteStale || isQuoting
                              ? "text-gray-500 dark:text-gray-400"
                              : "text-emerald-700 dark:text-emerald-400"
                            }`}
                        >
                          {(isQuoteStale || isQuoting) && <FiRefreshCw className="w-3 h-3 animate-spin" />}
                          ~{Number(formatUnits(quoteInfo.amountOut || "0", 6)).toFixed(2)} USDC
                        </span>
                      </div>

                      {(isQuoteStale || isQuoting) && (
                        <p className="text-[10px] text-gray-500 dark:text-gray-400 mt-1">
                          Updating quote for the new amount...
                        </p>
                      )}

                      {quoteInfo.isBelowMin && !isQuoteStale && !isQuoting && (
                        <p className="text-xs text-red-500 dark:text-red-400 mt-1 flex items-center gap-1">
                          <FiAlertCircle className="w-3 h-3" />
                          Below minimum deposit ({formatUnits(minimumUsdcDeposit, 6)} USDC)
                        </p>
                      )}

                      <button
                        onClick={() => handleQuote(parsedAmount)}
                        disabled={isQuoting}
                        className="text-[10px] text-blue-500 dark:text-blue-400 mt-1.5 hover:underline disabled:opacity-50"
                      >
                        Re‑quote
                      </button>
                    </div>
                  )}
                </>
              )}

              {/* Time Notice */}
              <div className="flex items-center gap-2 text-[10px] text-gray-500 dark:text-gray-500 px-1">
                <FiClock className="w-3.5 h-3.5" />
                <span>Funds appear in your perp account within 2-3 minutes after deposit.</span>
              </div>

              {/* Deposit Button */}
              <motion.button
                whileTap={{ scale: 0.98 }}
                disabled={!canDeposit}
                onClick={handleApiDeposit}
                className={`w-full py-4 rounded-2xl font-black text-sm uppercase tracking-widest text-white transition-all ${selectedDex === "asterdex"
                  ? "bg-gradient-to-r from-purple-600 to-violet-500"
                  : "bg-gradient-to-r from-blue-600 to-cyan-500"
                  } ${!canDeposit ? "opacity-40 cursor-not-allowed" : "hover:shadow-lg shadow-blue-500/20"}`}
              >
                {isLoading ? (
                  <div className="flex items-center justify-center gap-2">
                    <FiRefreshCw className="animate-spin" size={18} />
                    Processing...
                  </div>
                ) : (
                  getButtonText()
                )}
              </motion.button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body
  );
}