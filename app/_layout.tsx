import { useEffect } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { useStore } from '@/hooks/useStore';
import { InAppNotificationBanner } from '@/components/ui/InAppNotificationBanner';

function AuthGate({ children }: { children: React.ReactNode }) {
  const { userMode, isInitializing, initialize } = useStore();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    initialize();
  }, []);

  useEffect(() => {
    if (isInitializing) return;
    const inAuth = segments[0] === '(auth)';
    if (!userMode && !inAuth) {
      router.replace('/(auth)');
    } else if (userMode === 'athlete' && inAuth) {
      router.replace('/(tabs)');
    } else if (userMode === 'coach' && inAuth) {
      router.replace('/coach');
    }
  }, [userMode, segments, isInitializing]);

  return <>{children}</>;
}

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <StatusBar style="light" />
      <AuthGate>
        <Stack screenOptions={{ headerShown: false, animation: 'fade' }}>
          <Stack.Screen name="(auth)" />
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="coach" />
          <Stack.Screen name="workout/[id]" options={{ animation: 'slide_from_right' }} />
          <Stack.Screen name="profile" options={{ animation: 'slide_from_right' }} />
        </Stack>
        <InAppNotificationBanner />
      </AuthGate>
    </GestureHandlerRootView>
  );
}
