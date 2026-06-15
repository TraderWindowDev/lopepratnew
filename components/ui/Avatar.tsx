import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Font, Radius } from '@/constants/theme';

interface AvatarProps {
  initials: string;
  color: string;
  size?: number;
}

export function Avatar({ initials, color, size = 40 }: AvatarProps) {
  const fontSize = size * 0.36;
  return (
    <View
      style={[
        styles.avatar,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: color + '33',
          borderColor: color + '66',
        },
      ]}
    >
      <Text style={[styles.text, { color, fontSize }]}>{initials}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  avatar: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
  },
  text: { fontWeight: '700', letterSpacing: 0.5 },
});
