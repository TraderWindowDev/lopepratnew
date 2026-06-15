import React from 'react';
import { View, Text, StyleSheet, ScrollView, Switch, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useStoredState } from '@/hooks/useStoredState';
import { Colors, Font, Spacing, Radius } from '@/constants/theme';
import { Card } from '@/components/ui/Card';
import { ScreenHeader } from '@/components/ui/ScreenHeader';

interface NotifSetting {
  key: string;
  icon: string;
  label: string;
  sub: string;
  color: string;
}

const TRAINING_NOTIFS: NotifSetting[] = [
  { key: 'workout_reminder', icon: 'alarm-outline', label: 'Workout Reminders', sub: 'Daily reminder before your scheduled session', color: Colors.primary },
  { key: 'rest_day', icon: 'moon-outline', label: 'Rest Day Nudge', sub: 'Reminder to recover on scheduled rest days', color: Colors.teal },
  { key: 'weekly_summary', icon: 'bar-chart-outline', label: 'Weekly Summary', sub: 'Every Sunday — your week in review', color: Colors.purple },
];

const COACH_NOTIFS: NotifSetting[] = [
  { key: 'coach_message', icon: 'chatbubble-outline', label: 'Coach Messages', sub: 'New messages from your coach', color: Colors.primary },
  { key: 'plan_update', icon: 'calendar-outline', label: 'Plan Updates', sub: 'When your coach modifies your training plan', color: Colors.gold },
  { key: 'coach_note', icon: 'document-text-outline', label: 'Coach Notes', sub: 'Feedback added to your workouts', color: Colors.teal },
];

const RACE_NOTIFS: NotifSetting[] = [
  { key: 'race_countdown', icon: 'flag-outline', label: 'Race Countdown', sub: '7 days, 3 days and 1 day before race day', color: Colors.gold },
  { key: 'race_day', icon: 'trophy-outline', label: 'Race Day', sub: 'Good luck message on race morning', color: Colors.primary },
];

const DEFAULT_SETTINGS: Record<string, boolean> = {
  workout_reminder: true,
  rest_day: false,
  weekly_summary: true,
  coach_message: true,
  plan_update: true,
  coach_note: false,
  race_countdown: true,
  race_day: true,
};

export default function NotificationsScreen() {
  const [settings, setSettings, loaded] = useStoredState<Record<string, boolean>>(
    'notification_settings',
    DEFAULT_SETTINGS,
  );

  function toggle(key: string) {
    setSettings(s => ({ ...s, [key]: !s[key] }));
  }

  function renderSection(title: string, items: NotifSetting[]) {
    return (
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{title}</Text>
        <Card padding={0}>
          {items.map((item, i) => (
            <View
              key={item.key}
              style={[styles.row, i < items.length - 1 && styles.rowBorder]}
            >
              <View style={[styles.iconWrap, { backgroundColor: item.color + '22' }]}>
                <Ionicons name={item.icon as any} size={18} color={item.color} />
              </View>
              <View style={styles.rowText}>
                <Text style={styles.rowLabel}>{item.label}</Text>
                <Text style={styles.rowSub}>{item.sub}</Text>
              </View>
              <Switch
                value={settings[item.key]}
                onValueChange={() => toggle(item.key)}
                trackColor={{ false: Colors.border, true: Colors.primary + '66' }}
                thumbColor={settings[item.key] ? Colors.primary : Colors.textMuted}
              />
            </View>
          ))}
        </Card>
      </View>
    );
  }

  const activeCount = Object.values(settings).filter(Boolean).length;

  if (!loaded) {
    return (
      <View style={styles.container}>
        <ScreenHeader title="Notifications" />
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator color={Colors.primary} />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScreenHeader title="Notifications" />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>

        <View style={styles.summaryBanner}>
          <Ionicons name="notifications" size={18} color={Colors.primary} />
          <Text style={styles.summaryText}>
            {activeCount} notification{activeCount !== 1 ? 's' : ''} enabled
          </Text>
        </View>

        {renderSection('TRAINING', TRAINING_NOTIFS)}
        {renderSection('COACH', COACH_NOTIFS)}
        {renderSection('RACE', RACE_NOTIFS)}

        <View style={styles.note}>
          <Ionicons name="information-circle-outline" size={16} color={Colors.textMuted} />
          <Text style={styles.noteText}>
            Notification preferences are saved on this device. Push notifications require the app to be installed natively.
          </Text>
        </View>

      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  scroll: { paddingBottom: 40 },

  summaryBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginHorizontal: Spacing.md,
    marginTop: 20,
    padding: 14,
    backgroundColor: Colors.primaryFade,
    borderRadius: Radius.md,
  },
  summaryText: { ...Font.body, color: Colors.primary, fontWeight: '600' },

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

  note: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    marginHorizontal: Spacing.md,
    marginTop: 24,
    padding: 14,
    backgroundColor: Colors.surface,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  noteText: { ...Font.small, color: Colors.textMuted, flex: 1, lineHeight: 18 },
});
