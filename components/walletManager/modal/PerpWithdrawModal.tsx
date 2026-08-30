"use client";
import { useState, useEffect, useCallback, useMemo } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { FiX, FiRefreshCw, FiAlertCircle, FiClock, FiCopy } from "react-icons/fi";
import { RiWallet3Line } from "react-icons/ri";
import toast from "react-hot-toast";
import { formatUnits, parseUnits, isAddress } from "ethers";
import { safeFormatNumber } from "@/utility/handy";
import { WalletType } from "@/type/common";
import Service from "@/service/user-service";
import { PRECISION_DECIMALS } from "@/constants/common/utils";

interface PerpWithdrawModalProps {
    isOpen: boolean;
    onClose: () => void;
    wallet: WalletType;
    dex: string;
    currentBalanceUsd: string; // raw balance in wei (scaled by PRECISION_DECIMALS)
    onWithdrawSuccess: () => void;
}

const USDC_DECIMALS = 6;

export default function PerpWithdrawModal({
    isOpen,
    onClose,
    wallet,
    dex,
    currentBalanceUsd,
    onWithdrawSuccess,
}: PerpWithdrawModalProps) {
    const [mounted, setMounted] = useState(false);
    const [amount, setAmount] = useState("");
    const [receiver, setReceiver] = useState("");
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        setMounted(true);
        return () => setMounted(false);
    }, []);

    // Set default receiver when wallet address changes
    useEffect(() => {
        if (wallet?.address) {
            setReceiver(wallet.address);
        }
    }, [wallet?.address]);

    // Balance in USDC (as a number)
    const balanceUsd = useMemo(() => {
        try {
            const balanceWei = BigInt(currentBalanceUsd);
            const formatted = formatUnits(balanceWei, PRECISION_DECIMALS);
            return Number(formatted);
        } catch {
            return 0;
        }
    }, [currentBalanceUsd]);

    // Parse user input amount
    const amountUsd = useMemo(() => {
        if (!amount || Number(amount) <= 0) return null;
        return Number(amount);
    }, [amount]);

    const isValidAmount = useMemo(() => {
        if (!amountUsd) return false;
        return amountUsd > 0 && amountUsd <= balanceUsd;
    }, [amountUsd, balanceUsd]);

    // Validate receiver address
    const isValidReceiver = useMemo(() => {
        if (!receiver || receiver.trim() === "") return false;
        return isAddress(receiver);
    }, [receiver]);

    const canWithdraw = useMemo(() => {
        return isValidAmount && isValidReceiver && !isLoading;
    }, [isValidAmount, isValidReceiver, isLoading]);

    const handleWithdraw = useCallback(async () => {
        if (!canWithdraw) {
            if (!isValidAmount) toast.error("Enter a valid amount within your balance");
            else if (!isValidReceiver) toast.error("Enter a valid Ethereum address");
            return;
        }

        setIsLoading(true);
        try {
            const res = await Service.withdrawPerp({
                exchange: dex.toLowerCase(),
                walletAddress: wallet.address,
                amount: amount, // Send as decimal string
                receiver: receiver,
            });

            if (res?.success) {
                toast.success(`Withdrawn ${amount} USDC to ${receiver.slice(0, 6)}...${receiver.slice(-4)}`);
                onWithdrawSuccess();
                onClose();
                setAmount("");
                setReceiver(wallet.address); // reset to default
            } else {
                const msg = res?.message || "Withdrawal failed";
                if (msg === "INSUFFICIENT_BALANCE") {
                    toast.error("Insufficient balance on perp account");
                } else {
                    toast.error(msg);
                }
            }
        } catch (error: any) {
            toast.error(error.message || "Error withdrawing");
        } finally {
            setIsLoading(false);
        }
    }, [canWithdraw, isValidAmount, isValidReceiver, amount, dex, wallet.address, receiver, onWithdrawSuccess, onClose]);

    const copyAddress = useCallback(() => {
        if (wallet?.address) {
            navigator.clipboard.writeText(wallet.address);
            toast.success("Address copied!");
        }
    }, [wallet?.address]);

    if (!mounted || !isOpen) return null;

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
                        className="relative w-full max-w-md bg-white dark:bg-[#0d1117] border border-gray-200 dark:border-white/10 rounded-[28px] overflow-hidden shadow-2xl"
                    >
                        <div className="p-6 border-b border-gray-100 dark:border-white/5 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="p-3 bg-gradient-to-br from-purple-600 to-violet-700 rounded-2xl">
                                    <RiWallet3Line size={24} className="text-white" />
                                </div>
                                <div>
                                    <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                                        Withdraw from {dex === "asterdex" ? "Asterdex" : "Hyperliquid"}
                                    </h2>
                                    <p className="text-xs text-gray-500 dark:text-gray-500">
                                        Balance: {balanceUsd.toFixed(2)} USDC
                                    </p>
                                </div>
                            </div>
                            <button
                                onClick={onClose}
                                className="p-2 hover:bg-gray-100 dark:hover:bg-white/10 rounded-xl text-gray-500 dark:text-gray-500 transition-colors"
                            >
                                <FiX size={20} />
                            </button>
                        </div>

                        <div className="p-6 space-y-5">
                            {/* Amount Input */}
                            <div className="bg-gray-50 dark:bg-[#161b22] border border-gray-200 dark:border-white/10 rounded-2xl p-4">
                                <div className="flex justify-between items-center text-[10px] text-gray-500 dark:text-gray-500 mb-2 font-bold uppercase tracking-widest">
                                    <span>Amount to Withdraw</span>
                                    <span className="text-emerald-600 dark:text-emerald-400">
                                        Balance: {balanceUsd.toFixed(2)} USDC
                                    </span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <input
                                        type="number"
                                        inputMode="decimal"
                                        value={amount}
                                        onChange={(e) => {
                                            const val = e.target.value;
                                            if (val === "" || Number(val) >= 0) {
                                                setAmount(val);
                                            }
                                        }}
                                        placeholder="0.00"
                                        min={0}
                                        step="any"
                                        className="bg-transparent outline-none text-2xl font-black text-gray-900 dark:text-white w-full [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                    />
                                    <button
                                        onClick={() => setAmount(balanceUsd.toFixed(6))}
                                        className="text-xs bg-gray-200 dark:bg-white/10 px-2.5 py-1.5 rounded-lg text-gray-700 dark:text-white font-bold tracking-widest uppercase hover:bg-gray-300 dark:hover:bg-white/20 transition-all"
                                    >
                                        MAX
                                    </button>
                                </div>
                                {amount && Number(amount) > balanceUsd && (
                                    <p className="text-xs text-red-500 dark:text-red-400 mt-2 flex items-center gap-1">
                                        <FiAlertCircle className="w-3 h-3" />
                                        Amount exceeds balance
                                    </p>
                                )}
                            </div>

                            {/* Receiver Address Input */}
                            <div>
                                <label className="text-[10px] font-bold text-gray-500 dark:text-gray-500 uppercase tracking-widest mb-2 block">
                                    Withdraw to Address
                                </label>
                                <div className="relative">
                                    <input
                                        type="text"
                                        value={receiver}
                                        onChange={(e) => setReceiver(e.target.value)}
                                        placeholder="0x..."
                                        className="w-full bg-white dark:bg-black/40 border border-gray-200 dark:border-white/10 rounded-xl p-3 text-sm text-gray-900 dark:text-white outline-none focus:border-blue-500 transition-colors font-mono"
                                    />
                                    <button
                                        onClick={copyAddress}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                                        title="Copy wallet address"
                                    >
                                        <FiCopy size={16} />
                                    </button>
                                </div>
                                {receiver && !isValidReceiver && (
                                    <p className="text-xs text-red-500 dark:text-red-400 mt-2 flex items-center gap-1">
                                        <FiAlertCircle className="w-3 h-3" />
                                        Invalid Ethereum address
                                    </p>
                                )}
                                <p className="text-[10px] text-gray-400 mt-1.5">
                                    Funds will be sent to this address. Default is your Pulse wallet address.
                                </p>
                            </div>

                            <div className="flex items-start gap-2 p-3 rounded-xl bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20">
                                <FiClock className="w-4 h-4 text-amber-600 dark:text-amber-500 mt-0.5 flex-shrink-0" />
                                <p className="text-xs text-amber-700 dark:text-amber-400">
                                    Withdrawals typically arrive in your wallet within a few minutes.
                                </p>
                            </div>

                            <motion.button
                                whileTap={{ scale: 0.98 }}
                                disabled={!canWithdraw}
                                onClick={handleWithdraw}
                                className={`w-full py-4 rounded-2xl font-black text-sm uppercase tracking-widest text-white transition-all bg-gradient-to-r from-red-600 to-rose-500 ${!canWithdraw
                                        ? "opacity-40 cursor-not-allowed"
                                        : "hover:shadow-lg shadow-red-500/20"
                                    }`}
                            >
                                {isLoading ? (
                                    <div className="flex items-center justify-center gap-2">
                                        <FiRefreshCw className="animate-spin" size={18} />
                                        Withdrawing...
                                    </div>
                                ) : (
                                    "Confirm Withdrawal"
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