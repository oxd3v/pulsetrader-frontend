"use client";
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { FiTarget, FiZap, FiShield, FiArrowRight, FiLayers } from "react-icons/fi";
import Link from "next/link";

// Chain Data with Scattered positioning
const chains = [
  { name: "Ethereum", color: "from-blue-500", top: "15%", left: "10%", delay: 0 },
  { name: "Solana", color: "from-purple-500", top: "25%", left: "75%", delay: 0.2 },
  { name: "Base", color: "from-blue-400", top: "65%", left: "15%", delay: 0.4 },
  { name: "Arbitrum", color: "from-cyan-600", top: "80%", left: "70%", delay: 0.1 },
  { name: "Polygon", color: "from-purple-600", top: "45%", left: "85%", delay: 0.3 },
  { name: "BSC", color: "from-yellow-500", top: "10%", left: "60%", delay: 0.5 },
  { name: "Avalanche", color: "from-red-500", top: "75%", left: "30%", delay: 0.25 },
];

export default function PulseTraderHome() {
  return (
    <div className="min-h-screen bg-white dark:bg-[#060709] text-gray-900 dark:text-slate-200 font-sans selection:bg-blue-500/30 overflow-hidden relative transition-colors duration-300">

      {/* Scattered Chain Cloud Background */}
      <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden">
        {chains.map((chain, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{
              opacity: [0.1, 0.3, 0.1],
              y: [0, -20, 0],
              scale: 1
            }}
            transition={{
              duration: 5 + i,
              repeat: Infinity,
              delay: chain.delay
            }}
            style={{ top: chain.top, left: chain.left }}
            className="absolute flex items-center gap-2 px-3 py-1.5 rounded-full border border-gray-200/50 dark:border-white/5 bg-white/60 dark:bg-white/5 backdrop-blur-sm"
          >
            <div className={`w-2 h-2 rounded-full bg-gradient-to-r ${chain.color} shadow-[0_0_12px_rgba(0,0,0,0.1)] dark:shadow-[0_0_12px_rgba(255,255,255,0.3)] animate-pulse`} />
            <span className="text-[8px] md:text-[10px] font-mono tracking-widest text-gray-400 dark:text-slate-500 uppercase">{chain.name}</span>
          </motion.div>
        ))}
      </div>

      {/* Cinematic Overlays */}
      <div className="absolute inset-0 z-0">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-[400px] md:h-[600px] bg-blue-600/5 dark:bg-blue-600/5 blur-[120px] rounded-full" />
        <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 brightness-50 contrast-150" />
      </div>

      <main className="relative z-10 container mx-auto px-4 sm:px-6 pt-20 md:pt-24 pb-12 md:pb-20">
        {/* Brand Header */}
        <div className="flex flex-col items-center mb-8 md:mb-12">
          <p className="text-gray-400 dark:text-slate-600 font-mono text-[8px] sm:text-[10px] mt-2 tracking-[0.4em] uppercase">
            Multi-Chain Quantitative Terminal
          </p>
        </div>

        {/* Hero Section */}
        <div className="text-center max-w-4xl mx-auto mb-12 md:mb-20 px-4">
          <h2 className="text-3xl sm:text-5xl md:text-7xl font-bold tracking-tight text-gray-900 dark:text-white mb-6 md:mb-8 leading-[1.1]">
            Trade on the edge <br />
            <span className="bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">
              of every signal.
            </span>
          </h2>

          <div className="flex justify-center">
            <Link
              href="/strategy"
              className="group relative px-6 sm:px-10 py-3 sm:py-4 bg-gray-900 dark:bg-white text-white dark:text-black font-black rounded-full overflow-hidden transition-all hover:scale-105 active:scale-95 shadow-2xl text-sm sm:text-base"
            >
              <span className="relative z-10 flex items-center gap-2 uppercase italic">
                Enter Terminal <FiArrowRight className="w-4 h-4 sm:w-5 sm:h-5" />
              </span>
            </Link>
          </div>
        </div>

        {/* Feature Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4 mb-16 md:mb-32 max-w-6xl mx-auto">
          <FeatureCard
            icon={<FiTarget className="text-blue-400" />}
            title="Strategy Engine"
            desc="Set auto-buys on RSI oversold or EMA crossovers across 20+ chains."
          />
          <FeatureCard
            icon={<FiLayers className="text-cyan-400" />}
            title="Multi-Chain Hub"
            desc="Unified interface for Ethereum, Solana, Base, and EVM L2s."
          />
          <FeatureCard
            icon={<FiZap className="text-yellow-400" />}
            title="Futures & Spot"
            desc="High-leverage perps or deep-liquidity spot swaps in one terminal."
          />
          <FeatureCard
            icon={<FiShield className="text-green-400" />}
            title="Non-Custodial"
            desc="No deposits. Trade directly from your wallet with zero counterparty risk."
          />
        </div>

        <TerminalMockup />
      </main>

      <footer className="relative z-10 py-8 md:py-12 text-center">
        <p className="text-[8px] sm:text-[9px] font-mono text-gray-400 dark:text-slate-700 tracking-[0.5em] uppercase">
          PulseTrader Terminal // Developed for High-Frequency Precision
        </p>
      </footer>
    </div>
  );
}

function TerminalMockup() {
  const [logs, setLogs] = useState<string[]>([]);
  const [typedText, setTypedText] = useState("");
  const fullText = "IF BTC < 65000 AND RSI < 30 THEN BUY";

  // Rolling Logs
  useEffect(() => {
    const logPool = [
      "Analyzing BTC/USDT order book...",
      "Liquidity check: $42.5M pool depth",
      "Scanning Arbitrum bridge activity...",
      "Social Alpha: Trending Bullish (+12%)",
      "Network Congestion: Normal (12 gwei)",
      "Cross-chain sync: Base, Solana, Arbitrum",
      "Signal check: EMA-20/50 crossover pending",
      "Strategic snapshot captured: Stable"
    ];

    let i = 0;
    const interval = setInterval(() => {
      const timestamp = new Date().toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });
      const newLog = `[${timestamp}] ${logPool[i % logPool.length]}`;
      setLogs(prev => [newLog, ...prev].slice(0, 5));
      i++;
    }, 3000);

    return () => clearInterval(interval);
  }, []);

  // Typing Effect
  useEffect(() => {
    let i = 0;
    let isDeleting = false;
    const interval = setInterval(() => {
      if (!isDeleting) {
        setTypedText(fullText.slice(0, i));
        i++;
        if (i > fullText.length) {
          isDeleting = true;
          setTimeout(() => { }, 2000);
        }
      } else {
        setTypedText(fullText.slice(0, i));
        i--;
        if (i < 0) {
          isDeleting = false;
          i = 0;
        }
      }
    }, 100);
    return () => clearInterval(interval);
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0, y: 40 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      className="relative group max-w-5xl mx-auto rounded-2xl sm:rounded-3xl border border-gray-200/50 dark:border-white/5 bg-white/80 dark:bg-[#0a0c10] p-2 sm:p-3 shadow-[0_0_100px_rgba(0,0,0,0.05)] dark:shadow-[0_0_100px_rgba(0,0,0,0.8)] overflow-hidden"
    >
      <div className="absolute inset-0 bg-gradient-to-tr from-blue-500/5 via-transparent to-purple-500/5 pointer-events-none group-hover:opacity-100 opacity-50 transition-opacity" />

      <div className="flex items-center justify-between px-3 sm:px-6 py-2 sm:py-3 border-b border-gray-200/50 dark:border-white/5 relative z-10">
        <div className="flex gap-1.5 sm:gap-2">
          <div className="w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-full bg-red-400/60 dark:bg-red-900/40" />
          <div className="w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-full bg-amber-400/60 dark:bg-amber-900/40" />
          <div className="w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-full bg-emerald-400/60 dark:bg-emerald-900/40" />
        </div>
        <div className="text-[7px] sm:text-[9px] font-mono text-blue-500/50 uppercase tracking-[0.2em] sm:tracking-[0.3em] truncate">
          Quantitative Execution Core v2.0
        </div>
        <div className="flex items-center gap-1.5 sm:gap-2">
          <span className="text-[7px] sm:text-[10px] font-mono text-green-500/70 animate-pulse">SYNC ACTIVE</span>
          <div className="w-1 h-1 sm:w-1.5 sm:h-1.5 rounded-full bg-green-500 shadow-[0_0_8px_#10b981]" />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2">
        <div className="p-4 sm:p-8 border-b lg:border-b-0 lg:border-r border-gray-200/50 dark:border-white/5 bg-black/5 dark:bg-black/20 flex flex-col items-center justify-center min-h-[200px] sm:min-h-[300px] relative">
          <div className="bg-blue-100/50 dark:bg-blue-600/10 border border-blue-300/30 dark:border-blue-500/20 px-4 sm:px-6 py-3 sm:py-4 rounded-xl mb-4 sm:mb-6 relative group/code overflow-hidden w-full max-w-xs text-center">
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 dark:via-white/5 to-transparent -translate-x-full group-hover/code:translate-x-full transition-transform duration-1000" />
            <code className="text-xs sm:text-sm font-mono text-gray-800 dark:text-white tracking-wide">
              {typedText}<span className="animate-pulse text-blue-500 dark:text-blue-400">|</span>
            </code>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-3 sm:gap-4 text-[8px] sm:text-[10px] font-mono uppercase tracking-[0.15em] sm:tracking-[0.2em] text-gray-500 dark:text-slate-500">
            <span className="flex items-center gap-1.5">
              <div className="w-1 h-1 rounded-full bg-blue-500" />
              EMA-20: <span className="text-gray-800 dark:text-white">$64,281</span>
            </span>
            <span className="flex items-center gap-1.5">
              <div className="w-1 h-1 rounded-full bg-purple-500" />
              RSI: <span className="text-gray-800 dark:text-white">28.4</span>
            </span>
          </div>
        </div>

        <div className="p-4 sm:p-6 font-mono text-[10px] sm:text-[11px] leading-relaxed relative min-h-[200px] sm:min-h-[300px]">
          <div className="absolute top-3 sm:top-4 right-4 sm:right-6 text-[8px] sm:text-[10px] text-gray-400 dark:text-slate-700">SYSTERM_FEED</div>
          <div className="space-y-2 sm:space-y-3 mt-4 sm:mt-4">
            <AnimatePresence mode="popLayout">
              {logs.map((log, idx) => (
                <motion.div
                  key={log}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1 - idx * 0.2, x: 0 }}
                  exit={{ opacity: 0, x: 10 }}
                  className={idx === 0 ? "text-blue-600 dark:text-blue-400" : "text-gray-500 dark:text-slate-500"}
                >
                  {log}
                </motion.div>
              ))}
            </AnimatePresence>
            {logs.length === 0 && <div className="text-gray-400 dark:text-slate-800 italic">Initializing data stream...</div>}
          </div>

          <div className="absolute bottom-3 sm:bottom-6 left-3 sm:left-6 right-3 sm:right-6 p-3 sm:p-4 rounded-lg bg-emerald-100/50 dark:bg-emerald-500/5 border border-emerald-300/30 dark:border-emerald-500/10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 group-hover:border-emerald-400/50 dark:group-hover:border-emerald-500/30 transition-colors">
            <span className="text-[8px] sm:text-[10px] text-emerald-700 dark:text-emerald-500 font-bold tracking-tight">
              STRATEGY CONFIRMED: AUTO-EXECUTE READY
            </span>
            <div className="flex -space-x-1">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="w-3 h-3 sm:w-4 sm:h-4 rounded-full border border-gray-200 dark:border-black bg-blue-500 dark:bg-blue-600 flex items-center justify-center text-[6px] sm:text-[8px] text-white">
                  ₿
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

function FeatureCard({ icon, title, desc }: { icon: React.ReactNode; title: string; desc: string }) {
  return (
    <div className="p-5 sm:p-8 bg-gradient-to-b from-gray-100/50 to-transparent dark:from-white/5 to-transparent border border-gray-200/50 dark:border-white/5 rounded-2xl sm:rounded-3xl hover:border-blue-400/50 dark:hover:border-blue-500/30 transition-all group">
      <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-2xl bg-gray-100 dark:bg-white/5 flex items-center justify-center mb-4 sm:mb-6 group-hover:bg-blue-100 dark:group-hover:bg-blue-600/20 transition-colors">
        {icon}
      </div>
      <h3 className="text-gray-900 dark:text-white font-bold text-base sm:text-lg mb-2 sm:mb-3">{title}</h3>
      <p className="text-gray-500 dark:text-slate-500 text-xs sm:text-sm leading-relaxed">{desc}</p>
    </div>
  );
}