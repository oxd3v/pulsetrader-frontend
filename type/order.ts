// ============================================================
//  order.ts – corrected to match order.js schema
// ============================================================

// ---------- Shared operators ----------
export type LogicalOperator = 'AND' | 'OR';

export type ComparisonOperator =
  | 'EQUAL'
  | 'NOT_EQUAL'
  | 'GREATER_THAN'
  | 'LESS_THAN'
  | 'GREATER_THAN_OR_EQUAL'
  | 'LESS_THAN_OR_EQUAL';

// ---------- Entry logic (matches TechnicalLogicSchema) ----------
export interface ComparableConditionType {
  metric?: string;
  timeframe?: string;
  operator: ComparisonOperator;
  period?: number;
  value: string | number;
}

export interface GroupNodeType {
  operator: LogicalOperator;
  logic: (ComparableConditionType | GroupNodeType)[];         // array of conditions (no nesting)
}

export type TechnicalLogicType = GroupNodeType | ComparableConditionType;

// ---------- Entry weights (matches TechnicalWeightsSchema) ----------
export interface WeightConditionType {
  metric: string;
  timeframe?: string;
  operator?: ComparisonOperator;
  period?: number;
  value?: string;
  weight: number;
}

export interface TechnicalWeightsType {
  targetWeight: number;
  weights: WeightConditionType[];
}

// ---------- Token (matches TokenDataSchema) ----------
export type OrderTokenType = {
  address: string;
  symbol: string;
  decimals: number;
  chainId: number;
  // optional extra fields (not stored in schema, but may be used in UI)
  name?: string;
  imageUrl?: string;
  isCollateral?: boolean;
  isStable?: boolean;
  isNative?: boolean;
  isWrappedNative?: boolean;
};

// ---------- Order enums ----------
export type OrderCategoryType = 'spot' | 'perpetual' | 'futures';
export type OrderStatusType =
  | 'PENDING'
  | 'OPENED'
  | 'PROCESSING'
  | 'CLOSED'
  | 'FAILED'
  | 'CANCELLED'
  | 'REVERTED';
export type OrderExecutionType = 'BUY' | 'SELL';
export type OrderModeType = "Live" | "Demo" | 'Testnet'
export type OrderStrategyType =
  | 'limit'
  | 'scalp'
  | 'grid'
  | 'dca'
  | 'algo'
  | 'sellToken'
  | string;

// ---------- Main Order ----------
export type OrderType = {
  _id?: string;

  // References
  user: string | any;                         // ObjectId as string
  wallet: string | any;                       // ObjectId as string

  // Core fields
  chainId: number;
  name: string;
  strategy: OrderStrategyType;
  category: OrderCategoryType;
  orderMode: OrderModeType,
  orderType: OrderExecutionType;        // default: 'BUY'
  orderStatus: OrderStatusType;
  indexTokenAddress?: string;
  sl: number;                           // required in schema

  // Order asset info
  orderAsset: {
    collateralToken: OrderTokenType;
    perpSymbolInfo?: string | null;
    orderToken: OrderTokenType;
    outputToken: OrderTokenType;
    feeToken: OrderTokenType | null;
  };

  // Entry criteria
  entry: {
    entryCriteria: 'logic' | 'weight' | 'price';
    priceEntry?: {
      operator: ComparisonOperator;
      targetPriceUsd: string;
    } | null;
    technicalLogic?: TechnicalLogicType | null;   // matches Mixed storage
    technicalWeights?: TechnicalWeightsType | null;
  };

  // Exit conditions
  exit: {
    takeProfit: {
      takeProfitPrice: string;          // default: '0'
      takeProfitPctBps: number;         // default: 1000
      profitUsd: string;                // default: '0'
      operator: ComparisonOperator;
    };
    stopLoss: {
      stopLossPrice: string;            // default: '0'
      stopLossPctBps: number;           // default: 0
      saveUsd: string;                  // default: '0'
      isActive: boolean;                // default: false
      operator: ComparisonOperator;
    };
    isTrailingMode: boolean;            // default: false
  };

  // Re‑entrance
  reEntrance: {
    isReEntrance: boolean;              // default: false
    reEntranceLimit: number;            // default: 0
  };

  // Spot-specific (if category === 'spot')
  spot?: {
    slippageBps: number;                // default: 50
    protocol?: string | null;
    amount: {
      orderSize: string;
      tokenAmount: string;
    };
  };

  // Perpetual-specific (if category === 'perpetual')
  perp?: {
    isLong: boolean;
    leverage: number;
    protocol: string;
    slippageBps: number;                // default: 50
    amount: {
      orderSize: string;
      margin: string;
      quantity: string;
    };
  };

  // Cost breakdown
  cost: {
    txFeeInUsd: string;
    payInUsd: string;
    protocolFeeInUsd: string;
  };

  // Execution details (populated after execution)
  executionDetails?: {
    entryPriceUsd?: string;
    exitPriceUsd?: string;
    realizedPnlUsd?: string;
    unrealizedPnlUsd?: string;
    liquidationPriceUsd?: string;
    entryAt?: number;
    exitAt?: number;
    logs?: {
      at: number;
      priceUsd: string;
      hash?: string;
      pnlUsd?: string;
      weightScore?: number;
      message?: string;
    }[];
  };

  // Status flags
  isActive: boolean;                    // default: true
  isBusy: boolean;                      // default: false

  // Additional metadata
  additional: {
    priority: number;                   // default: 1
    executionSpeed: string;             // default: 'standard'
    retry: number;                      // default: 0
    inProcessing?: any | null;          // default: null
  };

  // Timestamps
  createdAt: Date;
  updatedAt: Date;
};

// Type Guards
export function isConditionNode(logic: TechnicalLogicType): logic is ComparableConditionType {
  return "metric" in logic && !("logic" in logic);
}

export function isGroupNode(logic: TechnicalLogicType): logic is GroupNodeType {
  return "logic" in logic && Array.isArray(logic.logic);
}