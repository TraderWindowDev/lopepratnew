import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useStore } from '@/hooks/useStore';
import { Colors, Font, Spacing, Radius } from '@/constants/theme';
import { Card } from '@/components/ui/Card';
import { Avatar } from '@/components/ui/Avatar';

export default function ProfilScreen() {
  const router = useRouter();
  const { athlete, logout } = useStore();

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.safe} edges={['top']}>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>

          {/* Profilkort */}
          <Card style={styles.profileCard} padding={20}>
            <View style={styles.profileHeader}>
              <Avatar initials={athlete.initials} color={athlete.avatarColor} size={64} />
              <View style={styles.profileInfo}>
                <Text style={styles.profileName}>{athlete.name}</Text>
                <Text style={styles.profileGoal}>
                  {athlete.goal.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase())}
                </Text>
                <Text style={styles.profileJoined}>
                  Ble med {new Date(athlete.joinDate).toLocaleDateString('nb-NO', { month: 'long', year: 'numeric' })}
                </Text>
              </View>
            </View>
          </Card>

          {/* Målløp */}
          <TouchableOpacity
            style={styles.raceCard}
            activeOpacity={0.8}
            onPress={() => router.push('/profile/race-calendar')}
          >
            <View style={[styles.raceIconWrap, { backgroundColor: Colors.gold + '22' }]}>
              <Ionicons name="trophy-outline" size={20} color={Colors.gold} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.raceCardLabel}>Målløp</Text>
              <Text style={styles.raceCardName} numberOfLines={1}>
                {athlete.targetRace?.name
                  ? athlete.targetRace.name
                  : 'Ikke satt — trykk for å legge til'}
              </Text>
              {athlete.targetRace?.name && athlete.targetRace?.date && (
                <Text style={styles.raceCardDate}>
                  {new Date(athlete.targetRace.date).toLocaleDateString('nb-NO', {
                    month: 'long', day: 'numeric', year: 'numeric',
                  })}
                </Text>
              )}
            </View>
            <Ionicons name="chevron-forward" size={16} color={Colors.textMuted} />
          </TouchableOpacity>

          {/* Innstillingsdelene */}
          {[
            {
              title: 'Trening',
              items: [
                { icon: 'calendar-outline', label: 'Min plan', color: Colors.primary, route: '/profile/my-plan' },
                { icon: 'flag-outline', label: 'Løpskalender', color: Colors.gold, route: '/profile/race-calendar' },
                { icon: 'settings-outline', label: 'Treningspreferanser', color: Colors.textSecondary, route: '/profile/training-preferences' },
              ],
            },
            {
              title: 'Integrasjoner',
              items: [
                { icon: 'watch-outline', label: 'Garmin', color: Colors.teal, route: null, badge: 'Snart' },
                { icon: 'bicycle-outline', label: 'Strava', color: Colors.primary, route: null, badge: 'Snart' },
                { icon: 'heart-outline', label: 'Apple Helse', color: Colors.error, route: null, badge: 'Snart' },
              ],
            },
            {
              title: 'Konto',
              items: [
                { icon: 'notifications-outline', label: 'Varsler', color: Colors.purple, route: '/profile/notifications' },
                { icon: 'shield-outline', label: 'Personvern', color: Colors.textSecondary, route: '/profile/privacy' },
                { icon: 'help-circle-outline', label: 'Hjelp og støtte', color: Colors.textSecondary, route: '/profile/help' },
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
            <Text style={styles.logoutText}>Logg ut</Text>
          </TouchableOpacity>

        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  safe: { flex: 1 },
  scroll: { paddingBottom: 100 },

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
