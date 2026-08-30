"use client";
import { useState, Suspense, useEffect, useMemo } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useWallet } from "@/hooks/useWallet";
import { useUserAuth } from "@/hooks/useAuth";
import { motion, AnimatePresence } from "framer-motion";
import {
  FiGift,
  FiArrowRight,
  FiCheckCircle,
  FiLoader,
  FiShield,
  FiAlertTriangle,
  FiDownload,
} from "react-icons/fi";
import toast from "react-hot-toast";
import { decodeInvitationCode } from "@/lib/crypto-encryption/encryption";

function JoinByCodeInner() {
  const { isMetamaskConnected, metamaskConnectedWallet, connectToMetamask } =
    useWallet();
  const searchParams = useSearchParams();
  const { joinUser } = useUserAuth();
  const router = useRouter();

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [invitationData, setInvitationData] = useState<any>(null);
  const invitationCode = searchParams.get("invitation");

  // 1. Decode Invitation and Validate Metadata
  useEffect(() => {
    if (invitationCode) {
      try {
        const decoded = decodeInvitationCode(invitationCode);
        if (decoded.isExpired) {
          setError("This invitation has expired.");
        }
        setInvitationData(decoded);
      } catch (e) {
        setError("Invalid invitation link.");
      }
    } else {
      setError("No invitation code provided.");
    }
  }, [invitationCode]);

  // 2. Check Wallet Compatibility
  const isCorrectWallet = useMemo(() => {
    if (!metamaskConnectedWallet || !invitationData) return false;
    return (
      metamaskConnectedWallet.toLowerCase() === invitationData.to.toLowerCase()
    );
  }, [metamaskConnectedWallet, invitationData]);

  const handleJoinProtocol = async () => {
    if (!isCorrectWallet) {
      toast.error("Connected wallet does not match the invited address.");
      return;
    }

    setIsSubmitting(true);
    try {
      // Logic for joining the user into the system
      const result = await joinUser({
        account: metamaskConnectedWallet,
        signUpMethod: "INVITATION_CODE",
        invitationCode: invitationCode || undefined,
      });

      if (result.joined == true) {
        router.push("/");
      }
    } catch (e) {
    } finally {
      setIsSubmitting(false);
    }
  };

  // 3. Detect MetaMask Installation
  const hasMetaMask = typeof window !== "undefined" && !!window.ethereum;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="max-w-md w-full bg-white dark:bg-[#0d1117] p-8 md:p-12 rounded-[32px] border border-gray-100 dark:border-white/5 shadow-2xl shadow-blue-500/5"
    >
      {/* Header Section */}
      <div className="text-center mb-8">
        <div className="w-20 h-20 bg-blue-500/10 rounded-3xl flex items-center justify-center mx-auto mb-6 text-blue-500">
          <FiGift size={40} />
        </div>
        <h1 className="text-3xl font-black text-gray-900 dark:text-white mb-2 italic">
          EXCLUSIVE INVITE
        </h1>
        <p className="text-gray-500 dark:text-gray-400 text-sm">
          You've been invited to join the Pulse-Trader network.
        </p>
      </div>

      {/* Invitation Info Card */}
      <AnimatePresence mode="wait">
        {error ? (
          <motion.div className="p-4 bg-red-500/10 border border-red-500/20 rounded-2xl text-red-500 text-sm flex items-center gap-3 mb-6">
            <FiAlertTriangle /> {error}
          </motion.div>
        ) : (
          <motion.div className="space-y-4 mb-8">
            <div className="p-4 bg-gray-50 dark:bg-white/5 rounded-2xl border border-gray-100 dark:border-white/5">
              <div className="text-[10px] uppercase tracking-widest text-gray-400 font-bold mb-1">
                Intended Recipient
              </div>
              <div className="text-sm font-mono font-bold text-gray-700 dark:text-gray-200 truncate">
                {invitationData?.to || "Loading..."}
              </div>
            </div>

            <div className="flex gap-4">
              <div className="flex-1 p-4 bg-gray-50 dark:bg-white/5 rounded-2xl border border-gray-100 dark:border-white/5">
                <div className="text-[10px] uppercase tracking-widest text-gray-400 font-bold mb-1">
                  Status
                </div>
                <div className="text-sm font-bold text-emerald-500 capitalize">
                  {invitationData?.status || "Silver"}
                </div>
              </div>
              <div className="flex-1 p-4 bg-gray-50 dark:bg-white/5 rounded-2xl border border-gray-100 dark:border-white/5">
                <div className="text-[10px] uppercase tracking-widest text-gray-400 font-bold mb-1">
                  Network
                </div>
                <div className="text-sm font-bold text-blue-500">Mainnet</div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Call to Action */}
      <div className="space-y-4">
        {!hasMetaMask ? (
          <Link
            href="https://metamask.io/download/"
            target="_blank"
            className="w-full py-4 bg-orange-500 hover:bg-orange-600 text-white rounded-2xl font-bold flex items-center justify-center gap-2 transition-all"
          >
            <FiDownload /> Install MetaMask to Join
          </Link>
        ) : !isMetamaskConnected ? (
          <button
            onClick={connectToMetamask}
            className="w-full py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-bold flex items-center justify-center gap-2 transition-all shadow-lg shadow-blue-600/20"
          >
            Connect Wallet <FiArrowRight />
          </button>
        ) : (
          <button
            disabled={!isCorrectWallet || isSubmitting}
            onClick={handleJoinProtocol}
            className={`w-full py-4 rounded-2xl font-bold flex items-center justify-center gap-2 transition-all shadow-lg
              ${isCorrectWallet
                ? "bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-600/20"
                : "bg-gray-200 dark:bg-white/10 text-gray-400 cursor-not-allowed"
              }`}
          >
            {isSubmitting ? (
              <FiLoader className="animate-spin" />
            ) : (
              <FiCheckCircle />
            )}
            {isCorrectWallet
              ? "Accept & Join Protocol"
              : "Wrong Wallet Connected"}
          </button>
        )}

        {isMetamaskConnected && (
          <div className="text-center">
            <span className="text-[10px] text-gray-500">Connected: </span>
            <span className="text-[10px] font-mono font-bold text-gray-400">
              {metamaskConnectedWallet?.slice(0, 6)}...
              {metamaskConnectedWallet?.slice(-4)}
            </span>
          </div>
        )}
      </div>

      <div className="mt-8 flex items-center justify-center gap-2 text-[10px] text-gray-500 uppercase tracking-widest font-bold opacity-50">
        <FiShield /> Secure Decentralized Verification
      </div>
    </motion.div>
  );
}

export default function JoinByInvitationCode() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-[#050505] p-4">
      <Suspense
        fallback={<FiLoader className="animate-spin text-blue-500 w-10 h-10" />}
      >
        <JoinByCodeInner />
      </Suspense>
    </div>
  );
}
