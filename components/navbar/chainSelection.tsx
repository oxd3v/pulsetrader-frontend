import { useState, useRef, useEffect } from "react";
import { chainConfig } from "@/constants/common/chain";
import { FiChevronDown } from "react-icons/fi";
import Image from "next/image";

export default function ChainSelection({
  selectChain,
  setSelectChain,
  pathName
}: {
  selectChain: number;
  setSelectChain: (c: number) => void;
  pathName: any
}) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const filterChain = Object.values(chainConfig)
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const activeChain = chainConfig[selectChain];
  

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-1.5 bg-gray-200 dark:bg-white/5 hover:bg-gray-200 dark:hover:bg-white/10 rounded-xl transition-all border border-gray-200 dark:border-white/10"
      >
        {activeChain?.imageUrl && (
          <img
            src={activeChain.imageUrl}
            alt={activeChain.name}
            className="w-5 h-5 rounded-full object-contain"
          />
        )}
        <span className="text-sm font-bold text-gray-700 dark:text-gray-200 hidden md:block">
          {activeChain?.name}
        </span>
        <FiChevronDown className={`w-4 h-4 text-gray-500 transition-transform ${isOpen ? "rotate-180" : ""}`} />
      </button>

      {isOpen && (
        <div className="absolute top-full right-0 mt-2 w-52 bg-white dark:bg-gray-900 border border-gray-200 dark:border-white/10 rounded-2xl shadow-2xl overflow-hidden z-50">
          <div className="p-1">
            {filterChain.filter(c => c.isActive == true).map((chain: any) => (
              <button
                key={chain.chainId}
                onClick={() => {
                  setSelectChain(chain.chainId);
                  setIsOpen(false);
                }}
                className={`w-full flex items-center gap-3 px-3 py-2.5 text-sm rounded-xl transition-colors ${selectChain === chain.chainId
                  ? "bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 font-bold"
                  : "text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-white/5"
                  }`}
              >
                <img src={chain.imageUrl} alt="" className="w-6 h-6 rounded-full object-contain bg-white/10 p-0.5" />
                <span className="flex-1 text-left">{chain.name}</span>
                {selectChain === chain.chainId && (
                  <div className="w-2 h-2 bg-blue-500 rounded-full" />
                )}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}