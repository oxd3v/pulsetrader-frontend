import { useMemo, useState, useEffect, useRef } from "react";
import InfoTooltip from "./BoxTooltip";

interface TakeProfitInputProps {
  takeProfitPercentage: number;
  onTakeProfitPercentageChange: (value: number) => void;
  isTrailingMode: boolean;
  handleTrailingMode: (value: boolean) => void;
  initialOrderSize: string;
  collateralToken: any;
  trailingMode: boolean;
}

const TakeProfitInput = ({
  takeProfitPercentage,
  onTakeProfitPercentageChange,
  isTrailingMode,
  handleTrailingMode,
  initialOrderSize,
  collateralToken,
  trailingMode,
}: TakeProfitInputProps) => {
  const [inputValue, setInputValue] = useState(String(takeProfitPercentage));
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setInputValue(String(takeProfitPercentage));
  }, [takeProfitPercentage]);

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
    onTakeProfitPercentageChange(num);
  };

  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseInt(e.target.value);
    onTakeProfitPercentageChange(val);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.currentTarget.blur();
    }
  };

  const tpAmount = useMemo(() => {
    if (!initialOrderSize) return "0";
    const size = parseFloat(initialOrderSize);
    if (isNaN(size)) return "0";
    return (size * (takeProfitPercentage / 100)).toFixed(2);
  }, [initialOrderSize, takeProfitPercentage]);

  const fillPercentage = Math.min((takeProfitPercentage / 100) * 100, 100);

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="flex items-center text-sm font-medium text-gray-700 dark:text-gray-200">
          {isTrailingMode && "Trailing"} Take Profit
          <InfoTooltip
            id="tp-tooltip"
            content="Percentage profit target to close position"
          />
        </label>
        {trailingMode && (
          <div className="flex items-center gap-2">
            <label className="flex items-center text-xs text-gray-600 dark:text-gray-400">
              <input
                type="checkbox"
                checked={isTrailingMode}
                onChange={(e) => handleTrailingMode(e.target.checked)}
                className="w-4 h-4 mr-1 text-blue-500 bg-gray-100 border-gray-300 rounded focus:ring-blue-500"
              />
              Trailing Mode
            </label>
          </div>
        )}
      </div>
      <div className="flex items-center gap-3">
        <input
          type="range"
          min="0"
          max="100"
          step="1"
          value={takeProfitPercentage}
          onChange={handleSliderChange}
          className="flex-1 h-2 rounded-lg appearance-none cursor-pointer transition-all"
          style={{
            backgroundImage: `linear-gradient(to right, #22c55e 0%, #22c55e ${fillPercentage}%, #e5e7eb ${fillPercentage}%, #e5e7eb 100%)`,
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
            className="w-full px-2 py-1 text-sm bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white transition-all"
          />
        </div>
        <span className="text-sm text-gray-600 dark:text-gray-400">%</span>
      </div>
      <div className="text-xs text-gray-500">
        TP Amount: {tpAmount} {collateralToken.symbol}
      </div>
    </div>
  );
};

export default TakeProfitInput;