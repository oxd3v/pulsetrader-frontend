import { useEffect } from "react";

import InfoTooltip from "./BoxTooltip";

interface OrderNameValidationInputProps {
    name: string;
    onChange: (name: string) => void;
    isOrderNameValidate: boolean;
    setIsOrderNameValidate: (valid: boolean) => void;
    isConnected: boolean;
}

const OrderNameValidationInput = ({
    name,
    onChange,
    isOrderNameValidate,
    setIsOrderNameValidate,
    isConnected
}: OrderNameValidationInputProps) => {
    useEffect(() => {
        const isValid = name.trim().length > 0 && name.trim().length <= 50;
        setIsOrderNameValidate(isValid);
    }, [name, setIsOrderNameValidate]);

    return (
        <div className="space-y-2">
            <label className="flex items-center text-sm font-medium text-gray-700 dark:text-gray-200">
                Order Name
                <InfoTooltip
                    id="order-name-tooltip"
                    content="Give your order a unique name for easy identification"
                />
            </label>
            <input
                type="text"
                value={name}
                onChange={(e) => onChange(e.target.value)}
                placeholder="Enter order name (max 50 characters)"
                className={`w-full px-3 py-2 bg-white dark:bg-gray-900 border ${isOrderNameValidate || !isConnected ? 'border-gray-200 dark:border-gray-700' : 'border-red-500'} rounded-lg text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500`}
                maxLength={50}
            />
            {!isOrderNameValidate && isConnected && name.trim().length === 0 && (
                <div className="text-xs text-red-500">Order name is required</div>
            )}
            <div className="text-xs text-gray-500">
                {name.length}/50 characters
            </div>
        </div>
    );
};

export default OrderNameValidationInput;