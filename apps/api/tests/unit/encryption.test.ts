/**
 * Encryption Tests
 */

// Mock environment variables before importing
vi.stubEnv('ENCRYPTION_KEY', 'a'.repeat(64)); // 64 hex chars = 32 bytes
vi.stubEnv('BLIND_INDEX_SALT', 'test-salt-for-blind-index');
vi.stubEnv('HMAC_SECRET', 'test-hmac-secret');

describe('Encryption', () => {
  let encryption: typeof import('../../src/lib/encryption');

  beforeEach(async () => {
    encryption = await import('../../src/lib/encryption');
  });

  describe('encrypt/decrypt', () => {
    it('should encrypt and decrypt a string', () => {
      const plaintext = 'Hello, World!';
      const encrypted = encryption.encrypt(plaintext);
      
      expect(encrypted).not.toBe(plaintext);
      expect(typeof encrypted).toBe('string');
      
      const decrypted = encryption.decrypt(encrypted);
      expect(decrypted).toBe(plaintext);
    });

    it('should produce different ciphertext for same plaintext', () => {
      const plaintext = 'Same text';
      const encrypted1 = encryption.encrypt(plaintext);
      const encrypted2 = encryption.encrypt(plaintext);
      
      expect(encrypted1).not.toBe(encrypted2);
      
      // But both should decrypt to same value
      expect(encryption.decrypt(encrypted1)).toBe(plaintext);
      expect(encryption.decrypt(encrypted2)).toBe(plaintext);
    });

    it('should handle empty string', () => {
      const encrypted = encryption.encrypt('');
      const decrypted = encryption.decrypt(encrypted);
      expect(decrypted).toBe('');
    });

    it('should handle unicode characters', () => {
      const plaintext = 'Hello 世界 🌍 مرحبا';
      const encrypted = encryption.encrypt(plaintext);
      const decrypted = encryption.decrypt(encrypted);
      expect(decrypted).toBe(plaintext);
    });

    it('should handle long text', () => {
      const plaintext = 'A'.repeat(10000);
      const encrypted = encryption.encrypt(plaintext);
      const decrypted = encryption.decrypt(encrypted);
      expect(decrypted).toBe(plaintext);
    });
  });

  describe('encryptWithPassword/decryptWithPassword', () => {
    it('should encrypt and decrypt with password', () => {
      const plaintext = 'Secret data';
      const password = 'my-secure-password';
      
      const encrypted = encryption.encryptWithPassword(plaintext, password);
      const decrypted = encryption.decryptWithPassword(encrypted, password);
      
      expect(decrypted).toBe(plaintext);
    });

    it('should fail with wrong password', () => {
      const plaintext = 'Secret data';
      const encrypted = encryption.encryptWithPassword(plaintext, 'password1');
      
      expect(() => {
        encryption.decryptWithPassword(encrypted, 'password2');
      }).toThrow();
    });

    it('should produce different ciphertext for same password', () => {
      const plaintext = 'Same text';
      const password = 'same-password';
      
      const encrypted1 = encryption.encryptWithPassword(plaintext, password);
      const encrypted2 = encryption.encryptWithPassword(plaintext, password);
      
      expect(encrypted1).not.toBe(encrypted2);
    });
  });

  describe('blindIndex', () => {
    it('should create consistent hash for same value', () => {
      const value = 'test@example.com';
      
      const hash1 = encryption.blindIndex(value);
      const hash2 = encryption.blindIndex(value);
      
      expect(hash1).toBe(hash2);
    });

    it('should be case insensitive', () => {
      const hash1 = encryption.blindIndex('Test@Example.com');
      const hash2 = encryption.blindIndex('test@example.com');
      
      expect(hash1).toBe(hash2);
    });

    it('should trim whitespace', () => {
      const hash1 = encryption.blindIndex('  test@example.com  ');
      const hash2 = encryption.blindIndex('test@example.com');
      
      expect(hash1).toBe(hash2);
    });

    it('should produce different hashes for different values', () => {
      const hash1 = encryption.blindIndex('value1');
      const hash2 = encryption.blindIndex('value2');
      
      expect(hash1).not.toBe(hash2);
    });
  });

  describe('generateKey', () => {
    it('should generate valid key', () => {
      const key = encryption.generateKey();
      
      expect(key.hex).toHaveLength(64);
      expect(key.base64).toHaveLength(44);
    });

    it('should generate unique keys', () => {
      const key1 = encryption.generateKey();
      const key2 = encryption.generateKey();
      
      expect(key1.hex).not.toBe(key2.hex);
    });
  });

  describe('encryptObject/decryptObject', () => {
    it('should encrypt and decrypt objects', () => {
      const obj = {
        name: 'John Doe',
        email: 'john@example.com',
        ssn: '123-45-6789',
      };
      
      const encrypted = encryption.encryptObject(obj);
      expect(typeof encrypted).toBe('string');
      
      const decrypted = encryption.decryptObject<typeof obj>(encrypted);
      expect(decrypted).toEqual(obj);
    });

    it('should handle nested objects', () => {
      const obj = {
        user: {
          profile: {
            name: 'Jane',
          },
        },
        data: [1, 2, 3],
      };
      
      const encrypted = encryption.encryptObject(obj);
      const decrypted = encryption.decryptObject<typeof obj>(encrypted);
      
      expect(decrypted).toEqual(obj);
    });
  });

  describe('secureCompare', () => {
    it('should return true for equal strings', () => {
      expect(encryption.secureCompare('test', 'test')).toBe(true);
    });

    it('should return false for different strings', () => {
      expect(encryption.secureCompare('test', 'Test')).toBe(false);
    });

    it('should return false for different length strings', () => {
      expect(encryption.secureCompare('short', 'longer')).toBe(false);
    });
  });

  describe('generateToken', () => {
    it('should generate token of default length', () => {
      const token = encryption.generateToken();
      // Base64url encoding: 32 bytes -> ~43 chars
      expect(token.length).toBeGreaterThan(40);
    });

    it('should generate token of specified length', () => {
      const token = encryption.generateToken(16);
      // Base64url encoding: 16 bytes -> ~22 chars
      expect(token.length).toBeGreaterThan(20);
    });

    it('should generate unique tokens', () => {
      const token1 = encryption.generateToken();
      const token2 = encryption.generateToken();
      expect(token1).not.toBe(token2);
    });
  });

  describe('hash', () => {
    it('should create consistent hash', () => {
      const hash1 = encryption.hash('test');
      const hash2 = encryption.hash('test');
      expect(hash1).toBe(hash2);
    });

    it('should create different hashes for different inputs', () => {
      const hash1 = encryption.hash('test1');
      const hash2 = encryption.hash('test2');
      expect(hash1).not.toBe(hash2);
    });

    it('should produce 64 character hex hash', () => {
      const hash = encryption.hash('anything');
      expect(hash).toHaveLength(64);
      expect(/^[0-9a-f]+$/.test(hash)).toBe(true);
    });
  });

  describe('hmacSign/hmacVerify', () => {
    it('should sign and verify', () => {
      const data = 'important data';
      const signature = encryption.hmacSign(data);
      
      expect(encryption.hmacVerify(data, signature)).toBe(true);
    });

    it('should fail verification with wrong signature', () => {
      const data = 'important data';
      
      expect(encryption.hmacVerify(data, 'wrong-signature')).toBe(false);
    });

    it('should fail verification with modified data', () => {
      const signature = encryption.hmacSign('original data');
      
      expect(encryption.hmacVerify('modified data', signature)).toBe(false);
    });
  });

  describe('EncryptedField', () => {
    it('should handle null values', () => {
      expect(encryption.EncryptedField.encrypt(null)).toBeNull();
      expect(encryption.EncryptedField.decrypt(null)).toBeNull();
    });

    it('should handle undefined values', () => {
      expect(encryption.EncryptedField.encrypt(undefined)).toBeNull();
      expect(encryption.EncryptedField.decrypt(undefined)).toBeNull();
    });

    it('should encrypt and decrypt values', () => {
      const value = 'sensitive data';
      const encrypted = encryption.EncryptedField.encrypt(value);
      
      expect(encrypted).not.toBeNull();
      expect(encrypted).not.toBe(value);
      
      const decrypted = encryption.EncryptedField.decrypt(encrypted!);
      expect(decrypted).toBe(value);
    });
  });
});
