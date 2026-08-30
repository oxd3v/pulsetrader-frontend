"use client";
import React, { useState, useMemo } from "react";
import Link from "next/link";
import {
  FiArrowUpRight,
  FiCheck,
  FiZap,
  FiShield,
  FiBarChart2,
  FiLock,
  FiTarget,
  FiCpu,
  FiMessageCircle,
  FiSettings,
  FiStar,
  FiTrendingUp,
  FiLayers,
  FiDatabase,
  FiGlobe,
  FiDollarSign,
} from "react-icons/fi";
import { useStore } from "@/store/useStore";
import { useShallow } from "zustand/shallow";
import { USER_LEVEL } from "@/constants/common/user";

// ─── Types ──────────────────────────────────────────────────────────────
interface TierBenefit {
  maxOrder: number | string;
  maxWallets: number | string;
  maxEVMWallets: number | string;
  maxSVMWallets: number | string;
  maxAccessAsset: number | string;
  isDemoTestnet?: boolean;
  isTradeFeeExempt?: boolean;
  supportTrading: string[];
  supportStrategy: string[];
}

// ─── Helpers ────────────────────────────────────────────────────────────
const formatStakeAmount = (quantity: string) => {
  const num = Number(quantity);
  if (num >= 1_000_000) return `${(num / 1_000_000).toFixed(0)}M`;
  if (num >= 1_000) return `${(num / 1_000).toFixed(0)}K`;
  return quantity;
};

// ─── Sub‑Components ──────────────────────────────────────────────────

const Badge = ({ label, className }: { label: string; className?: string }) => (
  <span className={`inline-block px-2 py-0.5 text-[9px] font-bold uppercase tracking-widest rounded-full ${className}`}>
    {label}
  </span>
);

const FeatureItem = ({ text, isUpcoming = false }: { text: string; isUpcoming?: boolean }) => (
  <li className="flex items-center gap-3 text-sm group">
    {isUpcoming ? (
      <FiSettings className="text-amber-500/50 group-hover:rotate-90 transition-transform" size={14} />
    ) : (
      <FiCheck className="text-emerald-500" size={16} />
    )}
    <span className={isUpcoming ? "text-gray-500 italic" : "text-gray-700 dark:text-gray-300"}>
      {text}
      {isUpcoming && <span className="ml-2 text-[10px] uppercase tracking-tighter opacity-70">Soon</span>}
    </span>
  </li>
);

// ─── Card Component ──────────────────────────────────────────────────

const PricingCard = ({ tierKey, userStatus, onSelect }: any) => {
  const id = tierKey.toLowerCase();
  const base = USER_LEVEL[tierKey];
  const benefits = base.benefits as TierBenefit;
  const stakeReq = base.requireMents?.GLADIATOR?.quantity || "0";

  // Tier-specific display data
  const tierDisplay: any = {
    iron: {
      icon: <FiZap className="text-gray-400" size={24} />,
      description: "For casual traders starting their automation journey.",
      color: "gray",
      popular: false,
    },
    silver: {
      icon: <FiTrendingUp className="text-blue-400" size={24} />,
      description: "Enhanced capacity for active daily traders.",
      color: "blue",
      popular: false,
    },
    gold: {
      icon: <FiStar className="text-yellow-400" size={24} />,
      description: "The sweet spot for professional DeFi enthusiasts.",
      color: "yellow",
      popular: true,
    },
    platinum: {
      icon: <FiShield className="text-cyan-400" size={24} />,
      description: "Professional tools with developer‑grade support.",
      color: "cyan",
      popular: false,
    },
    diamond: {
      icon: <FiCpu className="text-purple-400" size={24} />,
      description: "Institutional scale with no limits and full API.",
      color: "purple",
      popular: false,
    },
  };

  const display: any = tierDisplay[id];

  // Build feature list from benefits
  const features: string[] = [];
  if (benefits.maxOrder !== undefined) {
    features.push(`${benefits.maxOrder} Concurrent Orders`);
  }
  if (benefits.maxWallets !== undefined) {
    features.push(`${benefits.maxWallets} Wallets`);
  }
  if (benefits.supportStrategy?.length) {
    const strategyMap: Record<string, string> = {
      limit: "Limit",
      scalp: "Scalp",
      grid: "Grid",
      dca: "DCA",
      sellToken: "Sell Token",
      algo: "Algo",
    };
    const strategies = benefits.supportStrategy.map((s) => strategyMap[s] || s);
    features.push(strategies.join(", "));
  }
  if (benefits.supportTrading?.includes("perpetual")) {
    features.push("Perpetual Trading");
  }
  if (benefits.isDemoTestnet) {
    features.push("Demo / Testnet Mode");
  }
  if (benefits.isTradeFeeExempt) {
    features.push("Pulse Fee Exempt");
  }

  // Badges
  const badges: { label: string; className: string }[] = [];
  if (benefits.isDemoTestnet) {
    badges.push({ label: "Demo/Testnet", className: "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300" });
  }
  if (benefits.isTradeFeeExempt) {
    badges.push({ label: "Fee Exempt", className: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300" });
  }

  const isActive = userStatus === tierKey;

  return (
    <div
      className={`relative flex flex-col p-6 rounded-3xl transition-all duration-300 border ${display.popular
          ? "border-yellow-500/50 bg-yellow-500/5 dark:bg-yellow-500/[0.02] shadow-xl scale-105 z-10"
          : "border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900/50"
        } hover:border-blue-500/50 hover:shadow-2xl group`}
    >
      {display.popular && (
        <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-gradient-to-r from-yellow-500 to-amber-600 text-white text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-widest shadow-lg">
          Most Popular
        </div>
      )}

      <div className="mb-6">
        <div className="flex justify-between items-start mb-4">
          <div className="p-3 rounded-2xl bg-gray-100 dark:bg-gray-800 group-hover:scale-110 transition-transform">
            {display.icon}
          </div>
          <span className="text-xs font-mono text-gray-500 uppercase tracking-widest">
            {stakeReq !== "0" ? `${formatStakeAmount(stakeReq)} GLADIATOR` : "Free"}
          </span>
        </div>
        <h3 className="text-2xl font-bold dark:text-white">{base.name}</h3>
        <p className="text-sm text-gray-500 mt-2 leading-relaxed">{display.description}</p>
      </div>

      {/* Badges */}
      {badges.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-4">
          {badges.map((badge, idx) => (
            <Badge key={idx} label={badge.label} className={badge.className} />
          ))}
        </div>
      )}

      <div className="flex-1">
        <p className="text-[10px] font-bold uppercase text-gray-400 mb-4 tracking-widest">Core Features</p>
        <ul className="space-y-3 mb-6">
          {features.map((f) => (
            <FeatureItem key={f} text={f} />
          ))}
        </ul>
      </div>

      <button
        onClick={() => onSelect(id)}
        disabled={isActive}
        className={`w-full py-4 rounded-2xl font-bold text-sm transition-all ${isActive
            ? "bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 cursor-default"
            : "bg-gray-900 dark:bg-white dark:text-black text-white hover:opacity-90 active:scale-95 shadow-lg"
          }`}
      >
        {isActive ? "Your Current Tier" : `Upgrade to ${base.name}`}
      </button>
    </div>
  );
};

// ─── Main Component ──────────────────────────────────────────────────

const PricingMain = () => {
  const { user, isConnected } = useStore(
    useShallow((s: any) => ({ user: s.user, isConnected: s.isConnected }))
  );
  const userTier = isConnected ? user?.status?.toUpperCase() : null;

  const features = [
    { title: "Non-Custodial", desc: "Your keys, your crypto. Period.", icon: <FiLock />, color: "text-blue-500" },
    { title: "Risk Safeguards", desc: "Hard‑coded stop losses and protection.", icon: <FiShield />, color: "text-emerald-500" },
    { title: "Advanced Analytics", desc: "Real‑time PnL and trade history.", icon: <FiBarChart2 />, color: "text-purple-500" },
  ];

  return (
    <div className="min-h-screen bg-[#fafafa] dark:bg-[#050505] text-gray-900 dark:text-gray-100 pb-20">
      {/* Hero Section */}
      <section className="pt-24 pb-16 px-6 text-center">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-600 dark:text-blue-400 text-xs font-bold mb-6">
          <FiZap size={14} /> NEW: DEMO & TESTNET AVAILABLE FOR GOLD+
        </div>
        <h1 className="text-4xl sm:text-6xl md:text-7xl font-extrabold tracking-tight mb-6">
          The Future of <span className="bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 bg-clip-text text-transparent">DeFi Automation.</span>
        </h1>
        <p className="max-w-2xl mx-auto text-gray-500 dark:text-gray-400 text-base sm:text-lg md:text-xl">
          Scale your trading from Iron to Diamond. Stake GLADIATOR to unlock
          institutional‑grade liquidity and execution.
        </p>
      </section>

      {/* Pricing Grid */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 mb-32">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-6">
          {Object.keys(USER_LEVEL).map((key) => (
            <PricingCard
              key={key}
              tierKey={key}
              userStatus={userTier}
              onSelect={(id: string) => window.open("https://arenaburn.vercel.app/stake", "_blank")}
            />
          ))}
        </div>
      </section>

      {/* Trust & Features */}
      <section className="max-w-5xl mx-auto px-6 mb-32">
        <div className="grid sm:grid-cols-3 gap-12">
          {features.map((f, i) => (
            <div key={i} className="flex flex-col items-center text-center">
              <div className={`mb-4 p-4 rounded-full bg-gray-100 dark:bg-gray-800 ${f.color}`}>{f.icon}</div>
              <h4 className="font-bold text-lg mb-2">{f.title}</h4>
              <p className="text-sm text-gray-500">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Call to Action */}
      <section className="max-w-6xl mx-auto px-6">
        <div className="relative rounded-[40px] overflow-hidden bg-blue-600 dark:bg-blue-700 p-8 sm:p-12 text-center text-white">
          <div className="relative z-10">
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">Ready to dominate the arena?</h2>
            <p className="text-blue-100 mb-8 max-w-lg mx-auto">
              Join the next generation of algorithmic traders. No hidden fees, just pure execution.
            </p>
            <Link
              href="https://arenaburn.vercel.app/stake"
              className="inline-flex items-center gap-2 bg-white text-blue-600 px-8 py-4 rounded-2xl font-bold hover:shadow-2xl transition-all"
            >
              Start Staking Now <FiArrowUpRight />
            </Link>
          </div>
          <div className="absolute top-0 right-0 -translate-y-1/2 translate-x-1/2 w-96 h-96 bg-white/10 rounded-full blur-3xl" />
          <div className="absolute bottom-0 left-0 translate-y-1/2 -translate-x-1/2 w-96 h-96 bg-black/10 rounded-full blur-3xl" />
        </div>
      </section>
    </div>
  );
};

export default PricingMain;