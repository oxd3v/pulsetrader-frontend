"use client";
import { useState, useEffect, useCallback, useRef } from "react";
import { FiTrash2, FiFile, FiArrowLeft, FiRefreshCw, FiChevronDown } from "react-icons/fi";
import AdminService from "@/service/admin-service";
import toast from "react-hot-toast";

type LogFile = {
    name: string;
    size: number;
    sizeFormatted: string;
    date: string;
    modifiedAt: string;
};

export default function AdminLogsPanel() {
    const [files, setFiles] = useState<LogFile[]>([]);
    const [loading, setLoading] = useState(false);
    const [selectedFile, setSelectedFile] = useState<string | null>(null);
    const [logContent, setLogContent] = useState("");
    const [logMeta, setLogMeta] = useState<any>(null);
    const [contentLoading, setContentLoading] = useState(false);
    const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
    const logEndRef = useRef<HTMLDivElement>(null);

    const fetchFiles = useCallback(async () => {
        setLoading(true);
        try {
            const res = await AdminService.getLogFiles();
            if (res?.success && res?.data?.files) {
                setFiles(res.data.files);
            }
        } catch (err) {
            console.error("Failed to fetch log files:", err);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchFiles();
    }, [fetchFiles]);

    const viewFile = async (filename: string) => {
        setSelectedFile(filename);
        setContentLoading(true);
        setLogContent("");
        try {
            const res = await AdminService.getLogContent(filename, 1000);
            if (res?.success && res?.data) {
                setLogContent(res.data.content || "");
                setLogMeta(res.data);
                setTimeout(() => logEndRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
            }
        } catch {
            toast.error("Failed to load log file");
        } finally {
            setContentLoading(false);
        }
    };

    const deleteFile = async (filename: string) => {
        try {
            const res = await AdminService.deleteLogFile(filename);
            if (res?.success) {
                toast.success(`Deleted ${filename}`);
                setFiles((prev) => prev.filter((f) => f.name !== filename));
                if (selectedFile === filename) {
                    setSelectedFile(null);
                    setLogContent("");
                    setLogMeta(null);
                }
            } else {
                toast.error(res?.message || "Failed to delete");
            }
        } catch {
            toast.error("Failed to delete log file");
        } finally {
            setDeleteConfirm(null);
        }
    };

    const colorizeLogLine = (line: string) => {
        if (!line.trim()) return null;
        let color = "text-gray-400";
        if (line.includes("[ERROR]")) color = "text-red-400";
        else if (line.includes("[WARN]")) color = "text-amber-400";
        else if (line.includes("[HIGHLIGHT]")) color = "text-cyan-400";
        else if (line.includes("[DEBUG]")) color = "text-gray-600";
        else if (line.includes("[INFO]")) color = "text-emerald-400";
        return color;
    };

    if (!selectedFile) {
        return (
            <div className="space-y-4">
                <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-white">
                        Log Files
                        <span className="ml-2 text-xs text-gray-500 font-normal">({files.length} files)</span>
                    </h3>
                    <button
                        onClick={fetchFiles}
                        disabled={loading}
                        className="flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs text-gray-400 hover:border-white/20 hover:text-white transition-all disabled:opacity-50"
                    >
                        <FiRefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
                        Refresh
                    </button>
                </div>

                {loading && files.length === 0 ? (
                    <div className="flex items-center justify-center py-16 text-gray-500 text-sm">
                        <span className="inline-block h-5 w-5 animate-spin rounded-full border-2 border-gray-600 border-t-violet-500 mr-2" />
                        Loading...
                    </div>
                ) : files.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-16 text-gray-600">
                        <FiFile className="h-10 w-10 mb-3" />
                        <span className="text-sm">No log files found</span>
                    </div>
                ) : (
                    <div className="space-y-2">
                        {files.map((file) => (
                            <div
                                key={file.name}
                                className="group flex items-center justify-between rounded-xl border border-white/10 bg-white/[0.02] px-4 py-3 hover:border-white/20 hover:bg-white/[0.04] transition-all cursor-pointer"
                                onClick={() => viewFile(file.name)}
                            >
                                <div className="flex items-center gap-3">
                                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-violet-500/10 text-violet-400">
                                        <FiFile className="h-4 w-4" />
                                    </div>
                                    <div>
                                        <div className="text-sm text-white font-medium group-hover:text-violet-300 transition-colors">
                                            {file.date}
                                        </div>
                                        <div className="text-[11px] text-gray-500">
                                            {file.sizeFormatted} · {file.name}
                                        </div>
                                    </div>
                                </div>

                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setDeleteConfirm(file.name);
                                    }}
                                    className="rounded-lg p-2 text-gray-600 hover:text-red-400 hover:bg-red-500/10 opacity-0 group-hover:opacity-100 transition-all"
                                >
                                    <FiTrash2 className="h-4 w-4" />
                                </button>

                                {deleteConfirm === file.name && (
                                    <div
                                        className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
                                        onClick={() => setDeleteConfirm(null)}
                                    >
                                        <div
                                            className="rounded-xl border border-white/10 bg-gray-900 p-6 shadow-2xl max-w-sm w-full mx-4"
                                            onClick={(e) => e.stopPropagation()}
                                        >
                                            <h4 className="text-sm font-semibold text-white mb-2">Delete Log File</h4>
                                            <p className="text-xs text-gray-400 mb-5">
                                                Are you sure you want to delete <span className="text-white font-medium">{file.name}</span>?
                                                This action cannot be undone.
                                            </p>
                                            <div className="flex justify-end gap-2">
                                                <button
                                                    onClick={() => setDeleteConfirm(null)}
                                                    className="rounded-lg border border-white/10 px-4 py-2 text-xs text-gray-400 hover:bg-white/5 transition-colors"
                                                >
                                                    Cancel
                                                </button>
                                                <button
                                                    onClick={() => deleteFile(file.name)}
                                                    className="rounded-lg bg-red-600 px-4 py-2 text-xs font-medium text-white hover:bg-red-500 transition-colors"
                                                >
                                                    Delete
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </div>
        );
    }

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => {
                            setSelectedFile(null);
                            setLogContent("");
                            setLogMeta(null);
                        }}
                        className="rounded-lg border border-white/10 p-2 text-gray-400 hover:bg-white/5 hover:text-white transition-all"
                    >
                        <FiArrowLeft className="h-4 w-4" />
                    </button>
                    <div>
                        <h3 className="text-sm font-semibold text-white">{selectedFile}</h3>
                        {logMeta && (
                            <p className="text-[11px] text-gray-500">
                                {logMeta.totalLines} total lines · {logMeta.sizeFormatted} · Showing last {logMeta.returnedLines} lines
                            </p>
                        )}
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => logEndRef.current?.scrollIntoView({ behavior: "smooth" })}
                        className="flex items-center gap-1 rounded-lg border border-white/10 px-3 py-1.5 text-xs text-gray-400 hover:text-white transition-colors"
                    >
                        <FiChevronDown className="h-3.5 w-3.5" />
                        Bottom
                    </button>
                    <button
                        onClick={() => viewFile(selectedFile!)}
                        disabled={contentLoading}
                        className="flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-gray-400 hover:text-white transition-all disabled:opacity-50"
                    >
                        <FiRefreshCw className={`h-3.5 w-3.5 ${contentLoading ? "animate-spin" : ""}`} />
                        Reload
                    </button>
                </div>
            </div>

            {contentLoading ? (
                <div className="flex items-center justify-center py-16 text-gray-500 text-sm">
                    <span className="inline-block h-5 w-5 animate-spin rounded-full border-2 border-gray-600 border-t-violet-500 mr-2" />
                    Loading log content...
                </div>
            ) : (
                <div className="rounded-xl border border-white/10 bg-gray-950/80 overflow-hidden">
                    <div className="max-h-[65vh] overflow-y-auto overflow-x-auto p-4 font-mono text-[11px] leading-5">
                        {logContent.split("\n").map((line, i) => {
                            const color = colorizeLogLine(line);
                            if (!color) return null;
                            return (
                                <div
                                    key={i}
                                    className={`${color} hover:bg-white/[0.03] px-1 rounded whitespace-pre-wrap break-all`}
                                >
                                    <span className="text-gray-700 select-none mr-3 inline-block w-[35px] text-right">
                                        {i + 1}
                                    </span>
                                    {line}
                                </div>
                            );
                        })}
                        <div ref={logEndRef} />
                    </div>
                </div>
            )}
        </div>
    );
}