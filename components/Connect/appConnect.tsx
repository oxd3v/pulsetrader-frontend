"use client";
import { useState, useEffect } from "react";
import Link from 'next/link';
import { useRouter } from "next/navigation";
import { useUserAuth } from "@/hooks/useAuth";
import { useWallet } from "@/hooks/useWallet";
import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";
import {
  FiArrowRight,
  FiKey,
  FiHash,
  FiChevronDown,
  FiChevronUp,
  FiLogOut,
} from "react-icons/fi";
import toast from "react-hot-toast";

export default function ConnectionBox({
  isJoining,
  setIsJoining,
}: {
  isJoining: boolean;
  setIsJoining: (value: boolean) => void;
}) {
  const {
    isMetamaskConnected,
    isMetaMaskInstalled,
    metamaskConnectedWallet,
    connectToMetamask,
  } = useWallet();
  const { connectUserByWallet, connectUserByAuth } = useUserAuth();
  const router = useRouter();
  const [isConnectByAuthToken, setIsConnectByAuthToken] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [inputAuthToken, setInputAuthToken] = useState<string>("");

  // Handle just the wallet connection (Phase 1)
  const handleWalletConnect = async () => {
    setIsLoading(true);
    try {
      await connectToMetamask();
    } catch (e) {
      // console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  // Handle the app login/signature (Phase 2)
  const handleAppLogin = async () => {
    setIsLoading(true);
    try {
      const connectionRes = await connectUserByWallet();
      if (connectionRes.connection == true) {
        setTimeout(() => router.push("/"), 1000);
      } else {

        if (connectionRes.error == 'USER_NOT_FOUND') {
          setIsJoining(true)
        }
      }
    } catch (e) {
      // console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  const handleShowTokenAuth = async () => {
    if (!inputAuthToken) {
      toast.error("Please enter your auth token");
      return;
    }
    setIsLoading(true);
    try {
      const connectionRes: any = await connectUserByAuth(inputAuthToken);
      if (connectionRes.connection == true) {
        setTimeout(() => router.push("/"), 2000);
      } else {

      }
    } catch (e) {
      //toast.error("Connection failed");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-white/80 dark:bg-[#161b22]/80 rounded-[32px] p-8 shadow-2xl border border-gray-100 dark:border-white/5 backdrop-blur-xl">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-black text-gray-900 dark:text-white mb-2 tracking-tight">
          Welcome Back
        </h1>
        <p className="text-gray-500 dark:text-gray-400 font-medium">
          Connect your wallet to access the terminal
        </p>
      </div>

      <div className="space-y-4">
        {/* 1. Wallet Status / Connection Button */}
        {isMetaMaskInstalled ? (
          <>
            {!isMetamaskConnected ? (
              // State A: Wallet NOT Connected -> Show Connect Button
              <button
                onClick={handleWalletConnect}
                disabled={isLoading}
                className="group relative w-full py-4 px-6 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-bold transition-all disabled:opacity-70 flex items-center justify-between overflow-hidden shadow-lg shadow-blue-500/20"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000" />
                <div className="flex items-center gap-3">
                  <img
                    src="https://upload.wikimedia.org/wikipedia/commons/3/36/MetaMask_Fox.svg"
                    className="w-6 h-6"
                    alt="MetaMask"
                  />
                  <span>
                    {isLoading ? "Connecting..." : "Connect MetaMask"}
                  </span>
                </div>
                {!isLoading && (
                  <FiArrowRight className="group-hover:translate-x-1 transition-transform" />
                )}
              </button>
            ) : (
              // State B: Wallet Connected -> Show Address & Login Button
              <div className="space-y-3">
                <div className="p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-500/30 rounded-2xl flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      <img
                        src="https://upload.wikimedia.org/wikipedia/commons/3/36/MetaMask_Fox.svg"
                        className="w-8 h-8"
                        alt="MetaMask"
                      />
                      <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-emerald-500 border-2 border-white dark:border-[#161b22] rounded-full"></div>
                    </div>
                    <div className="text-left">
                      <p className="text-[10px] uppercase font-bold text-gray-500 dark:text-gray-400 tracking-wider">
                        Connected Wallet
                      </p>
                      <p className="font-mono text-sm font-bold text-gray-900 dark:text-white">
                        {metamaskConnectedWallet.slice(0, 6)}...
                        {metamaskConnectedWallet.slice(-4)}
                      </p>
                    </div>
                  </div>
                </div>

                <button
                  onClick={handleAppLogin}
                  disabled={isLoading}
                  className="w-full py-4 px-6 cursor-pointer bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl font-bold transition-all disabled:opacity-70 flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20"
                >
                  <span>
                    {isLoading ? "Verifying..." : "Connect with Wallet"}
                  </span>
                  {!isLoading && <FiArrowRight />}
                </button>
              </div>
            )}
          </>
        ) : (
          <Link
            href="https://metamask.io/download/"
            target="_blank"
            className="w-full py-4 px-6 bg-orange-500 hover:bg-orange-600 text-white rounded-2xl font-bold flex items-center justify-center gap-2 shadow-lg shadow-orange-500/20"
          >
            Install MetaMask
          </Link>
        )}

        {/* Divider */}
        <div className="relative py-4">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-gray-200 dark:border-white/10"></div>
          </div>
          <div className="relative flex justify-center">
            <span className="bg-white dark:bg-[#161b22] px-4 text-xs font-bold text-gray-400 uppercase tracking-widest">
              Or access via
            </span>
          </div>
        </div>

        {/* Token Auth Section */}
        <div className="bg-gray-50 dark:bg-black/20 rounded-2xl border border-gray-100 dark:border-white/5 overflow-hidden transition-all">
          <button
            onClick={() => setIsConnectByAuthToken(!isConnectByAuthToken)}
            className="w-full py-3 px-6 flex items-center justify-between text-gray-700 dark:text-gray-300 font-bold hover:bg-gray-100 dark:hover:bg-white/5 transition-colors"
          >
            <span className="flex items-center gap-2">
              <FiKey className="text-gray-400" /> Use Auth Token
            </span>
            {isConnectByAuthToken ? <FiChevronUp /> : <FiChevronDown />}
          </button>

          <AnimatePresence>
            {isConnectByAuthToken && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="px-4 pb-4 space-y-3"
              >
                <div className="relative">
                  <FiHash className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    placeholder="Paste Auth Token"
                    value={inputAuthToken}
                    onChange={(e) => setInputAuthToken(e.target.value)}
                    className="w-full bg-white dark:bg-[#0d1117] border border-gray-200 dark:border-white/10 rounded-xl pl-10 pr-4 py-3 outline-none focus:ring-2 focus:ring-blue-500/50 text-sm font-mono"
                  />
                </div>
                <button
                  onClick={handleShowTokenAuth}
                  disabled={isLoading}
                  className="w-full py-3 bg-gray-900 dark:bg-white text-white dark:text-black rounded-xl font-bold shadow-lg hover:shadow-xl hover:scale-[1.02] transition-all active:scale-[0.98]"
                >
                  {isLoading ? "Verifying..." : "Verify & Connect"}
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <p className="pt-2 text-center text-sm text-gray-500">
          New here?{" "}
          <button
            onClick={() => setIsJoining(true)}
            className="text-blue-600 dark:text-blue-400 font-bold hover:underline"
          >
            Join here
          </button>
        </p>
      </div>
    </div>
  );
}
