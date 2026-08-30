"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  FiCopy,
  FiLogOut,
  FiUser,
  FiKey,
  FiGift,
  FiExternalLink,
  FiShield,
  FiCheckCircle,
} from "react-icons/fi";
import { RiDeleteBin7Line } from "react-icons/ri";
import { toast } from "react-hot-toast";
import { motion, AnimatePresence } from "framer-motion";

// Hooks & Store
import { encodeText } from "@/lib/crypto-encryption/encryption";
import { isValidEVMWalletAddress } from "@/lib/utils";
import { useUserAuth } from "@/hooks/useAuth";
import { useStore } from "@/store/useStore";
import { useShallow } from "zustand/shallow";
import { PROTOCOL_URL } from "@/constants/config/enviroments";
import InvitationCard from "./invitationCard";

// Components
import QrCode from "@/components/common/QRCode/QrCode";

export default function SettingsPage() {
  const router = useRouter();
  const { disconnect, createInvitationCode, removeInvitationCode } =
    useUserAuth();

  const { user, isConnected, signature } = useStore(
    useShallow((state: any) => ({
      user: state.user,
      isConnected: state.isConnected,
      signature: state.signature,
    })),
  );

  const [invitationCodes, setInvitationCodes] = useState<any[]>(
    user?.invitationCodes || [],
  );
  const [recipientAddress, setRecipientAddress] = useState("");
  const [expireAt, setExpireAt] = useState("");
  const [isCreatingCode, setIsCreatingCode] = useState(false);

  useEffect(() => {
    setInvitationCodes(user?.invitationCodes || []);
  }, [user?.invitationCodes]);

  useEffect(() => {
    if (!isConnected) {
      router.push("/connect");
    }
  }, [isConnected]);

  // Guard: Only render if connected and account exists
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

  const handleCopy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(label);
  };

  const handleCreateInvitationCode = async () => {
    try {
      if (!isValidEVMWalletAddress(recipientAddress)) {
        toast.error("Invalid Ethereum address");
        return;
      }
      if (!expireAt) {
        toast.error("Select an expiration date");
        return;
      }

      const expiresMs = new Date(expireAt).getTime();
      if (expiresMs <= Date.now()) {
        toast.error("Expiration must be in the future");
        return;
      }

      setIsCreatingCode(true);
      const result: any = await createInvitationCode({
        invitedTo: recipientAddress,
        expireAt: expiresMs,
      });
      if (result?.created == true && result.code) {
        //setInvitationCodes((c) => [...c, result.code]);
        setRecipientAddress("");
        setExpireAt("");
      }
    } catch (e: any) {
      //toast.error("Unexpected error");
    } finally {
      setIsCreatingCode(false);
    }
  };

  // userSettings.tsx - Updated handleRemoveInvitationCode logic
  const handleRemoveInvitationCode = async (code: string) => {
    try {
      const removeResult = await removeInvitationCode(code);
      // if (removeResult.removed === true) {
      //   //setInvitationCodes((prev) => prev.filter((c) => c !== code));
      // }
    } catch (err) {
      //toast.error("An error occurred while removing the code");
    }
  };

  const deviceLink = `${PROTOCOL_URL}connect/device?token=${encodeText(JSON.stringify({ signature, address: user.account, expireAt: Date.now() + 86400000 }))}`;

  return (
    <div className="container mx-auto px-4 py-12 max-w-6xl">
      <header className="mb-10">
        <h1 className="text-3xl font-black tracking-tight text-gray-900 dark:text-white">
          System <span className="text-blue-600">Settings</span>
        </h1>
        <p className="text-gray-500 dark:text-gray-400 mt-2">
          Manage your protocol identity and access controls.
        </p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Profile Sidebar */}
        <div className="lg:col-span-4 space-y-6">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="bg-white dark:bg-[#0d1117] border border-gray-200 dark:border-white/10 rounded-3xl p-8 sticky top-24"
          >
            <div className="flex flex-col items-center text-center">
              <div className="relative mb-6">
                <div className="w-24 h-24 rounded-3xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center shadow-xl">
                  <FiUser className="w-12 h-12 text-white" />
                </div>
                <div className="absolute -bottom-2 -right-2 bg-green-500 border-4 border-white dark:border-[#0d1117] w-8 h-8 rounded-full flex items-center justify-center">
                  <FiCheckCircle className="w-4 h-4 text-white" />
                </div>
              </div>

              <h2 className="text-2xl font-bold dark:text-white mb-1">
                {user?.username || "Protocol User"}
              </h2>

              <button
                onClick={() => handleCopy(user.account, "Address")}
                className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-gray-100 dark:bg-white/5 hover:bg-gray-200 dark:hover:bg-white/10 transition-colors mb-6 group"
              >
                <span className="text-xs font-mono text-gray-500 group-hover:text-blue-500">
                  {user.account.slice(0, 6)}...{user.account.slice(-4)}
                </span>
                <FiCopy className="w-3 h-3 text-gray-400 group-hover:text-blue-500" />
              </button>

              <div className="grid grid-cols-2 gap-4 w-full mb-8">
                <div className="p-4 rounded-2xl bg-gray-50 dark:bg-white/5 border border-gray-100 dark:border-white/5">
                  <p className="text-[10px] uppercase font-bold text-gray-400 mb-1">
                    Status
                  </p>
                  <p className="text-sm font-bold text-blue-600">
                    {user?.status || "Active"}
                  </p>
                </div>
                <div className="p-4 rounded-2xl bg-gray-50 dark:bg-white/5 border border-gray-100 dark:border-white/5">
                  <p className="text-[10px] uppercase font-bold text-gray-400 mb-1">
                    Tier
                  </p>
                  <p className="text-sm font-bold text-purple-600">Standard</p>
                </div>
              </div>

              <button
                onClick={() => {
                  disconnect();
                  router.push("/");
                }}
                className="w-full py-3 bg-red-500/10 hover:bg-red-500 text-red-500 hover:text-white rounded-2xl font-bold transition-all flex items-center justify-center gap-2 group"
              >
                <FiLogOut className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
                Disconnect Session
              </button>
            </div>
          </motion.div>
        </div>

        {/* Settings Panels */}
        <div className="lg:col-span-8 space-y-8">
          {/* Device Sync Panel */}
          {/* <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white dark:bg-[#0d1117] border border-gray-200 dark:border-white/10 rounded-3xl overflow-hidden shadow-sm"
          >
            <div className="p-8 border-b border-gray-100 dark:border-white/5 bg-gray-50/50 dark:bg-white/[0.02]">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-purple-500/10 rounded-lg">
                  <FiKey className="w-5 h-5 text-purple-500" />
                </div>
                <h2 className="text-xl font-bold dark:text-white">
                  Device Synchronization
                </h2>
              </div>
              <p className="text-sm text-gray-500">
                Scan this code to instantly authorize a secondary hardware
                device.
              </p>
            </div>

            <div className="p-8 flex flex-col md:flex-row gap-8 items-center">
              <div className="p-4 bg-white rounded-2xl shadow-inner border border-gray-100">
                <QrCode value={deviceLink} size={160} />
              </div>

              <div className="flex-1 w-full space-y-4">
                <div className="p-4 bg-gray-50 dark:bg-black/20 rounded-2xl border border-gray-200 dark:border-white/5">
                  <p className="text-[10px] font-bold text-gray-400 uppercase mb-2">
                    Auth URL
                  </p>
                  <Link
                    href={deviceLink}
                    target="_blank"
                    className="text-xs font-mono break-all text-gray-600 dark:text-gray-300 mb-4 line-clamp-2"
                  >
                    {signature ? deviceLink : isConnected? "Reconnect you wallet to get signature" : 'Connect your wallet'}
                  </Link>
                  <button
                    disabled={!signature}
                    onClick={() => handleCopy(deviceLink, "Sync link")}
                    className="w-full py-2.5 bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl text-xs font-bold hover:bg-gray-50 dark:hover:bg-white/10 transition-all flex items-center justify-center gap-2"
                  >
                    <FiCopy className="w-3 h-3" /> Copy Sync URL
                  </button>
                </div>
              </div>
            </div>
          </motion.div> */}

          {/* Invitation Management */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-white dark:bg-[#0d1117] border border-gray-200 dark:border-white/10 rounded-3xl overflow-hidden"
          >
            <div className="p-8 border-b border-gray-100 dark:border-white/5 bg-gray-50/50 dark:bg-white/[0.02]">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-green-500/10 rounded-lg">
                  <FiGift className="w-5 h-5 text-green-500" />
                </div>
                <h2 className="text-xl font-bold dark:text-white">
                  Invitations
                </h2>
              </div>
              <p className="text-sm text-gray-500">
                Onboard verified partners to the protocol ecosystem.
              </p>
            </div>

            <div className="p-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-gray-400 uppercase ml-1">
                    Recipient Address
                  </label>
                  <input
                    type="text"
                    value={recipientAddress}
                    onChange={(e) => setRecipientAddress(e.target.value)}
                    placeholder="0x..."
                    className="w-full px-4 py-3.5 rounded-2xl bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 focus:ring-2 focus:ring-blue-500 outline-none transition-all font-mono text-sm"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-gray-400 uppercase ml-1">
                    Expiry Date
                  </label>
                  <input
                    type="datetime-local"
                    value={expireAt}
                    onChange={(e) => setExpireAt(e.target.value)}
                    className="w-full px-4 py-3.5 rounded-2xl bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 focus:ring-2 focus:ring-blue-500 outline-none transition-all text-sm"
                  />
                </div>
                <button
                  onClick={handleCreateInvitationCode}
                  disabled={isCreatingCode}
                  className="md:col-span-2 py-4 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-2xl font-bold transition-all shadow-lg shadow-blue-500/20 flex items-center justify-center gap-2"
                >
                  {isCreatingCode ? (
                    <span className="animate-pulse">
                      Generating Secure Code...
                    </span>
                  ) : (
                    "Generate Invitation"
                  )}
                </button>
              </div>

              {/* List */}
              <div className="space-y-3">
                <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-4">
                  Active Invitations
                </h3>
                <AnimatePresence>
                  {invitationCodes.length > 0 ? (
                    invitationCodes.map((code: string, idx: number) => (
                      <InvitationCard
                        code={code}
                        onCodeRemove={() => handleRemoveInvitationCode(code)}
                      />
                    ))
                  ) : (
                    <div className="text-center py-10 bg-gray-50/50 dark:bg-white/5 rounded-3xl border border-dashed border-gray-200 dark:border-white/10">
                      <p className="text-sm text-gray-400">
                        No invitation codes found.
                      </p>
                    </div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
