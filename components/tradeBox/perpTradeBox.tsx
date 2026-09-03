import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { OrderType, OrderTokenType, TechnicalLogicType, TechnicalWeightsType } from "@/type/order";


import { PerpCollateral, CollateralTokens } from "@/constants/common/tokens";
import { PerpetualStrategies, PerpOrderModes } from "@/constants/common/frontend";
import { FiChevronDown, FiAlertTriangle, FiAlertCircle } from "react-icons/fi";
import { ZeroAddress } from "ethers";

//components
import TechnicalEntry from "./TradeBoxCommon/TechnicalEntry";
import InfoTooltip from "./TradeBoxCommon/BoxTooltip";
import DropDown from "./TradeBoxCommon/BoxDropdown";
import TakeProfitInput from "./TradeBoxCommon/TakeProfit";
import StopLossInput from "./TradeBoxCommon/StopLoss";
import OrderModeSelector from "./TradeBoxCommon/OrderModeSelector";
import SlippageInput from "./TradeBoxCommon/SlippageTolarence";
import ReEntranceInput from "./TradeBoxCommon/ReEntrance";
import EntryPriceRendering from "./TradeBoxCommon/EntryPriceRendering";
import OrderNameValidationInput from "./TradeBoxCommon/orderNameValidation";
import GridInput from "./TradeBoxCommon/GridInput";
import NumberInput from "./TradeBoxCommon/NumberInput";
import EstSpotOrders from "@/components/order/estimate/estPerpOrder";
import PerpAccountSelect from "@/components/walletManager/selection/perpAccountSelect";
import ConfirmationModal from "../common/Confirmation/ConfirmationBox";

// hook
import { useOrder } from "@/hooks/useOrder";
import { useDebounce } from "@/hooks/useDebounce";


//library
import { getTokenPrices } from "@/lib/oracle/spotTokenPrice";
import LeverageInput from "./TradeBoxCommon/LeverageInput";
import {
  getOrderIndexTokenAddress,
  getOrderPerpetual,
  isActiveClientOrder,
  getDefaultFeeToken,
  isTradeFeeExemptStatus,
  shouldCreateDemoTestnet,
  calculateEstLiquidationPrice,
} from "@/utility/orderUtility";
import { displayNumber } from "@/utility/displayPrice";
import type { MarketSnapshotRef, StableMarketTokenInfo } from "@/type/market";

const EST_PERP_MAINTENANCE_BPS = 50;

// Cheap structural comparison for the small (bounded by config.maxGridNumber)
// arrays configurePerpOrder() returns. Used to avoid calling setEstOrders
// with a brand-new array reference when the computed content is actually
// identical to what's already in state — without this, any effect that
// recomputes estOrders on every render (e.g. because one of its inputs from
// a parent hook isn't referentially stable) would trigger an update loop.
const areOrderListsEqual = (a: OrderType[], b: OrderType[]) => {
  if (a === b) return true;
  if (a.length !== b.length) return false;
  try {
    return JSON.stringify(a) === JSON.stringify(b);
  } catch {
    return false;
  }
};

interface GridsByWallet {
  [walletIndex: number]: any;
}

const renderTokenOption = (token: any) => ({
  label: (
    <div className="flex items-center gap-1 text-gray-900 dark:text-gray-200">
      <img
        src={token.imageUrl}
        className="w-4 h-4 rounded-full"
        alt={token.symbol}
      />
      <span>{token.symbol}</span>
    </div>
  ),
  value: token,
});

// ─── Helper: detect entry type ──────────────────────────────────────────
const isWeightedEntry = (entry: any): entry is TechnicalWeightsType => {
  return entry && "targetWeight" in entry && "weights" in entry;
};

const getEntryType = (entry: TechnicalLogicType | TechnicalWeightsType | null): "logic" | "weight" | "price" => {
  if (!entry) return "price";
  if (isWeightedEntry(entry)) return "weight";
  return "logic";
};

// ─── Main Component ──────────────────────────────────────────────────────
interface perpTradeBoxProps {
  tokenInfo: StableMarketTokenInfo;
  chainId: number;
  isConnected: boolean;
  user?: any;
  userWallets?: any[];
  userPrevOrders?: any[];
  protocol: string;
  marketSnapshotRef?: MarketSnapshotRef;
  isAdvancedSymbol?: boolean;
  config: {
    minimumOrderSize: number;
    maxGridNumber: number;
    userLevels: any
  }
}

const areEqualPerpTradeBoxProps = (
  previous: perpTradeBoxProps,
  next: perpTradeBoxProps,
) => {
  return (
    previous.chainId === next.chainId &&
    previous.isConnected === next.isConnected &&
    previous.user === next.user &&
    previous.userWallets === next.userWallets &&
    previous.userPrevOrders === next.userPrevOrders &&
    previous.protocol === next.protocol &&
    previous.marketSnapshotRef === next.marketSnapshotRef &&
    previous.tokenInfo === next.tokenInfo &&
    previous.isAdvancedSymbol === next.isAdvancedSymbol
  );
};

export default memo(PerpTradeBox, areEqualPerpTradeBoxProps);

function PerpTradeBox({
  tokenInfo,
  chainId,
  isConnected,
  user,
  userWallets = [],
  userPrevOrders = [],
  protocol,
  marketSnapshotRef,
  isAdvancedSymbol = false,
  config = { minimumOrderSize: 15, maxGridNumber: 2, userLevels: {} }
}: perpTradeBoxProps) {

  const { configurePerpOrder, submitOrder } = useOrder();

  // ── Stabilize hook-provided callbacks ──────────────────────────────────
  // If useOrder() returns new function instances on every render (it isn't
  // guaranteed to memoize them), any effect depending on configurePerpOrder
  // directly would re-run every single render, and if that effect calls
  // setState unconditionally, React throws "Maximum update depth exceeded".
  // Mirroring the latest function into a ref (updated in the render body,
  // not in an effect) lets the effect below call the current function
  // without ever listing it as a dependency.
  const configurePerpOrderRef = useRef(configurePerpOrder);
  configurePerpOrderRef.current = configurePerpOrder;
  const submitOrderRef = useRef(submitOrder);
  submitOrderRef.current = submitOrder;

  // UI State
  const [showStrategyDropdown, setShowStrategyDropdown] = useState(false);
  const [openEstOrderModal, setOpenEstimatedOrderModal] = useState(false);
  const [isConfirmationOpen, setIsConfirmationOpen] = useState(false);
  const [creationPending, setCreationPending] = useState(false);

  // Strategy & Token State
  const [selectedStrategy, setSelectedStrategy] = useState(
    PerpetualStrategies[0],
  );
  const [collateralToken, setCollateralToken] = useState<any>(
    Object.values(PerpCollateral[42161])[0],
  );
  const [outputToken, setOutputToken] = useState<any>(
    Object.values(PerpCollateral[42161])[0],
  );
  const [collateralPrice, setCollateralPrice] = useState<number>(0);
  const [orderMode, setOrderMode] = useState<"Live" | "Demo" | "Testnet">("Live");
  // Order Configuration State
  const [initialOrderSize, setInitialOrderSize] = useState<string>("");
  const [entryPrice, setEntryPrice] = useState<string>(tokenInfo?.priceUsd || "");
  const [tpPrice, setTpPrice] = useState(tokenInfo?.priceUsd || "");
  const [technicalEntry, setTechnicalEntry] = useState<TechnicalLogicType | TechnicalWeightsType | null>(null);
  const [orderName, setOrderName] = useState<string>("");
  const [slippage, setSlippage] = useState<number>(1);

  // Grid Configuration State
  const [gridNumber, setGridNumber] = useState<number>(1);
  const [gridDistance, setGridDistance] = useState<number>(1);
  const [gridMultiplier, setGridMultiplier] = useState<number>(1);
  const [orderSizeMultiplier, setOrderSizeMultiplier] = useState<number>(1);

  // Risk Management State
  const [tpPercentage, setTpPercentage] = useState<number>(10);
  const [slPercentage, setSlPercentage] = useState<number>(10);
  const [isActiveStopLoss, setIsActiveStopLoss] = useState<boolean>(false);

  const [isTrailingMode, setIsTrailingMode] = useState<boolean>(false);
  const [isReEntrance, setIsReEntrance] = useState<boolean>(false);
  const [reEntrancePercentage, setReEntrancePercentage] = useState<number>(1);

  // Advanced Settings State
  const priority = 2;
  const executionSpeed = "standard";

  // Wallet & Order State
  const [gridsByWallet, setGridsByWallet] = useState<GridsByWallet>({});
  const [areWalletsReady, setWalletsReady] = useState<boolean>(false);
  const [perpAccountGateOk, setPerpAccountGateOk] = useState(false);
  const [estOrders, setEstOrders] = useState<OrderType[]>([]);
  const feeTokenOptions: OrderTokenType[] = useMemo(
    () => Object.values(CollateralTokens[42161]),
    [],
  );
  const feeTokenDropdownOptions = useMemo(
    () => feeTokenOptions.map(renderTokenOption),
    [feeTokenOptions],
  );
  const chainCollateralOptions = useMemo(
    () => Object.values(PerpCollateral[chainId] || {}).map(renderTokenOption),
    [chainId],
  );
  const [feeToken, setFeeToken] = useState<OrderTokenType | null>(
    getDefaultFeeToken(feeTokenOptions),
  );
  const [feeTokenPrice, setFeeTokenPrice] = useState<number>(0);

  const isFeeExempt = useMemo(
    () => isTradeFeeExemptStatus(config.userLevels, user?.status, orderMode || 'Live'),
    [user, orderMode],
  );

  const showFeeTokenSelector = !isFeeExempt;

  const [leverage, setLeverage] = useState(1);
  const [isLong, setIsLong] = useState(false);
  const [liveTokenPriceUsd, setLiveTokenPriceUsd] = useState(
    () => marketSnapshotRef?.current?.priceUsd || tokenInfo?.priceUsd || "",
  );
  const [liveMarkPriceUsd, setLiveMarkPriceUsd] = useState<number>(
    () => marketSnapshotRef?.current?.markPrice || 0,
  );

  const [debouncedInitialOrderSize] = useDebounce(initialOrderSize, 300);
  const [debouncedEntryPrice] = useDebounce(entryPrice, 300);
  const [debouncedTpPrice] = useDebounce(tpPrice, 300);

  // Validation State
  const [isOrderNameValidate, setIsOrderNameValidate] =
    useState<boolean>(false);

  const negativeGridDecrementalPriceProtection = useCallback(() => {
    if (gridDistance > 0 && gridNumber > 1 && gridMultiplier > 0) {
      let fristCal = gridMultiplier ** (gridNumber - 1) - 1;
      let secounCal = fristCal / (gridMultiplier - 1);
      let lastPercentage = gridDistance * secounCal;
      if (lastPercentage >= 100) {
        return true;
      }
    }
    return false;
  }, [gridDistance, gridNumber, gridMultiplier]);

  // ========================================================================
  // Effects
  // ========================================================================

  const syncLiveMarketState = useCallback(() => {
    const nextPriceUsd = marketSnapshotRef?.current?.priceUsd || tokenInfo?.priceUsd || "";
    const nextMarkPriceUsd = marketSnapshotRef?.current?.markPrice || 0;

    setLiveTokenPriceUsd((previous) =>
      previous === nextPriceUsd ? previous : nextPriceUsd,
    );
    setLiveMarkPriceUsd((previous) =>
      previous === nextMarkPriceUsd ? previous : nextMarkPriceUsd,
    );
  }, [marketSnapshotRef, tokenInfo?.priceUsd]);

  useEffect(() => {
    // Always sync once immediately (covers both the "polling" case below and
    // the case where there's no marketSnapshotRef at all, e.g. static data).
    syncLiveMarketState();

    if (!marketSnapshotRef) {
      return undefined;
    }

    const intervalId = window.setInterval(syncLiveMarketState, 500);
    return () => window.clearInterval(intervalId);
  }, [marketSnapshotRef, syncLiveMarketState, tokenInfo?.address]);

  // Fetch Collateral Price
  const collateralPriceRequestId = useRef(0);
  useEffect(() => {
    const requestId = ++collateralPriceRequestId.current;

    const fetchCollateralPrice = async () => {
      if (collateralToken.isStable) {
        setCollateralPrice((prev) => (prev === 1 ? prev : 1));
        return;
      }

      if (
        collateralToken.address.toLowerCase() ===
        tokenInfo?.address?.toLowerCase()
      ) {
        if (liveTokenPriceUsd) {
          const next = Number(liveTokenPriceUsd);
          setCollateralPrice((prev) => (prev === next ? prev : next));
          return;
        }
      }

      try {
        let queryAddress = collateralToken.address;

        if (collateralToken.address === ZeroAddress) {
          const wrappedNative = Object.values(PerpCollateral[chainId]).find(
            (t: any) => t.isWrappedNative,
          ) as any;
          if (wrappedNative) {
            queryAddress = wrappedNative.address;
          }
        }

        const price = await getTokenPrices({
          tokenAddress: queryAddress,
          chainId,
        });
        if (requestId !== collateralPriceRequestId.current) return; // superseded
        const next = price ? Number(price) : 0;
        setCollateralPrice((prev) => (prev === next ? prev : next));
      } catch {
        if (requestId !== collateralPriceRequestId.current) return;
        setCollateralPrice((prev) => (prev === 0 ? prev : 0));
      }
    };

    fetchCollateralPrice();
  }, [
    collateralToken.address,
    collateralToken.isStable,
    tokenInfo?.address,
    liveTokenPriceUsd,
    chainId,
  ]);

  // ─── Reset entry/tp prices when the traded token changes ──────────────
  // Deliberately scoped to tokenInfo?.address only — it must NOT re-fire on
  // every live price tick (that previously came from reading
  // marketSnapshotRef.current?.priceUsd directly in the dependency array,
  // an anti-pattern since refs aren't tracked by React), or it would
  // overwrite whatever price the user has typed in.
  useEffect(() => {
    const nextPrice = tokenInfo?.priceUsd || "";
    if (!nextPrice) return;
    setEntryPrice(nextPrice);
    setTpPrice(nextPrice);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tokenInfo?.address]);

  // Fee Token Price
  const feeTokenPriceRequestId = useRef(0);
  useEffect(() => {
    const requestId = ++feeTokenPriceRequestId.current;

    const fetchFeeTokenPrice = async () => {
      if (!feeToken) {
        setFeeTokenPrice((prev) => (prev === 0 ? prev : 0));
        return;
      }

      if (feeToken.isStable) {
        setFeeTokenPrice((prev) => (prev === 1 ? prev : 1));
        return;
      }

      if (
        tokenInfo?.address &&
        feeToken.address.toLowerCase() === tokenInfo.address.toLowerCase() &&
        liveTokenPriceUsd
      ) {
        const next = Number(liveTokenPriceUsd);
        setFeeTokenPrice((prev) => (prev === next ? prev : next));
        return;
      }

      if (
        collateralToken?.address &&
        feeToken.symbol.toLowerCase() === collateralToken.symbol.toLowerCase() &&
        collateralPrice > 0
      ) {
        setFeeTokenPrice((prev) => (prev === collateralPrice ? prev : collateralPrice));
        return;
      }

      try {
        let queryAddress = feeToken.address;

        if (queryAddress === ZeroAddress) {
          const wrappedNative = Object.values(PerpCollateral[chainId]).find(
            (token: any) => token.isWrappedNative,
          ) as any;

          if (wrappedNative) {
            queryAddress = wrappedNative.address;
          }
        }

        const price = await getTokenPrices({
          tokenAddress: queryAddress,
          chainId,
        });

        if (requestId !== feeTokenPriceRequestId.current) return; // superseded
        const next = price ? Number(price) : 0;
        setFeeTokenPrice((prev) => (prev === next ? prev : next));
      } catch {
        if (requestId !== feeTokenPriceRequestId.current) return;
        setFeeTokenPrice((prev) => (prev === 0 ? prev : 0));
      }
    };

    fetchFeeTokenPrice();
  }, [
    feeToken,
    tokenInfo?.address,
    liveTokenPriceUsd,
    collateralPrice,
    collateralToken?.address,
    collateralToken?.symbol,
    chainId,
  ]);

  // ========================================================================
  // Event Handlers
  // ========================================================================

  const handleTrailingMode = useCallback((value: boolean) => {
    if (value == true) {
      setIsActiveStopLoss(true);
      if (slPercentage === 0) {
        setSlPercentage(10);
      }
    }
    setIsTrailingMode(value);
  }, [slPercentage]);

  const handleOrderSize = useCallback((value: string) => {
    setInitialOrderSize(value);
  }, []);

  const handleStrategyChange = useCallback((strategy: (typeof PerpetualStrategies)[0]) => {
    setSelectedStrategy(strategy);
    setGridNumber(1);
    setShowStrategyDropdown(false);

    if (selectedStrategy.id === "algo" && strategy.id !== "algo") {
      setTechnicalEntry(null);
    }

    if (strategy.id === "sellToken") {
      const tokenFromConstants = Object.values(PerpCollateral[chainId]).find(
        (t: any) =>
          t.address.toLowerCase() === tokenInfo.address?.toLowerCase(),
      ) as any;

      if (tokenFromConstants) {
        setCollateralToken(tokenFromConstants);
      } else {
        setCollateralToken({
          address: tokenInfo.address,
          name: tokenInfo.name,
          symbol: tokenInfo.symbol,
          decimals: tokenInfo.decimals,
          imageUrl: tokenInfo.imageUrl || "/tokenLogo.png",
        } as any);
      }
    } else {
      setCollateralToken(Object.values(PerpCollateral[chainId])[0]);
    }
  }, [chainId, selectedStrategy.id, tokenInfo]);

  // ========================================================================
  // Validation Logic
  // ========================================================================

  const estimatedUsdValue = useMemo(() => {
    if (!initialOrderSize || !collateralPrice) return 0;
    return Number(initialOrderSize) * collateralPrice;
  }, [initialOrderSize, collateralPrice]);

  const entryForLiquidationUsd = useMemo(() => {
    if (selectedStrategy.id === "sellToken") {
      return Number(debouncedTpPrice) || 0;
    }
    if (selectedStrategy.id === "algo") {
      return (
        Number(debouncedEntryPrice) ||
        Number(liveMarkPriceUsd) ||
        Number(liveTokenPriceUsd) ||
        0
      );
    }
    return Number(debouncedEntryPrice) || 0;
  }, [
    selectedStrategy.id,
    debouncedTpPrice,
    debouncedEntryPrice,
    liveMarkPriceUsd,
    liveTokenPriceUsd,
  ]);

  const estLiquidationPriceUsd = useMemo(() => {
    return calculateEstLiquidationPrice(
      entryForLiquidationUsd,
      leverage,
      isLong,
      EST_PERP_MAINTENANCE_BPS,
    );
  }, [entryForLiquidationUsd, leverage, isLong]);

  const resolvedMaxLeverage = useMemo(() => {
    const parsed = Number(tokenInfo?.maxLeverage);
    if (!Number.isFinite(parsed) || parsed <= 0) {
      return 50;
    }
    return Math.max(1, parsed);
  }, [tokenInfo?.maxLeverage]);

  useEffect(() => {
    if (leverage > resolvedMaxLeverage) {
      setLeverage(resolvedMaxLeverage);
    }
  }, [leverage, resolvedMaxLeverage]);

  const estimatedAssetQuantity = useMemo(() => {
    const collateralAmount = Number(initialOrderSize);
    const collateralUsdPrice = Number(collateralPrice);
    const marketEntryPrice = Number(entryForLiquidationUsd);

    if (
      collateralAmount <= 0 ||
      collateralUsdPrice <= 0 ||
      leverage <= 0 ||
      marketEntryPrice <= 0
    ) {
      return 0;
    }

    return (collateralAmount * collateralUsdPrice * leverage) / marketEntryPrice;
  }, [collateralPrice, entryForLiquidationUsd, initialOrderSize, leverage]);

  const qtyValidationError = useMemo(() => {
    if (protocol !== 'asterdex') return null;
    if (estimatedAssetQuantity <= 0) {
      return `Invalid Est. quantity`;
    }

    const minQty = Number(tokenInfo?.minQty || 0);
    const maxQty = Number(tokenInfo?.maxQty || 0);

    if (minQty > 0 && estimatedAssetQuantity < minQty) {
      return `Est. quantity ${estimatedAssetQuantity.toFixed(6)} is below AsterDEX minimum (${minQty})`;
    }
    if (maxQty > 0 && estimatedAssetQuantity > maxQty) {
      return `Est. quantity ${estimatedAssetQuantity.toFixed(6)} exceeds AsterDEX maximum (${maxQty})`;
    }
    return null;
  }, [protocol, estimatedAssetQuantity, tokenInfo?.minQty, tokenInfo?.maxQty]);

  const confirmationDescription = useMemo(() => (
    <div className="space-y-4">
      <p className="text-sm text-gray-600 dark:text-gray-400 text-center mb-4">
        Please review your perpetual order details before confirming.
      </p>
      <div className="flex items-start gap-3 p-4 bg-red-100 dark:bg-red-500/10 rounded-xl border border-red-200 dark:border-red-500/20 mt-6">
        <FiAlertTriangle className="w-5 h-5 text-red-600 dark:text-red-500 mt-0.5 shrink-0" />
        <p className="text-xs font-mono text-red-800 dark:text-red-300/90 leading-relaxed text-left">
          {orderMode === 'Live' ? `This order will be executed on the live ${protocol} exchange. Please ensure you have sufficient funds in your ${protocol} account.` :
            orderMode === 'Testnet' ? `This order will be executed on the testnet ${protocol} exchange. Please ensure you have sufficient funds in your testnet ${protocol} account.` :
              'This is demo order for testing purposes. No real trades will be executed'}
        </p>
      </div>
      <div className="flex items-start gap-3 p-4 bg-amber-50 dark:bg-amber-500/10 rounded-xl border border-amber-200 dark:border-amber-500/20 mt-6">
        <FiAlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-500 mt-0.5 shrink-0" />
        <p className="text-xs text-amber-800 dark:text-amber-300/90 leading-relaxed text-left">
          Perpetual trading involves significant risk. Ensure you have sufficient margin to avoid liquidation.
        </p>
      </div>



      <div className="bg-gray-50 dark:bg-white/5 rounded-xl p-5 border border-gray-200 dark:border-white/10 space-y-4 shadow-inner">
        <div className="flex justify-between items-center">
          <span className="text-sm text-gray-500 dark:text-gray-400">Action</span>
          <span className={`text-base font-bold flex items-center gap-1.5 ${isLong ? 'text-emerald-500' : 'text-rose-500'}`}>
            <div className={`w-2 h-2 rounded-full ${isLong ? 'bg-emerald-500' : 'bg-rose-500'}`} />
            {isLong ? 'Long' : 'Short'} {tokenInfo?.symbol}
          </span>
        </div>

        <div className="flex justify-between items-center">
          <span className="text-sm text-gray-500 dark:text-gray-400">Position Size</span>
          <span className="text-base font-bold text-gray-900 dark:text-white">
            {initialOrderSize || '0'} {tokenInfo?.symbol} <span className="text-gray-400 mx-1 font-normal">×</span> {leverage}x
          </span>
        </div>

        <div className="flex justify-between items-center">
          <span className="text-sm text-gray-500 dark:text-gray-400">Strategy</span>
          <span className="text-sm font-bold text-gray-900 dark:text-white px-2.5 py-1 bg-gray-200/50 dark:bg-white/10 rounded-md">
            {selectedStrategy?.name || 'Manual'}
          </span>
        </div>

        <div className="flex justify-between items-center">
          <span className="text-sm text-gray-500 dark:text-gray-400">Orders Count</span>
          <span className="text-sm font-bold text-gray-900 dark:text-white px-2.5 py-1 bg-gray-200/50 dark:bg-white/10 rounded-md">
            {estOrders.length}
          </span>
        </div>

        {(Number(tpPercentage) > 0 || Number(slPercentage) > 0) && (
          <div className="pt-4 mt-2 border-t border-gray-200 dark:border-white/10 space-y-3">
            {Number(tpPercentage) > 0 && (
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-500 dark:text-gray-400">Take Profit</span>
                <span className="text-sm font-bold text-emerald-500">+{tpPercentage}%</span>
              </div>
            )}
            {Number(slPercentage) > 0 && isActiveStopLoss && (
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-500 dark:text-gray-400">Stop Loss</span>
                <span className="text-sm font-bold text-rose-500">-{slPercentage}%</span>
              </div>
            )}
          </div>
        )}
      </div>


    </div>
  ), [isLong, tokenInfo?.symbol, initialOrderSize, orderMode, leverage, selectedStrategy?.name, estOrders.length, tpPercentage, slPercentage, isActiveStopLoss]);

  // ─── Compute readyToSubmit and submitText with useMemo ──────────────
  const { isReady, submitText } = useMemo(() => {
    const withStatus = (isValid: boolean, text: string) => ({ isReady: isValid, submitText: text });

    let _submitText = "Create Order";

    if (selectedStrategy.id === "algo") {
      if (!technicalEntry) {
        return withStatus(false, "Set entry logic");
      }
    } else {
      if (selectedStrategy.id == "sellToken") {
        if (Number(tpPrice) <= 0 || tpPrice === "") {
          return withStatus(false, "Set exit price");
        }
      } else {
        if (Number(entryPrice) <= 0 || entryPrice === "") {
          return withStatus(false, "Set entry price");
        }
      }
    }

    if (Number(initialOrderSize) <= 0 || initialOrderSize == "") {
      return withStatus(false, "Enter valid order size");
    }

    if (leverage <= 0) {
      return withStatus(false, "Set leverage");
    }

    if (leverage > resolvedMaxLeverage) {
      return withStatus(false, `Max leverage ${resolvedMaxLeverage}x`);
    }

    const minQty = Number(tokenInfo?.minQty || 0);
    if (minQty > 0 && estimatedAssetQuantity > 0 && estimatedAssetQuantity < minQty) {
      return withStatus(false, `Minimum quantity ${minQty}`);
    }

    const maxQty = Number(tokenInfo?.maxQty || 0);
    if (maxQty > 0 && estimatedAssetQuantity > maxQty) {
      return withStatus(false, `Maximum quantity ${maxQty}`);
    }

    if (
      isTrailingMode &&
      (slPercentage === 0 ||
        slPercentage.toString() === "" ||
        slPercentage == 100)
    ) {
      return withStatus(false, "Slippage required in trailing mode");
    }

    if (
      isReEntrance &&
      (reEntrancePercentage <= 0 || reEntrancePercentage.toString() === "")
    ) {
      return withStatus(false, "Set re-entrance % in re-entrance mode");
    }

    if (gridNumber < 1 || gridNumber > config.maxGridNumber) {
      return withStatus(false, `Grid must be lower then ${config.maxGridNumber + 1} and not zero`);
    }

    if (selectedStrategy.id == "sellToken") {
      if (Number(tpPrice) <= 0 || tpPrice === "") {
        return withStatus(false, "Enter valid TP price");
      }
    }

    if (tpPercentage <= 0) {
      return withStatus(false, "Set TP percentage");
    }
    if (isActiveStopLoss && slPercentage <= 0) {
      return withStatus(false, "Set SL percentage");
    }

    if (Number(initialOrderSize) <= 0 || initialOrderSize == "") {
      return withStatus(false, "Enter valid order size");
    }

    if (slippage.toString() === "" || slippage <= 0.4) {
      return withStatus(false, "Slippage should be greater then 0.4");
    }

    if (estimatedUsdValue < config.minimumOrderSize) {
      return withStatus(false, `Minimum order size $${config.minimumOrderSize} `);
    }

    if (
      ["limit", "scalp", "algo"].includes(selectedStrategy.id) &&
      gridNumber !== 1
    ) {
      return withStatus(false, "Order configuration not metch refresh please");
    }

    if (gridNumber.toString() === "" || gridNumber === 0) {
      return withStatus(false, "Order configuration not metch refresh please");
    }

    if (Number(gridNumber) > 1) {
      if (
        gridDistance <= 0 ||
        gridMultiplier <= 0 ||
        orderSizeMultiplier <= 0 ||
        gridDistance.toString() === "" ||
        gridMultiplier.toString() === "" ||
        orderSizeMultiplier.toString() === ""
      ) {
        return withStatus(false, "Set valid grid configuration");
      } else {
        if (
          selectedStrategy.id != "sellToken" &&
          negativeGridDecrementalPriceProtection()
        ) {
          return withStatus(false, "Grid multiplier is too high set negative target");
        }
      }
    }

    if (!isConnected) {
      return withStatus(false, "Connect your wallet");
    }

    if (!orderMode || !(PerpOrderModes.map((mode: any) => mode.label)).includes(orderMode)) {
      return withStatus(false, "Select valid order mode");
    }

    if (!isOrderNameValidate || orderName.trim() === "") {
      return withStatus(false, "set Unique name");
    }

    const hasAssignedWallets = Object.values(gridsByWallet).some(
      (w: any) => w && (w._id || w.address),
    );
    if (hasAssignedWallets && !perpAccountGateOk) {
      return withStatus(false, "Approve Agent & Deposit First");
    }


    const selectedWalletIds = Object.values(gridsByWallet).map((w: any) => w._id);
    const uniqueWallets = Array.from(new Set(selectedWalletIds));

    if (selectedStrategy.id == 'multiScalp' && Number(gridNumber) !== Number(uniqueWallets.length)) {
      return withStatus(false, `Select ${Number(gridNumber)} wallets`);
    }

    if (!areWalletsReady) {
      return withStatus(false, "Select wallet");
    }

    if (showFeeTokenSelector && !feeToken?.address) {
      return withStatus(false, "Select fee token");
    }

    if (showFeeTokenSelector && feeTokenPrice <= 0) {
      return withStatus(false, "Fee token price unavailable");
    }


    const currentProtocol = protocol?.toLowerCase();
    const currentIndexToken = (
      tokenInfo?.address ||
      tokenInfo?.symbol ||
      ""
    ).toLowerCase();

    for (const walletId of uniqueWallets) {
      const walletOrders = userPrevOrders.filter(
        (o: any) =>
          isActiveClientOrder(o) &&
          o.category?.toLowerCase() === "perpetual" &&
          (o.wallet?._id === walletId || o.wallet === walletId) &&
          getOrderIndexTokenAddress(o)?.toLowerCase() === currentIndexToken &&
          (o?.perp?.protocol)?.toLowerCase() === currentProtocol,
      );

      if (currentProtocol === "hyperliquid") {
        if (walletOrders.length > 0) {
          return withStatus(false, `Hyperliquid: Only 1 position allowed per asset per wallet`);
        }
      } else if (currentProtocol === "asterdex") {
        const sameDirectionCount = walletOrders.filter(
          (o: any) => getOrderPerpetual(o)?.isLong === isLong,
        ).length;
        if (sameDirectionCount >= 1) {
          return withStatus(false, `Asterdex: Max 1 ${isLong ? "Long" : "Short"} position allowed per wallet`);
        }
      }
    }

    return withStatus(true, _submitText);
  }, [
    selectedStrategy.id,
    technicalEntry,
    tpPrice,
    entryPrice,
    initialOrderSize,
    leverage,
    resolvedMaxLeverage,
    tokenInfo,
    estimatedAssetQuantity,
    isTrailingMode,
    slPercentage,
    isReEntrance,
    reEntrancePercentage,
    gridNumber,
    gridDistance,
    gridMultiplier,
    orderSizeMultiplier,
    negativeGridDecrementalPriceProtection,
    isConnected,
    orderMode,
    isOrderNameValidate,
    orderName,
    gridsByWallet,
    perpAccountGateOk,
    areWalletsReady,
    showFeeTokenSelector,
    feeToken,
    feeTokenPrice,
    userPrevOrders,
    protocol,
    isLong,
    estimatedUsdValue,
    tpPercentage,
    isActiveStopLoss,
    slippage,
  ]);

  // ─── No effect needed for readyToSubmit; we set it in useMemo ──────
  const readyToSubmitOrder = isReady;

  // ========================================================================
  // Order Management Handlers
  // ========================================================================

  const handleUpdateOrder = useCallback((orderId: string, updatedOrder: any) => {
    setEstOrders((prev) =>
      prev.map((order, index) => {
        const idFromTable = order._id || `temp-${order.sl}-${index}`;
        const idFromEdit = order._id || `temp-${order.sl}`;
        if (idFromTable === orderId || idFromEdit === orderId) {
          return updatedOrder;
        }
        return order;
      }),
    );
  }, []);

  const handleDeleteOrder = useCallback((orderId: string) => {
    setEstOrders((prev) =>
      prev.filter((order, index) => {
        const idFromTable = order._id || `temp-${order.sl}-${index}`;
        const idFromEdit = order._id || `temp-${order.sl}`;
        return idFromTable !== orderId && idFromEdit !== orderId;
      }),
    );
  }, []);

  // ========================================================================
  // Order Submission
  // ========================================================================

  const handleOrderSubmit = useCallback(async () => {
    setCreationPending(true);

    try {
      const entryType = getEntryType(technicalEntry);
      const orderParams = {
        gridNumber,
        targetPrice: entryPrice,
        activeStopLoss: isActiveStopLoss,
        entryLogic: entryType === "logic" ? technicalEntry : null,
        entryWeight: entryType === "weight" ? technicalEntry : null,
        entryType,
        mode: orderMode,
        orderSizeMultiplier,
        initialOrderSize,
        gridMultiplier,
        gridDistance,
        collateralToken,
        outputToken,
        orderToken: tokenInfo,
        priority,
        executionSpeed,
        orderName,
        strategy: selectedStrategy.id,
        chainId,
        isTrailingMode,
        tpPrice,
        tpPercentage,
        slPercentage,
        isReEntrance,
        reEntrancePercentage,
        slippage,
        leverage,
        isLong,
        protocol,
        indexTokenAddress: tokenInfo.symbol,
        feeToken,
      };

      const result = await submitOrderRef.current({
        orderParams,
        gridsByWallet,
        estOrders,
        areWalletsReady,
        category: "perpetual",
        user,
      });

      if (result.added === true) {
        setGridNumber(1);
        setEstOrders([]);
        setInitialOrderSize("");
        setOrderName("");
        setTechnicalEntry(null);
        setIsConfirmationOpen(false);
        setIsOrderNameValidate(false);
      }
    } catch {
      // silent
    } finally {
      setCreationPending(false);
    }
  }, [
    gridNumber,
    entryPrice,
    isActiveStopLoss,
    technicalEntry,
    orderMode,
    orderSizeMultiplier,
    initialOrderSize,
    gridMultiplier,
    gridDistance,
    collateralToken,
    outputToken,
    tokenInfo,
    priority,
    executionSpeed,
    orderName,
    selectedStrategy.id,
    chainId,
    isTrailingMode,
    tpPrice,
    tpPercentage,
    slPercentage,
    isReEntrance,
    reEntrancePercentage,
    slippage,
    leverage,
    orderMode,
    isLong,
    protocol,
    feeToken,
    gridsByWallet,
    estOrders,
    areWalletsReady,
    user,
  ]);

  // ========================================================================
  // Order Configuration Effect
  // ========================================================================

  useEffect(() => {
    const shouldConfigureOrder = () => {
      if (selectedStrategy.id === "algo") {
        if (!technicalEntry) {
          return false;
        }
      } else {
        if (selectedStrategy.id == "sellToken") {
          if (Number(debouncedTpPrice) <= 0 || debouncedTpPrice === "") {
            return false;
          }
        } else {
          if (Number(entryPrice) <= 0 || entryPrice === "") {
            return false;
          }
        }
      }

      if (
        !initialOrderSize ||
        !debouncedInitialOrderSize ||
        Number(debouncedInitialOrderSize) <= 0 ||
        debouncedInitialOrderSize == ""
      ) {
        return false;
      }
      return true;
    };

    if (shouldConfigureOrder()) {
      const targetPx =
        selectedStrategy.id === "sellToken"
          ? tpPrice
          : entryPrice;
      const entryType = getEntryType(technicalEntry);
      const orderConfig: any = {
        gridNumber,
        mode: orderMode,
        targetPrice: targetPx,
        activeStopLoss: isActiveStopLoss,
        entryLogic: entryType === "logic" ? technicalEntry : null,
        entryWeight: entryType === "weight" ? technicalEntry : null,
        entryType,
        orderSizeMultiplier,
        initialOrderSize,
        gridMultiplier,
        gridDistance,
        collateralToken,
        outputToken,
        orderToken: {
          ...tokenInfo
        },
        priority,
        executionSpeed,
        orderName,
        strategy: selectedStrategy.id,
        chainId,
        isTrailingMode,
        tpPercentage,
        slPercentage,
        isReEntrance,
        reEntrancePercentage,
        slippage,
        leverage,
        isLong,
        protocol,
        feeToken,
        feeTokenPrice,
        collateralPrice,
        feeTokenRequired: showFeeTokenSelector,
        user
      };
      // Call through the ref, not the hook value directly — this is what
      // keeps configurePerpOrder's (possibly unstable) identity out of the
      // dependency array below.
      const _estOrders = configurePerpOrderRef.current(orderConfig);
      setEstOrders((prev) => (areOrderListsEqual(prev, _estOrders) ? prev : _estOrders));
    } else {
      setEstOrders((prev) => (prev.length === 0 ? prev : []));
    }
  }, [
    debouncedInitialOrderSize,
    debouncedEntryPrice,
    debouncedTpPrice,
    technicalEntry,
    orderName,
    gridNumber,
    gridDistance,
    gridMultiplier,
    orderSizeMultiplier,
    isTrailingMode,
    isReEntrance,
    reEntrancePercentage,
    tpPercentage,
    slPercentage,
    orderMode,
    slippage,
    collateralToken,
    outputToken,
    feeToken,
    feeTokenPrice,
    selectedStrategy,
    priority,
    orderMode,
    executionSpeed,
    collateralPrice,
    isLong,
    leverage,
    showFeeTokenSelector,
    protocol,
    tokenInfo,
    isActiveStopLoss,
    user,
  ]);

  const MemoizedWalletSelector = useMemo(
    () => (
      <PerpAccountSelect
        protocol={protocol}
        category={'perpetual'}
        orders={userPrevOrders}
        availableWallets={userWallets}
        gridsByWallet={gridsByWallet}
        setGridsByWallet={setGridsByWallet}
        orderMode={orderMode}
        areWalletsReady={areWalletsReady}
        setWalletsReady={setWalletsReady}
        chainId={chainId}
        collateralToken={collateralToken}
        selectedStrategy={selectedStrategy}
        estOrders={estOrders}
        user={user}
        feeToken={showFeeTokenSelector ? feeToken : undefined}
        onPerpTradeGateChange={setPerpAccountGateOk}
        isFeeExempt={isFeeExempt}
      />
    ),
    [
      estOrders,
      userPrevOrders,
      userWallets,
      protocol,
      orderMode,
      selectedStrategy,
      chainId,
      collateralToken,
      feeToken,
      gridsByWallet,
      areWalletsReady,
      showFeeTokenSelector,
    ],
  );

  const showModeSelector = shouldCreateDemoTestnet(config.userLevels, user?.status);


  // ========================================================================
  // Render
  // ========================================================================

  return (
    <div className="bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-800 rounded-xl shadow-lg p-1 sm:p-3 lg:p-4 space-y-2 md:space-y-4 max-w-2xl mx-auto h-full flex flex-col">
      {/* Strategy Selection */}
      <div className="relative">
        <div
          className="bg-gray-50 dark:bg-gray-900 p-4 rounded-xl border border-gray-100 dark:border-gray-800 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 transition-all"
          onClick={() => setShowStrategyDropdown(!showStrategyDropdown)}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {selectedStrategy.icon}
              <div>
                <div className="flex gap-1 items-center">
                  <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-100">
                    {selectedStrategy.name}
                  </h3>
                  <div
                    className={`px-2 py-0.5 text-xs rounded-full ${selectedStrategy.type === "Basic"
                      ? "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200"
                      : selectedStrategy.type === "Premium"
                        ? "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200"
                        : "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                      }`}
                  >
                    {selectedStrategy.type}
                  </div>
                </div>
                <p className="text-xs xl:text-sm text-gray-600 dark:text-gray-300">
                  {selectedStrategy.description}
                </p>
              </div>
            </div>
            <FiChevronDown
              className={`w-5 h-5 text-gray-500 transition-transform ${showStrategyDropdown ? "rotate-180" : ""
                }`}
            />
          </div>
        </div>

        {showStrategyDropdown && (
          <div className="absolute top-full h-[400px] left-0 right-0 mt-2 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-800 shadow-lg z-50 overflow-y-auto">
            {PerpetualStrategies.map((strategy) => (
              <div
                key={strategy.id}
                onClick={() => handleStrategyChange(strategy)}
                className={`p-4 cursor-pointer transition-all ${selectedStrategy.id === strategy.id
                  ? "bg-blue-50 dark:bg-gray-700"
                  : "hover:bg-gray-50 dark:hover:bg-gray-700"
                  }`}
              >
                <div className="flex items-center gap-3">
                  {strategy.icon}
                  <div>
                    <div className="flex gap-1 items-center">
                      <h3 className="font-semibold text-gray-800 dark:text-gray-100">
                        {strategy.name}
                      </h3>
                      <div
                        className={`px-2 py-0.5 text-xs rounded-full ${strategy.type === "Basic"
                          ? "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200"
                          : strategy.type === "Premium"
                            ? "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200"
                            : "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                          }`}
                      >
                        {strategy.type}
                      </div>
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-300">
                      {strategy.description}
                    </p>
                  </div>
                </div>
                <div className="mt-2 pl-8">
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    <span className="font-medium text-gray-700 dark:text-gray-300">
                      Features:
                    </span>{" "}
                    {strategy.features?.join(" • ") || ""}
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    <span className="font-medium text-gray-700 dark:text-gray-300">
                      Recommended for:
                    </span>{" "}
                    {strategy.recommendedFor || ""}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="w-full grow overflow-y-auto space-y-2 scrollbar-track-transparent [&::-webkit-scrollbar]:w-1 [&::-webkit-scrollbar-track]:bg-gray-200 dark:[&::-webkit-scrollbar-track]:bg-gray-600 [&::-webkit-scrollbar-thumb]:bg-white dark:[&::-webkit-scrollbar-thumb]:bg-gray-800 [&::-webkit-scrollbar-thumb]:rounded-full">
        <div className="bg-gray-50 dark:bg-gray-900 p-3 2xl:p-6 rounded-xl space-y-3 md:space-y-4 border border-gray-100 dark:border-gray-800">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <h3 className="font-semibold text-gray-800 dark:text-gray-100 text-lg">
                Perp Settings
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Configure future order settings
              </p>
            </div>
            {/* Order Mode Selector */}

            <OrderModeSelector orderMode={orderMode} setOrderMode={setOrderMode} isSpot={false} isSupporteduser={showModeSelector} />

          </div>

          <div className="mb-2 md:mb-4">
            <div className="bg-gray-50 dark:bg-gray-800 p-1 sm:p-1.5 rounded-xl flex gap-1 sm:gap-2 shadow-sm">
              <button
                className={`flex-1 py-2 sm:py-3 rounded-lg font-medium text-sm sm:text-base transition-all duration-200
            ${isLong
                    ? "bg-green-500 text-white shadow-lg scale-[1.02] hover:bg-green-600"
                    : "text-gray-600 hover:bg-gray-100/80"
                  }`}
                onClick={() => setIsLong(true)}
              >
                Long Position
              </button>
              <button
                className={`flex-1 py-2 sm:py-3 rounded-lg font-medium text-sm sm:text-base transition-all duration-200
            ${isLong === false
                    ? "bg-red-500 text-white shadow-lg scale-[1.02] hover:bg-red-600"
                    : "text-gray-600 hover:bg-gray-100/80"
                  }`}
                onClick={() => setIsLong(false)}
              >
                Short Position
              </button>
            </div>
          </div>

          <LeverageInput
            leverage={leverage}
            onLeverageChange={setLeverage}
            maxLeverage={resolvedMaxLeverage}
          />

          <div className="grid xl:grid-cols-2 gap-4">
            <div className="space-y-1 md:space-y-2">
              <label className="flex items-center text-sm font-medium text-gray-700 dark:text-gray-200">
                Margin Type
                <InfoTooltip
                  id={`MarginType-tooltip`}
                  content={"Order Margin type"}
                />
              </label>
              <div className="flex gap-2 font-bold text-md">ISOLATED</div>
            </div>
            <div className="space-y-1 md:space-y-2">
              <label className="flex items-center text-sm font-medium text-gray-700 dark:text-gray-200">
                Position Mode
                <InfoTooltip
                  id={`PositionMode-tooltip`}
                  content={"Order Margin type"}
                />
              </label>
              <div className="flex gap-2 font-bold text-md">ONE WAY</div>
            </div>
          </div>
          {estLiquidationPriceUsd != null &&
            estLiquidationPriceUsd > 0 &&
            entryForLiquidationUsd > 0 && (
              <div className="mt-3 p-3 rounded-lg border border-amber-200/80 dark:border-amber-700/50 bg-amber-50/80 dark:bg-amber-900/20">
                <div className="text-xs font-medium text-amber-900 dark:text-amber-200">
                  Est. liquidation (isolated, maint. {EST_PERP_MAINTENANCE_BPS}{" "}
                  bps): $
                  {displayNumber(estLiquidationPriceUsd)}
                </div>
              </div>
            )}
        </div>

        <div className="bg-gray-50 dark:bg-gray-900 p-3 2xl:p-6 rounded-xl space-y-3 md:space-y-4 border border-gray-100 dark:border-gray-800">
          <div className="space-y-1 md:space-y-2">
            <h3 className="font-semibold text-gray-800 dark:text-gray-100 text-lg">
              Initial Setup
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Configure your base trading parameters
            </p>
          </div>

          {selectedStrategy.id != "sellToken" && (
            <div>
              {selectedStrategy.id === "algo" ? (
                <TechnicalEntry
                  technicalEntries={technicalEntry}
                  setTechnicalEntries={setTechnicalEntry}
                  title={"Technical Entry condition"}
                  isPerp={true}
                  isAdvancedSymbol={isAdvancedSymbol}
                />
              ) : (
                <EntryPriceRendering
                  setEntryPrice={setEntryPrice}
                  label={"Entry Price"}
                  tooltipText={"Price at which to enter the position"}
                  tokenInfo={tokenInfo}
                  currentPriceUsd={liveTokenPriceUsd}
                />
              )}
            </div>
          )}

          <div className="space-y-1 md:space-y-2">
            <label className="flex items-center text-sm font-medium text-gray-700 dark:text-gray-200">
              {Number(gridNumber) > 1 && orderSizeMultiplier > 1 && "Initial"} Order Size
              <InfoTooltip
                id="order-size-tooltip"
                content="The initial size of your order"
              />
            </label>
            <div className="relative">
              <div
                className={`relative flex focus-within:ring-2 focus-within:ring-blue-500 focus-within:rounded-lg bg-white dark:bg-gray-800 px-1 border ${user?.status !== "admin" &&
                  initialOrderSize &&
                  estimatedUsdValue < config.minimumOrderSize
                  ? "border-red-200 dark:border-red-700"
                  : "border-gray-200 dark:border-gray-700"
                  } rounded-lg`}
              >
                <input
                  type="number"
                  min="0"
                  onWheel={(e: any) => e.target.blur()}
                  value={initialOrderSize}
                  onChange={(e) => handleOrderSize(e.target.value)}
                  className="w-full placeholder:text-sm px-3 md:px-4 py-2 md:py-3 transition-all outline-none rounded-r-none border-r-0 bg-transparent text-gray-900 dark:text-white"
                  placeholder="Enter Amount"
                />
                <div className="relative flex items-center pr-1">
                  <div className="flex items-center gap-1 text-gray-900 dark:text-gray-200 px-2">
                    <img
                      src={collateralToken.imageUrl}
                      className="w-4 h-4 rounded-full"
                      alt={collateralToken.symbol}
                    />
                    <span>{collateralToken.symbol}</span>
                  </div>
                </div>
              </div>

              {initialOrderSize && (
                <div
                  className={`mt-1 text-xs text-right px-1 ${estimatedUsdValue < config.minimumOrderSize
                    ? "text-red-500 font-medium"
                    : "text-gray-500 dark:text-gray-400"
                    }`}
                >
                  {estimatedUsdValue < config.minimumOrderSize && (
                    <span className="mr-2">Min. order ${config.minimumOrderSize} USD</span>
                  )}
                  ≈ $
                  {estimatedUsdValue.toLocaleString(undefined, {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </div>
              )}
            </div>

            {qtyValidationError && (
              <div className="flex items-start gap-2 mt-1.5 px-3 py-2 bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/30 rounded-lg">
                <FiAlertTriangle className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 mt-0.5 shrink-0" />
                <span className="text-xs text-amber-700 dark:text-amber-300 leading-relaxed">
                  {qtyValidationError}
                </span>
              </div>
            )}

            {showFeeTokenSelector && feeToken && (
              <div className="space-y-1 md:space-y-2 mt-2">
                <label className="flex items-center text-sm font-medium text-gray-700 dark:text-gray-200">
                  Fee Token
                  <InfoTooltip
                    id="fee-token-tooltip"
                    content="Pulse fee will be collected in this token."
                  />
                </label>
                <DropDown
                  options={feeTokenDropdownOptions}
                  onChange={setFeeToken}
                  value={feeToken}
                />
              </div>
            )}
          </div>

          <OrderNameValidationInput
            name={orderName}
            onChange={setOrderName}
            isOrderNameValidate={isOrderNameValidate}
            setIsOrderNameValidate={setIsOrderNameValidate}
            isConnected={isConnected}
          />
        </div>

        {!["limit", "scalp", "algo"].includes(selectedStrategy.id) && (
          <div className="bg-gray-50 dark:bg-gray-900 p-3 2xl:p-6 rounded-xl space-y-3 md:space-y-4 border border-gray-100 dark:border-gray-800">
            <div className="space-y-1 md:space-y-2">
              <h3 className="font-semibold text-gray-800 dark:text-gray-100 text-lg">
                Grid Configuration
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Configure your grid trading parameters
              </p>
            </div>

            <div className="grid xl:grid-cols-2 gap-2">
              <GridInput
                gridValue={gridNumber}
                onChange={setGridNumber}
                user={user}
                maxGridNumber={config.maxGridNumber}
              />
              <NumberInput
                inputLabel="Grid Distance"
                toolTipMessage="Percentage distance between each grid level"
                value={gridDistance}
                onChange={setGridDistance}
                notValid={Number(gridNumber) > 1 && (gridDistance === 0 || !gridDistance)}
              />
            </div>
            {selectedStrategy.id != "dca" && (
              <div className="grid xl:grid-cols-2 gap-4">
                <NumberInput
                  inputLabel="Grid Multiplier"
                  toolTipMessage="Multiplier for increasing grid size at each level"
                  value={gridMultiplier}
                  onChange={setGridMultiplier}
                  notValid={Number(gridNumber) > 1 && (gridMultiplier === 0 || !gridMultiplier)}
                />
                <NumberInput
                  inputLabel="Collateral Multiplier"
                  toolTipMessage="Multiplier for increasing collateral at each grid level"
                  value={orderSizeMultiplier}
                  onChange={setOrderSizeMultiplier}
                  notValid={Number(gridNumber) > 1 && (orderSizeMultiplier === 0 || !orderSizeMultiplier)}
                />
              </div>
            )}
          </div>
        )}

        <div className="bg-gray-50 dark:bg-gray-900 p-3 2xl:p-6 rounded-xl space-y-3 md:space-y-4 border border-gray-100 dark:border-gray-800">
          <div className="space-y-1 md:space-y-2">
            <h3 className="font-semibold text-gray-800 dark:text-gray-100 text-lg">
              Risk Management
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Configure your risk management parameters
            </p>
          </div>

          {selectedStrategy.id != "sellToken" && (
            <TakeProfitInput
              takeProfitPercentage={tpPercentage}
              onTakeProfitPercentageChange={setTpPercentage}
              isTrailingMode={isTrailingMode}
              handleTrailingMode={handleTrailingMode}
              initialOrderSize={initialOrderSize}
              collateralToken={collateralToken}
              trailingMode={true}
            />
          )}

          {selectedStrategy.id != "sellToken" && (
            <StopLossInput
              isActive={isActiveStopLoss}
              setIsActive={setIsActiveStopLoss}
              isTrailingMode={isTrailingMode}
              stopLossPercentage={slPercentage}
              setStopLossPercentage={setSlPercentage}
              notValid={isTrailingMode && slPercentage === 0}
            />
          )}

          {selectedStrategy.id == "sellToken" && (
            <EntryPriceRendering
              setEntryPrice={setTpPrice}
              label={"Exit Price"}
              tooltipText={"Price at which to exit the position"}
              tokenInfo={tokenInfo}
              currentPriceUsd={liveTokenPriceUsd}
            />
          )}

          <SlippageInput slippage={slippage} onChange={setSlippage} />

          {selectedStrategy.id != "sellToken" && (
            <ReEntranceInput
              isReEntrance={isReEntrance}
              setIsReEntrance={setIsReEntrance}
              reEntrancePercentage={reEntrancePercentage}
              setReEntrancePercentage={setReEntrancePercentage}
            />
          )}

          <div className="space-y-1 md:space-y-2">
            <label className="flex items-center text-sm font-medium text-gray-700 dark:text-gray-200">
              Output Token
              <InfoTooltip
                id="output-token-tooltip"
                content="The token you'll receive when closing positions"
              />
            </label>
            <div className="relative">
              <DropDown
                options={chainCollateralOptions}
                onChange={setOutputToken}
                value={outputToken}
              />
            </div>
          </div>
        </div>

        <div className="bg-gray-50 dark:bg-gray-900 p-3 2xl:p-6 rounded-xl space-y-3 md:space-y-4 border border-gray-100 dark:border-gray-800">
          {estOrders.length > 0 && user?.account && MemoizedWalletSelector}
        </div>
      </div>

      {isConnected == false ? (
        <div className="flex gap-0.5 items-center">
          {estOrders.length > 0 && (
            <button
              className="w-8 py-3 md:py-4 rounded-s-xl bg-blue-500 font-bold text-white transition-all transform hover:scale-[1.02] flex justify-center items-center cursor-pointer"
              onClick={() => setOpenEstimatedOrderModal(true)}
            >
              📋
            </button>
          )}
          <button
            className={`grow py-3 md:py-4 ${estOrders.length > 0 ? "rounded-e-xl" : "rounded-xl"
              } bg-gray-50 dark:bg-gray-900 font-bold text-black dark:text-white transition-all transform hover:scale-[1.02] cursor-pointer`}
          >
            Connect Wallet
          </button>
        </div>
      ) : (
        <div className="flex gap-0.5 items-center">
          {estOrders.length > 0 && (
            <button
              className="w-8 py-3 md:py-4 rounded-s-xl bg-blue-500 font-bold text-white transition-all transform hover:scale-[1.02] flex justify-center items-center cursor-pointer"
              onClick={() => setOpenEstimatedOrderModal(true)}
            >
              📋
            </button>
          )}
          <button
            disabled={
              !areWalletsReady ||
              estOrders.length === 0 ||
              creationPending ||
              !readyToSubmitOrder
            }
            onClick={() => setIsConfirmationOpen(true)}
            className={`grow py-3 md:py-4 ${estOrders.length > 0 ? "rounded-e-xl" : "rounded-xl"
              } ${!areWalletsReady ||
                estOrders.length === 0 ||
                creationPending ||
                !readyToSubmitOrder
                ? "bg-blue-200 dark:bg-blue-900/30 pointer-events-none opacity-50"
                : "bg-blue-500 hover:bg-blue-600"
              } font-bold text-gray-800 dark:text-gray-50 transition-all transform hover:scale-[1.02] cursor-pointer`}
          >
            {creationPending ? "Creating..." : submitText}
          </button>
        </div>
      )}

      {openEstOrderModal && estOrders.length > 0 && (
        <EstSpotOrders
          selectedStrategy={selectedStrategy}
          onUpdateOrder={handleUpdateOrder}
          onDeleteOrder={handleDeleteOrder}
          estOrders={estOrders}
          onClose={() => setOpenEstimatedOrderModal(false)}
          gridsByWallet={gridsByWallet}
          collateralToken={collateralToken}
          chainId={chainId}
          indexTokenInfo={tokenInfo}
        />
      )}

      {isConfirmationOpen && (
        <ConfirmationModal
          isOpen={isConfirmationOpen}
          onClose={() => setIsConfirmationOpen(false)}
          onConfirm={handleOrderSubmit}
          title="Create order"
          description={confirmationDescription}
          confirmText="Confirm"
          cancelText="Cancel"
          variant="default"
        />
      )}
    </div>
  );
}