import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import {
  FiMoreVertical,
  FiCopy,
  FiLogOut,
  FiUser,
  FiChevronRight,
} from "react-icons/fi";

import ThemeToggle from "./ThemeToggle";
import { NAVBAR_ITEM_LIST } from "@/constants/common/frontend";

import { useUserAuth } from "@/hooks/useAuth";
import { useStore } from "@/store/useStore";
import { useShallow } from "zustand/shallow";

export default function NavbarRight({ pathname }: { pathname: any }) {
  const { disconnect, updateSystemInfo } = useUserAuth();
  const { user, isConnected } = useStore(
    useShallow((state: any) => ({
      user: state.user,
      isConnected: state.isConnected,
    }))
  );





  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const copyAddress = () => {
    if (user?.account) {
      navigator.clipboard.writeText(user.account);
      // You could add a toast notification here
    }
  };

  // Close dropdown on click outside
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  useEffect(() => {
    updateSystemInfo();
  }, [updateSystemInfo]);

  return (
    <div className="flex items-center gap-2 md:gap-4">
      {/* 1. Chain Selection */}
      {/* <div className="">
        <ChainSelection selectChain={network} setSelectChain={setNetwork} pathName={pathname}/>
      </div> */}

      {/* 2. Theme Toggle */}
      <ThemeToggle />

      {/* 3. Connected User Address */}
      {isConnected ? (
        <div
          onClick={copyAddress}
          className="group hidden sm:flex items-center h-10 px-3 gap-2 bg-gray-100 dark:bg-white/5 backdrop-blur-md border border-gray-200 dark:border-white/10 rounded-xl cursor-pointer hover:border-blue-400/50 transition-all active:scale-95"
        >
          <div className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
          </div>
          <span className="text-xs font-mono font-semibold text-gray-700 dark:text-gray-300">
            {user.account.slice(0, 4)}...{user.account.slice(-4)}
          </span>
          <FiCopy className="w-3 h-3 text-gray-400 group-hover:text-blue-500 transition-colors" />
        </div>
      ) : (
        <Link
          href="/connect"
          className="h-10 px-5 flex items-center justify-center bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-xl transition-all active:scale-95 shadow-lg shadow-blue-500/20"
        >
          Connect
        </Link>
      )}

      {/* 4. Three-dot Menu Dropdown */}
      <div className="relative" ref={menuRef}>
        <button
          onClick={() => setIsMenuOpen(!isMenuOpen)}
          className={`w-10 h-10 flex items-center justify-center rounded-xl transition-all active:scale-90 ${isMenuOpen
            ? "bg-blue-600 text-white shadow-lg shadow-blue-500/30"
            : "bg-gray-100 dark:bg-white/5 text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-white/10"
            }`}
        >
          <FiMoreVertical className="w-5 h-5" />
        </button>

        {isMenuOpen && (
          <div className="absolute right-0 mt-3 w-64 bg-white/80 dark:bg-[#0d1117]/90 backdrop-blur-xl border border-gray-200 dark:border-white/10 rounded-2xl shadow-2xl py-2 z-50 animate-in fade-in zoom-in-95 slide-in-from-top-2 duration-200">
            {/* Navigation Items */}
            <div className="px-2 pb-2">
              <p className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500">
                Menu
              </p>
              {NAVBAR_ITEM_LIST.map((item) => {
                const shouldShow = item.type === "public" || (item.type === "private" && isConnected) || (item.type === "onlyAdmin" && user?.status === "admin");
                if (!shouldShow) return null;

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setIsMenuOpen(false)}
                    className="group flex items-center justify-between px-3 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-blue-500 hover:text-white dark:hover:bg-blue-600 rounded-xl transition-all"
                  >
                    <span className="flex items-center gap-2">
                      {item.name}
                    </span>
                    {item.type === "private" ? (
                      <span className="text-[10px] bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-300 group-hover:bg-white/20 group-hover:text-white px-2 py-0.5 rounded-full font-bold">
                        PRO
                      </span>
                    ) : (
                      <FiChevronRight className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity" />
                    )}
                  </Link>
                );
              })}
            </div>

            {/* Wallet Section */}
            <div className="mt-1 pt-2 border-t border-gray-100 dark:border-white/5 px-2">
              {isConnected ? (
                <>
                  <div className="px-3 py-2 mb-1 flex justify-between items-center gap-3 bg-gray-50 dark:bg-white/5 rounded-xl">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg text-blue-600">
                        <FiUser className="w-4 h-4" />
                      </div>
                      <div className="flex flex-col">
                        <span className="text-[10px] text-gray-400 font-bold uppercase">Account</span>
                        <span className="text-xs font-mono dark:text-gray-200">
                          {user.account.slice(0, 6)}...{user.account.slice(-4)}
                        </span>
                      </div>
                    </div>
                    <FiLogOut className="w-4 h-4" onClick={disconnect} />
                  </div>
                </>
              ) : (
                <Link
                  href="/connect"
                  className="flex items-center justify-center w-full py-2.5 text-sm font-bold text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-500/10 rounded-xl transition-all"
                >
                  Connect Wallet
                </Link>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}