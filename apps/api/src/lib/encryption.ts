// @ts-nocheck
/**
 * Encryption Utilities
 * 
 * Secure encryption for sensitive data at rest.
 * Uses AES-256-GCM for authenticated encryption.
 */

import crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const AUTH_TAG_LENGTH = 16;
const KEY_LENGTH = 32;
const SALT_LENGTH = 16;

/**
 * Get encryption key from environment
 */
function getEncryptionKey(): Buffer {
  const key = process.env.ENCRYPTION_KEY;
  
  if (!key) {
    throw new Error('ENCRYPTION_KEY environment variable is not set');
  }
  
  // Support both raw hex keys and base64 encoded keys
  if (key.length === 64) {
    return Buffer.from(key, 'hex');
  } else if (key.length === 44) {
    return Buffer.from(key, 'base64');
  }
  
  throw new Error('ENCRYPTION_KEY must be 32 bytes (64 hex chars or 44 base64 chars)');
}

/**
 * Encrypt plaintext data
 */
export function encrypt(plaintext: string): string {
  const key = getEncryptionKey();
  const iv = crypto.randomBytes(IV_LENGTH);
  
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  
  const encrypted = Buffer.concat([
    cipher.update(plaintext, 'utf8'),
    cipher.final(),
  ]);
  
  const authTag = cipher.getAuthTag();
  
  // Combine IV + auth tag + ciphertext
  const combined = Buffer.concat([iv, authTag, encrypted]);
  
  return combined.toString('base64');
}

/**
 * Decrypt ciphertext
 */
export function decrypt(ciphertext: string): string {
  const key = getEncryptionKey();
  const combined = Buffer.from(ciphertext, 'base64');
  
  // Extract IV, auth tag, and encrypted data
  const iv = combined.subarray(0, IV_LENGTH);
  const authTag = combined.subarray(IV_LENGTH, IV_LENGTH + AUTH_TAG_LENGTH);
  const encrypted = combined.subarray(IV_LENGTH + AUTH_TAG_LENGTH);
  
  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);
  
  const decrypted = Buffer.concat([
    decipher.update(encrypted),
    decipher.final(),
  ]);
  
  return decrypted.toString('utf8');
}

/**
 * Encrypt with password (for user-provided passwords)
 */
export function encryptWithPassword(plaintext: string, password: string): string {
  const salt = crypto.randomBytes(SALT_LENGTH);
  const key = crypto.pbkdf2Sync(password, salt, 100000, KEY_LENGTH, 'sha256');
  const iv = crypto.randomBytes(IV_LENGTH);
  
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  
  const encrypted = Buffer.concat([
    cipher.update(plaintext, 'utf8'),
    cipher.final(),
  ]);
  
  const authTag = cipher.getAuthTag();
  
  // Combine salt + IV + auth tag + ciphertext
  const combined = Buffer.concat([salt, iv, authTag, encrypted]);
  
  return combined.toString('base64');
}

/**
 * Decrypt with password
 */
export function decryptWithPassword(ciphertext: string, password: string): string {
  const combined = Buffer.from(ciphertext, 'base64');
  
  const salt = combined.subarray(0, SALT_LENGTH);
  const iv = combined.subarray(SALT_LENGTH, SALT_LENGTH + IV_LENGTH);
  const authTag = combined.subarray(SALT_LENGTH + IV_LENGTH, SALT_LENGTH + IV_LENGTH + AUTH_TAG_LENGTH);
  const encrypted = combined.subarray(SALT_LENGTH + IV_LENGTH + AUTH_TAG_LENGTH);
  
  const key = crypto.pbkdf2Sync(password, salt, 100000, KEY_LENGTH, 'sha256');
  
  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);
  
  const decrypted = Buffer.concat([
    decipher.update(encrypted),
    decipher.final(),
  ]);
  
  return decrypted.toString('utf8');
}

/**
 * Hash sensitive data for searchable encryption
 */
export function blindIndex(value: string, salt?: string): string {
  const indexSalt = salt || process.env.BLIND_INDEX_SALT;
  
  if (!indexSalt) {
    throw new Error('BLIND_INDEX_SALT environment variable is not set');
  }
  
  return crypto
    .createHmac('sha256', indexSalt)
    .update(value.toLowerCase().trim())
    .digest('hex');
}

/**
 * Generate a random encryption key
 */
export function generateKey(): { hex: string; base64: string } {
  const key = crypto.randomBytes(KEY_LENGTH);
  return {
    hex: key.toString('hex'),
    base64: key.toString('base64'),
  };
}

/**
 * Encrypt object (for JSON data)
 */
export function encryptObject<T extends object>(obj: T): string {
  return encrypt(JSON.stringify(obj));
}

/**
 * Decrypt object
 */
export function decryptObject<T extends object>(ciphertext: string): T {
  return JSON.parse(decrypt(ciphertext));
}

/**
 * Securely compare two strings (timing-safe)
 */
export function secureCompare(a: string, b: string): boolean {
  if (a.length !== b.length) {
    return false;
  }
  
  return crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b));
}

/**
 * Generate a secure random token
 */
export function generateToken(length: number = 32): string {
  return crypto.randomBytes(length).toString('base64url');
}

/**
 * Hash a value with SHA-256
 */
export function hash(value: string): string {
  return crypto.createHash('sha256').update(value).digest('hex');
}

/**
 * Hash a value with SHA-512
 */
export function hashSha512(value: string): string {
  return crypto.createHash('sha512').update(value).digest('hex');
}

/**
 * Create HMAC signature
 */
export function hmacSign(data: string, secret?: string): string {
  const signingSecret = secret || process.env.HMAC_SECRET;
  
  if (!signingSecret) {
    throw new Error('HMAC_SECRET environment variable is not set');
  }
  
  return crypto
    .createHmac('sha256', signingSecret)
    .update(data)
    .digest('hex');
}

/**
 * Verify HMAC signature
 */
export function hmacVerify(data: string, signature: string, secret?: string): boolean {
  const expectedSignature = hmacSign(data, secret);
  return secureCompare(expectedSignature, signature);
}

/**
 * Field-level encryption for database models
 */
export class EncryptedField {
  private static cache = new Map<string, string>();

  static encrypt(value: string | null | undefined): string | null {
    if (value === null || value === undefined) return null;
    return encrypt(value);
  }

  static decrypt(value: string | null | undefined): string | null {
    if (value === null || value === undefined) return null;
    
    // Check cache first
    const cached = this.cache.get(value);
    if (cached) return cached;
    
    const decrypted = decrypt(value);
    
    // Cache for performance
    this.cache.set(value, decrypted);
    if (this.cache.size > 1000) {
      // Clear cache if too large
      this.cache.clear();
    }
    
    return decrypted;
  }
}

// =============================================================================
// END-TO-END ENCRYPTION (E2EE) FOR MESSAGING
// Implements Signal Protocol-like encryption for secure messaging
// =============================================================================

const E2EE_IV_LENGTH = 12; // 96 bits for GCM

/**
 * Key pair for E2EE
 */
export interface E2EEKeyPair {
  publicKey: string;
  privateKey: string;
}

/**
 * Encrypted message structure
 */
export interface EncryptedMessage {
  ciphertext: string;
  iv: string;
  authTag: string;
  ephemeralPublicKey?: string;
  salt?: string;
  version: number;
}

/**
 * Generate an ECDH key pair for E2EE
 */
export function generateE2EEKeyPair(): E2EEKeyPair {
  const ecdh = crypto.createECDH('prime256v1');
  ecdh.generateKeys();
  
  return {
    publicKey: ecdh.getPublicKey('base64'),
    privateKey: ecdh.getPrivateKey('base64'),
  };
}

/**
 * Derive shared secret from ECDH key exchange
 */
export function deriveSharedSecret(
  privateKey: string,
  otherPublicKey: string
): Buffer {
  const ecdh = crypto.createECDH('prime256v1');
  ecdh.setPrivateKey(Buffer.from(privateKey, 'base64'));
  return ecdh.computeSecret(Buffer.from(otherPublicKey, 'base64'));
}

/**
 * Derive encryption key using HKDF
 */
export function deriveEncryptionKey(
  sharedSecret: Buffer,
  salt: Buffer,
  info: string = 'gimbi-e2ee-v1'
): Buffer {
  return crypto.hkdfSync(
    'sha256',
    sharedSecret,
    salt,
    Buffer.from(info),
    KEY_LENGTH
  );
}

/**
 * Encrypt message with E2EE for recipient
 * Uses ephemeral key pair for Perfect Forward Secrecy
 */
export function encryptE2EE(
  plaintext: string,
  recipientPublicKey: string,
  conversationId: string
): EncryptedMessage {
  // Generate ephemeral key pair for PFS
  const ephemeral = generateE2EEKeyPair();
  
  // Derive shared secret
  const sharedSecret = deriveSharedSecret(ephemeral.privateKey, recipientPublicKey);
  
  // Generate salt for key derivation
  const salt = crypto.randomBytes(SALT_LENGTH);
  
  // Derive encryption key
  const encryptionKey = deriveEncryptionKey(sharedSecret, salt);
  
  // Encrypt
  const iv = crypto.randomBytes(E2EE_IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, encryptionKey, iv, {
    authTagLength: AUTH_TAG_LENGTH,
  });
  
  // Use conversation ID as additional authenticated data
  cipher.setAAD(Buffer.from(conversationId));
  
  let encrypted = cipher.update(plaintext, 'utf8', 'base64');
  encrypted += cipher.final('base64');
  
  return {
    ciphertext: encrypted,
    iv: iv.toString('base64'),
    authTag: cipher.getAuthTag().toString('base64'),
    ephemeralPublicKey: ephemeral.publicKey,
    salt: salt.toString('base64'),
    version: 1,
  };
}

/**
 * Decrypt E2EE message
 */
export function decryptE2EE(
  encryptedMessage: EncryptedMessage,
  recipientPrivateKey: string,
  conversationId: string
): string {
  if (!encryptedMessage.ephemeralPublicKey || !encryptedMessage.salt) {
    throw new Error('Invalid encrypted message format');
  }
  
  // Derive shared secret from ephemeral public key
  const sharedSecret = deriveSharedSecret(
    recipientPrivateKey,
    encryptedMessage.ephemeralPublicKey
  );
  
  // Derive encryption key
  const encryptionKey = deriveEncryptionKey(
    sharedSecret,
    Buffer.from(encryptedMessage.salt, 'base64')
  );
  
  // Decrypt
  const decipher = crypto.createDecipheriv(
    ALGORITHM,
    encryptionKey,
    Buffer.from(encryptedMessage.iv, 'base64'),
    { authTagLength: AUTH_TAG_LENGTH }
  );
  
  decipher.setAuthTag(Buffer.from(encryptedMessage.authTag, 'base64'));
  decipher.setAAD(Buffer.from(conversationId));
  
  let decrypted = decipher.update(encryptedMessage.ciphertext, 'base64', 'utf8');
  decrypted += decipher.final('utf8');
  
  return decrypted;
}

/**
 * Verify message integrity
 */
export function verifyMessageIntegrity(content: string, expectedHash: string): boolean {
  const actualHash = hash(content);
  return secureCompare(actualHash, expectedHash);
}

export default {
  encrypt,
  decrypt,
  encryptWithPassword,
  decryptWithPassword,
  blindIndex,
  generateKey,
  encryptObject,
  decryptObject,
  secureCompare,
  generateToken,
  hash,
  hashSha512,
  hmacSign,
  hmacVerify,
  EncryptedField,
  // E2EE exports
  generateE2EEKeyPair,
  deriveSharedSecret,
  deriveEncryptionKey,
  encryptE2EE,
  decryptE2EE,
  verifyMessageIntegrity,
};
