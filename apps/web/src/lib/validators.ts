/**
 * Validation Utilities for Web App
 * 
 * Client-side validation functions for forms and user input
 */

/**
 * Email validation
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Password strength requirements
 */
export interface PasswordStrength {
  score: number; // 0-5
  label: 'weak' | 'fair' | 'good' | 'strong' | 'very-strong';
  feedback: string[];
}

export function checkPasswordStrength(password: string): PasswordStrength {
  const feedback: string[] = [];
  let score = 0;
  
  if (password.length >= 8) score++;
  else feedback.push('Password should be at least 8 characters');
  
  if (password.length >= 12) score++;
  
  if (/[a-z]/.test(password)) score += 0.5;
  else feedback.push('Add lowercase letters');
  
  if (/[A-Z]/.test(password)) score += 0.5;
  else feedback.push('Add uppercase letters');
  
  if (/\d/.test(password)) score += 0.5;
  else feedback.push('Add numbers');
  
  if (/[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(password)) score++;
  else feedback.push('Add special characters');
  
  // Check for common patterns
  const commonPatterns = [
    /^(password|123456|qwerty|letmein|welcome|monkey|dragon)/i,
    /(.)\1{3,}/, // Repeated characters
    /^(abc|123|qwe)/i, // Sequential patterns
  ];
  
  for (const pattern of commonPatterns) {
    if (pattern.test(password)) {
      score = Math.max(0, score - 1);
      feedback.push('Avoid common patterns');
      break;
    }
  }
  
  const labels: PasswordStrength['label'][] = ['weak', 'weak', 'fair', 'good', 'strong', 'very-strong'];
  
  return {
    score: Math.min(5, Math.floor(score)),
    label: labels[Math.min(5, Math.floor(score))],
    feedback,
  };
}

/**
 * Australian phone number validation
 */
export function isValidAustralianPhone(phone: string): boolean {
  const digits = phone.replace(/\D/g, '');
  
  // Australian mobile: 04XX XXX XXX or +61 4XX XXX XXX
  if (/^(04|614)\d{8}$/.test(digits)) return true;
  
  // Australian landline: 0X XXXX XXXX or +61 X XXXX XXXX
  if (/^(0[2-9]|61[2-9])\d{8}$/.test(digits)) return true;
  
  return false;
}

/**
 * URL validation
 */
export function isValidUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return ['http:', 'https:'].includes(parsed.protocol);
  } catch {
    return false;
  }
}

/**
 * Australian ABN validation (11 digits with specific checksum)
 */
export function isValidABN(abn: string): boolean {
  const digits = abn.replace(/\D/g, '');
  
  if (digits.length !== 11) return false;
  
  const weights = [10, 1, 3, 5, 7, 9, 11, 13, 15, 17, 19];
  const nums = digits.split('').map(Number);
  
  // Subtract 1 from first digit
  nums[0] = nums[0] - 1;
  
  // Calculate checksum
  const sum = nums.reduce((acc, num, i) => acc + num * weights[i], 0);
  
  return sum % 89 === 0;
}

/**
 * Australian ACN validation (9 digits with checksum)
 */
export function isValidACN(acn: string): boolean {
  const digits = acn.replace(/\D/g, '');
  
  if (digits.length !== 9) return false;
  
  const weights = [8, 7, 6, 5, 4, 3, 2, 1, 0];
  const nums = digits.split('').map(Number);
  
  const sum = nums.reduce((acc, num, i) => acc + num * weights[i], 0);
  const remainder = sum % 10;
  const check = (10 - remainder) % 10;
  
  return nums[8] === check;
}

/**
 * Australian postcode validation
 */
export function isValidAustralianPostcode(postcode: string): boolean {
  const code = postcode.replace(/\D/g, '');
  
  if (code.length !== 4) return false;
  
  const num = parseInt(code, 10);
  
  // Valid Australian postcode ranges
  const validRanges = [
    [200, 299],   // ACT
    [1000, 2999], // NSW
    [3000, 3999], // VIC
    [4000, 4999], // QLD
    [5000, 5999], // SA
    [6000, 6999], // WA
    [7000, 7999], // TAS
    [800, 899],   // NT
  ];
  
  return validRanges.some(([min, max]) => num >= min && num <= max);
}

/**
 * Australian TFN validation (Tax File Number)
 */
export function isValidTFN(tfn: string): boolean {
  const digits = tfn.replace(/\D/g, '');
  
  if (digits.length !== 9) return false;
  
  const weights = [1, 4, 3, 7, 5, 8, 6, 9, 10];
  const nums = digits.split('').map(Number);
  
  const sum = nums.reduce((acc, num, i) => acc + num * weights[i], 0);
  
  return sum % 11 === 0;
}

/**
 * Date validation
 */
export function isValidDate(dateString: string): boolean {
  const date = new Date(dateString);
  return !isNaN(date.getTime());
}

/**
 * Age validation
 */
export function isValidAge(birthDate: string, minAge: number = 0, maxAge: number = 120): boolean {
  const date = new Date(birthDate);
  if (isNaN(date.getTime())) return false;
  
  const today = new Date();
  let age = today.getFullYear() - date.getFullYear();
  const monthDiff = today.getMonth() - date.getMonth();
  
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < date.getDate())) {
    age--;
  }
  
  return age >= minAge && age <= maxAge;
}

/**
 * Credit card validation (Luhn algorithm)
 */
export function isValidCreditCard(cardNumber: string): boolean {
  const digits = cardNumber.replace(/\D/g, '');
  
  if (digits.length < 13 || digits.length > 19) return false;
  
  let sum = 0;
  let isEven = false;
  
  for (let i = digits.length - 1; i >= 0; i--) {
    let digit = parseInt(digits[i], 10);
    
    if (isEven) {
      digit *= 2;
      if (digit > 9) digit -= 9;
    }
    
    sum += digit;
    isEven = !isEven;
  }
  
  return sum % 10 === 0;
}

/**
 * File type validation
 */
export function isValidFileType(filename: string, allowedTypes: string[]): boolean {
  const extension = filename.split('.').pop()?.toLowerCase();
  if (!extension) return false;
  
  return allowedTypes.some(type => {
    if (type.startsWith('.')) {
      return extension === type.substring(1).toLowerCase();
    }
    return extension === type.toLowerCase();
  });
}

/**
 * File size validation
 */
export function isValidFileSize(sizeInBytes: number, maxSizeInMB: number): boolean {
  const maxSizeInBytes = maxSizeInMB * 1024 * 1024;
  return sizeInBytes <= maxSizeInBytes;
}

/**
 * Required field validation
 */
export function isRequired(value: unknown): boolean {
  if (value === null || value === undefined) return false;
  if (typeof value === 'string') return value.trim().length > 0;
  if (Array.isArray(value)) return value.length > 0;
  return true;
}

/**
 * Min/max length validation
 */
export function isValidLength(
  value: string,
  options: { min?: number; max?: number }
): boolean {
  const length = value.length;
  if (options.min !== undefined && length < options.min) return false;
  if (options.max !== undefined && length > options.max) return false;
  return true;
}

/**
 * Form validation helper
 */
export interface ValidationRule<T = unknown> {
  validate: (value: T) => boolean;
  message: string;
}

export function validateField<T>(value: T, rules: ValidationRule<T>[]): string[] {
  const errors: string[] = [];
  
  for (const rule of rules) {
    if (!rule.validate(value)) {
      errors.push(rule.message);
    }
  }
  
  return errors;
}

/**
 * Form validation result
 */
export interface FormValidationResult<T extends Record<string, unknown>> {
  isValid: boolean;
  errors: Partial<Record<keyof T, string[]>>;
  firstError?: string;
}

export function validateForm<T extends Record<string, unknown>>(
  values: T,
  rules: Partial<Record<keyof T, ValidationRule<T[keyof T]>[]>>
): FormValidationResult<T> {
  const errors: Partial<Record<keyof T, string[]>> = {};
  let isValid = true;
  let firstError: string | undefined;
  
  for (const [field, fieldRules] of Object.entries(rules) as [keyof T, ValidationRule<T[keyof T]>[]][]) {
    if (!fieldRules) continue;
    
    const fieldErrors = validateField(values[field], fieldRules);
    
    if (fieldErrors.length > 0) {
      errors[field] = fieldErrors;
      isValid = false;
      if (!firstError) {
        firstError = fieldErrors[0];
      }
    }
  }
  
  return { isValid, errors, firstError };
}

const validators = {
  isValidEmail,
  checkPasswordStrength,
  isValidAustralianPhone,
  isValidUrl,
  isValidABN,
  isValidACN,
  isValidAustralianPostcode,
  isValidTFN,
  isValidDate,
  isValidAge,
  isValidCreditCard,
  isValidFileType,
  isValidFileSize,
  isRequired,
  isValidLength,
  validateField,
  validateForm,
};

export default validators;
