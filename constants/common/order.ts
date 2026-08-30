export const MIN_ORDER_SIZE = 0.2;
export const MAX_GRID_NUMBER = 5;
export const MIN_PERP_DEPOSIT = 10;


import { chains } from "./chain";

export const GAS_LIMIT = {
  ["PERPETUAL"]: {
    ["GMX"]: {
      increaseOrderGasLimit: BigInt(6000000),
      decreaseOrderGasLimit: BigInt(7000000),
    },
    ["ASTERDEX"]: {
      increaseOrderGasLimit: BigInt(3000000),
      decreaseOrderGasLimit: BigInt(7000000),
    },
  },
  ["SPOT"]: {
    [chains.Avalanche]: BigInt(6000000), // with transfer and approve gas limit
    [chains.Solana]: BigInt(1700000), // with transfer gas limit
    [chains.Ethereum]: BigInt(1800000), // with transfer gas limit
    [chains.Arbitrum]: BigInt(2700000), // with transfer gas limit
  },
};

export const GAS_BUFFER = {
  [chains.Avalanche]: 50000,
  [chains.Ethereum]: 20000,
  [chains.Solana]: 50000,
  [chains.Arbitrum]: 40000,
};

export const DEFAULT_GAS_PRICE = {
  [chains.Avalanche]: BigInt(2000000000),
  [chains.Ethereum]: BigInt(1000000000),
  [chains.Solana]: BigInt(10000000),
  [chains.Arbitrum]: BigInt(90000000),
}

export const ORDER_TRADE_FEE = BigInt(10);
export const DEFAULT_SOLANA_PRIORITY_FEE = BigInt(50_000);
export const SOLANA_BASE_FEE = BigInt(5000);
export const DEFAULT_SOLANA_COMPUTE_UNITS = BigInt(250_000);
export const SINGLE_PERPETUAL_STRATEGY = ['limit', 'dca', 'grid', 'algo'];
export const SINGLE_SPOT_STRATEGY = ['limit', 'algo'];
export const ORDER_FEE_COLLECTION_GAS_FEE = {
  [chains.Avalanche]: BigInt(14000000000000),
  [chains.Ethereum]: BigInt(50000000000000),
  [chains.Solana]: BigInt(500000),
  [chains.Arbitrum]: BigInt(4500000000000),
};



export const PERP_ADVANCED_SYMBOL = ["BTC", "ETH", "SOL", "BNB", "XRP", "ADA", "DOGE"];
