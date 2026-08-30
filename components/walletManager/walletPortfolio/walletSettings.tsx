import { useState } from "react";
import { useUserAuth } from "@/hooks/useAuth";
import { WalletType } from "@/type/common";
import toast from "react-hot-toast";
import { FiEye, FiEyeOff, FiCopy, FiAlertTriangle, FiShield, FiZap } from "react-icons/fi";
import { decryptPrivateKey } from "@/lib/crypto-encryption/authToken";

interface WalletSettingsProps {
  wallet: WalletType;
}

export default function WalletSettings({ wallet }: WalletSettingsProps) {
  const { getPrivateKey } = useUserAuth();
  const [isLoadingKey, setIsLoadingKey] = useState(false);
  const [secureKey, setSecureKey] = useState<string | null>(null);
  const [privateKey, setPrivateKey] = useState<string | null>(null);
  const [isKeyVisible, setIsKeyVisible] = useState(false);
  const [isDefaultWallet, setIsDefaultWallet] = useState(false);

  const handleRevealKey = async () => {
    if (isKeyVisible && privateKey) {
      setIsKeyVisible(false);
      setPrivateKey(null);
      return;
    }
    setIsLoadingKey(true);
    try {
      if (secureKey) {
        const key = await decryptPrivateKey(secureKey);
        setPrivateKey(key as string);
        setIsKeyVisible(true);
      } else {
        const response: any = await getPrivateKey(wallet.address);
        if (response.decrypted && response.key) {
          setSecureKey(response.key);
          const pKey = await decryptPrivateKey(response.key as string);
          setPrivateKey(pKey as string);
          setIsKeyVisible(true);
        }
      }
    } catch {
      toast.error("An unexpected error occurred");
    } finally {
      setIsLoadingKey(false);
    }
  };

  return (
    <div className="space-y-4 max-w-xl">
      {/* Trading preference */}
      {/* <div className="bg-white dark:bg-[#13131a] border border-black/5 dark:border-white/5 rounded-2xl p-5">
        <div className="flex items-center gap-2 mb-4">
          <FiZap size={15} className="text-yellow-500" />
          <h3 className="text-sm font-bold text-black dark:text-white">Trading Preferences</h3>
        </div>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold text-black dark:text-white">Default for Instant Trade</p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Use this wallet for one-click swaps automatically.</p>
          </div>
          <button
            onClick={() => {
              setIsDefaultWallet(!isDefaultWallet);
              if (!isDefaultWallet) toast.success("Set as default wallet");
            }}
            className={`relative flex-shrink-0 w-11 h-6 rounded-full transition-colors focus:outline-none ${isDefaultWallet ? "bg-blue-600" : "bg-gray-200 dark:bg-gray-700"
              }`}
          >
            <span className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-transform ${isDefaultWallet ? "translate-x-6" : "translate-x-1"}`} />
          </button>
        </div>
      </div> */}

      {/* Private key export */}
      <div className="bg-white dark:bg-[#13131a] border border-black/5 dark:border-white/5 rounded-2xl p-5">
        <div className="flex items-center gap-2 mb-1">
          <FiShield size={15} className="text-red-500" />
          <h3 className="text-sm font-bold text-red-600 dark:text-red-400">Export Private Key</h3>
        </div>
        <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">
          Never share your private key. Anyone with this key has full control of your funds.
        </p>

        {/* Warning banner */}
        <div className="flex items-start gap-2 bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-900/30 rounded-xl p-3 mb-4">
          <FiAlertTriangle size={14} className="text-red-500 flex-shrink-0 mt-0.5" />
          <p className="text-xs text-red-600 dark:text-red-400">
            Make sure no one is watching your screen before revealing this key.
          </p>
        </div>

        {/* Key display */}
        <div className="relative bg-gray-50 dark:bg-black/30 border border-black/5 dark:border-white/10 rounded-xl p-4 font-mono text-xs break-all mb-4 min-h-[56px] flex items-center">
          {isKeyVisible && privateKey ? (
            <span className="text-gray-800 dark:text-gray-200 select-all">{privateKey}</span>
          ) : (
            <span className="text-gray-400 blur-[3px] select-none pointer-events-none">
              0x0000000000000000000000000000000000000000000000000000000000000000
            </span>
          )}
          {!isKeyVisible && (
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-xs font-medium text-gray-500 bg-white/90 dark:bg-black/80 px-2.5 py-1 rounded-lg backdrop-blur-sm">
                Hidden
              </span>
            </div>
          )}
        </div>

        <div className="flex gap-2">
          <button
            onClick={handleRevealKey}
            disabled={isLoadingKey}
            className="flex items-center gap-2 px-4 py-2 bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 text-black dark:text-white rounded-xl text-xs font-bold transition-all"
          >
            {isLoadingKey ? (
              <span className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />
            ) : isKeyVisible ? (
              <><FiEyeOff size={13} /> Hide</>
            ) : (
              <><FiEye size={13} /> Reveal</>
            )}
          </button>
          {isKeyVisible && privateKey && (
            <button
              onClick={() => { navigator.clipboard.writeText(privateKey); toast.success("Copied"); }}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold transition-all"
            >
              <FiCopy size={13} /> Copy
            </button>
          )}
        </div>
      </div>
    </div>
  );
}