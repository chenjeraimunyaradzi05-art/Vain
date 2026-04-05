/**
 * Video Call Screen
 * 
 * Real-time video calling for mentorship sessions.
 * Uses expo-camera and WebRTC for peer-to-peer communication.
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  SafeAreaView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Camera, CameraType, CameraView } from 'expo-camera';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { useTheme } from '../context/ThemeContext';
import { colors as defaultColors, spacing, typography, borderRadius } from '../theme';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

interface RouteParams {
  sessionId: string;
  participantName: string;
  sessionType: 'mentor' | 'interview';
}

type VideoCallRouteProp = RouteProp<{ VideoCall: RouteParams }, 'VideoCall'>;

export default function VideoCallScreen() {
  const navigation = useNavigation();
  const route = useRoute<VideoCallRouteProp>();
  const { colors } = useTheme();
  
  const { sessionId, participantName, sessionType } = route.params || {
    sessionId: '',
    participantName: 'Participant',
    sessionType: 'mentor',
  };

  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [cameraType, setCameraType] = useState<CameraType>('front');
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [isConnecting, setIsConnecting] = useState(true);
  const [isConnected, setIsConnected] = useState(false);
  const [callDuration, setCallDuration] = useState(0);
  const [isSpeakerOn, setIsSpeakerOn] = useState(true);

  const cameraRef = useRef<CameraView>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Request camera permissions
  useEffect(() => {
    (async () => {
      const { status } = await Camera.requestCameraPermissionsAsync();
      const micStatus = await Camera.requestMicrophonePermissionsAsync();
      setHasPermission(status === 'granted' && micStatus.status === 'granted');
    })();
  }, []);

  // Simulate connection and start timer
  useEffect(() => {
    // Simulate connecting to peer
    const connectTimer = setTimeout(() => {
      setIsConnecting(false);
      setIsConnected(true);
    }, 2000);

    return () => clearTimeout(connectTimer);
  }, []);

  // Call duration timer
  useEffect(() => {
    if (isConnected && !timerRef.current) {
      timerRef.current = setInterval(() => {
        setCallDuration((prev) => prev + 1);
      }, 1000);
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [isConnected]);

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleEndCall = () => {
    Alert.alert(
      'End Call',
      'Are you sure you want to end this call?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'End Call',
          style: 'destructive',
          onPress: () => {
            if (timerRef.current) {
              clearInterval(timerRef.current);
            }
            navigation.goBack();
          },
        },
      ]
    );
  };

  const toggleCamera = () => {
    setCameraType((current) =>
      current === 'back' ? 'front' : 'back'
    );
  };

  const toggleMute = () => {
    setIsMuted(!isMuted);
    // In real implementation, mute WebRTC audio track
  };

  const toggleVideo = () => {
    setIsVideoOff(!isVideoOff);
    // In real implementation, disable WebRTC video track
  };

  const toggleSpeaker = () => {
    setIsSpeakerOn(!isSpeakerOn);
    // In real implementation, switch audio output
  };

  if (hasPermission === null) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={[styles.loadingText, { color: colors.text }]}>
          Requesting permissions...
        </Text>
      </View>
    );
  }

  if (hasPermission === false) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <Ionicons name="videocam-off" size={64} color={colors.error} />
        <Text style={[styles.errorText, { color: colors.text }]}>
          Camera & Microphone Access Required
        </Text>
        <Text style={[styles.errorSubtext, { color: colors.textSecondary }]}>
          Please enable camera and microphone permissions in your device settings to use video calls.
        </Text>
        <TouchableOpacity
          style={[styles.backButton, { backgroundColor: colors.primary }]}
          onPress={() => navigation.goBack()}
        >
          <Text style={[styles.backButtonText, { color: colors.textInverse }]}>
            Go Back
          </Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: '#000' }]}>
      <View style={styles.container}>
        {/* Remote Video (Full Screen) */}
        <View style={styles.remoteVideoContainer}>
          {isConnecting ? (
            <View style={styles.connectingOverlay}>
              <ActivityIndicator size="large" color={colors.primary} />
              <Text style={styles.connectingText}>
                Connecting to {participantName}...
              </Text>
            </View>
          ) : (
            // Placeholder for remote video - in real implementation, use RTCView
            <View style={styles.remoteVideoPlaceholder}>
              <Ionicons name="person" size={100} color="#666" />
              <Text style={styles.remoteName}>{participantName}</Text>
            </View>
          )}
        </View>

        {/* Local Video Preview (Picture-in-Picture) */}
        {!isVideoOff && (
          <View style={styles.localVideoContainer}>
            <CameraView
              ref={cameraRef}
              style={styles.localVideo}
              facing={cameraType}
            />
            <TouchableOpacity
              style={styles.switchCameraButton}
              onPress={toggleCamera}
            >
              <Ionicons name="camera-reverse" size={20} color="#FFF" />
            </TouchableOpacity>
          </View>
        )}

        {/* Top Info Bar */}
        <View style={styles.topBar}>
          <View style={styles.callInfo}>
            <Text style={styles.participantName}>{participantName}</Text>
            <Text style={styles.sessionType}>
              {sessionType === 'mentor' ? 'Mentorship Session' : 'Interview'}
            </Text>
          </View>
          {isConnected && (
            <View style={styles.durationContainer}>
              <View style={styles.liveIndicator} />
              <Text style={styles.duration}>{formatDuration(callDuration)}</Text>
            </View>
          )}
        </View>

        {/* Bottom Controls */}
        <View style={styles.controlsContainer}>
          <TouchableOpacity
            style={[styles.controlButton, isSpeakerOn && styles.controlButtonActive]}
            onPress={toggleSpeaker}
          >
            <Ionicons
              name={isSpeakerOn ? 'volume-high' : 'volume-mute'}
              size={24}
              color="#FFF"
            />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.controlButton, isVideoOff && styles.controlButtonActive]}
            onPress={toggleVideo}
          >
            <Ionicons
              name={isVideoOff ? 'videocam-off' : 'videocam'}
              size={24}
              color="#FFF"
            />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.controlButton, isMuted && styles.controlButtonActive]}
            onPress={toggleMute}
          >
            <Ionicons
              name={isMuted ? 'mic-off' : 'mic'}
              size={24}
              color="#FFF"
            />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.controlButton, styles.endCallButton]}
            onPress={handleEndCall}
          >
            <Ionicons name="call" size={28} color="#FFF" />
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  container: {
    flex: 1,
    backgroundColor: '#000',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: spacing.md,
    fontSize: typography.fontSize.md,
  },
  errorText: {
    marginTop: spacing.md,
    fontSize: typography.fontSize.lg,
    fontWeight: '600',
    textAlign: 'center',
  },
  errorSubtext: {
    marginTop: spacing.sm,
    fontSize: typography.fontSize.base,
    textAlign: 'center',
    paddingHorizontal: spacing.xl,
  },
  backButton: {
    marginTop: spacing.lg,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.button,
  },
  backButtonText: {
    fontSize: typography.fontSize.md,
    fontWeight: '600',
  },
  remoteVideoContainer: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#1A1A1A',
    justifyContent: 'center',
    alignItems: 'center',
  },
  remoteVideoPlaceholder: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  remoteName: {
    marginTop: spacing.md,
    fontSize: typography.fontSize.lg,
    color: '#999',
  },
  connectingOverlay: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  connectingText: {
    marginTop: spacing.md,
    fontSize: typography.fontSize.md,
    color: '#FFF',
  },
  localVideoContainer: {
    position: 'absolute',
    top: 100,
    right: spacing.md,
    width: 120,
    height: 160,
    borderRadius: borderRadius.md,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: '#333',
  },
  localVideo: {
    flex: 1,
  },
  switchCameraButton: {
    position: 'absolute',
    bottom: spacing.xs,
    right: spacing.xs,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  topBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    padding: spacing.md,
    paddingTop: spacing.xl,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
  },
  callInfo: {
    flex: 1,
  },
  participantName: {
    fontSize: typography.fontSize.lg,
    fontWeight: '600',
    color: '#FFF',
  },
  sessionType: {
    fontSize: typography.fontSize.sm,
    color: '#AAA',
    marginTop: 2,
  },
  durationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
  },
  liveIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#F44336',
    marginRight: spacing.xs,
  },
  duration: {
    fontSize: typography.fontSize.sm,
    color: '#FFF',
    fontWeight: '500',
  },
  controlsContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: spacing.xl,
    paddingBottom: spacing.xxl,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    gap: spacing.md,
  },
  controlButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  controlButtonActive: {
    backgroundColor: 'rgba(255, 255, 255, 0.4)',
  },
  endCallButton: {
    backgroundColor: '#F44336',
    transform: [{ rotate: '135deg' }],
  },
});
