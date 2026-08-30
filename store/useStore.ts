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
}))

export const useStore = store;