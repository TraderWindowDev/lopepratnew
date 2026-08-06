import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useStore } from '@/hooks/useStore';
import { Colors, Font, Spacing, Radius } from '@/constants/theme';
import { Athlete, AthleteStatus, GOAL_LABELS } from '@/constants/mock-data';
import { Avatar } from '@/components/ui/Avatar';
import { Card } from '@/components/ui/Card';

const STATUS_CONFIG: Record<AthleteStatus, { color: string; label: string; icon: string }> = {
  excellent: { color: Colors.success, label: 'Utmerket', icon: 'trending-up' },
  on_track: { color: Colors.teal, label: 'På sporet', icon: 'checkmark-circle' },
  needs_attention: { color: Colors.warning, label: 'Trenger tilsyn', icon: 'warning' },
  injured: { color: Colors.error, label: 'Skadet', icon: 'medkit' },
};

const FILTER_OPTS = ['Alle', 'Utmerket', 'På sporet', 'Trenger tilsyn'];

export default function CoachDashboard() {
  const router = useRouter();
  const { logout, coachAthletes, coachPlans, refreshCoachAthletes, refreshCoachPlans } = useStore();
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('Alle');
  const [refreshing, setRefreshing] = useState(false);

  useFocusEffect(
    useCallback(() => {
      refreshCoachAthletes();
      refreshCoachPlans();
    }, [])
  );

  async function handleRefresh() {
    setRefreshing(true);
    await Promise.all([refreshCoachAthletes(), refreshCoachPlans()]);
    setRefreshing(false);
  }

  const filtered = coachAthletes.filter((a) => {
    const matchesSearch = a.name.toLowerCase().includes(search.toLowerCase());
    const matchesFilter =
      filter === 'Alle' ||
      (filter === 'Utmerket' && a.status === 'excellent') ||
      (filter === 'På sporet' && a.status === 'on_track') ||
      (filter === 'Trenger tilsyn' && a.status === 'needs_attention');
    return matchesSearch && matchesFilter;
  });

  const alertCount = coachAthletes.filter((a) => a.alerts.length > 0).length;
  const excellentCount = coachAthletes.filter((a) => a.status === 'excellent').length;
  const avgCompliance = coachAthletes.length > 0
    ? Math.round(coachAthletes.reduce((sum, a) => sum + a.complianceRate, 0) / coachAthletes.length)
    : 0;

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.safe}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scroll}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor={Colors.primary}
            />
          }
        >
          {/* Header */}
          <View style={styles.header}>
            <View>
              <Text style={styles.eyebrow}>LOPEPRAT COACHING</Text>
              <Text style={styles.title}>Treningsverktøy</Text>
            </View>
            <TouchableOpacity
              style={styles.logoutBtn}
              onPress={() => { logout().then(() => router.replace('/(auth)')); }}
            >
              <Ionicons name="log-out-outline" size={20} color={Colors.textSecondary} />
            </TouchableOpacity>
          </View>

          {/* Summary cards */}
          <View style={styles.summaryRow}>
            <Card style={styles.summaryCard} padding={14}>
              <Text style={styles.summaryNum}>{coachAthletes.length}</Text>
              <Text style={styles.summaryLabel}>Utøvere</Text>
            </Card>
            <Card style={[styles.summaryCard, alertCount > 0 ? styles.alertCard : undefined]} padding={14}>
              <View style={styles.alertRow}>
                <Text style={[styles.summaryNum, alertCount > 0 ? { color: Colors.warning } : undefined]}>{alertCount}</Text>
                {alertCount > 0 && <Ionicons name="warning" size={14} color={Colors.warning} />}
              </View>
              <Text style={styles.summaryLabel}>Trenger tilsyn</Text>
            </Card>
            <Card style={styles.summaryCard} padding={14}>
              <Text style={[styles.summaryNum, { color: Colors.success }]}>{avgCompliance}%</Text>
              <Text style={styles.summaryLabel}>Snitt-etterlevelse</Text>
            </Card>
            <Card style={styles.summaryCard} padding={14}>
              <Text style={[styles.summaryNum, { color: Colors.gold }]}>{excellentCount}</Text>
              <Text style={styles.summaryLabel}>Utmerket</Text>
            </Card>
          </View>

          {/* Training Plans quick access */}
          <View style={styles.plansRow}>
            <TouchableOpacity
              style={styles.plansSummaryCard}
              onPress={() => router.push('/coach/plans')}
              activeOpacity={0.85}
            >
              <View style={styles.plansSummaryLeft}>
                <View style={styles.plansIcon}>
                  <Ionicons name="calendar-outline" size={20} color={Colors.primary} />
                </View>
                <View>
                  <Text style={styles.plansCount}>{coachPlans.length} treningsplan{coachPlans.length !== 1 ? 'er' : ''}</Text>
                  <Text style={styles.plansSubtitle}>
                    {coachPlans.length === 0 ? 'Ingen planer ennå' : coachPlans.slice(0, 2).map(p => p.name).join(' · ')}
                  </Text>
                </View>
              </View>
              <Ionicons name="chevron-forward" size={16} color={Colors.textMuted} />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.newPlanBtn}
              onPress={() => router.push('/coach/create-plan')}
              activeOpacity={0.85}
            >
              <Ionicons name="add" size={22} color={Colors.primary} />
              <Text style={styles.newPlanText}>Ny</Text>
            </TouchableOpacity>
          </View>

          {/* Alerts banner */}
          {alertCount > 0 && (
            <TouchableOpacity
              style={styles.alertBanner}
              onPress={() => setFilter('Trenger tilsyn')}
              activeOpacity={0.8}
            >
              <View style={styles.alertBannerLeft}>
                <Ionicons name="warning" size={18} color={Colors.warning} />
                <Text style={styles.alertBannerText}>
                  {alertCount} utøver{alertCount > 1 ? 'e' : ''} trenger kanskje tilsyn
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color={Colors.warning} />
            </TouchableOpacity>
          )}

          {/* Search & filter */}
          <View style={styles.searchRow}>
            <View style={styles.searchInput}>
              <Ionicons name="search-outline" size={18} color={Colors.textMuted} />
              <TextInput
                style={styles.searchText}
                value={search}
                onChangeText={setSearch}
                placeholder="Søk etter utøvere..."
                placeholderTextColor={Colors.textMuted}
              />
              {search.length > 0 && (
                <TouchableOpacity onPress={() => setSearch('')}>
                  <Ionicons name="close-circle" size={16} color={Colors.textMuted} />
                </TouchableOpacity>
              )}
            </View>
          </View>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.filterRow}
            style={{ marginBottom: 12 }}
          >
            {FILTER_OPTS.map((f) => (
              <TouchableOpacity
                key={f}
                style={[styles.filterChip, filter === f && styles.filterChipActive]}
                onPress={() => setFilter(f)}
              >
                <Text style={[styles.filterChipText, filter === f && styles.filterChipTextActive]}>
                  {f}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {/* Athlete list */}
          <Text style={styles.listHeader}>
            {filtered.length} utøver{filtered.length !== 1 ? 'e' : ''}
          </Text>

          <View style={styles.athleteList}>
            {filtered.map((athlete) => (
              <AthleteRow
                key={athlete.id}
                athlete={athlete}
                onPress={() => router.push(`/coach/${athlete.id}`)}
              />
            ))}
          </View>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

function AthleteRow({ athlete, onPress }: { athlete: Athlete; onPress: () => void }) {
  const status = STATUS_CONFIG[athlete.status];
  const daysUntilRace = athlete.targetRace.date
    ? Math.ceil((new Date(athlete.targetRace.date).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    : null;
  const weekProgress = athlete.currentWeekMileage / athlete.weeklyMileageTarget;

  return (
    <TouchableOpacity style={styles.athleteCard} onPress={onPress} activeOpacity={0.85}>
      <View style={styles.athleteCardLeft}>
        <Avatar initials={athlete.initials} color={athlete.avatarColor} size={46} />
      </View>

      <View style={styles.athleteCardBody}>
        <View style={styles.athleteNameRow}>
          <Text style={styles.athleteName}>{athlete.name}</Text>
          <View style={[styles.statusBadge, { backgroundColor: status.color + '22' }]}>
            <Ionicons name={status.icon as any} size={10} color={status.color} />
            <Text style={[styles.statusText, { color: status.color }]}>{status.label}</Text>
          </View>
        </View>

        <Text style={styles.athleteGoal}>
          {GOAL_LABELS[athlete.goal]}{athlete.targetRace.name ? ` · ${athlete.targetRace.name}` : ''}
        </Text>
        <Text style={styles.athleteMeta}>
          {daysUntilRace !== null ? `${daysUntilRace}d til løp · ` : ''}{athlete.complianceRate}% etterlevelse
        </Text>

        {/* Week mileage bar */}
        <View style={styles.mileageRow}>
          <View style={styles.mileageBar}>
            <View
              style={[
                styles.mileageFill,
                {
                  width: `${Math.min(weekProgress * 100, 100)}%`,
                  backgroundColor: athlete.avatarColor,
                },
              ]}
            />
          </View>
          <Text style={styles.mileageText}>
            {athlete.currentWeekMileage}/{athlete.weeklyMileageTarget}km
          </Text>
        </View>

        {athlete.alerts.length > 0 && (
          <View style={styles.alertTag}>
            <Ionicons name="alert-circle-outline" size={12} color={Colors.warning} />
            <Text style={styles.alertTagText}>{athlete.alerts[0]}</Text>
          </View>
        )}
      </View>

      <View style={styles.athleteCardRight}>
        <Text style={styles.lastActive}>{athlete.lastActive}</Text>
        {athlete.streak > 0 && (
          <View style={styles.streakBadge}>
            <Ionicons name="flame" size={10} color={Colors.primary} />
            <Text style={styles.streakText}>{athlete.streak}</Text>
          </View>
        )}
        <Ionicons name="chevron-forward" size={14} color={Colors.textMuted} style={{ marginTop: 8 }} />
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  safe: { flex: 1 },
  scroll: { paddingBottom: 100 },

  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    padding: Spacing.md,
    paddingBottom: 12,
  },
  eyebrow: { ...Font.tiny, color: Colors.primary, letterSpacing: 1.5, marginBottom: 4 },
  title: { ...Font.h2, color: Colors.text },
  logoutBtn: { padding: 8 },

  summaryRow: { flexDirection: 'row', paddingHorizontal: Spacing.md, gap: 8, marginBottom: 12 },
  summaryCard: { flex: 1, alignItems: 'center', gap: 4 },
  alertCard: { borderColor: Colors.warning + '44' },
  alertRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  summaryNum: { ...Font.h3, color: Colors.text },
  summaryLabel: { ...Font.tiny, color: Colors.textMuted, textAlign: 'center' },

  plansRow: {
    flexDirection: 'row',
    paddingHorizontal: Spacing.md,
    gap: 10,
    marginBottom: 12,
  },
  plansSummaryCard: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.card,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 10,
  },
  plansSummaryLeft: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  plansIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: Colors.primaryFade,
    alignItems: 'center',
    justifyContent: 'center',
  },
  plansCount: { ...Font.h4, color: Colors.text },
  plansSubtitle: { ...Font.tiny, color: Colors.textMuted, marginTop: 1 },
  newPlanBtn: {
    width: 60,
    backgroundColor: Colors.primaryFade,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.primary + '44',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  newPlanText: { ...Font.label, color: Colors.primary },

  alertBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginHorizontal: Spacing.md,
    marginBottom: 16,
    backgroundColor: Colors.warningFade,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.warning + '44',
    padding: 12,
  },
  alertBannerLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  alertBannerText: { ...Font.small, color: Colors.warning },

  searchRow: { paddingHorizontal: Spacing.md, marginBottom: 12 },
  searchInput: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: Colors.card,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: 14,
    height: 44,
  },
  searchText: { flex: 1, color: Colors.text, fontSize: 15 },

  filterRow: { paddingHorizontal: Spacing.md, gap: 8 },
  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: Radius.full,
    backgroundColor: Colors.card,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  filterChipActive: { backgroundColor: Colors.primaryFade, borderColor: Colors.primary },
  filterChipText: { ...Font.small, color: Colors.textSecondary },
  filterChipTextActive: { color: Colors.primary, fontWeight: '600' },

  listHeader: { ...Font.label, color: Colors.textMuted, paddingHorizontal: Spacing.md, marginBottom: 10 },
  athleteList: { paddingHorizontal: Spacing.md, gap: 10 },

  athleteCard: {
    flexDirection: 'row',
    backgroundColor: Colors.card,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 14,
    gap: 12,
  },
  athleteCardLeft: {},
  athleteCardBody: { flex: 1, gap: 4 },
  athleteNameRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  athleteName: { ...Font.h4, color: Colors.text },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  statusText: { fontSize: 10, fontWeight: '700' },
  athleteGoal: { ...Font.small, color: Colors.textSecondary },
  athleteMeta: { ...Font.tiny, color: Colors.textMuted },
  mileageRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 },
  mileageBar: { flex: 1, height: 4, backgroundColor: Colors.border, borderRadius: 2, overflow: 'hidden' },
  mileageFill: { height: 4, borderRadius: 2 },
  mileageText: { ...Font.tiny, color: Colors.textMuted, width: 64 },
  alertTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Colors.warningFade,
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 3,
    alignSelf: 'flex-start',
    marginTop: 4,
  },
  alertTagText: { ...Font.tiny, color: Colors.warning },
  athleteCardRight: { alignItems: 'flex-end', gap: 4 },
  lastActive: { ...Font.tiny, color: Colors.textMuted },
  streakBadge: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  streakText: { ...Font.tiny, color: Colors.primary, fontWeight: '700' },
});
