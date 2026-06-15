import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Linking,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Font, Spacing, Radius } from '@/constants/theme';
import { Card } from '@/components/ui/Card';
import { ScreenHeader } from '@/components/ui/ScreenHeader';

const FAQ = [
  {
    q: 'How do I log a completed workout?',
    a: 'Open the workout from your Today or Plan tab, then tap "Log Workout" at the bottom. Fill in your actual distance, time and effort rating.',
  },
  {
    q: 'How do I message my coach?',
    a: 'Go to the Chat tab at the bottom of the screen. All messages are visible to both you and your coach in real time.',
  },
  {
    q: 'Why hasn\'t my coach assigned a plan yet?',
    a: 'Your coach will assign a training plan after reviewing your profile and goals. If you haven\'t heard back within 48 hours, send them a message in the Chat tab.',
  },
  {
    q: 'How are milestones tracked?',
    a: 'Milestones are automatically unlocked as you hit training achievements — like completing your first week or logging 50km total. Your coach can also unlock them manually.',
  },
  {
    q: 'Can I change my training goal?',
    a: 'Yes — go to Profile → Training Preferences and update your goal. Your coach will be notified of the change.',
  },
  {
    q: 'How do I integrate Garmin or Strava?',
    a: 'Integrations are coming soon. Go to Profile → Integrations to see the connection status and get notified when they launch.',
  },
  {
    q: 'Is my data secure?',
    a: 'All data is encrypted in transit and stored securely on Supabase infrastructure. We never sell your personal data. See Privacy for full details.',
  },
];

const CONTACT_ITEMS = [
  { icon: 'mail-outline', label: 'Email Support', value: 'support@lopeprat.com', color: Colors.primary, action: () => Linking.openURL('mailto:support@lopeprat.com') },
  { icon: 'logo-instagram', label: 'Instagram', value: '@lopeprat', color: Colors.purple, action: () => Linking.openURL('https://instagram.com/lopeprat') },
];

export default function HelpScreen() {
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  return (
    <View style={styles.container}>
      <ScreenHeader title="Help & Support" />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>

        {/* Search hint */}
        <View style={styles.searchHint}>
          <Ionicons name="search-outline" size={16} color={Colors.textMuted} />
          <Text style={styles.searchHintText}>Find answers to common questions below</Text>
        </View>

        {/* FAQ */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>FREQUENTLY ASKED</Text>
          <Card padding={0}>
            {FAQ.map((item, i) => (
              <View key={i}>
                <TouchableOpacity
                  style={[styles.faqRow, i < FAQ.length - 1 && openFaq !== i && styles.faqBorder]}
                  onPress={() => setOpenFaq(openFaq === i ? null : i)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.faqQ}>{item.q}</Text>
                  <Ionicons
                    name={openFaq === i ? 'chevron-up' : 'chevron-down'}
                    size={16}
                    color={Colors.textMuted}
                  />
                </TouchableOpacity>
                {openFaq === i && (
                  <View style={[styles.faqAnswer, i < FAQ.length - 1 && styles.faqBorder]}>
                    <Text style={styles.faqA}>{item.a}</Text>
                  </View>
                )}
              </View>
            ))}
          </Card>
        </View>

        {/* Contact */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>GET IN TOUCH</Text>
          <Card padding={0}>
            {CONTACT_ITEMS.map((item, i) => (
              <TouchableOpacity
                key={item.label}
                style={[styles.contactRow, i < CONTACT_ITEMS.length - 1 && styles.faqBorder]}
                onPress={item.action}
                activeOpacity={0.7}
              >
                <View style={[styles.contactIcon, { backgroundColor: item.color + '22' }]}>
                  <Ionicons name={item.icon as any} size={18} color={item.color} />
                </View>
                <View style={styles.contactText}>
                  <Text style={styles.contactLabel}>{item.label}</Text>
                  <Text style={styles.contactValue}>{item.value}</Text>
                </View>
                <Ionicons name="arrow-forward" size={16} color={Colors.textMuted} />
              </TouchableOpacity>
            ))}
          </Card>
        </View>

        {/* Report */}
        <View style={styles.section}>
          <Card padding={0}>
            <TouchableOpacity
              style={styles.reportRow}
              onPress={() => Linking.openURL('mailto:support@lopeprat.com?subject=Bug%20Report')}
              activeOpacity={0.7}
            >
              <Ionicons name="bug-outline" size={18} color={Colors.error} />
              <Text style={styles.reportText}>Report a Problem</Text>
              <Ionicons name="chevron-forward" size={16} color={Colors.textMuted} />
            </TouchableOpacity>
          </Card>
        </View>

        {/* App info */}
        <View style={styles.appInfo}>
          <Text style={styles.appName}>Lopeprat Coaching</Text>
          <Text style={styles.appVersion}>Version 1.0.0 · SDK 54</Text>
          <Text style={styles.appCopyright}>© 2026 Lopeprat. All rights reserved.</Text>
        </View>

      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  scroll: { paddingBottom: 40 },

  searchHint: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginHorizontal: Spacing.md,
    marginTop: 20,
    padding: 12,
    backgroundColor: Colors.surface,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  searchHintText: { ...Font.small, color: Colors.textMuted },

  section: { marginHorizontal: Spacing.md, marginTop: 24, gap: 10 },
  sectionTitle: { ...Font.label, color: Colors.textMuted },

  faqRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 12,
  },
  faqBorder: { borderBottomWidth: 1, borderBottomColor: Colors.border },
  faqQ: { ...Font.body, color: Colors.text, flex: 1, fontWeight: '500', lineHeight: 20 },
  faqAnswer: {
    paddingHorizontal: 16,
    paddingBottom: 14,
    paddingTop: 2,
  },
  faqA: { ...Font.body, color: Colors.textSecondary, lineHeight: 22 },

  contactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 12,
  },
  contactIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  contactText: { flex: 1, gap: 2 },
  contactLabel: { ...Font.body, color: Colors.text, fontWeight: '500' },
  contactValue: { ...Font.small, color: Colors.textMuted },

  reportRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 12,
  },
  reportText: { ...Font.body, color: Colors.error, flex: 1 },

  appInfo: { alignItems: 'center', gap: 4, marginTop: 32, paddingBottom: 8 },
  appName: { ...Font.h4, color: Colors.textSecondary },
  appVersion: { ...Font.small, color: Colors.textMuted },
  appCopyright: { ...Font.tiny, color: Colors.textMuted },
});
