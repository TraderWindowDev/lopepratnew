import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useStore } from '@/hooks/useStore';
import { Colors, Font, Spacing, Radius } from '@/constants/theme';
import { contentItems, ContentItem } from '@/constants/mock-data';
import { Card } from '@/components/ui/Card';
import { Avatar } from '@/components/ui/Avatar';

const CONTENT_ICONS: Record<string, string> = {
  video: 'videocam',
  article: 'document-text',
  podcast: 'mic',
};

const CONTENT_COLORS: Record<string, string> = {
  video: Colors.purple,
  article: Colors.teal,
  podcast: Colors.primary,
};

const FILTER_TAGS = ['All', 'Nutrition', 'Form', 'Training', 'Recovery', 'Race Day'];

export default function MoreScreen() {
  const router = useRouter();
  const { athlete, logout } = useStore();
  const [activeFilter, setActiveFilter] = useState('All');
  const [activeSection, setActiveSection] = useState<'content' | 'profile'>('content');

  const filteredContent = activeFilter === 'All'
    ? contentItems
    : contentItems.filter((c) => c.tag === activeFilter);

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.safe}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.sectionToggle}>
            {(['content', 'profile'] as const).map((s) => (
              <TouchableOpacity
                key={s}
                style={[styles.toggleBtn, activeSection === s && styles.toggleBtnActive]}
                onPress={() => setActiveSection(s)}
              >
                <Text style={[styles.toggleText, activeSection === s && styles.toggleTextActive]}>
                  {s === 'content' ? 'Content' : 'Profile'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {activeSection === 'content' ? (
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
            {/* Featured banner */}
            <Card style={styles.featuredCard} padding={0}>
              <View style={[styles.featuredBanner, { backgroundColor: Colors.primary + '22' }]}>
                <View style={styles.featuredIcon}>
                  <Ionicons name="mic" size={28} color={Colors.primary} />
                </View>
                <View style={styles.featuredText}>
                  <Text style={styles.featuredEyebrow}>LATEST EPISODE</Text>
                  <Text style={styles.featuredTitle}>Fueling the Long Run</Text>
                  <Text style={styles.featuredMeta}>48 min · Nutrition</Text>
                </View>
                <TouchableOpacity style={styles.playBtn}>
                  <Ionicons name="play" size={18} color="#fff" />
                </TouchableOpacity>
              </View>
            </Card>

            {/* Filter chips */}
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.filterRow}
              style={styles.filterScroll}
            >
              {FILTER_TAGS.map((tag) => (
                <TouchableOpacity
                  key={tag}
                  style={[styles.filterChip, activeFilter === tag && styles.filterChipActive]}
                  onPress={() => setActiveFilter(tag)}
                >
                  <Text style={[styles.filterChipText, activeFilter === tag && styles.filterChipTextActive]}>
                    {tag}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            {/* Content grid */}
            <View style={styles.contentList}>
              {filteredContent.map((item) => (
                <ContentCard key={item.id} item={item} />
              ))}
            </View>
          </ScrollView>
        ) : (
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
            {/* Profile card */}
            <Card style={styles.profileCard} padding={20}>
              <View style={styles.profileHeader}>
                <Avatar initials={athlete.initials} color={athlete.avatarColor} size={64} />
                <View style={styles.profileInfo}>
                  <Text style={styles.profileName}>{athlete.name}</Text>
                  <Text style={styles.profileGoal}>
                    {athlete.goal.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase())}
                  </Text>
                  <Text style={styles.profileJoined}>
                    Joined {new Date(athlete.joinDate).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                  </Text>
                </View>
              </View>
            </Card>

            {/* Target Race card */}
            <TouchableOpacity
              style={styles.raceCard}
              activeOpacity={0.8}
              onPress={() => router.push('/profile/race-calendar')}
            >
              <View style={[styles.raceIconWrap, { backgroundColor: Colors.gold + '22' }]}>
                <Ionicons name="trophy-outline" size={20} color={Colors.gold} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.raceCardLabel}>Target Race</Text>
                <Text style={styles.raceCardName} numberOfLines={1}>
                  {athlete.targetRace?.name && athlete.targetRace.name !== 'TBD'
                    ? athlete.targetRace.name
                    : 'Not set — tap to add'}
                </Text>
                {athlete.targetRace?.date && athlete.targetRace.name !== 'TBD' && (
                  <Text style={styles.raceCardDate}>
                    {new Date(athlete.targetRace.date).toLocaleDateString('en-US', {
                      month: 'long', day: 'numeric', year: 'numeric',
                    })}
                  </Text>
                )}
              </View>
              <Ionicons name="chevron-forward" size={16} color={Colors.textMuted} />
            </TouchableOpacity>

            {/* Settings sections */}
            {[
              {
                title: 'Training',
                items: [
                  { icon: 'calendar-outline', label: 'My Plan', color: Colors.primary, route: '/profile/my-plan' },
                  { icon: 'flag-outline', label: 'Race Calendar', color: Colors.gold, route: '/profile/race-calendar' },
                  { icon: 'settings-outline', label: 'Training Preferences', color: Colors.textSecondary, route: '/profile/training-preferences' },
                ],
              },
              {
                title: 'Integrations',
                items: [
                  { icon: 'watch-outline', label: 'Garmin', color: Colors.teal, route: null, badge: 'Soon' },
                  { icon: 'bicycle-outline', label: 'Strava', color: Colors.primary, route: null, badge: 'Soon' },
                  { icon: 'heart-outline', label: 'Apple Health', color: Colors.error, route: null, badge: 'Soon' },
                ],
              },
              {
                title: 'Account',
                items: [
                  { icon: 'notifications-outline', label: 'Notifications', color: Colors.purple, route: '/profile/notifications' },
                  { icon: 'shield-outline', label: 'Privacy', color: Colors.textSecondary, route: '/profile/privacy' },
                  { icon: 'help-circle-outline', label: 'Help & Support', color: Colors.textSecondary, route: '/profile/help' },
                ],
              },
            ].map((section) => (
              <View key={section.title} style={styles.settingsSection}>
                <Text style={styles.settingsSectionTitle}>{section.title}</Text>
                <Card padding={0}>
                  {section.items.map((item, i) => (
                    <TouchableOpacity
                      key={item.label}
                      style={[styles.settingsRow, i < section.items.length - 1 && styles.settingsRowBorder]}
                      activeOpacity={item.route ? 0.7 : 1}
                      onPress={() => item.route && router.push(item.route as any)}
                    >
                      <View style={[styles.settingsIcon, { backgroundColor: item.color + '22' }]}>
                        <Ionicons name={item.icon as any} size={18} color={item.color} />
                      </View>
                      <Text style={styles.settingsLabel}>{item.label}</Text>
                      {(item as any).badge ? (
                        <View style={styles.soonBadge}>
                          <Text style={styles.soonBadgeText}>{(item as any).badge}</Text>
                        </View>
                      ) : (
                        <Ionicons name="chevron-forward" size={16} color={Colors.textMuted} />
                      )}
                    </TouchableOpacity>
                  ))}
                </Card>
              </View>
            ))}

            <TouchableOpacity style={styles.logoutBtn} onPress={() => { logout().then(() => router.replace('/(auth)')); }}>
              <Ionicons name="log-out-outline" size={18} color={Colors.error} />
              <Text style={styles.logoutText}>Sign Out</Text>
            </TouchableOpacity>
          </ScrollView>
        )}
      </SafeAreaView>
    </View>
  );
}

function ContentCard({ item }: { item: ContentItem }) {
  const color = CONTENT_COLORS[item.type];
  const icon = CONTENT_ICONS[item.type];

  return (
    <TouchableOpacity activeOpacity={0.85} style={styles.contentCard}>
      <View style={[styles.contentThumb, { backgroundColor: item.thumbnail + '33' }]}>
        <Ionicons name={icon as any} size={28} color={item.thumbnail} />
        {item.type === 'video' && (
          <View style={styles.playOverlay}>
            <Ionicons name="play-circle" size={36} color="#fff" />
          </View>
        )}
      </View>
      <View style={styles.contentInfo}>
        <View style={styles.contentTagRow}>
          <View style={[styles.contentTypeBadge, { backgroundColor: color + '22' }]}>
            <Text style={[styles.contentTypeText, { color }]}>{item.type.toUpperCase()}</Text>
          </View>
          <Text style={styles.contentTag}>{item.tag}</Text>
        </View>
        <Text style={styles.contentTitle} numberOfLines={2}>{item.title}</Text>
        <Text style={styles.contentDuration}>{item.duration}</Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  safe: { flex: 1 },
  scroll: { paddingBottom: 100 },

  header: {
    padding: Spacing.md,
    paddingBottom: 0,
  },
  sectionToggle: {
    flexDirection: 'row',
    backgroundColor: Colors.card,
    borderRadius: Radius.md,
    padding: 4,
  },
  toggleBtn: {
    flex: 1,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: Radius.sm,
  },
  toggleBtnActive: { backgroundColor: Colors.primary },
  toggleText: { ...Font.label, color: Colors.textMuted },
  toggleTextActive: { color: '#fff' },

  featuredCard: {
    margin: Spacing.md,
    marginBottom: 0,
    overflow: 'hidden',
  },
  featuredBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    gap: 12,
  },
  featuredIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: Colors.primaryFade,
    alignItems: 'center',
    justifyContent: 'center',
  },
  featuredText: { flex: 1 },
  featuredEyebrow: { ...Font.tiny, color: Colors.primary, letterSpacing: 1 },
  featuredTitle: { ...Font.h4, color: Colors.text, marginTop: 2 },
  featuredMeta: { ...Font.small, color: Colors.textSecondary, marginTop: 2 },
  playBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },

  filterScroll: { marginTop: 16 },
  filterRow: { paddingHorizontal: Spacing.md, gap: 8 },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: Radius.full,
    backgroundColor: Colors.card,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  filterChipActive: { backgroundColor: Colors.primaryFade, borderColor: Colors.primary },
  filterChipText: { ...Font.small, color: Colors.textSecondary },
  filterChipTextActive: { color: Colors.primary, fontWeight: '600' },

  contentList: { padding: Spacing.md, gap: 12 },

  contentCard: {
    flexDirection: 'row',
    backgroundColor: Colors.card,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: 'hidden',
  },
  contentThumb: {
    width: 80,
    alignItems: 'center',
    justifyContent: 'center',
  },
  playOverlay: { position: 'absolute' },
  contentInfo: { flex: 1, padding: 12, gap: 4 },
  contentTagRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  contentTypeBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  contentTypeText: { fontSize: 9, fontWeight: '700', letterSpacing: 0.5 },
  contentTag: { ...Font.tiny, color: Colors.textMuted },
  contentTitle: { ...Font.small, color: Colors.text, fontWeight: '600', lineHeight: 18 },
  contentDuration: { ...Font.tiny, color: Colors.textMuted },

  profileCard: { margin: Spacing.md, marginBottom: 0 },
  profileHeader: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  profileInfo: { flex: 1 },
  profileName: { ...Font.h3, color: Colors.text },
  profileGoal: { ...Font.body, color: Colors.primary, marginTop: 2 },
  profileJoined: { ...Font.small, color: Colors.textMuted, marginTop: 4 },

  raceCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    marginHorizontal: Spacing.md, marginTop: 12,
    backgroundColor: Colors.surface, borderRadius: Radius.md,
    borderWidth: 1, borderColor: Colors.border, padding: 14,
  },
  raceIconWrap: { width: 38, height: 38, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  raceCardLabel: { ...Font.tiny, color: Colors.textMuted, marginBottom: 2 },
  raceCardName: { ...Font.label, color: Colors.text },
  raceCardDate: { ...Font.small, color: Colors.gold, marginTop: 2 },

  settingsSection: { marginHorizontal: Spacing.md, marginTop: 20 },
  settingsSectionTitle: { ...Font.label, color: Colors.textMuted, marginBottom: 8 },
  settingsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 12,
  },
  settingsRowBorder: { borderBottomWidth: 1, borderBottomColor: Colors.border },
  settingsIcon: {
    width: 34,
    height: 34,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  settingsLabel: { ...Font.body, color: Colors.text, flex: 1 },

  soonBadge: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.full,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  soonBadgeText: { ...Font.label, color: Colors.textMuted },

  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    margin: Spacing.lg,
    marginTop: 24,
    padding: 16,
    backgroundColor: Colors.errorFade,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.error + '44',
  },
  logoutText: { ...Font.h4, color: Colors.error },
});
