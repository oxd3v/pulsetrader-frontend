import { useMemo, useState, useEffect, useRef } from "react";
import InfoTooltip from "./BoxTooltip";

interface LeverageInputProps {
  leverage: number;
  onLeverageChange: (value: number) => void;
  maxLeverage?: number;
}

const LeverageInput = ({
  leverage,
  onLeverageChange,
  maxLeverage,
}: LeverageInputProps) => {
  const resolvedMaxLeverage = useMemo(() => {
    const parsedMax = Number(maxLeverage);
    if (!Number.isFinite(parsedMax) || parsedMax <= 0) {
      return 50;
    }
    return Math.max(1, Math.floor(parsedMax));
  }, [maxLeverage]);

  const [inputValue, setInputValue] = useState(String(leverage));
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setInputValue(String(leverage));
  }, [leverage]);

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
    if (num > resolvedMaxLeverage) num = resolvedMaxLeverage;
    if (num < 0) num = 0;
    onLeverageChange(num);
  };

  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseInt(e.target.value);
    onLeverageChange(val);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.currentTarget.blur();
    }
  };

  const fillPercentage = Math.min(
    (leverage / resolvedMaxLeverage) * 100,
    100
  );

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="flex items-center text-sm font-medium text-gray-700 dark:text-gray-200">
          Leverage
          <InfoTooltip
            id="leverage-tooltip"
            content="Leverage to use for the position"
          />
        </label>
      </div>
      <div className="flex items-center gap-3">
        <input
          type="range"
          min="0"
          max={resolvedMaxLeverage}
          step="1"
          value={leverage}
          onChange={handleSliderChange}
          className="flex-1 h-2 rounded-lg appearance-none cursor-pointer transition-all"
          style={{
            backgroundImage: `linear-gradient(to right, #3b82f6 0%, #3b82f6 ${fillPercentage}%, #e5e7eb ${fillPercentage}%, #e5e7eb 100%)`,
            backgroundSize: "100% 100%",
            backgroundRepeat: "no-repeat",
          }}
        />
        <div className="w-24">
          <input
            ref={inputRef}
            type="number"
            min="0"
            max={resolvedMaxLeverage}
            step="1"
            value={inputValue}
            onChange={handleInputChange}
            onFocus={handleFocus}
            onKeyDown={handleKeyDown}
            className="w-full px-2 py-1 text-sm bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white transition-all"
          />
        </div>
        <span className="text-sm text-gray-600 dark:text-gray-400">X</span>
      </div>
    </div>
  );
};

export default LeverageInput;