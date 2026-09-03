import { create } from 'zustand';
import { UserType, ActivityType, WalletType } from '@/type/common';
import { OrderType } from '@/type/order';


export const store = create((set) => ({
    network: 42161,
    setNetwork: (network: number) => set({ network }),
    signature: null,
    setSignature: (signature: string) => set({ signature }),
    userTokens: [],
    setUserTokens: (userTokens: string[]) => set({ userTokens }),
    userOrders: [],
    setUserOrders: (userOrders: OrderType[]) => set({ userOrders }),
    user: {},
    setUser: (user: UserType) => set({ user }),
    userWallets: [],
    setUserWallets: (userWallets: WalletType[]) => set({ userWallets }),
    userHistories: [],
    setUserHistories: (userHistories: ActivityType[]) => set({ userHistories }),
    isConnected: false,
    setIsConnected: (isConnected: boolean) => set({ isConnected }),
    userConnectedWallet: '',
    setUserConnectedWallet: (userConnectedWallet: string) => set({ userConnectedWallet }),
    systemInfo: {
        advancedAlgoPerpSymbols: ["BTC"],
        minimumOrderSize: 5,
        maxGridNumber: 3,
        perpMinimumUsdcDeposit: 10,
        perpDepositToken: "0xaf88d065e77c8cC2239327C5EDb3A432268e5831",
        perpDepositChain: 42161,
        userLevels: {}
    },
    setSystemInfo: (systemInfo: any) => set({ systemInfo })
}))

export const useStore = store;