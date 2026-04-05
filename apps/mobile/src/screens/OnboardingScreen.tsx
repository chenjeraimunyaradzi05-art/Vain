/**
 * Onboarding Screen
 * 
 * Multi-step onboarding flow for new users
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  ActivityIndicator,
  Animated,
  Dimensions
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSession } from '../hooks/useSession';
import { theme } from '../theme';
import { onboardingApi } from '../services/api';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface Role {
  id: string;
  name: string;
  description: string;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
}

const ROLES: Role[] = [
  {
    id: 'jobseeker',
    name: 'Job Seeker',
    description: 'Looking for employment opportunities',
    icon: 'search',
    color: '#8b5cf6'
  },
  {
    id: 'employer',
    name: 'Employer',
    description: 'Hiring talent for your organisation',
    icon: 'business',
    color: '#3b82f6'
  },
  {
    id: 'mentor',
    name: 'Mentor',
    description: 'Guiding and supporting others',
    icon: 'star',
    color: '#f59e0b'
  },
  {
    id: 'tafe',
    name: 'Training Provider',
    description: 'TAFE or registered training organisation',
    icon: 'school',
    color: '#10b981'
  },
  {
    id: 'community',
    name: 'Community Partner',
    description: 'Aboriginal community organisation',
    icon: 'people',
    color: '#ec4899'
  }
];

interface Option {
  label: string;
  value: string;
}

interface Field {
  name: string;
  label: string;
  type: 'text' | 'location' | 'boolean' | 'multiselect';
  required?: boolean;
  placeholder?: string;
  options?: Option[];
}

interface StepContent {
  message?: string;
  features?: string[];
}

interface Step {
  id: string;
  title: string;
  subtitle?: string;
  type: 'info' | 'form' | 'celebration';
  content?: StepContent;
  fields?: Field[];
  isRequired?: boolean;
  isOptional?: boolean;
}

interface RoleCardProps {
  role: Role;
  selected: boolean;
  onSelect: (id: string) => void;
}

function RoleCard({ role, selected, onSelect }: RoleCardProps) {
  return (
    <TouchableOpacity
      style={[styles.roleCard, selected && styles.roleCardSelected]}
      onPress={() => onSelect(role.id)}
      activeOpacity={0.7}
    >
      {selected && (
        <View style={styles.checkBadge}>
          <Ionicons name="checkmark" size={16} color="white" />
        </View>
      )}
      <View style={[styles.roleIcon, { backgroundColor: role.color + '20' }]}>
        <Ionicons name={role.icon} size={28} color={role.color} />
      </View>
      <Text style={styles.roleName}>{role.name}</Text>
      <Text style={styles.roleDescription}>{role.description}</Text>
    </TouchableOpacity>
  );
}

interface StepIndicatorProps {
  currentStep: number;
  totalSteps: number;
}

function StepIndicator({ currentStep, totalSteps }: StepIndicatorProps) {
  return (
    <View style={styles.stepIndicator}>
      <View style={styles.stepTrack}>
        <View
          style={[
            styles.stepProgress,
            { width: `${((currentStep + 1) / totalSteps) * 100}%` }
          ]}
        />
      </View>
      <Text style={styles.stepText}>
        Step {currentStep + 1} of {totalSteps}
      </Text>
    </View>
  );
}

interface FormFieldProps {
  field: Field;
  value: any;
  onChange: (name: string, value: any) => void;
}

function FormField({ field, value, onChange }: FormFieldProps) {
  switch (field.type) {
    case 'text':
      return (
        <View style={styles.fieldContainer}>
          <Text style={styles.fieldLabel}>
            {field.label}
            {field.required && <Text style={styles.required}> *</Text>}
          </Text>
          <TextInput
            style={styles.textInput}
            value={value || ''}
            onChangeText={(text) => onChange(field.name, text)}
            placeholder={field.placeholder}
            placeholderTextColor={theme.colors.textSecondary}
          />
        </View>
      );

    case 'location':
      return (
        <View style={styles.fieldContainer}>
          <Text style={styles.fieldLabel}>
            {field.label}
            {field.required && <Text style={styles.required}> *</Text>}
          </Text>
          <View style={styles.locationInput}>
            <Ionicons name="location" size={20} color={theme.colors.textSecondary} />
            <TextInput
              style={styles.locationTextInput}
              value={value || ''}
              onChangeText={(text) => onChange(field.name, text)}
              placeholder="Enter your location"
              placeholderTextColor={theme.colors.textSecondary}
            />
          </View>
        </View>
      );

    case 'boolean':
      return (
        <TouchableOpacity
          style={styles.checkboxContainer}
          onPress={() => onChange(field.name, !value)}
        >
          <View style={[styles.checkbox, value && styles.checkboxChecked]}>
            {value && <Ionicons name="checkmark" size={16} color="white" />}
          </View>
          <Text style={styles.checkboxLabel}>{field.label}</Text>
        </TouchableOpacity>
      );

    case 'multiselect':
      return (
        <View style={styles.fieldContainer}>
          <Text style={styles.fieldLabel}>{field.label}</Text>
          <View style={styles.multiSelectContainer}>
            {field.options?.map((option) => {
              const isSelected = (value || []).includes(option.value);
              return (
                <TouchableOpacity
                  key={option.value}
                  style={[styles.multiSelectOption, isSelected && styles.multiSelectSelected]}
                  onPress={() => {
                    const current = value || [];
                    if (isSelected) {
                      onChange(field.name, current.filter((v: string) => v !== option.value));
                    } else {
                      onChange(field.name, [...current, option.value]);
                    }
                  }}
                >
                  <Text style={[
                    styles.multiSelectLabel,
                    isSelected && styles.multiSelectLabelSelected
                  ]}>
                    {option.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      );

    default:
      return null;
  }
}

interface OnboardingScreenProps {
  navigation: NativeStackNavigationProp<any>;
}

export default function OnboardingScreen({ navigation }: OnboardingScreenProps) {
  const { updateUser } = useSession();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [selectedRole, setSelectedRole] = useState<string | null>(null);
  const [steps, setSteps] = useState<Step[]>([]);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [formData, setFormData] = useState<Record<string, any>>({});
  const slideAnim = useRef(new Animated.Value(0)).current;

  // Fetch onboarding status
  useEffect(() => {
    fetchOnboardingStatus();
  }, []);

  const fetchOnboardingStatus = async () => {
    try {
      const response = await onboardingApi.getStatus();

      if (response.isComplete) {
        navigation.replace('Home');
        return;
      }

      if (response.hasOnboarding) {
        setSelectedRole(response.role);
        setSteps(response.steps || []);
        setCurrentStepIndex(response.currentStepIndex || 0);
        setFormData(response.data || {});
      }
    } catch (error) {
      console.error('Failed to fetch onboarding:', error);
    } finally {
      setLoading(false);
    }
  };

  const startOnboarding = async () => {
    if (!selectedRole) return;

    setSubmitting(true);
    try {
      const response = await onboardingApi.start(selectedRole);

      setSteps(response.steps || []);
      setCurrentStepIndex(0);
      animateSlide();
    } catch (error) {
      console.error('Failed to start onboarding:', error);
    } finally {
      setSubmitting(false);
    }
  };

  const animateSlide = () => {
    Animated.spring(slideAnim, {
      toValue: 1,
      useNativeDriver: true,
      friction: 8
    }).start();
  };

  const handleFieldChange = (name: string, value: any) => {
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleNext = async () => {
    const currentStep = steps[currentStepIndex];
    if (!currentStep) return;

    setSubmitting(true);
    try {
      const response = await onboardingApi.completeStep(currentStep.id, formData);

      if (response.isComplete) {
        await updateUser();
        navigation.replace('Home');
      } else {
        setCurrentStepIndex(prev => prev + 1);
      }
    } catch (error) {
      console.error('Failed to complete step:', error);
    } finally {
      setSubmitting(false);
    }
  };

  const handleSkip = async () => {
    const currentStep = steps[currentStepIndex];
    if (!currentStep || currentStep.isRequired) return;

    try {
      await onboardingApi.skipStep(currentStep.id);
      setCurrentStepIndex(prev => prev + 1);
    } catch (error) {
      console.error('Failed to skip step:', error);
    }
  };

  const handleSkipAll = async () => {
    try {
      await onboardingApi.skipAll();
      await updateUser();
      navigation.replace('Home');
    } catch (error) {
      console.error('Failed to skip onboarding:', error);
    }
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  const currentStep = steps[currentStepIndex];

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={handleSkipAll} style={styles.skipAllButton}>
          <Text style={styles.skipAllText}>Skip for now</Text>
          <Ionicons name="chevron-forward" size={16} color={theme.colors.textSecondary} />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Role Selection */}
        {!selectedRole && steps.length === 0 && (
          <View>
            <Text style={styles.title}>Welcome to Ngurra Pathways</Text>
            <Text style={styles.subtitle}>How would you like to use the platform?</Text>

            <View style={styles.rolesGrid}>
              {ROLES.map((role) => (
                <RoleCard
                  key={role.id}
                  role={role}
                  selected={selectedRole === role.id}
                  onSelect={setSelectedRole}
                />
              ))}
            </View>
          </View>
        )}

        {/* Role Confirmation */}
        {selectedRole && steps.length === 0 && (
          <View style={styles.confirmation}>
            <View style={styles.confirmIcon}>
              <Ionicons
                name={ROLES.find(r => r.id === selectedRole)?.icon || 'person'}
                size={48}
                color={theme.colors.primary}
              />
            </View>
            <Text style={styles.confirmTitle}>Great choice!</Text>
            <Text style={styles.confirmSubtitle}>
              Let's set up your {ROLES.find(r => r.id === selectedRole)?.name} profile.
            </Text>
            <TouchableOpacity
              style={[styles.primaryButton, submitting && styles.buttonDisabled]}
              onPress={startOnboarding}
              disabled={submitting}
            >
              {submitting ? (
                <ActivityIndicator color="white" />
              ) : (
                <>
                  <Text style={styles.primaryButtonText}>Get Started</Text>
                  <Ionicons name="arrow-forward" size={20} color="white" />
                </>
              )}
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => setSelectedRole(null)}
            >
              <Ionicons name="arrow-back" size={20} color={theme.colors.textSecondary} />
              <Text style={styles.backButtonText}>Choose a different role</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Step Content */}
        {currentStep && (
          <Animated.View
            style={[
              styles.stepContent,
              {
                opacity: slideAnim,
                transform: [
                  {
                    translateX: slideAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [50, 0]
                    })
                  }
                ]
              }
            ]}
          >
            <StepIndicator currentStep={currentStepIndex} totalSteps={steps.length} />

            <Text style={styles.stepTitle}>{currentStep.title}</Text>
            {currentStep.subtitle && (
              <Text style={styles.stepSubtitle}>{currentStep.subtitle}</Text>
            )}

            {currentStep.type === 'info' && (
              <View style={styles.infoStep}>
                <View style={styles.infoIcon}>
                  <Ionicons name="sparkles" size={48} color={theme.colors.primary} />
                </View>
                <Text style={styles.infoMessage}>{currentStep.content?.message}</Text>
                {currentStep.content?.features && (
                  <View style={styles.featuresList}>
                    {currentStep.content.features.map((feature, idx) => (
                      <View key={idx} style={styles.featureItem}>
                        <Ionicons name="checkmark-circle" size={20} color={theme.colors.success} />
                        <Text style={styles.featureText}>{feature}</Text>
                      </View>
                    ))}
                  </View>
                )}
              </View>
            )}

            {currentStep.type === 'form' && (
              <View style={styles.formStep}>
                {currentStep.fields?.map((field) => (
                  <FormField
                    key={field.name}
                    field={field}
                    value={formData[field.name]}
                    onChange={handleFieldChange}
                  />
                ))}
              </View>
            )}

            {currentStep.type === 'celebration' && (
              <View style={styles.celebrationStep}>
                <View style={styles.celebrationIcon}>
                  <Ionicons name="trophy" size={64} color="#f59e0b" />
                </View>
                <Text style={styles.celebrationTitle}>You're all set!</Text>
                <Text style={styles.celebrationMessage}>
                  {currentStep.content?.message}
                </Text>
              </View>
            )}
          </Animated.View>
        )}
      </ScrollView>

      {/* Navigation */}
      {currentStep && currentStep.type !== 'celebration' && (
        <View style={styles.navigation}>
          <TouchableOpacity
            style={styles.navButton}
            onPress={() => setCurrentStepIndex(prev => Math.max(0, prev - 1))}
            disabled={currentStepIndex === 0}
          >
            <Ionicons
              name="arrow-back"
              size={24}
              color={currentStepIndex === 0 ? theme.colors.textSecondary : theme.colors.text}
            />
          </TouchableOpacity>

          <View style={styles.navActions}>
            {currentStep.isOptional && !currentStep.isRequired && (
              <TouchableOpacity style={styles.skipButton} onPress={handleSkip}>
                <Text style={styles.skipButtonText}>Skip</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              style={[styles.continueButton, submitting && styles.buttonDisabled]}
              onPress={handleNext}
              disabled={submitting}
            >
              {submitting ? (
                <ActivityIndicator color="white" size="small" />
              ) : (
                <>
                  <Text style={styles.continueButtonText}>Continue</Text>
                  <Ionicons name="arrow-forward" size={20} color="white" />
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Celebration Navigation */}
      {currentStep?.type === 'celebration' && (
        <View style={styles.celebrationNav}>
          <TouchableOpacity
            style={styles.finishButton}
            onPress={() => navigation.replace('Home')}
          >
            <Text style={styles.finishButtonText}>Go to Dashboard</Text>
            <Ionicons name="arrow-forward" size={24} color="white" />
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center'
  },
  header: {
    paddingTop: 60,
    paddingHorizontal: 20,
    alignItems: 'flex-end'
  },
  skipAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4
  },
  skipAllText: {
    fontSize: 14,
    color: theme.colors.textSecondary
  },
  content: {
    flex: 1
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 120
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: theme.colors.text,
    textAlign: 'center',
    marginBottom: 8
  },
  subtitle: {
    fontSize: 16,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    marginBottom: 32
  },
  rolesGrid: {
    gap: 12
  },
  roleCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: 16,
    padding: 20,
    borderWidth: 2,
    borderColor: 'transparent'
  },
  roleCardSelected: {
    borderColor: theme.colors.primary,
    backgroundColor: theme.colors.primaryLight
  },
  checkBadge: {
    position: 'absolute',
    top: 12,
    right: 12,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: theme.colors.primary,
    justifyContent: 'center',
    alignItems: 'center'
  },
  roleIcon: {
    width: 56,
    height: 56,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12
  },
  roleName: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.colors.text,
    marginBottom: 4
  },
  roleDescription: {
    fontSize: 14,
    color: theme.colors.textSecondary
  },
  confirmation: {
    alignItems: 'center',
    paddingVertical: 40
  },
  confirmIcon: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: theme.colors.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24
  },
  confirmTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: theme.colors.text,
    marginBottom: 8
  },
  confirmSubtitle: {
    fontSize: 16,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    marginBottom: 32
  },
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.primary,
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 12,
    gap: 8
  },
  buttonDisabled: {
    opacity: 0.6
  },
  primaryButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: '600'
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 24,
    gap: 8
  },
  backButtonText: {
    color: theme.colors.textSecondary,
    fontSize: 16
  },
  stepContent: {
    flex: 1
  },
  stepIndicator: {
    marginBottom: 24
  },
  stepTrack: {
    height: 4,
    backgroundColor: theme.colors.surface,
    borderRadius: 2,
    overflow: 'hidden',
    marginBottom: 8
  },
  stepProgress: {
    height: '100%',
    backgroundColor: theme.colors.primary,
    borderRadius: 2
  },
  stepText: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    textAlign: 'center'
  },
  stepTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: theme.colors.text,
    marginBottom: 8
  },
  stepSubtitle: {
    fontSize: 16,
    color: theme.colors.textSecondary,
    marginBottom: 24
  },
  infoStep: {
    alignItems: 'center',
    paddingVertical: 32
  },
  infoIcon: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: theme.colors.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24
  },
  infoMessage: {
    fontSize: 16,
    color: theme.colors.text,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 24
  },
  featuresList: {
    width: '100%'
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    padding: 16,
    borderRadius: 12,
    marginBottom: 8,
    gap: 12
  },
  featureText: {
    flex: 1,
    fontSize: 15,
    color: theme.colors.text
  },
  formStep: {
    gap: 16
  },
  fieldContainer: {
    marginBottom: 16
  },
  fieldLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.text,
    marginBottom: 8
  },
  required: {
    color: theme.colors.error
  },
  textInput: {
    backgroundColor: theme.colors.surface,
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: theme.colors.text
  },
  locationInput: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    borderRadius: 12,
    paddingHorizontal: 16,
    gap: 12
  },
  locationTextInput: {
    flex: 1,
    paddingVertical: 16,
    fontSize: 16,
    color: theme.colors.text
  },
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: theme.colors.textSecondary,
    justifyContent: 'center',
    alignItems: 'center'
  },
  checkboxChecked: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary
  },
  checkboxLabel: {
    flex: 1,
    fontSize: 16,
    color: theme.colors.text
  },
  multiSelectContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8
  },
  multiSelectOption: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: theme.colors.surface
  },
  multiSelectSelected: {
    backgroundColor: theme.colors.primary
  },
  multiSelectLabel: {
    fontSize: 14,
    color: theme.colors.text
  },
  multiSelectLabelSelected: {
    color: 'white'
  },
  celebrationStep: {
    alignItems: 'center',
    paddingVertical: 40
  },
  celebrationIcon: {
    marginBottom: 24
  },
  celebrationTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: theme.colors.text,
    marginBottom: 12
  },
  celebrationMessage: {
    fontSize: 16,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    lineHeight: 24
  },
  navigation: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    paddingBottom: 40,
    backgroundColor: theme.colors.background,
    borderTopWidth: 1,
    borderTopColor: theme.colors.surface
  },
  navButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: theme.colors.surface,
    justifyContent: 'center',
    alignItems: 'center'
  },
  navActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12
  },
  skipButton: {
    paddingHorizontal: 16,
    paddingVertical: 12
  },
  skipButtonText: {
    fontSize: 16,
    color: theme.colors.textSecondary
  },
  continueButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.primary,
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 12,
    gap: 8
  },
  continueButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600'
  },
  celebrationNav: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 20,
    paddingBottom: 40,
    backgroundColor: theme.colors.background
  },
  finishButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.success,
    paddingVertical: 18,
    borderRadius: 16,
    gap: 12
  },
  finishButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: '600'
  }
});