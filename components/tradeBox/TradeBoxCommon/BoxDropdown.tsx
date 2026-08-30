import { useState, useRef, useEffect } from 'react';
import { FiChevronDown, FiCheck } from 'react-icons/fi';

interface DropDownOption {
    label: React.ReactNode;
    value: any;
}

interface DropDownProps {
    options: DropDownOption[];
    onChange: (value: any) => void;
    value: any;
    placeholder?: string;
    className?: string;
}

const DropDown = ({
    options,
    onChange,
    value,
    placeholder = "Select...",
    className = ""
}: DropDownProps) => {
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    const selectedOption = options.find((opt) => {
        const a = opt.value?.address?.toLowerCase?.();
        const b = value?.address?.toLowerCase?.();
        if (a && b && a === b) return true;
        return opt.value === value;
    });

    // Close dropdown on outside click
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Close on escape key
    useEffect(() => {
        const handleEscape = (event: KeyboardEvent) => {
            if (event.key === 'Escape' && isOpen) {
                setIsOpen(false);
            }
        };
        document.addEventListener('keydown', handleEscape);
        return () => document.removeEventListener('keydown', handleEscape);
    }, [isOpen]);

    return (
        <div className={`relative ${className}`} ref={dropdownRef}>
            <button
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                className={`
                    flex items-center justify-between w-full px-4 py-2.5 
                    bg-white dark:bg-gray-800 
                    border border-gray-200 dark:border-gray-700 
                    rounded-xl 
                    text-gray-700 dark:text-gray-200 
                    text-sm font-medium
                    hover:border-gray-300 dark:hover:border-gray-600 
                    focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500
                    transition-all duration-200 
                    ${isOpen ? 'ring-2 ring-blue-500/50 border-blue-500' : ''}
                `}
            >
                <div className="flex items-center gap-2 truncate">
                    {selectedOption?.label || (
                        <span className="text-gray-400 dark:text-gray-500">{placeholder}</span>
                    )}
                </div>
                <FiChevronDown
                    className={`
                        w-4 h-4 text-gray-400 dark:text-gray-500 
                        transition-transform duration-200 flex-shrink-0
                        ${isOpen ? 'rotate-180' : ''}
                    `}
                />
            </button>

            {isOpen && (
                <div
                    className="
                        absolute z-50 w-full mt-1.5 
                        bg-white dark:bg-gray-800 
                        border border-gray-200 dark:border-gray-700 
                        rounded-xl shadow-lg 
                        overflow-hidden
                        animate-in fade-in-0 zoom-in-95 duration-200
                    "
                >
                    <div className="max-h-60 overflow-y-auto py-1 scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-600">
                        {options.map((option, index) => {
                            const isSelected = option.value === value ||
                                (option.value?.address && value?.address &&
                                    option.value.address.toLowerCase() === value.address.toLowerCase());

                            return (
                                <button
                                    key={index}
                                    type="button"
                                    onClick={() => {
                                        onChange(option.value);
                                        setIsOpen(false);
                                    }}
                                    className={`
                                        w-full px-4 py-2.5 
                                        flex items-center justify-between
                                        text-left text-sm 
                                        text-gray-700 dark:text-gray-200 
                                        hover:bg-gray-50 dark:hover:bg-gray-700/50
                                        transition-colors duration-150
                                        ${isSelected ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300' : ''}
                                        ${index === 0 ? 'rounded-t-xl' : ''}
                                        ${index === options.length - 1 ? 'rounded-b-xl' : ''}
                                    `}
                                >
                                    <span className="truncate">{option.label}</span>
                                    {isSelected && (
                                        <FiCheck className="w-4 h-4 text-blue-500 dark:text-blue-400 flex-shrink-0 ml-2" />
                                    )}
                                </button>
                            );
                        })}
                    </div>
                </div>
            )}
        </div>
    );
};

export default DropDown;