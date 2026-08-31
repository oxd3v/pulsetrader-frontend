
import { nativeFetchRequest } from "./fetchRequest";
const DEX_EXCHANGE_API = [
    {
        url: "https://api.datawallet.com/api",
        headers: {
            "content-type": "application/json",
            "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36"
        },
        rateLimiter: {
            id: "DATA_WALLET_FRONTEND_URL_001",
            requestCount: 60,
            requestIntervalMs: 60000
        }
    },
    {
        url: "https://data.coinperps.com/api",
        headers: {
            "content-type": "application/json",
            "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36"
        },
        rateLimiter: {
            id: "COIN_PERP_FRONTEND_API",
            requestCount: 100,
            requestIntervalMs: 60000
        }
    }
]

export const analyzeLiquidationHeatmap = (data: any) => {
    const { y, liq, prices } = data || {};
    if (!y || !liq || !prices?.length) return null;

    const leverageMap: any = {
        0: "5x",
        1: "10x",
        2: "20x",
        3: "25x",
        4: "50x",
        5: "75x",
        6: "100x",
        7: "125x",
        8: "150x",
        9: "200x"
    };
    const getLeverageLabel = (idx: any) => leverageMap[idx] || `${idx}x`;

    const events = liq.map(([levIdx, yIdx, usd]: any) => ({
        price: parseFloat(y[yIdx]),
        leverage: getLeverageLabel(levIdx),
        liquidationUsd: parseFloat(usd)
    })).filter((e: any) => !isNaN(e.price));

    // Aggregate by price
    const priceMap = new Map();
    for (const ev of events) {
        const current = priceMap.get(ev.price) || 0;
        priceMap.set(ev.price, current + ev.liquidationUsd);
    }

    const priceProfile = Array.from(priceMap.entries())
        .map(([price, totalLiq]) => ({ price: parseFloat(price), totalLiq: parseFloat(totalLiq) }))
        .sort((a, b) => a.price - b.price);

    return priceProfile;
};

export const fetchLiquidationHeatmap = async (symbol: string, resolution = '12h', exchange = 'Binance') => {
    symbol = `${symbol.toUpperCase()}USDT`;
    try {
        for (const api of DEX_EXCHANGE_API) {
            try {
                const res = await nativeFetchRequest({
                    url: `${api.url}/liquidation/heatmap-model1?symbol=${symbol}&interval=${resolution}&exchange=${exchange}`,
                    method: "GET",
                    headers: api.headers,
                    urlRateLimiter: api.rateLimiter
                });
                if (res) return analyzeLiquidationHeatmap(res);
            } catch (err) {
                continue;
            }
        }
    } catch (err) {
        return null;
    }
    return null;
};

function formatFuturesMarketData(ticker: any) {
    if (!ticker) return null;

    return {
        symbol: ticker.symbol,
        iconUrl: ticker.iconUrl,
        currentPrice: ticker.price,
        priceChangePct5m: ticker.priceChangePercent5m,
        priceChangePct15m: ticker.priceChangePercent15m,
        priceChangePct30m: ticker.priceChangePercent30m,
        priceChangePct1h: ticker.priceChangePercent1h,
        priceChangePct4h: ticker.priceChangePercent4h,
        priceChangePct12h: ticker.priceChangePercent12h,
        priceChangePct24h: ticker.priceChangePercent24h,
        oiChange1h: ticker.oiChange1h,
        oiChange24h: ticker.oiChange24h,
        oiChangePct24h: ticker.oiChangePercent24h,
        oi: ticker.openInterest,
        oiAmount: ticker.openInterestAmount,
        volumeChangePct4h: ticker.volChangePercent4h,
        volumeChangePct1h: ticker.volChangePercent1h,
        volumeChangePct30m: ticker.volChangePercent30m,
        volumeChangePct15m: ticker.volChangePercent15m,
        volumeChangePct5m: ticker.volChangePercent5m,
        volumeChangePct24h: ticker.volChangePercent24h,
        longShortRatio5m: ticker.ls5m,
        longShortRatio15m: ticker.ls15m,
        longShortRatio30m: ticker.ls30m,
        longShortRatio1h: ticker.ls1h,
        longShortRatio24h: ticker.ls24h,
        liquidationUsd24h: ticker.liquidationUsd24h,
        liquidationUsd12h: ticker.liquidationUsd12h,
        liquidationUsd1h: ticker.liquidationUsd1h,
        longLiquidationRatio24h: parseFloat(ticker.liquidationUsd24h) > 0 ? parseFloat(ticker.longLiquidationUsd24h) / parseFloat(ticker.liquidationUsd24h) : 0,
        longLiquidationRatio12h: parseFloat(ticker.liquidationUsd12h) > 0 ? parseFloat(ticker.longLiquidationUsd12h) / parseFloat(ticker.liquidationUsd12h) : 0,
        longLiquidationRatio4h: parseFloat(ticker.liquidationUsd4h) > 0 ? parseFloat(ticker.longLiquidationUsd4h) / parseFloat(ticker.liquidationUsd4h) : 0,
        longLiquidationRatio1h: parseFloat(ticker.liquidationUsd1h) > 0 ? parseFloat(ticker.longLiquidationUsd1h) / parseFloat(ticker.liquidationUsd1h) : 0,
        oiMarketCapRatio: ticker.oiMarketCapRatio,
        oiVolRatio: ticker.oiVolRatio,
        oiVolRatioChangePct24h: ticker.oiVolRatioChangePercent24h,
        marketCap: ticker.marketCap,
    };
}

export async function fetchFuturesMarketData({ symbols = [], pageNum = 1, pageSize = 50, exchange = 'All' }: { symbols: string[], pageNum: number, pageSize: number, exchange: string }) {
    try {
        for (const api of DEX_EXCHANGE_API) {
            try {
                //const url = `${api.url}/mv/futures-market-data?pageNum=${pageNum}&pageSize=${pageSize}&exchange=${exchange}`;
                const res = await nativeFetchRequest({
                    url: '/api/perpexchange',
                    method: "GET",
                    // headers: api.headers,
                    // urlRateLimiter: api.rateLimiter
                });

                if (res && res.data && res.data.length > 0) {
                    const marketData = res.data;
                    const filteredData: any = marketData.filter((item: any) => symbols.includes(item?.symbol?.toUpperCase()))
                    return filteredData.reduce((acc: any, data: any) => {
                        acc[data.symbol] = formatFuturesMarketData(data);
                        return acc;
                    }, {});
                }
            } catch (err) {
                continue;
            }
        }
    } catch (err) {
    }
    return null;
}

export async function getLatestCryptoNews(pageSize = 5) {
    for (const api of DEX_EXCHANGE_API) {
        try {
            const response = await nativeFetchRequest({
                url: `${api.url}/newsagr?pagesize=${pageSize}`,
                method: "GET",
                headers: api.headers,
                urlRateLimiter: api.rateLimiter
            });




            // Regex to parse and isolate trailing scraper time fragments (e.g., "55m", "1h", "5h")
            const scraperTimeArtifactRegex = /\d+[mh]$/;

            const processedArticles = response.data.articles
                //.filter(article => article.isActive === true)
                .map((article: any) => {
                    // Extract the time-ago artifact if present, then sanitize the headline text
                    const timeArtifactMatch = article.title.match(scraperTimeArtifactRegex);
                    const relativeTimeAgo = timeArtifactMatch ? timeArtifactMatch[0] : null;
                    const cleanTitle = article.title.replace(scraperTimeArtifactRegex, "").trim();

                    return {
                        id: article._id,
                        title: cleanTitle,
                        source: article.platform,
                        category: article.category || "General",
                        tags: article.tags || [],
                        pulblishedAt: new Date(article.publishedAt).toLocaleString(),
                        metrics: {
                            readingTime: article.readingTime,
                            wordCount: article.wordCount
                        }
                    };
                });

            return {
                articles: processedArticles,
                pagination: {
                    currentPage: response.data.pagination.currentPage,
                    totalPages: response.data.pagination.totalPages,
                    totalCount: response.data.pagination.totalCount,
                    hasNextPage: response.data.pagination.hasNextPage,
                    hasPrevPage: response.data.pagination.hasPrevPage
                }
            };

        } catch (error) {
            console.log(error)
            continue;
        }
    }
    return null;
}

export async function getLatestCryptoTweets(pageSize = 5) {

    for (const api of DEX_EXCHANGE_API) {
        try {
            const response = await nativeFetchRequest({
                url: `${api.url}/tweets?pagesize=${pageSize}`,
                method: "GET",
                headers: api.headers,
                urlRateLimiter: api.rateLimiter
            });

            const processedTweets = response.data.tweets.map((tweet: any) => ({
                id: tweet._id,
                title: tweet.content,
                link: tweet.link,
                logo: tweet.logo,
                mediaUrls: tweet.media_urls || [],
                metrics: {
                    likes: tweet.likes || 0,
                    replies: tweet.replies || 0,
                    retweets: tweet.retweets || 0
                },
                publishedAt: new Date(tweet.created_at).toLocaleString(),
                source: tweet.account_handle,

            }));

            const pagination = response.data.pagination;

            return {
                tweets: processedTweets,
                pagination: {
                    currentPage: pagination.current_page,
                    totalPages: pagination.total_pages,
                    totalCount: pagination.total_count,
                    limit: pagination.limit
                },
                cached: response.cached || false
            };

        } catch (error) {
            continue;
        }
    }
    return null;
}

export const fetchMarketNews = async (pageSize = 5) => {
    const [news, tweets] = await Promise.all([
        getLatestCryptoNews(pageSize),
        getLatestCryptoTweets(pageSize)
    ]) as [any, any]

    return [...news?.articles, ...tweets?.tweets];
}

//fetchLiquidationHeatmap('BTC').then(console.log)
//fetchFuturesMarketData({ symbols: ['BTC', "XRP", "ADA", "SOL", "DOGE", "BNB"] }).then(console.log)
//fetchMarketNews().then(console.log)