import { PRECISION, PRECISION_DECIMALS } from "@/constants/common/utils";

export const bigMath = {
  abs(x: bigint) {
    return x < BigInt(0) ? -x : x;
  },
  mulDiv(x: bigint, y: bigint, z: bigint) {
    return (x * y) / z;
  },
  max(max: bigint, ...rest: bigint[]) {
    return rest.reduce((currentMax, val) => (currentMax < val ? val : currentMax), max);
  },
  min(min: bigint, ...rest: bigint[]) {
    return rest.reduce((currentMin, val) => (currentMin > val ? val : currentMin), min);
  },
  avg(...values: (bigint | undefined)[]) {
    let sum = BigInt(0);
    let count = BigInt(0);
    for (const value of values) {
      if (value !== undefined) {
        sum += value;
        count += BigInt(1);

      }
    }

    if (count === BigInt(0)) {
      return undefined;
    }

    return sum / count;
  },
  divRound(x: bigint, y: bigint) {
    return x / y + ((x % y) * BigInt(2) > y ? BigInt(1) : BigInt(0));
  },
  divRoundUp(x: bigint, y: bigint) {
    return (x + y - BigInt(1)) / y;
  },
};

export function convertToUsd(tokenAmount: bigint, tokenDecimals: number, price: bigint) {
  if (tokenAmount == undefined || typeof tokenDecimals !== "number" || price === undefined) {
    return undefined;
  }
  return (tokenAmount * price) / expandDecimals(1, tokenDecimals);
}

export function expandDecimals(n: number, decimals: number) {
  return BigInt(n) * BigInt(10) ** BigInt(decimals);
}

export function applyFactor(value: bigint, factor: bigint) {
  return (value * factor) / PRECISION;
}

export function basisPointsToFloat(basisPoints: bigint) {
  return (basisPoints * PRECISION) / BigInt(10000);
}



// export function getIsEquivalentTokens(tokenA, tokenB) {
//   return tokenA.toLowerCase() == tokenB.toLowerCase()
// }

export const trimZeroDecimals = (amount: string) => {
  if (parseFloat(amount) === parseInt(amount)) {
    return parseInt(amount).toString();
  }
  return amount;
};

export const limitDecimals = (amount: string, maxDecimals: number) => {
  let amountStr = amount.toString();
  if (maxDecimals === undefined) {
    return amountStr;
  }
  if (maxDecimals === 0) {
    return amountStr.split(".")[0];
  }
  const dotIndex = amountStr.indexOf(".");
  if (dotIndex !== -1) {
    let decimals = amountStr.length - dotIndex - 1;
    if (decimals > maxDecimals) {
      amountStr = amountStr.substr(0, amountStr.length - (decimals - maxDecimals));
    }
  }
  return amountStr;
};

export const formatAmountFree = (amount: string, tokenDecimals: number, displayDecimals: number) => {
  if (amount === undefined || amount === null) {
    return "...";
  }
  let amountStr = (BigInt(amount) / BigInt(10) ** BigInt(tokenDecimals)).toString();
  amountStr = limitDecimals(amountStr, displayDecimals);
  return trimZeroDecimals(amountStr);
};

export const formateUsdAmount = (usdAmount: any, displayDecimals: number) => {
  return formatAmountFree(usdAmount, PRECISION_DECIMALS, displayDecimals);
}


export const isValidPrice = (price: bigint) => {
  return price !== undefined && price > BigInt(0);
}


export function getTokenAmountFromUsd(tokenPrice: bigint, tokenDecimals: number, usdAmount: bigint) {
  if (usdAmount === undefined || tokenDecimals == undefined || !isValidPrice(tokenPrice)) {
    return;
  }
  return (usdAmount * expandDecimals(1, tokenDecimals)) / tokenPrice;
}

export function parseNumberWithDecimal(price: string, tokenDecimals: number) {
  return BigInt(price) * expandDecimals(1, tokenDecimals);
}


export function convertToTokenAmount(usd: bigint, tokenDecimals: number, price: bigint) {
  if (usd === undefined || typeof tokenDecimals !== "number" || !isValidPrice(price)) {
    return undefined;
  }
  return (usd * expandDecimals(1, tokenDecimals)) / price;
}





// export function getIsEquivalentTokens(token1:Token, token2:Token) {

//   if (token1.address === token2.address) {
//     return true;
//   }

//   // if (token1.wrappedAddress === token2.address || token2.wrappedAddress === token1.address) {
//   //   return true;
//   // }

//   if ((token1.isSynthetic || token2.isSynthetic) && token1.symbol === token2.symbol) {
//     return true;
//   }

//   return false;
// }