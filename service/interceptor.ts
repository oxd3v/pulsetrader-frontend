// interceptor.ts – fetch‑based with structured error throwing
import { TOKEN_STORAGE_KEY, ACCOUNT_STORAGE_KEY } from "@/constants/config/enviroments";

const BASE_URL = process.env.NEXT_PUBLIC_REST_API_URL || "";

// ─── helpers ──────────────────────────────────────────────────────────────

const clearAuthStorage = () => {
  try {
    localStorage.removeItem(TOKEN_STORAGE_KEY);
    localStorage.removeItem(ACCOUNT_STORAGE_KEY);
  } catch {
    // localStorage may not be available during SSR
  }
};

const buildUrl = (url: string, params?: Record<string, any>): string => {
  const fullUrl = url.startsWith("http") ? url : `${BASE_URL}${url}`;
  if (!params) return fullUrl;
  const searchParams = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      searchParams.append(key, String(value));
    }
  });
  const queryString = searchParams.toString();
  return queryString ? `${fullUrl}?${queryString}` : fullUrl;
};

const defaultHeaders: HeadersInit = {
  "Content-Type": "application/json",
};

// ─── core request function ──────────────────────────────────────────────

async function request<T = any>(
  url: string,
  method: string,
  data?: any,
  options?: RequestInit & { params?: Record<string, any> },
): Promise<T> {
  const { params, ...fetchOptions } = options || {};
  const finalUrl = buildUrl(url, params);

  const headers: HeadersInit = {
    ...defaultHeaders,
    ...(fetchOptions.headers || {}),
  };

  const init: RequestInit = {
    method,
    headers,
    credentials: "include",
    ...fetchOptions,
  };

  if (data && method !== "GET" && method !== "HEAD") {
    init.body = JSON.stringify(data);
  }

  try {
    const response = await fetch(finalUrl, init);

    // ─── Authentication errors ────────────────────────────────────────────
    if (response.status === 401 || response.status === 402) {
      clearAuthStorage();
      window.location.href = "/connect";
      throw new Error("UNAUTHENTICATED");
    }

    // ─── Other HTTP errors ────────────────────────────────────────────────
    if (!response.ok) {
      let errorCode = `HTTP_${response.status}`;
      try {
        const errorBody = await response.json();
        if (errorBody?.message) {
          errorCode = errorBody.message;
        } else if (errorBody?.error) {
          errorCode = errorBody.error;
        }
      } catch {
        // ignore if response is not JSON
      }
      throw new Error(errorCode);
    }

    // ─── Success ──────────────────────────────────────────────────────────
    const contentType = response.headers.get("content-type");
    if (contentType?.includes("application/json")) {
      return (await response.json()) as T;
    }
    return (await response.text()) as unknown as T;
  } catch (error) {
    // Network errors or any other fetch rejection
    if (error instanceof Error) {
      throw error; // preserve the error code
    }
    throw new Error("API_FAILED");
  }
}

// ─── public API ──────────────────────────────────────────────────────────

const ApiClient = {
  get<T = any>(url: string, options?: RequestInit & { params?: Record<string, any> }) {
    return request<T>(url, "GET", undefined, options);
  },
  post<T = any>(url: string, data?: any, options?: RequestInit & { params?: Record<string, any> }) {
    return request<T>(url, "POST", data, options);
  },
  put<T = any>(url: string, data?: any, options?: RequestInit & { params?: Record<string, any> }) {
    return request<T>(url, "PUT", data, options);
  },
  patch<T = any>(url: string, data?: any, options?: RequestInit & { params?: Record<string, any> }) {
    return request<T>(url, "PATCH", data, options);
  },
  delete<T = any>(url: string, options?: RequestInit & { params?: Record<string, any> }) {
    return request<T>(url, "DELETE", undefined, options);
  },
};

export default ApiClient;