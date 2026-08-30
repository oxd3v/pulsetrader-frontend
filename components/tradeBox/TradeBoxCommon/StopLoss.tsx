import { useState, useEffect, useRef } from "react";
import InfoTooltip from "./BoxTooltip";

interface StopLossInputProps {
  isTrailingMode: boolean;
  isActive: boolean;
  setIsActive: (value: boolean) => void;
  stopLossPercentage: number;
  setStopLossPercentage: (value: number) => void;
  notValid: boolean;
}

const StopLossInput = ({
  isTrailingMode,
  isActive,
  setIsActive,
  stopLossPercentage,
  setStopLossPercentage,
  notValid,
}: StopLossInputProps) => {
  const [inputValue, setInputValue] = useState(String(stopLossPercentage));
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setInputValue(String(stopLossPercentage));
  }, [stopLossPercentage]);

  const handleFocus = () => {
    inputRef.current?.select();
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    setInputValue(raw);
    let num = parseFloat(raw);
    if (isNaN(num) || raw.trim() === "") {
      num = 0;
    }
    if (num > 100) num = 100;
    if (num < 0) num = 0;
    setStopLossPercentage(num);
  };

  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseInt(e.target.value);
    setStopLossPercentage(val);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.currentTarget.blur();
    }
  };

  const fillPercentage = Math.min((stopLossPercentage / 50) * 100, 100);

  return (
    <div className="space-y-3 p-3 bg-gray-100 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
      <div className="flex items-center justify-between">
        <label className="flex items-center text-sm font-medium text-gray-700 dark:text-gray-200">
          {isTrailingMode && "Trailing"} Stop Loss
          <InfoTooltip
            id="sl-tooltip"
            content={
              isTrailingMode
                ? "Trailing stop loss percentage from highest profit"
                : "Fixed stop loss percentage from entry price"
            }
          />
        </label>
        <label className="relative inline-flex items-center cursor-pointer">
          <input
            type="checkbox"
            checked={isActive}
            onChange={(e) => setIsActive(e.target.checked)}
            className="sr-only peer"
          />
          <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
        </label>
      </div>

      {isActive && (
        <div className="flex items-center gap-3">
          <input
            type="range"
            min="0"
            max="50"
            step="1"
            value={stopLossPercentage}
            onChange={handleSliderChange}
            className="flex-1 h-2 rounded-lg appearance-none cursor-pointer transition-all"
            style={{
              backgroundImage: `linear-gradient(to right, #ef4444 0%, #ef4444 ${fillPercentage}%, #e5e7eb ${fillPercentage}%, #e5e7eb 100%)`,
              backgroundSize: "100% 100%",
              backgroundRepeat: "no-repeat",
            }}
          />
          <div className="w-24">
            <input
              ref={inputRef}
              type="number"
              min="0"
              max="100"
              step="1"
              value={inputValue}
              onChange={handleInputChange}
              onFocus={handleFocus}
              onKeyDown={handleKeyDown}
              className={`w-full px-2 py-1 text-sm bg-white dark:bg-gray-800 border ${notValid ? "border-red-500" : "border-gray-200 dark:border-gray-700"
                } rounded-lg text-gray-900 dark:text-white transition-all`}
            />
          </div>
          <span className="text-sm text-gray-600 dark:text-gray-400">%</span>
        </div>
      )}
      {notValid && (
        <div className="text-xs text-red-500">
          {isTrailingMode
            ? "Trailing stop loss requires a value greater than 0"
            : "Stop loss cannot be 0"}
        </div>
      )}
    </div>
  );
};

export default StopLossInput;