"use client";
import { useState } from "react";
import { FiLock, FiEye, FiEyeOff, FiShield } from "react-icons/fi";

type Props = {
    onVerified: (systemData: any) => void;
    onError: (msg: string) => void;
    verifyFn: (password: string) => Promise<any>;
};

export default function AdminPasswordGate({ onVerified, onError, verifyFn }: Props) {
    const [password, setPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!password.trim()) {
            setError("Password is required");
            return;
        }
        setLoading(true);
        setError("");
        try {
            const res = await verifyFn(password);
            if (res?.success) {
                onVerified(res.data);
            } else {
                const msg = res?.message === "INVALID_PASSWORD" ? "Invalid admin password" : (res?.message || "Verification failed");
                setError(msg);
                onError(msg);
            }
        } catch (err: any) {
            const msg = err?.message === "INVALID_PASSWORD" ? "Invalid admin password" : (err?.message || "Verification failed");
            setError(msg);
            onError(msg);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-[80vh] flex items-center justify-center px-4">
            <div className="relative w-full max-w-md">
                {/* Glow effects */}
                <div className="absolute -inset-1 rounded-2xl bg-gradient-to-r from-violet-600/30 via-cyan-500/30 to-violet-600/30 blur-2xl opacity-70 animate-pulse" />

                <form
                    onSubmit={handleSubmit}
                    className="relative rounded-2xl border border-white/10 bg-gray-900/80 backdrop-blur-xl p-8 shadow-2xl"
                >
                    {/* Icon */}
                    <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-violet-600 to-cyan-500 shadow-lg shadow-violet-600/25">
                        <FiShield className="h-8 w-8 text-white" />
                    </div>

                    <h2 className="text-center text-2xl font-bold text-white mb-1">
                        Admin Access
                    </h2>
                    <p className="text-center text-sm text-gray-400 mb-8">
                        Enter your admin password to continue
                    </p>

                    {/* Password input */}
                    <div className="relative mb-4">
                        <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">
                            <FiLock className="h-4 w-4" />
                        </div>
                        <input
                            type={showPassword ? "text" : "password"}
                            value={password}
                            onChange={e => setPassword(e.target.value)}
                            placeholder="Enter admin password"
                            autoFocus
                            className="w-full rounded-xl border border-white/10 bg-white/5 py-3 pl-10 pr-12 text-white placeholder-gray-500 outline-none transition-all focus:border-violet-500/50 focus:ring-2 focus:ring-violet-500/20 text-sm"
                        />
                        <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 transition-colors"
                        >
                            {showPassword ? <FiEyeOff className="h-4 w-4" /> : <FiEye className="h-4 w-4" />}
                        </button>
                    </div>

                    {/* Error */}
                    {error && (
                        <div className="mb-4 rounded-lg bg-red-500/10 border border-red-500/20 px-4 py-2.5 text-sm text-red-400 flex items-center gap-2">
                            <span className="h-1.5 w-1.5 rounded-full bg-red-500 shrink-0" />
                            {error}
                        </div>
                    )}

                    {/* Submit */}
                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full rounded-xl bg-gradient-to-r from-violet-600 to-cyan-500 py-3 text-sm font-semibold text-white shadow-lg shadow-violet-600/25 transition-all hover:shadow-violet-600/40 hover:brightness-110 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {loading ? (
                            <span className="flex items-center justify-center gap-2">
                                <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                                Verifying...
                            </span>
                        ) : (
                            "Unlock Dashboard"
                        )}
                    </button>
                </form>
            </div>
        </div>
    );
}