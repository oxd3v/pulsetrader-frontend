// ============================================================
//  common.ts – corrected to match Mongoose schemas
// ============================================================

// ---------- User (user.js) ----------
export type UserType = {
    _id: string;
    account: string;
    inviter?: string | null;              // ObjectId as string
    invites?: string[];                   // array of ObjectId strings
    status: string;                       // default: 'silver'
    statusTimeline: Date;                 // default: 0 (Date)
    isBlocked: boolean;                   // default: false
    blockReason: string;                  // default: ''
    invitationCodes: string[];
    createdAt: Date;
    updatedAt: Date;
};

// ---------- Wallet (wallet.js) ----------
export type WalletType = {
    _id: string;
    address: string;
    user: string;                         // ObjectId as string
    encryptedWalletKey: string;
    network: 'EVM' | 'SVM';
    isPerpAgentWallet: boolean;               // default: false
    agentDetails: {                       // default: []
        exchange: string;                   // 'asterdex' | 'hyperliquid' | 'binance' | 'bybit'
        isApproved?: boolean;               // default: false
        validTillAt?: number;               // default: 0
        agentWallet?: string;               // ObjectId as string, ref: Wallet
    }[];
    index?: number;
    name?: string;
    createdAt: Date;
    updatedAt: Date;
};

// ---------- Activity (activity.js) ----------
export type ActivityTokenDetails = {
    amount?: string;                      // default: '0'
    amountInUsd?: string;                 // default: '0'
    symbol: string;
    address: string;
    decimals?: number;
    networkId?: number;
};

export type ActivityFeeDetails = {
    decimals?: number;
    symbol?: string;
    amount?: string;
    amountInUsd?: string;
};

export type ActivityType = {
    _id: string;
    wallet: any;                       // ObjectId as string, ref: Wallet
    user: string;                         // ObjectId as string, ref: User
    order?: string;                       // ObjectId as string, ref: Order
    walletAddress: string;
    receiver?: string;
    status: string;
    receiveToken?: ActivityTokenDetails;
    payToken?: ActivityTokenDetails;
    txFee?: ActivityFeeDetails;
    indexToken?: string;
    details?: string;
    type: string;
    chainId: number;
    protocolFee?: ActivityTokenDetails;
    info?: any;
    mode?: 'Demo' | 'Live' | 'Testnet';
    txHash?: string;
    explorerUrl?: string;
    createdAt: Date;
    updatedAt: Date;
};