import { ethers } from "ethers";
import { useEffect, useState, useCallback } from "react";
import toast from "react-hot-toast";

export const useWallet = () => {
  const [isMetaMaskInstalled, setIsMetaMaskInstalled] = useState(false);
  const [isMetamaskConnected, setIsMetamaskConnected] = useState(false);
  const [metamaskConnectedWallet, setMetamaskConnectedWallet] = useState("");
  const [connectedNetwork, setConnectedNetwork] = useState<number>(0);
  const [metamaskSigner, setMetamaskSigner] = useState<ethers.Signer | null>(
    null,
  );

  // Helper: Check if MetaMask is injected
  const checkMetaMaskInstalled = useCallback(() => {
    return typeof window !== "undefined" && !!window.ethereum;
  }, []);

  // Core: Sync state with MetaMask
  const handleMetamask = useCallback(async () => {
    const isInstalled = checkMetaMaskInstalled();
    setIsMetaMaskInstalled(isInstalled);

    if (!isInstalled) {
      setIsMetamaskConnected(false);
      return;
    }

    try {
      const provider = new ethers.BrowserProvider(window.ethereum);

      // Check if we are authorized without triggering a popup
      const accounts = await provider.listAccounts();

      if (accounts.length === 0) {
        // Not connected
        setIsMetamaskConnected(false);
        setMetamaskConnectedWallet("");
        setMetamaskSigner(null);
        setConnectedNetwork(0);
        return;
      }

      // Connected: Get details
      const signer = await provider.getSigner();
      const address = await signer.getAddress();
      const network = await provider.getNetwork();

      setConnectedNetwork(Number(network.chainId));
      setMetamaskConnectedWallet(address.toLowerCase());
      setIsMetamaskConnected(true);
      setMetamaskSigner(signer);
    } catch (error) {
      //console.error("MetaMask sync error:", error);
      setIsMetamaskConnected(false);
      setMetamaskConnectedWallet("");
      setMetamaskSigner(null);
    }
  }, [checkMetaMaskInstalled]);

  // Action: Trigger Wallet Connection Popup
  const connectToMetamask = async () => {
    if (!checkMetaMaskInstalled()) {
      toast.error("MetaMask is not installed");
      return;
    }

    try {
      await window.ethereum.request({
        method: "eth_requestAccounts",
      });
      // State will update via the 'accountsChanged' listener or manual re-check
      await handleMetamask();
    } catch (error: any) {
      //console.error("Connection error:", error);
      if (error.code === 4001) {
        toast.error("Connection rejected by user");
      } else if (
        error.message &&
        error.message.includes("Already processing")
      ) {
        toast.error("Request already pending. Please check your wallet.");
      } else {
        toast.error("Failed to connect wallet");
      }
      throw error;
    }
  };

  // Action: Switch Network
  const handleSwitchNetwork = async (chainId: number) => {
    if (!checkMetaMaskInstalled())
      return { switchSuccess: false, error: "No wallet" };

    try {
      await window.ethereum.request({
        method: "wallet_switchEthereumChain",
        params: [{ chainId: "0x" + chainId.toString(16) }],
      });
      await handleMetamask();
      return { switchSuccess: true, error: "" };
    } catch (err: any) {
      // Error code 4902 means the chain has not been added to MetaMask
      if (err.code === 4902) {
        toast.error("Network not added to wallet");
      }
      return {
        switchSuccess: false,
        error: err.message || "Network switch failed",
      };
    }
  };

  // Setup Listeners on Mount
  useEffect(() => {
    handleMetamask(); // Initial check

    if (typeof window !== "undefined" && window.ethereum) {
      // Listen for account changes (user switches account in wallet)
      window.ethereum.on("accountsChanged", handleMetamask);
      // Listen for chain changes (user switches network)
      window.ethereum.on("chainChanged", () => window.location.reload());
    }

    return () => {
      if (typeof window !== "undefined" && window.ethereum) {
        window.ethereum.removeListener("accountsChanged", handleMetamask);
      }
    };
  }, [handleMetamask]);

  return {
    isMetaMaskInstalled,
    isMetamaskConnected,
    metamaskConnectedWallet,
    connectedNetwork,
    metamaskSigner,
    connectToMetamask,
    handleSwitchNetwork,
  };
};
