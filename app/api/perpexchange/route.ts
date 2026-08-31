import { NextResponse } from "next/server";
const DEX_EXCHANGE_API = [
    {
        url: "https://api.datawallet.com/api",
        // headers: {
        //     "content-type": "application/json",
        //     "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36"
        // },
        // rateLimiter: {
        //     id: "DATA_WALLET_FRONTEND_URL_001",
        //     requestCount: 60,
        //     requestIntervalMs: 60000
        // }
    },
    {
        url: "https://data.coinperps.com/api",
        // headers: {
        //     "content-type": "application/json",
        //     "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36"
        // },
        // rateLimiter: {
        //     id: "COIN_PERP_FRONTEND_API",
        //     requestCount: 100,
        //     requestIntervalMs: 60000
        // }
    }
]
export async function GET(request: Request) {
    for (const api of DEX_EXCHANGE_API) {
        try {
            const response = await fetch(`${api.url}/mv/futures-market-data?pageNum=1&pageSize=50&exchange=All`);
            const data = await response.json();
            return NextResponse.json(data);
        } catch (error) {
            continue
        }
    }
    return NextResponse.json({ error: "Failed to fetch data" }, { status: 500 });
}