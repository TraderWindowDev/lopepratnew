import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Switch, TouchableOpacity, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useStore } from '@/hooks/useStore';
import { Colors, Font, Spacing, Radius } from '@/constants/theme';
import { Card } from '@/components/ui/Card';
import { ScreenHeader } from '@/components/ui/ScreenHeader';

export default function PrivacyScreen() {
  const router = useRouter();
  const { logout } = useStore();
  const [shareData, setShareData] = useState(true);
  const [analytics, setAnalytics] = useState(true);
  const [showCoach, setShowCoach] = useState(true);

  function handleDeleteAccount() {
    Alert.alert(
      'Delete Account',
      'This will permanently delete your account and all training data. This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            Alert.alert('Contact Support', 'Please email support@lopeprat.com to request account deletion.');
          },
        },
      ]
    );
  }

  return (
    <View style={styles.container}>
      <ScreenHeader title="Privacy" />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>

        {/* Data sharing */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>DATA SHARING</Text>
          <Card padding={0}>
            {[
              {
                key: 'coach',
                icon: 'person-outline',
                label: 'Share with Coach',
                sub: 'Your coach can see all workouts, milestones and progress',
                value: showCoach,
                set: setShowCoach,
                color: Colors.primary,
              },
              {
                key: 'data',
                icon: 'analytics-outline',
                label: 'Training Data Sync',
                sub: 'Sync data with integrated apps (Garmin, Strava)',
                value: shareData,
                set: setShareData,
                color: Colors.teal,
              },
              {
                key: 'analytics',
                icon: 'bar-chart-outline',
                label: 'App Analytics',
                sub: 'Help improve Lopeprat by sharing anonymous usage data',
                value: analytics,
                set: setAnalytics,
                color: Colors.purple,
              },
            ].map((item, i, arr) => (
              <View key={item.key} style={[styles.row, i < arr.length - 1 && styles.rowBorder]}>
                <View style={[styles.iconWrap, { backgroundColor: item.color + '22' }]}>
                  <Ionicons name={item.icon as any} size={18} color={item.color} />
                </View>
                <View style={styles.rowText}>
                  <Text style={styles.rowLabel}>{item.label}</Text>
                  <Text style={styles.rowSub}>{item.sub}</Text>
                </View>
                <Switch
                  value={item.value}
                  onValueChange={item.set}
                  trackColor={{ false: Colors.border, true: item.color + '66' }}
                  thumbColor={item.value ? item.color : Colors.textMuted}
                />
              </View>
            ))}
          </Card>
        </View>

        {/* Legal */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>LEGAL</Text>
          <Card padding={0}>
            {[
              { label: 'Privacy Policy', icon: 'document-text-outline' },
              { label: 'Terms of Service', icon: 'shield-checkmark-outline' },
              { label: 'Cookie Policy', icon: 'information-circle-outline' },
            ].map((item, i) => (
              <TouchableOpacity
                key={item.label}
                style={[styles.linkRow, i < 2 && styles.rowBorder]}
                activeOpacity={0.7}
              >
                <Ionicons name={item.icon as any} size={18} color={Colors.textMuted} />
                <Text style={styles.linkLabel}>{item.label}</Text>
                <Ionicons name="chevron-forward" size={16} color={Colors.textMuted} />
              </TouchableOpacity>
            ))}
          </Card>
        </View>

        {/* Danger zone */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: Colors.error + 'AA' }]}>DANGER ZONE</Text>
          <Card padding={16} style={styles.dangerCard}>
            <View style={styles.dangerContent}>
              <Ionicons name="warning-outline" size={20} color={Colors.error} />
              <View style={styles.dangerText}>
                <Text style={styles.dangerTitle}>Delete Account</Text>
                <Text style={styles.dangerSub}>
                  Permanently removes your account, training history, milestones and all data.
                </Text>
              </View>
            </View>
            <TouchableOpacity style={styles.deleteBtn} onPress={handleDeleteAccount}>
              <Text style={styles.deleteBtnText}>Delete My Account</Text>
            </TouchableOpacity>
          </Card>
        </View>

      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  scroll: { paddingBottom: 40 },

  section: { marginHorizontal: Spacing.md, marginTop: 24, gap: 10 },
  sectionTitle: { ...Font.label, color: Colors.textMuted },

  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 12,
  },
  rowBorder: { borderBottomWidth: 1, borderBottomColor: Colors.border },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowText: { flex: 1, gap: 2 },
  rowLabel: { ...Font.body, color: Colors.text, fontWeight: '500' },
  rowSub: { ...Font.tiny, color: Colors.textMuted, lineHeight: 16 },

  linkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 12,
  },
  linkLabel: { ...Font.body, color: Colors.text, flex: 1 },

  dangerCard: { borderColor: Colors.error + '44', borderWidth: 1, gap: 16 },
  dangerContent: { flexDirection: 'row', gap: 12, alignItems: 'flex-start' },
  dangerText: { flex: 1, gap: 4 },
  dangerTitle: { ...Font.h4, color: Colors.error },
  dangerSub: { ...Font.small, color: Colors.textMuted, lineHeight: 18 },
  deleteBtn: {
    padding: 14,
    backgroundColor: Colors.errorFade,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.error + '44',
    alignItems: 'center',
  },
  deleteBtnText: { ...Font.h4, color: Colors.error },
});
