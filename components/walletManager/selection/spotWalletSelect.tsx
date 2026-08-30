import React, {
  useEffect,
  useState,
  useCallback,
  useMemo,
  useRef,
} from "react";
// Types
import { OrderType, OrderTokenType } from "@/type/order";
import { WalletType } from "@/type/common";
// UI Components
import { HiWallet } from "react-icons/hi2";
import {
  FiX,
  FiCheck,
  FiCopy,
  FiAlertCircle,
  FiChevronDown,
  FiChevronRight,
} from "react-icons/fi";
import { FaLock, FaGasPump, FaCoins } from "react-icons/fa";
import { MdOutlineRefresh } from "react-icons/md";
import { TbGridDots } from "react-icons/tb";
import toast from "react-hot-toast";
import InfoTooltip from "@/components/tradeBox/TradeBoxCommon/BoxTooltip";

// Internal components
import {
  formateAmountWithFixedDecimals,
  safeParseUnits,
} from "@/utility/handy";
import { Tokens } from "@/constants/common/tokens";

// Balance operations
import {
  getWalletBalance,
  getWalletTokenBalance,
} from "@/lib/blockchain/balance";
import { getGasFee } from "@/lib/blockchain/gas";

import {
  getOrderCosts,
  calculateExistingLockedFunds,
} from "@/utility/orderUtility";
import { ZeroAddress } from "ethers";

import { SINGLE_SPOT_STRATEGY } from "@/constants/common/order";
import { chains } from "@/constants/common/chain";

// Define missing types
type Order = OrderType & {
  sl: number;
  _id?: string;
  wallet?: WalletType;
};

// Interface: Separated static fetched data from dynamic estimates
interface WalletData {
  config: WalletType;
  totalActiveOrders: number;
  lockedFundBalance: bigint; // From EXISTING orders
  totalCollateralPending: bigint; // From EXISTING orders
  balance: bigint; // Native balance for gas
  tokenBalance: bigint; // ERC20 collateral balance
}

interface WalletEstimates {
  estAmount: bigint; // From NEW orders (collateral)
  estCost: bigint; // From NEW orders (gas + native collateral if applicable)
  estFeeAmount: bigint; // From NEW orders (Pulse fee)
  estFeeByToken: Record<string, bigint>;
}

interface WalletSelectorProps {
  category: string;
  protocol?: string;
  availableWallets: WalletType[];
  orders: Order[];
  gridsByWallet: Record<number, WalletType>;
  setGridsByWallet: (gridsByWallet: Record<number, WalletType>) => void;
  areWalletsReady: boolean;
  orderMode: 'Live' | 'Demo' | 'Testnet';
  setWalletsReady: (ready: boolean) => void;
  chainId: number;
  collateralToken: OrderTokenType;
  selectedStrategy: any;
  estOrders: Order[];
  user: any;
}



const createEmptyWalletEstimate = (): WalletEstimates => ({
  estAmount: BigInt(0),
  estCost: BigInt(0),
  estFeeAmount: BigInt(0),
  estFeeByToken: {},
});

// ============================================
// OPTIMIZED WALLET CARD COMPONENT
// ============================================

interface WalletCardProps {
  wallet: WalletType;
  walletData?: WalletData;
  isLoading?: boolean;
  isSelected: boolean;
  onSelect?: (wallet: WalletType) => void | Promise<void>;
  onRemove: (wallet: WalletType) => void;
  collateralToken: OrderTokenType;
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
    collateralToken,
    estOrders,
    selectedGrids,
    selectGrid,
    chainId,
    estimates = createEmptyWalletEstimate(),
  }: WalletCardProps) => {
    const [isExpanded, setIsExpanded] = useState(false);

    // Derived state for validation (only if data is loaded)
    const {
      hasInsufficientBalance,
      hasInsufficientTokens,
    } = useMemo(() => {
      if (!walletData) {
        return {
          hasInsufficientBalance: false,
          hasInsufficientTokens: false,
        };
      }
      let hasInsufficientBalance = false;
      let hasInsufficientTokens = false;
      if (collateralToken.address == ZeroAddress) {
        const availableBalance =
          walletData.balance - walletData.lockedFundBalance;
        hasInsufficientBalance = availableBalance < (estimates.estCost || BigInt(0));
      } else {
        const availableBalance =
          walletData.balance - walletData.lockedFundBalance;
        const availableTokens =
          walletData.tokenBalance - walletData.totalCollateralPending;

        hasInsufficientBalance =
          availableBalance < (estimates.estCost || BigInt(0));
        hasInsufficientTokens =
          availableTokens <
          (estimates.estAmount || BigInt(0));
      }
      return {
        hasInsufficientBalance,
        hasInsufficientTokens,
      };
    }, [walletData, estimates]);

    const handleSelectWallet = useCallback(async (e?: React.MouseEvent) => {
      e?.stopPropagation();
      if (onSelect) await onSelect(wallet);
    }, [onSelect, wallet]);

    const handleRemoveWallet = useCallback(() => {
      onRemove(wallet);
    }, [onRemove, wallet]);

    const handleCopy = useCallback(
      (e: React.MouseEvent) => {
        e.stopPropagation();
        navigator.clipboard.writeText(wallet.address);
        toast.success("Address copied!");
      },
      [wallet.address],
    );

    const handleToggleExpand = useCallback((e: React.MouseEvent) => {
      e.stopPropagation();
      setIsExpanded((prev) => !prev);
    }, []);

    // Memoize native token info
    const nativeToken: any = useMemo(() => {
      return (
        Object.values(Tokens[chainId] || {}).find(
          (token: any) => token.address === ZeroAddress,
        ) ||
        (Tokens[chainId]
          ? Tokens[chainId][ZeroAddress]
          : { symbol: "ETH", decimals: 18, imageUrl: "" })
      );
    }, [chainId]);

    const formatBalance = useCallback((balance: bigint, decimals: number) => {
      return formateAmountWithFixedDecimals(balance, decimals, 7);
    }, []);

    // Loading skeleton
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

    // Minimal view when data not yet loaded (available wallet list)
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
            onClick={!isSelected ? handleSelectWallet : undefined}
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

            {!isSelected && (
              <button
                onClick={handleSelectWallet}
                className="p-1.5 hover:bg-blue-100 dark:hover:bg-blue-900/30 rounded transition-colors"
              >
                <FiCheck className="w-4 h-4 text-blue-500" />
              </button>
            )}
          </div>
        </div>
      );
    }

    // Full view with data
    return (
      <div
        className={`group relative rounded-xl border backdrop-blur-sm transition-all duration-300 overflow-hidden ${isSelected
          ? "border-blue-500/60 bg-gradient-to-br from-blue-50/50 to-indigo-50/30 dark:from-blue-900/20 dark:to-indigo-900/10 shadow-sm shadow-blue-500/10"
          : "border-gray-200/80 dark:border-gray-700/80 bg-white/50 dark:bg-gray-800/50 hover:border-blue-400 hover:shadow-md hover:shadow-blue-500/5 hover:-translate-y-0.5"
          } ${(hasInsufficientBalance ||
            hasInsufficientTokens) &&
            isSelected
            ? "border-red-400/60 dark:border-red-500/60 bg-gradient-to-br from-red-50/50 to-orange-50/30 dark:from-red-900/20 dark:to-orange-900/10 shadow-red-500/10"
            : ""
          }`}
      >
        {/* Header */}
        <div
          className={`flex items-center justify-between p-3 cursor-pointer ${!isSelected && "hover:bg-gray-50 dark:hover:bg-gray-800"
            }`}
          onClick={!isSelected ? handleSelectWallet : undefined}
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
              <div className="hidden 3xl:block flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] mt-1.5">
                <div className="flex items-center gap-1 text-gray-500 dark:text-gray-400">
                  <FaCoins className="w-3 h-3" />
                  <span>
                    Balance: {formatBalance(collateralToken.address !== ZeroAddress ? walletData.tokenBalance : walletData.balance, collateralToken.address !== ZeroAddress ? collateralToken.decimals : (nativeToken?.decimals || 18))} {collateralToken.address !== ZeroAddress ? collateralToken.symbol : nativeToken?.symbol}
                  </span>
                </div>
                {(collateralToken.address !== ZeroAddress ? walletData.totalCollateralPending : walletData.lockedFundBalance) > BigInt(0) && (
                  <div className="flex items-center gap-1 text-red-500 dark:text-red-400">
                    <FaLock className="w-3 h-3" />
                    <span>
                      Locked: {formatBalance(collateralToken.address !== ZeroAddress ? walletData.totalCollateralPending : walletData.lockedFundBalance, collateralToken.address !== ZeroAddress ? collateralToken.decimals : (nativeToken?.decimals || 18))} {collateralToken.address !== ZeroAddress ? collateralToken.symbol : nativeToken?.symbol}
                    </span>
                  </div>
                )}
                {(collateralToken.address !== ZeroAddress ? estimates.estAmount : estimates.estCost) > BigInt(0) && (
                  <div className="flex items-center gap-1 text-blue-500 dark:text-blue-400">
                    <TbGridDots className="w-3 h-3" />
                    <span>
                      Est. Amount: {formatBalance(collateralToken.address !== ZeroAddress ? estimates.estAmount : estimates.estCost, collateralToken.address !== ZeroAddress ? collateralToken.decimals : (nativeToken?.decimals || 18))} {collateralToken.address !== ZeroAddress ? collateralToken.symbol : nativeToken?.symbol}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {isSelected ? (
              <>
                <button
                  onClick={handleRemoveWallet}
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
                onClick={handleSelectWallet}
                className="p-1.5 hover:bg-blue-100 dark:hover:bg-blue-900/30 rounded transition-colors"
              >
                <FiCheck className="w-4 h-4 text-blue-500" />
              </button>
            )}
          </div>
        </div>

        {/* Expanded Content */}
        {isSelected && isExpanded && (
          <div className="px-3 pb-3 border-t border-gray-200 dark:border-gray-700 pt-3">
            {/* Balance Overview */}
            <div className="grid grid-cols-1 2xl:grid-cols-2 gap-3 mb-3">
              {/* Native Token Balance */}
              <div className="p-3.5 bg-white/80 dark:bg-gray-800/80 rounded-xl border border-gray-200/80 dark:border-gray-700/80 shadow-sm backdrop-blur-md transition-all hover:shadow-md group/card">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <img
                      src={nativeToken?.imageUrl}
                      className="w-5 h-5 rounded-full"
                      alt={nativeToken?.symbol}
                    />
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      {nativeToken?.symbol}
                    </span>
                  </div>
                  <FaGasPump className="w-4 h-4 text-gray-400" />
                </div>

                <div className="space-y-2">
                  <div>
                    <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">
                      Total Balance
                    </div>
                    <div className="text-sm font-semibold text-gray-900 dark:text-white">
                      {formatBalance(
                        walletData.balance,
                        nativeToken?.decimals || 18,
                      )}
                    </div>
                  </div>

                  <div>
                    <div className="text-xs text-gray-500 dark:text-gray-400 mb-1 flex items-center gap-1">
                      <FaLock className="w-3 h-3 text-red-400" />
                      Locked Balance
                    </div>
                    <div className="text-sm font-semibold text-red-600 dark:text-red-400">
                      {formatBalance(
                        walletData.lockedFundBalance,
                        nativeToken?.decimals || 18,
                      )}
                    </div>
                  </div>

                  <div
                    className={`p-2.5 rounded-lg transition-all ${hasInsufficientBalance
                      ? "bg-red-50/80 dark:bg-red-900/20 border border-red-200/80 dark:border-red-800/80"
                      : "bg-blue-50/80 dark:bg-blue-900/20 border border-blue-200/80 dark:border-blue-800/80"
                      }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-medium text-gray-700 dark:text-gray-300">
                        Est. Cost (Gas {collateralToken.address === ZeroAddress ? "+ Base" : ""})
                      </span>
                      <InfoTooltip
                        id="Est_networkFee"
                        content={`Estimated native token cost for the transaction (Gas fee plus swap value if trading native token).`}
                      />
                    </div>
                    <div className="text-sm font-semibold text-gray-900 dark:text-white">
                      {formatBalance(
                        estimates.estCost,
                        nativeToken?.decimals || 18,
                      )}
                    </div>
                    {hasInsufficientBalance && (
                      <div className="flex items-center gap-1 text-xs text-red-500 mt-1">
                        <FiAlertCircle className="w-3 h-3" />
                        <span>Insufficient gas balance</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Collateral Token Balance */}
              {collateralToken.address !== ZeroAddress && (
                <div className="p-3.5 bg-white/80 dark:bg-gray-800/80 rounded-xl border border-gray-200/80 dark:border-gray-700/80 shadow-sm backdrop-blur-md transition-all hover:shadow-md group/card">
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
                    <FaCoins className="w-4 h-4 text-gray-400" />
                  </div>

                  <div className="space-y-2">
                    <div>
                      <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">
                        Total Balance
                      </div>
                      <div className="text-sm font-semibold text-gray-900 dark:text-white">
                        {formatBalance(
                          walletData.tokenBalance,
                          collateralToken.decimals,
                        )}
                      </div>
                    </div>

                    <div>
                      <div className="text-xs text-gray-500 dark:text-gray-400 mb-1 flex items-center gap-1">
                        <FaLock className="w-3 h-3 text-red-400" />
                        Locked Balance
                      </div>
                      <div className="text-sm font-semibold text-red-600 dark:text-red-400">
                        {formatBalance(
                          walletData.totalCollateralPending,
                          collateralToken.decimals,
                        )}
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
                          Est. Amount (New)
                        </span>
                        <InfoTooltip
                          id="Est_collateralAmount"
                          content={`Estimated collateral token required for this order.`}
                        />
                      </div>
                      <div className="text-sm font-semibold text-gray-900 dark:text-white">
                        {formatBalance(
                          estimates.estAmount,
                          collateralToken.decimals,
                        )}
                      </div>
                      {hasInsufficientTokens && (
                        <div className="flex items-center gap-1 text-xs text-red-500 mt-1">
                          <FiAlertCircle className="w-3 h-3" />
                          <span>Insufficient tokens</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Grid Selection */}
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
        {isSelected &&
          !isExpanded &&
          (hasInsufficientBalance ||
            hasInsufficientTokens) && (
            <div className="px-3 pb-3 border-t border-gray-200 dark:border-gray-700 pt-2">
              <div className="flex items-center gap-2 text-xs text-red-500">
                <FiAlertCircle className="w-3 h-3 flex-shrink-0" />
                <span className="truncate">
                  Insufficient {hasInsufficientBalance ? "gas" : ""}
                  {hasInsufficientBalance && hasInsufficientTokens
                    ? " and "
                    : ""}
                  {hasInsufficientTokens ? "tokens" : ""}
                </span>
              </div>
            </div>
          )}
      </div>
    );
  },
);

WalletCard.displayName = "WalletCard";

// ============================================
// OPTIMIZED WALLET SELECTOR COMPONENT
// ============================================

const WalletSelector = ({
  category,
  protocol,
  availableWallets,
  orders,
  gridsByWallet,
  setGridsByWallet,
  areWalletsReady,
  orderMode,
  setWalletsReady,
  chainId,
  collateralToken,
  selectedStrategy,
  estOrders,
  user,
}: WalletSelectorProps) => {
  const [showWalletSelector, setShowWalletSelector] = useState(false);
  const [selectedWallets, setSelectedWallets] = useState<WalletType[]>([]);

  // Store fetched data (balances, locks) per wallet
  const [walletDataMap, setWalletDataMap] = useState<
    Record<string, WalletData>
  >({});
  const [loadingWallets, setLoadingWallets] = useState<Set<string>>(new Set());

  const [gasFee, setGasFee] = useState<bigint>(BigInt(0));

  const isMounted = useRef(true);
  const fetchGenByAddressRef = useRef<Record<string, number>>({});

  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
    };
  }, []);

  // Single wallet strategies check
  const isSingleWalletStrategy = useMemo(() => {
    return SINGLE_SPOT_STRATEGY.includes(selectedStrategy?.id);
  }, [category, selectedStrategy?.id]);

  // Filter available wallets based on chain ID and normalize ID
  const filteredAvailableWallets = useMemo(() => {
    return availableWallets.filter((wallet) => !wallet.isPerpAgentWallet)
      ?.filter((wallet) => {
        const network = (wallet as any).network;
        if (chainId === chains.Solana) {
          return network === "SVM";
        }
        return network === "EVM" || !network;
      })
      .map((w: any) => ({
        ...w,
        _id: w._id,
      }));
  }, [availableWallets, chainId]);

  // Fetch Gas Fee
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
  }, [chainId]);

  // Pre-group orders by wallet
  const ordersByWallet = useMemo(() => {
    const map = new Map<string, OrderType[]>();
    orders.forEach((order) => {
      if (order.wallet._id) {
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
      force = false,
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
          collateralTokenAddress: collateralToken?.address || ZeroAddress,
          gasFee,
          orderMode,
          user,
          treatCollateralTokenAsWalletBalance: false
        });

        const [balance, tokenBalance] = await Promise.all([
          getWalletBalance({ walletAddress: wallet.address, chainId }),
          collateralToken?.address && collateralToken.address !== ZeroAddress
            ? getWalletTokenBalance({
              walletAddress: wallet.address,
              tokenAddress: collateralToken.address,
              chainId,
            })
            : Promise.resolve(BigInt(0)),
        ]);

        if (!isMounted.current) return undefined;
        if (fetchGenByAddressRef.current[address] !== myGen) return undefined;

        // ✅ Use walletLockedFunds.walletCollateralPending directly
        const newData: WalletData = {
          config: wallet,
          totalActiveOrders: walletLockedFunds.totalActiveOrders,
          lockedFundBalance: walletLockedFunds.lockedFundBalance,
          totalCollateralPending: walletLockedFunds.walletCollateralPending,
          balance:
            typeof balance === "string"
              ? safeParseUnits(balance, 18)
              : BigInt(balance),
          tokenBalance:
            typeof tokenBalance === "string"
              ? safeParseUnits(tokenBalance, collateralToken?.decimals || 18)
              : BigInt(tokenBalance || 0),
        };

        if (fetchGenByAddressRef.current[address] !== myGen) return undefined;

        setWalletDataMap((prev) => ({
          ...prev,
          [address]: newData,
        }));

        return newData;
      } catch (error) {
        if (isMounted.current) {
          if (force)
            toast.error(
              `Failed to load data for ${wallet.address.slice(0, 6)}...`,
            );
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
    [ordersByWallet, collateralToken, gasFee, chainId, user, walletDataMap, orderMode]
  );

  // Centralized Estimation Logic (Memoized)
  const estimatesByWallet = useMemo(() => {
    const estimates: Record<string, WalletEstimates> = {};

    // Initialize zero estimates for all known wallets (selected or loaded)
    Object.keys(walletDataMap).forEach((address) => {
      estimates[address] = createEmptyWalletEstimate();
    });

    // Also ensure selected wallets have an entry even if data not loaded yet
    selectedWallets.forEach((w) => {
      const addr = w.address.toLowerCase();
      if (!estimates[addr]) estimates[addr] = createEmptyWalletEstimate();
    });

    // Iterate through assigned grids and sum up costs
    Object.entries(gridsByWallet).forEach(([gridSl, WalletType]) => {
      const order = estOrders.find((o) => o.sl === Number(gridSl));
      if (order && WalletType && WalletType.address) {
        const address = WalletType.address.toLowerCase();

        // Ensure entry exists
        if (!estimates[address]) estimates[address] = createEmptyWalletEstimate();

        const costs = getOrderCosts({
          order,
          collateralTokenAddress: collateralToken?.address || ZeroAddress,
          gasFee,
          user,
          treatCollateralTokenAsWalletBalance: true,
        });

        if (collateralToken?.address && collateralToken.address !== ZeroAddress) {
          estimates[address].estAmount += costs.walletOrderAmount;
          estimates[address].estCost += costs.orderGasFee;
        } else {
          estimates[address].estCost += costs.orderGasFee + costs.walletOrderAmount;
        }

        // Spot: fee is deducted from collateral (open) or output (close),
        // but we still need extra gas for the fee transfer transaction
        if (costs.feeTokenAmount > BigInt(0)) {
          estimates[address].estCost += costs.orderGasFee > BigInt(0) ? gasFee : BigInt(0);
        }
      }
    });

    return estimates;
  }, [
    gridsByWallet,
    estOrders,
    walletDataMap,
    selectedWallets,
    collateralToken.address,
    gasFee,
    user,
  ]);

  // Readiness Check
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
      const availableTokens = data.tokenBalance - data.totalCollateralPending;

      return (
        (collateralToken.address === ZeroAddress && availableNative >= estimate.estCost) ||
        (collateralToken.address !== ZeroAddress && availableNative >= estimate.estCost && availableTokens >= estimate.estAmount)
      );
    });

    setWalletsReady(isReady);
  }, [
    selectedWallets,
    walletDataMap,
    estimatesByWallet,
    estOrders.length,
    setWalletsReady,
  ]);

  // Distribute orders to wallets
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
    [estOrders, isSingleWalletStrategy, setGridsByWallet],
  );

  // Handle wallet selection
  const handleSelectWallet = useCallback(
    async (wallet: WalletType) => {
      const address = wallet.address.toLowerCase();

      if (loadingWallets.has(wallet._id)) {
        toast.loading("Wallet data is being fetched...", {
          id: "wallet-loading",
        });
        return;
      }

      let data: WalletData | undefined = walletDataMap[address];

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
      isSingleWalletStrategy,
      selectedWallets,
      estOrders.length,
      distributeOrders,
    ],
  );

  const handleRemoveWallet = useCallback(
    (wallet: WalletType) => {
      const newSelectedWallets = selectedWallets.filter(
        (w) => w._id !== wallet._id,
      );
      setSelectedWallets(newSelectedWallets);

      const newGridsByWallet = { ...gridsByWallet };
      Object.keys(newGridsByWallet).forEach((key) => {
        if (newGridsByWallet[Number(key)]?._id === wallet._id) {
          delete newGridsByWallet[Number(key)];
        }
      });
      setGridsByWallet(newGridsByWallet);
      distributeOrders(newSelectedWallets);
    },
    [selectedWallets, gridsByWallet, distributeOrders, setGridsByWallet],
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
    [gridsByWallet, selectedWallets.length, setGridsByWallet],
  );

  const refreshSelectedWallets = useCallback(async () => {
    await Promise.all(
      selectedWallets.map((w) => fetchSingleWalletData(w, true)),
    );
    toast.success("Wallets refreshed");
  }, [selectedWallets, fetchSingleWalletData]);

  // Available wallets list (includes wallets without data)
  const availableWalletsList = useMemo(() => {
    return filteredAvailableWallets
      .filter((wallet) => !selectedWallets.some((sw) => sw._id === wallet._id))
      .map((wallet) => ({
        wallet,
        data: walletDataMap[wallet.address.toLowerCase()],
      }));
  }, [filteredAvailableWallets, selectedWallets, walletDataMap]);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
            Select Pulse Account
          </h3>
          <p className="text-xs text-gray-600 dark:text-gray-400">
            {selectedWallets.length > 0
              ? `${selectedWallets.length} wallet${selectedWallets.length > 1 ? "s" : ""} selected`
              : `Choose wallets${isSingleWalletStrategy ? " (Single wallet only)" : ""}`}
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

      {/* Selected Wallets Section */}
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
                .filter(([_, w]) => w._id === wallet._id)
                .map(([sl]) => Number(sl));

              return (
                <WalletCard
                  key={wallet._id}
                  wallet={wallet}
                  walletData={data}
                  isLoading={loadingWallets.has(wallet._id)}
                  isSelected={true}
                  onRemove={handleRemoveWallet}
                  collateralToken={collateralToken}
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

      {/* Add Wallets Toggle */}
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

      {/* Available Wallets List */}
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
                collateralToken={collateralToken}
                estOrders={estOrders}
                selectedGrids={[]}
                chainId={chainId}
              />
            ))}
            {availableWalletsList.length === 0 && (
              <p className="text-center text-sm text-gray-500 py-4">
                No available wallets
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default WalletSelector;