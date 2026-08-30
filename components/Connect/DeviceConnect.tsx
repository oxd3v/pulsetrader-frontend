"use client";
import { useEffect, useState, useCallback, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { FiLoader, FiCheckCircle, FiAlertCircle } from "react-icons/fi";
import { useUserAuth } from "@/hooks/useAuth";
import { NOTIFICATION_CONFIG } from "@/constants/config/notification";
import { motion, AnimatePresence } from "framer-motion";

// 1. Create the inner component that uses search params
function DeviceConnectInner() {
  const [status, setStatus] = useState<"loading" | "success" | "error">(
    "loading",
  );
  const [errorMessage, setErrorMessage] = useState("");
  const { connectByToken } = useUserAuth();
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get("token");

  const handleConnectionByToken = async (authToken: string) => {
    try {
      setStatus("loading");
      const result: any = await connectByToken(authToken);
      if (result.connection === true) {
        setStatus("success");
        setTimeout(() => router.push("/"), 2000);
      } else {
        setErrorMessage(
          NOTIFICATION_CONFIG[result.type].message ||
            "Connection failed! Try again.",
        );
        setStatus("error");
      }
    } catch (err) {
      setErrorMessage("Connection failed! Try again.");
      setStatus("error");
    }
  };

  useEffect(() => {
    if (token) {
      handleConnectionByToken(token);
    } else {
      setErrorMessage("Connection token not found");
      setStatus("error");
    }
  }, [token]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-md w-full bg-white dark:bg-[#0d1117] p-8 rounded-[32px] shadow-2xl border border-gray-100 dark:border-white/5 text-center"
    >
      <AnimatePresence mode="wait">
        {status === "loading" && (
          <motion.div key="loading" exit={{ opacity: 0 }}>
            <FiLoader className="w-12 h-12 animate-spin text-blue-500 mx-auto mb-4" />
            <h2 className="text-xl font-bold dark:text-white">
              Authenticating Device
            </h2>
            <p className="text-gray-500 dark:text-gray-400 mt-2 text-sm">
              Please wait while we verify your secure session...
            </p>
          </motion.div>
        )}

        {status === "success" && (
          <motion.div
            key="success"
            initial={{ scale: 0.9 }}
            animate={{ scale: 1 }}
          >
            <div className="w-16 h-16 bg-emerald-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <FiCheckCircle className="w-8 h-8 text-emerald-500" />
            </div>
            <h2 className="text-xl font-bold dark:text-white">
              Connection Secured
            </h2>
            <p className="text-gray-500 dark:text-gray-400 mt-2 text-sm">
              Redirecting to dashboard...
            </p>
          </motion.div>
        )}

        {status === "error" && (
          <motion.div key="error" initial={{ opacity: 0 }}>
            <FiAlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-bold dark:text-white text-red-500">
              Link Failed
            </h2>
            <p className="text-gray-500 dark:text-gray-400 mt-2 text-sm mb-6">
              {errorMessage}
            </p>
            <button
              onClick={() => router.push("/")}
              className="w-full py-3 bg-gray-100 dark:bg-white/5 rounded-xl font-bold dark:text-white hover:bg-gray-200 transition-colors"
            >
              Back to Login
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// 2. The default export wraps the inner component in Suspense
export default function DeviceConnected() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-[#050505] p-4">
      <Suspense
        fallback={
          <div className="max-w-md w-full bg-white dark:bg-[#0d1117] p-8 rounded-[32px] border border-gray-100 dark:border-white/5 text-center">
            <FiLoader className="w-12 h-12 animate-spin text-blue-500 mx-auto mb-4" />
            <p className="text-gray-500 text-sm">Initializing...</p>
          </div>
        }
      >
        <DeviceConnectInner />
      </Suspense>
    </div>
  );
}
