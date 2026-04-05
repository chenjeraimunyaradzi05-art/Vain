/**
 * Formatters Unit Tests
 */

import { describe, it, expect } from 'vitest';

// Mock formatter functions
const formatters = {
  formatDate: (date: Date | string, options?: Intl.DateTimeFormatOptions): string => {
    const d = typeof date === 'string' ? new Date(date) : date;
    return d.toLocaleDateString('en-AU', options);
  },

  formatRelativeTime: (date: Date | string): string => {
    const d = typeof date === 'string' ? new Date(date) : date;
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffSecs = Math.floor(diffMs / 1000);
    const diffMins = Math.floor(diffSecs / 60);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffSecs < 60) return 'just now';
    if (diffMins < 60) return `${diffMins} minute${diffMins !== 1 ? 's' : ''} ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`;
    if (diffDays < 7) return `${diffDays} day${diffDays !== 1 ? 's' : ''} ago`;
    return formatters.formatDate(d);
  },

  formatCurrency: (amount: number, currency: string = 'AUD'): string => {
    return new Intl.NumberFormat('en-AU', {
      style: 'currency',
      currency,
    }).format(amount);
  },

  formatSalaryRange: (min?: number, max?: number, period: string = 'yearly'): string => {
    if (!min && !max) return 'Salary not specified';
    if (min && !max) return `From ${formatters.formatCurrency(min)} ${period}`;
    if (!min && max) return `Up to ${formatters.formatCurrency(max)} ${period}`;
    return `${formatters.formatCurrency(min!)} - ${formatters.formatCurrency(max!)} ${period}`;
  },

  formatPhoneNumber: (phone: string): string => {
    const digits = phone.replace(/\D/g, '');
    if (digits.length === 10) {
      return `${digits.slice(0, 4)} ${digits.slice(4, 7)} ${digits.slice(7)}`;
    }
    if (digits.length === 11 && digits.startsWith('61')) {
      return `+61 ${digits.slice(2, 5)} ${digits.slice(5, 8)} ${digits.slice(8)}`;
    }
    return phone;
  },

  formatFileSize: (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
  },

  truncate: (text: string, length: number): string => {
    if (text.length <= length) return text;
    return text.slice(0, length - 3) + '...';
  },

  pluralize: (count: number, singular: string, plural?: string): string => {
    return count === 1 ? singular : (plural || singular + 's');
  },

  getInitials: (name: string): string => {
    return name
      .split(' ')
      .map(word => word[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  },

  formatNumber: (num: number): string => {
    return new Intl.NumberFormat('en-AU').format(num);
  },

  formatPercentage: (value: number, decimals: number = 0): string => {
    return `${value.toFixed(decimals)}%`;
  },
};

describe('Formatters', () => {
  describe('formatDate', () => {
    it('should format date correctly', () => {
      const date = new Date('2024-03-15');
      const result = formatters.formatDate(date);
      expect(result).toContain('2024');
    });

    it('should accept string date', () => {
      const result = formatters.formatDate('2024-03-15');
      expect(result).toBeDefined();
    });

    it('should accept custom options', () => {
      const date = new Date('2024-03-15');
      const result = formatters.formatDate(date, { weekday: 'long' });
      expect(result).toContain('Friday');
    });
  });

  describe('formatRelativeTime', () => {
    it('should show "just now" for recent dates', () => {
      const now = new Date();
      const result = formatters.formatRelativeTime(now);
      expect(result).toBe('just now');
    });

    it('should show minutes ago', () => {
      const date = new Date(Date.now() - 5 * 60 * 1000);
      const result = formatters.formatRelativeTime(date);
      expect(result).toBe('5 minutes ago');
    });

    it('should show hours ago', () => {
      const date = new Date(Date.now() - 3 * 60 * 60 * 1000);
      const result = formatters.formatRelativeTime(date);
      expect(result).toBe('3 hours ago');
    });

    it('should show days ago', () => {
      const date = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000);
      const result = formatters.formatRelativeTime(date);
      expect(result).toBe('2 days ago');
    });

    it('should handle singular forms', () => {
      const date = new Date(Date.now() - 1 * 60 * 1000);
      const result = formatters.formatRelativeTime(date);
      expect(result).toBe('1 minute ago');
    });
  });

  describe('formatCurrency', () => {
    it('should format AUD correctly', () => {
      const result = formatters.formatCurrency(1234.56);
      expect(result).toContain('$');
      expect(result).toContain('1,234.56');
    });

    it('should format different currencies', () => {
      const result = formatters.formatCurrency(1000, 'USD');
      expect(result).toContain('US$') || expect(result).toContain('$');
    });

    it('should handle zero', () => {
      const result = formatters.formatCurrency(0);
      expect(result).toContain('0');
    });

    it('should handle large numbers', () => {
      const result = formatters.formatCurrency(1000000);
      expect(result).toContain('1,000,000');
    });
  });

  describe('formatSalaryRange', () => {
    it('should format min and max', () => {
      const result = formatters.formatSalaryRange(80000, 120000);
      expect(result).toContain('80,000');
      expect(result).toContain('120,000');
      expect(result).toContain('-');
    });

    it('should format min only', () => {
      const result = formatters.formatSalaryRange(80000, undefined);
      expect(result).toContain('From');
      expect(result).toContain('80,000');
    });

    it('should format max only', () => {
      const result = formatters.formatSalaryRange(undefined, 120000);
      expect(result).toContain('Up to');
      expect(result).toContain('120,000');
    });

    it('should handle no salary', () => {
      const result = formatters.formatSalaryRange();
      expect(result).toBe('Salary not specified');
    });

    it('should include period', () => {
      const result = formatters.formatSalaryRange(80000, 120000, 'yearly');
      expect(result).toContain('yearly');
    });
  });

  describe('formatPhoneNumber', () => {
    it('should format Australian mobile', () => {
      const result = formatters.formatPhoneNumber('0412345678');
      expect(result).toBe('0412 345 678');
    });

    it('should format with country code', () => {
      const result = formatters.formatPhoneNumber('61412345678');
      expect(result).toBe('+61 412 345 678');
    });

    it('should handle already formatted', () => {
      const result = formatters.formatPhoneNumber('0412 345 678');
      expect(result).toBe('0412 345 678');
    });

    it('should return original for invalid format', () => {
      const result = formatters.formatPhoneNumber('12345');
      expect(result).toBe('12345');
    });
  });

  describe('formatFileSize', () => {
    it('should format bytes', () => {
      const result = formatters.formatFileSize(500);
      expect(result).toBe('500 B');
    });

    it('should format kilobytes', () => {
      const result = formatters.formatFileSize(1024);
      expect(result).toBe('1 KB');
    });

    it('should format megabytes', () => {
      const result = formatters.formatFileSize(1024 * 1024);
      expect(result).toBe('1 MB');
    });

    it('should format gigabytes', () => {
      const result = formatters.formatFileSize(1024 * 1024 * 1024);
      expect(result).toBe('1 GB');
    });

    it('should handle zero', () => {
      const result = formatters.formatFileSize(0);
      expect(result).toBe('0 B');
    });

    it('should round appropriately', () => {
      const result = formatters.formatFileSize(1536);
      expect(result).toBe('1.5 KB');
    });
  });

  describe('truncate', () => {
    it('should truncate long text', () => {
      const text = 'This is a very long text that should be truncated';
      const result = formatters.truncate(text, 20);
      expect(result).toBe('This is a very lo...');
      expect(result.length).toBe(20);
    });

    it('should not truncate short text', () => {
      const text = 'Short';
      const result = formatters.truncate(text, 20);
      expect(result).toBe('Short');
    });

    it('should handle exact length', () => {
      const text = 'Exactly twenty chars';
      const result = formatters.truncate(text, 20);
      expect(result).toBe('Exactly twenty chars');
    });
  });

  describe('pluralize', () => {
    it('should return singular for 1', () => {
      const result = formatters.pluralize(1, 'job');
      expect(result).toBe('job');
    });

    it('should return plural for > 1', () => {
      const result = formatters.pluralize(5, 'job');
      expect(result).toBe('jobs');
    });

    it('should return plural for 0', () => {
      const result = formatters.pluralize(0, 'job');
      expect(result).toBe('jobs');
    });

    it('should use custom plural', () => {
      const result = formatters.pluralize(2, 'company', 'companies');
      expect(result).toBe('companies');
    });
  });

  describe('getInitials', () => {
    it('should get initials from full name', () => {
      const result = formatters.getInitials('John Doe');
      expect(result).toBe('JD');
    });

    it('should handle single name', () => {
      const result = formatters.getInitials('John');
      expect(result).toBe('J');
    });

    it('should handle multiple names', () => {
      const result = formatters.getInitials('John Michael Doe');
      expect(result).toBe('JM');
    });

    it('should uppercase initials', () => {
      const result = formatters.getInitials('john doe');
      expect(result).toBe('JD');
    });
  });

  describe('formatNumber', () => {
    it('should format with thousands separator', () => {
      const result = formatters.formatNumber(1234567);
      expect(result).toBe('1,234,567');
    });

    it('should handle small numbers', () => {
      const result = formatters.formatNumber(123);
      expect(result).toBe('123');
    });
  });

  describe('formatPercentage', () => {
    it('should format percentage', () => {
      const result = formatters.formatPercentage(75.5);
      expect(result).toBe('76%');
    });

    it('should format with decimals', () => {
      const result = formatters.formatPercentage(75.55, 1);
      expect(result).toBe('75.6%');
    });

    it('should handle 100%', () => {
      const result = formatters.formatPercentage(100);
      expect(result).toBe('100%');
    });

    it('should handle 0%', () => {
      const result = formatters.formatPercentage(0);
      expect(result).toBe('0%');
    });
  });
});
