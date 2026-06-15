import React from 'react';
import { View, ViewStyle, StyleProp, StyleSheet } from 'react-native';
import { Colors, Radius } from '@/constants/theme';

interface CardProps {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  elevated?: boolean;
  padding?: number;
}

export function Card({ children, style, elevated = false, padding = 16 }: CardProps) {
  return (
    <View
      style={[
        styles.card,
        elevated && styles.elevated,
        { padding },
        style,
      ]}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.card,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  elevated: {
    backgroundColor: Colors.cardElevated,
  },
});
