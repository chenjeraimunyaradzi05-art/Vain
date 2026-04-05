/**
 * Onboarding Purpose Screen
 * 
 * Purpose selection wizard for new Vantage users
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Animated,
  Dimensions,
  SafeAreaView,
  StatusBar
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { theme } from '../theme';
import { onboardingApi } from '../services/api';
import { useSession } from '../hooks/useSession';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface Purpose {
  value: string;
  label: string;
  description: string;
  icon: string;
  color: string;
  features: string[];
}

const PURPOSE_OPTIONS: Purpose[] = [
  {
    value: 'work',
    label: 'Find Work',
    description: 'Looking for job opportunities and employment',
    icon: '💼',
    color: '#3b82f6',
    features: ['Job matching', 'Applications tracking', 'Employer connections']
  },
  {
    value: 'learning',
    label: 'Learn Skills',
    description: 'Building skills through courses and training',
    icon: '📚',
    color: '#10b981',
    features: ['Course recommendations', 'Skill tracking', 'Certification pathways']
  },
  {
    value: 'mentorship',
    label: 'Get Guidance',
    description: 'Connect with mentors and career advisors',
    icon: '🌟',
    color: '#8b5cf6',
    features: ['Mentor matching', 'Career guidance', 'Professional support']
  },
  {
    value: 'community',
    label: 'Connect & Support',
    description: 'Join community discussions and support networks',
    icon: '🤝',
    color: '#ec4899',
    features: ['Community forums', 'Peer support', 'Networking opportunities']
  }
];

const SECONDARY_OPTIONS: Purpose[] = PURPOSE_OPTIONS.filter(p => p.value !== 'work');

type RootStackParamList = {
  Dashboard: undefined;
  Login: undefined;
  OnboardingPurpose: undefined;
};

type OnboardingPurposeScreenNavigationProp = NativeStackNavigationProp<RootStackParamList>;

export default function OnboardingPurposeScreen() {
  const navigation = useNavigation<OnboardingPurposeScreenNavigationProp>();
  const { session } = useSession();
  
  const [currentStep, setCurrentStep] = useState<'welcome' | 'primary' | 'secondary' | 'confirm'>('welcome');
  const [selectedPrimary, setSelectedPrimary] = useState<string | null>(null);
  const [selectedSecondary, setSelectedSecondary] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Animation values
  const fadeAnim = React.useRef(new Animated.Value(0)).current;
  const slideAnim = React.useRef(new Animated.Value(50)).current;

  useEffect(() => {
    checkExistingPurpose();
    // Start entrance animation
    Animated.parallel([
      Animated.timing(fadeAnim, {
        to: 1,
        duration: 500,
        useNativeDriver: false,
      }),
      Animated.timing(slideAnim, {
        to: 0,
        duration: 500,
        useNativeDriver: false,
      })
    ]).start();
  }, []);

  const checkExistingPurpose = async () => {
    try {
      if (!session?.token) {
        navigation.replace('Login');
        return;
      }

      const response = await onboardingApi.checkPurpose();
      if (response.hasPurpose) {
        navigation.replace('Dashboard');
      }
    } catch (error) {
      console.error('Error checking existing purpose:', error);
    }
  };

  const handlePrimarySelect = (value: string) => {
    setSelectedPrimary(value);
    setError(null);
  };

  const handleSecondarySelect = (value: string) => {
    if (value !== selectedPrimary) {
      setSelectedSecondary(value);
    }
  };

  const handleSubmit = async () => {
    if (!selectedPrimary) {
      setError('Please select your primary purpose');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      if (!session?.token) {
        throw new Error('No authentication token found');
      }

      await onboardingApi.savePurpose({
        primary: selectedPrimary,
        secondary: selectedSecondary
      });

      // Navigate to dashboard
      navigation.replace('Dashboard');

    } catch (error) {
      console.error('Error saving purpose:', error);
      setError(error instanceof Error ? error.message : 'Failed to save your purpose');
    } finally {
      setIsLoading(false);
    }
  };

  const nextStep = () => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        to: 0,
        duration: 200,
        useNativeDriver: false,
      }),
      Animated.timing(slideAnim, {
        to: -50,
        duration: 200,
        useNativeDriver: false,
      })
    ]).start(() => {
      if (currentStep === 'welcome') setCurrentStep('primary');
      else if (currentStep === 'primary') setCurrentStep('secondary');
      else if (currentStep === 'secondary') setCurrentStep('confirm');
      
      Animated.parallel([
        Animated.timing(fadeAnim, {
          to: 1,
          duration: 200,
          useNativeDriver: false,
        }),
        Animated.timing(slideAnim, {
          to: 0,
          duration: 200,
          useNativeDriver: false,
        })
      ]).start();
    });
  };

  const prevStep = () => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        to: 0,
        duration: 200,
        useNativeDriver: false,
      }),
      Animated.timing(slideAnim, {
        to: 50,
        duration: 200,
        useNativeDriver: false,
      })
    ]).start(() => {
      if (currentStep === 'primary') setCurrentStep('welcome');
      else if (currentStep === 'secondary') setCurrentStep('primary');
      else if (currentStep === 'confirm') setCurrentStep('secondary');
      
      Animated.parallel([
        Animated.timing(fadeAnim, {
          to: 1,
          duration: 200,
          useNativeDriver: false,
        }),
        Animated.timing(slideAnim, {
          to: 0,
          duration: 200,
          useNativeDriver: false,
        })
      ]).start();
    });
  };

  const renderWelcome = () => (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.content}>
          <View style={styles.header}>
            <Text style={styles.title}>Welcome to Vantage</Text>
            <Text style={styles.subtitle}>
              Let us know what brings you here so we can personalize your experience
            </Text>
          </View>

          <View style={styles.stepIndicator}>
            <View style={[styles.stepDot, styles.activeStep]} />
            <View style={styles.stepDot} />
            <View style={styles.stepDot} />
            <View style={styles.stepDot} />
          </View>

          <View style={styles.purposeGrid}>
            {PURPOSE_OPTIONS.map((option, index) => (
              <TouchableOpacity
                key={option.value}
                style={styles.purposeCard}
                onPress={() => {
                  setSelectedPrimary(option.value);
                  setCurrentStep('primary');
                }}
                activeOpacity={0.8}
              >
                <View style={styles.purposeIcon}>
                  <Text style={styles.iconText}>{option.icon}</Text>
                </View>
                <Text style={styles.purposeTitle}>{option.label}</Text>
                <Text style={styles.purposeDescription}>{option.description}</Text>
                <View style={styles.features}>
                  {option.features.map((feature, idx) => (
                    <View key={idx} style={styles.feature}>
                      <Ionicons name="checkmark-circle" size={12} color={option.color} />
                      <Text style={styles.featureText}>{feature}</Text>
                    </View>
                  ))}
                </View>
              </TouchableOpacity>
            ))}
          </View>

          <TouchableOpacity
            style={styles.nextButton}
            onPress={nextStep}
          >
            <Text style={styles.nextButtonText}>Get Started</Text>
            <Ionicons name="arrow-forward" size={20} color="#ffffff" />
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </ScrollView>
  );

  const renderPrimarySelection = () => (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.content}>
          <View style={styles.header}>
            <Text style={styles.title}>What's your main goal?</Text>
            <Text style={styles.subtitle}>
              This will be your primary focus on Vantage
            </Text>
          </View>

          <View style={styles.stepIndicator}>
            <View style={styles.stepDot} />
            <View style={[styles.stepDot, styles.activeStep]} />
            <View style={styles.stepDot} />
            <View style={styles.stepDot} />
          </View>

          <View style={styles.purposeGrid}>
            {PURPOSE_OPTIONS.map((option) => (
              <TouchableOpacity
                key={option.value}
                style={[
                  styles.purposeCard,
                  selectedPrimary === option.value && styles.selectedPurposeCard
                ]}
                onPress={() => handlePrimarySelect(option.value)}
                activeOpacity={0.8}
              >
                <View style={styles.purposeIcon}>
                  <Text style={styles.iconText}>{option.icon}</Text>
                </View>
                <Text style={styles.purposeTitle}>{option.label}</Text>
                <Text style={styles.purposeDescription}>{option.description}</Text>
                <View style={styles.features}>
                  {option.features.map((feature, idx) => (
                    <View key={idx} style={styles.feature}>
                      <Ionicons name="checkmark-circle" size={12} color={option.color} />
                      <Text style={styles.featureText}>{feature}</Text>
                    </View>
                  ))}
                </View>
                {selectedPrimary === option.value && (
                  <View style={styles.selectedIndicator}>
                    <Ionicons name="checkmark-circle" size={24} color="#10b981" />
                  </View>
                )}
              </TouchableOpacity>
            ))}
          </View>

          <View style={styles.buttonRow}>
            <TouchableOpacity
              style={[styles.button, styles.secondaryButton]}
              onPress={prevStep}
            >
              <Text style={styles.secondaryButtonText}>Back</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.button,
                styles.primaryButton,
                !selectedPrimary && styles.disabledButton
              ]}
              onPress={nextStep}
              disabled={!selectedPrimary}
            >
              <Text style={styles.primaryButtonText}>Next</Text>
              <Ionicons name="arrow-forward" size={20} color="#ffffff" />
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>
    </ScrollView>
  );

  const renderSecondarySelection = () => (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.content}>
          <View style={styles.header}>
            <Text style={styles.title}>Any other interests?</Text>
            <Text style={styles.subtitle}>
              Choose an optional secondary interest (you can skip this)
            </Text>
          </View>

          <View style={styles.stepIndicator}>
            <View style={styles.stepDot} />
            <View style={styles.stepDot} />
            <View style={[styles.stepDot, styles.activeStep]} />
            <View style={styles.stepDot} />
          </View>

          <View style={styles.secondaryCard}>
            <Text style={styles.secondaryTitle}>Your primary focus is</Text>
            <Text style={styles.secondaryValue}>
              {PURPOSE_OPTIONS.find(p => p.value === selectedPrimary)?.label}
            </Text>
          </View>

          <Text style={styles.secondaryQuestion}>Would you like to add a secondary interest?</Text>
          
          <View style={styles.secondaryGrid}>
            {SECONDARY_OPTIONS.map((option) => (
              <TouchableOpacity
                key={option.value}
                style={[
                  styles.secondaryOptionCard,
                  selectedSecondary === option.value && styles.selectedSecondaryCard
                ]}
                onPress={() => handleSecondarySelect(option.value)}
                activeOpacity={0.8}
              >
                <Text style={styles.secondaryOptionIcon}>{option.icon}</Text>
                <Text style={styles.secondaryOptionLabel}>{option.label}</Text>
                {selectedSecondary === option.value && (
                  <View style={styles.selectedIndicator}>
                    <Ionicons name="checkmark-circle" size={20} color="#10b981" />
                  </View>
                )}
              </TouchableOpacity>
            ))}
          </View>

          <TouchableOpacity
            style={styles.skipButton}
            onPress={() => setSelectedSecondary(null)}
          >
            <Text style={styles.skipButtonText}>Skip secondary selection</Text>
          </TouchableOpacity>

          <View style={styles.buttonRow}>
            <TouchableOpacity
              style={[styles.button, styles.secondaryButton]}
              onPress={prevStep}
            >
              <Text style={styles.secondaryButtonText}>Back</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.button, styles.primaryButton]}
              onPress={nextStep}
            >
              <Text style={styles.primaryButtonText}>Next</Text>
              <Ionicons name="arrow-forward" size={20} color="#ffffff" />
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>
    </ScrollView>
  );

  const renderConfirm = () => (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.content}>
          <View style={styles.header}>
            <Text style={styles.title}>Confirm your choices</Text>
            <Text style={styles.subtitle}>
              Review your selections before we personalize your experience
            </Text>
          </View>

          <View style={styles.stepIndicator}>
            <View style={styles.stepDot} />
            <View style={styles.stepDot} />
            <View style={styles.stepDot} />
            <View style={[styles.stepDot, styles.activeStep]} />
          </View>

          <View style={styles.confirmCard}>
            <View style={styles.confirmSection}>
              <Text style={styles.confirmLabel}>Primary Focus</Text>
              <View style={styles.confirmValue}>
                <Text style={styles.confirmIcon}>
                  {PURPOSE_OPTIONS.find(p => p.value === selectedPrimary)?.icon}
                </Text>
                <Text style={styles.confirmText}>
                  {PURPOSE_OPTIONS.find(p => p.value === selectedPrimary)?.label}
                </Text>
              </View>
            </View>

            {selectedSecondary && (
              <View style={styles.confirmSection}>
                <Text style={styles.confirmLabel}>Secondary Interest</Text>
                <View style={styles.confirmValue}>
                  <Text style={styles.confirmIcon}>
                    {SECONDARY_OPTIONS.find(p => p.value === selectedSecondary)?.icon}
                  </Text>
                  <Text style={styles.confirmText}>
                    {SECONDARY_OPTIONS.find(p => p.value === selectedSecondary)?.label}
                  </Text>
                </View>
              </View>
            )}
          </View>

          {error && (
            <View style={styles.errorCard}>
              <Ionicons name="alert-circle" size={20} color="#ef4444" />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}

          <View style={styles.buttonRow}>
            <TouchableOpacity
              style={[styles.button, styles.secondaryButton]}
              onPress={prevStep}
            >
              <Text style={styles.secondaryButtonText}>Back</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.button, styles.primaryButton]}
              onPress={handleSubmit}
              disabled={isLoading}
            >
              {isLoading ? (
                <ActivityIndicator size="small" color="#ffffff" />
              ) : (
                <>
                  <Text style={styles.primaryButtonText}>Complete Setup</Text>
                  <Ionicons name="arrow-forward" size={20} color="#ffffff" />
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>
    </ScrollView>
  );

  return (
    <Animated.View style={[styles.container, { opacity: fadeAnim, transform: [{ translateX: slideAnim }] }]}>
      <StatusBar barStyle="light-content" backgroundColor="#1f2937" />
      {currentStep === 'welcome' && renderWelcome()}
      {currentStep === 'primary' && renderPrimarySelection()}
      {currentStep === 'secondary' && renderSecondarySelection()}
      {currentStep === 'confirm' && renderConfirm()}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1f2937',
  },
  safeArea: {
    flex: 1,
  },
  content: {
    flex: 1,
    padding: 24,
  },
  header: {
    marginBottom: 32,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#ffffff',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#9ca3af',
    textAlign: 'center',
    lineHeight: 24,
  },
  stepIndicator: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 32,
  },
  stepDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#374151',
    marginHorizontal: 4,
  },
  activeStep: {
    backgroundColor: '#10b981',
  },
  purposeGrid: {
    gap: 16,
  },
  purposeCard: {
    backgroundColor: '#374151',
    borderRadius: 16,
    padding: 20,
    borderWidth: 2,
    borderColor: '#374151',
    position: 'relative',
  },
  selectedPurposeCard: {
    borderColor: '#10b981',
  },
  purposeIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#1f2937',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  iconText: {
    fontSize: 24,
  },
  purposeTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 8,
  },
  purposeDescription: {
    fontSize: 14,
    color: '#9ca3af',
    lineHeight: 20,
    marginBottom: 16,
  },
  features: {
    gap: 8,
  },
  feature: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  featureText: {
    fontSize: 12,
    color: '#9ca3af',
    flex: 1,
  },
  selectedIndicator: {
    position: 'absolute',
    top: 12,
    right: 12,
  },
  nextButton: {
    backgroundColor: '#10b981',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    marginTop: 32,
  },
  nextButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 32,
  },
  button: {
    flex: 1,
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  primaryButton: {
    backgroundColor: '#10b981',
  },
  secondaryButton: {
    backgroundColor: '#374151',
    borderWidth: 1,
    borderColor: '#4b5563',
  },
  disabledButton: {
    opacity: 0.5,
  },
  primaryButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  secondaryButtonText: {
    color: '#9ca3af',
    fontSize: 16,
    fontWeight: 'bold',
  },
  // Secondary selection styles
  secondaryCard: {
    backgroundColor: '#374151',
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
  },
  secondaryTitle: {
    fontSize: 16,
    color: '#9ca3af',
    marginBottom: 8,
  },
  secondaryValue: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  secondaryQuestion: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 20,
  },
  secondaryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 24,
  },
  secondaryOptionCard: {
    backgroundColor: '#374151',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#374151',
    flex: 1,
    minWidth: '45%',
  },
  selectedSecondaryCard: {
    borderColor: '#10b981',
  },
  secondaryOptionIcon: {
    fontSize: 24,
    marginBottom: 8,
  },
  secondaryOptionLabel: {
    fontSize: 14,
    color: '#ffffff',
    textAlign: 'center',
  },
  skipButton: {
    alignSelf: 'center',
    padding: 12,
  },
  skipButtonText: {
    color: '#9ca3af',
    fontSize: 14,
    textDecorationLine: 'underline',
  },
  // Confirm styles
  confirmCard: {
    backgroundColor: '#374151',
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
  },
  confirmSection: {
    marginBottom: 20,
  },
  confirmLabel: {
    fontSize: 16,
    color: '#9ca3af',
    marginBottom: 8,
  },
  confirmValue: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  confirmIcon: {
    fontSize: 20,
  },
  confirmText: {
    fontSize: 16,
    color: '#ffffff',
    fontWeight: 'bold',
  },
  errorCard: {
    backgroundColor: '#ef4444',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 24,
  },
  errorText: {
    color: '#ffffff',
    fontSize: 14,
    flex: 1,
  },
});
