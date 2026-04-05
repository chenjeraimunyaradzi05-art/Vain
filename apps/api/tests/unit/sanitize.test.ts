/**
 * Sanitization Utilities Tests
 */

import {
  escapeHtml,
  sanitizeXss,
  sanitizeSql,
  removeNullBytes,
  sanitizeFilename,
  sanitizeEmail,
  sanitizeUrl,
  deepSanitize,
  analyzeInputRisk,
} from '../../src/lib/sanitize';

describe('Sanitization Utilities', () => {
  describe('escapeHtml', () => {
    it('should escape HTML special characters', () => {
      expect(escapeHtml('<script>alert("xss")</script>')).toBe(
        '&lt;script&gt;alert(&quot;xss&quot;)&lt;&#x2F;script&gt;'
      );
    });

    it('should escape ampersand', () => {
      expect(escapeHtml('foo & bar')).toBe('foo &amp; bar');
    });

    it('should escape quotes', () => {
      expect(escapeHtml("it's \"quoted\"")).toBe("it&#x27;s &quot;quoted&quot;");
    });
  });

  describe('sanitizeXss', () => {
    it('should remove script tags', () => {
      expect(sanitizeXss('<script>alert(1)</script>')).toBe('');
    });

    it('should remove event handlers', () => {
      expect(sanitizeXss('<img onerror="alert(1)">')).toBe('<img >');
    });

    it('should remove javascript: protocol', () => {
      expect(sanitizeXss('<a href="javascript:alert(1)">click</a>')).toBe(
        '<a href="alert(1)">click</a>'
      );
    });

    it('should remove data: protocol', () => {
      expect(sanitizeXss('<img src="data:image/png;base64,abc">')).toBe(
        '<img src="">'
      );
    });

    it('should preserve safe content', () => {
      expect(sanitizeXss('Hello, world!')).toBe('Hello, world!');
    });
  });

  describe('sanitizeSql', () => {
    it('should escape single quotes', () => {
      expect(sanitizeSql("O'Brien")).toBe("O''Brien");
    });

    it('should escape backslashes', () => {
      expect(sanitizeSql('path\\to\\file')).toBe('path\\\\to\\\\file');
    });

    it('should escape newlines', () => {
      expect(sanitizeSql('line1\nline2')).toBe('line1\\nline2');
    });
  });

  describe('removeNullBytes', () => {
    it('should remove null bytes', () => {
      expect(removeNullBytes('hello\x00world')).toBe('helloworld');
    });

    it('should preserve normal strings', () => {
      expect(removeNullBytes('hello world')).toBe('hello world');
    });
  });

  describe('sanitizeFilename', () => {
    it('should remove path traversal', () => {
      expect(sanitizeFilename('../../../etc/passwd')).toBe('etcpasswd');
    });

    it('should remove slashes', () => {
      expect(sanitizeFilename('path/to/file.txt')).toBe('pathtofile.txt');
    });

    it('should replace special characters', () => {
      expect(sanitizeFilename('file<name>.txt')).toBe('file_name_.txt');
    });

    it('should limit length', () => {
      const longName = 'a'.repeat(300) + '.txt';
      expect(sanitizeFilename(longName).length).toBeLessThanOrEqual(255);
    });

    it('should preserve safe filenames', () => {
      expect(sanitizeFilename('my-file_123.pdf')).toBe('my-file_123.pdf');
    });
  });

  describe('sanitizeEmail', () => {
    it('should lowercase email', () => {
      expect(sanitizeEmail('User@Example.COM')).toBe('user@example.com');
    });

    it('should trim whitespace', () => {
      expect(sanitizeEmail('  user@example.com  ')).toBe('user@example.com');
    });

    it('should remove dangerous characters', () => {
      expect(sanitizeEmail('<user@example.com>')).toBe('user@example.com');
    });

    it('should limit length', () => {
      const longEmail = 'a'.repeat(300) + '@example.com';
      expect(sanitizeEmail(longEmail).length).toBeLessThanOrEqual(254);
    });
  });

  describe('sanitizeUrl', () => {
    it('should return valid http URL', () => {
      expect(sanitizeUrl('http://example.com')).toBe('http://example.com/');
    });

    it('should return valid https URL', () => {
      expect(sanitizeUrl('https://example.com/path')).toBe('https://example.com/path');
    });

    it('should reject javascript: protocol', () => {
      expect(sanitizeUrl('javascript:alert(1)')).toBeNull();
    });

    it('should reject data: protocol', () => {
      expect(sanitizeUrl('data:text/html,<script>alert(1)</script>')).toBeNull();
    });

    it('should return null for invalid URLs', () => {
      expect(sanitizeUrl('not a url')).toBeNull();
    });
  });

  describe('deepSanitize', () => {
    it('should sanitize strings in objects', () => {
      const input = {
        name: '<script>alert(1)</script>',
        bio: 'Hello world',
      };
      
      const result = deepSanitize(input);
      
      expect(result.name).toBe('');
      expect(result.bio).toBe('Hello world');
    });

    it('should sanitize nested objects', () => {
      const input = {
        user: {
          name: '<script>xss</script>John',
        },
      };
      
      const result = deepSanitize(input);
      
      expect(result.user.name).toBe('John');
    });

    it('should sanitize arrays', () => {
      const input = {
        tags: ['safe', '<script>alert(1)</script>'],
      };
      
      const result = deepSanitize(input);
      
      expect(result.tags).toEqual(['safe', '']);
    });

    it('should preserve non-string values', () => {
      const input = {
        count: 42,
        active: true,
        data: null,
      };
      
      const result = deepSanitize(input);
      
      expect(result).toEqual(input);
    });
  });

  describe('analyzeInputRisk', () => {
    it('should detect high risk XSS patterns', () => {
      expect(analyzeInputRisk('<script>alert(1)</script>')).toBe('high');
    });

    it('should detect high risk SQL patterns', () => {
      expect(analyzeInputRisk("' UNION SELECT * FROM users --")).toBe('high');
    });

    it('should detect high risk event handlers', () => {
      expect(analyzeInputRisk('onerror=alert(1)')).toBe('high');
    });

    it('should detect medium risk HTML', () => {
      expect(analyzeInputRisk('<div>content</div>')).toBe('medium');
    });

    it('should return low for safe input', () => {
      expect(analyzeInputRisk('Hello, world!')).toBe('low');
    });
  });
});
