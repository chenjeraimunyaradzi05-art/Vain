/**
 * Biometric Authentication Service for React Native - STUBBED
 * 
 * Authentication features have been removed. This file serves as a placeholder
 * to prevent import errors in legacy code.
 */

// Mock exports mimicking the original file structure
export const BiometricType = {
  FINGERPRINT: 1,
  FACIAL_RECOGNITION: 2,
  IRIS: 3,
};

export async function isBiometricSupported() { return false; }
export async function isBiometricEnrolled() { return false; }
export async function getAvailableBiometricTypes() { return []; }
export async function getBiometricTypeName() { return 'Biometrics'; }
export async function authenticateWithBiometrics() { return { success: true }; }
export async function isBiometricLoginEnabled() { return false; }
export async function enableBiometricLogin() { return false; }
export async function disableBiometricLogin() { return true; }
export async function biometricLogin() { return { success: true, token: 'mock-token' }; }
export async function updateStoredToken() { return true; }
export async function getBiometricStatus() {
  return {
    isSupported: false,
    isEnrolled: false,
    isEnabled: false,
    typeName: 'Biometrics',
    canEnable: false,
  };
}

export default {
  isBiometricSupported,
  isBiometricEnrolled,
  getAvailableBiometricTypes,
  getBiometricTypeName,
  authenticateWithBiometrics,
  isBiometricLoginEnabled,
  enableBiometricLogin,
  disableBiometricLogin,
  biometricLogin,
  updateStoredToken,
  getBiometricStatus,
  BiometricType,
};
