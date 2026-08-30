"use client";

import { useState, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
    FiAlertTriangle,
    FiShield,
    FiDollarSign,
    FiSettings,
} from "react-icons/fi";

interface PerpTradingCautionProps {
    isOpen: boolean;
    onAccept: () => void;
    onDecline: () => void;
    dex: "asterdex" | "hyperliquid";
}

const CAUTION_ITEMS_COMMON = [
    {
        icon: FiDollarSign,
        title: "Fund your perp account",
        description:
            "Deposit a minimum of 10 Arbitrum USDC to your perp account before placing orders. Only Arbitrum USDC is accepted for deposits.",
        highlight: true,
    },
    {
        icon: FiShield,
        title: "Approve an agent wallet",
        description:
            "After funding, approve an agent wallet in the Perp tab of your Wallet Manager. This allows PulseTrader to execute trades on your behalf.",
    },
];

const CAUTION_ITEM_ASTER_SETTINGS = {
    icon: FiSettings,
    title: "Do NOT change settings on asterdex.com",
    description:
        "Changing your perp configuration (leverage, margin type, etc.) directly on asterdex.com will cause failed positions. All settings must be managed through PulseTrader only.",
    highlight: true,
};

const TERMS = [
    "I acknowledge that trading perpetual contracts involves significant risk and I may lose my deposited funds.",
];

const ASTER_TERM =
    "I will NOT modify any perp settings directly on asterdex.com — doing so will cause failed positions.";

export default function PerpTradingCaution({
    isOpen,
    onAccept,
    onDecline,
    dex,
}: PerpTradingCautionProps) {
    const [mounted, setMounted] = useState(false);
    const [checkedTerms, setCheckedTerms] = useState<Set<number>>(new Set());

    const isAster = dex === "asterdex";
    const allTerms = isAster ? [...TERMS, ASTER_TERM] : TERMS;
    const allChecked = checkedTerms.size === allTerms.length;

    useEffect(() => {
        setMounted(true);
        return () => setMounted(false);
    }, []);

    useEffect(() => {
        if (isOpen) {
            setCheckedTerms(new Set());
            document.body.style.overflow = "hidden";
        } else {
            document.body.style.overflow = "unset";
        }
        return () => {
            document.body.style.overflow = "unset";
        };
    }, [isOpen]);

    const handleToggleTerm = useCallback((index: number) => {
        setCheckedTerms((prev) => {
            const next = new Set(prev);
            if (next.has(index)) {
                next.delete(index);
            } else {
                next.add(index);
            }
            return next;
        });
    }, []);

    if (!mounted || !isOpen) return null;

    const cautionItems = isAster
        ? [...CAUTION_ITEMS_COMMON, CAUTION_ITEM_ASTER_SETTINGS]
        : CAUTION_ITEMS_COMMON;

    const dexName = isAster ? "Asterdex" : "Hyperliquid";

    return createPortal(
        <AnimatePresence>
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-2 xl:p-4">
                {/* Backdrop */}
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="absolute inset-0 bg-black/70 backdrop-blur-sm"
                />

                {/* Modal */}
                <motion.div
                    initial={{ opacity: 0, scale: 0.96, y: 15 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.96, y: 15 }}
                    transition={{ type: "spring", damping: 25, stiffness: 300 }}
                    className="relative max-w-[400px] 2xl:max-w-[600px] bg-[#11161A] border border-white/5 rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[60vh] 2xl:max-h-[90vh]"
                >
                    <div className="flex-1 overflow-y-auto px-8 py-8">
                        {/* Header */}
                        <div className="text-center mb-8">
                            <h2 className="text-[22px] font-medium text-white mb-2">
                                {dexName} Perpetual Trading
                            </h2>
                            <p className="text-[15px] text-gray-400">
                                To proceed, review and accept the following:
                            </p>
                        </div>

                        {/* Caution Items mapped to the clean UI */}
                        <div className="space-y-6 mb-8">
                            {cautionItems.map((item, i) => (
                                <div key={i} className="flex gap-4">
                                    <item.icon
                                        className={`w-[22px] h-[22px] flex-shrink-0 mt-0.5 ${item.highlight ? "text-emerald-500" : "text-gray-500"
                                            }`}
                                    />
                                    <div>
                                        <h3 className="text-[12px] font-medium text-gray-200 mb-1">
                                            {item.title}
                                        </h3>
                                        <p className="text-[10px] text-gray-500 leading-relaxed">
                                            {item.description}
                                        </p>
                                    </div>
                                </div>
                            ))}

                            {/* Arbitrum Emphasis styled cleanly */}
                            <div className="flex gap-4">
                                <FiAlertTriangle className="w-[15px] h-[22px] flex-shrink-0 mt-0.5 text-blue-500" />
                                <div>
                                    <h3 className="text-[15px] font-medium text-gray-200 mb-1">
                                        Arbitrum USDC Only
                                    </h3>
                                    <p className="text-[10px] text-gray-500 leading-relaxed">
                                        Only Arbitrum network USDC is accepted for perp deposits. Other assets will be auto-swapped/bridged.
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Divider */}
                        <div className="h-px w-full bg-white/5 mb-8" />

                        {/* Terms & Conditions Checkboxes */}
                        <div className="space-y-5">
                            {allTerms.map((term, index) => (
                                <div
                                    key={index}
                                    onClick={() => handleToggleTerm(index)}
                                    className="flex items-start gap-4 cursor-pointer group"
                                >
                                    <div
                                        className={`w-5 h-5 mt-0.5 rounded-[4px] border flex items-center justify-center flex-shrink-0 transition-all ${checkedTerms.has(index)
                                                ? "bg-[#215a4b] border-[#215a4b]"
                                                : "bg-transparent border-gray-600 group-hover:border-gray-500"
                                            }`}
                                    >
                                        {checkedTerms.has(index) && (
                                            <svg
                                                viewBox="0 0 14 14"
                                                className="w-3.5 h-3.5 text-white fill-current"
                                            >
                                                <path
                                                    d="M11.6666 3.5L5.24992 9.91667L2.33325 7"
                                                    stroke="currentColor"
                                                    strokeWidth="2"
                                                    strokeLinecap="round"
                                                    strokeLinejoin="round"
                                                />
                                            </svg>
                                        )}
                                    </div>
                                    <span className="text-[14px] text-gray-400 leading-relaxed select-none">
                                        {term}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Footer Actions */}
                    <div className="p-8 pt-0 flex gap-4">
                        <button
                            onClick={onDecline}
                            className="flex-1 py-3.5 rounded-xl font-medium text-[15px] text-white bg-[#2B3036] hover:bg-[#363C44] transition-colors"
                        >
                            Decline
                        </button>
                        <button
                            onClick={allChecked ? onAccept : undefined}
                            disabled={!allChecked}
                            className={`flex-1 py-3.5 rounded-xl font-medium text-[15px] transition-all duration-200 ${allChecked
                                    ? "bg-[#2B7A66] hover:bg-[#328A74] text-white shadow-lg shadow-[#2B7A66]/20 cursor-pointer"
                                    : "bg-[#1C4136] text-[#0A1A15] cursor-not-allowed"
                                }`}
                        >
                            Accept
                        </button>
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>,
        document.body
    );
}