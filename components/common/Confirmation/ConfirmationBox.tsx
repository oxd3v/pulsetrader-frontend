import React, { useState, useEffect } from "react";
import { FiAlertTriangle, FiInfo, FiX, FiLoader } from "react-icons/fi";
import { motion, AnimatePresence } from "framer-motion";

interface ConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void> | void;
  title: string;
  description: React.ReactNode;
  confirmText?: string;
  cancelText?: string;
  variant?: "default" | "destructive" | "warning";
  isLoading?: boolean; // Optional external loading state
}

export default function ConfirmationModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  confirmText = "Confirm",
  cancelText = "Cancel",
  variant = "default",
  isLoading: externalLoading = false,
}: ConfirmationModalProps) {
  const [isInternalLoading, setIsInternalLoading] = useState(false);

  // Reset internal loading state when modal opens/closes
  useEffect(() => {
    if (isOpen) setIsInternalLoading(false);
  }, [isOpen]);

  const handleConfirmClick = async (e: React.MouseEvent) => {
    e.stopPropagation();

    if (isInternalLoading || externalLoading) return;

    setIsInternalLoading(true);
    try {
      await onConfirm();
    } catch (error) {
      console.error(error);
    } finally {
      setIsInternalLoading(false);
    }
  };

  const isLoading = isInternalLoading || externalLoading;

  // Visual variants mapping
  const styles = {
    default: {
      icon: <FiInfo className="w-6 h-6 text-blue-500 dark:text-blue-400" />,
      bg: "bg-blue-100 dark:bg-blue-500/20",
      button: "bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-500/25 border border-transparent",
      iconRing: "ring-blue-50 dark:ring-blue-500/10",
    },
    destructive: {
      icon: <FiAlertTriangle className="w-6 h-6 text-red-500 dark:text-red-400" />,
      bg: "bg-red-100 dark:bg-red-500/20",
      button: "bg-red-600 hover:bg-red-700 text-white shadow-lg shadow-red-500/25 border border-transparent",
      iconRing: "ring-red-50 dark:ring-red-500/10",
    },
    warning: {
      icon: <FiAlertTriangle className="w-6 h-6 text-amber-500 dark:text-amber-400" />,
      bg: "bg-amber-100 dark:bg-amber-500/20",
      button: "bg-amber-500 hover:bg-amber-600 text-white shadow-lg shadow-amber-500/25 border border-transparent",
      iconRing: "ring-amber-50 dark:ring-amber-500/10",
    },
  }[variant];

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-0">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={!isLoading ? onClose : undefined}
          className="fixed inset-0 bg-black/40 dark:bg-black/70 backdrop-blur-sm transition-opacity"
        />

        {/* Modal Panel */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          className="relative w-full max-w-md overflow-hidden rounded-2xl bg-white dark:bg-[#13131a] border border-gray-200 dark:border-white/10 shadow-2xl z-10"
        >
          {/* Close Button */}
          {!isLoading && (
            <button
              onClick={onClose}
              className="absolute right-4 top-4 p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-white/5 rounded-full transition-colors"
            >
              <FiX className="w-5 h-5" />
            </button>
          )}

          <div className="p-6 sm:p-8">
            {/* Header Icon */}
            <div className="flex flex-col items-center text-center">
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                {title}
              </h3>

              {/* Dynamic Description Area */}
              <div className="w-full text-left mt-3">
                {description}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-end">
              <button
                type="button"
                disabled={isLoading}
                onClick={onClose}
                className="inline-flex w-full justify-center rounded-xl border border-gray-200 dark:border-white/10 bg-transparent px-5 py-3 text-sm font-bold text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/5 focus:outline-none focus:ring-2 focus:ring-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-all sm:w-auto"
              >
                {cancelText}
              </button>
              <button
                type="button"
                disabled={isLoading}
                onClick={handleConfirmClick}
                className={`inline-flex w-full justify-center items-center gap-2 rounded-xl px-6 py-3 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-70 disabled:cursor-not-allowed transition-all sm:w-auto ${styles.button}`}
              >
                {isLoading ? (
                  <>
                    <FiLoader className="w-4 h-4 animate-spin" />
                    <span>Processing...</span>
                  </>
                ) : (
                  confirmText
                )}
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}