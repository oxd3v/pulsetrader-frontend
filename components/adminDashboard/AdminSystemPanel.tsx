"use client";
import { useState, useEffect, useCallback } from "react";
import {
    FiSave,
    FiPlus,
    FiX,
    FiRefreshCw,
    FiLock,
    FiEye,
    FiEyeOff,
    FiToggleLeft,
    FiToggleRight,
    FiEdit2,
    FiTrash2,
    FiUsers,
} from "react-icons/fi";

import AdminService from "@/service/admin-service";
import toast from "react-hot-toast";


type SystemData = {
    _id?: string;
    listening?: boolean;
    listenCategory?: string[];
    listenSpotNetwork?: number[];
    config?: Record<string, any>;
    userLevels?: Record<string, any>;
};

type UserLevelEntry = {
    id: string;
    benefits: {
        maxOrder: number | string;
        maxWallets: number;
        maxEVMWallets: number;
        maxSVMWallets: number;
        maxAccessAsset: number;
        supportTrading: string[];
        supportStrategy: string[];
        maxPerpAgentWallet: number;
        isDemoTestnet: boolean;
        isTradeFeeExempt?: boolean;
    };
    requirements: Record<string, { quantity: string }>;
};

export default function AdminSystemPanel({ initialSystemData }: { initialSystemData?: any }) {
    const [systemData, setSystemData] = useState<SystemData>(initialSystemData?.systemData || {});
    const [isListening, setIsListening] = useState<boolean>(initialSystemData?.isListening || false);
    const [loading, setLoading] = useState(false);
    const [listeningLoading, setListeningLoading] = useState(false);

    // Config editor state
    const [editingKey, setEditingKey] = useState<string | null>(null);
    const [editingValue, setEditingValue] = useState("");
    const [newCategory, setNewCategory] = useState("");
    const [newNetwork, setNewNetwork] = useState("");

    // Password change state
    const [showPasswordForm, setShowPasswordForm] = useState(false);
    const [newPassword, setNewPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [showNewPass, setShowNewPass] = useState(false);
    const [passwordLoading, setPasswordLoading] = useState(false);

    // User levels state
    const [editingLevelId, setEditingLevelId] = useState<string | null>(null);
    const [editingLevelData, setEditingLevelData] = useState<UserLevelEntry | null>(null);
    const [isLevelModalOpen, setIsLevelModalOpen] = useState(false);
    const [isNewLevel, setIsNewLevel] = useState(false);

    const fetchSystemData = useCallback(async () => {
        setLoading(true);
        try {
            const res = await AdminService.getSystemData();
            if (res?.success && res?.data) {
                setSystemData(res.data.systemData || {});
                setIsListening(res.data.isListening || false);
            }
        } catch (err) {
            console.error("Failed to fetch system data:", err);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        if (!initialSystemData) fetchSystemData();
    }, [fetchSystemData, initialSystemData]);

    // ─── Listener Toggle ─────────────────────────────────────────────────────
    const toggleListening = async () => {
        setListeningLoading(true);
        try {
            const res = await AdminService.switchListening(!isListening);
            if (res?.message === "SWITCH_LISTEN_ORDER_SUCCESS") {
                setIsListening(!isListening);
                toast.success(isListening ? "Listener stopped" : "Listener started");
            } else {
                toast.error("Failed to toggle listener");
            }
        } catch {
            toast.error("Failed to toggle listener");
        } finally {
            setListeningLoading(false);
        }
    };

    // ─── Category Management ──────────────────────────────────────────────
    const addCategory = async () => {
        if (!newCategory.trim()) return;
        const updated = [...(systemData.listenCategory || []), newCategory.trim().toLowerCase()];
        try {
            const res = await AdminService.updateSystem({ listenCategory: updated });
            if (res?.success) {
                setSystemData((prev) => ({ ...prev, listenCategory: updated }));
                setNewCategory("");
                toast.success("Category added");
            }
        } catch {
            toast.error("Failed to add category");
        }
    };

    const removeCategory = async (cat: string) => {
        const updated = (systemData.listenCategory || []).filter((c) => c !== cat);
        try {
            const res = await AdminService.updateSystem({ listenCategory: updated });
            if (res?.success) {
                setSystemData((prev) => ({ ...prev, listenCategory: updated }));
                toast.success("Category removed");
            }
        } catch {
            toast.error("Failed to remove category");
        }
    };

    // ─── Network Management ──────────────────────────────────────────────
    const addNetwork = async () => {
        const num = parseInt(newNetwork);
        if (isNaN(num)) return;
        const updated = [...(systemData.listenSpotNetwork || []), num];
        try {
            const res = await AdminService.updateSystem({ listenSpotNetwork: updated });
            if (res?.success) {
                setSystemData((prev) => ({ ...prev, listenSpotNetwork: updated }));
                setNewNetwork("");
                toast.success("Network added");
            }
        } catch {
            toast.error("Failed to add network");
        }
    };

    const removeNetwork = async (net: number) => {
        const updated = (systemData.listenSpotNetwork || []).filter((n) => n !== net);
        try {
            const res = await AdminService.updateSystem({ listenSpotNetwork: updated });
            if (res?.success) {
                setSystemData((prev) => ({ ...prev, listenSpotNetwork: updated }));
                toast.success("Network removed");
            }
        } catch {
            toast.error("Failed to remove network");
        }
    };

    // ─── Config Editor ─────────────────────────────────────────────────────
    const saveConfigValue = async (key: string) => {
        let parsedValue: any = editingValue;
        if (editingValue === "true") parsedValue = true;
        else if (editingValue === "false") parsedValue = false;
        else if (!isNaN(Number(editingValue)) && editingValue.trim() !== "") parsedValue = Number(editingValue);
        else {
            try {
                parsedValue = JSON.parse(editingValue);
            } catch {
                /* keep as string */
            }
        }

        try {
            const res = await AdminService.updateSystem({ configUpdates: { [key]: parsedValue } });
            if (res?.success) {
                setSystemData((prev) => ({
                    ...prev,
                    config: { ...prev.config, [key]: parsedValue },
                }));
                setEditingKey(null);
                setEditingValue("");

                toast.success(`Config "${key}" updated`);
            }
        } catch {
            toast.error("Failed to update config");
        }
    };

    // ─── Password Change ──────────────────────────────────────────────────
    const changePassword = async () => {
        if (!newPassword || newPassword.length < 6) {
            toast.error("Password must be at least 6 characters");
            return;
        }
        if (newPassword !== confirmPassword) {
            toast.error("Passwords do not match");
            return;
        }
        setPasswordLoading(true);
        try {
            const res = await AdminService.updateSystem({ newPassword });
            if (res?.success) {
                toast.success("Admin password changed successfully");
                setNewPassword("");
                setConfirmPassword("");
                setShowPasswordForm(false);
            } else {
                toast.error(res?.message || "Failed to change password");
            }
        } catch {
            toast.error("Failed to change password");
        } finally {
            setPasswordLoading(false);
        }
    };

    // ─── User Level Management ────────────────────────────────────────────
    const userLevels = systemData.userLevels || {};

    const openLevelModal = (levelId?: string) => {
        if (levelId) {
            const levelData = userLevels[levelId];
            if (levelData) {
                setEditingLevelId(levelId);
                setEditingLevelData({ id: levelId, ...levelData } as UserLevelEntry);
                setIsNewLevel(false);
            }
        } else {
            // New level with default template
            const newLevel: UserLevelEntry = {
                id: "",
                benefits: {
                    maxOrder: 10,
                    maxWallets: 3,
                    maxEVMWallets: 2,
                    maxSVMWallets: 1,
                    maxAccessAsset: 5,
                    supportTrading: ["spot"],
                    supportStrategy: ["limit"],
                    maxPerpAgentWallet: 1,
                    isDemoTestnet: false,
                    isTradeFeeExempt: false,
                },
                requirements: {},
            };
            setEditingLevelId(null);
            setEditingLevelData(newLevel);
            setIsNewLevel(true);
        }
        setIsLevelModalOpen(true);
    };

    const closeLevelModal = () => {
        setIsLevelModalOpen(false);
        setEditingLevelId(null);
        setEditingLevelData(null);
        setIsNewLevel(false);
    };

    const saveUserLevel = async () => {
        if (!editingLevelData) return;
        const { id, ...levelData } = editingLevelData;
        if (!id.trim()) {
            toast.error("Level ID is required");
            return;
        }
        const newUserLevels = { ...userLevels };
        newUserLevels[id] = levelData;
        try {
            const res = await AdminService.updateSystem({ userLevels: newUserLevels });
            if (res?.success) {
                setSystemData((prev) => ({ ...prev, userLevels: newUserLevels }));
                toast.success(isNewLevel ? "User level created" : "User level updated");
                closeLevelModal();
            } else {
                toast.error("Failed to save user level");
            }
        } catch {
            toast.error("Failed to save user level");
        }
    };

    const deleteUserLevel = async (levelId: string) => {
        if (!confirm(`Delete user level "${levelId}"? This action cannot be undone.`)) return;
        const newUserLevels = { ...userLevels };
        delete newUserLevels[levelId];
        try {
            const res = await AdminService.updateSystem({ userLevels: newUserLevels });
            if (res?.success) {
                setSystemData((prev) => ({ ...prev, userLevels: newUserLevels }));
                toast.success(`Level "${levelId}" deleted`);
            } else {
                toast.error("Failed to delete user level");
            }
        } catch {
            toast.error("Failed to delete user level");
        }
    };

    const config = systemData.config || {};
    const configEntries = Object.entries(config).sort(([a], [b]) => a.localeCompare(b));

    return (
        <div className="space-y-6">
            {/* ─── Listener Toggle ────────────────────────────────────────────── */}
            <div className="rounded-xl border border-white/10 bg-white/[0.02] p-5 shadow-sm">
                <div className="flex items-center justify-between">
                    <div>
                        <h3 className="text-sm font-semibold text-white mb-1">Order Listener</h3>
                        <p className="text-xs text-gray-500">Controls the main order evaluation engine</p>
                    </div>
                    <div className="flex items-center gap-3">
                        <span className={`flex items-center gap-1.5 text-xs font-medium ${isListening ? "text-emerald-400" : "text-gray-500"}`}>
                            <span className={`h-2 w-2 rounded-full ${isListening ? "bg-emerald-400 animate-pulse" : "bg-gray-600"}`} />
                            {isListening ? "Running" : "Stopped"}
                        </span>
                        <button onClick={toggleListening} disabled={listeningLoading} className="transition-all disabled:opacity-50">
                            {isListening ? (
                                <FiToggleRight className="h-8 w-8 text-emerald-400 hover:text-emerald-300" />
                            ) : (
                                <FiToggleLeft className="h-8 w-8 text-gray-600 hover:text-gray-400" />
                            )}
                        </button>
                    </div>
                </div>
            </div>

            {/* ─── Listen Categories & Networks ────────────────────────────────── */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="rounded-xl border border-white/10 bg-white/[0.02] p-5 shadow-sm">
                    <h3 className="text-sm font-semibold text-white mb-3">Listen Categories</h3>
                    <div className="flex flex-wrap gap-2 mb-3">
                        {(systemData.listenCategory || []).map((cat) => (
                            <span
                                key={cat}
                                className="inline-flex items-center gap-1.5 rounded-lg border border-violet-500/20 bg-violet-500/10 px-2.5 py-1 text-xs text-violet-400"
                            >
                                {cat}
                                <button onClick={() => removeCategory(cat)} className="hover:text-red-400 transition-colors">
                                    <FiX className="h-3 w-3" />
                                </button>
                            </span>
                        ))}
                        {(systemData.listenCategory || []).length === 0 && (
                            <span className="text-xs text-gray-600">No categories configured</span>
                        )}
                    </div>
                    <div className="flex gap-2">
                        <input
                            type="text"
                            value={newCategory}
                            onChange={(e) => setNewCategory(e.target.value)}
                            onKeyDown={(e) => e.key === "Enter" && addCategory()}
                            placeholder="e.g. spot, asterdex"
                            className="flex-1 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-white placeholder-gray-600 outline-none focus:border-violet-500/50"
                        />
                        <button
                            onClick={addCategory}
                            className="rounded-lg bg-violet-600/20 px-3 py-1.5 text-xs text-violet-400 hover:bg-violet-600/30 transition-colors"
                        >
                            <FiPlus className="h-3.5 w-3.5" />
                        </button>
                    </div>
                </div>

                <div className="rounded-xl border border-white/10 bg-white/[0.02] p-5 shadow-sm">
                    <h3 className="text-sm font-semibold text-white mb-3">Spot Networks (Chain IDs)</h3>
                    <div className="flex flex-wrap gap-2 mb-3">
                        {(systemData.listenSpotNetwork || []).map((net) => (
                            <span
                                key={net}
                                className="inline-flex items-center gap-1.5 rounded-lg border border-cyan-500/20 bg-cyan-500/10 px-2.5 py-1 text-xs text-cyan-400 font-mono"
                            >
                                {net}
                                <button onClick={() => removeNetwork(net)} className="hover:text-red-400 transition-colors">
                                    <FiX className="h-3 w-3" />
                                </button>
                            </span>
                        ))}
                        {(systemData.listenSpotNetwork || []).length === 0 && (
                            <span className="text-xs text-gray-600">No networks configured</span>
                        )}
                    </div>
                    <div className="flex gap-2">
                        <input
                            type="number"
                            value={newNetwork}
                            onChange={(e) => setNewNetwork(e.target.value)}
                            onKeyDown={(e) => e.key === "Enter" && addNetwork()}
                            placeholder="e.g. 42161"
                            className="flex-1 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-white placeholder-gray-600 outline-none focus:border-cyan-500/50"
                        />
                        <button
                            onClick={addNetwork}
                            className="rounded-lg bg-cyan-600/20 px-3 py-1.5 text-xs text-cyan-400 hover:bg-cyan-600/30 transition-colors"
                        >
                            <FiPlus className="h-3.5 w-3.5" />
                        </button>
                    </div>
                </div>
            </div>

            {/* ─── User Levels Management ──────────────────────────────────────── */}
            <div className="rounded-xl border border-white/10 bg-white/[0.02] overflow-hidden shadow-sm">
                <div className="flex items-center justify-between border-b border-white/10 px-5 py-3">
                    <div className="flex items-center gap-2">
                        <FiUsers className="h-4 w-4 text-violet-400" />
                        <h3 className="text-sm font-semibold text-white">User Levels</h3>
                        <span className="text-xs text-gray-500">({Object.keys(userLevels).length} levels)</span>
                    </div>
                    <button
                        onClick={() => openLevelModal()}
                        className="flex items-center gap-1.5 rounded-lg bg-violet-600/20 px-3 py-1.5 text-xs text-violet-400 hover:bg-violet-600/30 transition-colors"
                    >
                        <FiPlus className="h-3.5 w-3.5" />
                        Add Level
                    </button>
                </div>
                <div className="max-h-[400px] overflow-y-auto">
                    {Object.keys(userLevels).length === 0 ? (
                        <div className="px-5 py-8 text-center text-xs text-gray-600">No user levels configured</div>
                    ) : (
                        <table className="w-full text-left">
                            <thead className="sticky top-0 bg-gray-900/95 backdrop-blur-sm">
                                <tr className="border-b border-white/10">
                                    <th className="px-5 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-gray-500">Level ID</th>
                                    <th className="px-5 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-gray-500">Max Orders</th>
                                    <th className="px-5 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-gray-500">Max Wallets</th>
                                    <th className="px-5 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-gray-500">Trading</th>
                                    <th className="px-5 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-gray-500">Strategies</th>
                                    <th className="px-5 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-gray-500 w-[80px]">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {Object.entries(userLevels).map(([id, level]: [string, any]) => (
                                    <tr key={id} className="border-b border-white/5 hover:bg-white/[0.02] transition-colors">
                                        <td className="px-5 py-2.5 text-xs font-mono text-violet-400">{id}</td>
                                        <td className="px-5 py-2.5 text-xs text-gray-300">{level.benefits?.maxOrder ?? "—"}</td>
                                        <td className="px-5 py-2.5 text-xs text-gray-300">{level.benefits?.maxWallets ?? "—"}</td>
                                        <td className="px-5 py-2.5 text-xs text-gray-300">
                                            {level.benefits?.supportTrading?.join(", ") || "—"}
                                        </td>
                                        <td className="px-5 py-2.5 text-xs text-gray-300">
                                            {level.benefits?.supportStrategy?.join(", ") || "—"}
                                        </td>
                                        <td className="px-5 py-2.5">
                                            <div className="flex items-center gap-1">
                                                <button
                                                    onClick={() => openLevelModal(id)}
                                                    className="rounded-md p-1 text-gray-500 hover:text-blue-400 transition-colors"
                                                    title="Edit"
                                                >
                                                    <FiEdit2 className="h-3.5 w-3.5" />
                                                </button>
                                                <button
                                                    onClick={() => deleteUserLevel(id)}
                                                    className="rounded-md p-1 text-gray-500 hover:text-red-400 transition-colors"
                                                    title="Delete"
                                                >
                                                    <FiTrash2 className="h-3.5 w-3.5" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
            </div>

            {/* ─── Config Key-Value Editor ──────────────────────────────────────── */}
            <div className="rounded-xl border border-white/10 bg-white/[0.02] overflow-hidden shadow-sm">
                <div className="flex items-center justify-between border-b border-white/10 px-5 py-3">
                    <h3 className="text-sm font-semibold text-white">System Configuration</h3>
                    <button onClick={fetchSystemData} disabled={loading} className="text-gray-500 hover:text-gray-300 transition-colors">
                        <FiRefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
                    </button>
                </div>
                <div className="max-h-[450px] overflow-y-auto">
                    <table className="w-full text-left">
                        <thead className="sticky top-0 bg-gray-900/95 backdrop-blur-sm">
                            <tr className="border-b border-white/10">
                                <th className="px-5 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-gray-500 w-[40%]">Key</th>
                                <th className="px-5 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-gray-500">Value</th>
                                <th className="px-5 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-gray-500 w-[80px]">Action</th>
                            </tr>
                        </thead>
                        <tbody>
                            {configEntries.length === 0 ? (
                                <tr>
                                    <td colSpan={3} className="px-5 py-8 text-center text-xs text-gray-600">
                                        No config entries
                                    </td>
                                </tr>
                            ) : (
                                configEntries.map(([key, value]) => (
                                    <tr key={key} className="border-b border-white/5 hover:bg-white/[0.02] transition-colors">
                                        <td className="px-5 py-2.5 text-xs text-gray-400 font-mono">{key}</td>
                                        <td className="px-5 py-2.5">
                                            {editingKey === key ? (
                                                <input
                                                    type="text"
                                                    value={editingValue}
                                                    onChange={(e) => setEditingValue(e.target.value)}
                                                    onKeyDown={(e) => {
                                                        if (e.key === "Enter") saveConfigValue(key);
                                                        if (e.key === "Escape") {
                                                            setEditingKey(null);
                                                            setEditingValue("");
                                                        }
                                                    }}
                                                    autoFocus
                                                    className="w-full rounded-md border border-violet-500/40 bg-violet-500/5 px-2.5 py-1 text-xs text-white outline-none focus:border-violet-500/60"
                                                />
                                            ) : (
                                                <span
                                                    className="text-xs text-gray-300 font-mono cursor-pointer hover:text-white transition-colors block max-w-[300px] truncate"
                                                    title={String(value)}
                                                    onClick={() => {
                                                        setEditingKey(key);
                                                        setEditingValue(typeof value === "object" ? JSON.stringify(value) : String(value));
                                                    }}
                                                >
                                                    {typeof value === "object" ? JSON.stringify(value) : String(value)}
                                                </span>
                                            )}
                                        </td>
                                        <td className="px-5 py-2.5">
                                            {editingKey === key ? (
                                                <div className="flex items-center gap-1">
                                                    <button
                                                        onClick={() => saveConfigValue(key)}
                                                        className="rounded-md bg-emerald-600/20 p-1 text-emerald-400 hover:bg-emerald-600/30 transition-colors"
                                                    >
                                                        <FiSave className="h-3.5 w-3.5" />
                                                    </button>
                                                    <button
                                                        onClick={() => {
                                                            setEditingKey(null);
                                                            setEditingValue("");
                                                        }}
                                                        className="rounded-md bg-gray-600/20 p-1 text-gray-400 hover:bg-gray-600/30 transition-colors"
                                                    >
                                                        <FiX className="h-3.5 w-3.5" />
                                                    </button>
                                                </div>
                                            ) : (
                                                <button
                                                    onClick={() => {
                                                        setEditingKey(key);
                                                        setEditingValue(typeof value === "object" ? JSON.stringify(value) : String(value));
                                                    }}
                                                    className="text-[10px] text-gray-600 hover:text-gray-400 transition-colors"
                                                >
                                                    Edit
                                                </button>
                                            )}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* ─── Change Admin Password ────────────────────────────────────────── */}
            <div className="rounded-xl border border-white/10 bg-white/[0.02] p-5 shadow-sm">
                <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                        <FiLock className="h-4 w-4 text-gray-500" />
                        <h3 className="text-sm font-semibold text-white">Admin Password</h3>
                    </div>
                    <button
                        onClick={() => setShowPasswordForm(!showPasswordForm)}
                        className="text-xs text-violet-400 hover:text-violet-300 transition-colors"
                    >
                        {showPasswordForm ? "Cancel" : "Change Password"}
                    </button>
                </div>
                {showPasswordForm && (
                    <div className="space-y-3">
                        <div className="relative">
                            <input
                                type={showNewPass ? "text" : "password"}
                                value={newPassword}
                                onChange={(e) => setNewPassword(e.target.value)}
                                placeholder="New password (min 6 characters)"
                                className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs text-white placeholder-gray-600 outline-none focus:border-violet-500/50 pr-8"
                            />
                            <button
                                onClick={() => setShowNewPass(!showNewPass)}
                                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-500"
                            >
                                {showNewPass ? <FiEyeOff className="h-3.5 w-3.5" /> : <FiEye className="h-3.5 w-3.5" />}
                            </button>
                        </div>
                        <input
                            type="password"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            placeholder="Confirm new password"
                            className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs text-white placeholder-gray-600 outline-none focus:border-violet-500/50"
                        />
                        <button
                            onClick={changePassword}
                            disabled={passwordLoading}
                            className="rounded-lg bg-gradient-to-r from-violet-600 to-cyan-500 px-4 py-2 text-xs font-medium text-white shadow-lg shadow-violet-600/20 hover:shadow-violet-600/30 transition-all disabled:opacity-50"
                        >
                            {passwordLoading ? "Updating..." : "Update Password"}
                        </button>
                    </div>
                )}
            </div>

            {/* ─── User Level Edit Modal ────────────────────────────────────────── */}
            {isLevelModalOpen && editingLevelData && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
                    <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-xl border border-white/10 bg-gray-900 p-6 shadow-2xl">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-lg font-bold text-white">
                                {isNewLevel ? "Create User Level" : "Edit User Level"}
                            </h3>
                            <button onClick={closeLevelModal} className="text-gray-400 hover:text-white transition-colors">
                                <FiX className="h-5 w-5" />
                            </button>
                        </div>

                        <div className="space-y-4">
                            {/* Level ID */}
                            <div>
                                <label className="block text-xs font-medium text-gray-400 mb-1">Level ID (e.g., "gold")</label>
                                <input
                                    type="text"
                                    value={editingLevelData.id}
                                    onChange={(e) => setEditingLevelData({ ...editingLevelData, id: e.target.value.toLowerCase().trim() })}
                                    placeholder="Level ID"
                                    disabled={!isNewLevel}
                                    className={`w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs text-white placeholder-gray-600 outline-none focus:border-violet-500/50 ${!isNewLevel ? "opacity-50 cursor-not-allowed" : ""
                                        }`}
                                />
                                {!isNewLevel && <p className="text-[10px] text-gray-500 mt-1">Level ID cannot be changed once created</p>}
                            </div>

                            {/* Benefits Section */}
                            <div className="space-y-3">
                                <h4 className="text-sm font-semibold text-violet-400">Benefits</h4>
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="block text-[10px] text-gray-400 mb-1">Max Orders</label>
                                        <input
                                            type="text"
                                            value={editingLevelData.benefits.maxOrder}
                                            onChange={(e) =>
                                                setEditingLevelData({
                                                    ...editingLevelData,
                                                    benefits: { ...editingLevelData.benefits, maxOrder: e.target.value },
                                                })
                                            }
                                            className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-white outline-none focus:border-violet-500/50"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-[10px] text-gray-400 mb-1">Max Wallets</label>
                                        <input
                                            type="number"
                                            value={editingLevelData.benefits.maxWallets}
                                            onChange={(e) =>
                                                setEditingLevelData({
                                                    ...editingLevelData,
                                                    benefits: { ...editingLevelData.benefits, maxWallets: parseInt(e.target.value) || 0 },
                                                })
                                            }
                                            className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-white outline-none focus:border-violet-500/50"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-[10px] text-gray-400 mb-1">Max EVM Wallets</label>
                                        <input
                                            type="number"
                                            value={editingLevelData.benefits.maxEVMWallets}
                                            onChange={(e) =>
                                                setEditingLevelData({
                                                    ...editingLevelData,
                                                    benefits: { ...editingLevelData.benefits, maxEVMWallets: parseInt(e.target.value) || 0 },
                                                })
                                            }
                                            className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-white outline-none focus:border-violet-500/50"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-[10px] text-gray-400 mb-1">Max SVM Wallets</label>
                                        <input
                                            type="number"
                                            value={editingLevelData.benefits.maxSVMWallets}
                                            onChange={(e) =>
                                                setEditingLevelData({
                                                    ...editingLevelData,
                                                    benefits: { ...editingLevelData.benefits, maxSVMWallets: parseInt(e.target.value) || 0 },
                                                })
                                            }
                                            className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-white outline-none focus:border-violet-500/50"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-[10px] text-gray-400 mb-1">Max Access Assets</label>
                                        <input
                                            type="number"
                                            value={editingLevelData.benefits.maxAccessAsset}
                                            onChange={(e) =>
                                                setEditingLevelData({
                                                    ...editingLevelData,
                                                    benefits: { ...editingLevelData.benefits, maxAccessAsset: parseInt(e.target.value) || 0 },
                                                })
                                            }
                                            className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-white outline-none focus:border-violet-500/50"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-[10px] text-gray-400 mb-1">Max Perp Agent Wallets</label>
                                        <input
                                            type="number"
                                            value={editingLevelData.benefits.maxPerpAgentWallet}
                                            onChange={(e) =>
                                                setEditingLevelData({
                                                    ...editingLevelData,
                                                    benefits: { ...editingLevelData.benefits, maxPerpAgentWallet: parseInt(e.target.value) || 0 },
                                                })
                                            }
                                            className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-white outline-none focus:border-violet-500/50"
                                        />
                                    </div>
                                </div>

                                <div className="flex items-center gap-4">
                                    <label className="flex items-center gap-2 text-xs text-gray-300">
                                        <input
                                            type="checkbox"
                                            checked={editingLevelData.benefits.isDemoTestnet || false}
                                            onChange={(e) =>
                                                setEditingLevelData({
                                                    ...editingLevelData,
                                                    benefits: { ...editingLevelData.benefits, isDemoTestnet: e.target.checked },
                                                })
                                            }
                                            className="rounded border-white/10 bg-white/5 text-violet-500 focus:ring-violet-500"
                                        />
                                        Demo/Testnet Access
                                    </label>
                                    <label className="flex items-center gap-2 text-xs text-gray-300">
                                        <input
                                            type="checkbox"
                                            checked={editingLevelData.benefits.isTradeFeeExempt || false}
                                            onChange={(e) =>
                                                setEditingLevelData({
                                                    ...editingLevelData,
                                                    benefits: { ...editingLevelData.benefits, isTradeFeeExempt: e.target.checked },
                                                })
                                            }
                                            className="rounded border-white/10 bg-white/5 text-violet-500 focus:ring-violet-500"
                                        />
                                        Fee Exempt
                                    </label>
                                </div>

                                <div className="space-y-2">
                                    <label className="block text-[10px] text-gray-400 mb-1">Support Trading (comma separated)</label>
                                    <input
                                        type="text"
                                        value={editingLevelData.benefits.supportTrading?.join(", ") || ""}
                                        onChange={(e) =>
                                            setEditingLevelData({
                                                ...editingLevelData,
                                                benefits: {
                                                    ...editingLevelData.benefits,
                                                    supportTrading: e.target.value.split(",").map((s) => s.trim()).filter(Boolean),
                                                },
                                            })
                                        }
                                        className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-white outline-none focus:border-violet-500/50"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="block text-[10px] text-gray-400 mb-1">Support Strategy (comma separated)</label>
                                    <input
                                        type="text"
                                        value={editingLevelData.benefits.supportStrategy?.join(", ") || ""}
                                        onChange={(e) =>
                                            setEditingLevelData({
                                                ...editingLevelData,
                                                benefits: {
                                                    ...editingLevelData.benefits,
                                                    supportStrategy: e.target.value.split(",").map((s) => s.trim()).filter(Boolean),
                                                },
                                            })
                                        }
                                        className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-white outline-none focus:border-violet-500/50"
                                    />
                                </div>
                            </div>

                            {/* Requirements Section */}
                            <div>
                                <h4 className="text-sm font-semibold text-violet-400 mb-2">Requirements</h4>
                                <div className="space-y-2">
                                    {Object.entries(editingLevelData.requirements || {}).map(([key, req]) => (
                                        <div key={key} className="flex items-center gap-2">
                                            <input
                                                type="text"
                                                value={key}
                                                placeholder="Requirement key (e.g. GLADIATOR_STAKE_43114)"
                                                className="flex-1 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-white outline-none focus:border-violet-500/50"
                                                onChange={(e) => {
                                                    const newReqs = { ...editingLevelData.requirements };
                                                    const oldKey = key;
                                                    const value = newReqs[oldKey];
                                                    delete newReqs[oldKey];
                                                    newReqs[e.target.value] = value;
                                                    setEditingLevelData({ ...editingLevelData, requirements: newReqs });
                                                }}
                                            />
                                            <input
                                                type="text"
                                                value={req.quantity}
                                                placeholder="Quantity"
                                                className="w-28 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-white outline-none focus:border-violet-500/50"
                                                onChange={(e) => {
                                                    const newReqs = { ...editingLevelData.requirements };
                                                    newReqs[key] = { quantity: e.target.value };
                                                    setEditingLevelData({ ...editingLevelData, requirements: newReqs });
                                                }}
                                            />
                                            <button
                                                onClick={() => {
                                                    const newReqs = { ...editingLevelData.requirements };
                                                    delete newReqs[key];
                                                    setEditingLevelData({ ...editingLevelData, requirements: newReqs });
                                                }}
                                                className="p-1 text-gray-500 hover:text-red-400 transition-colors"
                                            >
                                                <FiX className="h-3.5 w-3.5" />
                                            </button>
                                        </div>
                                    ))}
                                    <button
                                        onClick={() => {
                                            const newReqs = { ...editingLevelData.requirements };
                                            const newKey = `REQUIREMENT_${Date.now()}`;
                                            newReqs[newKey] = { quantity: "0" };
                                            setEditingLevelData({ ...editingLevelData, requirements: newReqs });
                                        }}
                                        className="text-xs text-violet-400 hover:text-violet-300 transition-colors flex items-center gap-1"
                                    >
                                        <FiPlus className="h-3 w-3" /> Add Requirement
                                    </button>
                                </div>
                            </div>
                        </div>

                        <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-white/10">
                            <button
                                onClick={closeLevelModal}
                                className="rounded-lg border border-white/10 px-4 py-2 text-xs text-gray-400 hover:bg-white/5 transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={saveUserLevel}
                                className="rounded-lg bg-gradient-to-r from-violet-600 to-cyan-500 px-4 py-2 text-xs font-medium text-white shadow-lg shadow-violet-600/20 hover:shadow-violet-600/30 transition-all"
                            >
                                {isNewLevel ? "Create Level" : "Save Changes"}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}