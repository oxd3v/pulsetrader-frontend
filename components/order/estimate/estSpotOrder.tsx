import React, { useState } from "react";


// types
import {
  OrderType,
  OrderTokenType,
  OrderStatusType,
} from "@/type/order";

// utility
import { formateAmountWithFixedDecimals } from "@/utility/handy";
import { displayNumber } from "@/utility/displayPrice";
import LogicSummary from "../common/LogicDisplay";
import WeightSummary from "../common/WeightDisplay";
import PriceEntry from "../common/entryPriceDisplay"
// ui
import { FiCopy, FiGrid, FiList, FiEdit2, FiTrash2, FiSave, FiX, FiActivity, FiLayers } from "react-icons/fi";
import toast from "react-hot-toast";

interface OrderCreationModalProps {
  estOrders: OrderType[];
  onClose: () => void;
  chainId: number;
  gridsByWallet: Record<number, any>;
  selectedStrategy: any;
  collateralToken: OrderTokenType;
  indexTokenInfo: any;
  onUpdateOrder?: (orderId: string, updatedOrder: OrderType) => void;
  onDeleteOrder?: (orderId: string) => void;
}

const OrderCreationModal = ({
  estOrders,
  onClose,
  gridsByWallet,
  selectedStrategy,
  collateralToken,
  onUpdateOrder,
  onDeleteOrder,
}: OrderCreationModalProps) => {
  const [viewMode, setViewMode] = useState<"table" | "card">("table");
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [editingOrderId, setEditingOrderId] = useState<string | null>(null);
  const [editedOrders, setEditedOrders] = useState<Record<string, OrderType>>({});

  // ── Helpers (same as perp) ──────────────────────────────────────────────

  const handleCopyWalletAddress = (address: string) => {
    navigator.clipboard.writeText(address);
    toast.success("Wallet address copied");
  };

  const handleDeleteOrder = (orderId: string) => {
    setSelectedOrderId(orderId);
    setShowConfirmation(true);
  };

  const confirmDeleteOrder = () => {
    if (selectedOrderId && onDeleteOrder) {
      onDeleteOrder(selectedOrderId);
    }
    setShowConfirmation(false);
  };

  const handleEditOrder = (order: OrderType) => {
    const id = order._id || "temp-" + order.sl;
    setEditingOrderId(id);
    setEditedOrders((prev) => ({
      ...prev,
      [id]: JSON.parse(JSON.stringify(order)),
    }));
  };

  const handleSaveOrder = (orderId: string) => {
    const updatedOrder = editedOrders[orderId];
    if (updatedOrder && onUpdateOrder) {
      onUpdateOrder(orderId, updatedOrder);
      toast.success("Order updated successfully");
    }
    setEditingOrderId(null);
  };

  const handleCancelEdit = () => {
    setEditingOrderId(null);
  };

  const handleFieldChange = (orderId: string, path: string, value: any) => {
    setEditedOrders((prev) => {
      const order = prev[orderId];
      if (!order) return prev;

      const newOrder = { ...order };
      const keys = path.split(".");
      let current: any = newOrder;

      for (let i = 0; i < keys.length - 1; i++) {
        if (!current[keys[i]]) current[keys[i]] = {};
        current = current[keys[i]];
      }

      current[keys[keys.length - 1]] = value;

      return { ...prev, [orderId]: newOrder };
    });
  };

  const getOrderById = (orderId: string): OrderType | undefined => {
    if (editedOrders[orderId]) return editedOrders[orderId];
    return estOrders.find((order) => (order._id || "temp-" + order.sl) === orderId);
  };

  const getStatusColor = (status: OrderStatusType) => {
    switch (status) {
      case "PENDING":
        return "bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300";
      case "OPENED":
        return "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300";
      case "CLOSED":
        return "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300";
      case "CANCELLED":
        return "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300";
      default:
        return "bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300";
    }
  };

  const bpsToPercent = (bps: number) => (bps / 100).toFixed(2);

  // ── Render ──────────────────────────────────────────────────────────────

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-2 sm:p-4">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-[95vw] sm:max-w-7xl max-h-[90vh] flex flex-col border border-gray-200 dark:border-gray-700">
        {/* Header – same as perp */}
        <div className="p-4 border-b dark:border-gray-700 bg-gray-50 dark:bg-gray-800 flex items-center justify-between shrink-0 rounded-t-xl">
          <div className="flex items-center gap-3">
            <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-100">Order Summary</h2>
            <span
              className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide ${selectedStrategy.id !== "sellToken"
                ? "bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300"
                : "bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300"
                }`}
            >
              {selectedStrategy.name}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <div className="bg-gray-200 dark:bg-gray-700 rounded-lg p-1 hidden sm:flex">
              <button
                onClick={() => setViewMode("table")}
                className={`p-1.5 rounded transition-all ${viewMode === "table" ? "bg-white dark:bg-gray-600 shadow-sm" : "text-gray-500 hover:text-gray-700"
                  }`}
              >
                <FiList className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode("card")}
                className={`p-1.5 rounded transition-all ${viewMode === "card" ? "bg-white dark:bg-gray-600 shadow-sm" : "text-gray-500 hover:text-gray-700"
                  }`}
              >
                <FiGrid className="w-4 h-4" />
              </button>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full transition-colors">
              <FiX className="w-5 h-5 text-gray-500" />
            </button>
          </div>
        </div>

        {/* Mobile Toggle – same */}
        <div className="sm:hidden p-2 border-b dark:border-gray-700 flex justify-center">
          <div className="flex bg-gray-100 dark:bg-gray-700 text-black rounded-lg p-1">
            <button
              onClick={() => setViewMode("table")}
              className={`px-4 py-1 rounded-md text-xs font-medium ${viewMode === "table" ? "bg-white shadow" : "text-gray-500"
                }`}
            >
              Table
            </button>
            <button
              onClick={() => setViewMode("card")}
              className={`px-4 py-1 rounded-md text-xs font-medium ${viewMode === "card" ? "bg-white shadow" : "text-gray-500"
                }`}
            >
              Card
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto bg-gray-50/50 dark:bg-gray-900/50">
          {viewMode === "table" ? (
            <div className="min-w-full inline-block align-middle">
              <div className="border-b dark:border-gray-700">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                  <thead className="bg-gray-50 dark:bg-gray-800 sticky top-0 z-10 shadow-sm">
                    <tr>
                      {["Grid", "Entry Condition", "Order Size", "Exit / TP / SL", "Wallet", "Status", "Actions"].map(
                        (head) => (
                          <th
                            key={head}
                            className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider"
                          >
                            {head}
                          </th>
                        )
                      )}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-gray-700 bg-white dark:bg-gray-800">
                    {estOrders.map((order, index) => {
                      const orderId = order._id || `temp-${order.sl}-${index}`;
                      const isEditing = editingOrderId === orderId;
                      const currentOrder = isEditing ? getOrderById(orderId)! : order;

                      if (!currentOrder) return null;

                      const hasTechEntry = !!currentOrder.entry.technicalLogic;
                      const hasWeightEntry = !!currentOrder.entry.technicalWeights;
                      const hasPriceEntry = !!currentOrder.entry.priceEntry;



                      return (
                        <tr
                          key={orderId}
                          className={`hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors ${isEditing ? "bg-blue-50/50 dark:bg-blue-900/10" : ""
                            }`}
                        >
                          {/* Grid # */}
                          <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-gray-200">
                            #{currentOrder.sl}
                          </td>

                          {/* Entry */}
                          <td className="px-4 py-3 text-sm">
                            {hasTechEntry ? (
                              <div className="flex flex-col gap-1 max-w-[240px]">
                                <span className="flex items-center gap-1 text-[10px] uppercase font-bold text-blue-500">
                                  <FiActivity /> Technical
                                </span>
                                <div className="overflow-x-auto pb-1 scrollbar-thin">
                                  <LogicSummary node={currentOrder.entry.technicalLogic!} />
                                </div>
                              </div>
                            ) : hasWeightEntry ? (
                              <div className="flex flex-col gap-1 max-w-[240px]">
                                <span className="flex items-center gap-1 text-[10px] uppercase font-bold text-purple-500">
                                  <FiLayers /> Weighted
                                </span>
                                <div className="overflow-x-auto pb-1 scrollbar-thin">
                                  <WeightSummary weights={currentOrder.entry.technicalWeights!} />
                                </div>
                              </div>
                            ) : hasPriceEntry ? <div className="font-mono text-gray-700 dark:text-gray-300">
                              <PriceEntry priceEntry={currentOrder.entry.priceEntry} />
                            </div> : (
                              <span className="text-gray-400 italic">Market</span>
                            )}
                          </td>

                          {/* Order Size (Spot) */}
                          <td className="px-4 py-3 text-sm">
                            {isEditing ? (
                              <div className="flex items-center gap-1">
                                <input
                                  type="number"
                                  className="w-20 px-2 py-1 text-sm border rounded dark:bg-gray-700 dark:border-gray-600"
                                  value={formateAmountWithFixedDecimals(
                                    currentOrder.spot?.amount?.orderSize ?? "0",
                                    collateralToken?.decimals ?? 18,
                                    6
                                  )}
                                  onChange={(e) =>
                                    handleFieldChange(orderId, "spot.amount.orderSize", e.target.value)
                                  }
                                />
                                <span className="text-xs text-gray-500">{collateralToken?.symbol ?? "?"}</span>
                              </div>
                            ) : (
                              <div className="font-medium text-gray-800 dark:text-gray-200">
                                {formateAmountWithFixedDecimals(
                                  currentOrder.spot?.amount?.orderSize ?? "0",
                                  collateralToken?.decimals ?? 18,
                                  6
                                )}
                                <span className="text-xs text-gray-500 ml-1">{collateralToken?.symbol ?? "?"}</span>
                              </div>
                            )}
                          </td>

                          {/* Exit / TP / SL */}
                          <td className="px-4 py-3 text-sm">
                            <div className="flex flex-col gap-2 min-w-[140px]">
                              <div className="flex items-center gap-3">
                                {isEditing ? (
                                  <>
                                    <div className="flex items-center gap-1">
                                      <span className="text-xs text-green-500 font-bold">TP</span>
                                      <input
                                        type="number"
                                        className="w-14 px-1 py-0.5 text-xs border rounded"
                                        value={currentOrder.exit.takeProfit.takeProfitPctBps}
                                        onChange={(e) =>
                                          handleFieldChange(
                                            orderId,
                                            "exit.takeProfit.takeProfitPctBps",
                                            parseFloat(e.target.value)
                                          )
                                        }
                                      />
                                      <span className="text-xs">%</span>
                                    </div>
                                    {currentOrder.exit.stopLoss.isActive && (
                                      <div className="flex items-center gap-1">
                                        <span className="text-xs text-red-500 font-bold">SL</span>
                                        <input
                                          type="number"
                                          className="w-14 px-1 py-0.5 text-xs border rounded"
                                          value={currentOrder.exit.stopLoss.stopLossPctBps}
                                          onChange={(e) =>
                                            handleFieldChange(
                                              orderId,
                                              "exit.stopLoss.stopLossPctBps",
                                              parseFloat(e.target.value)
                                            )
                                          }
                                        />
                                        <span className="text-xs">%</span>
                                      </div>
                                    )}
                                  </>
                                ) : (
                                  <>
                                    <span className="bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 px-2 py-0.5 rounded text-xs font-medium">
                                      +{bpsToPercent(currentOrder.exit.takeProfit.takeProfitPctBps)}%
                                    </span>
                                    {currentOrder.exit.stopLoss.isActive && (
                                      <span className="bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 px-2 py-0.5 rounded text-xs font-medium">
                                        -{bpsToPercent(currentOrder.exit.stopLoss.stopLossPctBps)}%
                                      </span>
                                    )}
                                  </>
                                )}
                              </div>
                            </div>
                          </td>

                          {/* Wallet */}
                          <td className="px-4 py-3 text-sm text-gray-500 font-mono">
                            {isEditing ? (
                              <select
                                className="w-full text-xs border rounded py-1 dark:bg-gray-700 dark:border-gray-600"
                                value={gridsByWallet[currentOrder.sl]?._id || ""}
                                onChange={(e) => handleFieldChange(orderId, "wallet", e.target.value)}
                              >
                                <option value="">Select</option>
                                {Object.values(gridsByWallet).map((w: any, idx) => (
                                  <option key={idx} value={w._id}>
                                    {`...${w.address.slice(-6)}`}
                                  </option>
                                ))}
                              </select>
                            ) : (
                              <div className="flex items-center gap-2 group">
                                <span>
                                  {gridsByWallet[currentOrder.sl]
                                    ? `...${gridsByWallet[currentOrder.sl].address.slice(-6)}`
                                    : "Pending"}
                                </span>
                                {gridsByWallet[currentOrder.sl] && (
                                  <button
                                    onClick={() => handleCopyWalletAddress(gridsByWallet[currentOrder.sl].address)}
                                    className="opacity-0 group-hover:opacity-100 text-blue-500"
                                  >
                                    <FiCopy className="w-3 h-3" />
                                  </button>
                                )}
                              </div>
                            )}
                          </td>

                          {/* Status */}
                          <td className="px-4 py-3">
                            {isEditing ? (
                              <select
                                className="text-xs border rounded py-1 bg-white dark:bg-gray-700"
                                value={currentOrder.orderStatus}
                                onChange={(e) => handleFieldChange(orderId, "orderStatus", e.target.value)}
                              >
                                {["PENDING", "OPENED", "CANCELLED", "CLOSED"].map((s) => (
                                  <option key={s} value={s}>
                                    {s}
                                  </option>
                                ))}
                              </select>
                            ) : (
                              <span className={`px-2 py-1 rounded-full text-[10px] font-bold ${getStatusColor(currentOrder.orderStatus)}`}>
                                {currentOrder.orderStatus}
                              </span>
                            )}
                          </td>

                          {/* Actions */}
                          <td className="px-4 py-3 text-sm">
                            <div className="flex items-center gap-2">
                              {isEditing ? (
                                <>
                                  <button onClick={() => handleSaveOrder(orderId)} className="p-1.5 text-green-500 hover:bg-green-50 rounded">
                                    <FiSave />
                                  </button>
                                  <button onClick={handleCancelEdit} className="p-1.5 text-gray-500 hover:bg-gray-100 rounded">
                                    <FiX />
                                  </button>
                                </>
                              ) : (
                                <>
                                  <button onClick={() => handleEditOrder(currentOrder)} className="p-1.5 text-blue-500 hover:bg-blue-50 rounded">
                                    <FiEdit2 />
                                  </button>
                                  <button onClick={() => handleDeleteOrder(orderId)} className="p-1.5 text-red-500 hover:bg-red-50 rounded">
                                    <FiTrash2 />
                                  </button>
                                </>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            // Card View
            <div className="p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {estOrders.map((order, index) => {
                const orderId = order._id || `temp-${order.sl}-${index}`;
                const isEditing = editingOrderId === orderId;
                const currentOrder = isEditing ? getOrderById(orderId)! : order;

                if (!currentOrder) return null;

                return (
                  <div
                    key={orderId}
                    className={`bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm p-4 relative ${isEditing ? "ring-2 ring-blue-500" : ""
                      }`}
                  >
                    <div className="flex justify-between items-start mb-3">
                      <div className="flex flex-col">
                        <span className="font-bold text-gray-700 dark:text-gray-200">Grid #{currentOrder.sl}</span>
                        <span className={`text-[10px] px-2 py-0.5 rounded-full w-fit mt-1 ${getStatusColor(currentOrder.orderStatus)}`}>
                          {currentOrder.orderStatus}
                        </span>
                      </div>
                      <div className="flex gap-1">
                        {isEditing ? (
                          <>
                            <button onClick={() => handleSaveOrder(orderId)} className="p-2 bg-green-50 text-green-600 rounded">
                              <FiSave />
                            </button>
                            <button onClick={handleCancelEdit} className="p-2 bg-gray-50 text-gray-600 rounded">
                              <FiX />
                            </button>
                          </>
                        ) : (
                          <>
                            <button onClick={() => handleEditOrder(currentOrder)} className="p-2 hover:bg-gray-100 rounded text-gray-500">
                              <FiEdit2 />
                            </button>
                            <button onClick={() => handleDeleteOrder(orderId)} className="p-2 hover:bg-red-50 rounded text-red-500">
                              <FiTrash2 />
                            </button>
                          </>
                        )}
                      </div>
                    </div>

                    <div className="space-y-3 text-sm">
                      {/* Entry */}
                      <div className="bg-gray-50 dark:bg-gray-900/50 p-2 rounded">
                        <span className="text-xs text-gray-500 block mb-1 uppercase font-bold">Entry</span>
                        {currentOrder.entry.technicalLogic ? (
                          <div className="overflow-x-auto scrollbar-thin">
                            <LogicSummary node={currentOrder.entry.technicalLogic} />
                          </div>
                        ) : currentOrder.entry.technicalWeights ? (
                          <div className="overflow-x-auto scrollbar-thin">
                            <WeightSummary weights={currentOrder.entry.technicalWeights} />
                          </div>
                        ) : currentOrder.entry.priceEntry ? (
                          <PriceEntry priceEntry={currentOrder.entry.priceEntry} />
                        ) : (
                          <span className="text-gray-400 italic">Market</span>
                        )}
                      </div>

                      {/* Exit */}
                      <div className="bg-gray-50 dark:bg-gray-900/50 p-2 rounded">
                        <span className="text-xs text-gray-500 block mb-1 uppercase font-bold">Exit</span>
                        <div className="flex justify-between font-mono text-xs">
                          <span className="text-green-600">
                            TP: +{bpsToPercent(currentOrder.exit.takeProfit.takeProfitPctBps)}%
                          </span>
                          {currentOrder.exit.stopLoss.isActive && (
                            <span className="text-red-600">
                              SL: -{bpsToPercent(currentOrder.exit.stopLoss.stopLossPctBps)}%
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Size */}
                      <div className="flex justify-between text-xs text-gray-600 dark:text-gray-400">
                        <span>
                          Size:{" "}
                          {formateAmountWithFixedDecimals(
                            currentOrder.spot?.amount?.orderSize ?? "0",
                            collateralToken?.decimals ?? 18,
                            3
                          )}{" "}
                          {collateralToken?.symbol ?? "?"}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-gray-50 dark:bg-gray-800 border-t dark:border-gray-700 rounded-b-xl flex justify-between items-center shrink-0">
          <div className="text-sm text-gray-600 dark:text-gray-400">
            Total Orders: <span className="font-bold text-gray-900 dark:text-white">{estOrders.length}</span>
          </div>
          <div className="flex gap-2">
            <button onClick={onClose} className="px-6 py-2 bg-white text-black border border-gray-300 shadow-sm rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors">
              Close
            </button>
          </div>
        </div>
      </div>

      {/* Delete Confirmation – same as perp */}
      {showConfirmation && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-xl max-w-sm w-full mx-4">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">Confirm Delete</h3>
            <p className="text-gray-500 dark:text-gray-400 mb-6 text-sm">
              Are you sure you want to remove this grid order? This cannot be undone.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowConfirmation(false)}
                className="flex-1 py-2 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 dark:border-gray-600 dark:text-white"
              >
                Cancel
              </button>
              <button
                onClick={confirmDeleteOrder}
                className="flex-1 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 font-medium"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default OrderCreationModal;