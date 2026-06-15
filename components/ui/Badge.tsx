import React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { Colors, Font, Radius } from '@/constants/theme';
import { WorkoutType } from '@/constants/mock-data';

const WORKOUT_COLORS: Record<WorkoutType, { bg: string; text: string }> = {
  easy: { bg: Colors.easyfade, text: Colors.easy },
  tempo: { bg: Colors.tempoFade, text: Colors.tempo },
  interval: { bg: Colors.intervalFade, text: Colors.interval },
  long: { bg: Colors.longFade, text: Colors.long },
  rest: { bg: Colors.restFade, text: Colors.rest },
  race: { bg: Colors.raceFade, text: Colors.race },
  strength: { bg: Colors.tealFade, text: Colors.teal },
};

interface BadgeProps {
  label: string;
  workoutType?: WorkoutType;
  color?: string;
  bgColor?: string;
  style?: ViewStyle;
}

export function Badge({ label, workoutType, color, bgColor, style }: BadgeProps) {
  const colors = workoutType
    ? WORKOUT_COLORS[workoutType]
    : { bg: bgColor ?? Colors.primaryFade, text: color ?? Colors.primary };

  return (
    <View style={[styles.badge, { backgroundColor: colors.bg }, style]}>
      <Text style={[styles.label, { color: colors.text }]}>{label.toUpperCase()}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: Radius.sm,
    alignSelf: 'flex-start',
  },
  label: { ...Font.label },
});
