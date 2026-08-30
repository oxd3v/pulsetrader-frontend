"use client";

import { useState, useEffect, useRef } from "react";
import {
  getNativeBalanceTransferForAnalytics,
  getWalletTokenTransferForAnalytics,
} from "@/lib/oracle/analytics";

interface DataPoint {
  date: string;
  value: number;
}

interface AnalyticsProps {
  address: string;
  chainId: number;
  onlyArea?: boolean;
}

const SimpleAreaChart = ({
  data,
  color = "#3b82f6",
  height = 180,
  showXAxis = false,
}: {
  data: DataPoint[];
  color?: string;
  height?: number;
  showXAxis?: boolean;
}) => {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  if (!data || data.length === 0) {
    return (
      <div
        className="flex items-center justify-center text-gray-400 text-xs italic"
        style={{ height }}
      >
        No data for this period
      </div>
    );
  }

  const WIDTH = 1000;
  const maxVal = Math.max(...data.map((d) => d.value)) || 1;
  const minVal = Math.min(...data.map((d) => d.value)) || 0;
  const range = maxVal - minVal || 1;

  const getY = (val: number) =>
    height - ((val - minVal) / range) * (height * 0.75) - height * 0.1;
  const getX = (i: number) => (i / (data.length - 1)) * WIDTH;

  const points = data.map((d, i) => `${getX(i)},${getY(d.value)}`).join(" ");
  const areaPath = `${points} ${WIDTH},${height} 0,${height}`;
  const gradId = `g-${color.replace("#", "")}`;

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const pct = (e.clientX - rect.left) / rect.width;
    setHoveredIndex(
      Math.min(Math.max(Math.round(pct * (data.length - 1)), 0), data.length - 1)
    );
  };

  return (
    <div
      ref={containerRef}
      className="relative w-full"
      style={{ height: height + (showXAxis ? 28 : 0) }}
      onMouseMove={handleMouseMove}
      onMouseLeave={() => setHoveredIndex(null)}
    >
      {hoveredIndex !== null && (
        <div
          className="absolute z-20 pointer-events-none bg-white dark:bg-[#1c1c22] border border-black/10 dark:border-white/10 px-2.5 py-1.5 rounded-xl shadow-lg text-[11px]"
          style={{
            left: `${(hoveredIndex / (data.length - 1)) * 100}%`,
            transform: `translateX(${hoveredIndex > data.length / 2 ? "-108%" : "8%"})`,
            top: 0,
          }}
        >
          <p className="text-gray-400 font-mono">{data[hoveredIndex].date}</p>
          <p className="font-black text-black dark:text-white">
            ${data[hoveredIndex].value.toLocaleString(undefined, { minimumFractionDigits: 2 })}
          </p>
        </div>
      )}
      <svg
        viewBox={`0 0 ${WIDTH} ${height}`}
        className="w-full"
        style={{ height }}
        preserveAspectRatio="none"
      >
        <defs>
          <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.25" />
            <stop offset="100%" stopColor={color} stopOpacity="0" />
          </linearGradient>
        </defs>
        <polygon points={areaPath} fill={`url(#${gradId})`} />
        <polyline
          points={points}
          fill="none"
          stroke={color}
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          vectorEffect="non-scaling-stroke"
        />
        {hoveredIndex !== null && (
          <line
            x1={getX(hoveredIndex)} y1="0"
            x2={getX(hoveredIndex)} y2={height}
            stroke={color} strokeWidth="1"
            strokeDasharray="4 3" strokeOpacity="0.5"
            vectorEffect="non-scaling-stroke"
          />
        )}
      </svg>
      {showXAxis && data.length > 0 && (
        <div className="flex justify-between text-[10px] text-gray-400 font-mono mt-2 px-1">
          <span>{data[0]?.date}</span>
          <span>{data[Math.floor(data.length / 2)]?.date}</span>
          <span>{data[data.length - 1]?.date}</span>
        </div>
      )}
    </div>
  );
};

export default function Analytics({ address, chainId, onlyArea = false }: AnalyticsProps) {
  const [tokensSent, setTokensSent] = useState<DataPoint[]>([]);
  const [tokensReceive, setTokensReceive] = useState<DataPoint[]>([]);
  const [dailyBalance, setDailyBalance] = useState<DataPoint[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      if (!address) return;
      setLoading(true);
      try {
        const [tokenTransfer, walletBalance] = await Promise.all([
          getWalletTokenTransferForAnalytics(address, chainId),
          getNativeBalanceTransferForAnalytics(address, chainId),
        ]);
        if (tokenTransfer) {
          setTokensSent(tokenTransfer.erc20TransfersFrom?.map((i: any) => ({ date: i[0], value: i[1] })) || []);
          setTokensReceive(tokenTransfer.erc20TransfersTo?.map((i: any) => ({ date: i[0], value: i[1] })) || []);
        }
        if (walletBalance) {
          setDailyBalance(walletBalance.map((i: any) => ({ date: i[0], value: i[1] })));
        }
      } catch (e) {
        console.error("Analytics fetch error:", e);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [address, chainId]);

  if (loading) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="h-48 bg-gray-100 dark:bg-white/5 rounded-2xl" />
        {!onlyArea && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="h-32 bg-gray-100 dark:bg-white/5 rounded-2xl" />
            <div className="h-32 bg-gray-100 dark:bg-white/5 rounded-2xl" />
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Main chart */}
      <div className={onlyArea ? "" : "bg-white dark:bg-[#13131a] border border-black/5 dark:border-white/5 rounded-2xl p-5"}>
        {!onlyArea && (
          <div className="mb-4">
            <h2 className="text-sm font-bold text-black dark:text-white">Native Balance History</h2>
            <p className="text-xs text-gray-500 mt-0.5">Portfolio performance over time</p>
          </div>
        )}
        <SimpleAreaChart data={dailyBalance} color="#3b82f6" height={onlyArea ? 140 : 220} showXAxis={!onlyArea} />
      </div>

      {!onlyArea && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="bg-white dark:bg-[#13131a] border border-black/5 dark:border-white/5 rounded-2xl p-5">
            <p className="text-xs font-bold text-emerald-500 uppercase tracking-widest mb-4">Tokens Received</p>
            <SimpleAreaChart data={tokensReceive} color="#10b981" height={120} showXAxis />
          </div>
          <div className="bg-white dark:bg-[#13131a] border border-black/5 dark:border-white/5 rounded-2xl p-5">
            <p className="text-xs font-bold text-rose-500 uppercase tracking-widest mb-4">Tokens Sent</p>
            <SimpleAreaChart data={tokensSent} color="#f43f5e" height={120} showXAxis />
          </div>
        </div>
      )}
    </div>
  );
}