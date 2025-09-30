// Phone number formatting utilities

export const formatPhoneNumber = (value: string): string => {
  // Remove all non-digit characters
  const digits = value.replace(/\D/g, '');
  
  // If empty, return empty
  if (digits.length === 0) {
    return '';
  }
  
  // If it starts with 998, remove it
  if (digits.startsWith('998')) {
    return formatPhoneNumber(digits.substring(3));
  }
  
  // If it starts with 9, format it
  if (digits.startsWith('9')) {
    if (digits.length <= 2) {
      return `+998 ${digits}`;
    } else if (digits.length <= 5) {
      return `+998 ${digits.substring(0, 2)} ${digits.substring(2)}`;
    } else if (digits.length <= 7) {
      return `+998 ${digits.substring(0, 2)} ${digits.substring(2, 5)} ${digits.substring(5)}`;
    } else if (digits.length <= 9) {
      return `+998 ${digits.substring(0, 2)} ${digits.substring(2, 5)} ${digits.substring(5, 7)} ${digits.substring(7)}`;
    } else {
      return `+998 ${digits.substring(0, 2)} ${digits.substring(2, 5)} ${digits.substring(5, 7)} ${digits.substring(7, 9)}`;
    }
  }
  
  // If it's less than 9 digits, just add +998 prefix
  if (digits.length <= 9) {
    return `+998 ${digits}`;
  }
  
  // Default formatting
  return `+998 ${digits.substring(0, 2)} ${digits.substring(2, 5)} ${digits.substring(5, 7)} ${digits.substring(7, 9)}`;
};

export const parsePhoneNumber = (value: string): string => {
  // Remove all non-digit characters
  const digits = value.replace(/\D/g, '');
  
  // If it starts with 998, remove it
  if (digits.startsWith('998')) {
    return digits.substring(3);
  }
  
  return digits;
};

export const validatePhoneNumber = (value: string): boolean => {
  const digits = parsePhoneNumber(value);
  return digits.length === 9 && digits.startsWith('9');
};

export const parsePhoneNumberForAPI = (value: string): string => {
  const digits = parsePhoneNumber(value);
  return `+998${digits}`;
};
