import { useState } from "react";
import { FiInfo } from "react-icons/fi";

const InfoTooltip = ({ id, content }: { id: string; content: string }) => {
    const [show, setShow] = useState(false);
    
    return (
        <div className="relative inline-block ml-1">
            <button
                type="button"
                onMouseEnter={() => setShow(true)}
                onMouseLeave={() => setShow(false)}
                className="text-gray-400 hover:text-gray-600"
            >
                <FiInfo size={14} />
            </button>
            {show && (
                <div className="absolute z-10 w-48 p-2 text-xs text-white bg-gray-800 rounded-lg shadow-lg bottom-full left-1/2 transform -translate-x-1/2 mb-1">
                    {content}
                    <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-4 border-transparent border-t-gray-800"></div>
                </div>
            )}
        </div>
    );
};

export default InfoTooltip;