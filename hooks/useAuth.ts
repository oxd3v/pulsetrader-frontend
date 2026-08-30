// @/hooks/useAuth.ts
import { useCallback } from "react";
import { useStore } from "@/store/useStore";
import { useShallow } from "zustand/shallow";
import Service from "@/service/user-service";
import toast from "react-hot-toast";
import { ethers, verifyMessage } from "ethers";

// Libs
import { decodeText, } from "@/lib/crypto-encryption/encryption";
import { encryptAuthToken } from "@/lib/crypto-encryption/authToken";

// Config
import {
  TOKEN_STORAGE_KEY,
  ACCOUNT_STORAGE_KEY,
  SIGN_MESSAGE,
} from "@/constants/config/enviroments";

import {
  handleServerErrorToast,
  notifyWithResponseError,
  notify,
  notifyFromApiError,
} from "@/lib/utils";

export const useUserAuth = () => {
  const {
    isConnected,
    setUser,
    setUserOrders,
    setUserWallets,
    setUserHistories,
    setIsConnected,
    setSignature,
  } = useStore(
    useShallow((state: any) => ({
      isConnected: state.isConnected,
      setUser: state.setUser,
      setUserOrders: state.setUserOrders,
      setUserWallets: state.setUserWallets,
      setUserHistories: state.setUserHistories,
      setIsConnected: state.setIsConnected,
      setSignature: state.setSignature,
    })),
  );

  const setUserState = (userData: any) => {
    setUser({
      account: userData?.account || "",
      status: userData?.status || "silver",
      invites: userData?.invites || [],
      inviter: userData?.inviter || "",
      invitationCodes: userData?.invitationCodes || [],
      isBlocked: userData?.isBlocked || false,
      assetes: userData?.assets || [],
    });
  };

  // --- Internal Helper: Update Global State ---
  const updateGlobalUserState = useCallback(
    (user: any) => {
      if (!user) return;
      setUserState(user.userData);
      setUserOrders(Array.isArray(user.orders) ? user.orders : []);
      setUserWallets(Array.isArray(user.wallets) ? user.wallets : []);
      setIsConnected(true);

      if (user.userData?.account) {
        localStorage.setItem(ACCOUNT_STORAGE_KEY, user.userData.account);
      }
    },
    [setUser, setUserOrders, setUserWallets, setIsConnected],
  );

  // --- Internal Helper: Get Fresh Signer ---
  const getSigner = useCallback(async () => {
    if (typeof window === "undefined" || !window.ethereum) return null;
    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      return signer;
    } catch {
      return null;
    }
  }, []);

  // --- 1. Check User Session (Auto-Login) ---
  const checkUser = useCallback(async () => {
    const checkResult = { connected: false, error: null as string | null };

    try {
      const signer = await getSigner();
      if (!signer) {
        notifyWithResponseError("error", "Please connect your wallet");
        checkResult.error = "WALLET_NOT_CONNECTED";
        return checkResult;
      }

      const address = await signer.getAddress();
      const signature = localStorage.getItem(TOKEN_STORAGE_KEY);
      if (!signature) {
        notifyWithResponseError("error", "Session expired. Please reconnect.");
        checkResult.error = "SESSION_EXPIRED";
        return checkResult;
      }




      try {
        const recoveredAddress = verifyMessage(SIGN_MESSAGE, signature);
        if (recoveredAddress.toLowerCase() !== address.toLowerCase()) {
          throw new Error("Invalid signature");
        }
        setSignature(signature);
      } catch {
        notifyWithResponseError("error", "Invalid session. Please reconnect.");
        localStorage.removeItem(TOKEN_STORAGE_KEY);
        checkResult.error = "INVALID_SESSION";
        return checkResult;
      }

      const encryptedToken = await encryptAuthToken(signature);
      if (!encryptedToken) {
        notifyFromApiError("SIGNATURE_AUTHENTICATION_FAILED");
        checkResult.error = "SIGNATURE_AUTHENTICATION_FAILED";
        return checkResult;
      }

      const apiResponse = await Service.checkUser({ address, encryptedToken });

      if (!apiResponse?.connect || !apiResponse?.data?.userData?.account) {
        const key = apiResponse?.message || "USER_NOT_FOUND";
        notifyFromApiError(key); // now uses config message
        checkResult.error = key;
        return checkResult;
      }

      if (apiResponse.data?.userData?.isBlocked === true) {
        notifyWithResponseError(
          "error",
          apiResponse.data?.userData?.blockedReason || "User blocked",
        );
        checkResult.error = "BLOCKED_USER";
        return checkResult;
      }

      updateGlobalUserState(apiResponse.data);
      checkResult.connected = true;
      return checkResult;
    } catch (error: any) {
      const key = handleServerErrorToast({ err: error });
      checkResult.error = key;
      return checkResult;
    }
  }, [getSigner, setSignature, updateGlobalUserState]);

  // --- 2. Connect (Login with Wallet) ---
  const connect = useCallback(async () => {
    const connectionResult = { connection: false, error: null as string | null };

    const signer = await getSigner();
    if (!signer) {
      notifyFromApiError("WALLET_NOT_CONNECTED");
      connectionResult.error = "WALLET_NOT_CONNECTED";
      return connectionResult;
    }

    try {
      const address = (await signer.getAddress()).toLowerCase();

      const toastId = toast.loading("Please sign the login request...");
      const signature = await signer.signMessage(SIGN_MESSAGE);
      toast.dismiss(toastId);

      if (!signature) {
        notifyFromApiError("SIGNATURE_FAILED");
        connectionResult.error = "SIGNATURE_FAILED";
        return connectionResult;
      }

      const encryptedToken = await encryptAuthToken(signature);
      if (!encryptedToken) {
        notifyFromApiError("SIGNATURE_AUTHENTICATION_FAILED");
        connectionResult.error = "SIGNATURE_AUTHENTICATION_FAILED";
        return connectionResult;
      }

      const apiResponse = await Service.connect({
        account: address,
        encryptedToken,
      });

      if (!apiResponse?.connect || !apiResponse?.data?.userData?.account) {
        const key = apiResponse?.message || "SERVER_ERROR";
        notifyFromApiError(key);
        connectionResult.error = key;
        return connectionResult;
      }

      if (apiResponse.data?.userData?.isBlocked === true) {
        notifyWithResponseError(
          "error",
          apiResponse.data?.userData?.blockedReason || "User blocked",
        );
        connectionResult.error = "BLOCKED_USER";
        return connectionResult;
      }

      localStorage.setItem(TOKEN_STORAGE_KEY, signature);
      localStorage.setItem(ACCOUNT_STORAGE_KEY, address);
      setSignature(signature);
      updateGlobalUserState(apiResponse.data);
      notify("success", "LOGIN_SUCCESS");
      connectionResult.connection = true;
      return connectionResult;
    } catch (error: any) {
      const key = handleServerErrorToast({ err: error });
      connectionResult.error = key;
      return connectionResult;
    }
  }, [getSigner, setSignature, updateGlobalUserState]);

  // --- 3. Connect by Auth Token (Manual) ---
  const connectByToken = useCallback(
    async (authToken: string) => {
      const connectionResult = {
        connection: false,
        error: null as string | null,
      };

      try {
        const decodedStr = decodeText(authToken);
        const payload = JSON.parse(decodedStr);
        const { address, signature, expireAt } = payload;

        if (!address || !signature || !expireAt) {
          notifyFromApiError("INVALID_TOKEN_FORMAT");
          connectionResult.error = "INVALID_TOKEN_FORMAT";
          return connectionResult;
        }

        if (Date.now() > expireAt) {
          notifyFromApiError("TOKEN_EXPIRED");
          connectionResult.error = "TOKEN_EXPIRED";
          return connectionResult;
        }

        const recovered = verifyMessage(SIGN_MESSAGE, signature);
        if (recovered.toLowerCase() !== address.toLowerCase()) {
          notifyFromApiError("INVALID_SIGNATURE");
          connectionResult.error = "INVALID_SIGNATURE";
          return connectionResult;
        }

        const encryptedToken = await encryptAuthToken(signature);
        if (!encryptedToken) {
          notifyFromApiError("SIGNATURE_AUTHENTICATION_FAILED");
          connectionResult.error = "SIGNATURE_AUTHENTICATION_FAILED";
          return connectionResult;
        }

        const apiResponse = await Service.connect({
          account: address,
          encryptedToken,
        });

        if (!apiResponse?.connect || !apiResponse?.data?.userData?.account) {
          const key = apiResponse?.message || "SERVER_ERROR";
          notifyFromApiError(key);
          connectionResult.error = key;
          return connectionResult;
        }

        if (apiResponse.data?.userData?.isBlocked) {
          notifyWithResponseError(
            "error",
            apiResponse.data?.userData?.blockedReason || "User blocked",
          );
          connectionResult.error = "BLOCKED_USER";
          return connectionResult;
        }

        localStorage.setItem(ACCOUNT_STORAGE_KEY, address);
        setSignature(signature);
        updateGlobalUserState(apiResponse.data);
        notify("success", "SUCCESSFULLY_CONNECTED");
        connectionResult.connection = true;
        return connectionResult;
      } catch (error: any) {
        const key = handleServerErrorToast({ err: error });
        connectionResult.error = key;
        return connectionResult;
      }
    },
    [setSignature, updateGlobalUserState],
  );

  // --- 4. Join (Register) ---
  const join = useCallback(
    async ({
      account,
      signUpMethod,
      invitationCode,
    }: {
      account: string;
      signUpMethod: string;
      invitationCode?: string;
    }) => {
      const joinedResult = { joined: false, error: null as string | null };

      if (isConnected) {
        notifyFromApiError("DISCONNECT_USER");
        joinedResult.error = "DISCONNECT_USER";
        return joinedResult;
      }

      const signer = await getSigner();
      if (!signer) {
        notifyFromApiError("WALLET_NOT_CONNECTED");
        joinedResult.error = "WALLET_NOT_CONNECTED";
        return joinedResult;
      }

      const address = (await signer.getAddress()).toLowerCase();

      const toastId = toast.loading("Signing registration request...");
      const signature = await signer.signMessage(SIGN_MESSAGE);
      toast.dismiss(toastId);

      if (!signature) {
        notifyFromApiError("SIGNATURE_FAILED");
        joinedResult.error = "SIGNATURE_FAILED";
        return joinedResult;
      }

      const encryptedToken = await encryptAuthToken(signature);
      if (!encryptedToken) {
        notifyFromApiError("SIGNATURE_AUTHENTICATION_FAILED");
        joinedResult.error = "SIGNATURE_AUTHENTICATION_FAILED";
        return joinedResult;
      }

      try {
        const apiResponse = await Service.joinUser({
          account: account || address,
          signUpMethod,
          invitationCode,
          encryptedToken,
        });

        if (!apiResponse.joined || !apiResponse?.data?.userData?.account) {
          localStorage.removeItem(TOKEN_STORAGE_KEY);
          const key = apiResponse?.message || "SERVER_ERROR";
          notifyFromApiError(key);
          joinedResult.error = key;
          return joinedResult;
        }

        localStorage.setItem(TOKEN_STORAGE_KEY, signature);
        localStorage.setItem(ACCOUNT_STORAGE_KEY, account);
        setSignature(signature);
        updateGlobalUserState(apiResponse.data);
        notify("success", "JOIN_SUCCESS");
        joinedResult.joined = true;
        return joinedResult;
      } catch (error: any) {
        localStorage.removeItem(TOKEN_STORAGE_KEY);
        const key = handleServerErrorToast({ err: error });
        joinedResult.error = key;
        return joinedResult;
      }
    },
    [getSigner, isConnected, setSignature, updateGlobalUserState],
  );

  // --- 5. Withdraw Balance ---
  const withdrawBalance = useCallback(
    async ({
      receiver,
      tokenAddress,
      chainId,
      value,
      walletAddress,
      tokenDecimals,
      tokenSymbol,
    }: {
      receiver: string;
      tokenAddress: string;
      chainId: number;
      value: string;
      walletAddress: string;
      tokenDecimals: number;
      tokenSymbol: string;
    }) => {
      const withdrawResult = {
        success: false,
        signature: null,
        fee: null,
        error: null as string | null,
      };

      if (!receiver) {
        notifyWithResponseError("error", "Receiver address required");
        withdrawResult.error = "INVALID_RECEIVER";
        return withdrawResult;
      }
      if (!value || Number(value) <= 0) {
        notifyWithResponseError("error", "Enter a valid amount");
        withdrawResult.error = "INVALID_WITHDRAW_AMOUNT";
        return withdrawResult;
      }
      if (!tokenAddress) {
        notifyWithResponseError("error", "Invalid token address");
        withdrawResult.error = "INVALID_WITHDRAW_ASSET_ADDRESS";
        return withdrawResult;
      }

      try {
        const apiResponse = await Service.withdraw({
          receiver,
          tokenAddress,
          chainId,
          value,
          walletAddress,
          tokenDecimals,
          tokenSymbol,
        });

        if (!apiResponse.success || !apiResponse?.data?.signature) {
          const key = apiResponse?.message || "SERVER_ERROR";
          notifyFromApiError(key);
          withdrawResult.error = key;
          return withdrawResult;
        }

        notify("success", "WITHDRAW_SUCCESS");
        withdrawResult.success = true;
        withdrawResult.signature = apiResponse.data.signature;
        return withdrawResult;
      } catch (error: any) {
        const key = handleServerErrorToast({ err: error });
        withdrawResult.error = key;
        return withdrawResult;
      }
    },
    [],
  );

  // --- 6. Create Wallets ---
  const createNewWallet = useCallback(
    async ({ evmWallets, svmWallets }: { evmWallets: number; svmWallets: number }) => {
      const creationResult = { created: false, error: null as string | null };
      try {
        const apiResponse = await Service.createNewWallet({ evmWallets, svmWallets });
        if (!apiResponse.success) {
          const key = apiResponse?.message || "SERVER_ERROR";
          notifyFromApiError(key);
          creationResult.error = key;
          return creationResult;
        }

        notify("success", "WALLET_CREATION_SUCCESS");
        creationResult.created = true;
        if (apiResponse?.data?.wallets) {
          setUserWallets(apiResponse.data.wallets);
        } else {
          notifyWithResponseError("success", "Network congested. Refresh the page.");
        }
        return creationResult;
      } catch (error: any) {
        const key = handleServerErrorToast({ err: error });
        creationResult.error = key;
        return creationResult;
      }
    },
    [setUserWallets],
  );

  // --- 7. Invitation Codes ---
  const createInvitationCode = useCallback(
    async ({ expireAt, invitedTo }: { expireAt: number; invitedTo: string }) => {
      const creationResult = { created: false, code: null, error: null as string | null };
      if (!invitedTo) {
        notifyWithResponseError("error", "Enter a valid invitation receiver");
        creationResult.error = "INVALID_INVITED_TO";
        return creationResult;
      }
      try {
        const apiResponse = await Service.createInvitationCode({
          invitedTo,
          expireAt,
          status: "silver",
        });
        if (!apiResponse.success || !apiResponse?.data?.code) {
          const key = apiResponse?.message || "SERVER_ERROR";
          notifyFromApiError(key);
          creationResult.error = key;
          return creationResult;
        }

        if (apiResponse.data.userData) {
          setUserState(apiResponse.data.userData);
        }

        notify("success", "INVITATION_CREATED_SUCCESS");
        creationResult.code = apiResponse.data.code;
        creationResult.created = true;
        return creationResult;
      } catch (error: any) {
        const key = handleServerErrorToast({ err: error });
        creationResult.error = key;
        return creationResult;
      }
    },
    [],
  );

  const removeInvitationCode = useCallback(
    async (code: string) => {
      const removeResult = { removed: false, error: null as string | null };
      if (!code) {
        notifyWithResponseError("error", "Invitation code required");
        removeResult.error = "INVITATION_CODE_NOT_FOUND";
        return removeResult;
      }
      try {
        const apiResponse = await Service.deleteInvitationCode({ code });
        if (!apiResponse.success) {
          const key = apiResponse?.message || "SERVER_ERROR";
          notifyFromApiError(key);
          removeResult.error = key;
          return removeResult;
        }

        notify("success", "INVITATION_REMOVED_SUCCESS");
        if (apiResponse.data.userData) {
          setUserState(apiResponse.data.userData);
        }
        removeResult.removed = true;
        return removeResult;
      } catch (error: any) {
        const key = handleServerErrorToast({ err: error });
        removeResult.error = key;
        return removeResult;
      }
    },
    [],
  );

  // --- 8. Private Key ---
  const getPrivateKey = async (walletAddress: string) => {
    const decryptionResult = { decrypted: false, key: null, error: null as string | null };
    try {
      const apiResponse = await Service.getEncryptedPrivateKey({ walletAddress });
      if (!apiResponse.success || !apiResponse?.data?.key) {
        const key = apiResponse?.message || "SERVER_ERROR";
        notifyFromApiError(key);
        decryptionResult.error = key;
        return decryptionResult;
      }
      decryptionResult.decrypted = true;
      decryptionResult.key = apiResponse.data.key;
      return decryptionResult;
    } catch (error: any) {
      const key = handleServerErrorToast({ err: error });
      decryptionResult.error = key;
      return decryptionResult;
    }
  };

  // --- 9. User History ---
  const getUserHistory = async ({
    page,
    limit = 50,
    walletAddress,
    walletId,
  }: {
    page: number;
    limit: number;
    walletAddress: string;
    walletId: string;
  }) => {
    const historiesResult = { success: false, histories: null, error: null as string | null };
    try {
      const apiResponse = await Service.getUserHistories({ page, limit, walletAddress, walletId });
      if (!apiResponse.success || !apiResponse?.data?.histories) {
        const key = apiResponse?.message || "SERVER_ERROR";
        notifyFromApiError(key);
        historiesResult.error = key;
        return historiesResult;
      }
      historiesResult.success = true;
      historiesResult.histories = apiResponse.data.histories;
      return historiesResult;
    } catch (error: any) {
      const key = handleServerErrorToast({ err: error });
      historiesResult.error = key;
      return historiesResult;
    }
  };

  // --- 10. Disconnect ---
  const disconnect = useCallback(async () => {
    const disconnectResult = { disconnect: false, error: null as string | null };
    try {
      const apiResponse = await Service.disconnect({});
      if (!apiResponse.disconnect) {
        const key = apiResponse?.message || "SERVER_ERROR";
        notifyFromApiError(key);
        disconnectResult.error = key;
        return disconnectResult;
      }

      setIsConnected(false);
      setSignature("");
      setUser({});
      setUserHistories([]);
      setUserWallets([]);
      localStorage.removeItem(TOKEN_STORAGE_KEY);
      localStorage.removeItem(ACCOUNT_STORAGE_KEY);
      notifyWithResponseError("success", "Disconnected successfully");
      disconnectResult.disconnect = true;
      return disconnectResult;
    } catch (error: any) {
      const key = handleServerErrorToast({ err: error });
      disconnectResult.error = key;
      return disconnectResult;
    }
  }, [setIsConnected, setSignature, setUser, setUserHistories, setUserWallets]);

  return {
    checkUser,
    connectUserByWallet: connect,
    connectUserByAuth: connectByToken,
    joinUser: join,
    withdrawBalance,
    createNewWallet,
    createInvitationCode,
    removeInvitationCode,
    disconnect,
    connectByToken,
    getPrivateKey,
    getUserHistory,
  };
};