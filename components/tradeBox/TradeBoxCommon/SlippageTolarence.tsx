import InfoTooltip from "./BoxTooltip";

interface SlippageInputProps {
    slippage: number;
    onChange: (value: number) => void;
}

const SlippageInput = ({ slippage, onChange }: SlippageInputProps) => {
    const presets = [0.5, 1, 3, 5];
    
    return (
        <div className="space-y-2">
            <label className="flex items-center text-sm font-medium text-gray-700 dark:text-gray-200">
                Slippage Tolerance
                <InfoTooltip
                    id="slippage-tooltip"
                    content="Maximum price slippage allowed for trade execution"
                />
            </label>
            <div className="flex gap-2">
                {presets.map((preset) => (
                    <button
                        key={preset}
                        type="button"
                        onClick={() => onChange(preset)}
                        className={`px-3 py-1 text-sm rounded-lg border ${slippage === preset ? 'bg-blue-500 text-white border-blue-500' : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600'}`}
                    >
                        {preset}%
                    </button>
                ))}
            </div>
            <div className="flex items-center gap-2">
                <input
                    type="number"
                    min="0.01"
                    max="100"
                    step="0.01"
                    value={slippage}
                    onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
                    className="flex-1 px-3 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <span className="text-sm text-gray-600 dark:text-gray-400">%</span>
            </div>
        </div>
    );
};

export default SlippageInput;