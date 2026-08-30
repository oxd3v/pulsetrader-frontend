import InfoTooltip from "./BoxTooltip";

interface ReEntranceInputProps {
    isReEntrance: boolean;
    setIsReEntrance: (value: boolean) => void;
    reEntrancePercentage: number;
    setReEntrancePercentage: (value: number) => void;
}

const ReEntranceInput = ({
    isReEntrance,
    setIsReEntrance,
    reEntrancePercentage,
    setReEntrancePercentage,
}: ReEntranceInputProps) => {
    return (
        <div className="space-y-3 p-3 bg-gray-100 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between">
                <label className="flex items-center text-sm font-medium text-gray-700 dark:text-gray-200">
                    Re-Entrance Mode
                    <InfoTooltip
                        id="reentrance-tooltip"
                        content="Automatically re-enter position after being stopped out"
                    />
                </label>
                <label className="relative inline-flex items-center cursor-pointer">
                    <input
                        type="checkbox"
                        checked={isReEntrance}
                        onChange={(e) => setIsReEntrance(e.target.checked)}
                        className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
                </label>
            </div>
        </div>
    );
};

export default ReEntranceInput;