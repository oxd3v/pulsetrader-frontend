"use client";
import { useState, useEffect, useCallback } from "react";
import { FiRefreshCw, FiChevronLeft, FiChevronRight, FiFilter, FiX, FiSearch } from "react-icons/fi";
import AdminService from "@/service/admin-service";

type OrderFilters = {
    _id: string;          // <-- added for search by order ID
    category: string;
    orderStatus: string;
    strategy: string;
    orderMode: string;
    page: number;
    limit: number;
};

type Stats = {
    total: number;
    active: number;
    pending: number;
    closed: number;
};

export default function AdminOrdersPanel() {
    const [orders, setOrders] = useState<any[]>([]);
    const [totalOrders, setTotalOrders] = useState(0);
    const [stats, setStats] = useState<Stats>({ total: 0, active: 0, pending: 0, closed: 0 });
    const [loading, setLoading] = useState(false);
    const [showFilters, setShowFilters] = useState(false);
    const [filters, setFilters] = useState<OrderFilters>({
        _id: "",           // <-- initial empty
        category: "",
        orderStatus: "",
        strategy: "",
        orderMode: "",
        page: 1,
        limit: 25,
    });

    const fetchOrders = useCallback(async () => {
        setLoading(true);
        try {
            const params: Record<string, any> = { page: filters.page, limit: filters.limit };
            if (filters._id) params._id = filters._id;
            if (filters.category) params.category = filters.category;
            if (filters.orderStatus) params.orderStatus = filters.orderStatus;
            if (filters.strategy) params.strategy = filters.strategy;
            if (filters.orderMode) params.orderMode = filters.orderMode;

            const res = await AdminService.getAllOrders(params);
            if (res?.success && res?.data) {
                setOrders(res.data.orders || []);
                setTotalOrders(res.data.totalOrders || 0);
                if (res.data.stats) setStats(res.data.stats);
            }
        } catch (err) {
            console.error("Failed to fetch orders:", err);
        } finally {
            setLoading(false);
        }
    }, [filters]);

    useEffect(() => {
        fetchOrders();
    }, [fetchOrders]);

    const totalPages = Math.ceil(totalOrders / filters.limit);
    const hasActiveFilters = !!(filters._id || filters.category || filters.orderStatus || filters.strategy || filters.orderMode);

    const clearFilters = () => {
        setFilters((f) => ({ ...f, _id: "", category: "", orderStatus: "", strategy: "", orderMode: "", page: 1 }));
    };

    const getStatusColor = (status: string) => {
        switch (status?.toUpperCase()) {
            case "OPENED": return "bg-emerald-500/15 text-emerald-400 border-emerald-500/30";
            case "PENDING": return "bg-amber-500/15 text-amber-400 border-amber-500/30";
            case "PROCESSING": return "bg-blue-500/15 text-blue-400 border-blue-500/30";
            case "CLOSED": return "bg-gray-500/15 text-gray-400 border-gray-500/30";
            case "FAILED": return "bg-red-500/15 text-red-400 border-red-500/30";
            case "CANCELLED": return "bg-orange-500/15 text-orange-400 border-orange-500/30";
            default: return "bg-gray-500/15 text-gray-400 border-gray-500/30";
        }
    };

    return (
        <div className="space-y-5">
            {/* Stats Row */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                    { label: "Total Orders", value: stats.total, icon: "📊", color: "from-violet-600/20 to-violet-800/10 border-violet-500/20" },
                    { label: "Active", value: stats.active, icon: "🟢", color: "from-emerald-600/20 to-emerald-800/10 border-emerald-500/20" },
                    { label: "Pending", value: stats.pending, icon: "🟡", color: "from-amber-600/20 to-amber-800/10 border-amber-500/20" },
                    { label: "Closed", value: stats.closed, icon: "🔒", color: "from-gray-600/20 to-gray-800/10 border-gray-500/20" },
                ].map((s) => (
                    <div
                        key={s.label}
                        className={`rounded-xl border bg-gradient-to-br ${s.color} p-4 flex items-center justify-between`}
                    >
                        <div>
                            <div className="text-xs text-gray-400 mb-1">{s.label}</div>
                            <div className="text-2xl font-bold text-white">{s.value.toLocaleString()}</div>
                        </div>
                        <span className="text-2xl opacity-40">{s.icon}</span>
                    </div>
                ))}
            </div>

            {/* Toolbar */}
            <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => setShowFilters(!showFilters)}
                        className={`flex items-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-medium transition-all ${showFilters || hasActiveFilters
                            ? "border-violet-500/40 bg-violet-500/10 text-violet-400"
                            : "border-white/10 bg-white/5 text-gray-400 hover:border-white/20"
                            }`}
                    >
                        <FiFilter className="h-3.5 w-3.5" />
                        Filters
                        {hasActiveFilters && (
                            <span className="ml-1 h-4 w-4 rounded-full bg-violet-500 text-[10px] flex items-center justify-center text-white">
                                !
                            </span>
                        )}
                    </button>
                    {hasActiveFilters && (
                        <button
                            onClick={clearFilters}
                            className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-300 transition-colors"
                        >
                            <FiX className="h-3 w-3" /> Clear
                        </button>
                    )}
                </div>

                <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-500">{totalOrders} results</span>
                    <button
                        onClick={fetchOrders}
                        disabled={loading}
                        className="flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs font-medium text-gray-400 hover:border-white/20 hover:text-white transition-all disabled:opacity-50"
                    >
                        <FiRefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
                        Refresh
                    </button>
                </div>
            </div>

            {/* Filter Bar */}
            {showFilters && (
                <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                    {/* Order ID Search */}
                    <div className="relative col-span-2 sm:col-span-1">
                        <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 w-3.5 h-3.5" />
                        <input
                            type="text"
                            value={filters._id}
                            onChange={(e) => setFilters((f) => ({ ...f, _id: e.target.value, page: 1 }))}
                            placeholder="Order ID"
                            className="w-full rounded-lg border border-white/10 bg-gray-900 pl-8 pr-3 py-2 text-xs text-gray-300 placeholder-gray-500 outline-none focus:border-violet-500/50"
                        />
                    </div>

                    <select
                        value={filters.category}
                        onChange={(e) => setFilters((f) => ({ ...f, category: e.target.value, page: 1 }))}
                        className="rounded-lg border border-white/10 bg-gray-900 px-3 py-2 text-xs text-gray-300 outline-none focus:border-violet-500/50"
                    >
                        <option value="">All Categories</option>
                        <option value="spot">Spot</option>
                        <option value="perpetual">Perpetual</option>
                    </select>
                    <select
                        value={filters.orderStatus}
                        onChange={(e) => setFilters((f) => ({ ...f, orderStatus: e.target.value, page: 1 }))}
                        className="rounded-lg border border-white/10 bg-gray-900 px-3 py-2 text-xs text-gray-300 outline-none focus:border-violet-500/50"
                    >
                        <option value="">All Statuses</option>
                        <option value="OPENED">Opened</option>
                        <option value="PENDING">Pending</option>
                        <option value="PROCESSING">Processing</option>
                        <option value="CLOSED">Closed</option>
                        <option value="FAILED">Failed</option>
                        <option value="CANCELLED">Cancelled</option>
                    </select>
                    <select
                        value={filters.strategy}
                        onChange={(e) => setFilters((f) => ({ ...f, strategy: e.target.value, page: 1 }))}
                        className="rounded-lg border border-white/10 bg-gray-900 px-3 py-2 text-xs text-gray-300 outline-none focus:border-violet-500/50"
                    >
                        <option value="">All Strategies</option>
                        <option value="limit">Limit</option>
                        <option value="scalp">Scalp</option>
                        <option value="grid">Grid</option>
                        <option value="dca">DCA</option>
                        <option value="algo">Algo</option>
                        <option value="sellToken">Sell Token</option>
                    </select>
                    <select
                        value={filters.orderMode}
                        onChange={(e) => setFilters((f) => ({ ...f, orderMode: e.target.value, page: 1 }))}
                        className="rounded-lg border border-white/10 bg-gray-900 px-3 py-2 text-xs text-gray-300 outline-none focus:border-violet-500/50"
                    >
                        <option value="">All Modes</option>
                        <option value="Live">Live</option>
                        <option value="Demo">Demo</option>
                        <option value="Testnet">Testnet</option>
                    </select>
                </div>
            )}

            {/* Orders Table */}
            <div className="rounded-xl border border-white/10 bg-white/[0.02] overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="border-b border-white/10 bg-white/[0.03]">
                                {["User", "Name", "Category", "Strategy", "Status", "Mode", "Chain", "Type", "Created"].map((h) => (
                                    <th key={h} className="px-4 py-3 text-[11px] font-semibold uppercase tracking-wider text-gray-500">
                                        {h}
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {loading && orders.length === 0 ? (
                                <tr>
                                    <td colSpan={9} className="px-4 py-12 text-center text-sm text-gray-500">
                                        <span className="inline-block h-5 w-5 animate-spin rounded-full border-2 border-gray-600 border-t-violet-500 mr-2" />
                                        Loading orders...
                                    </td>
                                </tr>
                            ) : orders.length === 0 ? (
                                <tr>
                                    <td colSpan={9} className="px-4 py-12 text-center text-sm text-gray-500">
                                        No orders found
                                    </td>
                                </tr>
                            ) : (
                                orders.map((order: any) => (
                                    <tr key={order._id} className="border-b border-white/5 hover:bg-white/[0.02] transition-colors">
                                        <td className="px-4 py-3">
                                            <div className="text-xs text-gray-300 font-mono max-w-[120px] truncate" title={order.user?.account}>
                                                {order.user?.account ? `${order.user.account.slice(0, 6)}...${order.user.account.slice(-4)}` : "—"}
                                            </div>
                                            <div className="text-[10px] text-gray-600">{order.user?.status}</div>
                                        </td>
                                        <td className="px-4 py-3 text-xs text-gray-300 max-w-[140px] truncate" title={order.name}>
                                            {order.name || "—"}
                                        </td>
                                        <td className="px-4 py-3">
                                            <span
                                                className={`inline-block rounded-md px-2 py-0.5 text-[10px] font-medium border ${order.category === "perpetual"
                                                    ? "bg-blue-500/10 text-blue-400 border-blue-500/20"
                                                    : "bg-teal-500/10 text-teal-400 border-teal-500/20"
                                                    }`}
                                            >
                                                {order.category}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 text-xs text-gray-400">{order.strategy}</td>
                                        <td className="px-4 py-3">
                                            <span className={`inline-block rounded-md px-2 py-0.5 text-[10px] font-medium border ${getStatusColor(order.orderStatus)}`}>
                                                {order.orderStatus}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 text-xs text-gray-400">{order.orderMode}</td>
                                        <td className="px-4 py-3 text-xs text-gray-400">{order.chainId}</td>
                                        <td className="px-4 py-3">
                                            <span className={`text-xs font-medium ${order.orderType === "BUY" ? "text-emerald-400" : "text-rose-400"}`}>
                                                {order.orderType}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 text-[11px] text-gray-500 whitespace-nowrap">
                                            {order.createdAt
                                                ? new Date(order.createdAt).toLocaleDateString("en-US", {
                                                    month: "short",
                                                    day: "numeric",
                                                    year: "numeric",
                                                })
                                                : "—"}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                    <div className="flex items-center justify-between border-t border-white/10 px-4 py-3">
                        <span className="text-xs text-gray-500">
                            Page {filters.page} of {totalPages}
                        </span>
                        <div className="flex items-center gap-1">
                            <button
                                onClick={() => setFilters((f) => ({ ...f, page: Math.max(1, f.page - 1) }))}
                                disabled={filters.page <= 1}
                                className="rounded-lg border border-white/10 p-1.5 text-gray-400 hover:bg-white/5 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                            >
                                <FiChevronLeft className="h-4 w-4" />
                            </button>
                            <button
                                onClick={() => setFilters((f) => ({ ...f, page: Math.min(totalPages, f.page + 1) }))}
                                disabled={filters.page >= totalPages}
                                className="rounded-lg border border-white/10 p-1.5 text-gray-400 hover:bg-white/5 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                            >
                                <FiChevronRight className="h-4 w-4" />
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}