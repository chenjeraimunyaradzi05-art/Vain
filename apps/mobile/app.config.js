/**
 * Expo App Configuration for Vantage
 * 
 * This configuration supports:
 * - EAS Build and Submit
 * - Deep linking and universal links
 * - Push notifications
 * - App Store and Play Store metadata
 */

export default ({ config }) => ({
  ...config,
  name: 'Vantage',
  slug: 'vantage',
  version: '1.0.0',
  orientation: 'portrait',
  icon: './assets/icon.png',
  userInterfaceStyle: 'dark',
  
  // Splash screen configuration
  splash: {
    image: './assets/splash.png',
    resizeMode: 'contain',
    backgroundColor: '#0F172A',
  },
  
  // Asset bundling
  assetBundlePatterns: [
    '**/*',
  ],
  
  // iOS-specific configuration
  ios: {
    supportsTablet: true,
    bundleIdentifier: 'com.vantageplatform.app',
    buildNumber: '1',
    
    // App Store metadata
    config: {
      usesNonExemptEncryption: false,
    },
    
    // Info.plist additions
    infoPlist: {
      // Privacy permission descriptions
      NSCameraUsageDescription: 'Allow Vantage to access your camera to take photos for your profile or resume.',
      NSPhotoLibraryUsageDescription: 'Allow Vantage to access your photos to upload profile pictures or documents.',
      NSFaceIDUsageDescription: 'Use Face ID for quick and secure login to your Vantage account.',
      NSLocationWhenInUseUsageDescription: 'Allow Vantage to access your location to find nearby jobs and events.',
      
      // Background modes
      UIBackgroundModes: [
        'remote-notification',
        'fetch',
      ],
      
      // Accessibility
      UIAccessibilityTraits: 'UIAccessibilityTraitAllowsDirectInteraction',
    },
    
    // Universal links - Apple App Site Association
    associatedDomains: [
      'applinks:vantageplatform.com',
      'applinks:www.vantageplatform.com',
    ],
    
    // Push notifications
    entitlements: {
      'aps-environment': 'production',
    },
  },
  
  // Android-specific configuration
  android: {
    adaptiveIcon: {
      foregroundImage: './assets/adaptive-icon.png',
      backgroundColor: '#0F172A',
    },
    package: 'com.vantageplatform.app',
    versionCode: 1,
    
    // Permissions
    permissions: [
      'CAMERA',
      'READ_EXTERNAL_STORAGE',
      'WRITE_EXTERNAL_STORAGE',
      'ACCESS_FINE_LOCATION',
      'ACCESS_COARSE_LOCATION',
      'RECEIVE_BOOT_COMPLETED',
      'VIBRATE',
      'USE_BIOMETRIC',
      'USE_FINGERPRINT',
    ],
    
    // Intent filters for deep linking
    intentFilters: [
      {
        action: 'VIEW',
        autoVerify: true,
        data: [
          {
            scheme: 'https',
            host: 'vantageplatform.com',
            pathPrefix: '/jobs',
          },
          {
            scheme: 'https',
            host: 'vantageplatform.com',
            pathPrefix: '/courses',
          },
          {
            scheme: 'https',
            host: 'vantageplatform.com',
            pathPrefix: '/mentors',
          },
        ],
        category: ['BROWSABLE', 'DEFAULT'],
      },
      {
        action: 'VIEW',
        data: [
          {
            scheme: 'vantage',
          },
        ],
        category: ['BROWSABLE', 'DEFAULT'],
      },
    ],
    
    // Google Services for FCM
    googleServicesFile: process.env.GOOGLE_SERVICES_JSON || './google-services.json',
  },
  
  // Web configuration (for Expo web if needed)
  web: {
    favicon: './assets/favicon.png',
    bundler: 'metro',
  },
  
  // Expo plugins
  plugins: [
    // Notifications
    [
      'expo-notifications',
      {
        icon: './assets/notification-icon.png',
        color: '#3B82F6',
        sounds: ['./assets/sounds/notification.wav'],
      },
    ],
    
    // Document picker
    'expo-document-picker',
    
    // Local authentication (biometrics)
    'expo-local-authentication',
    
    // Secure storage
    'expo-secure-store',
    
    // Background fetch
    'expo-background-fetch',
    
    // Task manager
    'expo-task-manager',
    
    // Image picker
    [
      'expo-image-picker',
      {
        photosPermission: 'Allow Vantage to access your photos for profile and document uploads.',
        cameraPermission: 'Allow Vantage to use your camera for taking photos.',
      },
    ],
    
    // Location (for nearby jobs)
    [
      'expo-location',
      {
        locationAlwaysAndWhenInUsePermission: 'Allow Vantage to use your location to find nearby jobs and events.',
      },
    ],
  ],
  
  // Extra configuration
  extra: {
    // Environment variables
    apiUrl: process.env.EXPO_PUBLIC_API_URL || 'https://api.vantageplatform.com',
    sentryDsn: process.env.SENTRY_DSN,
    posthogApiKey: process.env.POSTHOG_API_KEY,
    
    // EAS configuration
    eas: {
      projectId: process.env.EAS_PROJECT_ID || 'your-project-id',
    },
    
    // Feature flags
    features: {
      biometricAuth: true,
      pushNotifications: true,
      offlineMode: true,
      culturalCalendar: true,
      wellnessCheckins: true,
    },
    
    // App metadata
    appMetadata: {
      name: 'Vantage',
      tagline: 'Pathway Platform for Progress',
      description: 'Discover opportunities, build skills, get guidance, and track your progress — wherever you are.',
      developer: 'Munyaradzi Chenjerai',
      supportEmail: 'support@vantageplatform.com',
      privacyUrl: 'https://vantageplatform.com/privacy',
      termsUrl: 'https://vantageplatform.com/terms',
    },
  },
  
  // Owner (for Expo organization)
  owner: 'vantageplatform',
  
  // Updates configuration
  updates: {
    enabled: true,
    checkAutomatically: 'ON_LOAD',
    fallbackToCacheTimeout: 30000,
    url: 'https://u.expo.dev/your-project-id',
  },
  
  // Runtime version for OTA updates
  runtimeVersion: {
    policy: 'sdkVersion',
  },
  
  // Hooks for build/submit
  hooks: {
    postPublish: [
      {
        file: 'sentry-expo/upload-sourcemaps',
        config: {
          organization: process.env.SENTRY_ORG,
          project: process.env.SENTRY_PROJECT,
        },
      },
    ],
  },
});
