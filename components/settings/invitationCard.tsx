import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { FiCopy, FiExternalLink, FiClock, FiUser, FiAlertCircle } from "react-icons/fi";
import { RiDeleteBin7Line } from "react-icons/ri";
import { decodeInvitationCode } from "@/lib/crypto-encryption/encryption";
import { handleCopy } from "@/lib/utils";


interface InvitationCardProps {
  code: string;
  onCodeRemove: () => void;
}

export default function InvitationCard({ code, onCodeRemove }: InvitationCardProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [to, setTo] = useState("");
  const [isExpired, setIsExpired] = useState(false);
  const [expireAt, setExpireAt] = useState<string>("");
  const [status, setStatus] = useState("silver");
  const [link, setLink] = useState("");

  const handleRemoveCode = async () => {
    setIsLoading(true);
    try {
      await onCodeRemove();
    } catch (err) {
      console.error("Removal failed", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const { to, expireTimestamp, link, isExpired, status } = decodeInvitationCode(code);
    const expiresDisplay = expireTimestamp ? new Date(expireTimestamp).toLocaleString() : "—";
    
    setStatus(status);
    setTo(to);
    setLink(link);
    setIsExpired(isExpired);
    setExpireAt(expiresDisplay);
  }, [code]);

  // Loading Skeleton State
  if (isLoading) {
    return (
      <div className="w-full h-[88px] animate-pulse bg-gray-100 dark:bg-white/5 rounded-2xl border border-transparent" />
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`group relative flex items-center justify-between p-4 transition-all border
        ${isExpired 
          ? "bg-red-50/50 dark:bg-red-500/5 border-red-200 dark:border-red-500/20" 
          : "bg-white dark:bg-[#0d1117] border-gray-100 dark:border-white/5 hover:border-blue-500/50 shadow-sm"
        } rounded-2xl`}
    >
      <div className="flex flex-col gap-1.5 max-w-[70%]">
        {/* Invitation Link */}
        <div className="flex items-center gap-2">
          <a 
            href={link} 
            target="_blank" 
            rel="noreferrer"
            className="text-sm font-mono font-bold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1.5 truncate"
          >
            Invite: {code.slice(0, 6)}...{code.slice(-4)}
            <FiExternalLink className="w-3 h-3" />
          </a>
          {isExpired && (
            <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-100 dark:bg-red-500/20 text-[10px] font-bold text-red-600 dark:text-red-400">
              <FiAlertCircle /> Expired
            </span>
          )}
        </div>

        {/* Metadata Row */}
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
          <div className="flex items-center gap-1.5 text-[11px] text-gray-500 dark:text-gray-400">
            <FiUser className="text-gray-400" />
            <span>To: <span className="font-mono font-bold text-gray-700 dark:text-gray-200">{to.slice(0, 6)}...{to.slice(-4)}</span></span>
          </div>

          <div className="flex items-center gap-1.5 text-[11px] text-gray-500 dark:text-gray-400">
            <FiClock className="text-gray-400" />
            <span className={isExpired ? "text-red-500" : ""}>
              Expires: <span className="font-bold">{expireAt}</span>
            </span>
          </div>

          <div className="flex items-center gap-1.5 text-[11px] text-gray-500 dark:text-gray-400">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            <span className="capitalize">{status} Tier</span>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => handleCopy(link, "Invitation Link Copied")}
          title="Copy Link"
          className="p-2.5 bg-gray-50 dark:bg-white/5 hover:bg-blue-50 dark:hover:bg-blue-500/20 rounded-xl text-gray-500 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-all border border-transparent hover:border-blue-200 dark:hover:border-blue-500/30"
        >
          <FiCopy className="w-4 h-4" />
        </button>
        
        <button
          onClick={handleRemoveCode}
          title="Delete Invitation"
          className="p-2.5 bg-gray-50 dark:bg-white/5 hover:bg-red-50 dark:hover:bg-red-500/20 rounded-xl text-gray-500 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400 transition-all border border-transparent hover:border-red-200 dark:hover:border-red-500/30"
        >
          <RiDeleteBin7Line className="w-4 h-4" />
        </button>
      </div>
    </motion.div>
  );
}