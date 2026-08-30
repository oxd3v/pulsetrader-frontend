// @/lib/utils.ts
import toast from "react-hot-toast";
import { NOTIFICATION_CONFIG } from "@/constants/config/notification";

// ─── Helpers ──────────────────────────────────────────────────────────────

export const handleCopy = (text: string, label: string) => {
  navigator.clipboard.writeText(text);
  toast.success(label);
};

export function cn(...classes: (string | undefined | false | null)[]) {
  return classes.filter(Boolean).join(' ');
}

export function isValidSolWalletFormat(address: string) {
  const regex = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;
  return regex.test(address);
}

export const isValidEVMWalletAddress = (address: string) => {
  return /^0x[a-fA-F0-9]{40}$/.test(address);
};

// ─── Notification Core ──────────────────────────────────────────────────

/**
 * Show a toast with a message derived from a predefined key.
 * If the key is not found, fallback to "UNKNOWN_ERROR".
 */
export const notify = (
  type: "success" | "error",
  key: string,
  fallback?: string,
) => {
  const config = NOTIFICATION_CONFIG[key] || NOTIFICATION_CONFIG.UNKNOWN_ERROR;
  const message = config.message || fallback || key;
  if (type === "success") {
    toast.success(message);
  } else {
    toast.error(message);
  }
};

/**
 * Show a raw message without key lookup – only use when you have
 * a fully formed, user‑friendly string from the backend.
 * In most cases, prefer `notifyFromApiError`.
 */
export const notifyWithResponseError = (
  type: "success" | "error",
  message: string,
) => {
  if (type === "success") {
    toast.success(message);
  } else {
    toast.error(message);
  }
};

// ─── API Error Extractors ──────────────────────────────────────────────

/**
 * Extract the error key from any API error object.
 * Supports Axios, fetch, and plain objects.
 */
export const extractErrorKey = (err: any): string => {
  // 1. Direct message from response
  const message =
    err?.response?.data?.message ||
    err?.response?.data?.error ||
    err?.message ||
    err?.error ||
    err?.code ||
    "";


  // 2. If message is a known key, return it (trimmed)
  const trimmed = String(message).trim();
  if (trimmed && NOTIFICATION_CONFIG[trimmed]) {
    return trimmed;
  }

  // 3. If it's a string that might be a code (e.g., "USER_NOT_FOUND") but not in config, still return it
  if (trimmed) {
    return trimmed;
  }

  // 4. Fallback
  return "UNKNOWN_ERROR";
};

/**
 * Universal error handler:
 * - Extracts the error key using `extractErrorKey`
 * - Shows the corresponding user‑friendly toast
 * - Returns the key for further handling
 */
export const handleServerErrorToast = ({
  err,
  messageKey,
}: {
  err: any;
  messageKey?: string;
}) => {
  const key: any = extractErrorKey(err) || messageKey;
  console.log(key, err)
  notify("error", key);
  return key;
};

/**
 * Shortcut to show a toast from a plain error key (e.g., from API response)
 * Uses the config or fallback.
 */
export const notifyFromApiError = (message: string | undefined | null) => {
  const key = String(message || "").trim() || "UNKNOWN_ERROR";
  notify("error", key);
  return key;
};