import { useState, useEffect } from "react";
import InfoTooltip from "./BoxTooltip";

interface NumberInputProps {
  inputLabel: string;
  toolTipMessage: string;
  value: number;
  onChange: (value: number) => void;
  notValid: boolean;
  min?: number;
  max?: number;
}

const NumberInput = ({
  inputLabel,
  toolTipMessage,
  value,
  onChange,
  notValid,
  min = 1,
  max,
}: NumberInputProps) => {
  const [inputValue, setInputValue] = useState(String(value));

  useEffect(() => {
    setInputValue(String(value));
  }, [value]);

  const handleBlur = () => {
    let num = parseFloat(inputValue);
    if (isNaN(num) || num < min) num = min;
    if (max !== undefined && num > max) num = max;
    onChange(num);
  };

  return (
    <div className="space-y-1 md:space-y-2">
      <label className="flex items-center text-sm font-medium text-gray-700 dark:text-gray-200">
        {inputLabel}
        <InfoTooltip id={`${inputLabel}-tooltip`} content={toolTipMessage} />
      </label>
      <div className="flex gap-2">
        <input
          type="number"
          min={min}
          max={max}
          step="0.1"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onBlur={handleBlur}
          className={`flex-1 px-3 py-2 bg-white dark:bg-gray-800 border ${notValid ? "border-red-500" : "border-gray-200 dark:border-gray-700"
            } rounded-lg text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500`}
        />
      </div>
    </div>
  );
};

export default NumberInput;