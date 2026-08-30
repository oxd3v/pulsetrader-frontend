"use client";
import React, { useEffect, useRef, useState, useCallback } from "react";

// Domain & Store Imports
import DataFeed from "@/domain/datafeed/definedDatafeed";
import { useChartDataStore } from "@/store/useChartData";
import { useShallow } from "zustand/shallow";
import {
  getDynamicChartOverrides,
  enabledFeatures,
  PlatformResolutionToChartResolution
} from "@/constants/common/chart";
import { drawOrderLinesOnChart, clearOrderLines, applyIndicatorStudy } from "../../chartViewHelper.js";

// --- Utility Functions ---
const getTheme = () => {
  if (typeof window !== "undefined" && window.localStorage) {
    return localStorage.getItem("theme") || "dark";
  }
  return "dark";
};

const TradingViewAdvancedChart = React.memo(
  ({ chainId, symbol, address, pairAddress, quoteToken, createdAt }) => {
    // --- State & Refs ---
    const [chartReady, setChartReady] = useState(false);
    const chartContainerRef = useRef(null);
    const tvWidgetRef = useRef(null);

    // Tracking References (for cleanup)
    const linesRef = useRef([]); // Stores entity ids of drawn order lines
    const studyRef = useRef(null); // Stores entity id of the active indicator study

    // --- Store Data ---
    const { ordersOnChart, indicatorOnChart } = useChartDataStore(
      useShallow((state) => ({
        ordersOnChart: state.ordersOnChart,
        indicatorOnChart: state.indicatorOnChart,
      })),
    );

    // --- Logic: Draw Order Lines ---
    // Renders TP/SL/Entry as plain, non-interactive reference lines
    // (no quantity box, no reverse/protect/close buttons) — see
    // lib/chart/orderLines.js for why this replaced createPositionLine().
    const drawLineOnChart = useCallback(() => {
      if (!chartReady || !tvWidgetRef.current) return;
      try {
        const chart = tvWidgetRef.current.activeChart();
        if (!chart) return;
        clearOrderLines(chart, linesRef.current);
        linesRef.current = drawOrderLinesOnChart(chart, ordersOnChart);
      } catch (_) {
        // Widget may not be ready – ignore
      }
    }, [chartReady, ordersOnChart]);

    // --- Logic: Add/Remove Indicators ---
    const updateIndicatorOnChart = useCallback(() => {
      if (!tvWidgetRef.current) return;

      const chart = tvWidgetRef.current.activeChart();

      if (studyRef.current) {
        try {
          chart.removeEntity(studyRef.current);
        } catch (e) {
          // Ignore errors
        }
        studyRef.current = null;
      }

      studyRef.current = applyIndicatorStudy(
        tvWidgetRef.current,
        indicatorOnChart,
        PlatformResolutionToChartResolution,
      );
    }, [indicatorOnChart]);

    // --- Effect: Handle Order Lines ---
    useEffect(() => {
      if (ordersOnChart && ordersOnChart.length > 0 && chartReady && tvWidgetRef.current) {
        drawLineOnChart();
      }

      return () => {
        // Safely attempt to clear lines; ignore any errors (widget may be tearing down)
        if (tvWidgetRef.current) {
          try {
            const chart = tvWidgetRef.current.activeChart();
            if (chart) {
              clearOrderLines(chart, linesRef.current);
            }
          } catch (_) {
            // Widget is likely destroyed – no action needed
          }
        }
        linesRef.current = [];
      };
    }, [chartReady, ordersOnChart]);

    // --- Effect: Handle Indicators ---
    useEffect(() => {
      if (!chartReady) return;
      const timeoutId = setTimeout(updateIndicatorOnChart, 100);

      return () => {
        clearTimeout(timeoutId);
        // Clean up study if it exists
        if (tvWidgetRef.current && studyRef.current) {
          try {
            const chart = tvWidgetRef.current.activeChart();
            if (chart) {
              chart.removeEntity(studyRef.current);
            }
          } catch (_) {
            // Ignore
          }
          studyRef.current = null;
        }
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
            chainId,
            address,
            pairAddress,
            quoteToken,
            createdAt,
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
    }, [symbol, chainId, address, pairAddress, quoteToken, createdAt]);

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
          overflow: "hidden",
        }}
      />
    );
  },
);

export default TradingViewAdvancedChart;