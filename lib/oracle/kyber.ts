import { chainConfig } from "@/constants/common/chain";
import { EVM_NATIVE_ADDRESS, EVM_ZERO_ADDRESS } from "@/constants/common/utils";
import { nativeFetchRequest, withQuery } from "./fetchRequest";


const KYBER_API = "https://aggregator-api.kyberswap.com";
const CLIENT_ID = "kyberswap";
const KYBER_HEADERS = {
    "Content-Type": "application/json",
    "Origin": "https://kyberswap.com",
    "Referer": "https://kyberswap.com/",
    "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36",
    "X-Client-Id": CLIENT_ID,
};


export async function getKyberSwapEncode(
    { tokenIn, tokenOut, amountIn, chainId, slippageBps, userAddress, feeBps, feeReceiver, feeToken, priority = 1 }: {
        tokenIn: string;
        tokenOut: string;
        amountIn: string | bigint;
        chainId: number;
        slippageBps: number;
        userAddress: string;
        feeBps: number;
        feeReceiver: string;
        feeToken: "tokenIn" | "tokenOut";
        priority?: 1 | 2 | 3;
    }) {
    let chainName = chainConfig[chainId].name.toLowerCase();

    if (tokenIn === EVM_ZERO_ADDRESS) tokenIn = EVM_NATIVE_ADDRESS;
    if (tokenOut === EVM_ZERO_ADDRESS) tokenOut = EVM_NATIVE_ADDRESS;
    if (typeof amountIn == "bigint") amountIn = amountIn.toString();
    const url = withQuery(`${KYBER_API}/${chainName}/route/encode`, {
        tokenIn,
        tokenOut,
        amountIn,
        gasInclude: priority == 1 ? true : false,
        to: userAddress,
        slippageTolerance: slippageBps,
        deadline: Math.floor(Date.now() / 1000) + 600,
        ...(Number(feeBps) > 0 && {
            feeAmount: feeBps,
            isInBps: true,
            chargeFeeBy: feeToken === "tokenIn" ? "currency_in" : "currency_out",
            feeReceiver,
        }),
    })
    const res = await nativeFetchRequest({
        url,
        method: "GET",
        headers: KYBER_HEADERS,
    });

    if (!res || !res.encodedSwapData || BigInt(res.outputAmount || 0) <= BigInt(0) || res.encodedSwapData == '' || res.encodedSwapData == '0x') {
        throw new Error("ROUTE_FAILED");
    }

    let amountOut = BigInt(res.outputAmount);
    let routerAddress = res.routerAddress;
    let txData = {
        to: res.routerAddress,
        data: res.encodedSwapData,
        value: tokenIn == EVM_NATIVE_ADDRESS ? amountIn : "0"
    }

    return {
        success: true,
        routerAddress,
        amountOut,
        txData,
        gasLimit: res.totalGas,
        response: res
    }
}

// getKyberSwapEncode({
//   tokenIn: "0xB97EF9Ef8734C71904D8002F8b6Bc66Dd9c48a6E",
//   tokenOut: "0x0000000000000000000000000000000000000000",
//   amountIn: "1000000000",
//   chainId: 43114,
//   slippageBps: 100,
//   userAddress: "0x4f2735527c285d23922377d569f216bfdfa8c461",
//   feeBps: 0,
//   feeReceiver: "0x4f2735527c285d23922377d569f216bfdfa8c461",
//   feeToken: "tokenIn",
//   priority: 1
// }).then(console.log)


