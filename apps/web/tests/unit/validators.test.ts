/**
 * Validators Unit Tests
 */

import { describe, it, expect } from 'vitest';

// Mock validator functions
const validators = {
  isValidEmail: (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  },

  checkPasswordStrength: (password: string): {
    score: number;
    feedback: string[];
    isStrong: boolean;
  } => {
    const feedback: string[] = [];
    let score = 0;

    if (password.length >= 8) score++;
    else feedback.push('At least 8 characters');

    if (password.length >= 12) score++;

    if (/[a-z]/.test(password)) score++;
    else feedback.push('Lowercase letter');

    if (/[A-Z]/.test(password)) score++;
    else feedback.push('Uppercase letter');

    if (/[0-9]/.test(password)) score++;
    else feedback.push('Number');

    if (/[^a-zA-Z0-9]/.test(password)) score++;
    else feedback.push('Special character');

    return {
      score,
      feedback,
      isStrong: score >= 4,
    };
  },

  isValidAustralianPhone: (phone: string): boolean => {
    const digits = phone.replace(/\D/g, '');
    // Australian mobile: 04XX XXX XXX or landline: 0X XXXX XXXX
    return /^(04\d{8}|0[2-9]\d{8})$/.test(digits) ||
           /^(614\d{8}|61[2-9]\d{8})$/.test(digits);
  },

  isValidABN: (abn: string): boolean => {
    const digits = abn.replace(/\D/g, '');
    if (digits.length !== 11) return false;

    const weights = [10, 1, 3, 5, 7, 9, 11, 13, 15, 17, 19];
    const chars = digits.split('');
    chars[0] = String(parseInt(chars[0]) - 1);
    
    let sum = 0;
    for (let i = 0; i < 11; i++) {
      sum += parseInt(chars[i]) * weights[i];
    }
    
    return sum % 89 === 0;
  },

  isValidACN: (acn: string): boolean => {
    const digits = acn.replace(/\D/g, '');
    if (digits.length !== 9) return false;

    const weights = [8, 7, 6, 5, 4, 3, 2, 1];
    let sum = 0;
    for (let i = 0; i < 8; i++) {
      sum += parseInt(digits[i]) * weights[i];
    }
    
    const remainder = sum % 10;
    const checkDigit = remainder === 0 ? 0 : 10 - remainder;
    
    return parseInt(digits[8]) === checkDigit;
  },

  isValidAustralianPostcode: (postcode: string): boolean => {
    return /^[0-9]{4}$/.test(postcode);
  },

  isValidTFN: (tfn: string): boolean => {
    const digits = tfn.replace(/\D/g, '');
    if (digits.length !== 9) return false;

    const weights = [1, 4, 3, 7, 5, 8, 6, 9, 10];
    let sum = 0;
    for (let i = 0; i < 9; i++) {
      sum += parseInt(digits[i]) * weights[i];
    }
    
    return sum % 11 === 0;
  },

  isValidCreditCard: (number: string): boolean => {
    const digits = number.replace(/\D/g, '');
    if (digits.length < 13 || digits.length > 19) return false;

    // Luhn algorithm
    let sum = 0;
    let isEven = false;
    
    for (let i = digits.length - 1; i >= 0; i--) {
      let digit = parseInt(digits[i]);
      
      if (isEven) {
        digit *= 2;
        if (digit > 9) digit -= 9;
      }
      
      sum += digit;
      isEven = !isEven;
    }
    
    return sum % 10 === 0;
  },

  isValidURL: (url: string): boolean => {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  },

  isValidDate: (date: string): boolean => {
    const parsed = new Date(date);
    return !isNaN(parsed.getTime());
  },

  isFutureDate: (date: string): boolean => {
    const parsed = new Date(date);
    return parsed > new Date();
  },

  isPastDate: (date: string): boolean => {
    const parsed = new Date(date);
    return parsed < new Date();
  },
};

describe('Validators', () => {
  describe('isValidEmail', () => {
    it('should accept valid emails', () => {
      expect(validators.isValidEmail('test@example.com')).toBe(true);
      expect(validators.isValidEmail('user.name@domain.com')).toBe(true);
      expect(validators.isValidEmail('user+tag@domain.com.au')).toBe(true);
    });

    it('should reject invalid emails', () => {
      expect(validators.isValidEmail('invalid')).toBe(false);
      expect(validators.isValidEmail('user@')).toBe(false);
      expect(validators.isValidEmail('@domain.com')).toBe(false);
      expect(validators.isValidEmail('user@domain')).toBe(false);
      expect(validators.isValidEmail('')).toBe(false);
    });
  });

  describe('checkPasswordStrength', () => {
    it('should rate weak passwords low', () => {
      const result = validators.checkPasswordStrength('pass');
      expect(result.isStrong).toBe(false);
      expect(result.score).toBeLessThan(4);
    });

    it('should rate strong passwords high', () => {
      const result = validators.checkPasswordStrength('MyStr0ng!Pass');
      expect(result.isStrong).toBe(true);
      expect(result.score).toBeGreaterThanOrEqual(4);
    });

    it('should provide feedback for missing requirements', () => {
      const result = validators.checkPasswordStrength('password');
      expect(result.feedback).toContain('Uppercase letter');
      expect(result.feedback).toContain('Number');
      expect(result.feedback).toContain('Special character');
    });

    it('should reward longer passwords', () => {
      const short = validators.checkPasswordStrength('Aa1!');
      const long = validators.checkPasswordStrength('Aa1!LongerPass');
      expect(long.score).toBeGreaterThan(short.score);
    });
  });

  describe('isValidAustralianPhone', () => {
    it('should accept valid mobile numbers', () => {
      expect(validators.isValidAustralianPhone('0412345678')).toBe(true);
      expect(validators.isValidAustralianPhone('0412 345 678')).toBe(true);
      expect(validators.isValidAustralianPhone('+61412345678')).toBe(true);
    });

    it('should accept valid landline numbers', () => {
      expect(validators.isValidAustralianPhone('0212345678')).toBe(true);
      expect(validators.isValidAustralianPhone('0312345678')).toBe(true);
    });

    it('should reject invalid numbers', () => {
      expect(validators.isValidAustralianPhone('12345')).toBe(false);
      expect(validators.isValidAustralianPhone('012345678')).toBe(false);
      expect(validators.isValidAustralianPhone('phone')).toBe(false);
    });
  });

  describe('isValidABN', () => {
    it('should accept valid ABN', () => {
      // Example valid ABN: 51 824 753 556
      expect(validators.isValidABN('51824753556')).toBe(true);
      expect(validators.isValidABN('51 824 753 556')).toBe(true);
    });

    it('should reject invalid ABN', () => {
      expect(validators.isValidABN('12345678901')).toBe(false);
      expect(validators.isValidABN('1234567890')).toBe(false);
      expect(validators.isValidABN('invalid')).toBe(false);
    });
  });

  describe('isValidACN', () => {
    it('should accept valid ACN', () => {
      // Example valid ACN: 000 000 019
      expect(validators.isValidACN('000000019')).toBe(true);
    });

    it('should reject invalid ACN', () => {
      expect(validators.isValidACN('123456789')).toBe(false);
      expect(validators.isValidACN('12345678')).toBe(false);
    });
  });

  describe('isValidAustralianPostcode', () => {
    it('should accept valid postcodes', () => {
      expect(validators.isValidAustralianPostcode('2000')).toBe(true);
      expect(validators.isValidAustralianPostcode('3000')).toBe(true);
      expect(validators.isValidAustralianPostcode('0800')).toBe(true);
    });

    it('should reject invalid postcodes', () => {
      expect(validators.isValidAustralianPostcode('200')).toBe(false);
      expect(validators.isValidAustralianPostcode('20000')).toBe(false);
      expect(validators.isValidAustralianPostcode('abcd')).toBe(false);
    });
  });

  describe('isValidTFN', () => {
    it('should accept valid TFN', () => {
      // Example valid TFN: 123 456 782
      expect(validators.isValidTFN('123456782')).toBe(true);
    });

    it('should reject invalid TFN', () => {
      expect(validators.isValidTFN('123456789')).toBe(false);
      expect(validators.isValidTFN('12345678')).toBe(false);
    });
  });

  describe('isValidCreditCard', () => {
    it('should accept valid card numbers (Luhn)', () => {
      // Test card number
      expect(validators.isValidCreditCard('4111111111111111')).toBe(true);
      expect(validators.isValidCreditCard('4111 1111 1111 1111')).toBe(true);
    });

    it('should reject invalid card numbers', () => {
      expect(validators.isValidCreditCard('1234567890123456')).toBe(false);
      expect(validators.isValidCreditCard('411111111111111')).toBe(false);
    });
  });

  describe('isValidURL', () => {
    it('should accept valid URLs', () => {
      expect(validators.isValidURL('https://example.com')).toBe(true);
      expect(validators.isValidURL('http://localhost:3000')).toBe(true);
      expect(validators.isValidURL('https://sub.domain.com/path?query=1')).toBe(true);
    });

    it('should reject invalid URLs', () => {
      expect(validators.isValidURL('not-a-url')).toBe(false);
      expect(validators.isValidURL('example.com')).toBe(false);
      expect(validators.isValidURL('')).toBe(false);
    });
  });

  describe('isValidDate', () => {
    it('should accept valid dates', () => {
      expect(validators.isValidDate('2024-03-15')).toBe(true);
      expect(validators.isValidDate('March 15, 2024')).toBe(true);
      expect(validators.isValidDate('2024-03-15T10:30:00Z')).toBe(true);
    });

    it('should reject invalid dates', () => {
      expect(validators.isValidDate('not-a-date')).toBe(false);
      expect(validators.isValidDate('')).toBe(false);
    });
  });

  describe('isFutureDate', () => {
    it('should return true for future dates', () => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      expect(validators.isFutureDate(tomorrow.toISOString())).toBe(true);
    });

    it('should return false for past dates', () => {
      expect(validators.isFutureDate('2020-01-01')).toBe(false);
    });
  });

  describe('isPastDate', () => {
    it('should return true for past dates', () => {
      expect(validators.isPastDate('2020-01-01')).toBe(true);
    });

    it('should return false for future dates', () => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      expect(validators.isPastDate(tomorrow.toISOString())).toBe(false);
    });
  });
});
