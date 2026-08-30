import { chains, } from "./chain";

import { ZeroAddress } from "ethers";

export const Tokens = {
  [chains.Avalanche]: {
    [ZeroAddress]: {
      address: ZeroAddress,
      name: "AVALANCHE",
      symbol: "AVAX",
      decimals: 18,
      imageUrl:
        "https://assets.coingecko.com/coins/images/12559/small/coin-round-red.png?1604021818",
      isNative: true,
      chainId: chains.Avalanche,
      isSpot: true,
      isPerpetual: true,
      isCollateral: true,
    },
    ["0xb31f66aa3c1e785363f0875a1b74e27b85fd66c7"]: {
      address: "0xb31f66aa3c1e785363f0875a1b74e27b85fd66c7",
      name: "Wrapped AVAX",
      symbol: "WAVAX",
      decimals: 18,
      imageUrl:
        "https://assets.coingecko.com/coins/images/12559/small/coin-round-red.png?1604021818",
      chainId: chains.Avalanche,
      isWrappedNative: true,
      isSpot: true,
      isPerpetual: true,
      isCollateral: true,
    },
    ["0xb97ef9ef8734c71904d8002f8b6bc66dd9c48a6e"]: {
      name: "USD Coin",
      symbol: "USDC",
      address: "0xB97EF9Ef8734C71904D8002F8b6Bc66Dd9c48a6E",
      decimals: 6,
      isStable: true,
      chainId: chains.Avalanche,
      imageUrl:
        "https://assets.coingecko.com/coins/images/6319/thumb/USD_Coin_icon.png?1547042389",
      isPerpetual: true,
      isSpot: true,
      isCollateral: true,
    },
    // ["0xa7d7079b0fead91f3e65f86e8915cb59c1a4c664"]: {
    //   name: "Bridged USDC (USDC.e)",
    //   symbol: "USDC.E",
    //   address: "0xA7D7079b0FEaD91F3e65f86E8915Cb59c1a4C664",
    //   decimals: 6,
    //   isStable: true,
    //   imageUrl:
    //     "https://assets.coingecko.com/coins/images/6319/thumb/USD_Coin_icon.png?1547042389",
    //   coingeckoUrl:
    //     "https://www.coingecko.com/en/coins/bridged-usdc-avalanche-bridge",
    //   explorerUrl:
    //     "https://snowtrace.io/address/0xA7D7079b0FEaD91F3e65f86E8915Cb59c1a4C664",
    //   isV1Available: true,
    //   isPerpetual: true,
    //   priceDecimals: 2
    // },
    ["0x9702230a8ea53601f5cd2dc00fdbc13d4df4a8c7"]: {
      name: "Tether",
      symbol: "USDT",
      decimals: 6,
      address: "0x9702230A8Ea53601f5cD2dc00fDBc13d4dF4A8c7",
      isStable: true,
      chainId: chains.Avalanche,
      imageUrl:
        "https://assets.coingecko.com/coins/images/325/small/Tether-logo.png",
      coingeckoUrl: "https://www.coingecko.com/en/coins/tether",
      explorerUrl:
        "https://snowtrace.io/address/0x9702230A8Ea53601f5cD2dc00fDBc13d4dF4A8c7",
      isPerpetual: true,
      isCollateral: true,
    },
    // ["0xc7198437980c041c805a1edcba50c1ce5db95118"]: {
    //   name: "Tether",
    //   symbol: "USDT.E",
    //   decimals: 6,
    //   address: "0xc7198437980c041c805A1EDcbA50c1Ce5db95118",
    //   isStable: true,
    //   imageUrl:
    //     "https://assets.coingecko.com/coins/images/325/small/Tether-logo.png",
    //   coingeckoUrl: "https://www.coingecko.com/en/coins/tether",
    //   explorerUrl:
    //     "https://snowtrace.io/address/0xc7198437980c041c805A1EDcbA50c1Ce5db95118",
    //   isPerpetual: true,
    // },
    // ["0xd586e7f844cea2f87f50152665bcbc2c279d8d70"]: {
    //   name: "Dai",
    //   symbol: "DAI.E",
    //   address: "0xd586E7F844cEa2F87f50152665BCbc2C279D8d70",
    //   decimals: 18,
    //   isStable: true,
    //   imageUrl:
    //     "https://assets.coingecko.com/coins/images/9956/thumb/4943.png?1636636734",
    //   coingeckoUrl: "https://www.coingecko.com/en/coins/dai",
    //   explorerUrl:
    //     "https://snowtrace.io/address/0xd586E7F844cEa2F87f50152665BCbc2C279D8d70",
    //   isPerpetual: true,
    //   priceDecimals: 2
    // },
    // ["0x130966628846bfd36ff31a822705796e8cb8c18d"]: {
    //   name: "Magic Internet Money",
    //   symbol: "MIM",
    //   address: "0x130966628846BFd36ff31a822705796e8cb8C18D",
    //   decimals: 18,
    //   isStable: true,
    //   imageUrl:
    //     "https://assets.coingecko.com/coins/images/16786/small/mimlogopng.png",
    //   coingeckoUrl: "https://www.coingecko.com/en/coins/magic-internet-money",
    //   explorerUrl:
    //     "https://snowtrace.io/address/0x130966628846BFd36ff31a822705796e8cb8C18D",
    //   isV1Available: true,
    //   isPerpetual: true,
    //   priceDecimals: 2
    // },
    // ["0x62edc0692bd897d2295872a9ffcac5425011c661"] : {
    //   name: "GMX",
    //   symbol: "GMX",
    //   decimals: 18,
    //   imageUrl: 'https://dd.dexscreener.com/ds-data/tokens/avalanche/0x62edc0692bd897d2295872a9ffcac5425011c661.png?size=lg&key=94a686',
    //   address: "0x62edc0692BD897D2295872a9FFCac5425011c661",
    //   pool: '0x0c91a070f862666bBcce281346BE45766d874D98',
    //   pairToken: '0xb31f66aa3c1e785363f0875a1b74e27b85fd66c7',
    //   poolIndex: 0,
    //   isSpot: true,
    //   isPerpetual: true,
    //   poolType: 'UNISWAPV2',
    //   dex: '0x60aE616a2155Ee3d9A68541Ba4544862310933d4',
    //   dexName: 'JoeRouter02',
    //   priceDecimals: 2
    // },
    // ["0x6f43ff77a9c0cf552b5b653268fbfe26a052429b"]: {
    //   name: "LAMBO",
    //   symbol: "LAMBO",
    //   decimals: 18,
    //   imageUrl: `https://dd.dexscreener.com/ds-data/tokens/avalanche/0x6F43fF77A9C0Cf552b5b653268fBFe26A052429b.png?size=lg&key=94a686`,
    //   address: "0x6F43fF77A9C0Cf552b5b653268fBFe26A052429b",
    //   pool: '0x9283fe7e74459a67CF49AB541810Fd599b3cdC5d',
    //   pairToken: '0xb31f66aa3c1e785363f0875a1b74e27b85fd66c7',
    //   poolIndex: 0,
    //   isSpot: true,
    //   poolType: 'UNISWAPV2',
    //   dex: "0xF56D524D651B90E4B84dc2FffD83079698b9066E",
    //   dexName: "ArenaRouter02",
    //   priceDecimals: 4
    // },
    // ['0x152b9d0fdc40c096757f570a51e494bd4b943e50']: {
    //   name: "BTC.b",
    //   symbol: "BTC",
    //   decimals: 8,
    //   imageUrl:
    //     "https://assets.coingecko.com/coins/images/26115/thumb/btcb.png?1655921693",
    //   address: "0x152b9d0fdc40c096757f570a51e494bd4b943e50",
    //   pool: '0x2fD81391E30805Cc7F2Ec827013ce86dc591B806',
    //   pairToken: '0xb31f66aa3c1e785363f0875a1b74e27b85fd66c7',
    //   poolIndex: 0,
    //   isSpot: true,
    //   isPerpetual: true,
    //   poolType: 'UNISWAPV2',
    //   dex: '0x60aE616a2155Ee3d9A68541Ba4544862310933d4',
    //   dexName: 'JoeRouter02',
    //   priceDecimals: 1
    // },
    // ['0x49d5c2bdffac6ce2bfdb6640f4f80f226bc10bab']:{
    //   name: "Wrapped Ether",
    //   symbol: "WETH.e",
    //   decimals: 18,
    //   imageUrl:
    //     "https://snowscan.xyz/token/images/ethereum_32.png",
    //   address: "0x49D5c2BdFfac6CE2BFdB6640F4F80f226bc10bAB",
    //   pool: '0xFE15c2695F1F920da45C30AAE47d11dE51007AF9',
    //   pairToken: '0xb31f66aa3c1e785363f0875a1b74e27b85fd66c7',
    //   dex: '0x60aE616a2155Ee3d9A68541Ba4544862310933d4',
    //   dexName: 'JoeRouter02',
    //   poolIndex: 0,
    //   isSpot: true,
    //   isPerpetual:true,
    //   poolType: 'UNISWAPV2',
    //   priceDecimals: 1
    // },
    // ['0xfe6b19286885a4f7f55adad09c3cd1f906d2478f']:{
    //   name: "Wrapped SOL (Wormhole)",
    //   symbol: "SOL",
    //   decimals: 9,
    //   imageUrl:
    //     "https://assets.coingecko.com/coins/images/4128/small/solana.png?1640133422",
    //   address: "0xFE6B19286885a4F7F55AdAD09C3Cd1f906D2478F",
    //   pool: '0xe1d6e5d08E2840ceB272652e21ba9b90adFbd50F',
    //   pairToken: '0xb31f66aa3c1e785363f0875a1b74e27b85fd66c7',
    //   dex: '0x60aE616a2155Ee3d9A68541Ba4544862310933d4',
    //   dexName: 'JoeRouter02',
    //   poolIndex: 0,
    //   isSpot: false,
    //   isPerpetual: true,
    //   poolType: 'LBRouter',
    //   priceDecimals: 1
    // },
    // ["0x50b7545627a5162f82a992c33b87adc75187b218"]: {
    //   name: "Bitcoin (WBTC.e)",
    //   symbol: "WBTC",
    //   assetSymbol: "WBTC.e",
    //   address: "0x50b7545627a5162F82A992c33b87aDc75187B218",
    //   decimals: 8,
    //   isShortable: true,
    //   categories: ["layer1"],
    //   imageUrl:
    //     "https://assets.coingecko.com/coins/images/7598/thumb/wrapped_bitcoin_wbtc.png?1548822744",
    //   coingeckoUrl: "https://www.coingecko.com/en/coins/wrapped-bitcoin",
    //   coingeckoSymbol: "WBTC",
    //   isV1Available: true,
    //   isPerpetual: true,
    //   isSpot: true,
    //   pool: "0xd5a37dC5C9A396A03dd1136Fc76A1a02B1c88Ffa",
    //   pairToken: '0xb31f66aa3c1e785363f0875a1b74e27b85fd66c7',
    //   poolIndex: 0,
    //   poolType: "UNISWAPV2",
    //   dex: '0x60aE616a2155Ee3d9A68541Ba4544862310933d4',
    //   dexName: 'JoeRouter02',
    //   priceDecimals: 1
    // },
    // ["0x5947bb275c521040051d82396192181b413227a3"]: {
    //   name: "Chainlink",
    //   symbol: "LINK",
    //   decimals: 18,
    //   priceDecimals: 4,
    //   address: "0x5947BB275c521040051D82396192181b413227A3",
    //   isShortable: true,
    //   categories: ["defi"],
    //   imageUrl:
    //     "https://assets.coingecko.com/coins/images/877/thumb/chainlink-new-logo.png?1547034700",
    //   coingeckoUrl: "https://www.coingecko.com/en/coins/chainlink",
    //   explorerUrl:
    //     "https://snowtrace.io/address/0x5947BB275c521040051D82396192181b413227A3",
    //   isPerpetual: true,
    //   isSpot: true,
    //   pool: '0x6F3a0C89f611Ef5dC9d96650324ac633D02265D3',
    //   pairToken: "0xb31f66aa3c1e785363f0875a1b74e27b85fd66c7",
    //   poolIndex: 0,
    //   poolType: "UNISWAPV2",
    //   dex: '0x60aE616a2155Ee3d9A68541Ba4544862310933d4',
    //   dexName: 'JoeRouter02',
    // },
    // ["0xc301e6fe31062c557aee806cc6a841ae989a3ac6"]: {
    //   name: "Dogecoin",
    //   symbol: "DOGE",
    //   decimals: 8,
    //   priceDecimals: 5,
    //   address: "0xC301E6fe31062C557aEE806cc6A841aE989A3ac6",
    //   isSynthetic: true,
    //   categories: ["meme"],
    //   imageUrl:
    //     "https://assets.coingecko.com/coins/images/5/small/dogecoin.png?1547792256",
    //   coingeckoUrl: "https://www.coingecko.com/en/coins/dogecoin",
    //   isPerpetual: true,
    // },
    // ["0x8e9c35235c38c44b5a53b56a41eaf6db9a430cd6"]: {
    //   name: "Litecoin",
    //   symbol: "LTC",
    //   decimals: 8,
    //   priceDecimals: 3,
    //   address: "0x8E9C35235C38C44b5a53B56A41eaf6dB9a430cD6",
    //   isSynthetic: true,
    //   categories: ["layer1"],
    //   imageUrl:
    //     "https://assets.coingecko.com/coins/images/2/small/litecoin.png?1547033580",
    //   coingeckoUrl: "https://www.coingecko.com/en/coins/litecoin",
    //   isPerpetual: true,
    // },
    // ["0x34b2885d617ce2dded4f60ccb49809fc17bb58af"]: {
    //   name: "XRP",
    //   symbol: "XRP",
    //   decimals: 6,
    //   priceDecimals: 5,
    //   address: "0x34B2885D617cE2ddeD4F60cCB49809fc17bb58Af",
    //   categories: ["layer1"],
    //   imageUrl:
    //     "https://assets.coingecko.com/coins/images/44/small/xrp-symbol-white-128.png?1605778731",
    //   coingeckoUrl: "https://www.coingecko.com/en/coins/xrp",
    //   isSynthetic: true,
    //   isPerpetual: true,
    // },
    // ["0x2f6d7be53fab5538065a226ba091015d422a7528"]: {
    //   name: "Official Trump",
    //   symbol: "TRUMP",
    //   address: "0x2f6d7be53fab5538065a226BA091015d422a7528",
    //   decimals: 6,
    //   priceDecimals: 4,
    //   categories: ["meme"],
    //   imageUrl:
    //     "https://assets.coingecko.com/coins/images/53746/standard/trump.png?1737171561",
    //   coingeckoUrl: "https://www.coingecko.com/en/coins/official-trump",
    //   isSynthetic: true,
    //   isPerpetual: true,
    // },
    // ["0xd42c991a4fab293c57a7bf25c2e2ec5ae1db1714"]: {
    //   name: "Melania Meme",
    //   symbol: "MELANIA",
    //   address: "0xd42C991a4FAb293C57a7bf25C2E2ec5aE1dB1714",
    //   decimals: 6,
    //   priceDecimals: 4,
    //   categories: ["meme"],
    //   imageUrl:
    //     "https://assets.coingecko.com/coins/images/53775/standard/melania-meme.png?1737329885",
    //   coingeckoUrl: "https://www.coingecko.com/en/coins/melania-meme",
    //   isSynthetic: true,
    //   isPerpetual: true,
    // },
    // ["0xda598795dfe56388ca3d35e2ccfa96eff83ec306"]:{
    //   name: "Pump",
    //   symbol: "PUMP",
    //   address: "0xdA598795DfE56388ca3D35e2ccFA96EFf83eC306",
    //   decimals: 18,
    //   priceDecimals: 6,
    //   imageUrl: "https://assets.coingecko.com/coins/images/67164/standard/pump.jpg?1751949376",
    //   coingeckoUrl: "https://www.coingecko.com/en/coins/pump-fun",
    //   isSynthetic: true,
    //   categories: ["meme"],
    // },
    // ["0xbdF8a77acb7a54597e7760b34d3e632912bb59b7"]:{
    //   name: "World Liberty Financial",
    //   symbol: "WLFI",
    //   address: "0xbDF8a77ACB7A54597E7760b34D3E632912bB59b7",
    //   decimals: 18,
    //   priceDecimals: 5,
    //   isSynthetic: true,
    //   categories: ["defi"],
    //   imageUrl: "https://assets.coingecko.com/coins/images/50767/standard/wlfi.png?1756438915",
    //   coingeckoUrl: "https://www.coingecko.com/en/coins/world-liberty-financial",
    // },
    // ["0xbdf8a77acb7a54597e7760b34d3e632912bb59b7"]:{
    //   name: "World Liberty Financial",
    //   symbol: "WLFI",
    //   address: "0xbDF8a77ACB7A54597E7760b34D3E632912bB59b7",
    //   decimals: 18,
    //   priceDecimals: 5,
    //   isSynthetic: true,
    //   categories: ["defi"],
    //   imageUrl: "https://assets.coingecko.com/coins/images/50767/standard/wlfi.png?1756438915",
    //   coingeckoUrl: "https://www.coingecko.com/en/coins/world-liberty-financial",
    // },
  },
  [chains.Ethereum]: {
    [ZeroAddress]: {
      address: ZeroAddress,
      name: "ETHERIUM",
      symbol: "ETH",
      decimals: 18,
      imageUrl: "https://etherscan.io/images/svg/brands/ethereum-original.svg",
      isNative: true,
      chainId: chains.Ethereum,
      isSpot: true,
      isPerpetual: true,
      isStable: false,
      isCollateral: true,
    },
    ["0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2"]: {
      address: "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2",
      name: "WRAPPED ETHERIUM",
      symbol: "WETH",
      decimals: 18,
      imageUrl: "https://etherscan.io/images/svg/brands/ethereum-original.svg",
      chainId: chains.Ethereum,
      isWrappedNative: true,
      isSpot: true,
      isPerpetual: true,
      isCollateral: true,
    },
  },
  [chains.Solana]: {
    [ZeroAddress]: {
      address: ZeroAddress,
      name: "SOLANA",
      symbol: "SOL",
      decimals: 9,
      imageUrl:
        "https://solscan.io/_next/static/media/solana-sol-logo.ecf2bf3a.svg",
      isNative: true,
      chainId: chains.Solana,
      isSpot: true,
      isStable: false,
      isPerpetual: true,
      isCollateral: true,
    },
    ["so11111111111111111111111111111111111111112"]: {
      address: "So11111111111111111111111111111111111111112",
      name: "WRAPPED SOLANA",
      symbol: "WSOL",
      decimals: 9,
      imageUrl:
        "https://solscan.io/_next/static/media/solana-sol-logo.ecf2bf3a.svg",
      chainId: chains.Solana,
      isWrappedNative: true,
      isSpot: true,
      isStable: false,
      isPerpetual: true,
      isCollateral: true,
    },
    ["epjfWdd5aufqssqem2qn1xzybapc8g4weggkzwytdt1v"]: {
      address: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
      name: "USDC",
      symbol: "USDC",
      decimals: 6,
      isStable: true,
      imageUrl:
        "https://assets.coingecko.com/coins/images/6319/thumb/USD_Coin_icon.png?1547042389",
      chainId: chains.Solana,
      isPerpetual: true,
      isSpot: true,
      isCollateral: true,
    },
  },
  [chains.Arbitrum]: {
    [ZeroAddress]: {
      address: ZeroAddress,
      name: "ETHERIUM",
      symbol: "ETH",
      decimals: 18,
      imageUrl: "https://etherscan.io/images/svg/brands/ethereum-original.svg",
      isNative: true,
      chainId: chains.Arbitrum,
      isSpot: true,
      isStable: false,
      isPerpetual: true,
      isCollateral: true,
      priceDecimals: 4,
    },
    ["0x82af49447d8a07e3bd95bd0d56f35241523fbab1"]: {
      address: "0x82aF49447D8a07e3bd95BD0d56f35241523fBab1",
      name: "WRAPPED ETHERIUM",
      symbol: "WETH",
      decimals: 18,
      imageUrl: "https://etherscan.io/images/svg/brands/ethereum-original.svg",
      chainId: chains.Arbitrum,
      isWrappedNative: true,
      isSpot: true,
      isPerpetual: true,
      isCollateral: true,
    },
    ["0xaf88d065e77c8cC2239327C5EDb3a432268e5831"]: {
      address: "0xaf88d065e77c8cC2239327C5EDb3A432268e5831",
    },
  },
};

export const CollateralTokens = {
  [chains.Ethereum]: {
    [ZeroAddress]: {
      address: ZeroAddress,
      name: "ETHERIUM",
      symbol: "ETH",
      decimals: 18,
      imageUrl: "https://etherscan.io/images/svg/brands/ethereum-original.svg",
      chainId: chains.Ethereum,
      isNative: true,
    },
    ["0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2"]: {
      address: "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2",
      name: "WRAPPED ETHERIUM",
      symbol: "WETH",
      decimals: 18,
      imageUrl: "https://etherscan.io/images/svg/brands/ethereum-original.svg",
      chainId: chains.Ethereum,
      isWrappedNative: true,
    },
    ["0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48"]: {
      address: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
      name: "USDC",
      symbol: "USDC",
      decimals: 6,
      isStable: true,
      imageUrl:
        "https://assets.coingecko.com/coins/images/6319/thumb/USD_Coin_icon.png?1547042389",
      chainId: chains.Ethereum,
    },
  },
  [chains.Solana]: {
    [ZeroAddress]: {
      address: ZeroAddress,
      name: "SOLANA",
      symbol: "SOL",
      decimals: 9,
      imageUrl:
        "https://solscan.io/_next/static/media/solana-sol-logo.ecf2bf3a.svg",
      chainId: chains.Solana,
      isNative: true,
    },
    ["so11111111111111111111111111111111111111112"]: {
      address: "So11111111111111111111111111111111111111112",
      name: "WRAPPED SOLANA",
      symbol: "WSOL",
      decimals: 9,
      imageUrl:
        "https://solscan.io/_next/static/media/solana-sol-logo.ecf2bf3a.svg",
      chainId: chains.Solana,
      isWrappedNative: true,
    },
    ["epjfWdd5aufqssqem2qn1xzybapc8g4weggkzwytdt1v"]: {
      address: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
      name: "USDC",
      symbol: "USDC",
      decimals: 6,
      isStable: true,
      imageUrl:
        "https://assets.coingecko.com/coins/images/6319/thumb/USD_Coin_icon.png?1547042389",
      chainId: chains.Solana,
    },
  },
  [chains.Arbitrum]: {
    [ZeroAddress]: {
      address: ZeroAddress,
      name: "ETHERIUM",
      symbol: "ETH",
      decimals: 18,
      imageUrl: "https://etherscan.io/images/svg/brands/ethereum-original.svg",
      chainId: chains.Arbitrum,
      isNative: true,
      isSpot: true,
      isStable: false,
      isPerpetual: true,
      isCollateral: true,
      priceDecimals: 4,
    },
    ["0x82af49447d8a07e3bd95bd0d56f35241523fbab1"]: {
      address: "0x82aF49447D8a07e3bd95BD0d56f35241523fBab1",
      name: "WRAPPED ETHERIUM",
      symbol: "WETH",
      decimals: 18,
      imageUrl: "https://etherscan.io/images/svg/brands/ethereum-original.svg",
      chainId: chains.Arbitrum,
      isWrappedNative: true,
      isSpot: true,
      isPerpetual: true,
      isCollateral: true,
    },
    ["0xaf88d065e77c8cc2239327C5edb3a432268e5831"]: {
      address: "0xaf88d065e77c8cC2239327C5EDb3A432268e5831",
      name: "USDC",
      symbol: "USDC",
      decimals: 6,
      isStable: true,
      imageUrl:
        "https://assets.coingecko.com/coins/images/6319/thumb/USD_Coin_icon.png?1547042389",
      chainId: chains.Arbitrum,
    },
  },
  [chains.Avalanche]: {
    [ZeroAddress]: {
      address: ZeroAddress,
      name: "AVALANCHE",
      symbol: "AVAX",
      decimals: 18,
      imageUrl:
        "https://assets.coingecko.com/coins/images/12559/small/coin-round-red.png?1604021818",
      chainId: chains.Avalanche,
      isNative: true,
    },
    ["0xb31f66aa3c1e785363f0875a1b74e27b85fd66c7"]: {
      address: "0xb31f66aa3c1e785363f0875a1b74e27b85fd66c7",
      name: "Wrapped AVAX",
      symbol: "WAVAX",
      decimals: 18,
      imageUrl:
        "https://assets.coingecko.com/coins/images/12559/small/coin-round-red.png?1604021818",
      chainId: chains.Avalanche,
      isWrappedNative: true,
    },
    ["0xb97ef9ef8734c71904d8002f8b6bc66dd9c48a6e"]: {
      name: "USD Coin",
      symbol: "USDC",
      address: "0xB97EF9Ef8734C71904D8002F8b6Bc66Dd9c48a6E",
      decimals: 6,
      isStable: true,
      imageUrl:
        "https://assets.coingecko.com/coins/images/6319/thumb/USD_Coin_icon.png?1547042389",
      chainId: chains.Avalanche,
    },
  },
};

export const PerpCollateral = {
  [chains.Arbitrum]: {
    ["USDC"]: {
      address: "USDC",
      name: "USDC",
      symbol: "USDC",
      decimals: 6,
      isStable: true,
      imageUrl:
        "https://assets.coingecko.com/coins/images/6319/thumb/USD_Coin_icon.png?1547042389",
    },
  }
}

export const DEFAULT_SPOT_TOKENS = {
  [chains.Avalanche]: "0x152b9d0FdC40C096757F570A51E494bd4b943E50",
  [chains.Ethereum]: "0xcbb7c0000ab88b473b1f5afd9ef808440eed33bf",
  [chains.Arbitrum]: "0xcbb7c0000ab88b473b1f5afd9ef808440eed33bf",
  [chains.Solana]: "So11111111111111111111111111111111111111112",
};

export const nativeToken = {
  [chains.Avalanche]: {
    address: "0xb31f66aa3c1e785363f0875a1b74e27b85fd66c7",
  },
};

export const USDCToken = {
  [chains.Avalanche]: {
    address: "0xb97ef9ef8734c71904d8002f8b6bc66dd9c48a6e",
  },
};

