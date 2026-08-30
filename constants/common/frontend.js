
export const PROTOCOL_NAME = "PULSETRADER"
export const PROTOCOL_MOTTO = ''



export const NAVBAR_ITEM_LIST = [
  {
    name: "Strategy",
    href: "/strategy",
    type: 'private'
  },
  {
    name: "Orders",
    href: "/orders",
    type: 'private'
  },
  {
    name: "Pulse Accounts",
    href: "/pulse-account",
    type: 'private'
  },
  {
    name: "Screener",
    href: "/screener",
    type: 'public'
  },
  {
    name: "Settings",
    href: "/settings",
    type: 'private'
  },
  {
    name: "Docs",
    href: "/docs",
    type: 'public'
  },
]

import {
  FiCrosshair,
  FiDivide,
  FiGrid,
  FiTrendingUp,
  FiRepeat,
  FiSettings,
  FiActivity,
  FiLayers
} from "react-icons/fi";



export const PerpetualStrategies = [
  {
    id: "limit",
    name: "Limit Order",
    description: "Place a single limit order at a specific price",
    icon: <FiCrosshair className="w-5 h-5" />,
    features: [
      "Single entry point",
      "Good for precise entries",
      "Simple execution",
    ],
    recommendedFor: "Traders who want to enter at specific price levels",
    type: "Premium"
  },
  {
    id: "grid",
    name: "Grid Trading",
    description: "Create multiple orders in a grid pattern",
    icon: <FiGrid className="w-5 h-5" />,
    features: [
      "Multiple entry/exit points",
      "Profit from sideways markets",
      "Automated rebalancing",
    ],
    recommendedFor: "Traders in ranging or trending markets",
    type: "Premium"
  },
  {
    id: "multiScalp",
    name: "Multi Scalp",
    description: "Multiple concurrent scalping positions",
    icon: <FiRepeat className="w-5 h-5" />,
    features: [
      "Multiple positions",
      "Risk distribution",
      "Advanced automation",
    ],
    recommendedFor: "Experienced scalpers and day traders",
    type: "Premium"
  },
  {
    id: "algo",
    name: "Advanced Algo Trading",
    description: "Technical Entry",
    icon: <FiSettings className="w-5 h-5" />,
    features: ["Advanced Indicator access", "Indicator based Strategy",],
    recommendedFor: "Traders who want to trade based on algorithmic indicators",
    type: "Advanced"
  }
];

export const SpotStrategies = [
  {
    id: "limit",
    name: "Limit Order",
    description: "Place a single limit order at a specific price",
    icon: <FiCrosshair className="w-5 h-5" />,
    features: [
      "Single entry point",
      "Good for precise entries",
      "Simple execution",
    ],
    recommendedFor: "Traders who want to enter at specific price levels",
    type: "Basic"
  },
  {
    id: "dca",
    name: "DCA Trading",
    description: "Dollar Cost Average your entry across a price range",
    icon: <FiDivide className="w-5 h-5" />,
    features: [
      "Spread risk across prices",
      "Reduce impact of volatility",
      "Automated buying",
    ],
    recommendedFor: "Long-term investors and risk-averse traders",
    type: "Premium"
  },
  {
    id: "grid",
    name: "Grid Trading",
    description: "Create multiple orders in a grid pattern",
    icon: <FiGrid className="w-5 h-5" />,
    features: [
      "Multiple entry/exit points",
      "Profit from sideways markets",
      "Automated rebalancing",
    ],
    recommendedFor: "Traders in ranging or trending markets",
    type: "Premium"
  },
  {
    id: "scalp",
    name: "Scalp Trading",
    description: "Quick trades with small profit targets",
    icon: <FiTrendingUp className="w-5 h-5" />,
    features: ["Rapid execution", "Small profit targets", "High frequency"],
    recommendedFor: "Active traders seeking quick profits",
    type: "Basic"
  },
  {
    id: "multiScalp",
    name: "Multi Scalp",
    description: "Multiple concurrent scalping positions",
    icon: <FiRepeat className="w-5 h-5" />,
    features: [
      "Multiple positions",
      "Risk distribution",
      "Advanced automation",
    ],
    recommendedFor: "Experienced scalpers and day traders",
    type: "Premium"
  },
  {
    id: "sellToken",
    name: "Sell Token",
    description: "Sell a token at a specific price",
    icon: <FiTrendingUp className="w-5 h-5" />,
    features: ["Single exit point", "Good for precise exits", "Simple execution"],
    recommendedFor: "Traders who want to exit at specific price levels",
    type: "Advanced"
  },
  {
    id: "algo",
    name: "Advanced Algo Trading",
    description: "Technical Entry",
    icon: <FiSettings className="w-5 h-5" />,
    features: ["Advanced Indicator access", "Indicator based Strategy",],
    recommendedFor: "Traders who want to trade based on algorithmic indicators",
    type: "Advanced"
  }
];

export const PerpOrderModes = [
  {
    label: "Live",
    icon: <FiActivity className="w-5 h-5 text-blue-500" />,
    color: 'blue-500'
  },
  {
    label: "Testnet",
    icon: <FiGrid className="w-5 h-5 text-yellow-500" />,
    color: 'yellow-500'
  },
  {
    label: "Demo",
    icon: <FiLayers className="w-5 h-5 text-red-500" />,
    color: 'red-500'
  }

]

export const SpotOrderModes = [
  {
    label: "Live",
    icon: <FiActivity className="w-5 h-5 text-blue-500" />,
    color: 'blue-500'
  },
  {
    label: "Demo",
    icon: <FiLayers className="w-5 h-5 text-red-500" />,
    color: 'red-500'
  }

]

export const TradeFormPriceUpperDropdown = [
  {
    lable: "Now",
    value: 10000,
  },
  {
    label: "+1%",
    value: 10100,
  },
  {
    label: "+3%",
    value: 10300,
  },
  {
    label: "+5%",
    value: 10500,
  },
  {
    label: "+10%",
    value: 11000,
  },
  {
    label: "+15%",
    value: 11500,
  },
  {
    label: "+20%",
    value: 12000,
  },
  {
    label: "+30%",
    value: 13000,
  },
  {
    label: "+45%",
    value: 14500,
  },
  {
    label: "+50%",
    value: 15000,
  },
  {
    label: "+75%",
    value: 17500,
  },
  {
    label: "+90%",
    value: 19000,
  },
];

export const TradeFormPriceLowerDropdown = [
  {
    label: "Now",
    value: 10000,
  },
  {
    label: "-1%",
    value: 9900,
  },
  {
    label: "-3%",
    value: 9700,
  },
  {
    label: "-5%",
    value: 9500,
  },
  {
    label: "-10%",
    value: 9000,
  },
  {
    label: "-15%",
    value: 8500,
  },
  {
    label: "-20%",
    value: 8000,
  },
  {
    label: "-30%",
    value: 7000,
  },
  {
    label: "-45%",
    value: 5500,
  },
  {
    label: "-50%",
    value: 5000,
  },
  {
    label: "-75%",
    value: 2500,
  },
  {
    label: "-90%",
    value: 1000,
  },
];


export const INDICATORS_KEY = [
  // Momentum - Typically "Buy" when oversold or crossing up
  { id: "rsi", name: "RSI", indicatorName: 'Relative Strength Index', type: "indicator", defaultPeriod: 14, buyThreshold: 30 },
  { id: "williamR", name: "WilliamsR", indicatorName: 'Williams %R', type: "indicator", defaultPeriod: 14, buyThreshold: -80 },
  { id: "stochasticK", name: "StochasticK", indicatorName: 'Stochastic %K', type: "indicator", defaultPeriod: 14, buyThreshold: 20 },
  { id: "stochasticD", name: "StochasticD", indicatorName: 'Stochastic %D', type: "indicator", defaultPeriod: 14, buyThreshold: 20 },
  { id: "cci", name: "CCI", indicatorName: 'Commodity Channel Index', type: "indicator", defaultPeriod: 20, buyThreshold: -100 },
  { id: "mfi", name: "MFI", indicatorName: 'Money Flow Index', type: "indicator", defaultPeriod: 14, buyThreshold: 20 },

  // Trend - Typically "Buy" on bullish crossovers
  { id: "macdLine", name: "MACD-Line", indicatorName: 'MACD', type: "indicator", buyThreshold: 0 },
  { id: "macdSignal", name: "MACD-Signal", indicatorName: 'MACD', type: "indicator", buyThreshold: 0 },
  { id: "macdHistogram", name: "MACD-Histogram", indicatorName: 'MACD', type: "indicator", buyThreshold: 0 },
  { id: "sma", name: "SMA", indicatorName: 'Simple Moving Average', type: "indicator", defaultPeriod: 9, buyThreshold: null },
  { id: "ema", name: "EMA", indicatorName: 'Exponential Moving Average', type: "indicator", defaultPeriod: 9, buyThreshold: null },
  { id: "wma", name: "WMA", indicatorName: 'Weighted Moving Average', type: "indicator", defaultPeriod: 9, buyThreshold: null },

  // Volatility - Typically "Buy" when price touches/crosses the lower band
  { id: "atr", name: "ATR", indicatorName: "Average True Range", type: "indicator", buyThreshold: null },
  { id: "bbUpper", name: "BollingerBands-Upper", indicatorName: "Bollinger Bands", type: "indicator", buyThreshold: null },
  { id: "bbMiddle", name: "BollingerBands-Middle", indicatorName: "Bollinger Bands", type: "indicator", buyThreshold: null },
  { id: "bbLower", name: "BollingerBands-Lower", indicatorName: "Bollinger Bands", type: "indicator", buyThreshold: null },
];

export const TECHNICAL_INDICATORS = [
  'rsi', "stochasticK", "obv", "atr", "bbPB", "bbLower", "bbUpper", "bbMiddle", "ema", "sma", 'wma', "adx.Line", "adx.PDI", "adx.MDI", "adx", "macdLine", "macdHistogra", "macdSignal",
  "mfi", "cci", "williamR", "stochasticD",
];

export const PERP_ORDERFLOW_METRICS = [
  { id: "priceChangePct5m", name: "Price Change 5m", type: 'orderFlow', buyThreshold: 0.1 },
  { id: "priceChangePct15m", name: "Price Change 15m", type: 'orderFlow', buyThreshold: 0.1 },
  { id: "priceChangePct30m", name: "Price Change 30m", type: 'orderFlow', buyThreshold: 0.1 },
  { id: "priceChangePct1h", name: "Price Change 1h", type: 'orderFlow', buyThreshold: 0.1 },
  { id: "priceChangePct4h", name: "Price Change 4h", type: 'orderFlow', buyThreshold: 0.1 },
  { id: "priceChangePct12h", name: "Price Change 12h", type: 'orderFlow', buyThreshold: 0.1 },
  { id: "priceChangePct24h", name: "Price Change 24h", type: 'orderFlow', buyThreshold: 0.1 },
  { id: "oiChange1h", name: "OI Change 1h", type: 'orderFlow', buyThreshold: 0.1 },
  { id: "oiChange24h", name: "OI Change 24h", type: 'orderFlow', buyThreshold: 0.1 },
  { id: "oiChangePct24h", name: "OI Change % 24h", type: 'orderFlow', buyThreshold: 0.1 },
  { id: "volumeChangePct4h", name: "Volume Change % 4h", type: 'orderFlow', buyThreshold: 0.1 },
  { id: "volumeChangePct1h", name: "Volume Change % 1h", type: 'orderFlow', buyThreshold: 0.1 },
  { id: "volumeChangePct30m", name: "Volume Change % 30m", type: 'orderFlow', buyThreshold: 0.1 },
  { id: "volumeChangePct15m", name: "Volume Change % 15m", type: 'orderFlow', buyThreshold: 0.1 },
  { id: "volumeChangePct5m", name: "Volume Change % 5m", type: 'orderFlow', buyThreshold: 0.1 },
  { id: "volumeChangePct24h", name: "Volume Change % 24h", type: 'orderFlow', buyThreshold: 0.1 },
  { id: "longShortRatio5m", name: "Long Short Ratio 5m", type: 'orderFlow', buyThreshold: 1.1 },
  { id: "longShortRatio15m", name: "Long Short Ratio 15m", type: 'orderFlow', buyThreshold: 1.1 },
  { id: "longShortRatio30m", name: "Long Short Ratio 30m", type: 'orderFlow', buyThreshold: 1.1 },
  { id: "longShortRatio1h", name: "Long Short Ratio 1h", type: 'orderFlow', buyThreshold: 1.1 },
  { id: "longShortRatio24h", name: "Long Short Ratio 24h", type: 'orderFlow', buyThreshold: 1.1 },
  { id: "longLiquidationRatio24h", name: "Long Liquidation Ratio 24h", type: 'orderFlow', buyThreshold: 0.1 },
  { id: "longLiquidationRatio12h", name: "Long Liquidation Ratio 12h", type: 'orderFlow', buyThreshold: 0.1 },
  { id: "longLiquidationRatio4h", name: "Long Liquidation Ratio 4h", type: 'orderFlow', buyThreshold: 0.1 },
  { id: "longLiquidationRatio1h", name: "Long Liquidation Ratio 1h", type: 'orderFlow', buyThreshold: 0.1 },
  { id: "oiMarketCapRatio", name: "OI Market Cap Ratio", type: 'orderFlow', buyThreshold: 0.1 },
  { id: "oiVolRatio", name: "OI Vol Ratio", type: 'orderFlow', buyThreshold: 0.1 },
  { id: "oiVolRatioChangePercent24h", name: "OI Vol Ratio Change % 24h", type: 'orderFlow', buyThreshold: 0.1 },
]

export const SPOT_ORDERFLOW_METRICS = [
  { id: "liquidity", name: "Liquidity", type: 'orderFlow', buyThreshold: 10000 },
  { id: "holders", name: "Holders", type: 'orderFlow', buyThreshold: 1000 },
  { id: "marketCap", name: "Market Cap", type: 'orderFlow', buyThreshold: 100000 },
  { id: "volume", name: "Volume", type: 'orderFlow', buyThreshold: 1000000 },
  { id: "priceChangePct5m", name: "Price Change 5m", type: 'orderFlow', buyThreshold: 0.1 },
  { id: "priceChangePct1h", name: "Price Change 1h", type: 'orderFlow', buyThreshold: 0.1 },
  { id: "priceChangePct4h", name: "Price Change 4h", type: 'orderFlow', buyThreshold: 0.1 },
  { id: "priceChangePct12h", name: "Price Change 12h", type: 'orderFlow', buyThreshold: 0.1 },
  { id: "priceChangePct24h", name: "Price Change 24h", type: 'orderFlow', buyThreshold: 0.1 },
  { id: "sellCount5m", name: "Sell Count 5m", type: 'orderFlow', buyThreshold: 100 },
  { id: "buyCount5m", name: "Buy Count 5m", type: 'orderFlow', buyThreshold: 100 },
  { id: "sellCount1h", name: "Sell Count 1h", type: 'orderFlow', buyThreshold: 100 },
  { id: "buyCount1h", name: "Buy Count 1h", type: 'orderFlow', buyThreshold: 100 },
  { id: "sellCount4h", name: "Sell Count 4h", type: 'orderFlow', buyThreshold: 100 },
  { id: "buyCount4h", name: "Buy Count 4h", type: 'orderFlow', buyThreshold: 100 },
  { id: "sellCount12h", name: "Sell Count 12h", type: 'orderFlow', buyThreshold: 100 },
  { id: "buyCount12h", name: "Buy Count 12h", type: 'orderFlow', buyThreshold: 100 },
  { id: "sellCount24h", name: "Sell Count 24h", type: 'orderFlow', buyThreshold: 100 },
  { id: "buyCount24h", name: "Buy Count 24h", type: 'orderFlow', buyThreshold: 100 },
  { id: 'txCount5m', name: 'Tx Count 5m', type: 'orderFlow', buyThreshold: 100 },
  { id: 'txCount1h', name: 'Tx Count 1h', type: 'orderFlow', buyThreshold: 100 },
  { id: 'txCount4h', name: 'Tx Count 4h', type: 'orderFlow', buyThreshold: 100 },
  { id: 'txCount12h', name: 'Tx Count 12h', type: 'orderFlow', buyThreshold: 100 },
  { id: 'txCount24h', name: 'Tx Count 24h', type: 'orderFlow', buyThreshold: 100 },
  { id: 'uniqueTxCount24h', name: 'Unique Tx Count 24h', type: 'orderFlow', buyThreshold: 100 },
  { id: "uniqueTxCount5m", name: "Unique Tx Count 5m", type: 'orderFlow', buyThreshold: 100 },
  { id: "uniqueTxCount1h", name: "Unique Tx Count 1h", type: 'orderFlow', buyThreshold: 100 },
  { id: "uniqueTxCount4h", name: "Unique Tx Count 4h", type: 'orderFlow', buyThreshold: 100 },
  { id: "uniqueTxCount12h", name: "Unique Tx Count 12h", type: 'orderFlow', buyThreshold: 100 },
  { id: "top10HoldersPercent", name: "Top 10 Holders Percent", type: 'orderFlow', buyThreshold: 80 },
]


