// @ts-nocheck
/**
 * Feature Flags System
 * 
 * Simple feature flag management with support for:
 * - User targeting
 * - Percentage rollouts
 * - A/B testing integration
 */

const EventEmitter = require('events');

/**
 * Flag types
 */
const FlagType = {
  BOOLEAN: 'boolean',
  PERCENTAGE: 'percentage',
  VARIANT: 'variant',
  USER_LIST: 'user_list',
};

/**
 * Default feature flags
 */
const defaultFlags = {
  // Core features
  'feature.recommendations': {
    type: FlagType.BOOLEAN,
    enabled: true,
    description: 'AI-powered job recommendations',
  },
  'feature.video_calls': {
    type: FlagType.PERCENTAGE,
    percentage: 100,
    description: 'Video calling for mentor sessions',
  },
  'feature.dark_mode': {
    type: FlagType.BOOLEAN,
    enabled: true,
    description: 'Dark mode support',
  },
  'feature.biometric_auth': {
    type: FlagType.BOOLEAN,
    enabled: true,
    description: 'Biometric authentication on mobile',
  },
  
  // Beta features
  'beta.ai_resume_builder': {
    type: FlagType.PERCENTAGE,
    percentage: 50,
    description: 'AI-powered resume generation',
  },
  'beta.community_events': {
    type: FlagType.BOOLEAN,
    enabled: true,
    description: 'Community event creation and RSVP',
  },
  'beta.employer_analytics': {
    type: FlagType.USER_LIST,
    users: [],
    companies: ['premium'],
    description: 'Advanced employer analytics dashboard',
  },
  
  // Experiments
  'experiment.new_onboarding': {
    type: FlagType.VARIANT,
    variants: {
      control: 50,
      simplified: 25,
      guided: 25,
    },
    description: 'Testing new onboarding flows',
  },
  'experiment.job_card_layout': {
    type: FlagType.VARIANT,
    variants: {
      default: 70,
      compact: 15,
      detailed: 15,
    },
    description: 'Testing job card display variants',
  },
  
  // Ops flags
  'ops.maintenance_mode': {
    type: FlagType.BOOLEAN,
    enabled: false,
    description: 'Enable maintenance mode',
  },
  'ops.rate_limiting': {
    type: FlagType.BOOLEAN,
    enabled: true,
    description: 'Enable rate limiting',
  },
  'ops.debug_logging': {
    type: FlagType.BOOLEAN,
    enabled: false,
    description: 'Enable verbose debug logging',
  },
};

/**
 * Feature Flags Manager
 */
class FeatureFlagsManager extends EventEmitter {
  constructor(options = {}) {
    super();
    
    this.flags = new Map();
    this.overrides = new Map();
    this.evaluationCache = new Map();
    this.cacheTimeout = options.cacheTimeout || 5000; // 5 seconds
    
    // Load default flags
    this.loadFlags(defaultFlags);
    
    // Load from environment if specified
    if (options.envPrefix) {
      this.loadFromEnv(options.envPrefix);
    }
  }

  /**
   * Load flags from object
   */
  loadFlags(flags) {
    for (const [key, value] of Object.entries(flags)) {
      this.flags.set(key, value);
    }
    this.emit('flags:loaded', { count: Object.keys(flags).length });
  }

  /**
   * Load flags from environment variables
   */
  loadFromEnv(prefix = 'FEATURE_') {
    for (const [key, value] of Object.entries(process.env)) {
      if (key.startsWith(prefix)) {
        const flagName = key.slice(prefix.length).toLowerCase().replace(/_/g, '.');
        try {
          const parsed = JSON.parse(value);
          this.flags.set(flagName, parsed);
        } catch {
          // Treat as boolean
          this.flags.set(flagName, {
            type: FlagType.BOOLEAN,
            enabled: value === 'true' || value === '1',
          });
        }
      }
    }
  }

  /**
   * Get flag definition
   */
  getFlag(name) {
    return this.flags.get(name);
  }

  /**
   * Get all flags
   */
  getAllFlags() {
    const flags = {};
    for (const [key, value] of this.flags) {
      flags[key] = value;
    }
    return flags;
  }

  /**
   * Set a user-level override
   */
  setOverride(flagName, userId, value) {
    const key = `${flagName}:${userId}`;
    this.overrides.set(key, value);
    this.clearCache(flagName, userId);
    this.emit('override:set', { flagName, userId, value });
  }

  /**
   * Remove a user-level override
   */
  removeOverride(flagName, userId) {
    const key = `${flagName}:${userId}`;
    this.overrides.delete(key);
    this.clearCache(flagName, userId);
    this.emit('override:removed', { flagName, userId });
  }

  /**
   * Clear evaluation cache
   */
  clearCache(flagName, userId = null) {
    if (userId) {
      this.evaluationCache.delete(`${flagName}:${userId}`);
    } else {
      // Clear all cache for this flag
      for (const key of this.evaluationCache.keys()) {
        if (key.startsWith(`${flagName}:`)) {
          this.evaluationCache.delete(key);
        }
      }
    }
  }

  /**
   * Evaluate a flag for a user
   */
  evaluate(flagName, context = {}) {
    const cacheKey = `${flagName}:${context.userId || 'anonymous'}`;
    
    // Check cache
    const cached = this.evaluationCache.get(cacheKey);
    if (cached && Date.now() - cached.time < this.cacheTimeout) {
      return cached.value;
    }

    // Check override
    const override = this.overrides.get(cacheKey);
    if (override !== undefined) {
      this.cacheResult(cacheKey, override);
      return override;
    }

    // Get flag definition
    const flag = this.flags.get(flagName);
    if (!flag) {
      return null;
    }

    let result;
    switch (flag.type) {
      case FlagType.BOOLEAN:
        result = flag.enabled;
        break;
        
      case FlagType.PERCENTAGE:
        result = this.evaluatePercentage(flag, context);
        break;
        
      case FlagType.VARIANT:
        result = this.evaluateVariant(flag, context);
        break;
        
      case FlagType.USER_LIST:
        result = this.evaluateUserList(flag, context);
        break;
        
      default:
        result = false;
    }

    this.cacheResult(cacheKey, result);
    this.emit('flag:evaluated', { flagName, context, result });
    
    return result;
  }

  /**
   * Evaluate percentage-based flag
   */
  evaluatePercentage(flag, context) {
    const { userId = Math.random().toString() } = context;
    const hash = this.hashString(userId);
    const bucket = hash % 100;
    return bucket < flag.percentage;
  }

  /**
   * Evaluate variant flag
   */
  evaluateVariant(flag, context) {
    const { userId = Math.random().toString() } = context;
    const hash = this.hashString(userId);
    const bucket = hash % 100;
    
    let cumulative = 0;
    for (const [variant, percentage] of Object.entries(flag.variants)) {
      cumulative += percentage;
      if (bucket < cumulative) {
        return variant;
      }
    }
    
    return Object.keys(flag.variants)[0];
  }

  /**
   * Evaluate user list flag
   */
  evaluateUserList(flag, context) {
    const { userId, companyId, companyTier } = context;
    
    // Check user list
    if (flag.users && userId && flag.users.includes(userId)) {
      return true;
    }
    
    // Check company list
    if (flag.companies && companyId && flag.companies.includes(companyId)) {
      return true;
    }
    
    // Check company tier
    if (flag.companies && companyTier && flag.companies.includes(companyTier)) {
      return true;
    }
    
    return false;
  }

  /**
   * Cache evaluation result
   */
  cacheResult(key, value) {
    this.evaluationCache.set(key, { value, time: Date.now() });
  }

  /**
   * Simple string hash
   */
  hashString(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return Math.abs(hash);
  }

  /**
   * Check if feature is enabled (convenience method)
   */
  isEnabled(flagName, context = {}) {
    const result = this.evaluate(flagName, context);
    return result === true || (typeof result === 'string' && result !== 'control');
  }

  /**
   * Get variant (convenience method)
   */
  getVariant(flagName, context = {}) {
    return this.evaluate(flagName, context);
  }

  /**
   * Update a flag
   */
  updateFlag(flagName, updates) {
    const flag = this.flags.get(flagName);
    if (!flag) {
      throw new Error(`Flag not found: ${flagName}`);
    }
    
    const updated = { ...flag, ...updates };
    this.flags.set(flagName, updated);
    this.clearCache(flagName);
    this.emit('flag:updated', { flagName, updates });
    
    return updated;
  }

  /**
   * Create middleware for Express
   */
  middleware() {
    return (req, res, next) => {
      req.featureFlags = this;
      
      // Add convenience method to request
      req.isFeatureEnabled = (flagName) => {
        return this.isEnabled(flagName, {
          userId: req.user?.id,
          companyId: req.user?.companyId,
          companyTier: req.user?.companyTier,
        });
      };
      
      req.getFeatureVariant = (flagName) => {
        return this.getVariant(flagName, {
          userId: req.user?.id,
          companyId: req.user?.companyId,
          companyTier: req.user?.companyTier,
        });
      };
      
      next();
    };
  }

  /**
   * Export flags for client
   */
  getClientFlags(context = {}) {
    const clientFlags = {};
    
    for (const [name, flag] of this.flags) {
      // Only export non-ops flags to client
      if (!name.startsWith('ops.')) {
        clientFlags[name] = this.evaluate(name, context);
      }
    }
    
    return clientFlags;
  }
}

// Singleton instance
const featureFlags = new FeatureFlagsManager({ envPrefix: 'FEATURE_' });
