"use client";
import React, { useEffect, useRef, useState, useCallback } from "react";
import { formatUnits } from "ethers";

// Domain & Store Imports
import DataFeed from "@/domain/datafeed/asterdexDatafeed";
import { useChartDataStore } from "@/store/useChartData";
import { useShallow } from "zustand/shallow";
import {
  getDynamicChartOverrides,
  enabledFeatures,
  PlatformResolutionToChartResolution
} from "@/constants/common/chart";
import { PRECISION_DECIMALS } from "@/constants/common/utils";

// --- Utility Functions ---
const getTheme = () => {
  if (typeof window !== "undefined" && window.localStorage) {
    return localStorage.getItem("theme") || "dark";
  }
  return "dark";
};

const TradingViewAdvancedChart = React.memo(
  ({  symbol, }) => {
    // --- State & Refs ---
    const [chartReady, setChartReady] = useState(false);
    const chartContainerRef = useRef(null);
    const tvWidgetRef = useRef(null);

    // Tracking References (for cleanup)
    const linesRef = useRef([]); // Stores IDs of drawn order lines
    const studyRef = useRef(null); // Stores ID of the active indicator study

    // --- Store Data ---
    const { ordersOnChart, indicatorOnChart } = useChartDataStore(
      useShallow((state) => ({
        ordersOnChart: state.ordersOnChart,
        indicatorOnChart: state.indicatorOnChart,
      })),
    );

    // --- Logic: Draw Order Lines ---
    const drawLineOnChart = useCallback(() => {
      if (!chartReady || !tvWidgetRef.current) return;

      const chart = tvWidgetRef.current.activeChart();

      // 1. Cleanup existing lines
      linesRef.current.forEach((line) => line.remove && line.remove());
      linesRef.current = [];

      // 2. Guard clause if no orders
      if (!ordersOnChart || ordersOnChart.length === 0) return;

      // 3. Draw new lines
      ordersOnChart.forEach((order) => {
        const commonStyle = {
          disableUndo: true,
          quantity: "",
          lineStyle: 1,
          lineLength: 1,
          bodyFont: `normal 12pt "Hanken Grotesk", sans-serif`,
          bodyTextColor: "#fff",
        };

        // Long Orders (TP/SL)
        if (
          order.orderStatus === "OPENED" &&
          order.orderType === "SELL" &&
          !order.exit.isTechnicalExit
        ) {
          // Take Profit Line
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

          // Take Profit Line
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

        // Short/Pending Orders (Entry)
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

    // --- Logic: Add/Remove Indicators ---
    const updateIndicatorOnChart = useCallback(() => {
      if (!tvWidgetRef.current) return;

      const chart = tvWidgetRef.current.activeChart();

      // Remove existing indicator
      if (studyRef.current) {
        try {
          chart.removeEntity(studyRef.current);
        } catch (e) {
          // Ignore errors
        }
        studyRef.current = null;
      }

      // Add new indicator if specified
      if (indicatorOnChart?.indicatorName) {
        const currentRes = tvWidgetRef.current.activeChart().resolution();
        
        if (currentRes != indicatorOnChart.resolution) {
          chart.setResolution(PlatformResolutionToChartResolution[indicatorOnChart.resolution]);
        }
        // const activeStudies = chart.getAllStudies();
        // const isActive = activeStudies.find((i)=>i.name == indicatorOnChart?.indicatorName);
        // if(!isActive)
        try {
          const params = indicatorOnChart.period
            ? { length: parseInt(indicatorOnChart.period) || 14 }
            : {};

          studyRef.current = chart.createStudy(
            indicatorOnChart.indicatorName,
            false,
            false,
            params,
          );
        } catch (e) {
          console.error("Failed to create indicator:", e);
        }
      }
    }, [chartReady, indicatorOnChart]);

    // --- Effect: Handle Order Lines ---
    useEffect(() => {
      if (ordersOnChart && ordersOnChart.length > 0 && chartReady) {
        drawLineOnChart();
      }

      // Cleanup lines when component unmounts
      return () => {
        linesRef.current.forEach((line) => line.remove && line.remove());
        linesRef.current = [];
      };
    }, [chartReady, ordersOnChart]);

    // --- Effect: Handle Indicators ---
    useEffect(() => {
      if (!chartReady) return;

      //   if(chartReady && indicatorOnChart && indicatorOnChart.indicatorName != undefined){
      //     updateIndicatorOnChart()
      //   }

      // Delay to ensure chart is ready
      const timeoutId = setTimeout(updateIndicatorOnChart, 100);

      return () => {
        clearTimeout(timeoutId);
      };
    }, [chartReady, indicatorOnChart]);

    // --- Effect: Initialize Chart Widget ---
    useEffect(() => {
      const scriptId = "tradingview-widget-script";
      const script = document.createElement("script");
      script.id = scriptId;
      script.src = "/charting_library/charting_library.js";
      script.async = true;

      const initWidget = () => {
        if (window.TradingView && chartContainerRef.current) {
          const dataFeed = new DataFeed(
            symbol
          );
          const currentTheme = getTheme();
          const dynamicOverrides = getDynamicChartOverrides(currentTheme);

          const widgetOptions = {
            container: chartContainerRef.current,
            datafeed: dataFeed,
            library_path: "/charting_library/",
            autosize: true,
            symbol: symbol,
            interval: "60",
            timezone: "Etc/UTC",
            theme: currentTheme,
            style: "1",
            locale: "en",
            enable_publishing: false,
            allow_symbol_change: false,
            overrides: dynamicOverrides,
            save_image: false,
            studies: [], // Start empty, let the effect handle adding studies
            disabled_features: ["header_symbol_search", "header_compare"],
            custom_css_url: "/tradingview-chart.css",
            enabled_features: enabledFeatures,
          };

          const widget = new window.TradingView.widget(widgetOptions);
          tvWidgetRef.current = widget;

          widget.onChartReady(() => {
            setChartReady(true);
            // Optional: Force a data refresh if needed
            // widget.activeChart().dataReady();
          });
        }
      };

      script.onload = initWidget;
      document.body.appendChild(script);

      return () => {
        // Cleanup widget
        if (tvWidgetRef.current) {
          try {
            tvWidgetRef.current.remove();
          } catch (e) {
            console.warn("Error removing widget", e);
          }
          tvWidgetRef.current = null;
          setChartReady(false);
        }
        // Cleanup script
        const existingScript = document.getElementById(scriptId);
        if (existingScript) {
          existingScript.remove();
        }
      };
    }, [symbol]);

    // --- Effect: Theme Switcher ---
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
          
        }}
      />
    );
  },
);

export default TradingViewAdvancedChart;
