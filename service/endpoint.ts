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
  // order related endpoints
  GET_ORDER: '/get-orders',
  CREATE_ORDER: '/create-order',
  CLOSE_ORDER: '/close-order',
  DELETE_ORDER: '/delete-order',
}

export default API_ENDPOINTS;


