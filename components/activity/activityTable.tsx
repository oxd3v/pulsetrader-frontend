import { useState, useEffect, useCallback, useMemo } from "react";
import { useUserAuth } from "@/hooks/useAuth";
import { ActivityType } from "@/type/common";
import ActivityCard from "./activityCard";
import ActivityListItem from "./activityList";
import {
  FiRefreshCw,
  FiChevronLeft,
  FiChevronRight,
  FiSearch,
  FiX,
  FiFilter,
  FiSliders,
} from "react-icons/fi";
import { FaHistory } from "react-icons/fa";
import { CiGrid41, CiGrid2H } from "react-icons/ci";
import { BsTable } from "react-icons/bs";

// ── Types ─────────────────────────────────────────────────────────────────────

type ViewMode = "card" | "list";

interface FilterState {
  search: string;
  type: string;
  mode: string;
  status: string;
  network: string;
}

const INITIAL_FILTERS: FilterState = {
  search: "",
  type: "all",
  mode: 'all',
  status: "all",
  network: "all",
};

const ACTIVITY_MODES = ['all', 'demo', 'testnet', 'live'];
const ACTIVITY_TYPES = ["all", "SWAP", "TRANSFER", "WITHDRAW", "DEPOSIT", "OPEN", "CLOSE"];
const ACTIVITY_STATUSES = ["all", "Success", "Failed"];

// ── Helpers ───────────────────────────────────────────────────────────────────

function getInitialView(): ViewMode {
  if (typeof window === "undefined") return "list";
  return window.innerWidth >= 768 ? "list" : "card";
}

function matchesSearch(activity: ActivityType, term: string): boolean {
  if (!term) return true;
  const t = term.toLowerCase();
  return (
    activity.txHash?.toLowerCase().includes(t) ||
    activity._id?.toLowerCase().includes(t) ||
    activity.type?.toLowerCase().includes(t) ||
    activity.payToken?.symbol?.toLowerCase().includes(t) ||
    activity.receiveToken?.symbol?.toLowerCase().includes(t) ||
    activity.payToken?.address?.toLowerCase().includes(t) ||
    activity.receiveToken?.address?.toLowerCase().includes(t) ||
    activity.wallet?.address?.toLowerCase().includes(t) ||
    false
  );
}

function applyFilters(activities: ActivityType[], filters: FilterState): ActivityType[] {
  return activities.filter((a) => {
    if (!matchesSearch(a, filters.search)) return false;
    if (filters.type !== "all" && a.type?.toUpperCase() !== filters.type.toUpperCase()) return false;
    if (filters.status !== "all" && a.status?.toLowerCase() !== filters.status.toLowerCase()) return false;
    if (filters.mode !== "all" && a.mode?.toLowerCase() !== filters.mode.toLowerCase()) return false;
    if (filters.network !== "all" && a.wallet?.network?.toLowerCase() !== filters.network.toLowerCase()) return false;
    return true;
  });
}

// ── Table Header ──────────────────────────────────────────────────────────────

const TABLE_HEADERS = [
  "Type",
  "Sent",
  "Received",
  "Fee",
  "Wallet",
  "Tx Hash",
  "Status",
];

// ── Component ─────────────────────────────────────────────────────────────────

export default function ActivityDashboard({
  user,
  walletAddress,
  walletId,
}: {
  user: any;
  walletAddress: string;
  walletId: string;
}) {
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [histories, setHistories] = useState<ActivityType[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);

  // View & Filter
  const [viewMode, setViewMode] = useState<ViewMode>(getInitialView);
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState<FilterState>(INITIAL_FILTERS);

  const { getUserHistory } = useUserAuth();

  // ── Responsive view sync ───────────────────────────────────────────────────
  useEffect(() => {
    function onResize() {
      // Only auto-switch if the user hasn't manually toggled
      setViewMode((prev) => {
        const preferred = window.innerWidth >= 768 ? "list" : "card";
        return prev; // Don't override manual choice on resize — remove this line to auto-switch
      });
    }
    // Set initial view correctly after hydration
    setViewMode(getInitialView());
  }, []);

  // ── Fetch ──────────────────────────────────────────────────────────────────
  const fetchHistory = useCallback(async () => {
    if (loading) return;
    setLoading(true);
    setError(null);
    try {
      const response: any = await getUserHistory({ page, limit, walletAddress, walletId });
      if (response.success && Array.isArray(response.histories)) {
        setHistories(response.histories);
        setHasMore(response.histories.length >= limit);
      } else {
        setError(response.error || "Failed to load history.");
      }
    } catch {
      setError("An unexpected error occurred.");
    } finally {
      setLoading(false);
    }
  }, [page, limit, walletAddress, walletId, getUserHistory]);

  useEffect(() => {
    fetchHistory();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]);

  // ── Filtered data ──────────────────────────────────────────────────────────
  const filteredHistories = useMemo(
    () => applyFilters(histories, filters),
    [histories, filters]
  );

  // ── Derived filter metadata ────────────────────────────────────────────────
  const hasActiveFilters =
    filters.search !== "" ||
    filters.type !== "all" ||
    filters.status !== "all" ||
    filters.network !== "all";

  const uniqueNetworks = useMemo(() => {
    const nets = new Set(histories.map((h) => h.wallet?.network).filter(Boolean));
    return ["all", ...Array.from(nets)] as string[];
  }, [histories]);

  // ── Handlers ──────────────────────────────────────────────────────────────
  const handleNext = () => { if (hasMore && !loading) setPage((p) => p + 1); };
  const handlePrev = () => { if (page > 1 && !loading) setPage((p) => p - 1); };
  const clearFilters = () => setFilters(INITIAL_FILTERS);

  const setFilter = <K extends keyof FilterState>(key: K, value: FilterState[K]) =>
    setFilters((prev) => ({ ...prev, [key]: value }));

  // ── Loading Skeleton ───────────────────────────────────────────────────────
  const renderSkeleton = () =>
    viewMode === "card" ? (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-4 p-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-52 bg-zinc-100 dark:bg-zinc-800 animate-pulse rounded-xl" />
        ))}
      </div>
    ) : (
      <div className="space-y-px p-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-12 bg-zinc-100 dark:bg-zinc-800 animate-pulse rounded-lg" />
        ))}
      </div>
    );

  // ── Empty / Error ──────────────────────────────────────────────────────────
  const renderEmpty = (message: string, action?: () => void, actionLabel?: string) => (
    <div className="flex flex-col items-center justify-center h-64 text-zinc-400 bg-zinc-50 dark:bg-zinc-800/40 rounded-xl border border-dashed border-zinc-200 dark:border-zinc-700 m-4">
      <FaHistory className="w-10 h-10 mb-3 opacity-20" />
      <p className="text-sm font-medium">{message}</p>
      {action && (
        <button onClick={action} className="mt-3 text-indigo-500 hover:text-indigo-600 text-sm font-semibold underline underline-offset-2">
          {actionLabel}
        </button>
      )}
    </div>
  );

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="w-full max-w-7xl mx-auto flex flex-col h-full overflow-y-auto b">

      {/* ── Header ── */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3 px-4 pt-4 pb-3 border-b border-zinc-100 dark:border-zinc-800">
        <div>
          <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
            <FaHistory className="w-5 h-5 text-indigo-500" />
            Transaction History
          </h2>
          <p className="text-xs text-zinc-400 mt-0.5">
            {histories.length > 0 && (
              <>
                {filteredHistories.length} of {histories.length} transactions
                {hasActiveFilters && " (filtered)"}
              </>
            )}
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">

          {/* View Toggler */}
          <div className="flex items-center bg-zinc-100 dark:bg-zinc-800 rounded-lg p-0.5 border border-zinc-200 dark:border-zinc-700">
            <button
              onClick={() => setViewMode("card")}
              title="Card View"
              className={`p-2 rounded-md transition-all duration-150 ${viewMode === "card"
                ? "bg-white dark:bg-zinc-700 shadow-sm text-indigo-600 dark:text-indigo-400"
                : "text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300"
                }`}
            >
              <CiGrid41 className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode("list")}
              title="List View"
              className={`p-2 rounded-md transition-all duration-150 ${viewMode === "list"
                ? "bg-white dark:bg-zinc-700 shadow-sm text-indigo-600 dark:text-indigo-400"
                : "text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300"
                }`}
            >
              <BsTable className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Filter Toggle */}
          <button
            onClick={() => setShowFilters((s) => !s)}
            className={`flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg border transition-all duration-150 ${showFilters || hasActiveFilters
              ? "bg-indigo-50 border-indigo-200 text-indigo-600 dark:bg-indigo-900/20 dark:border-indigo-800 dark:text-indigo-400"
              : "bg-white dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-300"
              }`}
          >
            <FiSliders className="w-3.5 h-3.5" />
            Filters
            {hasActiveFilters && (
              <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 inline-block" />
            )}
          </button>

          {/* Refresh */}
          <button
            onClick={fetchHistory}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-zinc-600 dark:text-zinc-300 bg-white dark:bg-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-700 border border-zinc-200 dark:border-zinc-700 rounded-lg transition-colors disabled:opacity-50"
          >
            <FiRefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* ── Filter Panel ── */}
      {showFilters && (
        <div className="px-4 py-3 bg-zinc-50 dark:bg-zinc-900/60 border-b border-zinc-100 dark:border-zinc-800 animate-in fade-in slide-in-from-top-1 duration-200">
          <div className="flex flex-col sm:flex-row gap-2.5 flex-wrap">

            {/* Search */}
            <div className="relative flex-grow min-w-[200px]">
              <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 w-3.5 h-3.5" />
              <input
                type="text"
                placeholder="Search tx hash, wallet, token, ID…"
                value={filters.search}
                onChange={(e) => setFilter("search", e.target.value)}
                className="w-full pl-8 pr-8 py-2 text-xs rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-800 dark:text-zinc-100 placeholder-zinc-400 focus:ring-2 focus:ring-indigo-400/40 focus:border-indigo-400 outline-none transition"
              />
              {filters.search && (
                <button
                  onClick={() => setFilter("search", "")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-300 hover:text-zinc-500 transition-colors"
                >
                  <FiX className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Type */}
            <select
              value={filters.type}
              onChange={(e) => setFilter("type", e.target.value)}
              className="px-3 py-2 text-xs rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-700 dark:text-zinc-200 outline-none focus:ring-2 focus:ring-indigo-400/40 focus:border-indigo-400 transition"
            >
              {ACTIVITY_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t === "all" ? "All Types" : t.charAt(0) + t.slice(1).toLowerCase()}
                </option>
              ))}
            </select>
            <select
              value={filters.mode}
              onChange={(e) => setFilter("mode", e.target.value)}
              className="px-3 py-2 text-xs rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-700 dark:text-zinc-200 outline-none focus:ring-2 focus:ring-indigo-400/40 focus:border-indigo-400 transition"
            >
              {ACTIVITY_MODES.map((t) => (
                <option key={t} value={t}>
                  {t === "all" ? "All Modes" : t.charAt(0) + t.slice(1).toLowerCase()}
                </option>
              ))}
            </select>

            {/* Status */}
            <select
              value={filters.status}
              onChange={(e) => setFilter("status", e.target.value)}
              className="px-3 py-2 text-xs rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-700 dark:text-zinc-200 outline-none focus:ring-2 focus:ring-indigo-400/40 focus:border-indigo-400 transition"
            >
              {ACTIVITY_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {s === "all" ? "All Statuses" : s.charAt(0).toUpperCase() + s.slice(1)}
                </option>
              ))}
            </select>

            {/* Network */}
            {uniqueNetworks.length > 1 && (
              <select
                value={filters.network}
                onChange={(e) => setFilter("network", e.target.value)}
                className="px-3 py-2 text-xs rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-700 dark:text-zinc-200 outline-none focus:ring-2 focus:ring-indigo-400/40 focus:border-indigo-400 transition"
              >
                {uniqueNetworks.map((n) => (
                  <option key={n} value={n}>
                    {n === "all" ? "All Networks" : n}
                  </option>
                ))}
              </select>
            )}

            {/* Clear */}
            {hasActiveFilters && (
              <button
                onClick={clearFilters}
                className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-red-500 hover:text-red-600 bg-red-50 dark:bg-red-900/10 hover:bg-red-100 dark:hover:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg transition-colors"
              >
                <FiX className="w-3.5 h-3.5" />
                Clear
              </button>
            )}
          </div>

          {/* Active filter chips */}
          {hasActiveFilters && (
            <div className="flex flex-wrap gap-1.5 mt-2.5">
              {filters.search && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 text-[10px] font-semibold rounded-full">
                  "{filters.search.slice(0, 20)}{filters.search.length > 20 ? "…" : ""}"
                  <button onClick={() => setFilter("search", "")}><FiX className="w-2.5 h-2.5" /></button>
                </span>
              )}
              {filters.type !== "all" && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-[10px] font-semibold rounded-full">
                  {filters.type}
                  <button onClick={() => setFilter("type", "all")}><FiX className="w-2.5 h-2.5" /></button>
                </span>
              )}
              {filters.status !== "all" && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 text-[10px] font-semibold rounded-full">
                  {filters.status}
                  <button onClick={() => setFilter("status", "all")}><FiX className="w-2.5 h-2.5" /></button>
                </span>
              )}
              {filters.network !== "all" && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300 text-[10px] font-semibold rounded-full">
                  {filters.network}
                  <button onClick={() => setFilter("network", "all")}><FiX className="w-2.5 h-2.5" /></button>
                </span>
              )}
            </div>
          )}
        </div>
      )}

      {/* ── Content ── */}
      <div className="gorw overflow-y-auto">
        <div className="h-full overflow-y-auto scrollbar-thin scrollbar-thumb-zinc-200 dark:scrollbar-thumb-zinc-700 scrollbar-track-transparent">
          {loading && histories.length === 0 ? (
            renderSkeleton()
          ) : error ? (
            renderEmpty(error, fetchHistory, "Try Again")
          ) : filteredHistories.length === 0 ? (
            renderEmpty(
              hasActiveFilters ? "No transactions match your filters." : "No transactions found.",
              hasActiveFilters ? clearFilters : undefined,
              "Clear filters"
            )
          ) : viewMode === "card" ? (
            /* ── Card Grid ── */
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-4 p-4">
              {filteredHistories.map((activity) => (
                <ActivityCard
                  key={activity._id || activity.txHash}
                  activityDetails={activity}
                />
              ))}
            </div>
          ) : (
            /* ── List / Table ── */
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-zinc-50 dark:bg-zinc-900/80 border-b border-zinc-200 dark:border-zinc-800">
                    {TABLE_HEADERS.map((h, i) => (
                      <th
                        key={i}
                        className="px-4 py-2.5 text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest whitespace-nowrap"
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filteredHistories.map((activity, idx) => (
                    <ActivityListItem
                      key={activity._id || activity.txHash}
                      activityDetails={activity}
                      isEven={idx % 2 === 0}
                    />
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* ── Pagination ── */}
      {!loading && filteredHistories.length > 0 && (
        <div className="flex justify-between items-center px-4 py-3 border-t border-zinc-100 dark:border-zinc-800 bg-white dark:bg-zinc-950 shrink-0">
          <span className="text-xs text-zinc-400">
            Page <span className="font-semibold text-zinc-700 dark:text-zinc-200">{page}</span>
            {" · "}
            <span className="font-semibold text-zinc-700 dark:text-zinc-200">{filteredHistories.length}</span> results
          </span>

          <div className="flex gap-2">
            <button
              onClick={handlePrev}
              disabled={page === 1 || loading}
              className="flex items-center gap-1 px-3 py-1.5 text-xs font-semibold border border-zinc-200 dark:border-zinc-700 rounded-lg hover:bg-zinc-50 dark:hover:bg-zinc-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors text-zinc-600 dark:text-zinc-300"
            >
              <FiChevronLeft className="w-3.5 h-3.5" />
              Prev
            </button>
            <button
              onClick={handleNext}
              disabled={!hasMore || loading}
              className="flex items-center gap-1 px-3 py-1.5 text-xs font-semibold bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 rounded-lg hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed transition-opacity"
            >
              Next
              <FiChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}