import type { MutableRefObject } from "react";
import type { OrderTokenType } from "@/type/order";

export type QuoteTokenInfo = Pick<OrderTokenType, "symbol" | "address" | "decimals">;

export type StableMarketTokenInfo = {
  address: string;
  chainId: number;
  name: string;
  symbol: string;
  pairAddress?: string;
  createdAt?: number;
  decimals?: number;
  imageUrl?: string;
  quoteToken?: QuoteTokenInfo;
  token?: Record<string, any>;
  longToken?: {
    address?: string;
    symbol?: string;
  };
  indexTokenAddress?:
    | {
        address?: string;
        symbol?: string;
      }
    | string;
  marketTokenAddress?: string;
  minQty?: string;
  maxQty?: string;
  maxLeverage?: number;
  priceUsd?: string;
};

export type LiveMarketSnapshot = {
  priceUsd: string;
  lastPrice?: number;
  markPrice?: number;
  indexPrice?: number;
  fundingRate?: number;
  nextFundingTime?: number;
  quoteVolume?: number;
  openInterest?: number;
  openInterestUsd?: number;
  eventTime?: number;
  liquidity?: string;
  marketCap?: string;
  volume24?: string;
  change24?: string;
};

export type MarketSnapshotRef = MutableRefObject<LiveMarketSnapshot>;
