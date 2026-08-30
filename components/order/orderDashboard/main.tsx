"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import OrderList from "@/components/order/dashboard/OrderList";
import { motion, AnimatePresence } from "framer-motion";
import { useStore } from "@/store/useStore";
import { useShallow } from "zustand/shallow";
import { FiShield } from "react-icons/fi";

export default function OrderDashboard() {
  const router = useRouter();
  const { user, isConnected, userOrders, network } = useStore(
    useShallow((state: any) => ({
      user: state.user,
      isConnected: state.isConnected,
      userOrders: state.userOrders,
      network: state.network
    })),
  );

  if (!isConnected || !user?.account) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[70vh] px-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center p-10 bg-white dark:bg-white/5 backdrop-blur-xl border border-gray-200 dark:border-white/10 rounded-3xl shadow-2xl max-w-md w-full"
        >
          <div className="w-20 h-20 mx-auto bg-gray-100 dark:bg-white/5 rounded-2xl flex items-center justify-center mb-6">
            <FiShield className="w-10 h-10 text-gray-400" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">
            Access Restricted
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mb-8">
            Please connect your decentralized identity to manage your protocol
            settings.
          </p>
          <button
            onClick={() => router.push("/connect")}
            className="w-full py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-bold transition-all shadow-lg shadow-blue-500/25 active:scale-95"
          >
            Connect Wallet
          </button>
        </motion.div>
      </div>
    );
  }

  return (<OrderList network={network} userOrders={userOrders} orderCategory="all" isConnected={isConnected}/>)
}
