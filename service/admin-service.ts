import ApiClient from "./interceptor";
import API_ENDPOINTS from "./endpoint";

const AdminService = {
  verifyAdmin: (password: string) =>
    ApiClient.post(API_ENDPOINTS.ADMIN_VERIFY, { password }),

  getAllOrders: (filters: {
    category?: string;
    orderStatus?: string;
    strategy?: string;
    orderMode?: string;
    page?: number;
    limit?: number;
  }) =>
    ApiClient.get(API_ENDPOINTS.ADMIN_GET_ORDERS, { params: filters }),

  getSystemData: () =>
    ApiClient.get(API_ENDPOINTS.ADMIN_GET_SYSTEM_DATA),

  updateSystem: (data: Record<string, any>) =>
    ApiClient.post(API_ENDPOINTS.ADMIN_UPDATE_SYSTEM, data),

  switchListening: (shouldListen: boolean) =>
    ApiClient.post(API_ENDPOINTS.ADMIN_SWITCH_LISTENING, { shouldListen }),

  getLogFiles: () =>
    ApiClient.get(API_ENDPOINTS.ADMIN_GET_LOGS),

  getLogContent: (filename: string, lines?: number) =>
    ApiClient.get(`${API_ENDPOINTS.ADMIN_GET_LOGS}/${filename}`, {
      params: lines ? { lines } : undefined,
    }),

  deleteLogFile: (filename: string) =>
    ApiClient.delete(`${API_ENDPOINTS.ADMIN_GET_LOGS}/${filename}`),
};

export default AdminService;
