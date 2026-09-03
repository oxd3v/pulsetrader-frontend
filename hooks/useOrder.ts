// @/hooks/useOrder.ts
import { OrderType } from "@/type/order";
import { WalletType } from "@/type/common";
import { PRECISION_DECIMALS } from "@/constants/common/utils";
import { safeParseUnits } from "@/utility/handy";
import { chains } from "@/constants/common/chain";
import OrderService from "@/service/order-service";
import { useStore } from "@/store/useStore";
import { useShallow } from "zustand/shallow";
import {
  handleServerErrorToast,
  notify,
  notifyFromApiError,
  notifyWithResponseError,
} from "@/lib/utils";
import {
  isTradeFeeExemptStatus,
  getGridMultiplierNthValue,
  getGridNthPrice,
  validateCollateralIsStable,
} from "@/utility/orderUtility";


export const useOrder = () => {
  const { setUserOrders, systemInfo } = useStore(
    useShallow((state: any) => ({
      setUserOrders: state.setUserOrders,
      systemInfo: state.systemInfo,
    })),
  );

  const configurePerpOrder = (config: any): OrderType[] => {
    const {
      gridNumber,
      targetPrice,
      mode,
      activeStopLoss,
      entryLogic,
      entryWeight,
      entryType = "price",
      orderSizeMultiplier,
      initialOrderSize,
      gridMultiplier,
      gridDistance,
      collateralToken,
      outputToken,
      orderToken,
      priority,
      executionSpeed,
      orderName,
      strategy,
      chainId,
      isTrailingMode,
      tpPercentage,
      slPercentage,
      isReEntrance,
      reEntrancePercentage,
      slippage,
      leverage,
      isLong,
      protocol,
      positionMode = "ONE_WAY",
      feeToken,
      feeTokenPrice,
      user,
    } = config;

    const parsedEntryPrice = safeParseUnits(targetPrice, PRECISION_DECIMALS);
    const parsedBaseAmount = safeParseUnits(initialOrderSize, collateralToken.decimals);
    const slBps = Math.floor(slPercentage * 100);
    const tpBps = Math.floor(tpPercentage * 100);
    const ifFeeExempt = user.status === "admin" || isTradeFeeExemptStatus(systemInfo.userLevels, user.status, mode);
    const effectiveFeeToken = ifFeeExempt ? null : feeToken;   // <-- use this in baseOrder

    // let parsedFeeTokenPrice: bigint | undefined;
    // let feeTokenDecimals: number | undefined;

    // if (effectiveFeeToken) {
    //   // Check if fee token is the same as collateral (or different)
    //   const isSameAsCollateral = collateralToken.symbol.toLowerCase() === effectiveFeeToken.symbol.toLowerCase();

    //   if (!isSameAsCollateral) {
    //     // Fetch fee token price only once

    //     const priceUsd = feeTokenPrice;
    //     if (!priceUsd) {
    //       // Handle missing price – you may want to throw or set to 0
    //       throw new Error("Unable to fetch fee token price");
    //     }
    //     parsedFeeTokenPrice = safeParseUnits(priceUsd, PRECISION_DECIMALS);
    //     feeTokenDecimals = effectiveFeeToken.decimals;
    //   }
    // }

    const baseOrder: Partial<OrderType> = {
      user: "",
      chainId,
      name: orderName,
      strategy,
      category: "perpetual",
      orderType: "BUY",
      orderStatus: "PENDING",
      orderMode: mode,
      orderAsset: {
        collateralToken,
        outputToken,
        perpSymbolInfo: orderToken.symbol,
        orderToken: orderToken,
        feeToken: effectiveFeeToken || null,
      },
      perp: {
        isLong,
        leverage: Number(leverage),
        protocol: protocol || "asterdex",
        slippageBps: Number(slippage),
        amount: {
          orderSize: "0",
          margin: "0",
          quantity: "0",
        },
      },
      entry: {
        entryCriteria: entryType,
        priceEntry: null,
        technicalLogic: null,
        technicalWeights: null,
      },
      exit: {
        takeProfit: {
          profitUsd: "0",
          takeProfitPctBps: tpBps,
          takeProfitPrice: "0",
          operator: isLong ? "GREATER_THAN" : "LESS_THAN",
        },
        stopLoss: {
          isActive: activeStopLoss,
          saveUsd: "0",
          stopLossPctBps: slBps,
          stopLossPrice: "0",
          operator: isLong ? "LESS_THAN" : "GREATER_THAN",
        },
        isTrailingMode,
      },
      reEntrance: {
        isReEntrance,
        reEntranceLimit: Math.floor(reEntrancePercentage * 100),
      },
      isActive: true,
      isBusy: false,
      additional: {
        priority: Number(priority),
        executionSpeed,
        retry: 0,
        inProcessing: null,
      },
      cost: {
        txFeeInUsd: "0",
        payInUsd: "0",
        protocolFeeInUsd: "0",
      },
    };

    const estOrders: OrderType[] = [];

    if (gridNumber > 1) {
      for (let i = 0; i < gridNumber; i++) {
        const orderIndex = i + 1;
        const rawSize = getGridMultiplierNthValue({
          initialValue: parsedBaseAmount,
          multiplier: orderSizeMultiplier,
          n: orderIndex,
        });

        const targetPriceNth = getGridNthPrice({
          entryPrice: parsedEntryPrice,
          gridDistance,
          gridMultiplier,
          n: orderIndex,
          decrement: isLong,
        });

        const order = JSON.parse(JSON.stringify(baseOrder)) as OrderType;
        order.sl = orderIndex;
        order.perp!.amount.orderSize = rawSize.toString();

        order.entry.priceEntry = {
          operator: isLong ? "LESS_THAN" : "GREATER_THAN",
          targetPriceUsd: targetPriceNth.toString(),
        };
        estOrders.push(order);
      }
    } else {
      const order = JSON.parse(JSON.stringify(baseOrder)) as OrderType;
      order.sl = 1;
      order.perp!.amount.orderSize = parsedBaseAmount.toString();
      if (entryType === "price") {
        order.entry.priceEntry = {
          operator: isLong ? "LESS_THAN" : "GREATER_THAN",
          targetPriceUsd: parsedEntryPrice.toString(),
        };
      } else if (entryType === "logic" && entryLogic) {
        order.entry.technicalLogic = entryLogic || null;
        order.entry.priceEntry = null;
        order.entry.technicalWeights = null;
      } else if (entryType === "weight" && entryWeight) {
        order.entry.technicalWeights = entryWeight || null;
        order.entry.priceEntry = null;
        order.entry.technicalLogic = null;
      }
      estOrders.push(order);
    }

    return estOrders;
  };

  const configureSpotOrder = (config: any): OrderType[] => {
    const {
      gridNumber,
      targetPrice,
      mode,
      activeStopLoss,
      entryLogic,
      entryWeight,
      entryType = "price",
      orderSizeMultiplier,
      initialOrderSize,
      gridMultiplier,
      gridDistance,
      collateralToken,
      outputToken,
      orderToken,
      priority,
      executionSpeed,
      orderName,
      strategy,
      chainId,
      isTrailingMode,
      tpPrice,
      slPrice,
      tpPercentage,
      slPercentage,
      isReEntrance,
      reEntrancePercentage,
      slippage,
      feeToken,
    } = config;

    const isSellStrategy = strategy === "sellToken";
    const parseTargetPrice = safeParseUnits(targetPrice, PRECISION_DECIMALS);
    let baseAmount = safeParseUnits(initialOrderSize, collateralToken.decimals);

    if (isSellStrategy) {
      baseAmount = safeParseUnits(initialOrderSize, orderToken.decimals);
    }

    const slBps = Math.floor(slPercentage * 100);
    const tpBps = Math.floor(tpPercentage * 100);

    const baseOrder: Partial<OrderType> = {
      user: "",
      chainId,
      name: orderName,
      strategy,
      category: "spot",
      orderType: isSellStrategy ? "SELL" : "BUY",
      orderStatus: "PENDING",
      orderMode: mode,
      orderAsset: {
        collateralToken,
        orderToken,
        outputToken,
        feeToken: feeToken || null,
      },
      entry: {
        entryCriteria: isSellStrategy ? "price" : entryType,
        priceEntry: null,
        technicalLogic: null,
        technicalWeights: null,
      },
      exit: {
        takeProfit: {
          profitUsd: "0",
          takeProfitPctBps: tpBps,
          takeProfitPrice: isSellStrategy ? parseTargetPrice.toString() : "0",
          operator: "GREATER_THAN",
        },
        stopLoss: {
          isActive: activeStopLoss,
          saveUsd: "0",
          stopLossPctBps: slBps,
          stopLossPrice: isSellStrategy ? slPrice || "0" : "0",
          operator: "LESS_THAN",
        },
        isTrailingMode,
      },
      reEntrance: {
        isReEntrance,
        reEntranceLimit: Math.floor(reEntrancePercentage * 100),
      },
      spot: {
        slippageBps: Number(slippage),
        protocol: null,
        amount: {
          orderSize: isSellStrategy ? "0" : "0",
          tokenAmount: isSellStrategy ? "0" : "0",
        },
      },
      isActive: true,
      isBusy: false,
      additional: {
        priority: Number(priority),
        executionSpeed,
        retry: 0,
        inProcessing: null,
      },
      cost: {
        txFeeInUsd: "0",
        payInUsd: "0",
        protocolFeeInUsd: "0",
      },
    };

    const estOrders: OrderType[] = [];

    if (gridNumber > 1) {
      for (let i = 0; i < gridNumber; i++) {
        const orderIndex = i + 1;
        const rawSize = getGridMultiplierNthValue({
          initialValue: baseAmount,
          multiplier: orderSizeMultiplier,
          n: orderIndex,
        });
        const targetPriceNth = getGridNthPrice({
          entryPrice: parseTargetPrice,
          gridDistance,
          gridMultiplier,
          n: orderIndex,
          decrement: !isSellStrategy,
        });

        const order = JSON.parse(JSON.stringify(baseOrder)) as OrderType;
        order.sl = orderIndex;
        if (isSellStrategy) {
          order.spot!.amount.tokenAmount = rawSize.toString();
          order.exit!.takeProfit.takeProfitPrice = targetPriceNth.toString();
        } else {
          order.spot!.amount.orderSize = rawSize.toString();
          order.entry.priceEntry = {
            operator: "LESS_THAN",
            targetPriceUsd: targetPriceNth.toString(),
          };
        }
        estOrders.push(order);
      }
    } else {
      const order = JSON.parse(JSON.stringify(baseOrder)) as OrderType;
      order.sl = 1;
      if (isSellStrategy) {
        order.spot!.amount.tokenAmount = baseAmount.toString();
        order.entry.priceEntry = null;
        order.exit!.takeProfit.takeProfitPrice = parseTargetPrice.toString();
        if (activeStopLoss && slPrice) {
          order.exit!.stopLoss.stopLossPrice = slPrice;
          order.exit!.stopLoss.isActive = true;
        }
      } else {
        order.spot!.amount.orderSize = baseAmount.toString();
        if (entryType === "price") {
          order.entry.priceEntry = {
            operator: "LESS_THAN",
            targetPriceUsd: parseTargetPrice.toString(),
          };
        } else if (entryType === "logic" && entryLogic) {
          order.entry.technicalLogic = entryLogic || null;
          order.entry.priceEntry = null;
          order.entry.technicalWeights = null;
        } else if (entryType === "weight" && entryWeight) {
          order.entry.technicalWeights = entryWeight || null;
          order.entry.priceEntry = null;
          order.entry.technicalLogic = null;
        }
      }
      estOrders.push(order);
    }

    return estOrders;
  };

  const submitOrder = async ({
    orderParams,
    gridsByWallet,
    estOrders,
    areWalletsReady,
    category,
    user,
  }: {
    orderParams: any;
    gridsByWallet: Record<number, WalletType>;
    estOrders: OrderType[];
    areWalletsReady: boolean;
    category: "spot" | "perpetual";
    user: any;
  }) => {
    let orderAddResult = { added: false, error: null as string | null };
    try {
      if (estOrders.length === 0 || !areWalletsReady) {
        notifyFromApiError("INVALID_EST_ORDERS");
        orderAddResult.error = "INVALID_EST_ORDERS";
        return orderAddResult;
      }

      const { chainId, strategy, orderName, mode } = orderParams;

      if (!chainId || !Object.values(chains).includes(chainId)) {
        notifyFromApiError("UNSUPPORTED_NETWORK");
        orderAddResult.error = "UNSUPPORTED_NETWORK";
        return orderAddResult;
      }

      if (!orderName) {
        notifyFromApiError("INVALID_ORDER_NAME");
        orderAddResult.error = "INVALID_ORDER_NAME";
        return orderAddResult;
      }

      if (!strategy) {
        notifyFromApiError("INVALID_ORDER_STRATEGY");
        orderAddResult.error = "INVALID_ORDER_STRATEGY";
        return orderAddResult;
      }

      if (user.status !== "admin") {
        const state = systemInfo.userLevels[user.status.toUpperCase()];
        if (!state) {
          notifyFromApiError("USER_NOT_ELIGIBLE");
          orderAddResult.error = "USER_NOT_ELIGIBLE";
          return orderAddResult;
        }
        if (!state.benefits.supportStrategy.includes(strategy)) {
          notifyFromApiError("UNSUPPORTED_STRATEGY");
          orderAddResult.error = "UNSUPPORTED_STRATEGY";
          return orderAddResult;
        }
      }

      if (!isTradeFeeExemptStatus(systemInfo.userLevels, user?.status, mode || "Live")) {
        if (
          !orderParams.feeToken?.address ||
          orderParams.feeToken?.decimals == null
        ) {
          notifyFromApiError("INVALID_FEE_TOKEN");
          orderAddResult.error = "INVALID_FEE_TOKEN";
          return orderAddResult;
        }
      }

      if (category === "perpetual" && orderParams.collateralToken && !validateCollateralIsStable(orderParams.collateralToken)) {
        notifyFromApiError("COLLATERAL_MUST_BE_STABLE_TOKEN");
        orderAddResult.error = "COLLATERAL_MUST_BE_STABLE_TOKEN";
        return orderAddResult;
      }

      const _gridsByWallet: Record<number, string> = {};
      for (const key in gridsByWallet) {
        if (gridsByWallet[key]?._id) {
          _gridsByWallet[key] = gridsByWallet[key]._id;
        }
      }


      const payload = {
        orderParams: {
          ...orderParams,
          category,
          name: orderParams.orderName,
        },
        gridsByWallet: _gridsByWallet,
      };

      const apiResponse: any = await OrderService.createOrder(payload);

      if (!apiResponse.success) {
        const key = notifyFromApiError(apiResponse.message);
        orderAddResult.error = key;
        return orderAddResult;
      }

      notify("success", "ORDER_CREATION_SUCCESS");

      if (apiResponse.data?.orders) {
        setUserOrders(apiResponse.data.orders);
      } else {
        notifyWithResponseError("error", "Network congested. Refresh the page");
      }
      orderAddResult.added = true;
      return orderAddResult;
    } catch (error: any) {
      const key = handleServerErrorToast({ err: error });
      orderAddResult.error = key;
      return orderAddResult;
    }
  };

  const deleteOrder = async (order: OrderType) => {
    let deleteResult = { deleted: false, error: null as string | null };
    if (!order._id) {
      notifyFromApiError("INVALID_ORDER");
      deleteResult.error = "INVALID_ORDER";
      return deleteResult;
    }
    try {
      let apiResponse: any = await OrderService.deleteOrder({
        orderId: order._id,
      });
      if (!apiResponse.deleted) {
        let key = notifyFromApiError(apiResponse.message);
        deleteResult.error = key;
        return deleteResult;
      }
      notify("success", "ORDER_DELETE_SUCCESS");

      if (apiResponse.data.orders) {
        setUserOrders(apiResponse.data.orders);
      } else {
        notifyWithResponseError("error", "Network congested. Refresh the page");
      }
      deleteResult.deleted = true;
      return deleteResult;
    } catch (err: any) {
      let key = handleServerErrorToast({ err });
      deleteResult.error = key;
      return deleteResult;
    }
  };

  const closeOrder = async (order: OrderType) => {
    let closedResult = { closed: false, error: null as string | null };
    if (!order._id) {
      notifyFromApiError("INVALID_ORDER");
      closedResult.error = "INVALID_ORDER";
      return closedResult;
    }
    try {
      let apiResponse: any = await OrderService.closeOrder({
        orderId: order._id,
      });
      if (!apiResponse.closed) {
        let key = notifyFromApiError(apiResponse.message);
        closedResult.error = key;
        return closedResult;
      }
      notify("success", "ORDER_CLOSED_SUCCESS");

      if (apiResponse.data.orders) {
        setUserOrders(apiResponse.data.orders);
      } else {
        notifyWithResponseError("error", "Network congested. Refresh the page");
      }
      closedResult.closed = true;
      return closedResult;
    } catch (err: any) {
      let key = handleServerErrorToast({ err });
      closedResult.error = key;
      return closedResult;
    }
  };

  const closeStrategy = async ({
    strategyName,
    category,
    strategy,
  }: {
    strategyName: string;
    category: string;
    strategy: string;
  }) => {
    // This is a placeholder – implement actual API call when available.
    // For now, return a not-implemented result.
    return {
      success: false,
      error: "NOT_IMPLEMENTED",
      message: "closeStrategy is not yet implemented",
    };
  };

  const deleteStrategy = async ({
    strategyName,
    category,
    strategy,
  }: {
    strategyName: string;
    category: string;
    strategy: string;
  }) => {
    // This is a placeholder – implement actual API call when available.
    return {
      success: false,
      error: "NOT_IMPLEMENTED",
      message: "deleteStrategy is not yet implemented",
    };
  };

  const getOrders = async () => {
    try {
      let apiResponse: any = await OrderService.getOrder({});
      if (!apiResponse.success) {
        notifyFromApiError(apiResponse.message);
        return false;
      }
      notify("success", "ORDER_FETCH_SUCCESS");
      setUserOrders(apiResponse.data.orders);
      return true;
    } catch (err) {
      let key = handleServerErrorToast({ err });
      return false;
    }
  };

  return {
    configurePerpOrder,
    configureSpotOrder,
    submitOrder,
    closeOrder,
    deleteOrder,
    getOrders,
    deleteStrategy,
    closeStrategy,
  };
};