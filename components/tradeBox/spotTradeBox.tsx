import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { OrderType, OrderTokenType, TechnicalLogicType, TechnicalWeightsType } from "@/type/order";

import { MIN_ORDER_SIZE, MAX_GRID_NUMBER } from "@/constants/common/order";
import { CollateralTokens } from "@/constants/common/tokens";
import { SpotStrategies, SpotOrderModes } from "@/constants/common/frontend";
import { FiChevronDown, FiAlertTriangle } from "react-icons/fi";
import { ZeroAddress } from "ethers";

//components
import TechnicalEntry from "./TradeBoxCommon/TechnicalEntry";
import InfoTooltip from "./TradeBoxCommon/BoxTooltip";
import DropDown from "./TradeBoxCommon/BoxDropdown";
import TakeProfitInput from "./TradeBoxCommon/TakeProfit";
import StopLossInput from "./TradeBoxCommon/StopLoss";
import SlippageInput from "./TradeBoxCommon/SlippageTolarence";
import ReEntranceInput from "./TradeBoxCommon/ReEntrance";
import OrderPriority from "./TradeBoxCommon/OrderPriority";
import EntryPriceRendering from "./TradeBoxCommon/EntryPriceRendering";
import OrderNameValidationInput from "./TradeBoxCommon/orderNameValidation";
import GridInput from "./TradeBoxCommon/GridInput";
import NumberInput from "./TradeBoxCommon/NumberInput";
import EstSpotOrders from "@/components/order/estimate/estSpotOrder";
import SelectWallet from "@/components/walletManager/selection/spotWalletSelect";
import ConfirmationModal from "../common/Confirmation/ConfirmationBox";
import OrderModeSelector from "./TradeBoxCommon/OrderModeSelector";

// hook
import { useOrder } from "@/hooks/useOrder";
import { useDebounce } from "@/hooks/useDebounce";

//library
import { getTokenPrices } from "@/lib/oracle/spotTokenPrice";
import type { MarketSnapshotRef, StableMarketTokenInfo } from "@/type/market";
import {
  shouldCreateDemoTestnet,
} from "@/utility/orderUtility";

interface GridsByWallet {
  [walletIndex: number]: any;
}

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

interface spotTradeBoxProps {
  tokenInfo: StableMarketTokenInfo;
  chainId: number;
  isConnected: boolean;
  user?: any;
  userWallets?: any[];
  userPrevOrders?: any[];
  marketSnapshotRef?: MarketSnapshotRef;
}

const areEqualSpotTradeBoxProps = (
  previous: spotTradeBoxProps,
  next: spotTradeBoxProps,
) => {
  return (
    previous.chainId === next.chainId &&
    previous.isConnected === next.isConnected &&
    previous.user === next.user &&
    previous.userWallets === next.userWallets &&
    previous.userPrevOrders === next.userPrevOrders &&
    previous.marketSnapshotRef === next.marketSnapshotRef &&
    previous.tokenInfo === next.tokenInfo
  );
};

export default memo(SpotTradeBox, areEqualSpotTradeBoxProps);

function SpotTradeBox({
  tokenInfo,
  chainId,
  isConnected,
  user,
  userWallets = [],
  userPrevOrders = [],
  marketSnapshotRef,
}: spotTradeBoxProps) {
  const { configureSpotOrder, submitOrder } = useOrder();

  // UI State
  const [showStrategyDropdown, setShowStrategyDropdown] = useState(false);
  const [openEstOrderModal, setOpenEstimatedOrderModal] = useState(false);
  const [isConfirmationOpen, setIsConfirmationOpen] = useState(false);
  const [creationPending, setCreationPending] = useState(false);

  // Strategy & Token State
  const [selectedStrategy, setSelectedStrategy] = useState(SpotStrategies[0]);
  const [collateralToken, setCollateralToken] = useState<any>(
    CollateralTokens[chainId]?.[ZeroAddress] || Object.values(CollateralTokens[chainId] || {})[0],
  );
  const [outputToken, setOutputToken] = useState<any>(
    CollateralTokens[chainId]?.[ZeroAddress] || Object.values(CollateralTokens[chainId] || {})[0],
  );
  const [collateralPrice, setCollateralPrice] = useState<number>(0);
  const [orderMode, setOrderMode] = useState<"Live" | "Demo" | "Testnet">('Live');

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
  const [priority, setPriority] = useState<number>(2);
  const executionSpeed = "standard";

  // Wallet & Order State
  const [gridsByWallet, setGridsByWallet] = useState<GridsByWallet>({});
  const [areWalletsReady, setWalletsReady] = useState<boolean>(false);
  const [estOrders, setEstOrders] = useState<OrderType[]>([]);
  const feeToken = collateralToken; // spot fee token is always collateral
  const [liveTokenPriceUsd, setLiveTokenPriceUsd] = useState(
    () => marketSnapshotRef?.current?.priceUsd || tokenInfo?.priceUsd || "",
  );

  // Validation State
  const [isOrderNameValidate, setIsOrderNameValidate] = useState<boolean>(false);

  // ─── Debounced values ──────────────────────────────────────────────────
  const debouncedInitialOrderSize = useDebounce(initialOrderSize, 300) as string;
  const debouncedEntryPrice = useDebounce(entryPrice, 300) as string;
  const debouncedTpPrice = useDebounce(tpPrice, 300) as string;

  // ─── Stabilize configureSpotOrder ──────────────────────────────────────
  const stableConfigureSpotOrder = useCallback(
    (config: any) => configureSpotOrder(config),
    [configureSpotOrder],
  );

  // ─── Grid protection ───────────────────────────────────────────────────
  const negativeGridDecrementalPriceProtection = useCallback(() => {
    if (gridDistance > 0 && gridNumber > 1 && gridMultiplier > 0) {
      let fristCal = gridMultiplier ** (gridNumber - 1) - 1;
      let secounCal = fristCal / (gridMultiplier - 1);
      let lastPercentage = gridDistance * secounCal;
      if (lastPercentage >= 100) return true;
    }
    return false;
  }, [gridDistance, gridNumber, gridMultiplier]);

  // ─── Effects ────────────────────────────────────────────────────────────

  // Sync live market price
  const syncLiveMarketState = useCallback(() => {
    const nextPriceUsd = marketSnapshotRef?.current?.priceUsd || tokenInfo?.priceUsd || "";
    setLiveTokenPriceUsd((prev) => (prev === nextPriceUsd ? prev : nextPriceUsd));
  }, [marketSnapshotRef, tokenInfo?.priceUsd]);

  useEffect(() => {
    syncLiveMarketState();
  }, [syncLiveMarketState, tokenInfo?.address]);

  useEffect(() => {
    if (!marketSnapshotRef) return undefined;
    syncLiveMarketState();
    const intervalId = window.setInterval(syncLiveMarketState, 500);
    return () => window.clearInterval(intervalId);
  }, [marketSnapshotRef, syncLiveMarketState, tokenInfo?.address]);

  // Fetch Collateral Price
  useEffect(() => {
    const fetchCollateralPrice = async () => {
      if (collateralToken.isStable) {
        setCollateralPrice(1);
        return;
      }

      if (
        collateralToken.address.toLowerCase() === tokenInfo?.address?.toLowerCase()
      ) {
        if (liveTokenPriceUsd) {
          setCollateralPrice(Number(liveTokenPriceUsd));
          return;
        }
      }

      try {
        let queryAddress = collateralToken.address;
        if (collateralToken.address === ZeroAddress) {
          const wrappedNative = Object.values(CollateralTokens[chainId] || {}).find(
            (t: any) => t.isWrappedNative,
          ) as any;
          if (wrappedNative) queryAddress = wrappedNative.address;
        }

        const price = await getTokenPrices({ tokenAddress: queryAddress, chainId });
        setCollateralPrice(price || 0);
      } catch {
        setCollateralPrice(0);
      }
    };

    fetchCollateralPrice();
  }, [collateralToken, tokenInfo?.address, liveTokenPriceUsd, chainId]);

  // Combined effect for entry and TP prices
  useEffect(() => {
    const nextPrice = marketSnapshotRef?.current?.priceUsd || tokenInfo?.priceUsd || "";
    setEntryPrice((prev) => (prev && prev !== nextPrice ? nextPrice : prev || nextPrice));
    setTpPrice((prev) => (prev && prev !== nextPrice ? nextPrice : prev || nextPrice));
  }, [marketSnapshotRef?.current?.priceUsd, tokenInfo?.priceUsd]);

  // ─── Network-change reset ─────────────────────────────────────────────
  useEffect(() => {
    const chainTokens = (CollateralTokens[chainId] || {}) as any;
    const tokenList = Object.values(chainTokens) as OrderTokenType[];
    const nativeToken = chainTokens[ZeroAddress] ?? tokenList[0] ?? null;
    setCollateralToken(nativeToken);
    setOutputToken(nativeToken);
  }, [chainId]);

  // ─── Handlers ──────────────────────────────────────────────────────────

  const handleTrailingMode = useCallback((value: boolean) => {
    if (value) {
      setIsActiveStopLoss(true);
      if (slPercentage === 0) setSlPercentage(10);
    }
    setIsTrailingMode(value);
  }, [slPercentage]);

  const handleOrderSize = useCallback((value: string) => {
    setInitialOrderSize(value);
  }, []);

  const handleStrategyChange = useCallback((strategy: (typeof SpotStrategies)[0]) => {
    setSelectedStrategy(strategy);
    setGridNumber(1);
    setShowStrategyDropdown(false);

    if (selectedStrategy.id === "algo" && strategy.id !== "algo") {
      setTechnicalEntry(null);
    }

    if (strategy.id === "sellToken") {
      const tokenFromConstants = Object.values(CollateralTokens[chainId] || {}).find(
        (t: any) => t.address.toLowerCase() === tokenInfo.address?.toLowerCase(),
      ) as any;

      setCollateralToken(
        tokenFromConstants || {
          address: tokenInfo.address,
          name: tokenInfo.name,
          symbol: tokenInfo.symbol,
          decimals: tokenInfo.decimals,
          imageUrl: tokenInfo.imageUrl || "/tokenLogo.png",
        },
      );
    } else {
      setCollateralToken(CollateralTokens[chainId]?.[ZeroAddress] || Object.values(CollateralTokens[chainId] || {})[0]);
    }
  }, [chainId, selectedStrategy.id, tokenInfo]);

  // ─── Computed Values ──────────────────────────────────────────────────

  const estimatedUsdValue = useMemo(() => {
    if (!initialOrderSize || !collateralPrice) return 0;
    return Number(initialOrderSize) * collateralPrice;
  }, [initialOrderSize, collateralPrice]);

  const selectedWalletCount = useMemo(() => {
    const walletKeys = Object.values(gridsByWallet)
      .map((wallet: any) => wallet?._id || wallet)
      .filter(Boolean);
    return new Set(walletKeys).size;
  }, [gridsByWallet]);

  const strategyLabel = useMemo(() => {
    return selectedStrategy?.name || selectedStrategy?.id || "Spot strategy";
  }, [selectedStrategy]);

  // ─── Computed Orders (useMemo + sync effect) ──────────────────────────

  const computedOrders = useMemo(() => {
    const shouldConfigureOrder = () => {
      // Use effective size (raw if debounced is zero)
      const effectiveSize =
        Number(debouncedInitialOrderSize) > 0
          ? debouncedInitialOrderSize
          : initialOrderSize;

      if (selectedStrategy.id === "algo") {
        if (!technicalEntry) return false;
      } else {
        if (selectedStrategy.id === "sellToken") {
          if (Number(debouncedTpPrice) <= 0 || debouncedTpPrice === "") return false;
        } else {
          if (Number(debouncedEntryPrice) <= 0 || debouncedEntryPrice === "") return false;
        }
      }

      if (
        !effectiveSize ||
        Number(effectiveSize) <= 0 ||
        effectiveSize === ""
      ) {
        return false;
      }
      return true;
    };

    if (!shouldConfigureOrder()) {
      return [];
    }

    const effectiveSize =
      Number(debouncedInitialOrderSize) > 0
        ? debouncedInitialOrderSize
        : initialOrderSize;

    const targetPx =
      selectedStrategy.id === "sellToken"
        ? debouncedTpPrice
        : debouncedEntryPrice;
    const entryType = getEntryType(technicalEntry);
    const orderConfig: any = {
      gridNumber,
      targetPrice: targetPx,
      activeStopLoss: isActiveStopLoss,
      entryLogic: entryType === "logic" ? technicalEntry : null,
      entryWeight: entryType === "weight" ? technicalEntry : null,
      entryType,
      mode: orderMode,
      orderSizeMultiplier,
      initialOrderSize: effectiveSize,
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
      tpPrice: debouncedTpPrice,
      slPrice: debouncedEntryPrice,
      tpPercentage,
      slPercentage,
      isReEntrance,
      reEntrancePercentage,
      slippage,
      feeToken,
      collateralPrice,
      orderTokenPrice: liveTokenPriceUsd,
    };

    return stableConfigureSpotOrder(orderConfig);
  }, [
    debouncedInitialOrderSize,
    initialOrderSize,
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
    feeToken,
    selectedStrategy,
    priority,
    executionSpeed,
    collateralPrice,
    liveTokenPriceUsd,
    tokenInfo,
    stableConfigureSpotOrder,
    isActiveStopLoss,
  ]);

  // Sync computed orders to state only when changed
  const prevOrdersRef = useRef<OrderType[]>(computedOrders);

  useEffect(() => {
    const current = JSON.stringify(computedOrders);
    const previous = JSON.stringify(prevOrdersRef.current);
    if (current !== previous) {
      setEstOrders(computedOrders);
      prevOrdersRef.current = computedOrders;
    }
  }, [computedOrders]);

  // ─── Validation & Submit Text ──────────────────────────────────────────

  const { isReady: readyToSubmitOrder, submitText } = useMemo(() => {
    const withStatus = (isValid: boolean, text: string) => ({ isReady: isValid, submitText: text });

    let _submitText = "Create Order";

    if (selectedStrategy.id === "algo") {
      if (!technicalEntry) return withStatus(false, "Set entry logic");
    } else {
      if (selectedStrategy.id === "sellToken") {
        if (Number(tpPrice) <= 0 || tpPrice === "") return withStatus(false, "Set exit price");
      } else {
        if (Number(entryPrice) <= 0 || entryPrice === "") return withStatus(false, "Set entry price");
      }
    }

    const orderSizeValue = initialOrderSize.trim();
    if (orderSizeValue === "" || Number(orderSizeValue) <= 0) {
      return withStatus(false, "Enter valid order size");
    }

    if (isTrailingMode && (slPercentage === 0 || slPercentage.toString() === "" || slPercentage === 100)) {
      return withStatus(false, "Stop loss required in trailing mode");
    }

    if (isReEntrance && (reEntrancePercentage <= 0 || reEntrancePercentage.toString() === "")) {
      return withStatus(false, "Set re-entrance % in re-entrance mode");
    }

    if (gridNumber < 1 || gridNumber > MAX_GRID_NUMBER) {
      return withStatus(false, `Grid must be lower then ${MAX_GRID_NUMBER + 1} and not zero`);
    }

    if (tpPercentage <= 0) return withStatus(false, "Set TP percentage");
    if (isActiveStopLoss && slPercentage <= 0) return withStatus(false, "Set SL percentage");

    if (slippage.toString() === "" || slippage <= 0.4) {
      return withStatus(false, "Slippage should be greater then 0.4");
    }

    if (estimatedUsdValue < MIN_ORDER_SIZE) {
      return withStatus(false, `Minimum order size $${MIN_ORDER_SIZE} `);
    }

    if (["limit", "scalp", "algo"].includes(selectedStrategy.id) && gridNumber !== 1) {
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
        if (selectedStrategy.id !== "sellToken" && negativeGridDecrementalPriceProtection()) {
          return withStatus(false, "Grid multiplier is too high set negative target");
        }
      }
    }

    if (!isConnected) return withStatus(false, "Connect your wallet");

    if (!orderMode || !(SpotOrderModes.map((mode: any) => mode.label)).includes(orderMode)) {
      return withStatus(false, "Select valid order mode");
    }

    if (!isOrderNameValidate || orderName.trim() === "") {
      return withStatus(false, "Set unique name");
    }

    if (!areWalletsReady) return withStatus(false, "Select wallet");

    return withStatus(true, _submitText);
  }, [
    selectedStrategy.id,
    technicalEntry,
    tpPrice,
    entryPrice,
    initialOrderSize,
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
    areWalletsReady,
    estimatedUsdValue,
    tpPercentage,
    isActiveStopLoss,
    slippage,
  ]);

  // ─── Order Management Handlers ────────────────────────────────────────

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

  // ─── Order Submission ──────────────────────────────────────────────────

  const handleOrderSubmit = useCallback(async () => {
    setCreationPending(true);
    try {
      const entryType = getEntryType(technicalEntry);
      const orderParams = {
        gridNumber,
        targetPrice: selectedStrategy.id === "sellToken" ? tpPrice : entryPrice,
        activeStopLoss: isActiveStopLoss,
        entryLogic: entryType === "logic" ? technicalEntry : null,
        entryWeight: entryType === "weight" ? technicalEntry : null,
        entryType,
        orderSizeMultiplier,
        initialOrderSize,
        gridMultiplier,
        gridDistance,
        mode: orderMode,
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
        slPrice: entryPrice,
        tpPercentage,
        slPercentage,
        isReEntrance,
        reEntrancePercentage,
        slippage,
        indexTokenAddress: tokenInfo.address,
        feeToken,
      };

      const result = await submitOrder({
        orderParams,
        gridsByWallet,
        estOrders,
        areWalletsReady,
        category: "spot",
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
    selectedStrategy.id,
    tpPrice,
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
    chainId,
    isTrailingMode,
    tpPercentage,
    slPercentage,
    isReEntrance,
    reEntrancePercentage,
    slippage,
    feeToken,
    submitOrder,
    gridsByWallet,
    estOrders,
    areWalletsReady,
    user,
  ]);

  // ─── Confirmation Description ──────────────────────────────────────────

  const confirmationDescription = useMemo(
    () => (
      <div className="space-y-4">
        <p className="text-sm text-gray-600 dark:text-gray-400 text-center mb-4">
          Please review your spot order details before confirming.
        </p>

        {/* Mode-specific warning */}
        <div className={`flex items-start gap-3 p-4 rounded-xl border ${orderMode === 'Live'
            ? 'bg-blue-50 dark:bg-blue-500/10 border-blue-200 dark:border-blue-500/20'
            : orderMode === 'Testnet'
              ? 'bg-yellow-50 dark:bg-yellow-500/10 border-yellow-200 dark:border-yellow-500/20'
              : 'bg-red-50 dark:bg-red-500/10 border-red-200 dark:border-red-500/20'
          }`}>
          <FiAlertTriangle className={`w-5 h-5 mt-0.5 shrink-0 ${orderMode === 'Live'
              ? 'text-blue-600 dark:text-blue-400'
              : orderMode === 'Testnet'
                ? 'text-yellow-600 dark:text-yellow-400'
                : 'text-red-600 dark:text-red-400'
            }`} />
          <p className="text-xs font-mono leading-relaxed text-left">
            {orderMode === 'Live'
              ? 'This order will be executed on the live exchange. Please ensure you have sufficient funds in your wallet.'
              : orderMode === 'Testnet'
                ? 'This order will be executed on the testnet exchange. Please ensure you have sufficient funds in your testnet wallet.'
                : 'This is a demo order for testing purposes. No real trades will be executed.'}
          </p>
        </div>

        {/* Slippage & Price Impact Warning */}
        <div className="flex items-start gap-3 p-4 bg-amber-50 dark:bg-amber-500/10 rounded-xl border border-amber-200 dark:border-amber-500/20">
          <FiAlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 mt-0.5 shrink-0" />
          <p className="text-xs text-amber-800 dark:text-amber-300/90 leading-relaxed text-left">
            Spot trading involves slippage and price impact, especially for large orders or low‑liquidity tokens.
            Your order will be executed at the best available market price.
          </p>
        </div>

        {/* Order Summary */}
        <div className="bg-gray-50 dark:bg-white/5 rounded-xl p-5 border border-gray-200 dark:border-white/10 space-y-4 shadow-inner">
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-500 dark:text-gray-400">Action</span>
            <span className="text-base font-bold flex items-center gap-1.5">
              {selectedStrategy.id === 'sellToken' ? (
                <span className="text-rose-500">Sell {tokenInfo?.symbol}</span>
              ) : (
                <span className="text-emerald-500">Buy {tokenInfo?.symbol}</span>
              )}
            </span>
          </div>

          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-500 dark:text-gray-400">Order Size</span>
            <span className="text-base font-bold text-gray-900 dark:text-white">
              {initialOrderSize || '0'} {collateralToken?.symbol}
              <span className="text-gray-400 mx-1 font-normal">≈</span>
              ${estimatedUsdValue.toFixed(2)}
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

          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-500 dark:text-gray-400">Fee Token</span>
            <span className="text-sm font-bold text-gray-900 dark:text-white">
              {feeToken?.symbol || 'Auto (collateral)'}
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
    ),
    [
      orderMode,
      selectedStrategy,
      tokenInfo,
      initialOrderSize,
      collateralToken,
      estimatedUsdValue,
      estOrders.length,
      feeToken,
      tpPercentage,
      slPercentage,
      isActiveStopLoss,
    ]
  );

  // ─── Wallet Selector (memoized) ───────────────────────────────────────

  const MemoizedWalletSelector = useMemo(
    () => (
      <SelectWallet
        protocol="dex"
        category="spot"
        orders={userPrevOrders}
        availableWallets={userWallets}
        gridsByWallet={gridsByWallet}
        setGridsByWallet={setGridsByWallet}
        areWalletsReady={areWalletsReady}
        setWalletsReady={setWalletsReady}
        orderMode={orderMode}
        chainId={chainId}
        collateralToken={collateralToken}
        selectedStrategy={selectedStrategy}
        estOrders={estOrders}
        user={user}
      />
    ),
    [
      estOrders,
      userPrevOrders,
      userWallets,
      selectedStrategy,
      chainId,
      collateralToken,
      gridsByWallet,
      areWalletsReady,
      orderMode,
    ],
  );

  const showModeSelector = shouldCreateDemoTestnet(user?.status);

  // ─── Render ────────────────────────────────────────────────────────────

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
              className={`w-5 h-5 text-gray-500 transition-transform ${showStrategyDropdown ? "rotate-180" : ""}`}
            />
          </div>
        </div>

        {showStrategyDropdown && (
          <div className="absolute top-full h-[400px] left-0 right-0 mt-2 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-800 shadow-lg z-50 overflow-y-auto">
            {SpotStrategies.map((strategy) => (
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

      {/* Scrollable Form Section */}
      <div className="w-full grow overflow-y-auto space-y-2 scrollbar-track-transparent [&::-webkit-scrollbar]:w-1 [&::-webkit-scrollbar-track]:bg-gray-200 dark:[&::-webkit-scrollbar-track]:bg-gray-600 [&::-webkit-scrollbar-thumb]:bg-white dark:[&::-webkit-scrollbar-thumb]:bg-gray-800 [&::-webkit-scrollbar-thumb]:rounded-full">
        {/* Initial Setup */}
        <div className="bg-gray-50 dark:bg-gray-900 p-3 2xl:p-6 rounded-xl space-y-3 md:space-y-4 border border-gray-100 dark:border-gray-800">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <h3 className="font-semibold text-gray-800 dark:text-gray-100 text-lg">
                Initial Setup
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Configure your base trading parameters
              </p>
            </div>
            {/* Order Mode Selector */}
            <OrderModeSelector orderMode={orderMode} setOrderMode={setOrderMode} isSpot={true} isSupporteduser={showModeSelector} />

          </div>

          {selectedStrategy.id !== "sellToken" && (
            <div>
              {selectedStrategy.id === "algo" ? (
                <TechnicalEntry
                  technicalEntries={technicalEntry}
                  setTechnicalEntries={setTechnicalEntry}
                  title="Technical Entry condition"
                />
              ) : (
                <EntryPriceRendering
                  setEntryPrice={setEntryPrice}
                  label="Entry Price"
                  tooltipText="Price at which to enter the position"
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
                  estimatedUsdValue < MIN_ORDER_SIZE
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
                  {selectedStrategy.id !== "sellToken" ? (
                    tokenInfo?.token?.launchpad == null ||
                      tokenInfo?.token?.launchpad?.graduationPercent === 100 ? (
                      <DropDown
                        options={Object.values(CollateralTokens[chainId] || {})
                          .filter(
                            (t) =>
                              t.address.toLowerCase() !==
                              tokenInfo.address.toLowerCase(),
                          )
                          .map((token: any) => ({
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
                          }))}
                        onChange={setCollateralToken}
                        value={collateralToken}
                      />
                    ) : (
                      <div className="flex items-center gap-1 text-gray-900 dark:text-gray-200 px-2">
                        <img
                          src={collateralToken.imageUrl}
                          className="w-4 h-4 rounded-full"
                          alt={collateralToken.symbol}
                        />
                        <span>{collateralToken.symbol}</span>
                      </div>
                    )
                  ) : (
                    <div className="flex items-center gap-1 text-gray-900 dark:text-gray-200 px-2">
                      <img
                        src={collateralToken.imageUrl}
                        className="w-4 h-4 rounded-full"
                        alt={collateralToken.symbol}
                      />
                      <span>{collateralToken.symbol}</span>
                    </div>
                  )}
                </div>
              </div>

              {initialOrderSize && (
                <div
                  className={`mt-1 text-xs text-right px-1 ${estimatedUsdValue < MIN_ORDER_SIZE
                    ? "text-red-500 font-medium"
                    : "text-gray-500 dark:text-gray-400"
                    }`}
                >
                  {estimatedUsdValue < MIN_ORDER_SIZE && (
                    <span className="mr-2">Min. order $5 USD</span>
                  )}
                  ≈ $
                  {estimatedUsdValue.toLocaleString(undefined, {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </div>
              )}
            </div>
          </div>

          <OrderNameValidationInput
            name={orderName}
            onChange={setOrderName}
            isOrderNameValidate={isOrderNameValidate}
            setIsOrderNameValidate={setIsOrderNameValidate}
            isConnected={isConnected}
          />
        </div>

        {/* Grid Configuration */}
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
              />
              <NumberInput
                inputLabel="Grid Distance"
                toolTipMessage="Percentage distance between each grid level"
                value={gridDistance}
                onChange={setGridDistance}
                notValid={Number(gridNumber) > 1 && (gridDistance === 0 || !gridDistance)}
              />
            </div>
            {selectedStrategy.id !== "dca" && (
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

        {/* Risk Management */}
        <div className="bg-gray-50 dark:bg-gray-900 p-3 2xl:p-6 rounded-xl space-y-3 md:space-y-4 border border-gray-100 dark:border-gray-800">
          <div className="space-y-1 md:space-y-2">
            <h3 className="font-semibold text-gray-800 dark:text-gray-100 text-lg">
              Risk Management
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Configure your risk management parameters
            </p>
          </div>

          {selectedStrategy.id !== "sellToken" && (
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

          {selectedStrategy.id !== "sellToken" && (
            <StopLossInput
              isActive={isActiveStopLoss}
              setIsActive={setIsActiveStopLoss}
              isTrailingMode={isTrailingMode}
              stopLossPercentage={slPercentage}
              setStopLossPercentage={setSlPercentage}
              notValid={isTrailingMode && slPercentage === 0}
            />
          )}

          {selectedStrategy.id === "sellToken" && (
            <EntryPriceRendering
              setEntryPrice={setTpPrice}
              label="Exit Price"
              tooltipText="Price at which to exit the position"
              tokenInfo={tokenInfo}
              currentPriceUsd={liveTokenPriceUsd}
            />
          )}

          <SlippageInput slippage={slippage} onChange={setSlippage} />

          {selectedStrategy.id !== "sellToken" && (
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
                options={Object.values(CollateralTokens[chainId] || {}).map(
                  (token: any) => ({
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
                  }),
                )}
                onChange={setOutputToken}
                value={outputToken}
              />
            </div>
          </div>
        </div>

        {/* Advanced Settings */}
        <div className="bg-gray-50 dark:bg-gray-900 p-3 2xl:p-6 rounded-xl space-y-3 md:space-y-4 border border-gray-100 dark:border-gray-800">
          <div className="space-y-1 md:space-y-2">
            <h3 className="font-semibold text-gray-800 dark:text-gray-100 text-lg">
              Advanced Settings
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Configure priority and execution settings
            </p>
          </div>

          <OrderPriority
            priority={priority}
            setPriority={setPriority}
            user={user}
          />
        </div>

        {estOrders.length > 0 && user?.account && MemoizedWalletSelector}
      </div>

      {/* Action Buttons */}
      {!isConnected ? (
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
              } font-bold text-white transition-all transform hover:scale-[1.02] cursor-pointer`}
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