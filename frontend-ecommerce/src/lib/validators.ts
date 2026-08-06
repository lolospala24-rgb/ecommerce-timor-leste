// Email validation
export const isValidEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

// Phone number validation (Timor-Leste format)
export const isValidPhoneNumber = (phone: string): boolean => {
  const phoneRegex = /^(\+670|0)[0-9]{7,8}$/;
  return phoneRegex.test(phone);
};

// Password validation
export const isValidPassword = (password: string): boolean => {
  return password.length >= 6;
};

// Strong password validation
export const isStrongPassword = (password: string): boolean => {
  const strongPasswordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
  return strongPasswordRegex.test(password);
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

// UUID validation
export const isValidUUID = (uuid: string): boolean => {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
};

// Number validation
export const isNumber = (value: any): boolean => {
  return !isNaN(parseFloat(value)) && isFinite(value);
};

// Positive number validation
export const isPositiveNumber = (value: number): boolean => {
  return isNumber(value) && value > 0;
};

// Integer validation
export const isInteger = (value: number): boolean => {
  return Number.isInteger(value);
};

// Positive integer validation
export const isPositiveInteger = (value: number): boolean => {
  return isInteger(value) && value > 0;
};

// Date validation
export const isValidDate = (date: string): boolean => {
  const d = new Date(date);
  return d instanceof Date && !isNaN(d.getTime());
};

// Future date validation
export const isFutureDate = (date: string): boolean => {
  const d = new Date(date);
  const now = new Date();
  return isValidDate(date) && d > now;
};

// Past date validation
export const isPastDate = (date: string): boolean => {
  const d = new Date(date);
  const now = new Date();
  return isValidDate(date) && d < now;
};

// Postal code validation (Timor-Leste)
export const isValidPostalCode = (postalCode: string): boolean => {
  return postalCode.length > 0;
};

// Address validation (Timor-Leste)
export const isValidTimorAddress = (address: {
  municipality: string;
  postoAdmin: string;
  suco: string;
}): boolean => {
  const municipalities = [
    'Aileu', 'Ainaro', 'Baucau', 'Bobonaro', 'Covalima', 'Dili',
    'Ermera', 'Lautém', 'Liquiçá', 'Manatuto', 'Manufahi', 'Oecusse', 'Viqueque'
  ];
  return municipalities.includes(address.municipality) &&
         address.postoAdmin.length > 0 &&
         address.suco.length > 0;
};

// Price validation
export const isValidPrice = (price: number): boolean => {
  return isNumber(price) && price >= 0;
};

// Quantity validation
export const isValidQuantity = (quantity: number): boolean => {
  return isPositiveInteger(quantity) && quantity <= 999;
};

// SKU validation
export const isValidSKU = (sku: string): boolean => {
  return /^[A-Za-z0-9-]{3,50}$/.test(sku);
};

// Slug validation
export const isValidSlug = (slug: string): boolean => {
  return /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug);
};

// Credit card number validation (Luhn algorithm)
export const isValidCreditCard = (cardNumber: string): boolean => {
  const sanitized = cardNumber.replace(/\D/g, '');
  if (sanitized.length < 13 || sanitized.length > 19) return false;
  
  let sum = 0;
  let isEven = false;
  for (let i = sanitized.length - 1; i >= 0; i--) {
    let digit = parseInt(sanitized[i], 10);
    if (isEven) {
      digit *= 2;
      if (digit > 9) digit -= 9;
    }
    sum += digit;
    isEven = !isEven;
  }
  return sum % 10 === 0;
};