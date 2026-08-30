// fetchRequest.ts
const URL_RATE_LIMITER_MAP = new Map<string, {
    count: number;           // requests made in current window
    windowStart: number;     // start timestamp of current window
    blockedUntil: number;    // timestamp until which this limiter is blocked (due to 429)
}>();
const FAILURE_CATCH = new Map<string, number>(); // endpoint id -> expiry timestamp
const FAILURE_ENDPOINT_TTL_MS = 100000; // 100 seconds

/**
 * Parse Retry-After header, return milliseconds to wait.
 */
const parseRetryAfterMs = (response: Response, fallbackMs: number): number => {
    const retryAfterHeader = response.headers?.get?.("retry-after");
    if (!retryAfterHeader) return fallbackMs;

    const retryAfterSeconds = Number(retryAfterHeader);
    if (Number.isFinite(retryAfterSeconds) && retryAfterSeconds >= 0) {
        return Math.max(retryAfterSeconds * 1000, fallbackMs);
    }

    const retryAfterDate = Date.parse(retryAfterHeader);
    if (Number.isFinite(retryAfterDate)) {
        return Math.max(retryAfterDate - Date.now(), fallbackMs);
    }

    return fallbackMs;
};

/**
 * Generic fetch wrapper with rate limiting and failure caching.
 * 
 * @param url - endpoint URL
 * @param method - HTTP method
 * @param data - request body (for non‑GET)
 * @param headers - additional headers
 * @param timeoutMs - request timeout
 * @param urlRateLimiter - optional limiter config { id, requestCount, requestIntervalMs }
 */
export const nativeFetchRequest = async <T = any>({
    url,
    method,
    data,
    headers,
    timeoutMs = 10000,
    urlRateLimiter = null,
}: {
    url: string;
    method: string;
    data?: any;
    headers?: any;
    timeoutMs?: number;
    urlRateLimiter?: {
        id: string;
        requestCount: number;
        requestIntervalMs: number;
    } | null;
}): Promise<T> => {
    // ── Rate limiting & failure cache checks ──────────────────────────────
    const limiterId = urlRateLimiter?.id;
    if (limiterId) {
        // 1. Check failure cache
        const failureExpiry = FAILURE_CATCH.get(limiterId);
        if (failureExpiry && Date.now() < failureExpiry) {
            throw new Error("SKIP_FAILED_ENDPOINT");
        }

        // 2. Check rate limiter state
        const state = URL_RATE_LIMITER_MAP.get(limiterId);
        const now = Date.now();

        // If blocked by a previous 429
        if (state && state.blockedUntil && now < state.blockedUntil) {
            throw new Error("TOO_MANY_REQUEST");
        }

        // If we have a state, check if we are still within the current window
        if (state) {
            const windowEnd = state.windowStart + urlRateLimiter.requestIntervalMs;
            if (now < windowEnd) {
                // Still in same window
                if (state.count >= urlRateLimiter.requestCount) {
                    // Exceeded limit – block until window ends
                    state.blockedUntil = windowEnd;
                    URL_RATE_LIMITER_MAP.set(limiterId, state);
                    throw new Error("BLOCK_BY_RATE_LIMIT");
                }
                // otherwise, we will increment count later on success
            } else {
                // Window expired – reset
                state.count = 0;
                state.windowStart = now;
                state.blockedUntil = 0;
                URL_RATE_LIMITER_MAP.set(limiterId, state);
            }
        } else {
            // First request for this limiter – create state
            URL_RATE_LIMITER_MAP.set(limiterId, {
                count: 0,
                windowStart: now,
                blockedUntil: 0,
            });
        }
    }

    // ── Actual fetch ──────────────────────────────────────────────────────
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);

    try {
        const response = await fetch(url, {
            method,
            headers: {
                "Content-Type": "application/json",
                ...(headers || {}),
            },
            body: method === "GET" ? undefined : JSON.stringify(data),
            signal: controller.signal,
        });

        clearTimeout(timeout);

        // ── Handle non‑2xx responses ──────────────────────────────────────
        if (!response.ok) {
            const status = response.status;

            // Rate limit (429)
            if (status === 429 && limiterId) {
                const retryAfterMs = parseRetryAfterMs(response, urlRateLimiter.requestIntervalMs || 60000);
                const state = URL_RATE_LIMITER_MAP.get(limiterId);
                if (state) {
                    state.blockedUntil = Date.now() + retryAfterMs;
                    URL_RATE_LIMITER_MAP.set(limiterId, state);
                }
                throw new Error("TOO_MANY_REQUEST");
            }

            // Other errors – mark endpoint as failed (for failure cache)
            if (limiterId) {
                FAILURE_CATCH.set(limiterId, Date.now() + FAILURE_ENDPOINT_TTL_MS);
            }

            // Try to get error message from response
            let errorMessage = `Request failed with status ${status}`;
            try {
                const errorBody = await response.json();
                if (errorBody?.message) errorMessage = errorBody.message;
            } catch {
                // ignore
            }
            throw new Error(errorMessage);
        }

        // ── Success ────────────────────────────────────────────────────────
        // Remove failure marker if any
        if (limiterId) {
            FAILURE_CATCH.delete(limiterId);

            // Increment request count for this limiter
            const state = URL_RATE_LIMITER_MAP.get(limiterId);
            if (state) {
                state.count += 1;
                URL_RATE_LIMITER_MAP.set(limiterId, state);
            }
        }

        // Parse JSON
        const result = await response.json();
        return result as T;
    } catch (error) {
        clearTimeout(timeout);
        if (error instanceof Error) {
            if (error.name === "AbortError") {
                throw new Error(`Request timed out after ${timeoutMs}ms`);
            }
            throw error;
        }
        throw new Error("Unknown fetch error");
    }
};

/**
 * Build a query string from an object and append to URL.
 */
export const withQuery = (url: string, query: any): string => {
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(query)) {
        if (value == null) continue;
        if (Array.isArray(value)) {
            value.forEach((entry) => params.append(key, String(entry)));
            continue;
        }
        params.append(key, String(value));
    }
    const qs = params.toString();
    return qs ? `${url}?${qs}` : url;
};