import { useState, useEffect } from "react";
import InfoTooltip from "./BoxTooltip";
import { MAX_GRID_NUMBER } from "@/constants/common/order";

interface GridInputProps {
  gridValue: number;
  onChange: (value: number) => void;
  user: any;
}

const GridInput = ({ gridValue, onChange, user }: GridInputProps) => {
  const [inputValue, setInputValue] = useState(String(gridValue));
  const maxGrid = user?.status === "admin" ? 20 : MAX_GRID_NUMBER;

  // Sync local state when prop changes (e.g., reset from parent)
  useEffect(() => {
    setInputValue(String(gridValue));
  }, [gridValue]);

  const handleBlur = () => {
    let num = parseFloat(inputValue);
    if (isNaN(num) || num < 1) num = 1;
    if (num > maxGrid) num = maxGrid;
    onChange(num);
  };

  return (
    <div className="space-y-1 md:space-y-2">
      <label className="flex items-center text-sm font-medium text-gray-700 dark:text-gray-200">
        Grid Number
        <InfoTooltip
          id="grid-number-tooltip"
          content="Number of grid levels for your trade"
        />
      </label>
      <input
        type="number"
        min="1"
        max={maxGrid}
        value={inputValue}
        onChange={(e) => setInputValue(e.target.value)}
        onBlur={handleBlur}
        className={`w-full px-3 py-2 bg-white dark:bg-gray-800 border ${
          user?.status !== "admin" && Number(gridValue) > maxGrid
            ? "border-red-500"
            : "border-gray-200 dark:border-gray-700"
        } rounded-lg text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500`}
      />
      <div className="text-xs text-gray-500">Max: {maxGrid} grids</div>
    </div>
  );
};

export default GridInput;