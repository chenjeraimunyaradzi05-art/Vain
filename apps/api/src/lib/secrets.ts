// @ts-nocheck
/**
 * Secrets Management
 * Secure secret storage, rotation, and access control
 */

import crypto from 'crypto';
import logger from './logger';

// Secret providers
const PROVIDERS = {
  ENV: 'environment',
  AWS: 'aws-secrets-manager',
  VAULT: 'hashicorp-vault',
  AZURE: 'azure-key-vault',
  GCP: 'gcp-secret-manager',
};

// Current provider
const CURRENT_PROVIDER = process.env.SECRETS_PROVIDER || PROVIDERS.ENV;

// Secret cache with TTL
const secretCache = new Map();
const SECRET_CACHE_TTL = 5 * 60 * 1000; // 5 minutes

// Encryption key for local secret encryption
const LOCAL_ENCRYPTION_KEY = process.env.LOCAL_SECRETS_KEY || 
  crypto.randomBytes(32).toString('hex');

/**
 * Secret Manager class
 */
class SecretManager {
  constructor() {
    this.provider = CURRENT_PROVIDER;
    this.initialized = false;
    this.rotationCallbacks = new Map();
  }

  /**
   * Initialize the secret manager
   */
  async initialize() {
    if (this.initialized) return;

    switch (this.provider) {
      case PROVIDERS.AWS:
        await this.initAWS();
        break;
      case PROVIDERS.VAULT:
        await this.initVault();
        break;
      case PROVIDERS.AZURE:
        await this.initAzure();
        break;
      case PROVIDERS.GCP:
        await this.initGCP();
        break;
      default:
        logger.info('Using environment variables for secrets');
    }

    this.initialized = true;
    logger.info('Secret manager initialized', { provider: this.provider });
  }

  /**
   * Initialize AWS Secrets Manager
   */
  async initAWS() {
    try {
      // Lazy import AWS SDK
      const { SecretsManagerClient, GetSecretValueCommand } = await import('@aws-sdk/client-secrets-manager');
      this.awsClient = new SecretsManagerClient({
        region: process.env.AWS_REGION || 'ap-southeast-2',
      });
      logger.info('AWS Secrets Manager initialized');
    } catch (error) {
      logger.error('Failed to initialize AWS Secrets Manager', { error: error.message });
      throw error;
    }
  }

  /**
   * Initialize HashiCorp Vault
   */
  async initVault() {
    try {
      // Lazy import Vault client
      const vault = await import('node-vault');
      this.vaultClient = vault.default({
        endpoint: process.env.VAULT_ADDR || 'http://127.0.0.1:8200',
        token: process.env.VAULT_TOKEN,
      });
      
      // Verify connection
      await this.vaultClient.health();
      logger.info('HashiCorp Vault initialized');
    } catch (error) {
      logger.error('Failed to initialize Vault', { error: error.message });
      throw error;
    }
  }

  /**
   * Initialize Azure Key Vault
   */
  async initAzure() {
    try {
      const { DefaultAzureCredential } = await import('@azure/identity');
      const { SecretClient } = await import('@azure/keyvault-secrets');
      
      const credential = new DefaultAzureCredential();
      const vaultName = process.env.AZURE_KEYVAULT_NAME;
      const vaultUrl = `https://${vaultName}.vault.azure.net`;
      
      this.azureClient = new SecretClient(vaultUrl, credential);
      logger.info('Azure Key Vault initialized');
    } catch (error) {
      logger.error('Failed to initialize Azure Key Vault', { error: error.message });
      throw error;
    }
  }

  /**
   * Initialize GCP Secret Manager
   */
  async initGCP() {
    try {
      const { SecretManagerServiceClient } = await import('@google-cloud/secret-manager');
      this.gcpClient = new SecretManagerServiceClient();
      this.gcpProject = process.env.GCP_PROJECT_ID;
      logger.info('GCP Secret Manager initialized');
    } catch (error) {
      logger.error('Failed to initialize GCP Secret Manager', { error: error.message });
      throw error;
    }
  }

  /**
   * Get a secret by name
   */
  async getSecret(name, options = {}) {
    const cacheKey = `${this.provider}:${name}`;
    
    // Check cache first
    if (!options.skipCache) {
      const cached = secretCache.get(cacheKey);
      if (cached && Date.now() - cached.timestamp < SECRET_CACHE_TTL) {
        return cached.value;
      }
    }

    let value;

    switch (this.provider) {
      case PROVIDERS.AWS:
        value = await this.getFromAWS(name);
        break;
      case PROVIDERS.VAULT:
        value = await this.getFromVault(name);
        break;
      case PROVIDERS.AZURE:
        value = await this.getFromAzure(name);
        break;
      case PROVIDERS.GCP:
        value = await this.getFromGCP(name);
        break;
      default:
        value = this.getFromEnv(name);
    }

    // Cache the result
    if (value) {
      secretCache.set(cacheKey, {
        value,
        timestamp: Date.now(),
      });
    }

    return value;
  }

  /**
   * Get secret from AWS Secrets Manager
   */
  async getFromAWS(name) {
    try {
      const { GetSecretValueCommand } = await import('@aws-sdk/client-secrets-manager');
      const response = await this.awsClient.send(
        new GetSecretValueCommand({ SecretId: name })
      );
      
      if (response.SecretString) {
        return JSON.parse(response.SecretString);
      }
      return response.SecretBinary;
    } catch (error) {
      logger.error('Failed to get secret from AWS', { name, error: error.message });
      return null;
    }
  }

  /**
   * Get secret from HashiCorp Vault
   */
  async getFromVault(name) {
    try {
      const path = process.env.VAULT_SECRET_PATH || 'secret/data/ngurra';
      const response = await this.vaultClient.read(`${path}/${name}`);
      return response.data.data;
    } catch (error) {
      logger.error('Failed to get secret from Vault', { name, error: error.message });
      return null;
    }
  }

  /**
   * Get secret from Azure Key Vault
   */
  async getFromAzure(name) {
    try {
      const secret = await this.azureClient.getSecret(name);
      return secret.value;
    } catch (error) {
      logger.error('Failed to get secret from Azure', { name, error: error.message });
      return null;
    }
  }

  /**
   * Get secret from GCP Secret Manager
   */
  async getFromGCP(name) {
    try {
      const [version] = await this.gcpClient.accessSecretVersion({
        name: `projects/${this.gcpProject}/secrets/${name}/versions/latest`,
      });
      return version.payload.data.toString('utf8');
    } catch (error) {
      logger.error('Failed to get secret from GCP', { name, error: error.message });
      return null;
    }
  }

  /**
   * Get secret from environment variable
   */
  getFromEnv(name) {
    // Convert secret name to env var format
    const envName = name.toUpperCase().replace(/-/g, '_');
    return process.env[envName];
  }

  /**
   * Store a secret
   */
  async setSecret(name, value, options = {}) {
    switch (this.provider) {
      case PROVIDERS.AWS:
        return this.setInAWS(name, value, options);
      case PROVIDERS.VAULT:
        return this.setInVault(name, value, options);
      case PROVIDERS.AZURE:
        return this.setInAzure(name, value, options);
      case PROVIDERS.GCP:
        return this.setInGCP(name, value, options);
      default:
        throw new Error('Cannot set secrets in environment provider');
    }
  }

  /**
   * Store secret in AWS Secrets Manager
   */
  async setInAWS(name, value, options = {}) {
    try {
      const { PutSecretValueCommand, CreateSecretCommand } = await import('@aws-sdk/client-secrets-manager');
      
      const secretValue = typeof value === 'string' ? value : JSON.stringify(value);
      
      try {
        await this.awsClient.send(new PutSecretValueCommand({
          SecretId: name,
          SecretString: secretValue,
        }));
      } catch (error) {
        if (error.name === 'ResourceNotFoundException') {
          await this.awsClient.send(new CreateSecretCommand({
            Name: name,
            SecretString: secretValue,
            Description: options.description || 'Ngurra Pathways secret',
          }));
        } else {
          throw error;
        }
      }
      
      // Invalidate cache
      secretCache.delete(`${this.provider}:${name}`);
      
      logger.info('Secret stored in AWS', { name });
      return true;
    } catch (error) {
      logger.error('Failed to set secret in AWS', { name, error: error.message });
      throw error;
    }
  }

  /**
   * Store secret in HashiCorp Vault
   */
  async setInVault(name, value, options = {}) {
    try {
      const path = process.env.VAULT_SECRET_PATH || 'secret/data/ngurra';
      await this.vaultClient.write(`${path}/${name}`, {
        data: typeof value === 'object' ? value : { value },
      });
      
      secretCache.delete(`${this.provider}:${name}`);
      
      logger.info('Secret stored in Vault', { name });
      return true;
    } catch (error) {
      logger.error('Failed to set secret in Vault', { name, error: error.message });
      throw error;
    }
  }

  /**
   * Store secret in Azure Key Vault
   */
  async setInAzure(name, value, options = {}) {
    try {
      const secretValue = typeof value === 'string' ? value : JSON.stringify(value);
      await this.azureClient.setSecret(name, secretValue);
      
      secretCache.delete(`${this.provider}:${name}`);
      
      logger.info('Secret stored in Azure', { name });
      return true;
    } catch (error) {
      logger.error('Failed to set secret in Azure', { name, error: error.message });
      throw error;
    }
  }

  /**
   * Store secret in GCP Secret Manager
   */
  async setInGCP(name, value, options = {}) {
    try {
      const secretValue = typeof value === 'string' ? value : JSON.stringify(value);
      const payload = Buffer.from(secretValue, 'utf8');

      // Create secret if it doesn't exist
      try {
        await this.gcpClient.createSecret({
          parent: `projects/${this.gcpProject}`,
          secretId: name,
          secret: {
            replication: { automatic: {} },
          },
        });
      } catch (error) {
        if (!error.message.includes('already exists')) {
          throw error;
        }
      }

      // Add new version
      await this.gcpClient.addSecretVersion({
        parent: `projects/${this.gcpProject}/secrets/${name}`,
        payload: { data: payload },
      });
      
      secretCache.delete(`${this.provider}:${name}`);
      
      logger.info('Secret stored in GCP', { name });
      return true;
    } catch (error) {
      logger.error('Failed to set secret in GCP', { name, error: error.message });
      throw error;
    }
  }

  /**
   * Rotate a secret
   */
  async rotateSecret(name, generator) {
    const newValue = await generator();
    await this.setSecret(name, newValue);
    
    // Notify rotation callbacks
    const callbacks = this.rotationCallbacks.get(name) || [];
    for (const callback of callbacks) {
      try {
        await callback(newValue);
      } catch (error) {
        logger.error('Rotation callback failed', { name, error: error.message });
      }
    }

    logger.info('Secret rotated', { name });
    return newValue;
  }

  /**
   * Register callback for secret rotation
   */
  onRotation(name, callback) {
    if (!this.rotationCallbacks.has(name)) {
      this.rotationCallbacks.set(name, []);
    }
    this.rotationCallbacks.get(name).push(callback);
  }

  /**
   * Clear secret cache
   */
  clearCache() {
    secretCache.clear();
    logger.info('Secret cache cleared');
  }

  /**
   * Get provider status
   */
  async getStatus() {
    return {
      provider: this.provider,
      initialized: this.initialized,
      cacheSize: secretCache.size,
      cacheTTL: SECRET_CACHE_TTL,
    };
  }
}

// Export singleton
export const secretManager = new SecretManager();

/**
 * Helper: Get required secrets at startup
 */
export async function loadRequiredSecrets() {
  await secretManager.initialize();

  const required = [
    'DATABASE_URL',
    'JWT_SECRET',
    'ENCRYPTION_KEY',
  ];

  const secrets = {};
  const missing = [];

  for (const name of required) {
    const value = await secretManager.getSecret(name);
    if (value) {
      secrets[name] = value;
    } else {
      missing.push(name);
    }
  }

  if (missing.length > 0) {
    logger.error('Missing required secrets', { missing });
    throw new Error(`Missing required secrets: ${missing.join(', ')}`);
  }

  return secrets;
}

/**
 * Generate a secure random secret
 */
export function generateSecret(length = 32) {
  return crypto.randomBytes(length).toString('hex');
}

/**
 * Encrypt a value for local storage
 */
export function encryptLocal(value) {
  const iv = crypto.randomBytes(16);
  const key = Buffer.from(LOCAL_ENCRYPTION_KEY.slice(0, 32), 'hex');
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  
  let encrypted = cipher.update(value, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  
  const authTag = cipher.getAuthTag();
  
  return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
}

/**
 * Decrypt a locally encrypted value
 */
export function decryptLocal(encrypted) {
  const [ivHex, authTagHex, data] = encrypted.split(':');
  
  const iv = Buffer.from(ivHex, 'hex');
  const authTag = Buffer.from(authTagHex, 'hex');
  const key = Buffer.from(LOCAL_ENCRYPTION_KEY.slice(0, 32), 'hex');
  
  const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAuthTag(authTag);
  
  let decrypted = decipher.update(data, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  
  return decrypted;
}

/**
 * Secret rotation schedule
 */
export const ROTATION_SCHEDULE = {
  JWT_SECRET: 30 * 24 * 60 * 60 * 1000,  // 30 days
  API_KEYS: 90 * 24 * 60 * 60 * 1000,    // 90 days
  ENCRYPTION_KEY: 365 * 24 * 60 * 60 * 1000, // 1 year (with re-encryption)
};

export default {
  secretManager,
  loadRequiredSecrets,
  generateSecret,
  encryptLocal,
  decryptLocal,
  ROTATION_SCHEDULE,
};

export {};

