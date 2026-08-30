import {
  FiAlertTriangle,
  FiCheckCircle,
  FiClock,
  FiLayers,
  FiShield,
  
} from "react-icons/fi";

import { CiWallet } from "react-icons/ci";

interface OrderPreparationPanelProps {
  variant: "spot" | "perp";
  strategyLabel: string;
  isConnected: boolean;
  estimatedOrderCount: number;
  selectedWalletCount: number;
  requiredWalletCount: number;
  areWalletsReady: boolean;
  orderName: string;
  isOrderNameValid: boolean;
  showFeeTokenSelector: boolean;
  feeTokenSymbol?: string | null;
  feeTokenReady: boolean;
  protocol?: string;
}

export default function OrderPreparationPanel({
  variant,
  strategyLabel,
  isConnected,
  estimatedOrderCount,
  selectedWalletCount,
  requiredWalletCount,
  areWalletsReady,
  orderName,
  isOrderNameValid,
  showFeeTokenSelector,
  feeTokenSymbol,
  feeTokenReady,
  protocol,
}: OrderPreparationPanelProps) {
  const feeLabel = showFeeTokenSelector
    ? feeTokenSymbol || "Fee token"
    : "Not required";

  const steps = [
    {
      label: "Connect wallet",
      done: isConnected,
      helper: "A connected wallet is required before order creation.",
      icon: CiWallet,
    },
    {
      label: "Name the strategy",
      done: Boolean(orderName.trim()) && isOrderNameValid,
      helper: "Use a unique name so you can find and manage the order later.",
      icon: FiShield,
    },
    {
      label: "Generate orders",
      done: estimatedOrderCount > 0,
      helper: `Current setup will create ${estimatedOrderCount || 0} order${
        estimatedOrderCount === 1 ? "" : "s"
      }.`,
      icon: FiLayers,
    },
    {
      label: "Assign ready wallets",
      done:
        requiredWalletCount > 0 &&
        selectedWalletCount >= requiredWalletCount &&
        areWalletsReady,
      helper:
        requiredWalletCount > 0
          ? `${selectedWalletCount}/${requiredWalletCount} wallet${
              requiredWalletCount === 1 ? "" : "s"
            } selected.`
          : "Wallet requirements appear after orders are generated.",
      icon: FiCheckCircle,
    },
    {
      label: "Confirm fee collection",
      done: showFeeTokenSelector ? feeTokenReady : true,
      helper: showFeeTokenSelector
        ? `Pulse fee will be reserved in ${feeLabel}.`
        : "Admin and diamond users skip manual fee-token selection.",
      icon: FiClock,
    },
  ];

  const readyCount = steps.filter((step) => step.done).length;
  const isReady = steps.every((step) => step.done);
  const cautionText =
    variant === "perp"
      ? `Perp orders also need funded ${protocol || "perp"} account balance, wallet gas, and an approved agent wallet before execution.`
      : "Spot orders reserve collateral, gas, and any Pulse fee amount before the bot can execute them.";

  return (
    <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 dark:border-gray-800 dark:bg-gray-900">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-base font-semibold text-gray-900 dark:text-white">
              Order Readiness
            </h3>
            <span
              className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-[11px] font-semibold ${
                isReady
                  ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300"
                  : "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300"
              }`}
            >
              {isReady ? (
                <FiCheckCircle className="h-3.5 w-3.5" />
              ) : (
                <FiAlertTriangle className="h-3.5 w-3.5" />
              )}
              {readyCount}/{steps.length} steps done
            </span>
          </div>
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
            Strategy: {strategyLabel}
          </p>
        </div>

        <div className="grid grid-cols-2 gap-2 text-xs md:min-w-[240px]">
          <div className="rounded-lg border border-gray-200 bg-white px-3 py-2 dark:border-white/5 dark:bg-black/20">
            <div className="font-semibold uppercase tracking-[0.14em] text-gray-500 dark:text-gray-400">
              Orders
            </div>
            <div className="mt-1 text-base font-black text-gray-900 dark:text-white">
              {estimatedOrderCount || 0}
            </div>
          </div>
          <div className="rounded-lg border border-gray-200 bg-white px-3 py-2 dark:border-white/5 dark:bg-black/20">
            <div className="font-semibold uppercase tracking-[0.14em] text-gray-500 dark:text-gray-400">
              Wallets
            </div>
            <div className="mt-1 text-base font-black text-gray-900 dark:text-white">
              {selectedWalletCount}/{requiredWalletCount || 0}
            </div>
          </div>
        </div>
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {steps.map((step) => {
          const Icon = step.icon;

          return (
            <div
              key={step.label}
              className={`rounded-xl border p-3 ${
                step.done
                  ? "border-emerald-200 bg-emerald-50 dark:border-emerald-500/20 dark:bg-emerald-500/10"
                  : "border-amber-200 bg-amber-50 dark:border-amber-500/20 dark:bg-amber-500/10"
              }`}
            >
              <div className="flex items-center gap-2">
                <Icon
                  className={`h-4 w-4 ${
                    step.done
                      ? "text-emerald-600 dark:text-emerald-300"
                      : "text-amber-600 dark:text-amber-300"
                  }`}
                />
                <div className="text-sm font-semibold text-gray-900 dark:text-white">
                  {step.label}
                </div>
              </div>
              <p className="mt-2 text-xs leading-5 text-gray-600 dark:text-gray-400">
                {step.helper}
              </p>
            </div>
          );
        })}
      </div>

      <div className="mt-3 rounded-xl border border-dashed border-gray-200 px-3 py-2 text-xs leading-5 text-gray-600 dark:border-white/10 dark:text-gray-400">
        {cautionText}
      </div>
    </div>
  );
}
