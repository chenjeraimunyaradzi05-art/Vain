import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRoute, useNavigation, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { mentorApi } from '../services/api';
import { useSession } from '../hooks/useSession';
import { colors, spacing, typography, borderRadius, shadows } from '../theme';

// Define types for navigation
type RootStackParamList = {
  BookSession: { mentorId: string };
  Mentorship: { initialTab: number };
};

type BookSessionScreenRouteProp = RouteProp<RootStackParamList, 'BookSession'>;
type BookSessionScreenNavigationProp = NativeStackNavigationProp<RootStackParamList>;

interface TimeSlot {
  time: string;
  available: boolean;
}

interface Mentor {
  id: string;
  name: string;
  title: string;
  company: string;
  avatar?: string;
  hourlyRate?: number;
}

// Session type options
const SESSION_TYPES = [
  { id: 'video', label: 'Video Call', icon: 'videocam', duration: 30 },
  { id: 'phone', label: 'Phone Call', icon: 'call', duration: 30 },
  { id: 'chat', label: 'Text Chat', icon: 'chatbubbles', duration: 45 },
] as const;

// Duration options in minutes
const DURATION_OPTIONS = [15, 30, 45, 60];

export default function BookSessionScreen() {
  const route = useRoute<BookSessionScreenRouteProp>();
  const navigation = useNavigation<BookSessionScreenNavigationProp>();
  const { mentorId } = route.params;
  const { user } = useSession();
  
  const [mentor, setMentor] = useState<Mentor | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isBooking, setIsBooking] = useState(false);
  
  // Booking form state
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [availableSlots, setAvailableSlots] = useState<TimeSlot[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<TimeSlot | null>(null);
  const [sessionType, setSessionType] = useState<string>('video');
  const [duration, setDuration] = useState(30);
  const [topic, setTopic] = useState('');
  const [notes, setNotes] = useState('');
  
  // Calendar dates (next 14 days)
  const [calendarDates, setCalendarDates] = useState<Date[]>([]);

  useEffect(() => {
    generateCalendarDates();
    loadMentor();
  }, [mentorId]);

  useEffect(() => {
    if (selectedDate) {
      loadAvailableSlots();
    }
  }, [selectedDate]);

  function generateCalendarDates() {
    const dates: Date[] = [];
    const today = new Date();
    
    for (let i = 0; i < 14; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() + i);
      dates.push(date);
    }
    
    setCalendarDates(dates);
    setSelectedDate(dates[0]);
  }

  async function loadMentor() {
    try {
      const result = await mentorApi.getMentor(mentorId);
      setMentor(result.mentor || result);
    } catch (error) {
      Alert.alert('Error', 'Failed to load mentor details');
      navigation.goBack();
    } finally {
      setIsLoading(false);
    }
  }

  async function loadAvailableSlots() {
    if (!selectedDate) return;
    
    try {
      const dateStr = selectedDate.toISOString().split('T')[0];
      const result = await mentorApi.getAvailability(mentorId, dateStr);
      setAvailableSlots(result.slots || generateMockSlots());
      setSelectedSlot(null);
    } catch (error) {
      console.error('Failed to load slots:', error);
      // Generate mock slots for demo
      setAvailableSlots(generateMockSlots());
    }
  }

  function generateMockSlots(): TimeSlot[] {
    // Generate some sample slots for demo purposes
    const slots: TimeSlot[] = [];
    const times = ['09:00', '10:00', '11:00', '14:00', '15:00', '16:00'];
    
    times.forEach(time => {
      // Randomly mark some as unavailable
      if (Math.random() > 0.3) {
        slots.push({
          time,
          available: true,
        });
      }
    });
    
    return slots;
  }

  function formatDate(date: Date) {
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return {
      day: days[date.getDay()],
      date: date.getDate(),
      month: months[date.getMonth()],
      isToday: date.toDateString() === new Date().toDateString(),
    };
  }

  async function handleBookSession() {
    if (!selectedSlot) {
      Alert.alert('Select a Time', 'Please select an available time slot');
      return;
    }
    
    if (!topic.trim()) {
      Alert.alert('Add a Topic', 'Please describe what you\'d like to discuss');
      return;
    }

    if (!selectedDate) return;

    const dateInfo = formatDate(selectedDate);

    Alert.alert(
      'Confirm Booking',
      `Book a ${duration}-minute ${sessionType} session on ${dateInfo.month} ${dateInfo.date} at ${selectedSlot.time}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Book Session',
          onPress: submitBooking,
        },
      ]
    );
  }

  async function submitBooking() {
    if (!selectedDate || !selectedSlot) return;

    setIsBooking(true);
    try {
      const sessionData = {
        mentorId,
        date: selectedDate.toISOString().split('T')[0],
        time: selectedSlot.time,
        duration,
        type: sessionType,
        topic: topic.trim(),
        notes: notes.trim(),
      };

      await mentorApi.bookSession(sessionData);
      
      Alert.alert(
        'Session Booked! 🎉',
        'Your mentoring session has been scheduled. You\'ll receive a confirmation email with details.',
        [
          {
            text: 'View Sessions',
            onPress: () => navigation.navigate('Mentorship', { initialTab: 2 }),
          },
        ]
      );
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to book session');
    } finally {
      setIsBooking(false);
    }
  }

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Loading availability...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Mentor Summary */}
      <View style={styles.mentorCard}>
        <View style={styles.mentorInfo}>
          <View style={styles.avatarPlaceholder}>
             <Text style={styles.avatarText}>
                {mentor?.name?.charAt(0) || '?'}
             </Text>
          </View>
          <View>
            <Text style={styles.mentorName}>{mentor?.name}</Text>
            <Text style={styles.mentorTitle}>{mentor?.title}</Text>
            <Text style={styles.mentorCompany}>{mentor?.company}</Text>
          </View>
        </View>
      </View>

      {/* Date Selection */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Select Date</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.dateScroll}>
          {calendarDates.map((date, index) => {
            const dateInfo = formatDate(date);
            const isSelected = selectedDate?.toDateString() === date.toDateString();
            
            return (
              <TouchableOpacity
                key={index}
                style={[styles.dateCard, isSelected && styles.dateCardSelected]}
                onPress={() => setSelectedDate(date)}
              >
                <Text style={[styles.dayText, isSelected && styles.dateTextSelected]}>
                  {dateInfo.day}
                </Text>
                <Text style={[styles.dateText, isSelected && styles.dateTextSelected]}>
                  {dateInfo.date}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* Time Slots */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Available Times</Text>
        <View style={styles.slotsGrid}>
          {availableSlots.length > 0 ? (
            availableSlots.map((slot, index) => (
              <TouchableOpacity
                key={index}
                style={[
                  styles.timeSlot,
                  selectedSlot?.time === slot.time && styles.timeSlotSelected,
                  !slot.available && styles.timeSlotDisabled
                ]}
                disabled={!slot.available}
                onPress={() => setSelectedSlot(slot)}
              >
                <Text style={[
                  styles.timeText,
                  selectedSlot?.time === slot.time && styles.timeTextSelected,
                  !slot.available && styles.timeTextDisabled
                ]}>
                  {slot.time}
                </Text>
              </TouchableOpacity>
            ))
          ) : (
            <Text style={styles.noSlotsText}>No slots available for this date</Text>
          )}
        </View>
      </View>

      {/* Session Type */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Session Type</Text>
        <View style={styles.typeContainer}>
          {SESSION_TYPES.map((type) => (
            <TouchableOpacity
              key={type.id}
              style={[
                styles.typeOption,
                sessionType === type.id && styles.typeOptionSelected
              ]}
              onPress={() => setSessionType(type.id)}
            >
              <Ionicons 
                name={type.icon as any} 
                size={24} 
                color={sessionType === type.id ? colors.primary : colors.textSecondary} 
              />
              <Text style={[
                styles.typeLabel,
                sessionType === type.id && styles.typeLabelSelected
              ]}>
                {type.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Duration */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Duration</Text>
        <View style={styles.durationContainer}>
          {DURATION_OPTIONS.map((mins) => (
            <TouchableOpacity
              key={mins}
              style={[
                styles.durationOption,
                duration === mins && styles.durationOptionSelected
              ]}
              onPress={() => setDuration(mins)}
            >
              <Text style={[
                styles.durationText,
                duration === mins && styles.durationTextSelected
              ]}>
                {mins} min
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Topic & Notes */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Session Details</Text>
        <TextInput
          style={styles.input}
          placeholder="What would you like to discuss?"
          value={topic}
          onChangeText={setTopic}
        />
        <TextInput
          style={[styles.input, styles.textArea]}
          placeholder="Additional notes (optional)"
          value={notes}
          onChangeText={setNotes}
          multiline
          numberOfLines={4}
        />
      </View>

      {/* Book Button */}
      <TouchableOpacity
        style={[
          styles.bookButton,
          (!selectedSlot || !topic.trim() || isBooking) && styles.bookButtonDisabled
        ]}
        onPress={handleBookSession}
        disabled={!selectedSlot || !topic.trim() || isBooking}
      >
        {isBooking ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.bookButtonText}>Confirm Booking</Text>
        )}
      </TouchableOpacity>
      
      <View style={styles.spacer} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: spacing.md,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: spacing.sm,
    color: colors.textSecondary,
  },
  mentorCard: {
    backgroundColor: colors.surface,
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    marginBottom: spacing.lg,
    ...shadows.sm,
  },
  mentorInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarPlaceholder: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: colors.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  avatarText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.primary,
  },
  mentorName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text,
  },
  mentorTitle: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: 2,
  },
  mentorCompany: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  section: {
    marginBottom: spacing.xl,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: spacing.md,
  },
  dateScroll: {
    marginHorizontal: -spacing.md,
    paddingHorizontal: spacing.md,
  },
  dateCard: {
    width: 70,
    height: 80,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  dateCardSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  dayText: {
    fontSize: 12,
    color: colors.textSecondary,
    marginBottom: 4,
  },
  dateText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.text,
  },
  dateTextSelected: {
    color: '#fff',
  },
  slotsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -5,
  },
  timeSlot: {
    width: '30%',
    paddingVertical: spacing.sm,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    margin: '1.5%',
  },
  timeSlotSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  timeSlotDisabled: {
    backgroundColor: colors.background,
    borderColor: colors.border,
    opacity: 0.5,
  },
  timeText: {
    fontSize: 14,
    color: colors.text,
  },
  timeTextSelected: {
    color: '#fff',
  },
  timeTextDisabled: {
    color: colors.textSecondary,
  },
  noSlotsText: {
    color: colors.textSecondary,
    fontStyle: 'italic',
  },
  typeContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  typeOption: {
    flex: 1,
    alignItems: 'center',
    padding: spacing.sm,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    marginHorizontal: 4,
  },
  typeOptionSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryLight,
  },
  typeLabel: {
    fontSize: 12,
    marginTop: 4,
    color: colors.textSecondary,
  },
  typeLabelSelected: {
    color: colors.primary,
    fontWeight: 'bold',
  },
  durationContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  durationOption: {
    flex: 1,
    paddingVertical: spacing.sm,
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    marginHorizontal: 4,
  },
  durationOptionSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  durationText: {
    fontSize: 14,
    color: colors.text,
  },
  durationTextSelected: {
    color: '#fff',
    fontWeight: 'bold',
  },
  input: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    fontSize: 16,
    marginBottom: spacing.md,
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  bookButton: {
    backgroundColor: colors.primary,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    marginTop: spacing.md,
  },
  bookButtonDisabled: {
    backgroundColor: colors.disabled,
  },
  bookButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  spacer: {
    height: 40,
  },
});