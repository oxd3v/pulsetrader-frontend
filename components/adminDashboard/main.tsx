"use client";
import { useState, useEffect } from "react";
import { useStore } from "@/store/useStore";
import { useShallow } from "zustand/shallow";
import { useRouter } from "next/navigation";
import AdminService from "@/service/admin-service";
import toast from "react-hot-toast";
import Link from "next/link";

import AdminPasswordGate from "./AdminPasswordGate";
import AdminOrdersPanel from "./AdminOrdersPanel";
import AdminSystemPanel from "./AdminSystemPanel";
import AdminLogsPanel from "./AdminLogsPanel";

import {
    FiShield,
    FiBarChart2,
    FiSettings,
    FiFileText,
    FiAlertTriangle,
    FiLogIn,
    FiLock,
} from "react-icons/fi";

const ADMIN_SESSION_KEY = "__pt_admin_verified";

type Tab = "orders" | "system" | "logs";

const TABS: { id: Tab; label: string; icon: typeof FiBarChart2 }[] = [
    { id: "orders", label: "Orders", icon: FiBarChart2 },
    { id: "system", label: "System", icon: FiSettings },
    { id: "logs", label: "Logs", icon: FiFileText },
];

export default function AdminDashboardMain() {
    const { isConnected, user } = useStore(
        useShallow((state: any) => ({
            isConnected: state.isConnected,
            user: state.user,
        }))
    );


    const router = useRouter();

    // ─── UI State ────────────────────────────────────────────────
    const [mounted, setMounted] = useState(false);
    const [isVerified, setIsVerified] = useState(false);
    const [systemData, setSystemData] = useState<any>(null);
    const [activeTab, setActiveTab] = useState<Tab>("orders");

    // ─── Step 1: Mount ──────────────────────────────────────────
    useEffect(() => {
        setMounted(true);
    }, []);


    // ─── Step 2: Connection & Admin Check ──────────────────────
    useEffect(() => {
        if (!mounted) return;

        // Avoid redirecting if already on the connect page
        const isOnConnectPage =
            typeof window !== "undefined" && window.location.pathname === "/connect";

        // 🔹 Not connected → redirect to /connect
        if (!isConnected && !isOnConnectPage) {
            router.push("/connect");
            return;
        }

        // If connected but no account (shouldn't happen, but guard)
        if (isConnected && !user?.account && !isOnConnectPage) {
            router.push("/connect");
            return;
        }

        // 🔹 Connected & not admin → render Access Denied
        // (we'll handle this in the render, no need to redirect)
        // 🔹 Connected & admin → check password session
        if (isConnected && user?.status === "admin") {
            // Check if we already have a verified session
            const sessionVerified =
                typeof window !== "undefined" &&
                sessionStorage.getItem(ADMIN_SESSION_KEY) === "true";

            if (sessionVerified) {
                setIsVerified(true);
                // Fetch system data if not already loaded
                if (!systemData) {
                    AdminService.getSystemData()
                        .then((res) => {
                            if (res?.success && res?.data) {
                                setSystemData(res.data);
                            }
                        })
                        .catch(() => { });
                }
            } else {
                // Not verified → password gate will be shown
                setIsVerified(false);
            }
        }
    }, [mounted, isConnected, user, router, systemData]);

    // ─── Password verification callback ────────────────────────
    const handleVerified = async (data: any) => {
        setIsVerified(true);
        setSystemData(data);
        sessionStorage.setItem(ADMIN_SESSION_KEY, "true");
        toast.success("Admin access granted");
    };

    const handleLock = () => {
        sessionStorage.removeItem(ADMIN_SESSION_KEY);
        setIsVerified(false);
        setSystemData(null);
        toast.success("Admin dashboard locked");
    };

    const verifyFn = async (password: string) => {
        return AdminService.verifyAdmin(password);
    };

    // ─── Render ──────────────────────────────────────────────────

    if (!mounted) {
        return (
            <div className="min-h-[80vh] flex flex-col items-center justify-center gap-3">
                <span className="h-8 w-8 animate-spin rounded-full border-2 border-gray-700 border-t-violet-500" />
                <span className="text-xs text-gray-500">Loading...</span>
            </div>
        );
    }

    // ─── Not connected ──────────────────────────────────────────
    if (!isConnected || !user?.account) {
        return (
            <div className="min-h-[80vh] flex items-center justify-center px-4">
                <div className="text-center max-w-md p-8 rounded-2xl border border-white/10 bg-gray-900/60 backdrop-blur-xl">
                    <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-gray-800/80 border border-white/10">
                        <FiLogIn className="h-7 w-7 text-gray-400" />
                    </div>
                    <h2 className="text-xl font-bold text-white mb-2">Connect Wallet</h2>
                    <p className="text-sm text-gray-400 mb-6">
                        You must connect your admin wallet to access the dashboard.
                    </p>
                    <Link
                        href="/connect"
                        className="inline-block w-full py-3 bg-gradient-to-r from-violet-600 to-cyan-500 hover:brightness-110 text-white rounded-xl font-semibold text-sm transition-all shadow-lg shadow-violet-600/25"
                    >
                        Go to Connect
                    </Link>
                </div>
            </div>
        );
    }

    // ─── Connected but not admin ──────────────────────────────
    const userStatus = (user?.status || "").toLowerCase();
    if (userStatus !== "admin") {
        return (
            <div className="min-h-[80vh] flex items-center justify-center px-4">
                <div className="text-center max-w-md p-8 rounded-2xl border border-red-500/20 bg-red-950/20 backdrop-blur-xl">
                    <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-red-500/10 border border-red-500/20">
                        <FiAlertTriangle className="h-7 w-7 text-red-400" />
                    </div>
                    <h2 className="text-xl font-bold text-white mb-2">Access Denied</h2>
                    <p className="text-sm text-gray-400 mb-4">
                        Your connected wallet account does not have admin privileges.
                    </p>
                    <div className="rounded-xl border border-white/10 bg-black/40 p-3 text-left space-y-1">
                        <div className="text-[11px] text-gray-500 font-mono">
                            Account:{" "}
                            <span className="text-gray-300">
                                {user?.account
                                    ? `${user.account.slice(0, 8)}...${user.account.slice(-6)}`
                                    : "—"}
                            </span>
                        </div>
                        <div className="text-[11px] text-gray-500 font-mono">
                            Status: <span className="text-amber-400 font-semibold">{user?.status || "None"}</span>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    // ─── Admin but not yet verified ────────────────────────────
    if (!isVerified) {
        return (
            <AdminPasswordGate
                onVerified={handleVerified}
                onError={() => { }}
                verifyFn={verifyFn}
            />
        );
    }

    // ─── Verified Admin Dashboard ──────────────────────────────
    return (
        <div className="min-h-[calc(100vh-60px)] flex flex-col md:flex-row">
            {/* Sidebar */}
            <aside className="w-full md:w-56 shrink-0 border-b md:border-b-0 md:border-r border-white/10 bg-gray-950/40 flex flex-col justify-between">
                <div>
                    {/* Brand */}
                    <div className="flex items-center gap-2.5 px-5 py-4 border-b border-white/10">
                        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-violet-600 to-cyan-500 shadow-lg shadow-violet-600/20">
                            <FiShield className="h-4 w-4 text-white" />
                        </div>
                        <div>
                            <div className="text-sm font-bold text-white">Admin</div>
                            <div className="text-[10px] text-gray-500">PulseTrader Dashboard</div>
                        </div>
                    </div>

                    {/* Nav */}
                    <nav className="flex md:flex-col gap-1 p-2 overflow-x-auto md:overflow-x-visible">
                        {TABS.map((tab) => {
                            const Icon = tab.icon;
                            const isActive = activeTab === tab.id;
                            return (
                                <button
                                    key={tab.id}
                                    onClick={() => setActiveTab(tab.id)}
                                    className={`flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm font-medium transition-all whitespace-nowrap ${isActive
                                        ? "bg-gradient-to-r from-violet-600/20 to-cyan-500/20 text-violet-400 border border-violet-500/30 shadow-sm"
                                        : "text-gray-500 hover:bg-white/5 hover:text-gray-300 border border-transparent"
                                        }`}
                                >
                                    <Icon className="h-4 w-4 shrink-0" />
                                    {tab.label}
                                </button>
                            );
                        })}
                    </nav>
                </div>

                {/* Lock session */}
                <div className="p-2 border-t border-white/10">
                    <button
                        onClick={handleLock}
                        className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-xs text-gray-500 hover:bg-white/5 hover:text-gray-300 transition-colors"
                    >
                        <FiLock className="h-3.5 w-3.5" />
                        Lock Session
                    </button>
                </div>
            </aside>

            {/* Main content */}
            <main className="flex-1 overflow-y-auto p-4 md:p-6 bg-gradient-to-b from-gray-950 to-gray-900/80">
                <div className="mb-6">
                    <h1 className="text-lg font-bold text-white">
                        {TABS.find((t) => t.id === activeTab)?.label}
                    </h1>
                    <p className="text-xs text-gray-500 mt-0.5">
                        {activeTab === "orders" && "Monitor and inspect all orders across the platform"}
                        {activeTab === "system" && "Configure system settings, listener, and credentials"}
                        {activeTab === "logs" && "View and manage server log files"}
                    </p>
                </div>

                {activeTab === "orders" && <AdminOrdersPanel />}
                {activeTab === "system" && <AdminSystemPanel initialSystemData={systemData} />}
                {activeTab === "logs" && <AdminLogsPanel />}
            </main>
        </div>
    );
}