"use client";
import { useState, useEffect } from "react";
import Link from 'next/link';
import { useRouter } from "next/navigation";
import Image from "next/image";
import { useWallet } from "@/hooks/useWallet";
import { useUserAuth } from "@/hooks/useAuth";
import { getGladiatorStakeAmount } from "@/lib/blockchain/stake";
import { getStatus } from "@/constants/common/user";
import { toast } from "react-hot-toast";
import { isValidInvitationCode } from "@/utility/handy";
import { FiCheckCircle, FiLock } from "react-icons/fi";

export default function JoinBox({
  setIsJoining,
}: {
  setIsJoining: (value: boolean) => void;
}) {
  const {
    isMetaMaskInstalled,
    isMetamaskConnected,
    metamaskConnectedWallet,
    connectToMetamask,
  } = useWallet();
  const { joinUser } = useUserAuth();
  const router = useRouter();
  const [invitationCode, setInvitationCode] = useState("");
  const [criteriaApplied, setCriteriaApplied] = useState("INVITATION_CODE");
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [userStakeAmount, setUserStakeAmount] = useState("0");

  useEffect(() => {
    let mounted = true;
    if (isMetamaskConnected && metamaskConnectedWallet) {
      // Mock logic or actual contract call
      getGladiatorStakeAmount(metamaskConnectedWallet)
        .then((amount: any) => {
          if (!mounted) return;
          setUserStakeAmount(amount.toString());
          // Check if amount qualifies for a status (e.g. > 1000)
          const hasStatus = getStatus(Number(amount), "gladiator") != null;
          setCriteriaApplied(
            hasStatus ? "GLADIATOR_STAKE_43114" : "INVITATION_CODE",
          );
          setIsLoading(false);
        })
        .catch((e: any) => {
          //console.warn("Stake check failed (this is expected if not on correct chain)", e);
          if (mounted) setIsLoading(false);
        });
    } else {
      setIsLoading(false);
    }
    return () => {
      mounted = false;
    };
  }, [isMetamaskConnected, metamaskConnectedWallet]);

  const handleJoin = async () => {
    if (!isMetaMaskInstalled)
      return window.open("https://metamask.io/download/", "_blank");
    if (!isMetamaskConnected) {
      await connectToMetamask();
      return;
    }

    const trimmedCode = invitationCode.trim();
    if (!criteriaApplied && !isValidInvitationCode(trimmedCode)) {
      toast.error("Please enter a valid invitation code");
      return;
    }

    try {
      setIsSubmitting(true);
      let joiningResult: any = await joinUser({
        account: metamaskConnectedWallet,
        signUpMethod: criteriaApplied,
        invitationCode: trimmedCode,
      });
      if (joiningResult.joined == true) {
        setTimeout(() => router.push("/"), 2000);
      }
      // joinUser function handles success toast and state update
    } catch (err: any) {
    } finally {
      setIsSubmitting(false);
    }
  };

  const canJoin = criteriaApplied || isValidInvitationCode(invitationCode);

  // -- UI Helpers --
  const CardWrapper = ({
    children,
    title,
    subtitle,
  }: {
    children: React.ReactNode;
    title: string;
    subtitle: string;
  }) => (
    <div className="bg-white/80 dark:bg-[#161b22]/80 rounded-[32px] p-8 shadow-2xl border border-gray-100 dark:border-white/5 backdrop-blur-xl w-full">
      <div className="text-center mb-8">
        {/* <div className="inline-flex justify-center mb-6 p-4 bg-gray-50 dark:bg-white/5 rounded-2xl shadow-inner">
              <Image src={"/logo.svg"} alt="logo" width={42} height={42} className="w-10 h-10" />
          </div> */}
        <h1 className="text-2xl font-black text-gray-900 dark:text-white mb-2">
          {title}
        </h1>
        <p className="text-gray-500 dark:text-gray-400 text-sm font-medium">
          {subtitle}
        </p>
      </div>
      {children}
    </div>
  );

  const BackToLogin = () => (
    <p className="pt-4 text-center text-sm text-gray-500">
      <button
        onClick={() => setIsJoining(false)}
        className="text-blue-600 dark:text-blue-400 font-bold hover:underline transition-all"
      >
        I already have a connected account
      </button>
    </p>
  );

  // -- Render Logic --

  if (!isMetaMaskInstalled) {
    return (
      <CardWrapper
        title="MetaMask Required"
        subtitle="Please install MetaMask to continue"
      >
        <Link
          href="https://metamask.io/download/"
          target="_blank"
          className="w-full py-4 px-6 bg-orange-500 hover:bg-orange-600 text-white rounded-2xl font-bold flex justify-center items-center gap-2 shadow-lg shadow-orange-500/20"
        >
          Install MetaMask
        </Link>
        <BackToLogin />
      </CardWrapper>
    );
  }

  if (!isMetamaskConnected) {
    return (
      <CardWrapper
        title="Connect Wallet"
        subtitle="Link your wallet to verify eligibility"
      >
        <button
          onClick={connectToMetamask}
          className="w-full py-4 px-6 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-bold flex justify-center items-center gap-2 shadow-lg shadow-blue-500/20"
        >
          <img
            src="https://upload.wikimedia.org/wikipedia/commons/3/36/MetaMask_Fox.svg"
            className="w-6 h-6"
            alt="MetaMask"
          />
          Connect MetaMask
        </button>
        <BackToLogin />
      </CardWrapper>
    );
  }

  return (
    <CardWrapper
      title="Join CandleDex"
      subtitle="Complete registration to start trading"
    >
      <div className="space-y-4">
        {/* Eligibility Status Box */}
        {criteriaApplied == 'GLADIATOR_STAKE_43114' ? (
          <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl">
            <div className="flex items-start gap-3">
              <FiCheckCircle className="text-emerald-500 mt-1" size={20} />
              <div>
                <h3 className="font-bold text-emerald-600 dark:text-emerald-400 text-sm">
                  Eligibility Confirmed
                </h3>
                <div className="mt-1 flex items-center gap-2">
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    Stake:
                  </span>
                  <span className="text-xs font-mono font-bold text-gray-900 dark:text-white">
                    {Number(userStakeAmount).toFixed(2)} GLD
                  </span>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-2xl flex gap-3">
              <FiLock className="text-amber-500 mt-0.5 flex-shrink-0" />
              <div>
                <h3 className="text-sm font-bold text-amber-600 dark:text-amber-400">
                  Invitation Required
                </h3>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 leading-relaxed">
                  You do not have enough stake to join automatically. Please
                  enter a valid invitation code.
                </p>
              </div>
            </div>

            <div className="relative">
              <input
                type="text"
                value={invitationCode}
                placeholder="Enter Invitation Code"
                className={`w-full px-4 py-3.5 rounded-xl border bg-white dark:bg-[#0d1117] outline-none transition-all focus:ring-2 ${
                  isValidInvitationCode(invitationCode)
                    ? "border-green-500 focus:ring-green-500/20"
                    : invitationCode
                      ? "border-red-500 focus:ring-red-500/20"
                      : "border-gray-200 dark:border-white/10 focus:ring-blue-500/20"
                }`}
                onChange={(e) => setInvitationCode(e.target.value)}
              />
              {isValidInvitationCode(invitationCode) && (
                <FiCheckCircle className="absolute right-4 top-1/2 -translate-y-1/2 text-green-500" />
              )}
            </div>
          </div>
        )}

        {/* Action Button */}
        <button
          onClick={handleJoin}
          disabled={isSubmitting || isLoading || !canJoin}
          className="w-full py-4 px-6 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white rounded-2xl font-bold flex justify-center items-center gap-2 shadow-lg shadow-blue-500/20 transition-all active:scale-[0.98]"
        >
          {isSubmitting ? (
            <span className="flex items-center gap-2">
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              Creating Account...
            </span>
          ) : (
            <span>Create Account</span>
          )}
        </button>

        <BackToLogin />
      </div>
    </CardWrapper>
  );
}
