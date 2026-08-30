import toast from "react-hot-toast";

export const getCopied = (textToCopy: string, label: string) => {
  navigator.clipboard.writeText(textToCopy);
  toast(`${label} copied!`)
}
export const getRandomByRange = (min: number, max: number) => {
  return Math.floor(Math.random() * (max - min + 1) + min);
}




import { formatUnits, parseUnits } from "ethers";


export const formatCustomizeTime = (timeInMongodb: any) => {
  if (!timeInMongodb) return "";
  const now = new Date().getTime();
  const diff = now - new Date(timeInMongodb).getTime();
  const minutes = Math.floor(diff / (1000 * 60));
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));

  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;
  return new Date(timeInMongodb).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

export const formateDuration = (timestamp: number): string => {
  const current = Math.floor(Date.now() / 1000);

  // FIX: Prevent negative intervals caused by clock drift
  const interval = Math.max(0, current - timestamp);

  // Time constants in seconds
  const MINUTE = 60;
  const HOUR = MINUTE * 60;
  const DAY = HOUR * 24;
  const MONTH = DAY * 30;
  const YEAR = MONTH * 12;

  // Format time differences with proper rounding
  if (interval < MINUTE) {
    // Return "just now" for zero to make the UI look better
    return interval === 0 ? 'just now' : `${Math.floor(interval)}s ago`;
  } else if (interval < HOUR) {
    return `${Math.floor(interval / MINUTE)}m ago`;
  } else if (interval < DAY) {
    return `${Math.floor(interval / HOUR)}h ago`;
  } else if (interval < MONTH) {
    return `${Math.floor(interval / DAY)}d ago`;
  } else if (interval < YEAR) {
    return `${Math.floor(interval / MONTH)}mo ago`;
  } else {
    // For timestamps older than a year, show the full date
    return new Date(timestamp * 1000).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric"
    });
  }
};

export const formateTime = (timestamp: number): string => {
  if (!Number.isFinite(timestamp) || timestamp <= 0) return '--:--:--';

  const date = new Date(timestamp);
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const seconds = String(date.getSeconds()).padStart(2, '0');

  return `${hours}:${minutes}:${seconds}`;
};



export const formateAmountWithFixedDecimals = (
  value: any,
  decimals: number,
  maxDecimalToShow: number
) => {
  // Format the number with commas and two decimal places
  let rounded = parseFloat(
    Number(formatUnits(value, decimals)).toFixed(maxDecimalToShow)
  );


  // Convert to string and remove trailing zeros after decimal
  const [intPart, decPart] = rounded.toString().split(".");

  if (!decPart || maxDecimalToShow === 0) return intPart;

  // Trim trailing zeros but keep up to decimalPlaces
  const trimmedDec = decPart.replace(/0+$/, "");

  return trimmedDec ? `${intPart}.${trimmedDec}` : intPart;
};

// 1. Cache the formatters outside the function for high performance in large lists/tables
const formatters = {
  // For big numbers: 1,234.5 (Max 1 decimal, drops .0)
  large: new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 1,
  }),

  // For normal numbers: 1.2345 (Max 4 decimals, drops trailing zeros)
  standard: new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 4,
  }),

  // For tiny crypto dust: 0.00000000152 (Uses significant digits)
  micro: new Intl.NumberFormat('en-US', {
    maximumSignificantDigits: 4,
  }),
};

export const formatPrice = (value: string | number): string => {
  // Replace this with your actual toFiniteNumber helper if it includes extra safety
  const price = Number(value);

  // Safely handle NaN or strict 0
  if (Number.isNaN(price) || price === 0) return '0.00';

  const absPrice = Math.abs(price); // Use absolute value so negative PNL works perfectly

  if (absPrice >= 1000) {
    return formatters.large.format(price);
  }

  if (absPrice >= 0.0001) {
    return formatters.standard.format(price);
  }

  return formatters.micro.format(price);
};

export const toFiniteNumber = (value: unknown): number => {
  const numericValue = Number(value);
  return Number.isFinite(numericValue) ? numericValue : 0;
};

export const formatCompactNumber = (num: string | number, decimals: number = 2): string => {
  const n = toFiniteNumber(num);
  if (n <= 0) return '0.00';

  if (n >= 1e9) {
    return `${(n / 1e9).toFixed(decimals)}B`;
  }
  if (n >= 1e6) {
    return `${(n / 1e6).toFixed(decimals)}M`;
  }
  if (n >= 1e3) {
    return `${(n / 1e3).toFixed(decimals)}K`;
  }
  return n.toFixed(decimals);
};

// Wallet address validation
export const isValidWalletAddress = (address: string): boolean => {
  if (!address || typeof address !== "string") {
    return false;
  }

  // Check if it's a valid Ethereum address format
  const ethereumAddressRegex = /^0x[a-fA-F0-9]{40}$/;
  return ethereumAddressRegex.test(address);
};

// Token validation (basic format check)
export const isValidTokenFormat = (token: string): boolean => {
  if (!token || typeof token !== "string") {
    return false;
  }

  // Basic check for base64 encoded string
  const base64Regex = /^[A-Za-z0-9+/]*={0,2}$/;
  return base64Regex.test(token) && token.length > 10;
};

// Invitation code validation
export const isValidInvitationCode = (code: string): boolean => {
  if (!code || typeof code !== "string") {
    return false;
  }

  // Remove whitespace and check length
  const trimmedCode = code.trim();

  return trimmedCode.length >= 6 && trimmedCode.length <= 160;
};

// Email validation
export const isValidEmail = (email: string): boolean => {
  if (!email || typeof email !== "string") {
    return false;
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

interface PasswordValidationResult {
  isValid: boolean;
  message: string;
}

// Password strength validation
export const validatePasswordStrength = (password: string): PasswordValidationResult => {
  if (!password || typeof password !== "string") {
    return { isValid: false, message: "Password is required" };
  }

  const minLength = 8;
  const hasUpperCase = /[A-Z]/.test(password);
  const hasLowerCase = /[a-z]/.test(password);
  const hasNumbers = /\d/.test(password);
  const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);

  if (password.length < minLength) {
    return {
      isValid: false,
      message: `Password must be at least ${minLength} characters long`,
    };
  }

  if (!hasUpperCase) {
    return {
      isValid: false,
      message: "Password must contain at least one uppercase letter",
    };
  }

  if (!hasLowerCase) {
    return {
      isValid: false,
      message: "Password must contain at least one lowercase letter",
    };
  }

  if (!hasNumbers) {
    return {
      isValid: false,
      message: "Password must contain at least one number",
    };
  }

  if (!hasSpecialChar) {
    return {
      isValid: false,
      message: "Password must contain at least one special character",
    };
  }

  return { isValid: true, message: "Password is strong" };
};

// Number validation
export const isValidNumber = (value: number | string, min: number | null = null, max: number | null = null): boolean => {
  const num = parseFloat(value as string);

  if (isNaN(num)) {
    return false;
  }

  if (min !== null && num < min) {
    return false;
  }

  if (max !== null && num > max) {
    return false;
  }

  return true;
};

// URL validation
export const isValidUrl = (url: string): boolean => {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
};

// Phone number validation (basic)
export const isValidPhoneNumber = (phone: string): boolean => {
  if (!phone || typeof phone !== "string") {
    return false;
  }

  // Remove all non-digit characters
  const digitsOnly = phone.replace(/\D/g, "");

  // Check if it has 10-15 digits (international format)
  return digitsOnly.length >= 10 && digitsOnly.length <= 15;
};

// Trim and validate input
export const sanitizeInput = (input: string, maxLength: number = 1000): string => {
  if (typeof input !== "string") {
    return "";
  }

  // Trim whitespace
  let sanitized = input.trim();

  // Limit length
  if (sanitized.length > maxLength) {
    sanitized = sanitized.substring(0, maxLength);
  }

  return sanitized;
};

interface ValidationRule {
  required?: boolean;
  type?: 'email' | 'wallet' | 'token' | 'number';
  min?: number;
  max?: number;
  minLength?: number;
  maxLength?: number;
  custom?: (value: any, data: Record<string, any>) => boolean | string;
}

interface ValidationResult {
  isValid: boolean;
  errors: Record<string, string>;
}

// Validate form data
// export const validateFormData = (data: Record<string, any>, rules: Record<string, ValidationRule>): ValidationResult => {
//   const errors: Record<string, string> = {};

//   Object.keys(rules).forEach((field) => {
//     const value = data[field];
//     const fieldRules = rules[field];

//     // Required check
//     if (fieldRules.required && (!value || value.trim() === "")) {
//       errors[field] = `${field} is required`;
//       return;
//     }

//     // Skip other validations if field is empty and not required
//     if (!value || value.trim() === "") {
//       return;
//     }

//     // Type-specific validations
//     if (fieldRules.type === "email" && !isValidEmail(value)) {
//       errors[field] = "Invalid email format";
//     } else if (fieldRules.type === "wallet" && !isValidWalletAddress(value)) {
//       errors[field] = "Invalid wallet address format";
//     } else if (fieldRules.type === "token" && !isValidTokenFormat(value)) {
//       errors[field] = "Invalid token format";
//     } else if (fieldRules.type === "number") {
//       const num = parseFloat(value);
//       if (isNaN(num)) {
//         errors[field] = "Must be a valid number";
//       } else if (fieldRules.min !== undefined && num < fieldRules.min) {
//         errors[field] = `Minimum value is ${fieldRules.min}`;
//       } else if (fieldRules.max !== undefined && num > fieldRules.max) {
//         errors[field] = `Maximum value is ${fieldRules.max}`;
//       }
//     }

//     // Length validations
//     if (fieldRules.minLength && value.length < fieldRules.minLength) {
//       errors[field] = `Minimum length is ${fieldRules.minLength} characters`;
//     }

//     if (fieldRules.maxLength && value.length > fieldRules.maxLength) {
//       errors[field] = `Maximum length is ${fieldRules.maxLength} characters`;
//     }

//     // Custom validation
//     if (fieldRules.custom) {
//       const customResult = fieldRules.custom(value, data);
//       if (customResult !== true) {
//         errors[field] = customResult;
//       }
//     }
//   });

//   return {
//     isValid: Object.keys(errors).length === 0,
//     errors,
//   };
// };

export const validateNumberInput = (value: string): boolean => {
  // Allow empty string, positive numbers, and one decimal point
  // No negative numbers allowed
  return /^\d*\.?\d*$/.test(value);
};

export const amountWithDecimalsDisplay = (
  value: string | number,
  decimals: number,
  maxDecimalToShow: number
): number => {
  // Format the number with commas and two decimal places
  return parseFloat(
    Number(formatUnits(value, decimals)).toFixed(maxDecimalToShow)
  );
};


const formatDate = (dateString: string): string => {
  return new Date(dateString).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

export const safeParseUnits = (valueInput: string, decimals: number) => {
  // Convert to string and trim
  let value = String(valueInput).trim();

  // Basic validation: check if it's a valid number (optionally scientific)
  if (!/^-?\d*\.?\d+(?:e[+-]?\d+)?$/i.test(value)) {
    throw new Error(`Invalid number format: ${value}`);
  }

  // Handle scientific notation by normalizing to standard decimal (simple case; for complex, use library)
  if (value.toLowerCase().includes('e')) {
    value = parseFloat(value).toFixed(decimals + 1); // Use toFixed for approx, then round below; note: limited precision for huge nums
  }

  // Handle sign
  let sign = '';
  if (value.startsWith('-')) {
    sign = '-';
    value = value.slice(1);
  }

  // Split into integer and fractional parts
  let [intPart, fracPart = ''] = value.split('.');
  intPart = intPart || '0';

  // If no need for rounding, proceed
  if (fracPart.length <= decimals) {
    let safeStr = sign + intPart + (fracPart ? '.' + fracPart : '');
    if (safeStr.startsWith('.')) safeStr = sign + '0' + safeStr;
    return parseUnits(safeStr, decimals);
  }

  // Rounding needed: take up to decimals + 1 for round digit
  const keepFrac = fracPart.slice(0, decimals);
  const roundDigit = parseInt(fracPart[decimals] || '0', 10);
  let newFrac = keepFrac;

  if (roundDigit >= 5) {
    // Round up: increment the fractional part (handle carry)
    let fracArr = newFrac.split('').map(Number);
    let carry = 1;
    for (let i = fracArr.length - 1; i >= 0; i--) {
      const sum = fracArr[i] + carry;
      fracArr[i] = sum % 10;
      carry = Math.floor(sum / 10);
      if (carry === 0) break;
    }
    newFrac = fracArr.join('');
    if (carry > 0) {
      // Carry over to integer part
      let intArr = intPart.split('').map(Number);
      for (let i = intArr.length - 1; i >= 0; i--) {
        const sum = intArr[i] + carry;
        intArr[i] = sum % 10;
        carry = Math.floor(sum / 10);
        if (carry === 0) break;
      }
      if (carry > 0) {
        intArr.unshift(carry); // Add new digit if carry remains
      }
      intPart = intArr.join('');
    }
    //console.warn(`Value ${valueInput} rounded up due to excess decimals.`);
  } else {
    //console.warn(`Value ${valueInput} truncated due to excess decimals.`);
  }

  // Reconstruct
  let safeStr = sign + intPart + (newFrac ? '.' + newFrac : '');
  if (safeStr.startsWith('.')) safeStr = sign + '0' + safeStr;

  // Parse
  try {
    return parseUnits(safeStr, decimals);
  } catch (error: any) {
    throw new Error(`Failed to parse units for value: ${safeStr} - ${error.message}`);
  }
};


export const safeFormatNumber = (
  rawValue: string,
  totalPrecision: number,
  displayDecimals: number
): string => {
  // 1. Basic input validation and normalization
  let value = String(rawValue).trim();
  if (value === '') return '0';
  if (!/^-?\d+$/.test(value)) {
    throw new Error(`Invalid scaled integer format: ${rawValue}`);
  }

  // Handle sign
  let sign = '';
  if (value.startsWith('-')) {
    sign = '-';
    value = value.slice(1);
  }

  // 2. Insert decimal point according to totalPrecision
  const len = value.length;
  const decimalIndex = len - totalPrecision;
  let decimalString: string;

  if (decimalIndex > 0) {
    const intPart = value.slice(0, decimalIndex);
    const fracPart = value.slice(decimalIndex);
    decimalString = `${intPart}.${fracPart}`;
  } else {
    const leadingZeros = '0'.repeat(totalPrecision - len);
    decimalString = `0.${leadingZeros}${value}`;
  }

  // 3. Handle displayDecimals = 0 (integer only)
  if (displayDecimals === 0) {
    // Round to nearest integer
    const powerToScale = totalPrecision;
    const roundDivisor = BigInt(10) ** BigInt(powerToScale);
    const roundedBigInt = (BigInt(value) + roundDivisor / BigInt(2)) / roundDivisor;
    const result = sign + roundedBigInt.toString();
    return result === '-0' ? '0' : result;
  }

  // 4. Split into integer and fractional parts
  const [intPart, fracPart = ''] = decimalString.split('.');

  // If fractional part is already within displayDecimals, keep it (but trim trailing zeros later)
  if (fracPart.length <= displayDecimals) {
    // No rounding needed, just ensure correct number of digits (pad with zeros if required)
    const paddedFrac = fracPart.padEnd(displayDecimals, '0');
    decimalString = `${intPart}.${paddedFrac}`;
  } else {
    // Need to round/truncate
    const truncFrac = fracPart.slice(0, displayDecimals + 1);
    const roundDigit = parseInt(truncFrac.slice(-1), 10);
    const finalFrac = truncFrac.slice(0, displayDecimals);

    if (roundDigit >= 5) {
      // Round up using BigInt arithmetic
      const powerToScale = totalPrecision - displayDecimals;
      const roundDivisor = BigInt(10) ** BigInt(powerToScale);
      const roundedBigInt = (BigInt(value) + roundDivisor / BigInt(2)) / roundDivisor;
      const roundedString = roundedBigInt.toString();

      // Format with displayDecimals digits
      if (roundedString.length <= displayDecimals) {
        const zerosNeeded = displayDecimals - roundedString.length;
        decimalString = `0.${'0'.repeat(zerosNeeded)}${roundedString}`;
      } else {
        const newDecimalIndex = roundedString.length - displayDecimals;
        decimalString = `${roundedString.slice(0, newDecimalIndex)}.${roundedString.slice(newDecimalIndex)}`;
      }
    } else {
      // Truncate (round down)
      decimalString = `${intPart}.${finalFrac}`;
      // Pad with zeros if finalFrac is shorter than displayDecimals (can happen after truncation)
      const currentFrac = decimalString.split('.')[1] || '';
      if (currentFrac.length < displayDecimals) {
        decimalString = decimalString.padEnd(decimalString.length + (displayDecimals - currentFrac.length), '0');
      }
    }
  }

  // 5. Remove trailing zeros after decimal point (safe method)
  const [finalInt, finalFrac] = decimalString.split('.');
  let trimmedFrac = finalFrac.replace(/0+$/, '');
  let result = trimmedFrac ? `${finalInt}.${trimmedFrac}` : finalInt;

  // 6. Reapply sign and fix negative zero
  result = sign + result;
  if (result === '-0') result = '0';

  return result;
};

export const toBigIntBalance = (value: unknown, decimals: number): bigint => {
  if (value === null || value === undefined) return BigInt(0);
  if (typeof value === "bigint") return value;

  if (typeof value === "number") {
    if (!Number.isFinite(value)) return BigInt(0);
    try {
      return safeParseUnits(String(value), decimals);
    } catch {
      return BigInt(0);
    }
  }

  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) return BigInt(0);
    if (trimmed.includes(".")) {
      try {
        return safeParseUnits(trimmed, decimals);
      } catch {
        return BigInt(0);
      }
    }
    if (/^-?\d+$/.test(trimmed)) {
      try {
        return BigInt(trimmed);
      } catch {
        return BigInt(0);
      }
    }
    try {
      return safeParseUnits(trimmed, decimals);
    } catch {
      return BigInt(0);
    }
  }

  return BigInt(0);
};
