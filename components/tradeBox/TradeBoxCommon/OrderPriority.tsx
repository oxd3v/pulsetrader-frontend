interface OrderPriorityProps {
    priority: number;
    setPriority: (value: number) => void;
    user: any;
}

const OrderPriority = ({
    priority,
    setPriority,
    user
}: OrderPriorityProps) => {
    const priorityOptions = [
        { value: 2, label: "Degen", description: "Degen mode – trades even with higher slippage and uses reserved network fee if needed." },
        { value: 1, label: "Standard", description: "Normal execution – reverts if network fee exceeds, with low slippage." }
    ];
    
    return (
        <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-200">
                Order Priority
            </label>
            <select
                value={priority}
                onChange={(e) => setPriority(parseInt(e.target.value))}
                className="w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
                {priorityOptions.map(option => (
                    <option key={option.value} value={option.value}>
                        {option.label}
                    </option>
                ))}
            </select>
            <div className="mt-1 text-xs text-gray-500">
                {priorityOptions.find(opt => opt.value === priority)?.description}
            </div>
        </div>
    );
};

export default OrderPriority;