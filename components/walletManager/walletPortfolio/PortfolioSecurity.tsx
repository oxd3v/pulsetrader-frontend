'use client'
//store
import { useStore } from "@/store/useStore";
import { useShallow } from "zustand/shallow";

import PortfolioMain from "@/components/walletManager/walletPortfolio/PortfolioMain";
import SecuredPageWarning from "@/components/Error/SecurePageWarning"

export default function PortfolioSecurity() {
  const { network, setNetwork, user, userOrders, userWallets, userHistories, isConnected, userConnectedWallet, setUserOrders } = useStore(
    useShallow((state: any) => ({
      network: state.network,
      setNetwork: state.setNetwork,
      user: state.user,
      userOrders: state.userOrders,
      setUserOrders: state.setUserOrders,
      userHistories: state.userHistories,
      userWallets: state.userWallets,
      isConnected: state.isConnected,
      userConnectedWallet: state.userConnectedWallet
    }))
  );


  return (
    <div className="w-full h-full overflow-hidden">
      {isConnected && isConnected == true && userWallets && network ?
        <PortfolioMain chainId={network} setChainId={setNetwork} user={user} userOrders={userOrders} userWallets={userWallets} userHistories={userHistories} userConnectedWallet={userConnectedWallet} />
        : <SecuredPageWarning />}
    </div>
    //<div className="w-full h-full overflow-hidden"><PortfolioMain chainId={network} user={user} userOrders={userOrders} userWallets={userWallets} userHistories={userHistories} userConnectedWallet={userConnectedWallet}/></div>
  )
}