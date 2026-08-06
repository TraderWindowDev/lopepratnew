import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useStore } from '@/hooks/useStore';
import { Colors, Font, Spacing, Radius } from '@/constants/theme';
import { Card } from '@/components/ui/Card';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { LinearGradient } from 'expo-linear-gradient';

const TYPE_COLORS: Record<string, string> = {
  easy: Colors.easy,
  tempo: Colors.tempo,
  interval: Colors.interval,
  long: Colors.long,
  rest: Colors.rest,
  race: Colors.race,
  strength: Colors.teal,
};

const DAYS = ['Man', 'Tir', 'Ons', 'Tor', 'Fre', 'Lør', 'Søn'];

export default function MyPlanScreen() {
  const router = useRouter();
  const { assignedPlan, weekPlan, viewingWeekIndex, athlete } = useStore();

  if (!assignedPlan) {
    return (
      <View style={styles.container}>
        <ScreenHeader title="Min plan" />
        <View style={styles.empty}>
          <Ionicons name="calendar-outline" size={56} color={Colors.textMuted} />
          <Text style={styles.emptyTitle}>Ingen plan tildelt</Text>
          <Text style={styles.emptySub}>Treneren din vil snart tildele en treningsplan til deg.</Text>
        </View>
      </View>
    );
  }

  const todayStr = new Date().toISOString().split('T')[0];
  const planNotStarted = !!athlete.planStartDate && athlete.planStartDate > todayStr;
  const daysUntilStart = planNotStarted
    ? Math.round((new Date(athlete.planStartDate!).getTime() - Date.now()) / 86400000)
    : 0;
  const planStartDate = athlete.planStartDate ? new Date(athlete.planStartDate) : null;

  const totalWeeks = assignedPlan.totalWeeks;
  const currentWeek = viewingWeekIndex + 1;
  const progress = currentWeek / totalWeeks;
  const currentPlanWeek = assignedPlan.weeks[viewingWeekIndex];

  return (
    <View style={styles.container}>
      <ScreenHeader title="Min plan" />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>

        {planNotStarted ? (
          <>
            {/* Countdown card */}
            <Card style={styles.heroCard} padding={20}>
              <Text style={styles.planName}>{assignedPlan.name}</Text>
              {assignedPlan.description ? (
                <Text style={styles.planDesc}>{assignedPlan.description}</Text>
              ) : null}
              <LinearGradient
                colors={[Colors.primaryFade, Colors.card]}
                style={styles.countdownBlock}
              >
                <Ionicons name="time-outline" size={28} color={Colors.primary} />
                <Text style={styles.countdownTitle}>
                  Starter om {daysUntilStart} dag{daysUntilStart === 1 ? '' : 'er'}
                </Text>
                <Text style={styles.countdownDate}>
                  {planStartDate!.toLocaleDateString('nb-NO', { weekday: 'long', day: 'numeric', month: 'long' })}
                </Text>
              </LinearGradient>
              <View style={styles.heroStats}>
                <View style={styles.heroStat}>
                  <Text style={styles.heroStatVal}>{totalWeeks}</Text>
                  <Text style={styles.heroStatLabel}>Totalt uker</Text>
                </View>
                <View style={styles.heroStatDivider} />
                <View style={styles.heroStat}>
                  <Text style={styles.heroStatVal}>{assignedPlan.weeks.reduce((s, w) => s + w.totalKm, 0)}</Text>
                  <Text style={styles.heroStatLabel}>Totalt km</Text>
                </View>
              </View>
            </Card>

            {/* Plan overview preview */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Planoversikt</Text>
              <View style={styles.weeksGrid}>
                {assignedPlan.weeks.map((_, i) => (
                  <View key={i} style={styles.weekChip}>
                    <Text style={styles.weekChipLabel}>W{i + 1}</Text>
                  </View>
                ))}
              </View>
            </View>
          </>
        ) : (
          <>
        {/* Plan hero */}
        <Card style={styles.heroCard} padding={20}>
          <View style={styles.heroTop}>
            <View style={styles.heroBadge}>
              <Ionicons name="trophy-outline" size={14} color={Colors.primary} />
              <Text style={styles.heroBadgeText}>AKTIV PLAN</Text>
            </View>
          </View>
          <Text style={styles.planName}>{assignedPlan.name}</Text>
          {assignedPlan.description ? (
            <Text style={styles.planDesc}>{assignedPlan.description}</Text>
          ) : null}

          {/* Progress bar */}
          <View style={styles.progressSection}>
            <View style={styles.progressLabelRow}>
              <Text style={styles.progressLabel}>Uke {currentWeek} av {totalWeeks}</Text>
              <Text style={styles.progressPct}>{Math.round(progress * 100)}%</Text>
            </View>
            <View style={styles.progressTrack}>
              <View style={[styles.progressFill, { width: `${progress * 100}%` as any }]} />
            </View>
          </View>

          <View style={styles.heroStats}>
            <View style={styles.heroStat}>
              <Text style={styles.heroStatVal}>{totalWeeks}</Text>
              <Text style={styles.heroStatLabel}>Totalt uker</Text>
            </View>
            <View style={styles.heroStatDivider} />
            <View style={styles.heroStat}>
              <Text style={styles.heroStatVal}>{weekPlan.totalKm}</Text>
              <Text style={styles.heroStatLabel}>Denne uken km</Text>
            </View>
            <View style={styles.heroStatDivider} />
            <View style={styles.heroStat}>
              <Text style={styles.heroStatVal}>{weekPlan.workouts.filter(w => w.completed).length}/{weekPlan.workouts.length}</Text>
              <Text style={styles.heroStatLabel}>Fullført i dag</Text>
            </View>
          </View>
        </Card>

        {/* Current week */}
        {currentPlanWeek && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Denne uken</Text>
              <View style={styles.phaseBadge}>
                <Text style={styles.phaseText}>{currentPlanWeek.phase}</Text>
              </View>
            </View>
            {currentPlanWeek.focus ? (
              <Text style={styles.focusText}>{currentPlanWeek.focus}</Text>
            ) : null}

            <Card padding={0}>
              {weekPlan.workouts.map((workout, i) => {
                const color = TYPE_COLORS[workout.type] ?? Colors.textMuted;
                return (
                  <View
                    key={workout.id}
                    style={[styles.dayRow, i < weekPlan.workouts.length - 1 && styles.dayRowBorder]}
                  >
                    <Text style={styles.dayLabel}>{DAYS[i] ?? `D${i + 1}`}</Text>
                    <View style={[styles.typeTag, { backgroundColor: color + '22' }]}>
                      <Text style={[styles.typeText, { color }]}>{workout.type.toUpperCase()}</Text>
                    </View>
                    <Text style={styles.workoutTitle} numberOfLines={1}>{workout.title}</Text>
                    <View style={styles.dayRight}>
                      {workout.targetDistance ? (
                        <Text style={styles.dayKm}>{workout.targetDistance} km</Text>
                      ) : null}
                      {workout.completed && (
                        <Ionicons name="checkmark-circle" size={18} color={Colors.success} />
                      )}
                    </View>
                  </View>
                );
              })}
            </Card>
          </View>
        )}

        {/* All weeks overview */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Planoversikt</Text>
          <View style={styles.weeksGrid}>
            {assignedPlan.weeks.map((week, i) => {
              const isActive = i === viewingWeekIndex;
              const isDone = i < viewingWeekIndex;
              return (
                <View
                  key={i}
                  style={[
                    styles.weekChip,
                    isActive && styles.weekChipActive,
                    isDone && styles.weekChipDone,
                  ]}
                >
                  <Text style={[
                    styles.weekChipLabel,
                    isActive && styles.weekChipLabelActive,
                    isDone && styles.weekChipLabelDone,
                  ]}>
                    {isDone ? '✓' : `W${i + 1}`}
                  </Text>
                </View>
              );
            })}
          </View>
        </View>

        <TouchableOpacity style={styles.viewPlanBtn} onPress={() => router.push('/(tabs)/training')}>
          <Text style={styles.viewPlanBtnText}>Åpne treningsplan</Text>
          <Ionicons name="arrow-forward" size={16} color={Colors.primary} />
        </TouchableOpacity>
          </>
        )}

      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  scroll: { paddingBottom: 40 },

  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40, gap: 12 },
  emptyTitle: { ...Font.h3, color: Colors.text },
  emptySub: { ...Font.body, color: Colors.textMuted, textAlign: 'center', lineHeight: 22 },

  heroCard: { margin: Spacing.md, marginBottom: 0, gap: 12 },
  heroTop: { flexDirection: 'row' },
  heroBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Colors.primaryFade,
    borderRadius: Radius.full,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  heroBadgeText: { ...Font.label, color: Colors.primary },
  planName: { ...Font.h3, color: Colors.text },
  planDesc: { ...Font.body, color: Colors.textSecondary, lineHeight: 20 },

  progressSection: { gap: 8 },
  progressLabelRow: { flexDirection: 'row', justifyContent: 'space-between' },
  progressLabel: { ...Font.small, color: Colors.textSecondary },
  progressPct: { ...Font.small, color: Colors.primary, fontWeight: '600' },
  progressTrack: { height: 6, backgroundColor: Colors.border, borderRadius: 3, overflow: 'hidden' },
  progressFill: { height: 6, backgroundColor: Colors.primary, borderRadius: 3 },

  countdownBlock: {
    borderRadius: Radius.md,
    padding: 20,
    alignItems: 'center',
    gap: 6,
  },
  countdownTitle: { ...Font.h3, color: Colors.text, textAlign: 'center' },
  countdownDate: { ...Font.body, color: Colors.textMuted, textAlign: 'center' },

  heroStats: { flexDirection: 'row', alignItems: 'center', paddingTop: 4 },
  heroStat: { flex: 1, alignItems: 'center', gap: 2 },
  heroStatVal: { ...Font.h3, color: Colors.text },
  heroStatLabel: { ...Font.tiny, color: Colors.textMuted },
  heroStatDivider: { width: 1, height: 28, backgroundColor: Colors.border },

  section: { marginHorizontal: Spacing.md, marginTop: 24, gap: 10 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  sectionTitle: { ...Font.h4, color: Colors.text },
  phaseBadge: {
    backgroundColor: Colors.purpleFade,
    borderRadius: Radius.full,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  phaseText: { ...Font.label, color: Colors.purple },
  focusText: { ...Font.small, color: Colors.textSecondary },

  dayRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, gap: 10 },
  dayRowBorder: { borderBottomWidth: 1, borderBottomColor: Colors.border },
  dayLabel: { ...Font.label, color: Colors.textMuted, width: 30 },
  typeTag: { borderRadius: 4, paddingHorizontal: 6, paddingVertical: 2 },
  typeText: { fontSize: 9, fontWeight: '700', letterSpacing: 0.5 },
  workoutTitle: { ...Font.small, color: Colors.text, flex: 1 },
  dayRight: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  dayKm: { ...Font.small, color: Colors.textSecondary },

  weeksGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  weekChip: {
    width: 40,
    height: 40,
    borderRadius: Radius.sm,
    backgroundColor: Colors.card,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  weekChipActive: { backgroundColor: Colors.primaryFade, borderColor: Colors.primary },
  weekChipDone: { backgroundColor: Colors.successFade, borderColor: Colors.success + '44' },
  weekChipLabel: { ...Font.label, color: Colors.textMuted },
  weekChipLabelActive: { color: Colors.primary },
  weekChipLabelDone: { color: Colors.success },

  viewPlanBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginHorizontal: Spacing.md,
    marginTop: 24,
    padding: 16,
    backgroundColor: Colors.primaryFade,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.primary + '44',
  },
  viewPlanBtnText: { ...Font.h4, color: Colors.primary },
});
