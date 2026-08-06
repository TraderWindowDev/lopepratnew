import React, { useState } from 'react';
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
import { WORKOUT_TYPE_LABELS, WorkoutType, PlanDay } from '@/constants/mock-data';
import { swTotalMinutes } from '@/lib/api/athletes';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';

const DAYS_FULL = ['Mandag', 'Tirsdag', 'Onsdag', 'Torsdag', 'Fredag', 'Lørdag', 'Søndag'];
const DAYS_SHORT = ['Man', 'Tir', 'Ons', 'Tor', 'Fre', 'Lør', 'Søn'];

function parseIntervalNotes(notes: string) {
  const m = notes.match(/^(\d+)\s*[×x]\s*([\d.]+\s*(?:km|m))\s*@\s*([^·]+?)(?:\s*·\s*(.+))?$/i);
  if (!m) return null;
  return { reps: m[1], dist: m[2].trim(), pace: m[3].trim(), rec: m[4]?.trim() };
}

const WORKOUT_COLORS: Record<WorkoutType, string> = {
  easy: Colors.easy,
  tempo: Colors.tempo,
  interval: Colors.interval,
  long: Colors.long,
  rest: Colors.rest,
  race: Colors.gold,
  strength: Colors.teal,
};

export default function TrainingScreen() {
  const router = useRouter();
  const { weekPlan, assignedPlan, athlete } = useStore();
  const [selectedDay, setSelectedDay] = useState<number | null>(null);
  const [viewingWeekIdx, setViewingWeekIdx] = useState(athlete.currentPlanWeekIndex ?? 0);

  const activeWeekIdx = athlete.currentPlanWeekIndex ?? 0;
  const planComplete = !!assignedPlan && activeWeekIdx >= assignedPlan.totalWeeks;
  const isCurrentWeek = viewingWeekIdx === activeWeekIdx;
  const planWeek = assignedPlan?.weeks[viewingWeekIdx];

  const today = new Date();
  const todayStr = today.toISOString().split('T')[0];
  const planNotStarted = !!assignedPlan && !!athlete.planStartDate && athlete.planStartDate > todayStr;
  const daysUntilStart = planNotStarted
    ? Math.round((new Date(athlete.planStartDate!).getTime() - today.getTime()) / 86400000)
    : 0;
  const planStartDate = athlete.planStartDate ? new Date(athlete.planStartDate) : null;
  const todayIdx = weekPlan.workouts.findIndex((w) => w.date === todayStr);

  const totalKmDone = weekPlan.workouts
    .filter((w) => w.completed && w.actual)
    .reduce((sum, w) => sum + (w.actual?.distance ?? 0), 0);

  const weekLabel = planComplete && viewingWeekIdx >= assignedPlan!.totalWeeks
    ? 'Plan Complete'
    : planWeek
      ? `Week ${viewingWeekIdx + 1} of ${assignedPlan!.totalWeeks}`
      : `Week ${weekPlan.weekNumber}`;
  const phaseLabel = planWeek?.phase ?? weekPlan.phase;
  const focusLabel = planWeek?.focus;
  const totalKm = planWeek?.totalKm ?? weekPlan.totalKm;

  // Time-based plan: sum targetDuration from current week's workouts
  const totalPlannedMinutes = weekPlan.workouts
    .filter((w) => w.type !== 'rest')
    .reduce((sum, w) => sum + (w.targetDuration ?? 0), 0);
  const totalDoneMinutes = weekPlan.workouts
    .filter((w) => w.completed && w.actual)
    .reduce((sum, w) => sum + (w.actual?.duration ?? 0), 0);
  const isTimeBased = totalKm === 0 && totalPlannedMinutes > 0;

  const canGoPrev = assignedPlan && viewingWeekIdx > 0;
  const canGoNext = assignedPlan && viewingWeekIdx < assignedPlan.totalWeeks - 1;

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.safe}>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <Text style={styles.eyebrow}>TRENINGSPLAN</Text>
              <Text style={styles.title}>{planWeek?.phase ?? weekPlan.phase}</Text>
              {focusLabel && <Text style={styles.focus}>{focusLabel}</Text>}
            </View>
            <View style={styles.weekKmBadge}>
              <Text style={styles.weekKmNum}>
                {isTimeBased ? `~${totalPlannedMinutes}` : totalKm}
              </Text>
              <Text style={styles.weekKmLabel}>
                {isTimeBased ? 'min planlagt' : 'km planlagt'}
              </Text>
            </View>
          </View>

          {/* Week navigator */}
          {assignedPlan && (
            <View style={styles.weekNav}>
              <TouchableOpacity
                onPress={() => { setViewingWeekIdx(viewingWeekIdx - 1); setSelectedDay(null); }}
                disabled={!canGoPrev}
                style={[styles.weekNavArrow, !canGoPrev && styles.weekNavArrowDisabled]}
              >
                <Ionicons name="chevron-back" size={18} color={canGoPrev ? Colors.text : Colors.textMuted} />
              </TouchableOpacity>

              <View style={styles.weekNavCenter}>
                <Text style={styles.weekNavLabel}>{weekLabel}</Text>
                {isCurrentWeek && !planNotStarted && (
                  <View style={styles.currentWeekPill}>
                    <Text style={styles.currentWeekPillText}>NÅVÆRENDE</Text>
                  </View>
                )}
              </View>

              <TouchableOpacity
                onPress={() => { setViewingWeekIdx(viewingWeekIdx + 1); setSelectedDay(null); }}
                disabled={!canGoNext}
                style={[styles.weekNavArrow, !canGoNext && styles.weekNavArrowDisabled]}
              >
                <Ionicons name="chevron-forward" size={18} color={canGoNext ? Colors.text : Colors.textMuted} />
              </TouchableOpacity>
            </View>
          )}

          {/* Plan not started banner */}
          {planNotStarted && (
            <Card style={styles.notStartedCard} padding={20}>
              <Ionicons name="time-outline" size={32} color={Colors.primary} style={{ alignSelf: 'center', marginBottom: 10 }} />
              <Text style={styles.notStartedTitle}>
                Planen starter om {daysUntilStart} {daysUntilStart === 1 ? 'dag' : 'dager'}
              </Text>
              <Text style={styles.notStartedSub}>
                {planStartDate!.toLocaleDateString('nb-NO', { weekday: 'long', day: 'numeric', month: 'long' })}
              </Text>
            </Card>
          )}

          {/* Week progress bar — only for current active week (not when plan is complete) */}
          {isCurrentWeek && !planComplete && !planNotStarted && (
            <Card style={styles.progressCard} padding={16}>
              <View style={styles.progressRow}>
                <Text style={styles.progressLabel}>
                  {isTimeBased ? 'Ukentlig tid' : 'Ukentlig volum'}
                </Text>
                <Text style={styles.progressValue}>
                  {isTimeBased
                    ? `${totalDoneMinutes} / ~${totalPlannedMinutes} min`
                    : `${totalKmDone.toFixed(1)} / ${weekPlan.totalKm} km`}
                </Text>
              </View>
              <View style={styles.progressTrack}>
                <View
                  style={[
                    styles.progressFill,
                    {
                      width: `${isTimeBased
                        ? Math.min((totalDoneMinutes / (totalPlannedMinutes || 1)) * 100, 100)
                        : Math.min((totalKmDone / (weekPlan.totalKm || 1)) * 100, 100)}%`,
                    },
                  ]}
                />
              </View>
              <Text style={styles.sessionCountText}>
                {weekPlan.workouts.filter((w) => w.completed).length} av {weekPlan.workouts.length} økter fullført
              </Text>
            </Card>
          )}

          {/* Day selector */}
          {!planNotStarted && isCurrentWeek ? (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.dayScroll} contentContainerStyle={styles.dayScrollContent}>
              {weekPlan.workouts.map((w, i) => {
                const color = WORKOUT_COLORS[w.type];
                const isToday = i === todayIdx;
                const isSelected = selectedDay === i;
                return (
                  <TouchableOpacity
                    key={w.id}
                    onPress={() => setSelectedDay(isSelected ? null : i)}
                    activeOpacity={0.8}
                    style={[
                      styles.daySelectorItem,
                      isSelected && { borderColor: color, backgroundColor: color + '22' },
                      isToday && !isSelected && styles.dayTodayBorder,
                    ]}
                  >
                    <Text style={[styles.daySelectorShort, isSelected && { color }]}>{DAYS_SHORT[i]}</Text>
                    <View style={[styles.daySelectorDot, { borderColor: color }, w.completed && { backgroundColor: color }]}>
                      {w.completed && <Ionicons name="checkmark" size={8} color="#fff" />}
                    </View>
                    <Text style={[styles.daySelectorType, { color }]}>
                      {w.type === 'rest'
                        ? 'Hvile'
                        : w.targetDistance
                          ? `${w.targetDistance}km`
                          : w.targetDuration
                            ? `~${w.targetDuration}m`
                            : '—'}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          ) : !planNotStarted && planWeek && (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.dayScroll} contentContainerStyle={styles.dayScrollContent}>
              {planWeek.days.map((d, i) => {
                const color = WORKOUT_COLORS[d.type];
                const isSelected = selectedDay === i;
                return (
                  <TouchableOpacity
                    key={d.day}
                    onPress={() => setSelectedDay(isSelected ? null : i)}
                    activeOpacity={0.8}
                    style={[
                      styles.daySelectorItem,
                      isSelected && { borderColor: color, backgroundColor: color + '22' },
                    ]}
                  >
                    <Text style={[styles.daySelectorShort, isSelected && { color }]}>{d.day}</Text>
                    <View style={[styles.daySelectorDot, { borderColor: color }]} />
                    <Text style={[styles.daySelectorType, { color }]}>
                      {d.type === 'rest'
                        ? 'Hvile'
                        : d.km
                          ? `${d.km}km`
                          : d.structuredWorkout
                            ? `~${swTotalMinutes(d.structuredWorkout)}m`
                            : '—'}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          )}

          {/* Plan complete card */}
          {planComplete && viewingWeekIdx >= assignedPlan!.totalWeeks && (
            <View style={styles.completeCard}>
              <Ionicons name="trophy" size={40} color={Colors.gold} />
              <Text style={styles.completeTitle}>Plan fullført!</Text>
              <Text style={styles.completeSub}>
                Du fullførte alle {assignedPlan!.totalWeeks} uker av{'\n'}
                <Text style={{ color: Colors.text }}>{assignedPlan!.name}</Text>.
              </Text>
              <Text style={styles.completeHint}>
                Treneren din vil tildele neste plan. Bla gjennom tidligere uker med pilene ovenfor.
              </Text>
            </View>
          )}

          {/* Workout list */}
          {!planNotStarted && <View style={styles.workoutList}>
            {isCurrentWeek
              ? weekPlan.workouts.map((w, i) => {
                  if (selectedDay !== null && selectedDay !== i) return null;
                  const isToday = i === todayIdx;
                  const color = WORKOUT_COLORS[w.type];
                  return (
                    <TouchableOpacity
                      key={w.id}
                      onPress={() => router.push(`/workout/${w.id}`)}
                      activeOpacity={0.85}
                      style={[styles.workoutRow, isToday && styles.workoutRowToday]}
                    >
                      <View style={[styles.rowAccent, { backgroundColor: color }]} />
                      <View style={styles.rowContent}>
                        <View style={styles.rowTop}>
                          <Text style={styles.rowDay}>{DAYS_FULL[i]}</Text>
                          {isToday && (
                            <View style={styles.todayBadge}>
                              <Text style={styles.todayBadgeText}>I DAG</Text>
                            </View>
                          )}
                          {w.completed && (
                            <Ionicons name="checkmark-circle" size={16} color={Colors.success} style={{ marginLeft: 'auto' }} />
                          )}
                        </View>
                        <Text style={styles.rowTitle}>{w.title}</Text>
                        <Text style={styles.rowSub}>{w.subtitle}</Text>
                        <View style={styles.rowMeta}>
                          <Badge label={WORKOUT_TYPE_LABELS[w.type]} workoutType={w.type} />
                          {w.targetDistance && (
                            <View style={styles.rowMetaItem}>
                              <Ionicons name="map-outline" size={12} color={Colors.textMuted} />
                              <Text style={styles.rowMetaText}>{w.targetDistance} km</Text>
                            </View>
                          )}
                          {w.targetPace && (
                            <View style={styles.rowMetaItem}>
                              <Ionicons name="time-outline" size={12} color={Colors.textMuted} />
                              <Text style={styles.rowMetaText}>{w.targetPace}</Text>
                            </View>
                          )}
                        </View>
                        {w.coachNote && !w.completed && (
                          <View style={styles.coachNoteRow}>
                            <Ionicons name="chatbubble-outline" size={12} color={Colors.primary} />
                            <Text style={styles.coachNoteText} numberOfLines={2}>{w.coachNote}</Text>
                          </View>
                        )}
                        {w.actual && (
                          <View style={styles.actualRow}>
                            <Ionicons name="checkmark-circle" size={12} color={Colors.success} />
                            <Text style={styles.actualText}>
                              {w.actual.distance.toFixed(1)} km · {w.actual.avgPace} · HR {w.actual.avgHR}
                            </Text>
                          </View>
                        )}
                      </View>
                      <Ionicons name="chevron-forward" size={16} color={Colors.textMuted} style={{ alignSelf: 'center', marginRight: 12 }} />
                    </TouchableOpacity>
                  );
                })
              : planWeek?.days.map((d, i) => {
                  if (selectedDay !== null && selectedDay !== i) return null;
                  const color = WORKOUT_COLORS[d.type];
                  const workoutId = `plan-w${viewingWeekIdx}-d${i}`;
                  return (
                    <TouchableOpacity
                      key={workoutId}
                      onPress={() => router.push(`/workout/${workoutId}`)}
                      activeOpacity={0.85}
                      style={styles.workoutRow}
                    >
                      <View style={[styles.rowAccent, { backgroundColor: color }]} />
                      <View style={styles.rowContent}>
                        <View style={styles.rowTop}>
                          <Text style={styles.rowDay}>{DAYS_FULL[i] ?? d.day}</Text>
                        </View>
                        <Text style={styles.rowTitle}>{d.title}</Text>
                        <View style={styles.rowMeta}>
                          <Badge label={WORKOUT_TYPE_LABELS[d.type]} workoutType={d.type} />
                          {d.km && (
                            <View style={styles.rowMetaItem}>
                              <Ionicons name="map-outline" size={12} color={Colors.textMuted} />
                              <Text style={styles.rowMetaText}>{d.km} km</Text>
                            </View>
                          )}
                        </View>
                        {d.notes && (() => {
                          if (d.type === 'interval') {
                            const p = parseIntervalNotes(d.notes);
                            if (p) return (
                              <View style={styles.intervalRow}>
                                <View style={[styles.intervalChip, { backgroundColor: Colors.interval + '22', borderColor: Colors.interval + '55' }]}>
                                  <Text style={[styles.intervalChipText, { color: Colors.interval }]}>{p.reps} × {p.dist}</Text>
                                </View>
                                <Text style={styles.intervalPace}>@ {p.pace}</Text>
                                {p.rec && <Text style={styles.intervalRec}>· {p.rec}</Text>}
                              </View>
                            );
                          }
                          return <Text style={styles.planNotes}>{d.notes}</Text>;
                        })()}
                        {d.structuredWorkout?.description && (
                          <View style={styles.coachNoteRow}>
                            <Ionicons name="chatbubble-outline" size={12} color={Colors.primary} />
                            <Text style={styles.coachNoteText} numberOfLines={3}>
                              {d.structuredWorkout.description}
                            </Text>
                          </View>
                        )}
                      </View>
                      <Ionicons name="chevron-forward" size={16} color={Colors.textMuted} style={{ alignSelf: 'center', marginRight: 12 }} />
                    </TouchableOpacity>
                  );
                })}
          </View>}
        </ScrollView>
      </SafeAreaView>
    </View>
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
  headerLeft: { flex: 1 },
  eyebrow: { ...Font.label, color: Colors.primary, marginBottom: 4 },
  title: { ...Font.h2, color: Colors.text },
  focus: { ...Font.small, color: Colors.textSecondary, marginTop: 4 },
  weekKmBadge: { alignItems: 'flex-end' },
  weekKmNum: { ...Font.h2, color: Colors.text },
  weekKmLabel: { ...Font.small, color: Colors.textMuted },

  weekNav: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: Spacing.md,
    marginBottom: 16,
    backgroundColor: Colors.card,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 4,
  },
  weekNavArrow: { padding: 10 },
  weekNavArrowDisabled: { opacity: 0.3 },
  weekNavCenter: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  weekNavLabel: { ...Font.h4, color: Colors.text },
  currentWeekPill: {
    backgroundColor: Colors.primaryFade,
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  currentWeekPillText: { ...Font.tiny, color: Colors.primary },

  progressCard: { marginHorizontal: Spacing.md, marginBottom: 16, gap: 8 },
  progressRow: { flexDirection: 'row', justifyContent: 'space-between' },
  progressLabel: { ...Font.small, color: Colors.textSecondary },
  progressValue: { ...Font.small, color: Colors.text, fontWeight: '600' },
  progressTrack: { height: 6, backgroundColor: Colors.border, borderRadius: 3, overflow: 'hidden' },
  progressFill: { height: 6, backgroundColor: Colors.primary, borderRadius: 3 },
  sessionCountText: { ...Font.small, color: Colors.textMuted },

  dayScroll: { marginBottom: 16 },
  dayScrollContent: { paddingHorizontal: Spacing.md, gap: 10 },
  daySelectorItem: {
    alignItems: 'center',
    gap: 6,
    padding: 10,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.card,
    minWidth: 56,
  },
  dayTodayBorder: { borderColor: Colors.primary, borderWidth: 2, backgroundColor: Colors.primaryFade },
  daySelectorShort: { ...Font.label, color: Colors.textMuted },
  daySelectorDot: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  daySelectorType: { ...Font.tiny },

  completeCard: {
    marginHorizontal: Spacing.md,
    marginBottom: 16,
    alignItems: 'center',
    gap: 12,
    backgroundColor: Colors.gold + '11',
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.gold + '33',
    padding: 32,
  },
  completeTitle: { ...Font.h2, color: Colors.gold },
  completeSub: { ...Font.body, color: Colors.textSecondary, textAlign: 'center', lineHeight: 24 },
  completeHint: { ...Font.small, color: Colors.textMuted, textAlign: 'center', lineHeight: 20, marginTop: 4 },

  workoutList: { paddingHorizontal: Spacing.md, gap: 10 },
  workoutRow: {
    flexDirection: 'row',
    backgroundColor: Colors.card,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: 'hidden',
  },
  workoutRowToday: { borderColor: Colors.primary, borderWidth: 2, backgroundColor: Colors.primaryFade + '30' },
  rowAccent: { width: 4 },
  rowContent: { flex: 1, padding: 14 },
  rowTop: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  rowDay: { ...Font.label, color: Colors.textMuted },
  todayBadge: {
    backgroundColor: Colors.primary,
    borderRadius: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  todayBadgeText: { ...Font.tiny, color: '#fff', fontWeight: '700', letterSpacing: 0.5 },
  rowTitle: { ...Font.h4, color: Colors.text, marginBottom: 2 },
  rowSub: { ...Font.small, color: Colors.textSecondary, marginBottom: 10 },
  rowMeta: { flexDirection: 'row', alignItems: 'center', gap: 10, flexWrap: 'wrap' },
  rowMetaItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  rowMetaText: { ...Font.tiny, color: Colors.textMuted },
  actualRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 8,
    backgroundColor: Colors.successFade,
    borderRadius: Radius.sm,
    padding: 6,
  },
  actualText: { ...Font.tiny, color: Colors.success },
  planNotes: { ...Font.tiny, color: Colors.textSecondary, marginTop: 6, fontStyle: 'italic' },
  coachNoteRow: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 6, marginTop: 8,
    backgroundColor: Colors.primaryFade, borderRadius: Radius.sm, padding: 8,
  },
  coachNoteText: { ...Font.tiny, color: Colors.textSecondary, flex: 1, lineHeight: 16 },

  intervalRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 6, marginTop: 6 },
  intervalChip: {
    borderRadius: Radius.sm,
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  intervalChipText: { fontSize: 12, fontWeight: '700', letterSpacing: 0.3 },
  intervalPace: { ...Font.tiny, color: Colors.textSecondary },
  intervalRec: { ...Font.tiny, color: Colors.textMuted },

  notStartedCard: { alignItems: 'center', gap: 6 },
  notStartedTitle: { ...Font.h3, color: Colors.text, textAlign: 'center' },
  notStartedSub: { ...Font.body, color: Colors.textMuted, textAlign: 'center' },
});
