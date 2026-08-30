"use client";
import React, { useState } from "react";
import Link from "next/link";
import {
    FiMenu,
    FiX,
    FiHome,
    FiCheck,
    FiRefreshCcw,
    FiZap,
    FiShield,
    FiBarChart2,
    FiLock,
    FiCpu,
    FiStar,
    FiTrendingUp,
    FiDollarSign,
    FiHelpCircle,
    FiChevronRight,
    FiChevronDown,
    FiBookOpen,
    FiSettings,
    FiUsers,
    FiLayers,
    FiGrid,
    FiTarget,
    FiAlertTriangle,
    FiInfo,
    FiRefreshCw,
} from "react-icons/fi";
import { FaWallet, FaRobot, FaExchangeAlt } from "react-icons/fa";

// ─── Sidebar Navigation ──────────────────────────────────────────────

const NAV_ITEMS = [
    { id: "intro", label: "Introduction", icon: FiHome },
    { id: "features", label: "Key Features", icon: FiZap },
    { id: "how-it-works", label: "How It Works", icon: FaRobot },
    { id: "wallet", label: "Wallet Management", icon: FaWallet },
    { id: "order-types", label: "Order Types", icon: FiLayers },
    { id: "strategies", label: "Strategies", icon: FiTarget },
    { id: "risk", label: "Risk Management", icon: FiShield },
    { id: "demo-testnet", label: "Demo & Testnet", icon: FiBookOpen },
    { id: "pricing", label: "Pricing & Tiers", icon: FiDollarSign },
    { id: "faq", label: "FAQ", icon: FiHelpCircle },
];

// ─── Main Component ──────────────────────────────────────────────────

export default function Documentation() {
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const [activeSection, setActiveSection] = useState("intro");

    const toggleMobileMenu = () => setMobileMenuOpen(!mobileMenuOpen);

    return (
        <div className="min-h-screen bg-[#f8fafc] dark:bg-[#0a0a0c] text-gray-800 dark:text-gray-200 flex">
            {/* ── Sidebar (desktop) ── */}
            <aside className="hidden lg:flex flex-col w-72 bg-white dark:bg-[#13131a] border-r border-gray-200 dark:border-gray-800 h-screen sticky top-0 overflow-y-auto shrink-0">
                <div className="p-6 border-b border-gray-200 dark:border-gray-800">
                    <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-500 to-purple-500 bg-clip-text text-transparent">
                        PulseTrader
                    </h1>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Documentation</p>
                </div>
                <nav className="flex-1 p-4 space-y-1">
                    {NAV_ITEMS.map((item) => {
                        const Icon = item.icon;
                        const isActive = activeSection === item.id;
                        return (
                            <button
                                key={item.id}
                                onClick={() => {
                                    setActiveSection(item.id);
                                    document.getElementById(item.id)?.scrollIntoView({ behavior: "smooth" });
                                }}
                                className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${isActive
                                    ? "bg-blue-500/10 text-blue-600 dark:text-blue-400"
                                    : "hover:bg-gray-100 dark:hover:bg-white/5 text-gray-600 dark:text-gray-400"
                                    }`}
                            >
                                <Icon size={18} className={isActive ? "text-blue-500" : ""} />
                                {item.label}
                            </button>
                        );
                    })}
                </nav>
            </aside>

            {/* ── Mobile Menu Overlay ── */}
            {mobileMenuOpen && (
                <div
                    className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm lg:hidden"
                    onClick={toggleMobileMenu}
                />
            )}
            <div
                className={`fixed inset-y-0 left-0 z-50 w-72 bg-white dark:bg-[#13131a] border-r border-gray-200 dark:border-gray-800 transform transition-transform duration-300 lg:hidden ${mobileMenuOpen ? "translate-x-0" : "-translate-x-full"
                    }`}
            >
                <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-800">
                    <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-500 to-purple-500 bg-clip-text text-transparent">
                        PulseTrader
                    </h1>
                    <button onClick={toggleMobileMenu} className="p-2 hover:bg-gray-100 dark:hover:bg-white/5 rounded-xl">
                        <FiX size={20} />
                    </button>
                </div>
                <nav className="p-4 space-y-1 overflow-y-auto h-[calc(100%-80px)]">
                    {NAV_ITEMS.map((item) => {
                        const Icon = item.icon;
                        const isActive = activeSection === item.id;
                        return (
                            <button
                                key={item.id}
                                onClick={() => {
                                    setActiveSection(item.id);
                                    document.getElementById(item.id)?.scrollIntoView({ behavior: "smooth" });
                                    setMobileMenuOpen(false);
                                }}
                                className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${isActive
                                    ? "bg-blue-500/10 text-blue-600 dark:text-blue-400"
                                    : "hover:bg-gray-100 dark:hover:bg-white/5 text-gray-600 dark:text-gray-400"
                                    }`}
                            >
                                <Icon size={18} className={isActive ? "text-blue-500" : ""} />
                                {item.label}
                            </button>
                        );
                    })}
                </nav>
            </div>

            {/* ── Main Content ── */}
            <main className="flex-1 min-w-0 px-4 sm:px-8 py-8 max-w-4xl mx-auto">
                {/* Mobile Header */}
                <div className="lg:hidden flex items-center justify-between mb-8">
                    <h1 className="text-xl font-bold bg-gradient-to-r from-blue-500 to-purple-500 bg-clip-text text-transparent">
                        PulseTrader
                    </h1>
                    <button onClick={toggleMobileMenu} className="p-2 hover:bg-gray-100 dark:hover:bg-white/5 rounded-xl">
                        <FiMenu size={24} />
                    </button>
                </div>

                {/* ─── Sections ────────────────────────────────────────────── */}

                {/* Introduction */}
                <section id="intro" className="scroll-mt-20 mb-16">
                    <h2 className="text-4xl font-extrabold mb-4">Welcome to PulseTrader</h2>
                    <p className="text-lg text-gray-600 dark:text-gray-400 leading-relaxed">
                        PulseTrader is a <strong>non‑custodial DeFi automation protocol</strong> that allows you to
                        create, manage, and execute advanced trading strategies across spot and perpetual markets.
                        All orders are executed directly from your wallet — your keys, your crypto, your control.
                    </p>
                    <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div className="bg-blue-50 dark:bg-blue-900/10 p-4 rounded-xl border border-blue-200 dark:border-blue-800">
                            <FiLock className="text-blue-500" size={24} />
                            <p className="font-bold mt-2">Non-Custodial</p>
                            <p className="text-sm text-gray-500">Your funds never leave your wallet.</p>
                        </div>
                        <div className="bg-purple-50 dark:bg-purple-900/10 p-4 rounded-xl border border-purple-200 dark:border-purple-800">
                            <FaRobot className="text-purple-500" size={24} />
                            <p className="font-bold mt-2">AI-Powered</p>
                            <p className="text-sm text-gray-500">Algo strategies and technical logic.</p>
                        </div>
                        <div className="bg-emerald-50 dark:bg-emerald-900/10 p-4 rounded-xl border border-emerald-200 dark:border-emerald-800">
                            <FiTrendingUp className="text-emerald-500" size={24} />
                            <p className="font-bold mt-2">Multi-Chain</p>
                            <p className="text-sm text-gray-500">EVM & SVM (Solana) support.</p>
                        </div>
                    </div>
                </section>

                {/* Key Features */}
                <section id="features" className="scroll-mt-20 mb-16">
                    <h2 className="text-3xl font-bold mb-6">Key Features</h2>
                    <ul className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <li className="flex items-start gap-3">
                            <FiCheck className="text-emerald-500 mt-1" size={20} />
                            <div>
                                <p className="font-semibold">Spot & Perpetual Trading</p>
                                <p className="text-sm text-gray-500">Trade both spot and perpetual markets.</p>
                            </div>
                        </li>
                        <li className="flex items-start gap-3">
                            <FiCheck className="text-emerald-500 mt-1" size={20} />
                            <div>
                                <p className="font-semibold">Multiple Strategies</p>
                                <p className="text-sm text-gray-500">Limit, Scalp, Grid, DCA, Algo, SellToken.</p>
                            </div>
                        </li>
                        <li className="flex items-start gap-3">
                            <FiCheck className="text-emerald-500 mt-1" size={20} />
                            <div>
                                <p className="font-semibold">Advanced Risk Management</p>
                                <p className="text-sm text-gray-500">Take Profit, Stop Loss, Trailing Stop, Re‑entrance.</p>
                            </div>
                        </li>
                        <li className="flex items-start gap-3">
                            <FiCheck className="text-emerald-500 mt-1" size={20} />
                            <div>
                                <p className="font-semibold">Demo & Testnet Modes</p>
                                <p className="text-sm text-gray-500">Test strategies risk‑free (Gold+).</p>
                            </div>
                        </li>
                        <li className="flex items-start gap-3">
                            <FiCheck className="text-emerald-500 mt-1" size={20} />
                            <div>
                                <p className="font-semibold">Grid & DCA Automation</p>
                                <p className="text-sm text-gray-500">Auto‑rebalance entries with grid and DCA.</p>
                            </div>
                        </li>
                        <li className="flex items-start gap-3">
                            <FiCheck className="text-emerald-500 mt-1" size={20} />
                            <div>
                                <p className="font-semibold">Multi‑Wallet Management</p>
                                <p className="text-sm text-gray-500">Use multiple wallets per strategy.</p>
                            </div>
                        </li>
                    </ul>
                </section>

                {/* How It Works */}
                <section id="how-it-works" className="scroll-mt-20 mb-16">
                    <h2 className="text-3xl font-bold mb-6">How It Works</h2>
                    <div className="space-y-6">
                        <div className="flex gap-4 items-start">
                            <div className="w-8 h-8 rounded-full bg-blue-500 text-white flex items-center justify-center font-bold shrink-0">1</div>
                            <div>
                                <p className="font-semibold">Connect Your Wallet</p>
                                <p className="text-sm text-gray-500">Sign in with your Ethereum wallet. Your wallet is your identity </p>
                            </div>
                        </div>
                        <div className="flex gap-4 items-start">
                            <div className="w-8 h-8 rounded-full bg-blue-500 text-white flex items-center justify-center font-bold shrink-0">1</div>
                            <div>
                                <p className="font-semibold">Create and deposit Pulse Wallet (Non Custodial)</p>
                                <p className="text-sm text-gray-500">Create pulse wallet to assign strategies. Deposit the wallet with the funds. For perpetual order fund will deposit to perp exchange account(eg. Hyperliquid ) from your pulse wallet</p>
                            </div>
                        </div>
                        <div className="flex gap-4 items-start">
                            <div className="w-8 h-8 rounded-full bg-blue-500 text-white flex items-center justify-center font-bold shrink-0">2</div>
                            <div>
                                <p className="font-semibold">Choose Your Market & Strategy</p>
                                <p className="text-sm text-gray-500">Select spot or perpetual, then pick a strategy (Limit, Grid, Algo, etc.).</p>
                            </div>
                        </div>
                        <div className="flex gap-4 items-start">
                            <div className="w-8 h-8 rounded-full bg-blue-500 text-white flex items-center justify-center font-bold shrink-0">3</div>
                            <div>
                                <p className="font-semibold">Configure Parameters</p>
                                <p className="text-sm text-gray-500">Set entry/exit prices, stop loss, take profit, grid levels, leverage, etc.</p>
                            </div>
                        </div>
                        <div className="flex gap-4 items-start">
                            <div className="w-8 h-8 rounded-full bg-blue-500 text-white flex items-center justify-center font-bold shrink-0">4</div>
                            <div>
                                <p className="font-semibold">Assign Wallets & Confirm</p>
                                <p className="text-sm text-gray-500">Select which wallet(s) to use. The order is created and executed by our executor agent.</p>
                            </div>
                        </div>
                        <div className="flex gap-4 items-start">
                            <div className="w-8 h-8 rounded-full bg-blue-500 text-white flex items-center justify-center font-bold shrink-0">5</div>
                            <div>
                                <p className="font-semibold">Monitor & Manage</p>
                                <p className="text-sm text-gray-500">Track your orders, close them manually, or let them run. Everything is transparent.</p>
                            </div>
                        </div>
                    </div>
                </section>

                {/* Wallet Management */}
                <section id="wallet" className="scroll-mt-20 mb-16">
                    <h2 className="text-3xl font-bold mb-6">Wallet Management</h2>
                    <p className="text-gray-600 dark:text-gray-400 mb-4">
                        PulseTrader generates non‑custodial wallets for you. Each wallet has its own private key (encrypted and stored securely). You can create multiple wallets and assign them to different strategies.
                    </p>
                    <ul className="list-disc pl-6 space-y-2 text-gray-600 dark:text-gray-400">
                        <li><strong>EVM Wallets</strong> – For Ethereum, Arbitrum, and other EVM chains.</li>
                        <li><strong>SVM Wallets</strong> – For Solana (coming soon).</li>
                        <li><strong>Agent Wallet</strong> – A dedicated wallet used by the executor to sign transactions on your behalf. You must approve the agent and deposit funds to use perpetual trading.</li>
                        <li>Funds are always under your control; you can withdraw at any time.</li>
                    </ul>
                </section>

                {/* Order Types */}
                <section id="order-types" className="scroll-mt-20 mb-16">
                    <h2 className="text-3xl font-bold mb-6">Order Types</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="bg-white dark:bg-[#13131a] p-5 rounded-xl border border-gray-200 dark:border-gray-800">
                            <h3 className="font-bold text-lg flex items-center gap-2">
                                <FiZap className="text-blue-500" /> Spot
                            </h3>
                            <p className="text-sm text-gray-500 mt-2">
                                Buy or sell tokens directly from your wallet. Supports all major trading pairs.
                            </p>
                        </div>
                        <div className="bg-white dark:bg-[#13131a] p-5 rounded-xl border border-gray-200 dark:border-gray-800">
                            <h3 className="font-bold text-lg flex items-center gap-2">
                                <FiTrendingUp className="text-purple-500" /> Perpetual
                            </h3>
                            <p className="text-sm text-gray-500 mt-2">
                                Trade futures with leverage (up to 50x). Supports Isolated margin and One‑Way mode.
                            </p>
                        </div>
                    </div>
                </section>

                {/* Strategies */}
                <section id="strategies" className="scroll-mt-20 mb-16">
                    <h2 className="text-3xl font-bold mb-6">Strategies</h2>
                    <div className="space-y-4">
                        <div className="bg-white dark:bg-[#13131a] p-5 rounded-xl border border-gray-200 dark:border-gray-800">
                            <h3 className="font-bold">Limit</h3>
                            <p className="text-sm text-gray-500">Place a limit order at a specific price.</p>
                        </div>
                        <div className="bg-white dark:bg-[#13131a] p-5 rounded-xl border border-gray-200 dark:border-gray-800">
                            <h3 className="font-bold">Scalp</h3>
                            <p className="text-sm text-gray-500">Quick in‑and‑out trades with tight TP/SL.</p>
                        </div>
                        <div className="bg-white dark:bg-[#13131a] p-5 rounded-xl border border-gray-200 dark:border-gray-800">
                            <h3 className="font-bold">Grid</h3>
                            <p className="text-sm text-gray-500">Automatically buy low and sell high across multiple price levels.</p>
                        </div>
                        <div className="bg-white dark:bg-[#13131a] p-5 rounded-xl border border-gray-200 dark:border-gray-800">
                            <h3 className="font-bold">DCA (Dollar‑Cost Averaging)</h3>
                            <p className="text-sm text-gray-500">Enter positions gradually over time.</p>
                        </div>
                        <div className="bg-white dark:bg-[#13131a] p-5 rounded-xl border border-gray-200 dark:border-gray-800">
                            <h3 className="font-bold">Algo</h3>
                            <p className="text-sm text-gray-500">Use custom technical logic (RSI, MACD, etc.) to trigger entries.</p>
                        </div>
                        <div className="bg-white dark:bg-[#13131a] p-5 rounded-xl border border-gray-200 dark:border-gray-800">
                            <h3 className="font-bold">SellToken</h3>
                            <p className="text-sm text-gray-500">Sell tokens at a target price with TP/SL.</p>
                        </div>
                    </div>
                </section>

                {/* Risk Management */}
                <section id="risk" className="scroll-mt-20 mb-16">
                    <h2 className="text-3xl font-bold mb-6">Risk Management</h2>
                    <ul className="space-y-3">
                        <li className="flex items-start gap-3">
                            <FiTarget className="text-green-500 mt-1" size={20} />
                            <div>
                                <p className="font-semibold">Take Profit</p>
                                <p className="text-sm text-gray-500">Close position at a predetermined profit level.</p>
                            </div>
                        </li>
                        <li className="flex items-start gap-3">
                            <FiAlertTriangle className="text-red-500 mt-1" size={20} />
                            <div>
                                <p className="font-semibold">Stop Loss</p>
                                <p className="text-sm text-gray-500">Protect against downside with automatic exit.</p>
                            </div>
                        </li>
                        <li className="flex items-start gap-3">
                            <FiTrendingUp className="text-blue-500 mt-1" size={20} />
                            <div>
                                <p className="font-semibold">Trailing Stop</p>
                                <p className="text-sm text-gray-500">Dynamic stop loss that follows price movements.</p>
                            </div>
                        </li>
                        <li className="flex items-start gap-3">
                            <FiRefreshCw className="text-amber-500 mt-1" size={20} />
                            <div>
                                <p className="font-semibold">Re‑entrance</p>
                                <p className="text-sm text-gray-500">Re‑enter a position after stop loss with configurable percentage.</p>
                            </div>
                        </li>
                    </ul>
                </section>

                {/* Demo & Testnet */}
                <section id="demo-testnet" className="scroll-mt-20 mb-16">
                    <h2 className="text-3xl font-bold mb-6">Demo & Testnet Modes</h2>
                    <p className="text-gray-600 dark:text-gray-400 mb-4">
                        Gold, Platinum, and Diamond users can create orders in <strong>Demo</strong> or <strong>Testnet</strong> mode.
                        This allows you to test strategies without risking real funds.
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="bg-amber-50 dark:bg-amber-900/10 p-4 rounded-xl border border-amber-200 dark:border-amber-800">
                            <span className="font-bold text-amber-700 dark:text-amber-300">Demo</span>
                            <p className="text-sm text-gray-500">Simulate trading with virtual balances. Orders are executed in a simulated environment.</p>
                        </div>
                        <div className="bg-yellow-50 dark:bg-yellow-900/10 p-4 rounded-xl border border-yellow-200 dark:border-yellow-800">
                            <span className="font-bold text-yellow-700 dark:text-yellow-300">Testnet</span>
                            <p className="text-sm text-gray-500">Use actual testnet tokens (e.g., Arbitrum Sepolia) to practice real‑world execution.</p>
                        </div>
                    </div>
                </section>

                {/* Pricing */}
                <section id="pricing" className="scroll-mt-20 mb-16">
                    <h2 className="text-3xl font-bold mb-6">Pricing & Tiers</h2>
                    <p className="text-gray-600 dark:text-gray-400 mb-6">
                        PulseTrader uses a tiered system based on GLADIATOR staking. Higher tiers unlock more features and higher limits.
                    </p>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm border-collapse">
                            <thead>
                                <tr className="bg-gray-100 dark:bg-gray-800">
                                    <th className="p-3 text-left">Tier</th>
                                    <th className="p-3 text-left">Orders</th>
                                    <th className="p-3 text-left">Wallets</th>
                                    <th className="p-3 text-left">Strategies</th>
                                    <th className="p-3 text-left">Demo/Testnet</th>
                                    <th className="p-3 text-left">Fee Exempt</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr className="border-b border-gray-200 dark:border-gray-800">
                                    <td className="p-3 font-bold">Iron</td>
                                    <td className="p-3">2</td>
                                    <td className="p-3">2</td>
                                    <td className="p-3">Limit, Scalp</td>
                                    <td className="p-3">—</td>
                                    <td className="p-3">—</td>
                                </tr>
                                <tr className="border-b border-gray-200 dark:border-gray-800">
                                    <td className="p-3 font-bold">Silver</td>
                                    <td className="p-3">20</td>
                                    <td className="p-3">5</td>
                                    <td className="p-3">Limit, Scalp</td>
                                    <td className="p-3">—</td>
                                    <td className="p-3">—</td>
                                </tr>
                                <tr className="border-b border-gray-200 dark:border-gray-800 bg-yellow-50 dark:bg-yellow-900/10">
                                    <td className="p-3 font-bold">Gold</td>
                                    <td className="p-3">50</td>
                                    <td className="p-3">7</td>
                                    <td className="p-3">Limit, Scalp, Grid, DCA</td>
                                    <td className="p-3">✅</td>
                                    <td className="p-3">—</td>
                                </tr>
                                <tr className="border-b border-gray-200 dark:border-gray-800">
                                    <td className="p-3 font-bold">Platinum</td>
                                    <td className="p-3">100</td>
                                    <td className="p-3">10</td>
                                    <td className="p-3">Limit, Scalp, Grid, DCA, SellToken, Algo</td>
                                    <td className="p-3">✅</td>
                                    <td className="p-3">—</td>
                                </tr>
                                <tr className="border-b border-gray-200 dark:border-gray-800 bg-purple-50 dark:bg-purple-900/10">
                                    <td className="p-3 font-bold">Diamond</td>
                                    <td className="p-3">Unlimited</td>
                                    <td className="p-3">Unlimited</td>
                                    <td className="p-3">All strategies</td>
                                    <td className="p-3">✅</td>
                                    <td className="p-3">✅</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                    <p className="text-xs text-gray-400 mt-4">
                        * All tiers require staking GLADIATOR except Iron (free). Visit the <Link href="https://arenaburn.vercel.app/stake" className="text-blue-500 underline" target="_blank">staking page</Link> to upgrade.
                    </p>
                </section>

                {/* FAQ */}
                <section id="faq" className="scroll-mt-20 mb-16">
                    <h2 className="text-3xl font-bold mb-6">Frequently Asked Questions</h2>
                    <div className="space-y-4">
                        <div className="bg-white dark:bg-[#13131a] p-4 rounded-xl border border-gray-200 dark:border-gray-800">
                            <h3 className="font-bold">Is PulseTrader custodial?</h3>
                            <p className="text-sm text-gray-500">No. We never hold your private keys. All orders are executed directly from your wallet.</p>
                        </div>
                        <div className="bg-white dark:bg-[#13131a] p-4 rounded-xl border border-gray-200 dark:border-gray-800">
                            <h3 className="font-bold">What chains are supported?</h3>
                            <p className="text-sm text-gray-500">Currently Arbitrum (EVM) and Solana (SVM) are supported. More chains will be added.</p>
                        </div>
                        <div className="bg-white dark:bg-[#13131a] p-4 rounded-xl border border-gray-200 dark:border-gray-800">
                            <h3 className="font-bold">How do I upgrade my tier?</h3>
                            <p className="text-sm text-gray-500">Stake GLADIATOR tokens. Your tier is automatically upgraded based on your stake amount.</p>
                        </div>
                        <div className="bg-white dark:bg-[#13131a] p-4 rounded-xl border border-gray-200 dark:border-gray-800">
                            <h3 className="font-bold">What is the Pulse fee?</h3>
                            <p className="text-sm text-gray-500">A small protocol fee collected from successful trades. Diamond tier is fee‑exempt.</p>
                        </div>
                        <div className="bg-white dark:bg-[#13131a] p-4 rounded-xl border border-gray-200 dark:border-gray-800">
                            <h3 className="font-bold">How do I get support?</h3>
                            <p className="text-sm text-gray-500">Join our Discord or Telegram community. Platinum+ users get priority email support.</p>
                        </div>
                    </div>
                </section>

                {/* Footer */}
                <footer className="border-t border-gray-200 dark:border-gray-800 pt-8 mt-12 text-center text-sm text-gray-400">
                    <p>© 2025 PulseTrader. All rights reserved. | <Link href="#" className="hover:underline">Privacy</Link> · <Link href="#" className="hover:underline">Terms</Link></p>
                </footer>
            </main>
        </div>
    );
}