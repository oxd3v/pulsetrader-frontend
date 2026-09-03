import React, {
  useEffect,
  useState,
  useCallback,
  useMemo,
  useRef,
} from "react";
import { OrderType, OrderTokenType } from "@/type/order";
import { WalletType } from "@/type/common";
import { HiWallet } from "react-icons/hi2";
import {
  FiX,
  FiCheck,
  FiCopy,
  FiAlertCircle,
  FiChevronDown,
  FiChevronRight,
} from "react-icons/fi";
import { FaLock, FaCoins, FaGasPump } from "react-icons/fa";
import { MdOutlineRefresh } from "react-icons/md";
import { TbGridDots } from "react-icons/tb";
import toast from "react-hot-toast";
import InfoTooltip from "@/components/tradeBox/TradeBoxCommon/BoxTooltip";
import {
  formateAmountWithFixedDecimals,
  safeParseUnits,
  toBigIntBalance
} from "@/utility/handy";

import PerpAccountDeposit from "@/components/walletManager/modal/PerpDepositModal";
import { getPerpExchangeAvailableBalance } from "@/lib/oracle/perpAccountState";
import { getGasFee } from "@/lib/blockchain/gas";
import {
  getWalletBalance,
  getWalletTokenBalance,
} from "@/lib/blockchain/balance";
import {
  getOrderCosts,
  calculateExistingLockedFunds,
  normalizeProtocolKey,
} from "@/utility/orderUtility";
import { ZeroAddress } from "ethers";
import {
  SINGLE_PERPETUAL_STRATEGY,
  ORDER_FEE_COLLECTION_GAS_FEE,
} from "@/constants/common/order";

// ─── Types ──────────────────────────────────────────────────────────────
type Order = OrderType & { sl: number; _id?: string; wallet?: WalletType };

interface WalletData {
  config: WalletType;
  totalActiveOrders: number;
  lockedFundBalance: bigint;
  totalCollateralPending: bigint;
  balance: bigint; // native gas balance
  exchangeBalance: bigint; // perp collateral balance
  feeTokenPending: Record<string, bigint>;
  feeTokenBalances: Record<string, bigint>;
}

interface WalletEstimates {
  estAmount: bigint;
  estCost: bigint;
  estFeeAmount: bigint;
  estFeeByToken: Record<string, bigint>;
}

interface WalletSelectorProps {
  protocol: string;
  category: string;
  availableWallets: WalletType[];
  orders: Order[];
  gridsByWallet: Record<number, WalletType>;
  setGridsByWallet: (gridsByWallet: Record<number, WalletType>) => void;
  orderMode: 'Live' | 'Demo' | 'Testnet'
  areWalletsReady: boolean;
  setWalletsReady: (ready: boolean) => void;
  chainId: number;
  collateralToken: OrderTokenType;
  feeToken?: OrderTokenType | null;
  selectedStrategy: any;
  estOrders: Order[];
  user: any;
  perpBalancesByWallet?: Record<string, string | number | bigint>;
  onPerpTradeGateChange?: (canSubmit: boolean) => void;
  isFeeExempt: boolean;
}



const createEmptyWalletEstimate = (): WalletEstimates => ({
  estAmount: BigInt(0),
  estCost: BigInt(0),
  estFeeAmount: BigInt(0),
  estFeeByToken: {},
});

// ─── Fetch perp balance from exchange ──────────────────────────────────
const getPerpAccountBalance = async ({
  wallet,
  protocol,
  collateralToken,
  overrides,
  isMainnet = true
}: {
  wallet: WalletType;
  protocol: string;
  collateralToken: OrderTokenType;
  overrides?: Record<string, string | number | bigint>;
  isMainnet: boolean;
}) => {
  const dexKey = normalizeProtocolKey(protocol);

  try {
    const raw: number | undefined = await getPerpExchangeAvailableBalance(
      wallet.address,
      dexKey,
      isMainnet
    );
    if (raw !== undefined && raw !== null) {
      return safeParseUnits(String(Number(raw)), collateralToken.decimals);
    }
  } catch {
    // fallback
  }

  if (overrides) {
    const byId = overrides[wallet._id];
    if (byId !== undefined && byId !== null) {
      return toBigIntBalance(byId, collateralToken.decimals);
    }
    const addressKey = wallet.address?.toLowerCase?.() ?? wallet.address;
    const byAddress = overrides[addressKey] ?? overrides[wallet.address];
    if (byAddress !== undefined && byAddress !== null) {
      return toBigIntBalance(byAddress, collateralToken.decimals);
    }
  }

  const walletAny = wallet as any;
  const rawBalance =
    walletAny?.perpBalances?.[dexKey] ??
    walletAny?.perpBalance?.[dexKey] ??
    walletAny?.dexBalances?.[dexKey] ??
    walletAny?.dexBalance?.[dexKey] ??
    0;
  return toBigIntBalance(rawBalance, collateralToken.decimals);
};

// ─── WalletCard (no agent approval) ────────────────────────────────────
interface WalletCardProps {
  wallet: WalletType;
  walletData?: WalletData;
  isLoading?: boolean;
  isSelected: boolean;
  onSelect?: (wallet: WalletType) => void | Promise<void>;
  onRemove: (wallet: WalletType) => void;
  onDeposit?: (wallet: WalletType) => void;
  protocol: string;
  collateralToken: OrderTokenType;
  feeToken?: OrderTokenType | null;
  estOrders: Order[];
  selectedGrids: number[];
  selectGrid?: (wallet: WalletType, order: Order) => void;
  chainId: number;
  estimates?: WalletEstimates;
}

const WalletCard = React.memo(
  ({
    wallet,
    walletData,
    isLoading,
    isSelected,
    onSelect,
    onRemove,
    onDeposit,
    protocol,
    collateralToken,
    feeToken,
    estOrders,
    selectedGrids,
    selectGrid,
    chainId,
    estimates = createEmptyWalletEstimate(),
  }: WalletCardProps) => {
    const [isExpanded, setIsExpanded] = useState(false);

    // ── Balance validations ──────────────────────────────────────────
    const {
      hasInsufficientBalance,
      hasInsufficientTokens,
      hasInsufficientFeeToken,
      selectedFeeTokenBalance,
      selectedFeeTokenLocked,
      showFeeTokenCard,
      feeTokenApplied,
    } = useMemo(() => {
      if (!walletData) {
        return {
          hasInsufficientBalance: false,
          hasInsufficientTokens: false,
          hasInsufficientFeeToken: false,
          selectedFeeTokenBalance: BigInt(0),
          selectedFeeTokenLocked: BigInt(0),
          showFeeTokenCard: false,
          feeTokenApplied: false,
        };
      }


      const availableNative = walletData.balance - walletData.lockedFundBalance;
      const availableCollateral =
        walletData.exchangeBalance - walletData.totalCollateralPending;
      const feeTokenAddress = feeToken?.address?.toLowerCase();
      const showFeeTokenCard =
        Boolean(feeTokenAddress) &&
        feeTokenAddress !== ZeroAddress.toLowerCase();
      const selectedFeeTokenBalance =
        (feeTokenAddress && walletData.feeTokenBalances[feeTokenAddress]) ||
        BigInt(0);
      const selectedFeeTokenLocked =
        (feeTokenAddress && walletData.feeTokenPending[feeTokenAddress]) ||
        BigInt(0);

      const feeTokenApplied =
        Object.keys(estimates.estFeeByToken || {}).length > 0 ||
        (estimates.estFeeAmount || BigInt(0)) > BigInt(0);
      let requiredNative = BigInt(0);
      if (feeTokenApplied) {
        requiredNative =
          (estimates.estCost || BigInt(0)) +
          BigInt(ORDER_FEE_COLLECTION_GAS_FEE[chainId] || 0);
      }

      const hasInsufficientBalance =
        feeTokenApplied && availableNative < requiredNative;
      const hasInsufficientTokens =
        availableCollateral < (estimates.estAmount || BigInt(0));
      const hasInsufficientFeeToken =
        showFeeTokenCard &&
        selectedFeeTokenBalance - selectedFeeTokenLocked <
        (estimates.estFeeAmount || BigInt(0));

      return {
        hasInsufficientBalance,
        hasInsufficientTokens,
        hasInsufficientFeeToken,
        selectedFeeTokenBalance,
        selectedFeeTokenLocked,
        showFeeTokenCard,
        feeTokenApplied,
      };
    }, [walletData, estimates, feeToken, chainId]);

    // ─── Handlers ────────────────────────────────────────────────────
    const handleSelect = useCallback(async () => {
      if (onSelect) await onSelect(wallet);
    }, [onSelect, wallet]);

    const handleRemove = useCallback(() => onRemove(wallet), [onRemove, wallet]);
    const handleDeposit = useCallback(
      (e: React.MouseEvent) => {
        e.stopPropagation();
        onDeposit?.(wallet);
      },
      [onDeposit, wallet]
    );
    const handleCopy = useCallback(
      (e: React.MouseEvent) => {
        e.stopPropagation();
        navigator.clipboard.writeText(wallet.address);
        toast.success("Address copied!");
      },
      [wallet.address]
    );
    const handleToggleExpand = useCallback(
      (e: React.MouseEvent) => {
        e.stopPropagation();
        setIsExpanded((prev) => !prev);
      },
      []
    );

    const formatBalance = useCallback(
      (balance: bigint, decimals: number) =>
        formateAmountWithFixedDecimals(balance, decimals, 6),
      []
    );

    // ─── Required Native Gas (for display) ────────────────────────────
    const requiredNative = useMemo(() => {
      const feeTokenApplied =
        Object.keys(estimates.estFeeByToken || {}).length > 0 ||
        (estimates.estFeeAmount || BigInt(0)) > BigInt(0);
      let required = estimates.estCost || BigInt(0);
      if (feeTokenApplied) {
        required += BigInt(ORDER_FEE_COLLECTION_GAS_FEE[chainId] || 0);
      }
      return required;
    }, [estimates, chainId]);

    // ─── Loading state ──────────────────────────────────────────────
    if (isLoading) {
      return (
        <div className="rounded-lg border border-gray-200 dark:border-gray-700 p-3 animate-pulse">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-gray-200 dark:bg-gray-700 rounded" />
            <div className="flex-1">
              <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-24 mb-2" />
              <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-16" />
            </div>
          </div>
        </div>
      );
    }

    // ─── Minimal view – data not loaded ─────────────────────────────
    if (!walletData) {
      return (
        <div
          className={`group relative rounded-xl border backdrop-blur-sm transition-all duration-300 overflow-hidden ${isSelected
            ? "border-blue-500/60 bg-gradient-to-br from-blue-50/50 to-indigo-50/30 dark:from-blue-900/20 dark:to-indigo-900/10 shadow-sm shadow-blue-500/10"
            : "border-gray-200/80 dark:border-gray-700/80 bg-white/50 dark:bg-gray-800/50 hover:border-blue-400 hover:shadow-md hover:-translate-y-0.5"
            }`}
        >
          <div
            className="flex items-center justify-between p-3 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800"
            onClick={!isSelected ? handleSelect : undefined}
          >
            <div className="flex items-center gap-3 min-w-0 flex-1">
              <div
                className={`p-1.5 rounded ${isSelected
                  ? "bg-blue-100 dark:bg-blue-900"
                  : "bg-gray-100 dark:bg-gray-800"
                  }`}
              >
                <HiWallet
                  className={`w-4 h-4 ${isSelected
                    ? "text-blue-600 dark:text-blue-300"
                    : "text-gray-600 dark:text-gray-300"
                    }`}
                />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                    {wallet.address.slice(0, 6)}...{wallet.address.slice(-4)}
                  </span>
                  <button
                    onClick={handleCopy}
                    className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
                  >
                    <FiCopy className="w-3 h-3 text-gray-500 dark:text-gray-400" />
                  </button>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 flex-wrap justify-end">
              <button
                onClick={handleDeposit}
                className="px-2 py-1 text-[10px] font-semibold uppercase tracking-wide rounded-md bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-900/30 dark:text-emerald-300 dark:hover:bg-emerald-900/50 transition-colors"
              >
                Deposit
              </button>
              {!isSelected && (
                <button
                  onClick={handleSelect}
                  className="p-1.5 hover:bg-blue-100 dark:hover:bg-blue-900/30 rounded transition-colors"
                >
                  <FiCheck className="w-4 h-4 text-blue-500" />
                </button>
              )}
            </div>
          </div>
        </div>
      );
    }

    // ─── Full expanded view ──────────────────────────────────────────
    const hasWarning =
      isSelected &&
      (hasInsufficientBalance || hasInsufficientTokens || hasInsufficientFeeToken);

    return (
      <div
        className={`group relative rounded-xl border backdrop-blur-sm transition-all duration-300 overflow-hidden ${isSelected
          ? "border-blue-500/60 bg-gradient-to-br from-blue-50/50 to-indigo-50/30 dark:from-blue-900/20 dark:to-indigo-900/10 shadow-sm shadow-blue-500/10"
          : "border-gray-200/80 dark:border-gray-700/80 bg-white/50 dark:bg-gray-800/50 hover:border-blue-400 hover:shadow-md hover:shadow-blue-500/5 hover:-translate-y-0.5"
          } ${hasWarning ? "border-red-400/60 dark:border-red-500/60 bg-gradient-to-br from-red-50/50 to-orange-50/30 dark:from-red-900/20 dark:to-orange-900/10 shadow-red-500/10" : ""}`}
      >
        {/* Header */}
        <div
          className={`flex items-center justify-between p-3 cursor-pointer ${!isSelected && "hover:bg-gray-50 dark:hover:bg-gray-800"
            }`}
          onClick={!isSelected ? handleSelect : undefined}
        >
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <div
              className={`p-1.5 rounded ${isSelected
                ? "bg-blue-100 dark:bg-blue-900"
                : "bg-gray-100 dark:bg-gray-800"
                }`}
            >
              <HiWallet
                className={`w-4 h-4 ${isSelected
                  ? "text-blue-600 dark:text-blue-300"
                  : "text-gray-600 dark:text-gray-300"
                  }`}
              />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="font-mono text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                  {wallet.address.slice(0, 6)}...{wallet.address.slice(-4)}
                </span>
                <button
                  onClick={handleCopy}
                  className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
                >
                  <FiCopy className="w-3 h-3 text-gray-500 dark:text-gray-400" />
                </button>
              </div>
              {walletData.totalActiveOrders > 0 && (
                <span className="inline-block px-1.5 py-0.5 text-xs rounded-full bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200 mt-1">
                  {walletData.totalActiveOrders} active
                </span>
              )}
              <div className="hidden 4xl:block flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] mt-1.5">
                <div className="flex items-center gap-1 text-gray-500 dark:text-gray-400">
                  <FaCoins className="w-3 h-3" />
                  <span>
                    Balance: {formatBalance(walletData.exchangeBalance, collateralToken.decimals)} {collateralToken.symbol}
                  </span>
                </div>
                {walletData.totalCollateralPending > BigInt(0) && (
                  <div className="flex items-center gap-1 text-red-500 dark:text-red-400">
                    <FaLock className="w-3 h-3" />
                    <span>
                      Locked: {formatBalance(walletData.totalCollateralPending, collateralToken.decimals)} {collateralToken.symbol}
                    </span>
                  </div>
                )}
                {estimates.estAmount > BigInt(0) && (
                  <div className="flex items-center gap-1 text-blue-500 dark:text-blue-400">
                    <TbGridDots className="w-3 h-3" />
                    <span>
                      Est. Margin: {formatBalance(estimates.estAmount, collateralToken.decimals)} {collateralToken.symbol}
                    </span>
                  </div>
                )}
                {feeToken && estimates.estFeeAmount > BigInt(0) && (
                  <div className="flex items-center gap-1 text-purple-500 dark:text-purple-400">
                    <TbGridDots className="w-3 h-3" />
                    <span>
                      Est. Fee: {formatBalance(estimates.estFeeAmount, feeToken.decimals)} {feeToken.symbol}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap justify-end">
            <button
              onClick={handleDeposit}
              className="px-2 py-1 text-[10px] font-semibold uppercase tracking-wide rounded-md bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-900/30 dark:text-emerald-300 dark:hover:bg-emerald-900/50 transition-colors"
            >
              Deposit
            </button>
            {isSelected ? (
              <>
                <button
                  onClick={handleRemove}
                  className="p-1.5 hover:bg-red-50 dark:hover:bg-red-900/30 rounded transition-colors"
                >
                  <FiX className="w-4 h-4 text-red-500" />
                </button>
                <button
                  onClick={handleToggleExpand}
                  className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
                >
                  {isExpanded ? (
                    <FiChevronDown className="w-4 h-4 text-gray-500" />
                  ) : (
                    <FiChevronRight className="w-4 h-4 text-gray-500" />
                  )}
                </button>
              </>
            ) : (
              <button
                onClick={handleSelect}
                className="p-1.5 hover:bg-blue-100 dark:hover:bg-blue-900/30 rounded transition-colors"
              >
                <FiCheck className="w-4 h-4 text-blue-500" />
              </button>
            )}
          </div>
        </div>

        {/* Expanded Details (only when selected) */}
        {isSelected && isExpanded && (
          <div className="px-3 pb-3 border-t border-gray-200 dark:border-gray-700 pt-3">
            <div className="grid grid-cols-1 2xl:grid-cols-2 gap-3 mb-3">
              {/* Collateral card */}
              <div className="p-3.5 bg-white/80 dark:bg-gray-800/80 rounded-xl border border-gray-200/80 dark:border-gray-700/80 shadow-sm">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <img
                      src={collateralToken.imageUrl}
                      className="w-5 h-5 rounded-full"
                      alt={collateralToken.symbol}
                    />
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      {collateralToken.symbol}
                    </span>
                  </div>
                  {hasInsufficientBalance && (
                    <span className="text-[10px] text-red-500 font-bold flex items-center gap-1 px-1.5 py-0.5 bg-red-50 dark:bg-red-900/30 rounded">
                      <FiAlertCircle /> NO GAS
                    </span>
                  )}
                </div>
                <div className="space-y-2">
                  <div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">Account Balance</div>
                    <div className="text-sm font-semibold text-gray-900 dark:text-white">
                      {formatBalance(walletData.exchangeBalance, collateralToken.decimals)}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1">
                      <FaLock className="w-3 h-3 text-red-400" /> Locked
                    </div>
                    <div className="text-sm font-semibold text-red-600 dark:text-red-400">
                      {formatBalance(walletData.totalCollateralPending, collateralToken.decimals)}
                    </div>
                  </div>
                  <div
                    className={`p-2.5 rounded-lg transition-all ${hasInsufficientTokens
                      ? "bg-red-50/80 dark:bg-red-900/20 border border-red-200/80 dark:border-red-800/80"
                      : "bg-blue-50/80 dark:bg-blue-900/20 border border-blue-200/80 dark:border-blue-800/80"
                      }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-medium text-gray-700 dark:text-gray-300">
                        Est. Margin (New)
                      </span>
                      <InfoTooltip
                        id="Est_collateralAmount"
                        content="Estimated collateral required from perp account."
                      />
                    </div>
                    <div className="text-sm font-semibold text-gray-900 dark:text-white">
                      {formatBalance(estimates.estAmount, collateralToken.decimals)}
                    </div>
                    {hasInsufficientTokens && (
                      <div className="flex items-center gap-1 text-xs text-red-500 mt-1">
                        <FiAlertCircle className="w-3 h-3" />
                        <span>Insufficient collateral</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Fee token card */}
              {showFeeTokenCard && feeToken && (
                <div className="p-3.5 bg-white/80 dark:bg-gray-800/80 rounded-xl border border-gray-200/80 dark:border-gray-700/80 shadow-sm">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <img
                        src={feeToken.imageUrl}
                        className="w-5 h-5 rounded-full"
                        alt={feeToken.symbol}
                      />
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        {feeToken.symbol}
                      </span>
                    </div>
                    {hasInsufficientFeeToken && (
                      <span className="text-[10px] text-red-500 font-bold flex items-center gap-1 px-1.5 py-0.5 bg-red-50 dark:bg-red-900/30 rounded">
                        <FiAlertCircle /> INSUFFICIENT
                      </span>
                    )}
                  </div>
                  <div className="space-y-2">
                    <div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">Wallet Balance</div>
                      <div className="text-sm font-semibold text-gray-900 dark:text-white">
                        {formatBalance(selectedFeeTokenBalance, feeToken.decimals)}
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1">
                        <FaLock className="w-3 h-3 text-red-400" /> Locked
                      </div>
                      <div className="text-sm font-semibold text-red-600 dark:text-red-400">
                        {formatBalance(selectedFeeTokenLocked, feeToken.decimals)}
                      </div>
                    </div>
                    {estimates.estFeeAmount > BigInt(0) && (
                      <div
                        className={`p-2.5 rounded-lg transition-all ${hasInsufficientFeeToken
                          ? "bg-red-50/80 dark:bg-red-900/20 border border-red-200/80 dark:border-red-800/80"
                          : "bg-blue-50/80 dark:bg-blue-900/20 border border-blue-200/80 dark:border-blue-800/80"
                          }`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs font-medium text-gray-700 dark:text-gray-300">
                            Est. Fee Token
                          </span>
                          <InfoTooltip
                            id="Est_feeTokenAmount"
                            content="Reserved Pulse fee amount for pending and active perp orders."
                          />
                        </div>
                        <div className="text-sm font-semibold text-gray-900 dark:text-white">
                          {formatBalance(estimates.estFeeAmount, feeToken.decimals)}
                        </div>
                        {hasInsufficientFeeToken && (
                          <div className="flex items-center gap-1 text-xs text-red-500 mt-1">
                            <FiAlertCircle className="w-3 h-3" />
                            <span>Insufficient fee token</span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Network Fee Card */}
              {
                showFeeTokenCard && feeToken && (
                  <div className="p-3.5 bg-white/80 dark:bg-gray-800/80 rounded-xl border border-gray-200/80 dark:border-gray-700/80 shadow-sm">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <FaGasPump className="w-4 h-4 text-gray-500" />
                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                          Network Fee
                        </span>
                      </div>
                      {hasInsufficientBalance && (
                        <span className="text-[10px] text-red-500 font-bold flex items-center gap-1 px-1.5 py-0.5 bg-red-50 dark:bg-red-900/30 rounded">
                          <FiAlertCircle /> INSUFFICIENT
                        </span>
                      )}
                    </div>
                    <div className="space-y-1.5">
                      {feeTokenApplied && (
                        <div className="flex justify-between text-xs">
                          <span className="text-gray-500 dark:text-gray-400">Native Balance</span>
                          <span className="font-mono font-medium text-gray-900 dark:text-white">
                            {formatBalance(walletData.balance, 18)} ETH
                          </span>
                        </div>
                      )}
                      {feeTokenApplied && (
                        <div className="flex justify-between text-xs">
                          <span className="text-gray-500 dark:text-gray-400">Locked Balance</span>
                          <span className="font-mono font-medium text-gray-900 dark:text-white">
                            {formatBalance(walletData.lockedFundBalance, 18)} ETH
                          </span>
                        </div>
                      )}
                      {feeTokenApplied && (
                        <div className="flex justify-between text-xs">
                          <span className="text-gray-500 dark:text-gray-400">Fee Collection Gas</span>
                          <span className="font-mono font-medium text-gray-900 dark:text-white">
                            {formatBalance(BigInt(ORDER_FEE_COLLECTION_GAS_FEE[chainId] || 0), 18)} ETH
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                )
              }
            </div>

            {/* Grid selection */}
            {estOrders.length > 0 && selectedGrids.length > 0 && (
              <div className="mt-3">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <TbGridDots className="w-4 h-4 text-gray-500" />
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      Selected Grids
                    </span>
                  </div>
                  <span className="text-xs text-gray-500">
                    {selectedGrids.length}/{estOrders.length}
                  </span>
                </div>
                <div className="flex flex-wrap gap-1">
                  {estOrders.map((order, index) => (
                    <button
                      key={order._id || index}
                      onClick={(e) => {
                        e.stopPropagation();
                        if (selectGrid && !selectedGrids.includes(order.sl)) {
                          selectGrid(wallet, order);
                        }
                      }}
                      className={`
                        px-2 py-1 text-xs rounded-lg transition-all font-medium border
                        ${selectedGrids.includes(order.sl)
                          ? "bg-blue-500 text-white shadow-md shadow-blue-500/20 border-blue-500"
                          : "bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 hover:shadow-sm"
                        }
                      `}
                    >
                      Grid #{order.sl}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Warning indicator when collapsed */}
        {hasWarning && !isExpanded && (
          <div className="px-3 pb-3 border-t border-gray-200 dark:border-gray-700 pt-2">
            <div className="flex items-center gap-2 text-xs text-red-500">
              <FiAlertCircle className="w-3 h-3 flex-shrink-0" />
              <span className="truncate">
                Insufficient {hasInsufficientBalance ? "gas" : ""}
                {hasInsufficientBalance && hasInsufficientTokens ? " and " : ""}
                {hasInsufficientTokens ? "collateral" : ""}
                {(hasInsufficientBalance || hasInsufficientTokens) &&
                  hasInsufficientFeeToken
                  ? " and "
                  : ""}
                {hasInsufficientFeeToken ? "fee token" : ""}
              </span>
            </div>
          </div>
        )}
      </div>
    );
  }
);

WalletCard.displayName = "WalletCard";

// ─── Main WalletSelector ──────────────────────────────────────────────
const WalletSelector = ({
  protocol,
  category,
  availableWallets,
  orders,
  gridsByWallet,
  setGridsByWallet,
  orderMode,
  areWalletsReady,
  setWalletsReady,
  chainId,
  collateralToken,
  feeToken,
  selectedStrategy,
  estOrders,
  user,
  perpBalancesByWallet,
  isFeeExempt,
  onPerpTradeGateChange,
}: WalletSelectorProps) => {
  const [showWalletSelector, setShowWalletSelector] = useState(false);
  const [selectedWallets, setSelectedWallets] = useState<WalletType[]>([]);
  const [depositWallet, setDepositWallet] = useState<WalletType | null>(null);
  const [isDepositOpen, setIsDepositOpen] = useState(false);
  const [walletDataMap, setWalletDataMap] = useState<Record<string, WalletData>>({});
  const [loadingWallets, setLoadingWallets] = useState<Set<string>>(new Set());
  const [gasFee, setGasFee] = useState<bigint>(BigInt(0))
  const isMounted = useRef(true);
  const fetchGenByAddressRef = useRef<Record<string, number>>({});
  const selectedFeeTokenAddress = feeToken?.address?.toLowerCase();

  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
    };
  }, []);


  const handleOpenDeposit = useCallback((wallet: WalletType) => {
    setDepositWallet(wallet);
    setIsDepositOpen(true);
  }, []);

  const handleCloseDeposit = useCallback(() => {
    setIsDepositOpen(false);
    setDepositWallet(null);
  }, []);

  const isSingleWalletStrategy = useMemo(
    () => SINGLE_PERPETUAL_STRATEGY.includes(selectedStrategy?.id),
    [selectedStrategy?.id]
  );

  const filteredAvailableWallets = useMemo(
    () =>
      availableWallets?.filter((wallet: any) => !wallet.isPerpAgentWallet) || [],
    [availableWallets]
  );

  const ordersByWallet = useMemo(() => {
    const map = new Map<string, OrderType[]>();
    orders.forEach((order) => {
      if (order.wallet?._id) {
        const walletId = order.wallet._id.toString();
        if (!map.has(walletId)) map.set(walletId, []);
        map.get(walletId)!.push(order);
      }
    });
    return map;
  }, [orders]);

  // ✅ CORRECTED fetchSingleWalletData
  const fetchSingleWalletData = useCallback(
    async (
      wallet: WalletType,
      force = false
    ): Promise<WalletData | undefined> => {
      const address = wallet.address.toLowerCase();
      const myGen =
        (fetchGenByAddressRef.current[address] =
          (fetchGenByAddressRef.current[address] ?? 0) + 1);

      if (!force && walletDataMap[address]) {
        return walletDataMap[address];
      }

      setLoadingWallets((prev) => new Set(prev).add(wallet._id));

      try {
        const walletOrders = ordersByWallet.get(wallet._id) || [];

        // ✅ AWAIT the locked funds calculation
        const walletLockedFunds = await calculateExistingLockedFunds({
          orders: walletOrders,
          walletId: wallet._id,
          collateralTokenAddress: collateralToken.address,
          gasFee,
          orderMode,
          user,
          treatCollateralTokenAsWalletBalance: false,
          isFeeExempt
        });

        // Track which fee tokens we need balances for
        const trackedFeeTokens = new Map<
          string,
          { address: string; decimals: number }
        >();
        const addTrackedFeeToken = (
          tokenAddress?: string,
          tokenDecimals?: number
        ) => {
          if (!tokenAddress || tokenDecimals == null) return;
          const normalizedAddress = tokenAddress.toLowerCase();
          if (normalizedAddress === ZeroAddress.toLowerCase()) return;
          trackedFeeTokens.set(normalizedAddress, {
            address: tokenAddress,
            decimals: tokenDecimals,
          });
        };
        addTrackedFeeToken(feeToken?.address, feeToken?.decimals);
        walletOrders.forEach((order) => {
          addTrackedFeeToken(
            order.orderAsset?.feeToken?.address,
            order.orderAsset?.feeToken?.decimals
          );
        });

        const [balance, exchangeBalance, trackedFeeTokenBalances] =
          await Promise.all([
            getWalletBalance({ walletAddress: wallet.address, chainId }),
            getPerpAccountBalance({
              wallet,
              protocol,
              collateralToken,
              overrides: perpBalancesByWallet,
              isMainnet: orderMode === 'Live'
            }),
            Promise.all(
              Array.from(trackedFeeTokens.entries()).map(
                async ([normalizedAddress, tokenConfig]) => [
                  normalizedAddress,
                  await getWalletTokenBalance({
                    walletAddress: wallet.address,
                    tokenAddress: tokenConfig.address,
                    chainId,
                  }),
                  tokenConfig.decimals,
                ]
              )
            ),
          ]);

        if (!isMounted.current || fetchGenByAddressRef.current[address] !== myGen)
          return undefined;

        const feeTokenBalances = trackedFeeTokenBalances.reduce<
          Record<string, bigint>
        >((acc, [normalizedAddress, trackedBalance, decimals]) => {
          acc[normalizedAddress as any] = toBigIntBalance(trackedBalance, decimals as any);
          return acc;
        }, {});

        // ✅ Use walletLockedFunds.feeTokenPending directly
        const newData: WalletData = {
          config: wallet,
          totalActiveOrders: walletLockedFunds.totalActiveOrders,
          lockedFundBalance: walletLockedFunds.lockedFundBalance,
          totalCollateralPending:
            walletLockedFunds.dexCollateralPending[normalizeProtocolKey(protocol)] ||
            BigInt(0),
          feeTokenPending: walletLockedFunds.feeTokenPending,
          balance:
            typeof balance === "string"
              ? safeParseUnits(balance, 18)
              : BigInt(balance),
          exchangeBalance:
            typeof exchangeBalance === "bigint"
              ? exchangeBalance
              : BigInt(exchangeBalance),
          feeTokenBalances,
        };

        if (fetchGenByAddressRef.current[address] !== myGen) return undefined;

        setWalletDataMap((prev) => ({
          ...prev,
          [address]: newData,
        }));

        return newData;
      } catch (error) {
        if (isMounted.current && force) {
          toast.error(`Failed to load data for ${wallet.address.slice(0, 6)}...`);
        }
        return undefined;
      } finally {
        if (isMounted.current) {
          setLoadingWallets((prev) => {
            const next = new Set(prev);
            next.delete(wallet._id);
            return next;
          });
        }
      }
    },
    [
      ordersByWallet,
      collateralToken,
      chainId,
      user,
      walletDataMap,
      protocol,
      perpBalancesByWallet,
      feeToken,
      gasFee,
      orderMode
    ]
  );

  // ─── Estimates ──────────────────────────────────────────────────────
  const estimatesByWallet = useMemo(() => {
    const estimates: Record<string, WalletEstimates> = {};

    Object.keys(walletDataMap).forEach((address) => {
      estimates[address] = createEmptyWalletEstimate();
    });
    selectedWallets.forEach((w) => {
      const addr = w.address.toLowerCase();
      if (!estimates[addr]) estimates[addr] = createEmptyWalletEstimate();
    });

    Object.entries(gridsByWallet).forEach(([gridSl, walletConfig]) => {
      const order = estOrders.find((o) => o.sl === Number(gridSl));
      if (order && walletConfig && walletConfig.address) {
        const address = walletConfig.address.toLowerCase();
        if (!estimates[address]) estimates[address] = createEmptyWalletEstimate();
        const costs = getOrderCosts({
          order,
          collateralTokenAddress: collateralToken.address,
          gasFee,
          user,
          treatCollateralTokenAsWalletBalance: false,
          isFeeExempt
        });
        estimates[address].estAmount += costs.dexOrderAmount;

        if (costs.feeTokenAmount > BigInt(0) && costs.feeTokenAddress) {
          estimates[address].estFeeByToken[costs.feeTokenAddress] =
            (estimates[address].estFeeByToken[costs.feeTokenAddress] || BigInt(0)) +
            costs.feeTokenAmount;
          if (selectedFeeTokenAddress === costs.feeTokenAddress) {
            estimates[address].estFeeAmount += costs.feeTokenAmount;
          }
        }
      }
    });

    return estimates;
  }, [gridsByWallet, estOrders, walletDataMap, selectedWallets, gasFee, collateralToken.address, user, selectedFeeTokenAddress]);

  // ─── Readiness Check (no agent approval) ──────────────────────────
  useEffect(() => {
    if (!selectedWallets.length || !estOrders.length) {
      setWalletsReady(false);
      return;
    }

    const isReady = selectedWallets.every((wallet) => {
      if (orderMode === 'Demo') return true;
      const address = wallet.address.toLowerCase();
      const data = walletDataMap[address];
      if (!data) return false;

      const estimate = estimatesByWallet[address];
      if (!estimate) return false;

      const availableNative = data.balance - data.lockedFundBalance;
      const availableCollateral = data.exchangeBalance - data.totalCollateralPending;

      const hasFeeTokenLiquidity = Object.entries(
        estimate.estFeeByToken || {}
      ).every(([tokenAddress, feeAmount]) => {
        const availableFeeToken =
          (data.feeTokenBalances[tokenAddress] || BigInt(0)) -
          (data.feeTokenPending[tokenAddress] || BigInt(0));
        return availableFeeToken >= feeAmount;
      });

      const feeTokenApplied = Object.keys(estimate.estFeeByToken || {}).length > 0;
      let requiredNative = BigInt(0);
      if (feeTokenApplied) {
        requiredNative =
          (estimate.estCost || BigInt(0)) +
          BigInt(ORDER_FEE_COLLECTION_GAS_FEE[chainId] || 0);
      }

      return (
        (!feeTokenApplied || availableNative >= requiredNative) &&
        availableCollateral >= estimate.estAmount &&
        hasFeeTokenLiquidity
      );
    });

    setWalletsReady(isReady);
  }, [selectedWallets, walletDataMap, estimatesByWallet, estOrders.length, setWalletsReady, chainId]);

  // ─── onPerpTradeGateChange ──────────────────────────────────────
  useEffect(() => {
    if (!onPerpTradeGateChange) return;
    const assigned = Object.values(gridsByWallet).filter(Boolean) as WalletType[];
    if (assigned.length === 0) {
      onPerpTradeGateChange(false);
      return;
    }
    if (assigned.length > 0 && orderMode == 'Demo') {
      onPerpTradeGateChange(true);
      return;
    }
    const uniq = Array.from(new Map(assigned.map((w) => [w._id, w])).values());
    const ok = uniq.every((w) => {
      const addr = w.address.toLowerCase();
      const data = walletDataMap[addr];
      if (!data) return false;
      return data.exchangeBalance > BigInt(0);
    });
    onPerpTradeGateChange(ok);
  }, [gridsByWallet, walletDataMap, onPerpTradeGateChange, orderMode]);

  useEffect(() => {
    const fetchGasFee = async () => {
      try {
        const fee = await getGasFee(chainId);
        setGasFee(fee);
      } catch (error) {
        setGasFee(BigInt(0));
      }
    };
    fetchGasFee();
  }, [category, chainId, protocol]);

  // ─── Distribution ──────────────────────────────────────────────────
  const distributeOrders = useCallback(
    (wallets: WalletType[]) => {
      if (!wallets.length || !estOrders.length) return;
      const newGridsByWallet: Record<number, WalletType> = {};
      if (isSingleWalletStrategy && wallets.length > 0) {
        estOrders.forEach((order) => {
          newGridsByWallet[order.sl] = wallets[0];
        });
      } else {
        estOrders.forEach((order, index) => {
          const walletIndex = index % wallets.length;
          newGridsByWallet[order.sl] = wallets[walletIndex];
        });
      }
      setGridsByWallet(newGridsByWallet);
    },
    [estOrders, isSingleWalletStrategy, setGridsByWallet]
  );

  // ─── Selection ─────────────────────────────────────────────────────
  const handleSelectWallet = useCallback(
    async (wallet: WalletType) => {
      const address = wallet.address.toLowerCase();
      if (loadingWallets.has(wallet._id)) {
        toast.loading("Wallet data is being fetched...", { id: "wallet-loading" });
        return;
      }
      let data: any = walletDataMap[address];
      if (!data) {
        data = await fetchSingleWalletData(wallet);
      }
      if (!data) {
        toast.error("Failed to load wallet data. Please try again.");
        return;
      }

      if (isSingleWalletStrategy && selectedWallets.length >= 1) {
        toast.error("Only one wallet can be selected for this strategy");
        return;
      }
      if (estOrders.length <= selectedWallets.length) {
        toast.error("Already have enough wallets for the number of orders");
        return;
      }

      const newSelected = [...selectedWallets, wallet];
      setSelectedWallets(newSelected);
      distributeOrders(newSelected);
    },
    [
      walletDataMap,
      loadingWallets,
      fetchSingleWalletData,
      orderMode,
      isSingleWalletStrategy,
      selectedWallets,
      estOrders.length,
      distributeOrders,
    ]
  );

  const handleRemoveWallet = useCallback(
    (wallet: WalletType) => {
      const newSelected = selectedWallets.filter((w) => w._id !== wallet._id);
      setSelectedWallets(newSelected);
      const newGrids = { ...gridsByWallet };
      Object.keys(newGrids).forEach((key) => {
        if (newGrids[Number(key)]?._id === wallet._id) {
          delete newGrids[Number(key)];
        }
      });
      setGridsByWallet(newGrids);
      distributeOrders(newSelected);
    },
    [selectedWallets, gridsByWallet, distributeOrders, setGridsByWallet]
  );

  const handleGridForWallet = useCallback(
    (wallet: WalletType, order: Order) => {
      if (selectedWallets.length <= 1) return;
      if (gridsByWallet[order.sl]?._id === wallet._id) return;
      setGridsByWallet({
        ...gridsByWallet,
        [order.sl]: wallet,
      });
    },
    [gridsByWallet, selectedWallets.length, setGridsByWallet]
  );

  const refreshSelectedWallets = useCallback(async () => {
    await Promise.all(selectedWallets.map((w) => fetchSingleWalletData(w, true)));
    toast.success("Wallets refreshed");
  }, [selectedWallets, fetchSingleWalletData,]);

  const prevOrderMode = useRef(orderMode);

  useEffect(() => {
    if (prevOrderMode.current !== orderMode) {
      refreshSelectedWallets();
      prevOrderMode.current = orderMode;
    }
  }, [orderMode, refreshSelectedWallets]);

  // ─── Available wallets ────────────────────────────────────────────
  const availableWalletsList = useMemo(
    () =>
      filteredAvailableWallets
        .filter((wallet) => !selectedWallets.some((sw) => sw._id === wallet._id))
        .map((wallet) => ({
          wallet,
          data: walletDataMap[wallet.address.toLowerCase()],
        })),
    [filteredAvailableWallets, selectedWallets, walletDataMap]
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
            Select Perp Accounts
          </h3>
          <p className="text-xs text-gray-600 dark:text-gray-400">
            {selectedWallets.length > 0
              ? `${selectedWallets.length} account${selectedWallets.length > 1 ? "s" : ""} selected`
              : `Choose perp accounts${isSingleWalletStrategy ? " (Single account only)" : ""}`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {selectedWallets.length > 0 && areWalletsReady && (
            <span className="px-2 py-1 text-xs rounded-full bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
              Ready
            </span>
          )}
          <button
            onClick={refreshSelectedWallets}
            disabled={loadingWallets.size > 0 || selectedWallets.length === 0}
            className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <MdOutlineRefresh
              className={`w-3 h-3 ${loadingWallets.size > 0 ? "animate-spin" : ""}`}
            />
            Refresh
          </button>
        </div>
      </div>

      {filteredAvailableWallets.length === 0 && selectedWallets.length === 0 && (
        <div className="flex items-start gap-3 p-4 rounded-lg bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800/30">
          <FiAlertCircle className="w-5 h-5 text-amber-500 mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-sm font-semibold text-amber-800 dark:text-amber-300">
              No perp accounts available
            </p>
            <p className="text-xs text-amber-700 dark:text-amber-400 mt-1">
              To trade perpetuals, deposit at least 10 USDC to your perp account on Arbitrum.
            </p>
          </div>
        </div>
      )}

      {selectedWallets.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-medium text-gray-700 dark:text-gray-300">
              Selected ({selectedWallets.length})
            </h4>
            <button
              onClick={() => {
                if (selectedWallets.length > 0) {
                  setSelectedWallets([]);
                  setGridsByWallet({});
                  toast.success("All wallets deselected");
                }
              }}
              className="text-xs text-red-500 hover:text-red-700 dark:hover:text-red-400 transition-colors"
            >
              Clear All
            </button>
          </div>

          <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-gray-200 dark:scrollbar-thumb-gray-700">
            {selectedWallets.map((wallet) => {
              const address = wallet.address.toLowerCase();
              const data = walletDataMap[address];
              const estimates = estimatesByWallet[address] || {
                estCost: BigInt(0),
                estAmount: BigInt(0),
                estFeeAmount: BigInt(0),
                estFeeByToken: {},
              };
              const walletGrids = Object.entries(gridsByWallet)
                .filter(([, w]) => w._id === wallet._id)
                .map(([sl]) => Number(sl));

              return (
                <WalletCard
                  key={wallet._id}
                  wallet={wallet}
                  walletData={data}
                  isLoading={loadingWallets.has(wallet._id)}
                  isSelected={true}
                  onRemove={handleRemoveWallet}
                  onDeposit={handleOpenDeposit}
                  protocol={protocol}
                  collateralToken={collateralToken}
                  feeToken={feeToken}
                  estOrders={estOrders}
                  selectedGrids={walletGrids}
                  selectGrid={handleGridForWallet}
                  chainId={chainId}
                  estimates={estimates}
                />
              );
            })}
          </div>
        </div>
      )}

      <button
        onClick={() => setShowWalletSelector(!showWalletSelector)}
        className={`w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl border-2 border-dashed transition-all duration-300 text-sm font-semibold shadow-sm hover:shadow-md ${showWalletSelector
          ? "border-red-300/60 bg-red-50/50 dark:bg-red-900/20 text-red-600 dark:text-red-400 hover:bg-red-100/50 dark:hover:bg-red-900/40"
          : "border-blue-300/80 hover:border-blue-400/80 bg-blue-50/40 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 hover:bg-blue-100/50 dark:hover:bg-blue-900/40 hover:-translate-y-0.5"
          }`}
      >
        {showWalletSelector ? (
          <>
            <FiX className="w-4 h-4" />
            Done Selecting
          </>
        ) : (
          <>
            <HiWallet className="w-4 h-4" />
            Add Wallets
            {availableWalletsList.length > 0 && (
              <span className="ml-1 px-1.5 py-0.5 text-xs rounded-full bg-blue-100 dark:bg-blue-800 text-blue-800 dark:text-blue-200">
                {availableWalletsList.length} available
              </span>
            )}
          </>
        )}
      </button>

      {showWalletSelector && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-medium text-gray-700 dark:text-gray-300">
              Available Wallets
            </h4>
            <span className="text-xs text-gray-500">Click to select</span>
          </div>

          <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-gray-200 dark:scrollbar-thumb-gray-700">
            {availableWalletsList.map(({ wallet, data }) => (
              <WalletCard
                key={wallet._id}
                wallet={wallet}
                walletData={data}
                isLoading={loadingWallets.has(wallet._id)}
                isSelected={false}
                onSelect={handleSelectWallet}
                onRemove={handleRemoveWallet}
                onDeposit={handleOpenDeposit}
                protocol={protocol}
                collateralToken={collateralToken}
                feeToken={feeToken}
                estOrders={estOrders}
                selectedGrids={[]}
                chainId={chainId}
              />
            ))}
            {availableWalletsList.length === 0 && (
              <div className="text-center py-6 px-4">
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-amber-500/10 mb-3">
                  <FiAlertCircle className="w-6 h-6 text-amber-500" />
                </div>
                <p className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">
                  No more wallets ready
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400 max-w-xs mx-auto">
                  All available wallets have been selected, or you need to deposit at least 10 USDC to a perp account.
                </p>
                <p className="text-[10px] text-gray-400 mt-3">
                  Go to the Perp tab in your Wallet Manager to deposit.
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {isDepositOpen && depositWallet && (
        <PerpAccountDeposit
          isOpen={isDepositOpen}
          onClose={handleCloseDeposit}
          wallet={depositWallet}
          initialDex={protocol}
          user={user}
        />
      )}
    </div>
  );
};

export default WalletSelector;