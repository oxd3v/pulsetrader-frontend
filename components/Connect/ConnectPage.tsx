"use client";
import { useState } from "react";
import ConnectionBox from "./appConnect";
import JoinBox from "./JoinBox";
import { motion, AnimatePresence } from "framer-motion";

export default function ConnectPage() {
  const [isJoining, setIsJoining] = useState(false);

  return (
    <div className="relative w-full min-h-screen flex justify-center items-center overflow-hidden bg-gray-50 dark:bg-[#050505] transition-colors duration-300">
      {/* Ambient Background Effects */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40vw] h-[40vw] bg-blue-500/10 rounded-full blur-[100px] animate-pulse-slow" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40vw] h-[40vw] bg-purple-500/10 rounded-full blur-[100px] animate-pulse-slow animation-delay-2000" />
      </div>

      <div className="relative z-10 w-full max-w-lg p-4">
        <AnimatePresence mode="wait">
          {isJoining ? (
            <motion.div
              key="join"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3, ease: "easeOut" }}
            >
              <JoinBox setIsJoining={setIsJoining} />
            </motion.div>
          ) : (
            <motion.div
              key="connect"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ duration: 0.3, ease: "easeOut" }}
            >
              <ConnectionBox
                isJoining={isJoining}
                setIsJoining={setIsJoining}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
