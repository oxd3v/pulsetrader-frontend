import { ZeroAddress } from "ethers";
import { OrderType, OrderTokenType } from "@/type/order";
import {
  GAS_LIMIT,
  ORDER_FEE_COLLECTION_GAS_FEE,
  ORDER_TRADE_FEE,
} from "@/constants/common/order";
import {
  BASIS_POINT_DIVISOR_BIGINT,
  PRECISION,
  PRECISION_DECIMALS,
} from "@/constants/common/utils";
import { safeParseUnits } from "@/utility/handy";


// ============================================================================
// ORDER MATH & GRID CALCULATIONS
// ============================================================================

export function getGridMultiplierNthValue({
  initialValue,
  multiplier,
  n,
}: {
  initialValue: bigint;
  multiplier: number;
  n: number;
}) {
  if (n === 1) return initialValue;

  const multiplierBase = BigInt(Math.round(multiplier * 100));
  const divisor = BigInt(100);

  const power = BigInt(n - 1);
  const numerator = multiplierBase ** power;
  const denominator = divisor ** power;

  return (initialValue * numerator) / denominator;
}

export function getGridNthPrice({
  entryPrice,
  gridDistance,
  gridMultiplier,
  n,
  decrement = true,
}: {
  entryPrice: bigint;
  gridDistance: number;
  gridMultiplier: number;
  n: number;
  decrement: boolean;
}) {
  const bigX = BigInt(Math.round(gridDistance));
  const bigY = BigInt(Math.round(gridMultiplier));
  const bigN = BigInt(n);

  if (n === 1) return entryPrice;

  const rotationFactor = bigY ** (bigN - BigInt(1)) - BigInt(1);
  const totalDropPercent = bigX * rotationFactor;

  const percentagePrice = (entryPrice * totalDropPercent) / BigInt(100);
  const Price = decrement
    ? entryPrice - percentagePrice
    : entryPrice + percentagePrice;

  return Price;
}

export function calculateEstLiquidationPrice(
  entryPriceUsd: number,
  leverage: number,
  isLong: boolean,
  maintenanceMarginRateBps: number,
  assetTickSize: number = 0.01
): number | null {
  if (entryPriceUsd <= 0 || leverage <= 0) return null;

  const mm = maintenanceMarginRateBps / 10000;
  const im = 1 / leverage;

  let liqPrice: number;

  if (isLong) {
    liqPrice = entryPriceUsd * (1 - im + mm);
  } else {
    liqPrice = entryPriceUsd * (1 + im - mm);
  }

  if (liqPrice <= 0 && isLong) return 0;

  const multiplier = 1 / assetTickSize;
  return Math.round(liqPrice * multiplier) / multiplier;
}

export const calculatePerpPnl = ({
  entryPrice,
  markPrice,
  quantity,
  isLong,
}: {
  entryPrice: bigint;
  markPrice: bigint;
  quantity: string;
  isLong: boolean;
}) => {
  const quantityBI = safeParseUnits(quantity || "0", PRECISION_DECIMALS);
  if (quantityBI === BigInt(0)) return BigInt(0);

  const priceDiff = isLong
    ? BigInt(markPrice) - BigInt(entryPrice)
    : BigInt(entryPrice) - BigInt(markPrice);

  const pnl = (priceDiff * quantityBI) / PRECISION;
  return pnl
};

export type OpenOrderPnLResult = {
  rawPnl: number;
  realDexPnl: number;
  netUnrealizedPnl: number;
};

export function calculateOpenOrderPnL(
  entryPriceUsd: number,
  markPriceUsd: number,
  quantity: number,
  isLong: boolean,
  accumulatedFeesUsd: number,
  initialMarginUsd: number,
): OpenOrderPnLResult {
  const dir = isLong ? 1 : -1;
  const rawPnl = (markPriceUsd - entryPriceUsd) * quantity * dir;
  const realDexPnl = rawPnl - accumulatedFeesUsd;
  const netUnrealizedPnl = realDexPnl - initialMarginUsd;
  return { rawPnl, realDexPnl, netUnrealizedPnl };
}

// ============================================================================
// ORDER ADAPTER & NORMALIZATION
// ============================================================================

export const getOrderIndexTokenAddress = (order: OrderType): string => {
  return (
    order?.indexTokenAddress ||
    order?.orderAsset?.orderToken?.address ||
    order?.orderAsset?.perpSymbolInfo ||
    ""
  );
};

export const isActiveClientOrder = (order: OrderType): boolean => {
  if (order?.isActive === false) return false;
  return ["PENDING", "OPENED", "PROCESSING"].includes(order?.orderStatus || "");
};

export const getOrderPerpetual = (order: OrderType) => {
  return order?.perp;
};

export const ORDER_TRADE_FEE_BIGINT = BigInt(ORDER_TRADE_FEE);

// ============================================================================
// STABLE TOKEN / COLLATERAL GUARDS
// ============================================================================

export const isStableToken = (token: OrderTokenType | null | undefined): boolean => {
  return token?.isStable === true;
};

export const validateCollateralIsStable = (token: OrderTokenType | null | undefined): boolean => {
  if (!token) return false;
  return isStableToken(token);
};

// ============================================================================
// ORDER FEE UTILITIES
// ============================================================================

export const isTradeFeeExemptStatus = (userLevels: any, status?: string | null, orderMode: string = "Live",) => {
  if (orderMode != 'Live') return true;
  if (!status) return false;
  return status == 'admin' || userLevels[status?.toUpperCase() as string]?.benefits?.isTradeFeeExempt == true;
};



export const shouldCreateDemoTestnet = (userLevels: any, status?: string | null) => {
  return status == 'admin' || userLevels[status?.toUpperCase() as string]?.benefits?.isDemoTestnet == true
};

export const getDefaultFeeToken = <T extends OrderTokenType>(tokens: T[] = []) => {
  if (!tokens.length) return null;
  return (
    tokens.find((token: any) => token?.isStable) ||
    tokens.find((token) => token.address !== ZeroAddress) ||
    tokens[0]
  );
};

export const getOrderFeeCollectionCount = (order: Partial<OrderType>): number => {
  if (order.category === "perpetual" || order.category === "futures") {
    return order.orderStatus === "OPENED" ? 1 : 2;
  }
  if (order.category === "spot") {
    return order.orderType === "SELL" ? 1 : 2;
  }
  return 1;
};

export const getOrderExecutionGasCount = (order: Partial<OrderType>): number => {
  if (order.category !== "spot") return 0;
  return order.orderType === "SELL" ? 1 : 2;
};

export const getFeeCollectionGasFee = (chainId: number) => {
  return ORDER_FEE_COLLECTION_GAS_FEE[chainId] || BigInt(0);
};

// ============================================================================
// FUND HELPERS
// ============================================================================


export const calculateWalletTokenAllocation = ({
  orders,
  walletId,
  tokenAddress,
  isFeeExempt
}: {
  orders: OrderType[];
  walletId: string;
  tokenAddress: string;
  isFeeExempt: boolean;
}) => {
  if (orders.length === 0) return BigInt(0);

  let totalAllocation = BigInt(0);
  const tokenLower = tokenAddress.toLowerCase();

  orders.forEach((order) => {
    const orderWalletId =
      typeof order.wallet === "string" ? order.wallet : order.wallet?._id;
    if (orderWalletId !== walletId) return;
    if (!isActiveClientOrder(order)) return;
    if (order.orderMode != 'Live') return;

    const orderAsset = order.orderAsset;
    if (!orderAsset) return;

    // 1. Main order amount (collateral / order token)
    if (order.category === "spot") {
      const spot = order.spot;
      if (!spot) return;
      if (order.orderType === "BUY") {
        const collateral = orderAsset.collateralToken;
        if (collateral?.address?.toLowerCase() === tokenLower) {
          totalAllocation += BigInt(spot.amount?.orderSize || 0);
        }
      } else if (order.orderType === "SELL") {
        const orderToken = orderAsset.orderToken;
        if (orderToken?.address?.toLowerCase() === tokenLower) {
          totalAllocation += BigInt(spot.amount?.tokenAmount || 0);
        }
      }
    } else if (order.category === "perpetual" || order.category === "futures") {
      const perp = order.perp;
      if (!perp) return;
      const collateral = orderAsset.collateralToken;
      if (collateral?.address?.toLowerCase() === tokenLower) {
        totalAllocation += BigInt(perp.amount?.orderSize || perp.amount?.margin || 0);
      }
      // Also track quantity if it matches token address (e.g., for index token)
      const orderToken = orderAsset.orderToken;
      if (orderToken?.address?.toLowerCase() === tokenLower) {
        totalAllocation += BigInt(perp.amount?.quantity || 0);
      }
      // 2. Fee token reservations (for all categories, unless fee-exempt)
      if (!isFeeExempt && order.orderMode != 'Live') {
        const feeToken = orderAsset.feeToken;
        if (feeToken?.address?.toLowerCase() === tokenLower) {
          const feeCount = getOrderFeeCollectionCount(order);
          const feeAmount = BigInt((feeToken as any)?.amount || 0);
          totalAllocation += feeAmount * BigInt(feeCount);
        }
      }
    }


  });

  return totalAllocation;
};

// ============================================================================
// WALLET LOCKS / COSTS (used by wallet selectors)
// ============================================================================

export type OrderCosts = {
  dexOrderAmount: bigint;       // amount reserved on DEX collateral account (perp)
  walletOrderAmount: bigint;    // amount deducted from wallet balance (spot / native collateral)
  orderGasFee: bigint;          // native gas required for execution
  feeTokenAmount: bigint;       // fee token reservation amount
  feeTokenAddress?: string;     // address of the fee token
};

const toBigIntSafe = (value: unknown): bigint => {
  try {
    if (typeof value === "bigint") return value;
    if (typeof value === "number" && Number.isFinite(value)) return BigInt(Math.trunc(value));
    if (typeof value === "string" && value.trim() !== "") return BigInt(value);
  } catch {
    // ignore
  }
  return BigInt(0);
};

export const getOrderCosts = ({
  order,
  collateralTokenAddress,
  gasFee,
  user,
  treatCollateralTokenAsWalletBalance,
  isFeeExempt
}: {
  order: OrderType;
  collateralTokenAddress: string;
  gasFee: bigint;
  user: any;
  treatCollateralTokenAsWalletBalance: boolean;
  isFeeExempt: boolean;
}): OrderCosts => {
  const orderAsset = order.orderAsset;
  const feeToken = orderAsset?.feeToken;
  let feeTokenAddress = feeToken?.address?.toLowerCase();

  let orderGasFee = BigInt(0);
  const collateralLower = (collateralTokenAddress || ZeroAddress).toLowerCase();
  const isNativeCollateral = collateralLower === ZeroAddress.toLowerCase();

  let walletOrderAmount = BigInt(0);
  let dexOrderAmount = BigInt(0);

  if (order?.category === "spot") {
    const spot = order.spot;
    orderGasFee = GAS_LIMIT["SPOT"][order.chainId] * gasFee;
    if (order.orderType === "BUY") {
      orderGasFee = orderGasFee * BigInt(2);
      walletOrderAmount = toBigIntSafe(spot?.amount?.orderSize);
    } else {
      walletOrderAmount = toBigIntSafe(spot?.amount?.tokenAmount);
    }
  } else if (order?.category === "perpetual" || order?.category === "futures") {
    const perp = order.perp;
    if (order.orderType === "BUY") {
      dexOrderAmount = toBigIntSafe(perp?.amount?.orderSize) || BigInt(0);
    }
  }

  // Fee exemption check


  const feeCount = getOrderFeeCollectionCount(order);
  // For spot orders: pulse fee is deducted from collateral within the same swap TX.
  // No separate fee token reservation and no extra gas for fee collection needed.
  let feeTokenAmount = BigInt(0);
  if (order?.category === "spot") {
    feeTokenAmount = BigInt(0);
    feeTokenAddress = undefined;
  } else if (!isFeeExempt && feeTokenAddress) {
    // For perp/futures: read feeToken.amount from the order object (always populated by backend).
    // If missing for any reason, derive from order size using the trade fee rate.
    feeTokenAmount = toBigIntSafe((feeToken as any)?.amount);
    if (feeTokenAmount === BigInt(0)) {
      const rawOrderAmount = toBigIntSafe(order.perp?.amount?.orderSize);
      if (rawOrderAmount > BigInt(0)) {
        const collateral = orderAsset?.collateralToken;
        const isSameAsCollateral =
          !feeToken?.address ||
          feeToken.symbol?.toLowerCase() === collateral?.symbol?.toLowerCase();
        if (isSameAsCollateral) {
          feeTokenAmount =
            (rawOrderAmount * ORDER_TRADE_FEE_BIGINT) / BASIS_POINT_DIVISOR_BIGINT;
        }
        // If fee token differs from collateral and amount is missing, fall back to 0.
        // The backend always populates feeToken.amount so this case should not occur in practice.
      }
    }
  }

  // Legacy override: treat collateral as wallet balance
  if (
    treatCollateralTokenAsWalletBalance &&
    dexOrderAmount > BigInt(0) &&
    walletOrderAmount === BigInt(0)
  ) {
    walletOrderAmount = dexOrderAmount;
    dexOrderAmount = BigInt(0);
  }

  // Native collateral is always paid from the wallet balance
  if (
    isNativeCollateral &&
    walletOrderAmount === BigInt(0) &&
    dexOrderAmount > BigInt(0)
  ) {
    walletOrderAmount = dexOrderAmount;
    dexOrderAmount = BigInt(0);
  }

  return {
    dexOrderAmount,
    walletOrderAmount,
    orderGasFee,
    feeTokenAmount: isFeeExempt ? BigInt(0) : feeTokenAmount * BigInt(feeCount),
    feeTokenAddress: isFeeExempt ? undefined : feeTokenAddress,
  };
};

// ============================================================================
// CALCULATE EXISTING LOCKED FUNDS (UPGRADED)
// ============================================================================

export type LockedFundsResult = {
  totalActiveOrders: number;
  lockedFundBalance: bigint;              // native gas locked by all existing orders
  walletCollateralPending: bigint;        // wallet-side collateral locked (spot / native)
  dexCollateralPending: Record<string, bigint>; // perp margin locked per protocol key
  feeTokenPending: Record<string, bigint>;      // fee token locked per token address (perp only)
};

export const calculateExistingLockedFunds = ({
  orders,
  walletId,
  collateralTokenAddress,
  gasFee,
  orderMode,
  user,
  treatCollateralTokenAsWalletBalance,
  isFeeExempt
}: {
  orders: OrderType[],
  walletId: string,
  collateralTokenAddress: string,
  gasFee: bigint,
  orderMode: string,
  user: any,
  treatCollateralTokenAsWalletBalance: boolean,
  isFeeExempt: boolean
}): LockedFundsResult => {
  // Maps to accumulate results
  const lockedFundBalanceByWallet = new Map<string, bigint>();
  const walletCollateralPendingByWallet = new Map<string, bigint>();
  const dexCollateralPendingByWallet = new Map<string, Record<string, bigint>>();
  const feeTokenPendingByWallet = new Map<string, Record<string, bigint>>();
  const activeCountByWallet = new Map<string, number>();

  const ensureFeeTokenMap = (wid: string) => {
    let map = feeTokenPendingByWallet.get(wid);
    if (!map) { map = {}; feeTokenPendingByWallet.set(wid, map); }
    return map;
  };

  const ensureDexMap = (wid: string) => {
    let map = dexCollateralPendingByWallet.get(wid);
    if (!map) { map = {}; dexCollateralPendingByWallet.set(wid, map); }
    return map;
  };

  // Filter orders for the given wallet and active status
  // NOTE: all order categories (spot + perp) are intentionally included for
  // cross-category native balance lock tracking.
  const relevantOrders = (orders || [])
    .filter(o => o.orderMode === orderMode)
    .filter(o => {
      const wid = String(o?.wallet?._id ?? o?.wallet ?? "");
      return wid && wid === String(walletId);
    })
    .filter(o => isActiveClientOrder(o));

  // Compute costs synchronously for all relevant orders
  relevantOrders.forEach(order => {
    const costs = getOrderCosts({
      order,
      collateralTokenAddress,
      gasFee,
      user: order?.user ?? user,
      treatCollateralTokenAsWalletBalance,
      isFeeExempt
    });


    const wid = String(order?.wallet?._id ?? order?.wallet ?? "");

    activeCountByWallet.set(wid, (activeCountByWallet.get(wid) || 0) + 1);

    // Accumulate native gas fees from all order categories
    const currentGas = lockedFundBalanceByWallet.get(wid) || BigInt(0);
    lockedFundBalanceByWallet.set(wid, currentGas + costs.orderGasFee);

    // Accumulate wallet collateral (spot / native perp)
    if (costs.walletOrderAmount > BigInt(0)) {
      const current = walletCollateralPendingByWallet.get(wid) || BigInt(0);
      walletCollateralPendingByWallet.set(wid, current + costs.walletOrderAmount);
    }

    // Accumulate dex collateral (perp orders) per protocol
    if (costs.dexOrderAmount > BigInt(0)) {
      const protocolKey = (order?.perp?.protocol || "").toLowerCase();
      const dexMap = ensureDexMap(wid);
      dexMap[protocolKey] = (dexMap[protocolKey] || BigInt(0)) + costs.dexOrderAmount;
    }

    // Accumulate fee token amounts (perp only — spot has no separate fee token)
    if (costs.feeTokenAmount > BigInt(0) && costs.feeTokenAddress) {
      const addr = costs.feeTokenAddress.toLowerCase();
      const feeMap = ensureFeeTokenMap(wid);
      feeMap[addr] = (feeMap[addr] || BigInt(0)) + costs.feeTokenAmount;
    }
  });

  const wid = String(walletId);
  return {
    totalActiveOrders: activeCountByWallet.get(wid) || 0,
    lockedFundBalance: lockedFundBalanceByWallet.get(wid) || BigInt(0),
    walletCollateralPending: walletCollateralPendingByWallet.get(wid) || BigInt(0),
    dexCollateralPending: dexCollateralPendingByWallet.get(wid) || {},
    feeTokenPending: feeTokenPendingByWallet.get(wid) || {},
  };
};

// ============================================================================
// CALCULATE FEE COLLECTION GAS LOCKED BY PERP ORDERS
// ============================================================================

/**
 * Returns the total native gas locked by perp/futures orders' pulse fee collection
 * transactions on a given wallet. Spot orders are excluded because their pulse fee
 * is deducted from the collateral inside the same swap TX (no extra gas needed).
 */
export const calculateFeeCollectionGasLocked = (
  orders: OrderType[],
  walletId: string,
  chainId: number,
  orderMode: string,
  user: any,
  isFeeExempt: boolean
): bigint => {
  const feeCollectionGas = BigInt(ORDER_FEE_COLLECTION_GAS_FEE[chainId] || 0);
  if (feeCollectionGas === BigInt(0)) return BigInt(0);

  const relevantOrders = (orders || [])
    .filter(o => o.orderMode === orderMode)
    .filter(o => {
      const wid = String(o?.wallet?._id ?? o?.wallet ?? "");
      return wid && wid === String(walletId);
    })
    .filter(o => isActiveClientOrder(o))
    // Only perp/futures orders have a separate fee collection TX
    .filter(o => o.category === "perpetual" || o.category === "futures");

  let totalGasLocked = BigInt(0);
  for (const order of relevantOrders) {
    const orderUser = order?.user ?? user;

    const feeToken = order.orderAsset?.feeToken;
    const hasFeeToken = feeToken?.address && feeToken.address !== ZeroAddress;
    if (!hasFeeToken) continue;

    const feeCount = getOrderFeeCollectionCount(order);
    totalGasLocked += feeCollectionGas * BigInt(feeCount);
  }

  return totalGasLocked;
};


export const normalizeProtocolKey = (protocol: string): string => {
  return protocol.toLowerCase()
}