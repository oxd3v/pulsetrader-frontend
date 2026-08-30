import { chainConfig } from "@/constants/common/chain";
import { nativeFetchRequest, withQuery } from "./fetchRequest";


const Gecho_network_identifier: any = {
    43114: 'avax',
    1: 'eth',
    42161: 'arbitrum',
    1399811149: 'sol'
}

const GECHO_TERMINAL_HEADERS = {
    "Content-Type": "application/json",
    "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36 Edg/139.0.0.0",
};

const GECHO_TERMINAL_API = "https://app.geckoterminal.com/api/p1";
const GECHO_TERMINAL_RATE_LIMITER = {
    id: 'gechoTerminalRateLimiter001',
    requestCount: 10,
    requestIntervalMs: 10000,
}

export const getFreeGechoSearch = async ({ tokenAddress }: { tokenAddress: string }) => {
    const url = `${GECHO_TERMINAL_API}/search?query=${tokenAddress}`;
    try {
        const response = await nativeFetchRequest({
            url,
            method: "GET",
            headers: GECHO_TERMINAL_HEADERS,
            timeoutMs: 10000,
            urlRateLimiter: GECHO_TERMINAL_RATE_LIMITER
        });
        return response;
    } catch (err) {
        return err;
    }
};

export const fetchFreeGechoTokenPrice = async ({
    tokenAddress,
    chainId,
}: {
    tokenAddress: string;
    chainId: number;
}) => {
    const chainName = chainConfig[chainId].name.toLowerCase();
    const searchDetails = await getFreeGechoSearch({ tokenAddress });
    if (searchDetails.data?.attributes && searchDetails.data?.attributes.pools.length > 0) {
        const pairs = searchDetails.data.attributes.pools;
        for (const pair of pairs) {
            const networkName = pair.network.name.toLowerCase();
            const tokens = pair.tokens.map((t: any) => t.address.toLowerCase());
            if (networkName === chainName && tokens.includes(tokenAddress.toLowerCase())) {
                return pair.price_in_usd;
            }
        }
    }
    return null;
};

export const getFreeGechoCandleData = async ({
    poolId,
    pairId,
    resolution,
    timeFrom,
    timeTo,
    limit,
}: {
    poolId: string;
    pairId: string;
    resolution: string;
    timeFrom: number;
    timeTo: number;
    limit: number;
}) => {
    const url = `${GECHO_TERMINAL_API}/candlesticks/${poolId}/${pairId}?resolution=${resolution}&from_timestamp=${timeFrom}&to_timestamp=${timeTo}&for_update=false&count_back=${limit}&currency=usd&is_inverted=false`;
    try {
        const response = await nativeFetchRequest({
            url,
            method: "GET",
            headers: GECHO_TERMINAL_HEADERS,
            timeoutMs: 20000,
            urlRateLimiter: GECHO_TERMINAL_RATE_LIMITER
        });
        return response.data.map((d: any) => ({
            time: Date.parse(d.dt),
            high: parseFloat(d.h),
            low: parseFloat(d.l),
            close: parseFloat(d.c),
            open: parseFloat(d.o),
            volume: parseFloat(d.v || 0),
        }));
    } catch (err) {
        return err;
    }
};

export const getGechoFreePairDetails = async ({
    pairAddress,
    chainId,
}: {
    pairAddress: string;
    chainId: number;
}) => {
    const networkIdentifier = Gecho_network_identifier[chainId];
    const url = `https://app.geckoterminal.com/api/p1/${networkIdentifier}/pools/${pairAddress}?include=dex%2Cdex.network.explorers%2Cdex_link_services%2Cnetwork_link_services%2Cpairs%2Ctoken_link_services%2Ctag_link_services%2Ctokens.token_security_metric%2Ctokens.token_developer_detail%2Ctokens.tags%2Cpool_locked_liquidities%2Claunchpad_dex&base_token=0`;
    try {
        const response = await nativeFetchRequest({
            url,
            method: "GET",
            headers: GECHO_TERMINAL_HEADERS,
            timeoutMs: 10000,
            urlRateLimiter: GECHO_TERMINAL_RATE_LIMITER
        });
        const pairDetail = response.data;
        const attributes = pairDetail.attributes;
        const liquidity = parseFloat(attributes?.reserve_in_usd);
        const price = parseFloat(attributes?.price_in_usd);
        const poolId = pairDetail?.id;
        const pairId = pairDetail?.relationships?.pairs?.data?.[0]?.id;
        const priceChangePct24h = parseFloat(attributes?.price_percent_changes?.last_24h);
        const priceChangePct5m = parseFloat(attributes?.price_percent_changes?.last_5m);
        const priceChangePct1h = parseFloat(attributes.price_percent_changes.last_1h);
        const sellerCount5m = attributes.historical_data.last_5m.sellers_count;
        const buyerCount5m = attributes.historical_data.last_5m.buyers_count;
        const tradeCount5m = attributes.historical_data.last_5m.swaps_count;
        const buyCount5m = attributes.historical_data.last_5m.buy_swaps_count;
        const sellCount5m = attributes.historical_data.last_5m.sell_swaps_count;
        const sellerCount1h = attributes.historical_data.last_1h.sellers_count;
        const buyerCount1h = attributes.historical_data.last_1h.buyers_count;
        const tradeCount1h = attributes.historical_data.last_1h.swaps_count;
        const buyCount1h = attributes.historical_data.last_1h.buy_swaps_count;
        const sellCount1h = attributes.historical_data.last_1h.sell_swaps_count;
        const sellerCount24h = attributes.historical_data.last_24h.sellers_count;
        const buyerCount24h = attributes.historical_data.last_24h.buyers_count;
        const tradeCount24h = attributes.historical_data.last_24h.swaps_count;
        const buyCount24h = attributes.historical_data.last_24h.buy_swaps_count;
        const sellCount24h = attributes.historical_data.last_24h.sell_swaps_count;
        const volume24h = parseFloat(attributes.historical_data.last_24h.volume_in_usd);
        const volume1h = parseFloat(attributes.historical_data.last_1h.volume_in_usd);
        const volume5m = parseFloat(attributes.historical_data.last_5m.volume_in_usd);

        return {
            liquidity,
            price,
            poolId,
            pairId,
            priceChangePct1h,
            priceChangePct5m,
            priceChangePct24h,
            volume5m,
            volume24h,
            sellerCount5m,
            buyerCount5m,
            tradeCount5m,
            buyCount5m,
            sellCount5m,
            sellerCount1h,
            buyerCount1h,
            tradeCount1h,
            buyCount1h,
            sellCount1h,
            volume1h,
            sellerCount24h,
            buyerCount24h,
            tradeCount24h,
            buyCount24h,
            sellCount24h,
        };
    } catch (err) {
        return err;
    }
};

export const getFreeGechoTokenTDetails = async ({
    tokenAddress,
    chainId,
}: {
    tokenAddress: string;
    chainId: number;
}) => {
    let tokenDetails: any = {};
    const chainName = chainConfig[chainId].name.toLowerCase();
    const searchDetails = await getFreeGechoSearch({ tokenAddress });
    if (searchDetails.data?.attributes && searchDetails.data?.attributes.pools.length > 0) {
        const allPairs = searchDetails.data.attributes.pools;
        for (const pair of allPairs) {
            const networkName = pair.network.name.toLowerCase();
            const baseToken = pair.tokens.find((t: any) => t.is_base_token);
            const quoteToken = pair.tokens.find((t: any) => !t.is_base_token);
            if (baseToken.address.toLowerCase() === tokenAddress.toLowerCase() && networkName === chainName) {
                tokenDetails.name = baseToken.name;
                tokenDetails.symbol = baseToken.symbol;
                tokenDetails.decimals = baseToken?.decimals || 18;
                tokenDetails.address = baseToken.address;
                tokenDetails.imageUrl = baseToken.image_url;
                tokenDetails.holderCount = baseToken.holder_count;
                tokenDetails.poolId = pair.pool_id;
                tokenDetails.volumeChange24h = parseFloat(pair.volume_percent_change_24h);
                tokenDetails.pairAddress = pair.address;
                tokenDetails.priceUsd = parseFloat(pair.price_in_usd);
                tokenDetails.marketCap = parseFloat(pair.market_cap_in_usd);
                tokenDetails.fdv = parseFloat(pair.fdv_in_usd);
                tokenDetails.quoteTokenAddress = quoteToken.address;
                tokenDetails.quoteTokenSymbol = quoteToken.symbol;
                tokenDetails.quoteTokenName = quoteToken.name;
                const pairDetails: any = await getGechoFreePairDetails({
                    pairAddress: tokenDetails.pairAddress,
                    chainId,
                });
                tokenDetails = { ...tokenDetails, ...pairDetails };
                return tokenDetails;
            }
        }
    }
    return null;
};


