"use server";
import { nativeFetchRequest, } from "./fetchRequest";

const handleCodexUrlParams = [
  {
    url: "https://api-cdx.lfj.gg/",
    headers: {
      "Content-Type": "application/json",
      Origin: "https://lfj.gg",
      Referer: "https://lfj.gg/",
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36 Edg/139.0.0.0",
    },
  },
  {
    url: "https://www.defined.fi/api",
    headers: {
      ContentType: "application/json",
      Origin: "https://www.defined.fi",
      Cookie: "session=eyJhbGciOiJIUzI1NiJ9.eyJleHBpcmVzQXQiOjE3NzkzNjM2MTQ5NDIsImlhdCI6MTc3ODc1ODgxNCwiZXhwIjoxNzc5MzYzNjE0fQ.iopKdhfHwNZV58JGLGzAQxOMJMCNVaLFTeZkPTGQ19o",
      UserAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36 Edg/139.0.0.0",
    },
  },
  {
    url: "https://graph.defined.fi/graphql",
    headers: {
      "Content-Type": "application/json",
      Origin: "https://codex-marketing.vercel.app",
      Referer: "https://codex-marketing.vercel.app/",
      authorization: "46d7bcd079676023618ad2fa4239cdeb0c5594ab",
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36 Edg/139.0.0.0",
    },
  },
  // {
  //   url: "https://graph.codex.io/graphql",
  //   headers: {
  //     "Authorization": "0f706bba45133e4460fe19529b1b1902914b155d",
  //   },
  // },
];

const CODEX_CANDLE_BAR_QUERY = `query GetBars(
  $symbol: String!
  $countback: Int
  $from: Int!
  $to: Int!
  $resolution: String!
  $currencyCode: String
  $quoteToken: QuoteToken
  $statsType: TokenPairStatisticsType
  $removeLeadingNullValues: Boolean
  $removeEmptyBars: Boolean
) {
  getBars(
    symbol: $symbol
    countback: $countback
    from: $from
    to: $to
    resolution: $resolution
    currencyCode: $currencyCode
    quoteToken: $quoteToken
    statsType: $statsType
    removeLeadingNullValues: $removeLeadingNullValues
    removeEmptyBars: $removeEmptyBars
  ) {
    s # Status/Success? (Likely string or bool)
    o # Open price
    h # High price
    l # Low price
    c # Close price
    t # Timestamp
    volume
    volumeNativeToken
    buys
    buyers
    buyVolume
    sells
    sellers
    sellVolume
    liquidity
    traders
    transactions
    __typename
  }
}`;

const CODEX_FILTER_TOKENS = `query FilterTokens(
  $filters: TokenFilters
  $statsType: TokenPairStatisticsType
  $excludeTokens: [String]
  $phrase: String
  $tokens: [String]
  $rankings: [TokenRanking]
  $limit: Int
  $offset: Int
) {
  filterTokens(
    filters: $filters
    statsType: $statsType
    excludeTokens: $excludeTokens
    phrase: $phrase
    tokens: $tokens
    rankings: $rankings
    limit: $limit
    offset: $offset
  ) {
    results {
      buyCount5m
      buyCount1
      buyCount12
      buyCount24
      buyCount4
      uniqueBuys5m
      uniqueBuys1
      uniqueBuys12
      uniqueBuys24
      uniqueBuys4
      change5m
      change1
      change12
      change24
      change4
      createdAt
      exchanges {
        ...ExchangeModel
        __typename
      }
      fdv
      high5m
      high1
      high12
      high24
      high4
      holders
      lastTransaction
      liquidity
      low5m
      low1
      low12
      low24
      low4
      marketCap
      pair {
        ...PairModel
        __typename
      }
      priceUSD
      quoteToken
      sellCount5m
      sellCount1
      sellCount12
      sellCount24
      sellCount4
      uniqueSells5m
      uniqueSells1
      uniqueSells12
      uniqueSells24
      uniqueSells4
      token {
        address
        decimals
        id
        name
        networkId
        symbol
        isScam
        socialLinks {
          discord
          telegram
          twitter
          website
          __typename
        }
        imageThumbUrl
        imageSmallUrl
        imageLargeUrl
        info {
          ...BaseTokenInfo
          __typename
        }
        __typename
      }
      txnCount5m
      txnCount1
      txnCount12
      txnCount24
      txnCount4
      uniqueTransactions5m
      uniqueTransactions1
      uniqueTransactions12
      uniqueTransactions24
      uniqueTransactions4
      top10HoldersPercent
      volume5m
      volume1
      volume12
      volume24
      volume4
      swapPct7dOldWallet
      swapPct1dOldWallet
      walletAgeAvg
      walletAgeStd
      __typename
    }
    count
    page
    __typename
  }
}

fragment ExchangeModel on Exchange {
  address
  color
  exchangeVersion
  id
  name
  networkId
  tradeUrl
  iconUrl
  enabled
  __typename
}

fragment PairModel on Pair {
  address
  exchangeHash
  fee
  id
  networkId
  tickSpacing
  token0
  token1
  __typename
}

fragment BaseTokenInfo on TokenInfo {
  address
  circulatingSupply
  description
  id
  imageBannerUrl
  imageLargeUrl
  imageSmallUrl
  imageThumbUrl
  isScam
  name
  networkId
  symbol
  totalSupply
  __typename
}`;

const CODEX_TOKEN_PRICE_QUERY = `query GetTokenPrice($inputs: [GetPriceInput]) {
  getTokenPrices(inputs: $inputs) {
    priceUsd
    address
    networkId
    poolAddress
    timestamp
    __typename
  }
}`;

const CODEX_WALLET_BALANCE = `
  query GetUserBalances($input: BalancesInput!) {
    balances(input: $input) {
      items {
        address
        balance
        firstHeldTimestamp
        networkId
        shiftedBalance
        tokenAddress
        tokenId
        walletId
        tokenPriceUsd
        token {
          address
          createdAt
          creatorAddress
          decimals
          info {
            address
            imageLargeUrl
            imageSmallUrl
            imageThumbUrl
            name
            networkId
            symbol
            totalSupply
            circulatingSupply
          }
          name
          networkId
          socialLinks { twitter telegram discord website }
          symbol
          launchpad {
            launchpadName
            completed
            completedAt
            graduationPercent
            migrated
            migratedAt
          }
        }
      }
    }
  }
`;



export const fetchCodexCandleBar = async ({
  pairAddress,
  quoteToken,
  chainId,
  resolution = "1",
  from,
  to,
  createdAt = 1700000000,
  limit = 330,
}: {
  pairAddress: string;
  quoteToken: string;
  chainId: number;
  resolution: string;
  from?: number;
  to?: number;
  createdAt: number;
  limit: number;
}) => {
  //let urlConfigurration = getUrlConfigurration();
  for (let i = 0; i < handleCodexUrlParams.length; i++) {
    let urlConfigurration = handleCodexUrlParams[i];
    try {
      // Use passed 'to' or fallback to current time
      const requestTo = to || Math.floor(Date.now() / 1000);

      // Use passed 'from' or fallback to a default (limit * resolution in seconds)
      // Ensure we never request data older than the token's 'createdAt'
      const requestFrom = from
        ? Math.max(from, createdAt)
        : Math.max(requestTo - 28512000, createdAt);
      //const to = Math.floor(Date.now() / 1000);
      //let from = Math.max((to - 28512000), createdAt); // 330 days earlier
      let response = await nativeFetchRequest({
        ...urlConfigurration,
        method: "POST",
        data: {
          query: CODEX_CANDLE_BAR_QUERY,
          variables: {
            symbol: `${pairAddress}:${chainId}`,
            countback: limit,
            from: requestFrom,
            to: requestTo,
            resolution,
            currencyCode: "USD",
            quoteToken,
            statsType: "FILTERED",
          },
        },
      }).catch((err) => null);
      if (!response) {
        continue;
      }
      //console.log(response);
      let bars = response.data.getBars;
      const sanitizeBars = bars.t.map((time: number, i: number) => ({
        time: time * 1000,
        high: parseFloat(bars.h[i]),
        low: parseFloat(bars.l[i]),
        close: parseFloat(bars.c[i]),
        open: parseFloat(bars.o[i]),
        volume: parseFloat(bars.volume[i] || 0),
      }));
      return sanitizeBars;
    } catch (err) {
      continue;
    }
  }
};

export const fetchCodexFilterTokens = async ({
  variables,
}: {
  variables: any;
}) => {
  for (let i = 0; i < handleCodexUrlParams.length; i++) {
    try {
      let urlConfigurration = handleCodexUrlParams[i];
      let response = await nativeFetchRequest({
        ...urlConfigurration,
        method: "POST",
        data: {
          query: CODEX_FILTER_TOKENS,
          variables,
        },
      }).catch((err) => null);
      if (!response) continue;
      //console.log(response)

      let tokens = response.data.filterTokens.results;
      return tokens;
    } catch (err) {
      if (i == handleCodexUrlParams.length - 1) {
        throw err;
      }
      continue;
    }
  }
};

export const fetchCodexTokenPrice = async ({
  tokenAddress,
  chainId,
}: {
  tokenAddress: string;
  chainId: number;
}) => {
  for (let i = 0; i < handleCodexUrlParams.length; i++) {
    try {
      let urlConfigurration = handleCodexUrlParams[i];
      let response = await nativeFetchRequest({
        ...urlConfigurration,
        method: "POST",
        data: {
          query: CODEX_TOKEN_PRICE_QUERY,
          variables: {
            inputs: [{ address: tokenAddress, networkId: chainId }],
          },
        },
      }).catch((err) => null);
      if (!response) continue;
      //console.log(response)
      let tokenPrices = response.data.getTokenPrices[0];
      return tokenPrices.priceUsd;
    } catch (err) {
      if (i == handleCodexUrlParams.length - 1) {
        throw err;
      }
      continue;
    }
  }
};

export const fetchCodexWalletBalances = async ({
  walletAddress,
  chainId,
  limit,
}: {
  walletAddress: string;
  chainId: number;
  limit: number;
}) => {
  for (let i = 0; i < handleCodexUrlParams.length; i++) {
    try {
      let urlConfigurration = handleCodexUrlParams[i];
      let response = await nativeFetchRequest({
        ...urlConfigurration,
        method: "POST",
        data: {
          query: CODEX_WALLET_BALANCE,
          variables: {
            input: {
              includeNative: true,
              limit,
              removeScams: true,
              walletId: `${walletAddress}:${chainId}`,
            },
          },
        },
      }).catch((err) => null);
      if (!response) continue;
      //console.log(response)
      let tokenBalances = response.data.balances.items;
      return tokenBalances;
    } catch (err) {
      if (i == handleCodexUrlParams.length - 1) {
        throw err;
      }
      continue;
    }
  }
};
