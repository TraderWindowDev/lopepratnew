import { Stack } from 'expo-router';
import { Colors } from '@/constants/theme';

export default function CoachLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: Colors.background },
        animation: 'slide_from_right',
      }}
    >
      <Stack.Screen name="index" />
      <Stack.Screen name="[athleteId]" />
      <Stack.Screen name="plans" />
      <Stack.Screen name="create-plan" />
      <Stack.Screen name="chat-athlete" />
    </Stack>
  );
}
