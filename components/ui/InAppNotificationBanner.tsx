import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, TouchableOpacity, Platform } from 'react-native';
import { usePathname, useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useStore } from '@/hooks/useStore';
import { Colors, Font, Radius } from '@/constants/theme';

export function InAppNotificationBanner() {
  const inAppNotification = useStore((s) => s.inAppNotification);
  const clearNotification = useStore((s) => s.clearNotification);
  const markMessagesRead = useStore((s) => s.markMessagesRead);
  const userMode = useStore((s) => s.userMode);
  const pathname = usePathname();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const translateY = useRef(new Animated.Value(-120)).current;
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const isCoach = userMode === 'coach';
  const params = useLocalSearchParams<{ athleteId?: string }>();
  // Suppress banner if the user is already looking at the relevant conversation
  const onMessagesTab = pathname === '/messages' || pathname === '/(tabs)/messages';
  const onCoachChat = isCoach && pathname.includes('chat-athlete') &&
    params.athleteId === inAppNotification?.athleteId;

  useEffect(() => {
    if (!inAppNotification || onMessagesTab || onCoachChat) return;

    // Slide in
    Animated.spring(translateY, {
      toValue: 0,
      useNativeDriver: true,
      damping: 18,
      stiffness: 220,
    }).start();

    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => dismiss(), 4000);

    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [inAppNotification?.id, onMessagesTab]);

  function dismiss() {
    Animated.timing(translateY, {
      toValue: -120,
      duration: 250,
      useNativeDriver: true,
    }).start(() => clearNotification());
  }

  function handlePress() {
    dismiss();
    markMessagesRead();
    if (isCoach && inAppNotification?.athleteId) {
      router.push({ pathname: '/coach/chat-athlete', params: { athleteId: inAppNotification.athleteId } });
    } else {
      router.push('/(tabs)/messages');
    }
  }

  if (!inAppNotification || onMessagesTab || onCoachChat) return null;

  return (
    <Animated.View
      style={[
        styles.banner,
        { top: insets.top + 8, transform: [{ translateY }] },
      ]}
    >
      <TouchableOpacity style={styles.inner} onPress={handlePress} activeOpacity={0.92}>
        <View style={styles.iconWrap}>
          <Ionicons name="chatbubble-ellipses" size={18} color={Colors.primary} />
        </View>
        <View style={styles.content}>
          <Text style={styles.sender} numberOfLines={1}>{inAppNotification.senderName}</Text>
          <Text style={styles.text} numberOfLines={2}>{inAppNotification.text}</Text>
        </View>
        <TouchableOpacity onPress={dismiss} hitSlop={12}>
          <Ionicons name="close" size={16} color={Colors.textMuted} />
        </TouchableOpacity>
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  banner: {
    position: 'absolute',
    left: 12,
    right: 12,
    zIndex: 9999,
    elevation: 20,
    borderRadius: Radius.lg,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
  },
  inner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    gap: 12,
  },
  iconWrap: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: Colors.primaryFade,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: { flex: 1, gap: 2 },
  sender: { ...Font.label, color: Colors.primary },
  text: { ...Font.small, color: Colors.text, lineHeight: 18 },
});
