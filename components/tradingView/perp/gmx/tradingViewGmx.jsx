"use client";
import React, { useEffect, useRef, useState, useCallback } from "react";
import { formatUnits } from "ethers";

import DataFeed from "@/domain/datafeed/gmxDatafeed";
import { useChartDataStore } from "@/store/useChartData";
import { useShallow } from "zustand/shallow";
import {
  getDynamicChartOverrides,
  enabledFeatures,
  PlatformResolutionToChartResolution,
} from "@/constants/common/chart";
import { PRECISION_DECIMALS } from "@/constants/common/utils";

const getTheme = () => {
  if (typeof window !== "undefined" && window.localStorage) {
    return localStorage.getItem("theme") || "dark";
  }
  return "dark";
};

const TradingViewGmxChart = React.memo(({ symbol }) => {
  const [chartReady, setChartReady] = useState(false);
  const chartContainerRef = useRef(null);
  const tvWidgetRef = useRef(null);

  const linesRef = useRef([]);
  const studyRef = useRef(null);

  const { ordersOnChart, indicatorOnChart } = useChartDataStore(
    useShallow((state) => ({
      ordersOnChart: state.ordersOnChart,
      indicatorOnChart: state.indicatorOnChart,
    })),
  );

  const drawLineOnChart = useCallback(() => {
    if (!chartReady || !tvWidgetRef.current) return;

    const chart = tvWidgetRef.current.activeChart();
    linesRef.current.forEach((line) => line.remove && line.remove());
    linesRef.current = [];

    if (!ordersOnChart || ordersOnChart.length === 0) return;

    ordersOnChart.forEach((order) => {
      const commonStyle = {
        disableUndo: true,
        quantity: "",
        lineStyle: 1,
        lineLength: 1,
        bodyFont: 'normal 12pt "Hanken Grotesk", sans-serif',
        bodyTextColor: "#fff",
      };

      if (
        order.orderStatus === "OPENED" &&
        order.orderType === "SELL" &&
        !order.exit.isTechnicalExit
      ) {
        if (
          order.exit.takeProfit?.takeProfitPrice &&
          order.exit.takeProfit?.takeProfitPrice != 0
        ) {
          const tpPrice = formatUnits(
            BigInt(order.exit.takeProfit?.takeProfitPrice || 0),
            PRECISION_DECIMALS,
          );
          const tpLine = chart
            .createPositionLine({ ...commonStyle })
            .setText(`${order.name}/${order.sl}_TP`)
            .setPrice(tpPrice)
            .setLineColor("#05aa58")
            .setBodyBackgroundColor("#21ee21")
            .setBodyBorderColor("#04915b");
          linesRef.current.push(tpLine);
        }

        if (
          order.exit.stopLoss?.stopLossPrice &&
          order.exit.stopLoss?.stopLossPrice != 0
        ) {
          const slPrice = formatUnits(
            BigInt(order.exit.stopLoss?.stopLossPrice || 0),
            PRECISION_DECIMALS,
          );
          const slLine = chart
            .createPositionLine({ ...commonStyle })
            .setText(`${order.name}/${order.sl}_SL`)
            .setPrice(slPrice)
            .setLineColor("#aa0573")
            .setBodyBackgroundColor("#ee214d")
            .setBodyBorderColor("#91042e");
          linesRef.current.push(slLine);
        }
      }

      if (
        order.orderStatus === "PENDING" &&
        order.orderType === "BUY" &&
        !order.entry.isTechnicalEntry &&
        order.entry.priceLogic?.threshold &&
        order.entry.priceLogic?.threshold != "0"
      ) {
        const entryPrice = formatUnits(
          BigInt(order.entry.priceLogic?.threshold),
          PRECISION_DECIMALS,
        );
        const entryLine = chart
          .createPositionLine({ ...commonStyle })
          .setText(`${order.name}/${order.sl}_Entry`)
          .setPrice(entryPrice)
          .setBodyTextColor("#000")
          .setLineColor("#e0d5d5")
          .setBodyBackgroundColor("#e0d5d5")
          .setBodyBorderColor("#e0d5d5");
        linesRef.current.push(entryLine);
      }
    });
  }, [chartReady, ordersOnChart]);

  const updateIndicatorOnChart = useCallback(() => {
    if (!tvWidgetRef.current) return;

    const chart = tvWidgetRef.current.activeChart();

    if (studyRef.current) {
      try {
        chart.removeEntity(studyRef.current);
      } catch {
        // Ignore TradingView cleanup errors.
      }
      studyRef.current = null;
    }

    if (indicatorOnChart?.indicatorName) {
      const currentResolution = tvWidgetRef.current.activeChart().resolution();
      if (currentResolution != indicatorOnChart.resolution) {
        chart.setResolution(
          PlatformResolutionToChartResolution[indicatorOnChart.resolution],
        );
      }

      try {
        const params = indicatorOnChart.period
          ? { length: parseInt(indicatorOnChart.period, 10) || 14 }
          : {};

        studyRef.current = chart.createStudy(
          indicatorOnChart.indicatorName,
          false,
          false,
          params,
        );
      } catch (error) {
        console.error("Failed to create indicator:", error);
      }
    }
  }, [indicatorOnChart]);

  useEffect(() => {
    if (ordersOnChart && ordersOnChart.length > 0 && chartReady) {
      drawLineOnChart();
    }

    return () => {
      linesRef.current.forEach((line) => line.remove && line.remove());
      linesRef.current = [];
    };
  }, [chartReady, drawLineOnChart, ordersOnChart]);

  useEffect(() => {
    if (!chartReady) return;

    const timeoutId = setTimeout(updateIndicatorOnChart, 100);
    return () => clearTimeout(timeoutId);
  }, [chartReady, indicatorOnChart, updateIndicatorOnChart]);

  useEffect(() => {
    const scriptId = "tradingview-widget-script";
    const script = document.createElement("script");
    script.id = scriptId;
    script.src = "/charting_library/charting_library.js";
    script.async = true;

    const initWidget = () => {
      if (window.TradingView && chartContainerRef.current) {
        const dataFeed = new DataFeed(symbol);
        const currentTheme = getTheme();
        const dynamicOverrides = getDynamicChartOverrides(currentTheme);

        const widgetOptions = {
          container: chartContainerRef.current,
          datafeed: dataFeed,
          library_path: "/charting_library/",
          autosize: true,
          symbol,
          interval: "60",
          timezone: "Etc/UTC",
          theme: currentTheme,
          style: "1",
          locale: "en",
          enable_publishing: false,
          allow_symbol_change: false,
          overrides: dynamicOverrides,
          save_image: false,
          studies: [],
          disabled_features: ["header_symbol_search", "header_compare"],
          custom_css_url: "/tradingview-chart.css",
          enabled_features: enabledFeatures,
        };

        const widget = new window.TradingView.widget(widgetOptions);
        tvWidgetRef.current = widget;

        widget.onChartReady(() => {
          setChartReady(true);
        });
      }
    };

    script.onload = initWidget;
    document.body.appendChild(script);

    return () => {
      if (tvWidgetRef.current) {
        try {
          tvWidgetRef.current.remove();
        } catch (error) {
          console.warn("Error removing widget", error);
        }
        tvWidgetRef.current = null;
        setChartReady(false);
      }

      const existingScript = document.getElementById(scriptId);
      if (existingScript) {
        existingScript.remove();
      }
    };
  }, [symbol]);

  useEffect(() => {
    const handleThemeChange = () => {
      if (tvWidgetRef.current && chartReady) {
        const newTheme = getTheme();
        tvWidgetRef.current.changeTheme(newTheme);

        const dynamicOverrides = getDynamicChartOverrides(newTheme);
        tvWidgetRef.current.activeChart().applyOverrides(dynamicOverrides);
      }
    };

    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.attributeName === "class") {
          handleThemeChange();
        }
      });
    });

    if (typeof window !== "undefined") {
      observer.observe(document.documentElement, { attributes: true });
    }

    return () => observer.disconnect();
  }, [chartReady]);

  return (
    <div
      id="tradingview_advanced_chart"
      ref={chartContainerRef}
      style={{
        height: "100%",
        width: "100%",
        borderRadius: "10px",
        overflow: "hidden",
      }}
    />
  );
});

TradingViewGmxChart.displayName = "TradingViewGmxChart";

export default TradingViewGmxChart;

