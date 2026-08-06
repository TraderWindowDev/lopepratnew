import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useStore } from '@/hooks/useStore';
import { Colors, Font, Spacing, Radius } from '@/constants/theme';
import { GOAL_LABELS } from '@/constants/mock-data';
import { Card } from '@/components/ui/Card';
import { ProgressRing } from '@/components/ui/ProgressRing';
import { BarChart } from '@/components/charts/BarChart';

const { width } = Dimensions.get('window');
const CHART_W = width - Spacing.md * 2 - 32;

const WEEK_LABELS = ['W1', 'W2', 'W3', 'W4', 'W5', 'W6', 'W7', 'W8', 'W9', 'W10', 'W11', 'W12'];

export default function ProgressScreen() {
  const { athlete, athleteMilestones } = useStore();
  const [activeTab, setActiveTab] = useState<'overview' | 'milestones' | 'pbs'>('overview');

  const achievedMilestones = athleteMilestones.filter((m) => m.achieved);
  const goalProgress = athlete.complianceRate / 100;
  const hasHistory = athlete.weeklyMileageHistory.length > 0;

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.safe}>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>Fremgang</Text>
            <Text style={styles.subtitle}>{GOAL_LABELS[athlete.goal]}</Text>
          </View>

          {/* Goal progress hero */}
          <Card style={styles.goalCard} padding={20}>
            <View style={styles.goalRow}>
              <ProgressRing
                size={100}
                strokeWidth={8}
                progress={goalProgress}
                color={Colors.primary}
                label={`${Math.round(goalProgress * 100)}%`}
                sublabel="til mål"
              />
              <View style={styles.goalInfo}>
                <Text style={styles.goalLabel}>{GOAL_LABELS[athlete.goal]}</Text>
                {athlete.targetRace.name ? (
                  <>
                    <View style={styles.goalRace}>
                      <Ionicons name="flag-outline" size={14} color={Colors.gold} />
                      <Text style={styles.goalRaceName}>{athlete.targetRace.name}</Text>
                    </View>
                    {athlete.targetRace.date ? (
                      <Text style={styles.goalRaceDate}>
                        {new Date(athlete.targetRace.date).toLocaleDateString('nb-NO', {
                          month: 'long',
                          day: 'numeric',
                          year: 'numeric',
                        })}
                      </Text>
                    ) : null}
                  </>
                ) : null}
                <View style={styles.goalStreak}>
                  <Ionicons name="flame" size={14} color={Colors.primary} />
                  <Text style={styles.goalStreakText}>{athlete.streak} dagers treningsrekke</Text>
                </View>
              </View>
            </View>
          </Card>

          {/* Tab selector */}
          <View style={styles.tabs}>
            {(['overview', 'milestones', 'pbs'] as const).map((tab) => (
              <TouchableOpacity
                key={tab}
                onPress={() => setActiveTab(tab)}
                style={[styles.tab, activeTab === tab && styles.tabActive]}
              >
                <Text style={[styles.tabLabel, activeTab === tab && styles.tabLabelActive]}>
                  {tab === 'pbs' ? 'PR' : tab === 'overview' ? 'Oversikt' : 'Mål'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {activeTab === 'overview' && (
            <View style={styles.section}>
              {/* Key stats */}
              <View style={styles.statsGrid}>
                {[
                  { label: 'Etterlevelse', value: `${athlete.complianceRate}%`, icon: 'checkmark-circle-outline', color: Colors.success },
                  { label: 'Denne uken', value: `${athlete.currentWeekMileage} km`, icon: 'map-outline', color: Colors.primary },
                  { label: 'Ukentlig mål', value: `${athlete.weeklyMileageTarget} km`, icon: 'trending-up-outline', color: Colors.gold },
                  { label: 'Siden start', value: '148 dager', icon: 'calendar-outline', color: Colors.purple },
                ].map((stat) => (
                  <Card key={stat.label} style={styles.statCard} padding={14}>
                    <Ionicons name={stat.icon as any} size={20} color={stat.color} />
                    <Text style={[styles.statValue, { color: stat.color }]}>{stat.value}</Text>
                    <Text style={styles.statLabel}>{stat.label}</Text>
                  </Card>
                ))}
              </View>

              {/* Mileage chart */}
              <Card style={styles.chartCard} padding={16}>
                <Text style={styles.chartTitle}>Ukentlig kilometersum (km)</Text>
                <Text style={styles.chartSubtitle}>Siste 12 uker</Text>
                {hasHistory ? (
                  <>
                    <BarChart
                      data={athlete.weeklyMileageHistory}
                      labels={WEEK_LABELS}
                      color={Colors.primary}
                      width={CHART_W}
                      height={130}
                    />
                    <View style={styles.chartFooter}>
                      <Text style={styles.chartStat}>
                        Topp: <Text style={{ color: Colors.primary }}>{Math.max(...athlete.weeklyMileageHistory)} km</Text>
                      </Text>
                      <Text style={styles.chartStat}>
                        Snitt: <Text style={{ color: Colors.textSecondary }}>
                          {(athlete.weeklyMileageHistory.reduce((a, b) => a + b, 0) / athlete.weeklyMileageHistory.length).toFixed(0)} km
                        </Text>
                      </Text>
                    </View>
                  </>
                ) : (
                  <View style={styles.chartEmpty}>
                    <Text style={styles.chartEmptyText}>Logg løp for å se km-trenden din</Text>
                  </View>
                )}
              </Card>

            </View>
          )}

          {activeTab === 'milestones' && (
            <View style={styles.section}>
              {athleteMilestones.length === 0 ? (
                <Card style={styles.emptyCard} padding={24}>
                  <Ionicons name="trophy-outline" size={36} color={Colors.textMuted} />
                  <Text style={styles.emptyTitle}>Ingen mål ennå</Text>
                  <Text style={styles.emptySub}>Mål vises her etter hvert som du trener. Fortsett!</Text>
                </Card>
              ) : (
              <>
              <Text style={styles.sectionHeader}>
                {achievedMilestones.length}/{athleteMilestones.length} oppnådd
              </Text>
              {athleteMilestones.map((m) => (
                <Card key={m.id} style={[styles.milestoneCard, m.achieved ? styles.milestoneAchieved : undefined]} padding={16}>
                  <View style={[styles.milestoneIcon, m.achieved ? styles.milestoneIconDone : undefined]}>
                    <Ionicons
                      name={m.icon as any}
                      size={20}
                      color={m.achieved ? Colors.gold : Colors.textMuted}
                    />
                  </View>
                  <View style={styles.milestoneText}>
                    <Text style={[styles.milestoneTitle, m.achieved && styles.milestoneTitleDone]}>
                      {m.title}
                    </Text>
                    <Text style={styles.milestoneSub}>{m.description}</Text>
                    {m.achievedDate && (
                      <Text style={styles.milestoneDate}>
                        ✓ {new Date(m.achievedDate).toLocaleDateString('nb-NO', { month: 'short', day: 'numeric' })}
                      </Text>
                    )}
                  </View>
                  {m.achieved && <Ionicons name="checkmark-circle" size={22} color={Colors.gold} />}
                </Card>
              ))}
              </>
              )}
            </View>
          )}

          {activeTab === 'pbs' && (
            <View style={styles.section}>
              <Text style={styles.sectionHeader}>Personrekorder</Text>
              {athlete.personalBests.length === 0 ? (
                <Card style={styles.emptyCard} padding={24}>
                  <Ionicons name="medal-outline" size={36} color={Colors.textMuted} />
                  <Text style={styles.emptyTitle}>Ingen PR-er registrert ennå</Text>
                  <Text style={styles.emptySub}>Treneren din legger til personrekordene dine her etter løp.</Text>
                </Card>
              ) : athlete.personalBests.map((pb) => (
                <Card key={pb.distance} style={styles.pbCard} padding={16}>
                  <View>
                    <Text style={styles.pbDistance}>{pb.distance}</Text>
                    <Text style={styles.pbDate}>
                      {pb.date ? new Date(pb.date).toLocaleDateString('nb-NO', { month: 'long', year: 'numeric' }) : ''}
                    </Text>
                  </View>
                  <Text style={styles.pbTime}>{pb.time}</Text>
                </Card>
              ))}

              <Card style={styles.goalTimeCard} padding={20}>
                <View style={styles.goalTimeHeader}>
                  <Ionicons name="trophy-outline" size={20} color={Colors.gold} />
                  <Text style={styles.goalTimeTitle}>Målstid</Text>
                </View>
                <Text style={styles.goalTimeValue}>3:55:00</Text>
                <Text style={styles.goalTimeSub}>Marathon · Chicago · Oct 2026</Text>
                <View style={styles.goalTimeProgress}>
                  <View style={styles.goalTimeBar}>
                    <View style={[styles.goalTimeFill, { width: '62%' }]} />
                  </View>
                  <Text style={styles.goalTimePercent}>62 % oppnådd</Text>
                </View>
              </Card>
            </View>
          )}
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  safe: { flex: 1 },
  scroll: { paddingBottom: 100 },

  header: { padding: Spacing.md, paddingBottom: 12 },
  title: { ...Font.h2, color: Colors.text },
  subtitle: { ...Font.body, color: Colors.textSecondary, marginTop: 4 },

  goalCard: { marginHorizontal: Spacing.md, marginBottom: 16 },
  goalRow: { flexDirection: 'row', alignItems: 'center', gap: 20 },
  goalInfo: { flex: 1 },
  goalLabel: { ...Font.h4, color: Colors.text, marginBottom: 8 },
  goalRace: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 2 },
  goalRaceName: { ...Font.small, color: Colors.gold },
  goalRaceDate: { ...Font.small, color: Colors.textMuted, marginBottom: 8 },
  goalStreak: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  goalStreakText: { ...Font.small, color: Colors.textSecondary },

  tabs: {
    flexDirection: 'row',
    marginHorizontal: Spacing.md,
    backgroundColor: Colors.card,
    borderRadius: Radius.md,
    padding: 4,
    marginBottom: 20,
  },
  tab: { flex: 1, height: 36, alignItems: 'center', justifyContent: 'center', borderRadius: Radius.sm },
  tabActive: { backgroundColor: Colors.primary },
  tabLabel: { ...Font.label, color: Colors.textMuted },
  tabLabelActive: { color: '#fff' },

  section: { paddingHorizontal: Spacing.md, gap: 12 },
  sectionHeader: { ...Font.label, color: Colors.textMuted, marginBottom: 4 },

  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  statCard: { width: '47.5%', gap: 4 },
  statValue: { ...Font.h3 },
  statLabel: { ...Font.small, color: Colors.textMuted },

  chartCard: { gap: 8 },
  chartTitle: { ...Font.h4, color: Colors.text },
  chartSubtitle: { ...Font.small, color: Colors.textMuted },
  chartFooter: { flexDirection: 'row', alignItems: 'center', gap: 16, marginTop: 4 },
  chartStat: { ...Font.small, color: Colors.textMuted },
  improveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    backgroundColor: Colors.successFade,
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    marginLeft: 'auto',
  },
  improveText: { ...Font.tiny, color: Colors.success },

  runRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  runLeft: { flex: 1 },
  runDate: { ...Font.tiny, color: Colors.textMuted },
  runType: { ...Font.small, color: Colors.text, fontWeight: '600', marginTop: 2 },
  runStats: { flexDirection: 'row', gap: 14 },
  runStat: { alignItems: 'center' },
  runStatVal: { ...Font.small, color: Colors.text, fontWeight: '600' },
  runStatLabel: { ...Font.tiny, color: Colors.textMuted },
  effortDot: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  effortText: { ...Font.label, color: '#fff' },

  chartEmpty: { alignItems: 'center', paddingVertical: 24 },
  chartEmptyText: { ...Font.small, color: Colors.textMuted, textAlign: 'center' },

  emptyCard: { alignItems: 'center', gap: 10 },
  emptyTitle: { ...Font.h4, color: Colors.text },
  emptySub: { ...Font.small, color: Colors.textMuted, textAlign: 'center', lineHeight: 18 },

  milestoneCard: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  milestoneAchieved: { borderColor: Colors.gold + '44' },
  milestoneIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  milestoneIconDone: { backgroundColor: Colors.goldFade },
  milestoneText: { flex: 1 },
  milestoneTitle: { ...Font.small, color: Colors.textSecondary, fontWeight: '600' },
  milestoneTitleDone: { color: Colors.text },
  milestoneSub: { ...Font.tiny, color: Colors.textMuted, marginTop: 2 },
  milestoneDate: { ...Font.tiny, color: Colors.gold, marginTop: 4 },

  pbCard: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  pbDistance: { ...Font.h4, color: Colors.text },
  pbDate: { ...Font.small, color: Colors.textMuted, marginTop: 2 },
  pbTime: { ...Font.h3, color: Colors.primary },

  goalTimeCard: {},
  goalTimeHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  goalTimeTitle: { ...Font.h4, color: Colors.text },
  goalTimeValue: { ...Font.display, color: Colors.gold, marginBottom: 4 },
  goalTimeSub: { ...Font.small, color: Colors.textSecondary, marginBottom: 16 },
  goalTimeProgress: { gap: 8 },
  goalTimeBar: { height: 6, backgroundColor: Colors.border, borderRadius: 3, overflow: 'hidden' },
  goalTimeFill: { height: 6, backgroundColor: Colors.gold, borderRadius: 3 },
  goalTimePercent: { ...Font.small, color: Colors.gold },
});
