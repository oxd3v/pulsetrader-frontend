import { formatUnits } from "ethers";
import { PRECISION_DECIMALS } from "@/constants/common/utils";

// ─── Why this exists ───────────────────────────────────────────────────
// The previous implementation drew TP/SL/Entry markers with
// `chart.createPositionLine()`. That call also silently ignored the config
// object it was given — `createPositionLine()` takes NO arguments; it just
// returns a blank adapter that you configure with chained setters — so
// none of `{ quantity: "", lineStyle: 1, lineLength: 1, ... }` was ever
// actually applied. What rendered instead was the *default* position-line
// widget: an editable quantity box, a reverse button, a TP/SL "protect"
// toggle, and a close (×) button — the exact cluttered strip visible in
// the "current design" screenshot ("P ⇌ TP SL 0.006 +89.34 USDT ↴ ×").
//
// Position/Order lines are trading-CONTROL widgets meant for a live,
// draggable broker position or a cancellable pending order. These lines
// are just READ-ONLY reference markers showing where a bot order's TP/SL/
// entry sits — there's nothing here for the user to drag, reverse, or
// cancel from the chart. The correct primitive for a non-interactive
// horizontal reference line + label (matching Asterdex's clean look) is a
// chart "shape" annotation, not a trading-position widget.

const LINE_STYLE = {
  TP: { linecolor: "#05aa58", textcolor: "#05aa58" },
  SL: { linecolor: "#aa0573", textcolor: "#aa0573" },
  LIQ: { linecolor: "#a7a605", textcolor: "#a7a605" },
  ENTRY: { linecolor: "#e0d5d5", textcolor: "#e0d5d5" },
  BUY: { color: "#00ff00" },   // green arrow
  SELL: { color: "#ff0000" },  // red arrow
};

const BASE_OVERRIDES = {
  linewidth: 2,
  linestyle: 0, // solid
  showLabel: true,
  horzLabelsAlign: "right",
  vertLabelsAlign: "bottom",
  bold: true,
  fontsize: 12,
  showPrice: true, // renders the price next to the label, like Asterdex's reference lines
};

function addHorizontalLine(chart, price, text, kind) {
  return chart.createShape(
    // `time` is irrelevant for a horizontal_line (it spans the full visible
    // range regardless), but needs to be a valid timestamp for the point.
    { time: Math.floor(Date.now() / 1000), price },
    {
      shape: "horizontal_line",
      text,
      lock: true,
      disableSelection: true,
      disableSave: true,
      disableUndo: true,
      overrides: {
        ...BASE_OVERRIDES,
        ...LINE_STYLE[kind],
      },
    },
  );
}

function addTickerOnChart(chart, price, unixTime, text, kind) {
  return chart.createShape(
    { time: unixTime, price },
    {
      shape: kind === "BUY" ? "arrow_up" : "arrow_down",
      text,
      lock: true,
      disableSelection: true,
      disableSave: true,
      disableUndo: true,
      overrides: {
        ...BASE_OVERRIDES,
        // For arrows, we use 'color' instead of 'linecolor'
        color: LINE_STYLE[kind]?.color || (kind === "BUY" ? "#00ff00" : "#ff0000"),
        // Adjust font size for ticker labels
        fontsize: 10,
        // For arrows, we may not need showPrice – but we can keep it
        showPrice: true,
      },
    },
  );
}

/**
 * Draws TP / SL / Entry reference lines for the given orders as plain
 * annotation shapes (no quantity box, no reverse/protect/close buttons).
 * Returns the list of entity ids created — the caller tracks these (e.g. in
 * a ref) and removes them with `clearOrderLines()` before redrawing.
 */
export function drawOrderLinesOnChart(chart, orders) {
  const ids = [];
  if (!chart || !orders || orders.length === 0) return ids;

  orders.forEach((order) => {
    if (order.executionDetails?.exitAt && order.executionDetails?.exitPriceUsd && parseFloat(order.executionDetails.exitPriceUsd) !== 0) {
      const exitPrice = formatUnits(
        BigInt(order.executionDetails.exitPriceUsd || 0),
        PRECISION_DECIMALS,
      );
      const exitTime = Math.floor(parseFloat(order.executionDetails.exitAt) / 1000);
      ids.push(addTickerOnChart(chart, Number(exitPrice), exitTime, `${order.name}/${order.sl}_EXIT`, "SELL"));
    }
    // Entry ticker (arrow up) – if entryAt and entryPriceUsd exist
    if (order.executionDetails?.entryAt && order.executionDetails?.entryPriceUsd && parseFloat(order.executionDetails.entryPriceUsd) !== 0) {
      const entryPrice = formatUnits(
        BigInt(order.executionDetails.entryPriceUsd || 0),
        PRECISION_DECIMALS,
      );
      const entryTime = Math.floor(parseFloat(order.executionDetails.entryAt) / 1000);
      ids.push(addTickerOnChart(chart, Number(entryPrice), entryTime, `${order.name}/${order.sl}_ENTRY`, "BUY"));
    }
    // ── OPENED positions (SELL) – show TP, SL, LIQ, and entry ticker ──
    if (order.orderStatus === "OPENED" && order.orderType === "SELL") {
      // Take Profit Line
      if (order.exit.takeProfit?.takeProfitPrice && parseFloat(order.exit.takeProfit.takeProfitPrice) !== 0) {
        const tpPrice = formatUnits(
          BigInt(order.exit.takeProfit.takeProfitPrice || 0),
          PRECISION_DECIMALS,
        );
        ids.push(addHorizontalLine(chart, Number(tpPrice), `${order.name}/${order.sl}_TP`, "TP"));
      }

      // Stop Loss Line
      if (order.exit.stopLoss?.stopLossPrice && parseFloat(order.exit.stopLoss.stopLossPrice) !== 0) {
        const slPrice = formatUnits(
          BigInt(order.exit.stopLoss.stopLossPrice || 0),
          PRECISION_DECIMALS,
        );
        ids.push(addHorizontalLine(chart, Number(slPrice), `${order.name}/${order.sl}_SL`, "SL"));
      }

      // Liquidation Line (perp only)
      if (order.category === "perpetual" && order.executionDetails?.liquidationPriceUsd && parseFloat(order.executionDetails.liquidationPriceUsd) !== 0) {
        const liqPrice = formatUnits(
          BigInt(order.executionDetails.liquidationPriceUsd || 0),
          PRECISION_DECIMALS,
        );
        ids.push(addHorizontalLine(chart, Number(liqPrice), `${order.name}/${order.sl}_LIQ`, "LIQ"));
      }


    }



    // ── PENDING BUY orders – show entry reference line ──
    if (
      order.orderStatus === "PENDING" &&
      order.orderType === "BUY" &&
      !order.entry.isTechnicalEntry
    ) {
      // Try to get the target price from either priceEntry or priceLogic (legacy)
      let entryPriceValue = null;
      if (order.entry.priceEntry?.targetPriceUsd) {
        entryPriceValue = order.entry.priceEntry.targetPriceUsd;
      } else if (order.entry.priceLogic?.threshold) {
        entryPriceValue = order.entry.priceLogic.threshold;
      }
      if (entryPriceValue && parseFloat(entryPriceValue) !== 0) {
        const entryPrice = formatUnits(
          BigInt(entryPriceValue),
          PRECISION_DECIMALS,
        );
        ids.push(addHorizontalLine(chart, Number(entryPrice), `${order.name}/${order.sl}_Entry`, "ENTRY"));
      }
    }
  });

  return ids;
}

/** Removes previously-drawn order-line shapes by id. */
export function clearOrderLines(chart, ids) {
  if (!chart || !ids || ids.length === 0) return;
  ids.forEach((id) => {
    try {
      chart.removeEntity(id);
    } catch {
      // Entity may already be gone (e.g. chart was reset/reloaded) — safe to ignore.
    }
  });
}

/**
 * Applies (or replaces) the single active indicator study driven by the
 * shared chart-data store. Returns the new study id (or null on failure /
 * nothing selected) — the caller tracks this (e.g. in a ref) and removes it
 * via `chart.removeEntity(id)` before applying the next one.
 */
export function applyIndicatorStudy(widget, indicatorOnChart, resolutionMap) {
  if (!widget || !indicatorOnChart?.indicatorName) return null;

  const chart = widget.activeChart();
  const currentRes = chart.resolution();
  const targetRes = resolutionMap?.[indicatorOnChart.resolution];
  if (targetRes && currentRes != targetRes) {
    chart.setResolution(targetRes);
  }

  try {
    const params = indicatorOnChart.period
      ? { length: parseInt(indicatorOnChart.period) || 14 }
      : {};
    return chart.createStudy(indicatorOnChart.indicatorName, false, false, params);
  } catch (e) {
    console.error("Failed to create indicator:", e);
    return null;
  }
}