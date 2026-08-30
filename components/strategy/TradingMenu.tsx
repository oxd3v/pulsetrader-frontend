"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { FiInfo, FiPlay, FiExternalLink } from "react-icons/fi";
import { useStore } from "@/store/useStore";
import { useShallow } from "zustand/shallow";


const FUTURES_PROTOCOL = [
  // {
  //   id: "asterdex",
  //   name: "AsterDex",
  //   assetIdentifier: 'BTCUSDT',
  //   imageUrl:
  //     "https://static.asterindex.com/cloud-futures/static/images/aster/logo.svg",
  // },
  {
    id: "hyperliquid",
    name: "HyperLiquid",
    assetIdentifier: 'BTC',
    imageUrl: "./hyperliquidWhite.svg",
  },
  // {
  //   id: "gmx",
  //   name: "GMX",
  //   assetIdentifier: 'BTC',
  //   imageUrl:
  //     "https://raw.githubusercontent.com/gmx-io/gmx-assets/6ca89def873126e2d46bab65651cf940b2597923/GMX-Assets/SVG/GMX.svg",
  // },
];

export default function TradingStrategyMenu() {
  const [selectedType, setSelectedType] = useState<any>(null);
  const router = useRouter();
  const { setNetwork, network } = useStore(
    useShallow((state: any) => ({
      network: state.network,
      setNetwork: state.setNetwork,
    }))
  );

  const networkSpotAddress = () => {
    switch (network) {
      case 43114:
        return "0x152b9d0FdC40C096757F570A51E494bd4b943E50";
      case 42161:
        return "0x2f2a2543b76a4166549f7aab2e75bef0aefc5b0f";
      case 1:
        return "0x2260fac5e5542a773aa44fbcfedf7c193bc2c599";
      default:
        return "";
    }
  }
  return (
    <div className="h-full  p-8">
      <div className="max-w-4xl mx-auto">
        {/* Breadcrumb Navigation */}
        <nav className="flex items-center space-x-2 text-sm text-gray-500 dark:text-gray-300 mb-6">
          <span>Trading</span>
          <span>→</span>
          <span className="font-medium text-gray-800 dark:text-gray-200">
            Strategy Selection
          </span>

          {selectedType && (
            <>
              <span>→</span>
              <span className="font-medium text-blue-600 dark:text-gray-300 capitalize">
                {selectedType}
              </span>
            </>
          )}
        </nav>

        <h1 className="text-4xl font-bold text-gray-800 dark:text-gray-200 mb-4">
          Trading Strategy Dashboard
        </h1>
        <p className="text-gray-600 dark:text-gray-300 mb-8">
          Select your trading type and preferred strategy to begin
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Perpetual Trading Card */}
          <motion.div
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className={`bg-white dark:bg-gray-800 rounded-xl dark:shadow-2xl shadow-lg p-6 cursor-pointer transition-all duration-300  ${selectedType === "perpetual"
              ? "ring-2 ring-blue-500"
              : "hover:shadow-xl"
              }`}
            onClick={() => {
              setSelectedType("perpetual");
              //router.push("/strategy/perpetual");
            }}
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl font-semibold text-gray-800 dark:text-gray-200">
                Future Trading
              </h2>

              <div className="bg-blue-100 text-blue-600 px-3 py-1 rounded-full text-sm">
                Futures
              </div>
            </div>
            <p className="text-gray-600 mb-4 dark:text-gray-300">
              Trade perpetual futures contracts with leverage
            </p>

            <motion.div
              initial={false}
              animate={{
                height: "auto" /*selectedType === 'perpetual' ? 'auto' : 0*/,
              }}
              className="overflow-hidden"
            >
              <div className="space-y-3 flex gap-1">
                {FUTURES_PROTOCOL.map((protcol) => (
                  <motion.div
                    key={protcol.id}
                    className="relative group"
                    //onMouseEnter={() => setHoveredStrategy(protcol.id)}
                    //onMouseLeave={() => setHoveredStrategy(null)}
                    whileHover={{ x: 8 }}
                  >
                    <div
                      className="bg-black p-4 rounded-lg hover:bg-gray-800 cursor-pointer transition-all"
                      onClick={() => {
                        setNetwork(42161)
                        router.push(`/strategy/perp/${protcol.id}/${protcol.assetIdentifier}`);
                      }}
                    >
                      <div className="flex items-center space-x-3">
                        <img src={protcol.imageUrl} className="h-4" />
                      </div>
                    </div>
                    {/* {hoveredStrategy === strategy.id && (
                                            <div className="absolute top-0 left-full ml-4 w-64 p-4 bg-white rounded-lg shadow-lg z-10">
                                                <p className="text-sm text-gray-600">{strategy.description}</p>
                                            </div>
                                        )} */}
                  </motion.div>
                ))}
              </div>
            </motion.div>
          </motion.div>

          {/* Spot Trading Card */}
          <motion.div
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className={`bg-white dark:bg-gray-800 rounded-xl dark:shadow-2xl shadow-lg p-6 cursor-pointer transition-all duration-300 ${selectedType === "spot"
              ? "ring-2 ring-green-500"
              : "hover:shadow-xl"
              }`}
            onClick={() => {
              setSelectedType("spot");
              router.push(
                `/strategy/spot/${networkSpotAddress()}`,
              );
            }}
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl font-semibold text-gray-800 dark:text-gray-200">
                Spot Trading
              </h2>

              <div className="bg-green-100 text-green-600 px-3 py-1 rounded-full text-sm">
                Spot
              </div>
            </div>
            <p className="text-gray-600 mb-4 dark:text-gray-300">
              Trade actual cryptocurrencies without leverage
            </p>

            <motion.div
              initial={false}
              animate={{
                height: "auto" /*selectedType === 'spot' ? 'auto' : 0*/,
              }}
              className="overflow-hidden"
            >
              <div className=" flex gap-1">
                <div className="bg-black p-2 rounded-md flex items-center space-x-3">
                  <img
                    src={"https://kyberswap.com/logo-dark.svg"}
                    className="h-8"
                  />
                </div>

                <div className="bg-black rounded-md p-2 flex items-center space-x-3">
                  <img
                    src={"https://debridge.com/assets/img/logo/full-logo.svg"}
                    className="h-4 "
                  />
                </div>
              </div>
            </motion.div>
          </motion.div>
          {/*  Trenches */}
          <motion.div
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className={`bg-white dark:bg-gray-800 rounded-xl dark:shadow-2xl shadow-lg p-6 cursor-pointer transition-all duration-300 pointer-events-none opacity-50 ${selectedType === "ai"
              ? "ring-2 ring-green-500"
              : "hover:shadow-xl"
              }`}

          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl font-semibold text-gray-800 dark:text-gray-200">
                AI Sentiment Alpha
              </h2>

              <div className="bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 px-3 py-1 rounded-full text-xs font-bold tracking-wider uppercase">
                Neural Intelligence
              </div>
            </div>
            <p className="text-gray-600 text-sm mb-4 dark:text-gray-300">
              Harness the power of neural networks to decode social sentiment and on-chain noise. Get real-time alpha before it hits the mainstream.
            </p>

            <div className="mt-auto flex items-center gap-2 text-purple-500 font-medium italic">
              <div className="w-2 h-2 rounded-full bg-purple-500 animate-pulse" />
              <span className="text-sm tracking-wide">Synthesizing Market Signals...</span>
            </div>
          </motion.div>
          <motion.div
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className={`bg-white dark:bg-gray-800 rounded-xl dark:shadow-2xl shadow-lg p-6 cursor-pointer transition-all duration-300  ${selectedType === "ai"
              ? "ring-2 ring-green-500"
              : "hover:shadow-xl"
              }`}
            onClick={() => {
              setSelectedType("bot");
              router.push(
                "/strategy/bot",
              );
            }}
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl font-semibold text-gray-800 dark:text-gray-200">
                Autonomous Agents
              </h2>

              <div className="bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 px-3 py-1 rounded-full text-xs font-bold tracking-wider uppercase">
                AGI Autopilot
              </div>
            </div>
            <p className="text-gray-600 text-sm mb-4 dark:text-gray-300">
              Deploy personalized AI agents that execute complex strategies 24/7. Your vision, our precision—making winning moves while you sleep.
            </p>

            <div className="mt-auto flex items-center gap-2 text-amber-500 font-medium italic">
              <div className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
              <span className="text-sm tracking-wide">Initializing Agent Core...</span>
            </div>
          </motion.div>
        </div>

        {/* Help Section */}
        <div className="mt-12 bg-white dark:bg-[#18181c] rounded-2xl shadow-lg border border-gray-200 dark:border-gray-800 p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400">
              <FiInfo className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-gray-900 dark:text-white">Need guidance?</h4>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Check our comprehensive strategy documentation or watch the demo.
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-3">
            <a
              href="/docs"
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 font-medium rounded-xl hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
            >
              <FiExternalLink className="w-4 h-4" />
              Documentation
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
