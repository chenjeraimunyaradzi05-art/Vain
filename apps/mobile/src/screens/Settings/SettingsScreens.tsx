/**
 * Settings Screens
 * 
 * Comprehensive settings for:
 * - Profile settings
 * - Privacy controls
 * - Notification preferences
 * - Account management
 * - Accessibility options
 * - Cultural preferences
 */

import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  Alert,
  TextInput,
  Image,
  ActivityIndicator,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import * as ImagePicker from 'expo-image-picker';
import { useSession } from '../../hooks/useSession';
import { api } from '../../services/api';

// ==================== Main Settings Screen ====================

export function SettingsScreen() {
  const navigation = useNavigation<any>();
  const { user } = useSession();

  const settingsSections = [
    {
      title: 'Account',
      items: [
        { label: 'Profile', icon: '👤', screen: 'ProfileSettings' },
        { label: 'Privacy', icon: '🔒', screen: 'PrivacySettings' },
        { label: 'Security', icon: '🛡️', screen: 'SecuritySettings' },
      ],
    },
    {
      title: 'Preferences',
      items: [
        { label: 'Notifications', icon: '🔔', screen: 'NotificationSettings' },
        { label: 'Accessibility', icon: '♿', screen: 'AccessibilitySettings' },
        { label: 'Cultural Preferences', icon: '🌿', screen: 'CulturalSettings' },
      ],
    },
    {
      title: 'App',
      items: [
        { label: 'Language', icon: '🌐', screen: 'LanguageSettings' },
        { label: 'About', icon: 'ℹ️', screen: 'About' },
        { label: 'Help & Support', icon: '❓', screen: 'HelpSupport' },
      ],
    },
  ];


  return (
    <ScrollView style={styles.container}>
      {/* User Profile Header */}
      <TouchableOpacity
        style={styles.profileHeader}
        onPress={() => navigation.navigate('ProfileSettings')}
      >
        <Image
          source={
            user?.avatarUrl
              ? { uri: user.avatarUrl }
              : require('../../assets/default-avatar.png')
          }
          style={styles.avatar}
        />
        <View style={styles.profileInfo}>
          <Text style={styles.userName}>
            {user?.firstName} {user?.lastName}
          </Text>
          <Text style={styles.userEmail}>{user?.email}</Text>
        </View>
        <Text style={styles.chevron}>›</Text>
      </TouchableOpacity>

      {/* Settings Sections */}
      {settingsSections.map((section) => (
        <View key={section.title} style={styles.section}>
          <Text style={styles.sectionTitle}>{section.title}</Text>
          {section.items.map((item) => (
            <TouchableOpacity
              key={item.label}
              style={styles.settingItem}
              onPress={() => navigation.navigate(item.screen)}
            >
              <Text style={styles.settingIcon}>{item.icon}</Text>
              <Text style={styles.settingLabel}>{item.label}</Text>
              <Text style={styles.chevron}>›</Text>
            </TouchableOpacity>
          ))}
        </View>
      ))}

      {/* Logout Button */}
      {/* App Version */}
      <Text style={styles.version}>Ngurra Pathways v1.0.0</Text>
    </ScrollView>
  );
}

// ==================== Profile Settings ====================

export function ProfileSettingsScreen() {
  const { user, updateUser } = useSession();
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    firstName: user?.firstName || '',
    lastName: user?.lastName || '',
    bio: user?.bio || '',
    location: user?.location || '',
    currentRole: user?.currentRole || '',
    company: user?.company || '',
    website: user?.website || '',
    phone: user?.phone || '',
  });

  const handleImagePick = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      setIsLoading(true);
      try {
        const formData = new FormData();
        formData.append('avatar', {
          uri: result.assets[0].uri,
          type: 'image/jpeg',
          name: 'avatar.jpg',
        } as any);

        const response = await api.post('/users/me/avatar', formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });

        updateUser({ avatarUrl: response.data.avatarUrl });
        Alert.alert('Success', 'Profile photo updated');
      } catch (error) {
        Alert.alert('Error', 'Failed to update profile photo');
      } finally {
        setIsLoading(false);
      }
    }
  };

  const handleSave = async () => {
    setIsLoading(true);
    try {
      await api.patch('/users/me', formData);
      updateUser(formData);
      Alert.alert('Success', 'Profile updated successfully');
    } catch (error) {
      Alert.alert('Error', 'Failed to update profile');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container}>
      {/* Avatar Section */}
      <View style={styles.avatarSection}>
        <TouchableOpacity onPress={handleImagePick} disabled={isLoading}>
          <Image
            source={
              user?.avatarUrl
                ? { uri: user.avatarUrl }
                : require('../../assets/default-avatar.png')
            }
            style={styles.largeAvatar}
          />
          <View style={styles.cameraButton}>
            <Text>📷</Text>
          </View>
        </TouchableOpacity>
      </View>

      {/* Form Fields */}
      <View style={styles.formSection}>
        <View style={styles.inputRow}>
          <View style={[styles.inputContainer, { flex: 1, marginRight: 8 }]}>
            <Text style={styles.inputLabel}>First Name</Text>
            <TextInput
              style={styles.input}
              value={formData.firstName}
              onChangeText={(text) =>
                setFormData({ ...formData, firstName: text })
              }
              placeholder="First name"
            />
          </View>
          <View style={[styles.inputContainer, { flex: 1, marginLeft: 8 }]}>
            <Text style={styles.inputLabel}>Last Name</Text>
            <TextInput
              style={styles.input}
              value={formData.lastName}
              onChangeText={(text) =>
                setFormData({ ...formData, lastName: text })
              }
              placeholder="Last name"
            />
          </View>
        </View>

        <View style={styles.inputContainer}>
          <Text style={styles.inputLabel}>Bio</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            value={formData.bio}
            onChangeText={(text) => setFormData({ ...formData, bio: text })}
            placeholder="Tell us about yourself"
            multiline
            numberOfLines={4}
          />
        </View>

        <View style={styles.inputContainer}>
          <Text style={styles.inputLabel}>Location</Text>
          <TextInput
            style={styles.input}
            value={formData.location}
            onChangeText={(text) =>
              setFormData({ ...formData, location: text })
            }
            placeholder="City, State"
          />
        </View>

        <View style={styles.inputContainer}>
          <Text style={styles.inputLabel}>Current Role</Text>
          <TextInput
            style={styles.input}
            value={formData.currentRole}
            onChangeText={(text) =>
              setFormData({ ...formData, currentRole: text })
            }
            placeholder="Job title"
          />
        </View>

        <View style={styles.inputContainer}>
          <Text style={styles.inputLabel}>Company</Text>
          <TextInput
            style={styles.input}
            value={formData.company}
            onChangeText={(text) =>
              setFormData({ ...formData, company: text })
            }
            placeholder="Company name"
          />
        </View>

        <View style={styles.inputContainer}>
          <Text style={styles.inputLabel}>Website</Text>
          <TextInput
            style={styles.input}
            value={formData.website}
            onChangeText={(text) =>
              setFormData({ ...formData, website: text })
            }
            placeholder="https://"
            keyboardType="url"
            autoCapitalize="none"
          />
        </View>

        <View style={styles.inputContainer}>
          <Text style={styles.inputLabel}>Phone</Text>
          <TextInput
            style={styles.input}
            value={formData.phone}
            onChangeText={(text) => setFormData({ ...formData, phone: text })}
            placeholder="Phone number"
            keyboardType="phone-pad"
          />
        </View>
      </View>

      {/* Save Button */}
      <TouchableOpacity
        style={[styles.saveButton, isLoading && styles.disabledButton]}
        onPress={handleSave}
        disabled={isLoading}
      >
        {isLoading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.saveButtonText}>Save Changes</Text>
        )}
      </TouchableOpacity>
    </ScrollView>
  );
}

// ==================== Privacy Settings ====================

export function PrivacySettingsScreen() {
  const [settings, setSettings] = useState({
    profileVisibility: 'public',
    showEmail: false,
    showPhone: false,
    showLocation: true,
    allowMessagesFromNonConnections: true,
    allowMentorshipRequests: true,
    showActivityStatus: true,
    showLastSeen: true,
    allowSearchEngineIndexing: false,
    dataSharing: {
      analytics: true,
      improvement: true,
      marketing: false,
    },
  });

  const handleSave = async () => {
    try {
      await api.patch('/users/me/privacy', settings);
      Alert.alert('Success', 'Privacy settings updated');
    } catch (error) {
      Alert.alert('Error', 'Failed to update privacy settings');
    }
  };

  return (
    <ScrollView style={styles.container}>
      {/* Profile Visibility */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Profile Visibility</Text>
        <View style={styles.radioGroup}>
          {['public', 'connections', 'private'].map((option) => (
            <TouchableOpacity
              key={option}
              style={styles.radioOption}
              onPress={() =>
                setSettings({ ...settings, profileVisibility: option })
              }
            >
              <View
                style={[
                  styles.radioCircle,
                  settings.profileVisibility === option &&
                    styles.radioSelected,
                ]}
              />
              <Text style={styles.radioLabel}>
                {option.charAt(0).toUpperCase() + option.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Contact Info */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Contact Information</Text>
        <View style={styles.switchItem}>
          <Text style={styles.switchLabel}>Show email address</Text>
          <Switch
            value={settings.showEmail}
            onValueChange={(value) =>
              setSettings({ ...settings, showEmail: value })
            }
          />
        </View>
        <View style={styles.switchItem}>
          <Text style={styles.switchLabel}>Show phone number</Text>
          <Switch
            value={settings.showPhone}
            onValueChange={(value) =>
              setSettings({ ...settings, showPhone: value })
            }
          />
        </View>
        <View style={styles.switchItem}>
          <Text style={styles.switchLabel}>Show location</Text>
          <Switch
            value={settings.showLocation}
            onValueChange={(value) =>
              setSettings({ ...settings, showLocation: value })
            }
          />
        </View>
      </View>

      {/* Activity */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Activity Status</Text>
        <View style={styles.switchItem}>
          <Text style={styles.switchLabel}>Show when I'm online</Text>
          <Switch
            value={settings.showActivityStatus}
            onValueChange={(value) =>
              setSettings({ ...settings, showActivityStatus: value })
            }
          />
        </View>
        <View style={styles.switchItem}>
          <Text style={styles.switchLabel}>Show last seen</Text>
          <Switch
            value={settings.showLastSeen}
            onValueChange={(value) =>
              setSettings({ ...settings, showLastSeen: value })
            }
          />
        </View>
      </View>

      {/* Messaging */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Messaging</Text>
        <View style={styles.switchItem}>
          <Text style={styles.switchLabel}>
            Allow messages from non-connections
          </Text>
          <Switch
            value={settings.allowMessagesFromNonConnections}
            onValueChange={(value) =>
              setSettings({
                ...settings,
                allowMessagesFromNonConnections: value,
              })
            }
          />
        </View>
        <View style={styles.switchItem}>
          <Text style={styles.switchLabel}>Allow mentorship requests</Text>
          <Switch
            value={settings.allowMentorshipRequests}
            onValueChange={(value) =>
              setSettings({ ...settings, allowMentorshipRequests: value })
            }
          />
        </View>
      </View>

      {/* Data Sharing */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Data Sharing</Text>
        <View style={styles.switchItem}>
          <View>
            <Text style={styles.switchLabel}>Analytics</Text>
            <Text style={styles.switchDescription}>
              Help us understand app usage
            </Text>
          </View>
          <Switch
            value={settings.dataSharing.analytics}
            onValueChange={(value) =>
              setSettings({
                ...settings,
                dataSharing: { ...settings.dataSharing, analytics: value },
              })
            }
          />
        </View>
        <View style={styles.switchItem}>
          <View>
            <Text style={styles.switchLabel}>Product improvement</Text>
            <Text style={styles.switchDescription}>
              Share usage data to improve features
            </Text>
          </View>
          <Switch
            value={settings.dataSharing.improvement}
            onValueChange={(value) =>
              setSettings({
                ...settings,
                dataSharing: { ...settings.dataSharing, improvement: value },
              })
            }
          />
        </View>
        <View style={styles.switchItem}>
          <View>
            <Text style={styles.switchLabel}>Marketing communications</Text>
            <Text style={styles.switchDescription}>
              Receive personalized offers
            </Text>
          </View>
          <Switch
            value={settings.dataSharing.marketing}
            onValueChange={(value) =>
              setSettings({
                ...settings,
                dataSharing: { ...settings.dataSharing, marketing: value },
              })
            }
          />
        </View>
      </View>

      {/* Save Button */}
      <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
        <Text style={styles.saveButtonText}>Save Settings</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

// ==================== Notification Settings ====================

export function NotificationSettingsScreen() {
  const [settings, setSettings] = useState({
    pushEnabled: true,
    emailEnabled: true,
    categories: {
      messages: { push: true, email: true },
      connections: { push: true, email: false },
      jobs: { push: true, email: true },
      mentorship: { push: true, email: true },
      community: { push: true, email: false },
      marketing: { push: false, email: false },
    },
    quietHours: {
      enabled: false,
      start: '22:00',
      end: '07:00',
    },
  });

  const handleSave = async () => {
    try {
      await api.patch('/users/me/notifications', settings);
      Alert.alert('Success', 'Notification settings updated');
    } catch (error) {
      Alert.alert('Error', 'Failed to update notification settings');
    }
  };

  const notificationCategories = [
    { key: 'messages', label: 'Messages', description: 'New messages and chats' },
    { key: 'connections', label: 'Connections', description: 'Connection requests and acceptances' },
    { key: 'jobs', label: 'Jobs', description: 'Job recommendations and applications' },
    { key: 'mentorship', label: 'Mentorship', description: 'Mentorship requests and sessions' },
    { key: 'community', label: 'Community', description: 'Posts, comments, and group activity' },
    { key: 'marketing', label: 'Marketing', description: 'Promotions and newsletters' },
  ];

  return (
    <ScrollView style={styles.container}>
      {/* Master Controls */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Notification Channels</Text>
        <View style={styles.switchItem}>
          <View>
            <Text style={styles.switchLabel}>Push Notifications</Text>
            <Text style={styles.switchDescription}>
              Receive notifications on your device
            </Text>
          </View>
          <Switch
            value={settings.pushEnabled}
            onValueChange={(value) =>
              setSettings({ ...settings, pushEnabled: value })
            }
          />
        </View>
        <View style={styles.switchItem}>
          <View>
            <Text style={styles.switchLabel}>Email Notifications</Text>
            <Text style={styles.switchDescription}>
              Receive notifications via email
            </Text>
          </View>
          <Switch
            value={settings.emailEnabled}
            onValueChange={(value) =>
              setSettings({ ...settings, emailEnabled: value })
            }
          />
        </View>
      </View>

      {/* Categories */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Notification Categories</Text>
        {notificationCategories.map((category) => (
          <View key={category.key} style={styles.categoryItem}>
            <View style={styles.categoryInfo}>
              <Text style={styles.categoryLabel}>{category.label}</Text>
              <Text style={styles.categoryDescription}>
                {category.description}
              </Text>
            </View>
            <View style={styles.categoryControls}>
              <View style={styles.smallSwitch}>
                <Text style={styles.miniLabel}>Push</Text>
                <Switch
                  value={settings.categories[category.key as keyof typeof settings.categories].push}
                  onValueChange={(value) =>
                    setSettings({
                      ...settings,
                      categories: {
                        ...settings.categories,
                        [category.key]: {
                          ...settings.categories[category.key as keyof typeof settings.categories],
                          push: value,
                        },
                      },
                    })
                  }
                  disabled={!settings.pushEnabled}
                />
              </View>
              <View style={styles.smallSwitch}>
                <Text style={styles.miniLabel}>Email</Text>
                <Switch
                  value={settings.categories[category.key as keyof typeof settings.categories].email}
                  onValueChange={(value) =>
                    setSettings({
                      ...settings,
                      categories: {
                        ...settings.categories,
                        [category.key]: {
                          ...settings.categories[category.key as keyof typeof settings.categories],
                          email: value,
                        },
                      },
                    })
                  }
                  disabled={!settings.emailEnabled}
                />
              </View>
            </View>
          </View>
        ))}
      </View>

      {/* Quiet Hours */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Quiet Hours</Text>
        <View style={styles.switchItem}>
          <View>
            <Text style={styles.switchLabel}>Enable Quiet Hours</Text>
            <Text style={styles.switchDescription}>
              Pause notifications during set hours
            </Text>
          </View>
          <Switch
            value={settings.quietHours.enabled}
            onValueChange={(value) =>
              setSettings({
                ...settings,
                quietHours: { ...settings.quietHours, enabled: value },
              })
            }
          />
        </View>
        {settings.quietHours.enabled && (
          <View style={styles.timeRange}>
            <Text style={styles.timeLabel}>
              From {settings.quietHours.start} to {settings.quietHours.end}
            </Text>
          </View>
        )}
      </View>

      {/* Save Button */}
      <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
        <Text style={styles.saveButtonText}>Save Settings</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

// ==================== Accessibility Settings ====================

export function AccessibilitySettingsScreen() {
  const [settings, setSettings] = useState({
    fontSize: 'medium',
    highContrast: false,
    reduceMotion: false,
    screenReader: false,
    voiceControl: false,
    hapticFeedback: true,
    autoPlayVideos: true,
    closedCaptions: true,
  });

  const handleSave = async () => {
    try {
      await api.patch('/users/me/accessibility', settings);
      Alert.alert('Success', 'Accessibility settings updated');
    } catch (error) {
      Alert.alert('Error', 'Failed to update accessibility settings');
    }
  };

  return (
    <ScrollView style={styles.container}>
      {/* Text Size */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Text Size</Text>
        <View style={styles.fontSizeOptions}>
          {['small', 'medium', 'large', 'extra-large'].map((size) => (
            <TouchableOpacity
              key={size}
              style={[
                styles.fontSizeOption,
                settings.fontSize === size && styles.fontSizeSelected,
              ]}
              onPress={() => setSettings({ ...settings, fontSize: size })}
            >
              <Text
                style={[
                  styles.fontSizeLabel,
                  { fontSize: size === 'small' ? 14 : size === 'medium' ? 16 : size === 'large' ? 18 : 20 },
                ]}
              >
                Aa
              </Text>
              <Text style={styles.fontSizeName}>
                {size.charAt(0).toUpperCase() + size.slice(1).replace('-', ' ')}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Visual */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Visual</Text>
        <View style={styles.switchItem}>
          <View>
            <Text style={styles.switchLabel}>High Contrast</Text>
            <Text style={styles.switchDescription}>
              Increase contrast for better visibility
            </Text>
          </View>
          <Switch
            value={settings.highContrast}
            onValueChange={(value) =>
              setSettings({ ...settings, highContrast: value })
            }
          />
        </View>
        <View style={styles.switchItem}>
          <View>
            <Text style={styles.switchLabel}>Reduce Motion</Text>
            <Text style={styles.switchDescription}>
              Minimize animations and transitions
            </Text>
          </View>
          <Switch
            value={settings.reduceMotion}
            onValueChange={(value) =>
              setSettings({ ...settings, reduceMotion: value })
            }
          />
        </View>
      </View>

      {/* Audio & Interaction */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Audio & Interaction</Text>
        <View style={styles.switchItem}>
          <View>
            <Text style={styles.switchLabel}>Haptic Feedback</Text>
            <Text style={styles.switchDescription}>
              Vibration feedback for interactions
            </Text>
          </View>
          <Switch
            value={settings.hapticFeedback}
            onValueChange={(value) =>
              setSettings({ ...settings, hapticFeedback: value })
            }
          />
        </View>
        <View style={styles.switchItem}>
          <View>
            <Text style={styles.switchLabel}>Auto-play Videos</Text>
            <Text style={styles.switchDescription}>
              Automatically play videos in feed
            </Text>
          </View>
          <Switch
            value={settings.autoPlayVideos}
            onValueChange={(value) =>
              setSettings({ ...settings, autoPlayVideos: value })
            }
          />
        </View>
        <View style={styles.switchItem}>
          <View>
            <Text style={styles.switchLabel}>Closed Captions</Text>
            <Text style={styles.switchDescription}>
              Show captions for videos when available
            </Text>
          </View>
          <Switch
            value={settings.closedCaptions}
            onValueChange={(value) =>
              setSettings({ ...settings, closedCaptions: value })
            }
          />
        </View>
      </View>

      {/* Assistive Technology */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Assistive Technology</Text>
        <View style={styles.switchItem}>
          <View>
            <Text style={styles.switchLabel}>Screen Reader Support</Text>
            <Text style={styles.switchDescription}>
              Optimize for screen readers like VoiceOver
            </Text>
          </View>
          <Switch
            value={settings.screenReader}
            onValueChange={(value) =>
              setSettings({ ...settings, screenReader: value })
            }
          />
        </View>
        <View style={styles.switchItem}>
          <View>
            <Text style={styles.switchLabel}>Voice Control</Text>
            <Text style={styles.switchDescription}>
              Navigate using voice commands
            </Text>
          </View>
          <Switch
            value={settings.voiceControl}
            onValueChange={(value) =>
              setSettings({ ...settings, voiceControl: value })
            }
          />
        </View>
      </View>

      {/* Save Button */}
      <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
        <Text style={styles.saveButtonText}>Save Settings</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

// ==================== Cultural Settings ====================

export function CulturalSettingsScreen() {
  const [settings, setSettings] = useState({
    identifyAsIndigenous: false,
    communityAffiliation: '',
    showCulturalContent: true,
    seekElderMentorship: false,
    participateInCulturalEvents: true,
    culturalLearningInterests: [] as string[],
    languagePreservation: false,
    traditionalBusinessInterest: false,
  });

  const culturalInterests = [
    'Traditional Knowledge',
    'Language Learning',
    'Cultural Arts',
    'Bush Tucker / Traditional Food',
    'Storytelling & Dreaming',
    'Community Leadership',
    'Indigenous Business',
    'Land & Country Connection',
  ];

  const toggleInterest = (interest: string) => {
    setSettings((prev) => ({
      ...prev,
      culturalLearningInterests: prev.culturalLearningInterests.includes(interest)
        ? prev.culturalLearningInterests.filter((i) => i !== interest)
        : [...prev.culturalLearningInterests, interest],
    }));
  };

  const handleSave = async () => {
    try {
      await api.patch('/users/me/cultural', settings);
      Alert.alert('Success', 'Cultural preferences updated');
    } catch (error) {
      Alert.alert('Error', 'Failed to update cultural preferences');
    }
  };

  return (
    <ScrollView style={styles.container}>
      {/* Identity */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Identity</Text>
        <View style={styles.switchItem}>
          <View>
            <Text style={styles.switchLabel}>
              I identify as Aboriginal and/or Torres Strait Islander
            </Text>
            <Text style={styles.switchDescription}>
              This information helps us provide relevant opportunities
            </Text>
          </View>
          <Switch
            value={settings.identifyAsIndigenous}
            onValueChange={(value) =>
              setSettings({ ...settings, identifyAsIndigenous: value })
            }
          />
        </View>

        {settings.identifyAsIndigenous && (
          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>
              Community/Mob Affiliation (optional)
            </Text>
            <TextInput
              style={styles.input}
              value={settings.communityAffiliation}
              onChangeText={(text) =>
                setSettings({ ...settings, communityAffiliation: text })
              }
              placeholder="Enter your community"
            />
          </View>
        )}
      </View>

      {/* Content Preferences */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Content Preferences</Text>
        <View style={styles.switchItem}>
          <View>
            <Text style={styles.switchLabel}>Show Cultural Content</Text>
            <Text style={styles.switchDescription}>
              See posts about culture and community
            </Text>
          </View>
          <Switch
            value={settings.showCulturalContent}
            onValueChange={(value) =>
              setSettings({ ...settings, showCulturalContent: value })
            }
          />
        </View>
        <View style={styles.switchItem}>
          <View>
            <Text style={styles.switchLabel}>Cultural Events</Text>
            <Text style={styles.switchDescription}>
              Get notified about cultural events
            </Text>
          </View>
          <Switch
            value={settings.participateInCulturalEvents}
            onValueChange={(value) =>
              setSettings({ ...settings, participateInCulturalEvents: value })
            }
          />
        </View>
      </View>

      {/* Mentorship */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Elder Mentorship</Text>
        <View style={styles.switchItem}>
          <View>
            <Text style={styles.switchLabel}>Seek Elder Mentorship</Text>
            <Text style={styles.switchDescription}>
              Get matched with Indigenous Elder mentors
            </Text>
          </View>
          <Switch
            value={settings.seekElderMentorship}
            onValueChange={(value) =>
              setSettings({ ...settings, seekElderMentorship: value })
            }
          />
        </View>
      </View>

      {/* Learning Interests */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Cultural Learning Interests</Text>
        <Text style={styles.sectionDescription}>
          Select topics you're interested in learning about
        </Text>
        <View style={styles.interestGrid}>
          {culturalInterests.map((interest) => (
            <TouchableOpacity
              key={interest}
              style={[
                styles.interestChip,
                settings.culturalLearningInterests.includes(interest) &&
                  styles.interestChipSelected,
              ]}
              onPress={() => toggleInterest(interest)}
            >
              <Text
                style={[
                  styles.interestChipText,
                  settings.culturalLearningInterests.includes(interest) &&
                    styles.interestChipTextSelected,
                ]}
              >
                {interest}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Business Interests */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Business Interests</Text>
        <View style={styles.switchItem}>
          <View>
            <Text style={styles.switchLabel}>
              Traditional/Indigenous Business
            </Text>
            <Text style={styles.switchDescription}>
              Interest in working with or starting Indigenous businesses
            </Text>
          </View>
          <Switch
            value={settings.traditionalBusinessInterest}
            onValueChange={(value) =>
              setSettings({ ...settings, traditionalBusinessInterest: value })
            }
          />
        </View>
        <View style={styles.switchItem}>
          <View>
            <Text style={styles.switchLabel}>Language Preservation</Text>
            <Text style={styles.switchDescription}>
              Interest in Indigenous language learning/preservation
            </Text>
          </View>
          <Switch
            value={settings.languagePreservation}
            onValueChange={(value) =>
              setSettings({ ...settings, languagePreservation: value })
            }
          />
        </View>
      </View>

      {/* Save Button */}
      <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
        <Text style={styles.saveButtonText}>Save Settings</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

// ==================== Styles ====================

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  profileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 16,
    marginBottom: 16,
  },
  avatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
  },
  profileInfo: {
    flex: 1,
    marginLeft: 16,
  },
  userName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  userEmail: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  chevron: {
    fontSize: 24,
    color: '#999',
  },
  section: {
    backgroundColor: '#fff',
    marginBottom: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    marginBottom: 12,
    textTransform: 'uppercase',
  },
  sectionDescription: {
    fontSize: 13,
    color: '#888',
    marginBottom: 12,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#eee',
  },
  settingIcon: {
    fontSize: 20,
    marginRight: 12,
  },
  settingLabel: {
    flex: 1,
    fontSize: 16,
    color: '#1a1a1a',
  },
  switchItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#eee',
  },
  switchLabel: {
    fontSize: 16,
    color: '#1a1a1a',
  },
  switchDescription: {
    fontSize: 13,
    color: '#888',
    marginTop: 2,
    maxWidth: '85%',
  },
  version: {
    textAlign: 'center',
    color: '#999',
    fontSize: 12,
    marginBottom: 32,
  },
  avatarSection: {
    alignItems: 'center',
    padding: 24,
    backgroundColor: '#fff',
  },
  largeAvatar: {
    width: 120,
    height: 120,
    borderRadius: 60,
  },
  cameraButton: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: '#007AFF',
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: '#fff',
  },
  formSection: {
    padding: 16,
  },
  inputRow: {
    flexDirection: 'row',
  },
  inputContainer: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#666',
    marginBottom: 6,
  },
  input: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  saveButton: {
    marginHorizontal: 16,
    marginVertical: 24,
    backgroundColor: '#007AFF',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  disabledButton: {
    opacity: 0.6,
  },
  radioGroup: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  radioOption: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  radioCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#007AFF',
    marginRight: 8,
  },
  radioSelected: {
    backgroundColor: '#007AFF',
  },
  radioLabel: {
    fontSize: 14,
  },
  categoryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#eee',
  },
  categoryInfo: {
    flex: 1,
  },
  categoryLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: '#1a1a1a',
  },
  categoryDescription: {
    fontSize: 12,
    color: '#888',
    marginTop: 2,
  },
  categoryControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  smallSwitch: {
    alignItems: 'center',
  },
  miniLabel: {
    fontSize: 10,
    color: '#888',
    marginBottom: 4,
  },
  timeRange: {
    padding: 12,
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    marginTop: 8,
  },
  timeLabel: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
  fontSizeOptions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  fontSizeOption: {
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
    minWidth: 70,
  },
  fontSizeSelected: {
    borderColor: '#007AFF',
    backgroundColor: '#e6f2ff',
  },
  fontSizeLabel: {
    fontWeight: '600',
    color: '#1a1a1a',
  },
  fontSizeName: {
    fontSize: 10,
    color: '#888',
    marginTop: 4,
  },
  interestGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  interestChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#ddd',
    backgroundColor: '#fff',
  },
  interestChipSelected: {
    borderColor: '#007AFF',
    backgroundColor: '#007AFF',
  },
  interestChipText: {
    fontSize: 14,
    color: '#666',
  },
  interestChipTextSelected: {
    color: '#fff',
  },
});
