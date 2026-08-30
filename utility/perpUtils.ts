export const normalizeAsterSymbol = (symbol: string): string => {
    const normalized = symbol.trim().toUpperCase();
    if (!normalized) return "";
    if (normalized.endsWith("USDT") || normalized.endsWith("USDC") || normalized.endsWith("BUSD")) {
        return normalized;
    }
    return `${normalized}USDT`;
};

export const normalizeHyperLiquidSymbol = (symbol: string): string => {
    const normalized = symbol.trim().toUpperCase();
    if (!normalized) return "";
    if (normalized.endsWith("USDT") || normalized.endsWith("USDC") || normalized.endsWith("BUSD")) {
        return normalized;
    }
    return `${normalized}USDC`;
};

export const normalizeCoin = (symbol: string): string => {
    const normalized = (symbol ?? "").trim().toUpperCase();
    if (!normalized) return "";
    return normalized.replace(/(USDT|USDC|BUSD)$/i, "") || normalized;
};

export const CATEGORIES = [
    'All markets',
    'Top',
    'New',
    'Meme',
    'Stocks',
    'AI',
    'Pre-launch',
    'Metals',
];

export const getCryptoIcon = (symbol: string): string => {
    const asset = normalizeCoin(symbol);
    const iconMap: Record<string, string> = {
        BTC: 'https://cryptologos.cc/logos/bitcoin-btc-logo.png',
        ETH: 'https://cryptologos.cc/logos/ethereum-eth-logo.png',
        BNB: 'https://cryptologos.cc/logos/bnb-bnb-logo.png',
        SOL: 'https://cryptologos.cc/logos/solana-sol-logo.png',
        XRP: 'https://cryptologos.cc/logos/xrp-xrp-logo.png',
        ADA: 'https://cryptologos.cc/logos/cardano-ada-logo.png',
        DOGE: 'https://cryptologos.cc/logos/dogecoin-doge-logo.png',
        HYPE: 'https://avatars.githubusercontent.com/u/129421375?s=200&v=4',
        ASTER: 'https://static.asterindex.com/cloud-futures/static/images/aster/logo.svg',
    };

    if (iconMap[asset]) {
        return iconMap[asset];
    }

    return asset.slice(0, 1).toUpperCase() || '?';
};