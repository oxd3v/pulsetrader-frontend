// @/constants/config/notification.ts

export const NOTIFICATION_CONFIG: Record<
  string,
  { title: string; message: string }
> = {
  // --- System & Network ---
  SERVER_ERROR: {
    title: "System Error",
    message: "Something went wrong. Please try again later.",
  },
  VALIDATION_FAILED: {
    title: "Invalid request",
    message: "The details you submitted could not be processed. Please check and try again.",
  },
  WALLET_NOT_CONNECTED: {
    title: "Wallet Not Found",
    message: "Please connect your crypto wallet to continue.",
  },
  UNAUTHENTICATED: {
    title: "Authentication Failed",
    message: "Your session is invalid. Please sign in again.",
  },
  AUTHENTICATION_FAILED: {
    title: "Authentication Failed",
    message: "Could not authenticate your request.",
  },
  INVALID_SESSION: {
    title: "Invalid Session",
    message: "Session expired or invalid. Please reconnect your wallet.",
  },
  USER_NOT_FOUND: {
    title: "Account Not Found",
    message: "This wallet is not registered. Please join the platform.",
  },
  UNAUTHORIZED_USER: {
    title: "Invitation Failed",
    message: "You are not authorized to join with this invitation.",
  },
  ALREADY_USER: {
    title: "Already Registered",
    message: "This wallet is already a member.",
  },


  //-----------------------------------------------------------------------
  //------------------------ order creation notification  -----------------
  //-----------------------------------------------------------------------
  INVALID_ALGO_ORDER: {
    title: "Invalid Algo Order",
    message: "The details you submitted could not be processed. Please check and try again.",
  },
  GRID_ORDER_CANT_BE_ALGO: {
    title: "Invalid Algo Order",
    message: "The details you submitted could not be processed. Please check and try again.",
  },
  INVALID_SELL_STRATEGY: {
    title: "Invalid Sell Order",
    message: "The details you submitted could not be processed. Please check and try again.",
  },
  INVALID_ORDER: {
    title: "Invalid Order",
    message: "The order format is invalid.",
  },
  INVALID_ORDER_NAME: {
    title: "Invalid Order Name",
    message: "Please enter a valid order name.",
  },
  INVALID_ORDER_STRATEGY: {
    title: "Invalid Strategy",
    message: "Please select a valid strategy.",
  },
  INVALID_COLLATERAL_ASSET: {
    title: "Invalid Collateral asset",
    message: "The specified collateral asset is not supported for this strategy. Please try again.",
  },
  INSUFFICIENT_COLLATERAL: {
    title: "Insufficient Collateral",
    message: "Your collateral amount is too low. Please deposit more collateral.",
  },
  INVALID_FEE_TOKEN: {
    title: "Invalid Fee Token",
    message: "Please select a valid fee token",
  },
  EXIST_ORDER_NAME: {
    title: "Order Name Exists",
    message: "Order name already exists.Please enter a unique order name",
  },
  ORDER_MODE_NOT_SUPPORTED: {
    title: "Order mode not supported",
    message: "Please select a valid order mode or upgrade tier",
  },
  INVALID_WALLETS_COUNT: {
    title: "Invalid Wallets Count",
    message: "Please enter a valid number of wallets.",
  },
  UNSUPPORTED_STRATEGY: {
    title: "Unsupported Strategy",
    message: "This strategy is not available in your tier.",
  },
  INVALID_PERP_ORDER: {
    title: "Invalid Perp Order",
    message: "Please select a valid order type for perp",
  },
  UNSUPPORTED_PERP_STRATEGY: {
    title: "Unsupported Perp Strategy",
    message: "This perp strategy is not available in your tier.",
  },
  MULTIPLE_WALLET_NOT_SUPPORTED_FOR_STRATEGY: {
    title: "Multiple Wallets Not Supported for this Strategy",
    message: "Please select a single wallet for this strategy",
  },
  NO_UNIQUE_WALLET: {
    title: "Wallet duplication",
    message: "You can't use the same wallet more than once.",
  },
  WALLET_PERPETUAL_EXIST: {
    title: "Wallet Perpetual Exist",
    message: "Hedge mode not supported. You can't use the same account for same asset for more than once in perp",
  },
  EXCEED_ORDER_LIMIT: {
    title: "Order Limit Exceeded",
    message: "You have reached the maximum number of orders allowed. Upgrade tier",
  },
  ORDER_CREATED_FAILED: {
    title: "Order Creation Failed",
    message: "We could not create your order. Please try again.",
  },
  ORDER_CREATION_SUCCESS: {
    title: "Success",
    message: "Your orders were created successfully.",
  },


  //--------------- order opration notification ----------------
  ORDER_NOT_EXIST: {
    title: "Order Not Found",
    message: "This order does not exist.",
  },
  ORDER_IN_USE: {
    title: "Order In Use",
    message: "This order is currently being processed.",
  },
  CLOSE_PERP_ORDER_FIRST: {
    title: "Close Perp Order First",
    message: "Please close the perp order first",
  },
  INVALID_OPENED_ORDER: {
    title: "Invalid Opened Order",
    message: "This order is currently not opened.",
  },
  INVALID_ACTIVE_ORDER: {
    title: "Invalid Active Order",
    message: "This order is currently not active.",
  },
  ORDER_CLOSING_FAILED: {
    title: "Order Closing Failed",
    message: "Failed to close this order. Please try again.",
  },
  ORDER_CLOSE_SUCCESS: {
    title: "Order Closed Successfully",
    message: "The order was closed successfully.",
  },


  //--------------------------------------------------------------
  //--------------- user wallet ---------------------
  //-------------------------------------------------------------
  WALLET_NOT_FOUND: {
    title: "User wallet not found",
    message: "The specified wallet is invalid or unauthorised.",
  },
  WALLET_NOT_AUTHORIZED: {
    title: "Unauthorized wallet",
    message: "This wallet is not authorized to perform this action.",
  },
  INVALID_WALLET_COUNT: {
    title: "Registration Failed",
    message: "Please enter a valid number of wallets to create.",
  },
  WALLET_LIMIT_EXCEEDED: {
    title: "Wallet Limit Exceeded",
    message: "You have reached the maximum number of wallets allowed. Upgrade tier",
  },
  EVM_WALLET_LIMIT_EXCEEDED: {
    title: "EVM Wallet Limit Exceeded",
    message: "You have reached the maximum number of EVM wallets allowed. Upgrade tier",
  },
  WALLET_CREATION_FAILED: {
    title: "Creation Failed",
    message: "We couldn’t generate new wallets.",
  },
  INVALID_WITHDRAW_AMOUNT: {
    title: "Invalid Withdraw Amount",
    message: "Please enter a valid withdraw amount",
  },
  WITHDRAW_TX_FAILED: {
    title: "Withdrawal Failed",
    message: "We couldn't process your withdrawal",
  },
  //---------------- perp exchange -----------
  EXCHANGE_WALLET_NOT_APPROVED: {
    title: 'Exchange not approved',
    message: "Your perp dex exchange not approved by your wallet"
  },
  PERP_DEPOSIT_FAILED: {
    title: "Perpetual exchange deposit failed",
    message: "We couldn't process your deposit"
  },
  MINIMUM_PERP_DEPOSIT_REQUIRED: {
    title: "Perp minimum deposit",
    message: "Perpetual deposit amount is too low"
  },
  PERP_WITHDRAW_FAILED: {
    title: "Perpetual withdraw failed",
    message: "We couldn't process your withdrawal"
  },
  MINIMUM_PERP_WITHDRAW_REQUIRED: {
    title: "Perp minimum withdraw",
    message: "Perpetual withdraw amount is too low"
  },

  API_FAILED: {
    title: "Connection Failed",
    message: "Unable to reach the server. Please refresh and try again.",
  },
  TX_FAILED: {
    title: "Transaction Failed",
    message: "The on‑chain transaction could not be completed.",
  },


  //-----------------------------------------------------------------------
  //------------------------ Authentication & Session --------------------
  //-----------------------------------------------------------------------
  USER_REJECTED_SIGNATURE: {
    title: "Signature Rejected",
    message: "You declined the signature request.",
  },
  SIGNATURE_FAILED: {
    title: "Signature Failed",
    message: "We couldn’t sign the message. Please try again.",
  },
  NO_TOKEN_FOUND: {
    title: "Authentication Required",
    message: "Please connect your account or join the platform.",
  },
  ACCOUNT_NOT_FOUND_IN_STORAGE: {
    title: "Session Error",
    message: "Account data is missing. Please reconnect your wallet.",
  },
  DEPOSIT_FIRST: {
    title: "Deposit Required",
    message:
      "You need to deposit funds first. If you already have, wait a moment for confirmation.",
  },
  ALREADY_APPROVED: {
    title: "Already Approved",
    message: "This agent has already been approved.",
  },
  AGENT_APPROVED: {
    title: "Agent Approved",
    message: "The agent was approved successfully. Please refresh.",
  },
  INSUFFICIENT_DEX_BALANCE_FOR_AGENT: {
    title: "Deposit Required",
    message:
      "You need to deposit funds first. If you already have, wait a moment for confirmation.",
  },

  TOKEN_EXPIRED: {
    title: "Session Expired",
    message: "Your session has expired. Please sign in again.",
  },
  INVALID_AUTH_TOKEN: {
    title: "Invalid Session",
    message: "Unauthorized connection. Please sign in again.",
  },
  INVALID_TOKEN: {
    title: "Invalid Token",
    message: "The provided token is invalid.",
  },
  TOKEN_DECRYPTION_FAILED: {
    title: "Security Error",
    message: "Failed to decrypt your session. Please clear your cache and retry.",
  },
  SIGNATURE_AUTHENTICATION_FAILED: {
    title: "Security Error",
    message: "Signature authentication failed. Please refresh and try again.",
  },
  INVALID_TOKEN_FORMAT: {
    title: "Data Error",
    message: "Session data is corrupted. Please re‑authenticate.",
  },
  INVALID_SIGNATURE: {
    title: "Verification Failed",
    message: "The wallet signature doesn’t match your stored account.",
  },

  // --- User Status ---
  BLOCKED_USER: {
    title: "Account Suspended",
    message: "Your account has been blocked. Please contact support.",
  },
  INVALID_USER: {
    title: "Unauthorized",
    message: "You don’t have permission to perform this action.",
  },
  SUCCESSFULLY_CONNECTED: {
    title: "Welcome Back",
    message: "You have successfully signed in.",
  },
  LOGIN_SUCCESS: {
    title: "Login Successful",
    message: "Welcome to the platform.",
  },

  // --- Registration & Invites ---


  UNAUTHORIZED_ACCOUNT: {
    title: "Access Denied",
    message: "This account cannot be used to join.",
  },
  INVALID_INVITER: {
    title: "Invalid Inviter",
    message: "The inviter information could not be verified.",
  },
  INVALID_INVITATION_CODE: {
    title: "Invalid Code",
    message: "The invitation code is invalid or has expired.",
  },
  INVALID_INVITATION_SENDER_ADDRESS: {
    title: "Invalid Code",
    message: "The invitation sender address is not valid.",
  },
  INVALID_STATUS: {
    title: "Invalid Status",
    message: "The invitation status is incorrect.",
  },
  EXPIRATION_MUST_BE_FUTURE: {
    title: "Registration Failed",
    message: "The invitation expiry date must be in the future.",
  },

  WALLET_GENERATE_FAILED: {
    title: "Registration Failed",
    message: "We couldn’t generate the wallets. Please try again.",
  },
  INVALID_AMOUNT: {
    title: "Registration Failed",
    message: "Please enter a valid amount.",
  },

  CODE_NOT_FOUND: {
    title: "Invitation Not Found",
    message: "The invitation code does not exist.",
  },
  JOINING_FAILED: {
    title: "Registration Failed",
    message: "We couldn’t create your account. Please try again.",
  },
  DISCONNECT_USER: {
    title: "Disconnect First",
    message: "Please disconnect the existing user before joining with a new one.",
  },
  JOIN_SUCCESS: {
    title: "Welcome!",
    message: "Your account was created successfully.",
  },

  // --- Features (Withdraw/Wallets) ---
  WITHDRAW_SUCCESS: {
    title: "Success",
    message: "Your withdrawal has been initiated.",
  },
  WITHDRAW_FAILED: {
    title: "Withdrawal Failed",
    message: "Could not complete the withdrawal. Check your balance and try again.",
  },
  WALLET_CREATION_SUCCESS: {
    title: "Success",
    message: "New wallets were generated successfully.",
  },

  INVITATION_CREATED_SUCCESS: {
    title: "Code Created",
    message: "Invitation code generated successfully.",
  },
  INVITATION_CREATION_FAILED: {
    title: "Creation Failed",
    message: "Could not generate the invitation code.",
  },
  INVITATION_REMOVED_SUCCESS: {
    title: "Code Removed",
    message: "Invitation code deleted successfully.",
  },
  INVITATION_REMOVE_FAILED: {
    title: "Deletion Failed",
    message: "Could not remove the invitation code.",
  },
  WALLET_COUNT_EXCEED: {
    title: "Wallet Limit Reached",
    message: "You have reached the maximum number of wallets for your tier.",
  },
  UNSUPPORTED_USER_INVITE: {
    title: "Cannot Invite",
    message: "Your current tier does not support invitations.",
  },

  // --- Token Addition ---
  TOKEN_ADDED_SUCCESS: {
    title: "Success",
    message: "Spot asset added successfully.",
  },
  TOKEN_REMOVED_SUCCESS: {
    title: "Success",
    message: "Spot asset removed successfully.",
  },
  TOKEN_ALREADY_ADDED: {
    title: "Already Added",
    message: "This spot asset is already in your whitelist.",
  },
  MAX_EXCEED_ASSET_ACCESS: {
    title: "Asset Limit Exceeded",
    message: "You have reached the maximum number of spot assets.",
  },
  MAX_ACCED_ASSET_ACCESS: {
    title: "Asset Limit Exceeded",
    message: "This spot asset exceeds your tier’s limit.",
  },

  // --- Order Creation ---
  INVALID_EST_ORDERS: {
    title: "Invalid Orders",
    message: "The estimated orders are not valid.",
  },
  USER_NOT_ELIGIBLE: {
    title: "Not Eligible",
    message: "You are not eligible for this order type.",
  },
  TOKEN_NOT_ADDED: {
    title: "Unsupported Token",
    message: "This token is not supported for order creation.",
  },

  MINIMUM_USD_COLLATERAL_REQUIRED: {
    title: "Collateral Error",
    message: "The minimum collateral amount is required.",
  },
  COLLATERAL_MUST_BE_STABLE_TOKEN: {
    title: "Collateral Error",
    message: "Collateral must be a stable token for this order.",
  },

  INSUFFICIENT_WALLET_FOUND: {
    title: "Insufficient Wallet",
    message: "Not enough wallets available to place the order.",
  },
  INVALID_WALLETS: {
    title: "Invalid Wallet",
    message: "The selected wallet is not valid for this order.",
  },




  INVALID_NETWORK: {
    title: "Invalid Network",
    message: "The selected network is invalid.",
  },
  UNSUPPORTED_NETWORK: {
    title: "Unsupported Network",
    message: "This network is not supported.",
  },

  ORDER_CLOSE_FAILED: {
    title: "Close Failed",
    message: "We could not close the order.",
  },
  ORDER_CLOSED_SUCCESS: {
    title: "Success",
    message: "Order closed successfully.",
  },
  ORDER_DELETE_SUCCESS: {
    title: "Success",
    message: "Order deleted successfully.",
  },
  ORDER_FETCH_SUCCESS: {
    title: "Success",
    message: "Orders fetched successfully.",
  },

  // --- Additional fallback ---
  UNKNOWN_ERROR: {
    title: "Something Went Wrong",
    message: "An unexpected error occurred. Please try again later.",
  },
};