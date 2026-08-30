import { useEffect, useMemo, useState } from "react";
import InfoTooltip from "./BoxTooltip";
import { safeParseUnits, safeFormatNumber } from "@/utility/handy";
import { PRECISION_DECIMALS } from "@/constants/common/utils";

interface EntryPriceRenderingProps {
    setEntryPrice: (price: string) => void;
    label: string;
    tooltipText: string;
    tokenInfo: any;
    currentPriceUsd?: string;
}

const EntryPriceRendering = ({
    setEntryPrice,
    label,
    tooltipText,
    tokenInfo,
    currentPriceUsd,
}: EntryPriceRenderingProps) => {
    const [inputValue, setInputValue] = useState("");

    useEffect(() => {
        setInputValue("");
    }, [tokenInfo?.address]);

    const handleInputChange = (value: string) => {
        setInputValue(value);
        setEntryPrice(value);
    };

    const currentPrice = useMemo(() => {
        const safePrice = currentPriceUsd || tokenInfo?.priceUsd || "0";
        return safeFormatNumber(
            safeParseUnits(safePrice, PRECISION_DECIMALS).toString(),
            PRECISION_DECIMALS,
            8,
        ).toString();
    }, [currentPriceUsd, tokenInfo?.priceUsd]);

    return (
        <div className="space-y-2">
            <label className="flex items-center text-sm font-medium text-gray-700 dark:text-gray-200">
                {label}
                <InfoTooltip id={`${label}-text`} content={tooltipText} />
            </label>
            <div className="flex gap-2">
                <input
                    type="number"
                    min="0"
                    step="0.00000001"
                    value={inputValue}
                    onChange={(e) => handleInputChange(e.target.value)}
                    placeholder={`Current: ${currentPrice}`}
                    className="flex-1 px-3 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button
                    type="button"
                    onClick={() => handleInputChange(currentPrice)}
                    className="px-3 py-2 text-sm bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
                >
                    Current
                </button>
            </div>
        </div>
    );
};

export default EntryPriceRendering;