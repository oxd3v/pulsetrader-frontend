import { useEffect } from "react";
import toast from "react-hot-toast";
export default function OrderMode({
    orderMode,
    setOrderMode,
    isSpot,
    isSupporteduser,
}: {
    orderMode: 'Demo' | 'Live' | 'Testnet' | undefined;
    setOrderMode: (mode: 'Demo' | 'Live' | 'Testnet') => void;
    isSpot: boolean
    isSupporteduser: boolean;
}) {

    useEffect(() => {
        toast(`${orderMode} mode selected`)
    }, [orderMode])
    return (
        <div className="flex gap-1 bg-gray-200 dark:bg-gray-700 p-1 rounded-lg">
            <button
                onClick={() => setOrderMode("Live")}
                className={`px-3 py-1 text-xs font-medium rounded-md transition-all ${orderMode == "Live" ? "bg-white dark:bg-gray-800 shadow-md text-gray-900 dark:text-white" : "text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200"}`}
            >
                LIVE
            </button>
            {!isSpot && (<button
                onClick={() => setOrderMode("Testnet")}
                className={`px-3 py-1 text-xs font-medium rounded-md transition-all ${!isSupporteduser ? "pointer-events-none opacity-50 cursor-not-allowed" : ""} ${orderMode === 'Testnet' ? "bg-yellow-500 dark:bg-yellow-800 shadow-md text-white dark:text-white"
                    : "text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200"
                    }`}
            >
                Testnet
            </button>)}
            <button
                onClick={() => setOrderMode("Demo")}
                className={`px-3 py-1 text-xs font-medium rounded-md transition-all ${!isSupporteduser ? "pointer-events-none opacity-50 cursor-not-allowed" : ""} ${orderMode === "Demo" ? "bg-red-500 dark:bg-red-800 shadow-md text-white dark:text-white" : "text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200"}`}
            >
                Demo
            </button>
        </div>
    )
}