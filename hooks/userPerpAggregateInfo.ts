import { useEffect, useState, useCallback, useRef, useMemo } from "react";
import { fetchFuturesMarketData } from "@/lib/oracle/dexchange";

interface UsePerpAggregateInfoOptions {
    symbols?: string[];
    pageNum?: number;
    pageSize?: number;
    exchange?: string;
    pollIntervalMs?: number;
    enabled?: boolean;
}

export const usePerpAggregateInfo = ({
    symbols = [],
    pageNum = 1,
    pageSize = 50,
    exchange = "All",
    pollIntervalMs,
    enabled = true,
}: UsePerpAggregateInfoOptions = {}) => {
    const [data, setData] = useState<Record<string, any> | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const intervalRef = useRef<NodeJS.Timeout | null>(null);
    const isInitialMount = useRef(true);

    // ── Stable symbols key ─────────────────────────────────────────────────────
    const symbolsKey = useMemo(() => symbols.join(","), [symbols]);

    const fetchData = useCallback(async (isBackground = false) => {
        if (!enabled) return;

        if (!isBackground) {
            setLoading(true);
        }
        setError(null);

        try {
            const result = await fetchFuturesMarketData({
                symbols: symbols.length ? symbols : [],
                pageNum,
                pageSize,
                exchange,
            });
            setData(result);
        } catch (err: any) {
            setError(err.message || "Failed to fetch aggregate market data");
        } finally {
            if (!isBackground) {
                setLoading(false);
            }
        }
    }, [symbolsKey, pageNum, pageSize, exchange, enabled]);

    // ── Initial fetch ──────────────────────────────────────────────────────────
    useEffect(() => {
        if (!enabled) {
            setLoading(false);
            return;
        }

        fetchData(false);

        if (pollIntervalMs && pollIntervalMs > 0) {
            intervalRef.current = setInterval(() => {
                fetchData(true); // background refresh – no loading state
            }, pollIntervalMs);
        }

        return () => {
            if (intervalRef.current) clearInterval(intervalRef.current);
        };
    }, [enabled, symbolsKey, pollIntervalMs]); // only re-run when symbolsKey changes

    // ── Manual refetch ────────────────────────────────────────────────────────
    const refetch = useCallback(() => {
        if (intervalRef.current) {
            clearInterval(intervalRef.current);
            intervalRef.current = null;
        }
        fetchData(false);
        if (pollIntervalMs && pollIntervalMs > 0) {
            intervalRef.current = setInterval(() => {
                fetchData(true);
            }, pollIntervalMs);
        }
    }, [fetchData, pollIntervalMs]);

    return { data, loading, error, refetch };
};