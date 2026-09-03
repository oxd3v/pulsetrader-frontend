const API_ENDPOINTS = {
  JOIN: '/join-user',
  CONNECT: '/connect',
  DISCONNECT: '/disconnect',
  CHECK_USER: '/check-user',
  WITHDRAW_FUND: '/withdraw-balance',
  GET_PRIVATE_KEY: '/get-encrypted-private-key',
  CREATE_INVITATION_CODE: "/create-invitation-code",
  DELETE_INVITATION_CODE: "/delete-invitation-code",
  CREATE_NEW_WALLET: '/create-new-wallet',
  GET_USER_HISTORY: '/get-user-histories',
  PERP_DEPOSIT: '/deposit-perp',
  GET_PERP_BALANCE: '/get-perp-dex-balance',
  WITHDRAW_PERP: '/withdraw-perp',
  GET_SYSTEM_INFO: '/info',
  // order related endpoints
  GET_ORDER: '/get-orders',
  CREATE_ORDER: '/create-order',
  CLOSE_ORDER: '/close-order',
  DELETE_ORDER: '/delete-order',
  // admin dashboard endpoints
  ADMIN_VERIFY: '/admin/verify',
  ADMIN_GET_ORDERS: '/admin/orders',
  ADMIN_GET_SYSTEM_DATA: '/admin/system-data',
  ADMIN_UPDATE_SYSTEM: '/admin/update-system',
  ADMIN_GET_LOGS: '/admin/logs',
  ADMIN_SWITCH_LISTENING: '/admin/switch-order-listening',
};

export default API_ENDPOINTS;
