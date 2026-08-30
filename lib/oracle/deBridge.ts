import { nativeFetchRequest, withQuery } from "./fetchRequest";
import { BASIS_POINT_DIVISOR } from "@/constants/common/utils";
const DEBRIDGE_API_URL = "https://dln.debridge.finance/v1.0";
const DEBRIDGE_HEADER = {
  "Content-Type": "application/json",
  Origin: "https://app.debridge.com",
  Referer: "https://app.debridge.com/",
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36",
};
const DEBRIDGE_REFERRAL_CODE = 4850;

export const getDeBridgeCrossChainSwapEncode = async ({
  tokenIn,
  tokenOut,
  amountIn,
  chainIdIn,
  chainIdOut,
  userAddress,
  receiver,
  feeBps = 0,
  feeReceiver,
  feeToken = 'tokenIn',
}: {
  tokenIn: string,
  tokenOut: string,
  amountIn: string | number | bigint,
  chainIdIn: number,
  chainIdOut: number,
  userAddress: string,
  receiver: string,
  feeBps?: number,
  feeReceiver?: string,
  feeToken?: string,
}) => {
  const feePercentage = Number(feeBps) > 0 ? (feeBps / BASIS_POINT_DIVISOR).toFixed(2) : 0;
  //let url = `https://dln.debridge.finance/v1.0/dln/order/create-tx?srcChainId=56&srcChainTokenIn=0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d&srcChainTokenInAmount=100000000000000000000&dstChainId=43114&dstChainTokenOut=0x9702230A8Ea53601f5cD2dc00fDBc13d4dF4A8c7&dstChainTokenOutAmount=auto&dstChainTokenOutRecipient=0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045&srcChainOrderAuthorityAddress=0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045&dstChainOrderAuthorityAddress=0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045&affiliateFeePercent=0.1&affiliateFeeRecipient=0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045`

  const url = withQuery(`${DEBRIDGE_API_URL}/dln/order/create-tx`, {
    srcChainId: chainIdIn,
    srcChainTokenIn: tokenIn,
    srcChainTokenInAmount: amountIn,
    dstChainId: chainIdOut,
    dstChainTokenOut: tokenOut,
    dstChainTokenOutAmount: 'auto',
    dstChainTokenOutRecipient: receiver,
    srcChainOrderAuthorityAddress: userAddress,
    dstChainOrderAuthorityAddress: userAddress,
    ...((feeBps && Number(feePercentage) > 0) && {
      affiliateFeePercent: feePercentage,
      affiliateFeeRecipient: feeReceiver,
    })
  });


  let res = await nativeFetchRequest({
    url,
    method: "GET",
    headers: DEBRIDGE_HEADER,
  });

  if (
    !res ||
    !res?.tx ||
    !res?.tx?.data ||
    res?.tx?.data == "" ||
    res?.tx?.data == "0x"
  ) {
    throw new Error("ROUTE_FAILED");
  }

  return {
    success: true,
    routerAddress: res.tx.to,
    orderId: res.orderId,
    gasFee: res.estimatedTransactionFee.total,
    amountOut: BigInt(res?.estimation?.dstChainTokenOut?.recommendedAmount || res?.estimation?.dstChainTokenOut?.maxTheoreticalAmount || res?.estimation?.dstChainTokenOut?.amount || 0),
    txData: {
      to: res.tx.to,
      data: res.tx.data,
      value: res.tx.value || "0",
    },
    response: res,
  };
};

export const getDeBridgeSwapEncode = async ({
  tokenIn,
  tokenOut,
  amountIn,
  chainId,
  slippageBps,
  userAddress,
  feeBps,
  feeReceiver,
  priority = 1,
}: {
  tokenIn: string, tokenOut: string,
  amountIn: string | number | bigint,
  chainId: number,
  slippageBps: number,
  userAddress: string,
  feeBps: number,
  feeReceiver: string,
  priority?: number
}) => {
  if (typeof amountIn === "bigint") {
    amountIn = String(amountIn);
  }

  const slippagePercentage = (slippageBps / BASIS_POINT_DIVISOR).toFixed(2);
  const feePercentage = Number(feeBps) > 0 ? (feeBps / BASIS_POINT_DIVISOR).toFixed(2) : 0;
  const url = withQuery(`${DEBRIDGE_API_URL}/chain/transaction`, {
    chainId,
    tokenIn,
    tokenInAmount: amountIn,
    tokenOut,
    srcChainPriorityLevel: priority == 1 ? "normal" : "aggressive",
    slippage: slippagePercentage,
    tokenOutRecipient: userAddress,
    senderAddress: userAddress,
    referralCode: DEBRIDGE_REFERRAL_CODE,
    ...(Number(feeBps) > 0 && {
      affiliateFeePercent: feePercentage,
      affiliateFeeRecipient: feeReceiver,
    })
  })
  let res = await nativeFetchRequest({
    url,
    method: "GET",
    //headers: DEBRIDGE_HEADER,
  });

  if (
    !res ||
    !res?.tx?.to ||
    !res?.tx?.data ||
    res?.tx?.data == "" ||
    res?.tx?.data == "0x" ||
    BigInt(res?.tokenOut?.amount || 0) <= BigInt(0)
  ) {
    throw new Error("ROUTE_FAILED");
  }

  return {
    success: true,
    txData: res.tx,
    routerAddress: res.tx.to,
    amountOut: BigInt(res?.tokenOut?.amount),
    orderId: res.orderId,
    response: res,
  };
};

// export const pollDeBridgeCompletion = async ({ orderId, originTxHash }) => {
//   const bridgeResult = {
//     status: 'pending',
//     dstTxHash: null,
//     amountOut: null,
//     error: null
//   }
//   const url = `${DEBRIDGE_API_URL}/dln/order/${orderId}/status`
//   const response = await nativeFetchRequest({
//     url,
//     method: 'GET',
//     headers: DEBRIDGE_HEADER,
//   });
//   const status = response?.status;
//   if (status) {
//     if (status == 'Fulfilled') {
//       bridgeResult.status = 'success'
//       try {
//         const txResult = await fetch(`https://dln-api.debridge.finance/api/Orders/creationTxHash/${originTxHash}`)
//         const receipt = await txResult.json();
//         const receiveAmount = receipt.actualFulfillAmount.stringValue
//         const destTxHash = receipt.fulfilledDstEventMetadata.transactionHash.stringValue;
//         bridgeResult.dstTxHash = destTxHash;
//         bridgeResult.amountOut = BigInt(receiveAmount);
//       } catch (err) {
//         bridgeResult.dstTxHash = null;
//         bridgeResult.amountOut = null;
//       }

//     } else if (['SentUnlock', 'Created', 'None', 'ClaimedUnlock'].includes(status)) {
//       bridgeResult.status = 'pending'
//     } else if (['OrderCancelled', 'SentOrderCancel', 'ClaimedOrderCancel'].includes(status)) {
//       bridgeResult.status = 'failed'
//       bridgeResult.error = response.failure?.reason || 'Bridge failed'
//     }
//   }

//   return bridgeResult;
// }

// getDeBridgeCrossChainSwapEncode({
//   tokenIn: '0xB97EF9Ef8734C71904D8002F8b6Bc66Dd9c48a6E',
//   tokenOut: '0x0000000000000000000000000000000000000000',
//   amountIn: '15000000',
//   chainIdIn: 43114,
//   chainIdOut: 42161,
//   userAddress: '0x8048fde03eEC8Aee712d667FA65f0F125fc1BBeA',
//   receiver: '0x8048fde03eEC8Aee712d667FA65f0F125fc1BBeA',
//   slippageBps: 50,
//   feeBps: 50,
//   feeReceiver: '0x8048fde03eEC8Aee712d667FA65f0F125fc1BBeA',
//   feeToken: 'tokenIn',
// }).then(r => console.log(r.response.estimation.dstChainTokenOut)).catch(console.error);


// getDeBridgeSwapRoute({
//   tokenIn: "0xB97EF9Ef8734C71904D8002F8b6Bc66Dd9c48a6E",
//   tokenOut: "0x0000000000000000000000000000000000000000",
//   amountIn: "1000000000",
//   chainId: 43114,
//   slippageBps: 100,
//   userAddress: "0x4f2735527c285d23922377d569f216bfdfa8c461",
//   feeBps: 0,
//   feeReceiver: "0x4f2735527c285d23922377d569f216bfdfa8c461",
// }).then(console.log)


