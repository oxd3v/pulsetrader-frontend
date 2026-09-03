import ApiClient from "./interceptor";
import API_ENDPOINTS from "./endpoint";

const UserService = {
  //user related

  getSystemInfo: (params: any) =>
    ApiClient.get(API_ENDPOINTS.GET_SYSTEM_INFO, {
      params: {
        ...params,
      },
    }),
  checkUser: (params: any) =>
    ApiClient.get(API_ENDPOINTS.CHECK_USER, {
      params: {
        ...params,
      },
    }),
  connect: (params: any) => ApiClient.post(API_ENDPOINTS.CONNECT, params),
  disconnect: (params: any) => ApiClient.post(API_ENDPOINTS.DISCONNECT, params),
  joinUser: (params: any) => ApiClient.post(API_ENDPOINTS.JOIN, params),
  createInvitationCode: (params: any) => ApiClient.post(API_ENDPOINTS.CREATE_INVITATION_CODE, params),
  deleteInvitationCode: (params: any) => ApiClient.post(API_ENDPOINTS.DELETE_INVITATION_CODE, params),
  getUserHistories: (params: any) =>
    ApiClient.get(API_ENDPOINTS.GET_USER_HISTORY, {
      params: {
        ...params,
      },
    }),
  //order related
  getUserOrder: (params: any) =>
    ApiClient.get(API_ENDPOINTS.GET_ORDER, {
      params: {
        ...params,
      },
    }),
  //wallet related
  getEncryptedPrivateKey: (params: any) =>
    ApiClient.get(API_ENDPOINTS.GET_PRIVATE_KEY, {
      params: {
        ...params,
      },
    }),
  withdraw: (params: any) => ApiClient.post(API_ENDPOINTS.WITHDRAW_FUND, params),
  createNewWallet: (params: any) => ApiClient.post(API_ENDPOINTS.CREATE_NEW_WALLET, params),

  // perp and agent wallet related
  perpDeposit: (params: any) => ApiClient.post(API_ENDPOINTS.PERP_DEPOSIT, params),
  getPerpBalance: (params: any) => ApiClient.get(API_ENDPOINTS.GET_PERP_BALANCE, { params }),
  withdrawPerp: (params: any) => ApiClient.post(API_ENDPOINTS.WITHDRAW_PERP, params),
};

export default UserService;

