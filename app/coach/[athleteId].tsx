import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  TextInput,
  Dimensions,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useStore } from '@/hooks/useStore';
import { unassignPlan } from '@/lib/api/plans';
import { fetchPersonalBests, fetchAllWorkoutLogs, computeAthleteStats } from '@/lib/api/athletes';
import { fetchRaceResults, type RaceResult } from '@/lib/api/race-results';
import { Colors, Font, Spacing, Radius } from '@/constants/theme';
import { GOAL_LABELS, AthleteStatus, WorkoutType, type Athlete } from '@/constants/mock-data';
import { Avatar } from '@/components/ui/Avatar';
import { Card } from '@/components/ui/Card';
import { BarChart } from '@/components/charts/BarChart';
import { LineChart } from '@/components/charts/LineChart';

const { width } = Dimensions.get('window');
const CHART_W = width - Spacing.md * 2 - 32;

function parseIntervalNotes(notes: string) {
  const m = notes.match(/^(\d+)\s*[×x]\s*([\d.]+\s*(?:km|m))\s*@\s*([^·]+?)(?:\s*·\s*(.+))?$/i);
  if (!m) return null;
  return { reps: m[1], dist: m[2].trim(), pace: m[3].trim(), rec: m[4]?.trim() };
}

const STATUS_COLORS: Record<AthleteStatus, string> = {
  excellent: Colors.success,
  on_track: Colors.teal,
  needs_attention: Colors.warning,
  injured: Colors.error,
};

const WEEK_LABELS = ['W1', 'W2', 'W3', 'W4', 'W5', 'W6', 'W7', 'W8', 'W9', 'W10', 'W11', 'W12'];

export default function AthleteDetailScreen() {
  const { athleteId } = useLocalSearchParams<{ athleteId: string }>();
  const router = useRouter();
  const { coachAthletes, coachPlans, refreshCoachAthletes } = useStore();
  const [coachNote, setCoachNote] = useState('');
  const [activeTab, setActiveTab] = useState<'overview' | 'plan' | 'notes'>('overview');
  const [selectedPlanWeek, setSelectedPlanWeek] = useState(0);
  const [removing, setRemoving] = useState(false);

  type DetailData = {
    personalBests: Athlete['personalBests'];
    weeklyMileageHistory: number[];
    paceHistory: Athlete['paceHistory'];
    completedDays: Set<string>;
    raceResults: RaceResult[];
  };
  const [detailData, setDetailData] = useState<DetailData | null>(null);

  useEffect(() => {
    if (!athleteId) return;
    const currentAthlete = coachAthletes.find(a => a.id === athleteId);
    const planId = currentAthlete?.assignedPlanId;
    Promise.all([
      fetchPersonalBests(athleteId),
      fetchAllWorkoutLogs(athleteId),
      fetchRaceResults(athleteId),
    ]).then(([pbs, logs, raceResults]) => {
      const weekIndex = currentAthlete?.currentPlanWeekIndex ?? 0;
      const { weeklyMileageHistory, paceHistory } = computeAthleteStats(logs, weekIndex);
      const planLogs = planId ? logs.filter(l => (l as any).plan_id === planId) : [];
      const completedDays = new Set(planLogs.map(l => `${l.week_index}-${l.day_index}`));
      setDetailData({ personalBests: pbs, weeklyMileageHistory, paceHistory, completedDays, raceResults });
    }).catch((e) => console.warn('[coach detail] fetch:', e.message));
  }, [athleteId]);

  const athlete = coachAthletes.find((a) => a.id === athleteId);
  const assignedPlan = athlete?.assignedPlanId
    ? coachPlans.find((p) => p.id === athlete.assignedPlanId) ?? null
    : null;

  const planComplete = assignedPlan != null &&
    (athlete?.currentPlanWeekIndex ?? 0) >= assignedPlan.totalWeeks;

  async function handleRemovePlan() {
    Alert.alert(
      'Remove Training Plan',
      `Remove "${assignedPlan?.name}" from ${athlete?.name}? Their progress will be reset.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            setRemoving(true);
            try {
              await unassignPlan(athleteId!);
              await refreshCoachAthletes();
            } catch (e: any) {
              Alert.alert('Error', e.message ?? 'Failed to remove plan');
            } finally {
              setRemoving(false);
            }
          },
        },
      ]
    );
  }

  if (!athlete) {
    return (
      <View style={styles.container}>
        <SafeAreaView>
          <TouchableOpacity onPress={() => router.back()} style={styles.navbar}>
            <Ionicons name="chevron-back" size={24} color={Colors.text} />
          </TouchableOpacity>
          <Text style={{ color: Colors.textSecondary, padding: 16 }}>Athlete not found</Text>
        </SafeAreaView>
      </View>
    );
  }

  const statusColor = STATUS_COLORS[athlete.status];
  const daysUntilRace = Math.ceil(
    (new Date(athlete.targetRace.date).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
  );

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={[athlete.avatarColor + '22', Colors.background]}
        style={styles.headerGrad}
      />

      <SafeAreaView style={styles.safe}>
        {/* Navbar */}
        <View style={styles.navbar}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="chevron-back" size={24} color={Colors.text} />
            <Text style={styles.backText}>Athletes</Text>
          </TouchableOpacity>
          <View style={styles.navActions}>
            <TouchableOpacity style={styles.navBtn} onPress={() => router.push({ pathname: '/coach/chat-athlete', params: { athleteId } })}>
              <Ionicons name="chatbubble-outline" size={20} color={Colors.textSecondary} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.navBtn}>
              <Ionicons name="ellipsis-horizontal" size={20} color={Colors.textSecondary} />
            </TouchableOpacity>
          </View>
        </View>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
          {/* Profile header */}
          <View style={styles.profileHeader}>
            <Avatar initials={athlete.initials} color={athlete.avatarColor} size={64} />
            <View style={styles.profileInfo}>
              <Text style={styles.profileName}>{athlete.name}</Text>
              <Text style={styles.profileGoal}>{GOAL_LABELS[athlete.goal]}</Text>
              <View style={[styles.statusPill, { backgroundColor: statusColor + '22' }]}>
                <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
                <Text style={[styles.statusText, { color: statusColor }]}>
                  {athlete.status.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                </Text>
              </View>
            </View>
            <View style={styles.streakBlock}>
              <Ionicons name="flame" size={18} color={Colors.primary} />
              <Text style={styles.streakNum}>{athlete.streak}</Text>
              <Text style={styles.streakLabel}>streak</Text>
            </View>
          </View>

          {/* Alert banners */}
          {athlete.alerts.map((alert, i) => (
            <View key={i} style={styles.alertBanner}>
              <Ionicons name="warning" size={16} color={Colors.warning} />
              <Text style={styles.alertText}>{alert}</Text>
            </View>
          ))}

          {/* Quick stats */}
          <View style={styles.quickStats}>
            {[
              { label: 'Compliance', value: `${athlete.complianceRate}%`, color: athlete.complianceRate > 80 ? Colors.success : Colors.warning },
              { label: 'Days to race', value: `${daysUntilRace}`, color: Colors.gold },
              { label: 'This week', value: `${athlete.currentWeekMileage}km`, color: Colors.primary },
              { label: 'Target/week', value: `${athlete.weeklyMileageTarget}km`, color: Colors.textSecondary },
            ].map((s) => (
              <Card key={s.label} style={styles.quickStatCard} padding={12}>
                <Text style={[styles.quickStatVal, { color: s.color }]}>{s.value}</Text>
                <Text style={styles.quickStatLabel}>{s.label}</Text>
              </Card>
            ))}
          </View>

          {/* Target race */}
          <Card style={styles.raceCard} padding={16}>
            <View style={styles.raceHeader}>
              <Ionicons name="flag" size={16} color={Colors.gold} />
              <Text style={styles.raceTitle}>{athlete.targetRace.name}</Text>
            </View>
            <Text style={styles.raceMeta}>
              {new Date(athlete.targetRace.date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })} · {athlete.targetRace.location}
            </Text>
            <View style={styles.raceCountdown}>
              <View style={styles.raceCountItem}>
                <Text style={styles.raceCountNum}>{Math.floor(daysUntilRace / 7)}</Text>
                <Text style={styles.raceCountLabel}>weeks</Text>
              </View>
              <View style={styles.raceCountItem}>
                <Text style={styles.raceCountNum}>{daysUntilRace % 7}</Text>
                <Text style={styles.raceCountLabel}>days</Text>
              </View>
            </View>
          </Card>

          {/* Tab bar */}
          <View style={styles.tabs}>
            {(['overview', 'plan', 'notes'] as const).map((tab) => (
              <TouchableOpacity
                key={tab}
                style={[styles.tab, activeTab === tab && styles.tabActive]}
                onPress={() => setActiveTab(tab)}
              >
                <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>
                  {tab.charAt(0).toUpperCase() + tab.slice(1)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {activeTab === 'overview' && (
            <View style={styles.section}>
              {/* PBs */}
              <Card style={styles.pbCard} padding={16}>
                <Text style={styles.cardTitle}>Personal Bests</Text>
                {!detailData && (
                  <ActivityIndicator size="small" color={Colors.primary} style={{ marginVertical: 12 }} />
                )}
                {detailData?.personalBests.length === 0 && (
                  <Text style={styles.emptyText}>No personal bests recorded yet</Text>
                )}
                {detailData?.personalBests.map((pb) => (
                  <View key={pb.distance} style={styles.pbRow}>
                    <Text style={styles.pbDist}>{pb.distance}</Text>
                    <Text style={styles.pbTime}>{pb.time}</Text>
                    <Text style={styles.pbDate}>
                      {new Date(pb.date).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
                    </Text>
                  </View>
                ))}
              </Card>

              {/* Mileage chart */}
              <Card style={styles.chartCard} padding={16}>
                <Text style={styles.cardTitle}>Weekly Mileage (km)</Text>
                {!detailData && (
                  <ActivityIndicator size="small" color={Colors.primary} style={{ marginVertical: 12 }} />
                )}
                {detailData && detailData.weeklyMileageHistory.length === 0 && (
                  <Text style={styles.emptyText}>No workouts logged yet</Text>
                )}
                {detailData && detailData.weeklyMileageHistory.length > 0 && (
                  <BarChart
                    data={detailData.weeklyMileageHistory}
                    labels={WEEK_LABELS}
                    color={athlete.avatarColor}
                    width={CHART_W}
                    height={120}
                  />
                )}
              </Card>

              {/* Pace trend */}
              <Card style={styles.chartCard} padding={16}>
                <Text style={styles.cardTitle}>Easy Pace Trend</Text>
                {detailData && detailData.paceHistory.length === 0 && (
                  <Text style={styles.emptyText}>No pace data yet</Text>
                )}
                {detailData && detailData.paceHistory.length > 0 && (
                  <LineChart
                    data={detailData.paceHistory}
                    color={athlete.avatarColor}
                    width={CHART_W}
                    height={110}
                    inverted={true}
                  />
                )}
              </Card>

              {/* Race Results */}
              <Card style={styles.chartCard} padding={16}>
                <Text style={styles.cardTitle}>Race Results</Text>
                {!detailData && (
                  <ActivityIndicator size="small" color={Colors.primary} style={{ marginVertical: 12 }} />
                )}
                {detailData?.raceResults.length === 0 && (
                  <Text style={styles.emptyText}>No race results logged yet</Text>
                )}
                {detailData?.raceResults.map((r) => (
                  <View key={r.id} style={styles.raceResultRow}>
                    <View style={styles.raceResultLeft}>
                      <Text style={styles.raceResultName} numberOfLines={1}>{r.raceName}</Text>
                      <Text style={styles.raceResultDate}>
                        {new Date(r.raceDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                        {r.distance ? ` · ${r.distance}` : ''}
                      </Text>
                      {r.notes ? <Text style={styles.raceResultNotes} numberOfLines={2}>"{r.notes}"</Text> : null}
                    </View>
                    <View style={styles.raceResultRight}>
                      {r.finishTime ? (
                        <Text style={styles.raceResultTime}>{r.finishTime}</Text>
                      ) : null}
                      {r.categoryPlace ? (
                        <Text style={styles.raceResultPlace}>{r.categoryPlace}</Text>
                      ) : null}
                      {r.overallPlace ? (
                        <Text style={styles.raceResultOverall}>{r.overallPlace}</Text>
                      ) : null}
                    </View>
                  </View>
                ))}
              </Card>
            </View>
          )}

          {activeTab === 'plan' && (
            <View style={styles.section}>
              {assignedPlan ? (
                <>
                  {/* Plan complete banner */}
                  {planComplete && (
                    <View style={styles.planCompleteBanner}>
                      <Ionicons name="trophy" size={18} color={Colors.gold} />
                      <View style={styles.planCompleteText}>
                        <Text style={styles.planCompleteTitle}>Plan Complete!</Text>
                        <Text style={styles.planCompleteSub}>
                          {athlete.name} finished all {assignedPlan.totalWeeks} weeks. Assign a new plan to continue.
                        </Text>
                      </View>
                    </View>
                  )}

                  {/* Plan summary */}
                  <Card style={styles.planSummaryCard} padding={16}>
                    <View style={styles.planSummaryTop}>
                      <View style={styles.planSummaryLeft}>
                        <Text style={styles.planName}>{assignedPlan.name}</Text>
                        <Text style={styles.planDesc}>{assignedPlan.description}</Text>
                      </View>
                      <View style={styles.planWeekCount}>
                        <Text style={styles.planWeekCountNum}>{assignedPlan.totalWeeks}</Text>
                        <Text style={styles.planWeekCountLabel}>weeks</Text>
                      </View>
                    </View>
                    <View style={styles.planMeta}>
                      <Ionicons name="person-outline" size={12} color={Colors.textMuted} />
                      <Text style={styles.planMetaText}>Created by {assignedPlan.createdBy}</Text>
                      <View style={styles.planMetaDot} />
                      <Text style={styles.planMetaText}>
                        {planComplete ? 'Completed' : `Active week: ${(athlete.currentPlanWeekIndex ?? 0) + 1}`}
                      </Text>
                    </View>
                    <View style={styles.planActions}>
                      <TouchableOpacity
                        style={styles.changePlanBtn}
                        onPress={() => router.push(`/coach/plans?assignTo=${athleteId}`)}
                      >
                        <Ionicons name="swap-horizontal-outline" size={13} color={Colors.textMuted} />
                        <Text style={styles.changePlanBtnText}>Change plan</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.changePlanBtn}
                        onPress={() => router.push(`/coach/create-plan?planId=${assignedPlan.id}`)}
                      >
                        <Ionicons name="pencil-outline" size={13} color={Colors.primary} />
                        <Text style={[styles.changePlanBtnText, { color: Colors.primary }]}>Edit plan</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.changePlanBtn}
                        onPress={handleRemovePlan}
                        disabled={removing}
                      >
                        {removing
                          ? <ActivityIndicator size="small" color={Colors.error} />
                          : <Ionicons name="trash-outline" size={13} color={Colors.error} />
                        }
                        <Text style={[styles.changePlanBtnText, { color: Colors.error }]}>Remove</Text>
                      </TouchableOpacity>
                    </View>
                  </Card>

                  {/* Week selector */}
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.weekSelectorRow}
                  >
                    {assignedPlan.weeks.map((w, i) => {
                      const isActive = i === (athlete.currentPlanWeekIndex ?? 0);
                      const isSelected = i === selectedPlanWeek;
                      return (
                        <TouchableOpacity
                          key={i}
                          onPress={() => setSelectedPlanWeek(i)}
                          style={[
                            styles.weekTab,
                            isSelected && styles.weekTabSelected,
                            isActive && !isSelected && styles.weekTabActive,
                          ]}
                        >
                          <Text style={[styles.weekTabNum, isSelected && styles.weekTabNumSelected]}>
                            W{i + 1}
                          </Text>
                          <Text style={[styles.weekTabKm, isSelected && styles.weekTabKmSelected]}>
                            {w.totalKm}km
                          </Text>
                          {isActive && (
                            <View style={styles.weekTabActiveDot} />
                          )}
                        </TouchableOpacity>
                      );
                    })}
                  </ScrollView>

                  {/* Selected week detail */}
                  {(() => {
                    const week = assignedPlan.weeks[selectedPlanWeek];
                    const typeColors: Record<WorkoutType, string> = {
                      easy: Colors.easy,
                      tempo: Colors.tempo,
                      interval: Colors.interval,
                      long: Colors.long,
                      rest: Colors.rest,
                      race: Colors.gold,
                      strength: Colors.teal,
                    };
                    return (
                      <Card style={styles.planCard} padding={16}>
                        <View style={styles.planWeekHeader}>
                          <View>
                            <Text style={styles.cardTitle}>Week {selectedPlanWeek + 1} — {week.phase}</Text>
                            <Text style={styles.planFocus}>{week.focus}</Text>
                          </View>
                          <View style={styles.planKmBadge}>
                            <Text style={styles.planKmNum}>{week.totalKm}</Text>
                            <Text style={styles.planKmLabel}>km</Text>
                          </View>
                        </View>

                        {week.days.map((day, dayIdx) => {
                          const color = typeColors[day.type];
                          const isDone = detailData?.completedDays.has(`${selectedPlanWeek}-${dayIdx}`) ?? false;
                          return (
                            <View key={day.day} style={styles.planDay}>
                              <View style={styles.planDayLabelRow}>
                                <Text style={styles.planDayLabel}>{day.day}</Text>
                                {isDone && (
                                  <Ionicons name="checkmark-circle" size={14} color={Colors.success} />
                                )}
                              </View>
                              <View style={styles.planDayContent}>
                                <View style={[styles.planDayTag, { backgroundColor: color + '22' }]}>
                                  <Text style={[styles.planDayType, { color }]}>{day.type.toUpperCase()}</Text>
                                </View>
                                <View style={styles.planDayInfo}>
                                  <Text style={[styles.planDayTitle, isDone && styles.planDayTitleDone]}>{day.title}</Text>
                                  {day.km && (
                                    <Text style={styles.planDayKm}>{day.km} km</Text>
                                  )}
                                </View>
                              </View>
                              {day.notes && (() => {
                                if (day.type === 'interval') {
                                  const p = parseIntervalNotes(day.notes);
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
                                return <Text style={styles.planDayNotes}>{day.notes}</Text>;
                              })()}
                            </View>
                          );
                        })}

                        <TouchableOpacity style={styles.assignBtn}>
                          <Ionicons name="send-outline" size={14} color={Colors.primary} />
                          <Text style={styles.assignBtnText}>Push Week {selectedPlanWeek + 1} to athlete</Text>
                        </TouchableOpacity>
                      </Card>
                    );
                  })()}
                </>
              ) : (
                <Card style={styles.noPlanCard} padding={24}>
                  <Ionicons name="calendar-outline" size={32} color={Colors.textMuted} />
                  <Text style={styles.noPlanTitle}>No plan assigned</Text>
                  <Text style={styles.noPlanSub}>Assign an existing plan or create a new one for this athlete.</Text>
                  <TouchableOpacity
                    style={styles.assignBtn}
                    onPress={() => router.push(`/coach/plans?assignTo=${athleteId}`)}
                  >
                    <Ionicons name="add-circle-outline" size={14} color={Colors.primary} />
                    <Text style={styles.assignBtnText}>Assign Plan</Text>
                  </TouchableOpacity>
                </Card>
              )}
            </View>
          )}

          {activeTab === 'notes' && (
            <View style={styles.section}>
              <Card style={styles.noteCard} padding={16}>
                <Text style={styles.cardTitle}>Coaching Notes</Text>
                <Text style={styles.existingNote}>{athlete.coachNote}</Text>
                <View style={styles.noteMeta}>
                  <Text style={styles.noteMetaText}>Last updated · Today</Text>
                </View>
              </Card>

              <Card style={styles.addNoteCard} padding={16}>
                <Text style={styles.fieldLabel}>Add note</Text>
                <TextInput
                  style={styles.noteInput}
                  value={coachNote}
                  onChangeText={setCoachNote}
                  placeholder="Session observation, plan change, conversation note..."
                  placeholderTextColor={Colors.textMuted}
                  multiline
                  numberOfLines={4}
                />
                <TouchableOpacity
                  style={[styles.saveNoteBtn, !coachNote.trim() && styles.saveNoteBtnDisabled]}
                  disabled={!coachNote.trim()}
                  onPress={() => setCoachNote('')}
                >
                  <Text style={styles.saveNoteBtnText}>Save Note</Text>
                </TouchableOpacity>
              </Card>

              {/* Quick templates */}
              <Text style={styles.templatesTitle}>Quick templates</Text>
              {[
                'Great session — ahead of target 💪',
                'Ease up next week — monitor fatigue',
                'Ready to test a faster tempo pace',
                'Schedule check-in call this week',
              ].map((t) => (
                <TouchableOpacity
                  key={t}
                  style={styles.templateBtn}
                  onPress={() => setCoachNote(t)}
                >
                  <Text style={styles.templateText}>{t}</Text>
                  <Ionicons name="add-circle-outline" size={16} color={Colors.primary} />
                </TouchableOpacity>
              ))}
            </View>
          )}
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  headerGrad: { position: 'absolute', top: 0, left: 0, right: 0, height: 220 },
  safe: { flex: 1 },
  scroll: { paddingBottom: 80 },

  navbar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  backBtn: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  backText: { ...Font.body, color: Colors.text },
  navActions: { flexDirection: 'row', gap: 8 },
  navBtn: { padding: 6 },

  profileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingHorizontal: Spacing.md,
    paddingBottom: 16,
  },
  profileInfo: { flex: 1 },
  profileName: { ...Font.h3, color: Colors.text },
  profileGoal: { ...Font.small, color: Colors.textSecondary, marginTop: 2, marginBottom: 8 },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: Radius.full,
  },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  statusText: { ...Font.tiny, fontWeight: '700' },
  streakBlock: { alignItems: 'center', gap: 2 },
  streakNum: { ...Font.h3, color: Colors.primary },
  streakLabel: { ...Font.tiny, color: Colors.textMuted },

  alertBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginHorizontal: Spacing.md,
    marginBottom: 8,
    backgroundColor: Colors.warningFade,
    borderRadius: Radius.sm,
    borderWidth: 1,
    borderColor: Colors.warning + '44',
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  alertText: { ...Font.small, color: Colors.warning, flex: 1 },

  quickStats: { flexDirection: 'row', gap: 8, paddingHorizontal: Spacing.md, marginBottom: 12 },
  quickStatCard: { flex: 1, alignItems: 'center', gap: 4 },
  quickStatVal: { ...Font.h4 },
  quickStatLabel: { ...Font.tiny, color: Colors.textMuted, textAlign: 'center' },

  raceCard: { marginHorizontal: Spacing.md, marginBottom: 16 },
  raceHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  raceTitle: { ...Font.h4, color: Colors.text },
  raceMeta: { ...Font.small, color: Colors.textSecondary, marginBottom: 12 },
  raceCountdown: { flexDirection: 'row', gap: 24 },
  raceCountItem: { alignItems: 'center' },
  raceCountNum: { ...Font.h2, color: Colors.gold },
  raceCountLabel: { ...Font.label, color: Colors.textMuted },

  tabs: {
    flexDirection: 'row',
    marginHorizontal: Spacing.md,
    marginBottom: 16,
    backgroundColor: Colors.card,
    borderRadius: Radius.md,
    padding: 4,
  },
  tab: { flex: 1, height: 36, alignItems: 'center', justifyContent: 'center', borderRadius: Radius.sm },
  tabActive: { backgroundColor: Colors.primary },
  tabText: { ...Font.label, color: Colors.textMuted },
  tabTextActive: { color: '#fff' },

  section: { paddingHorizontal: Spacing.md, gap: 12 },

  pbCard: {},
  cardTitle: { ...Font.h4, color: Colors.text, marginBottom: 12 },
  pbRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: Colors.border },
  pbDist: { ...Font.body, color: Colors.textSecondary, flex: 1 },
  pbTime: { ...Font.h4, color: Colors.primary },
  pbDate: { ...Font.small, color: Colors.textMuted, width: 80, textAlign: 'right' },

  chartCard: { gap: 8 },

  planSummaryCard: { gap: 10 },
  planSummaryTop: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  planSummaryLeft: { flex: 1, gap: 4 },
  planName: { ...Font.h4, color: Colors.text },
  planDesc: { ...Font.small, color: Colors.textSecondary, lineHeight: 18 },
  planWeekCount: { alignItems: 'center', backgroundColor: Colors.primaryFade, borderRadius: Radius.sm, paddingHorizontal: 10, paddingVertical: 6 },
  planWeekCountNum: { ...Font.h3, color: Colors.primary },
  planWeekCountLabel: { ...Font.tiny, color: Colors.primary },
  planMeta: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  planMetaText: { ...Font.tiny, color: Colors.textMuted },
  planMetaDot: { width: 3, height: 3, borderRadius: 1.5, backgroundColor: Colors.border },

  weekSelectorRow: { paddingHorizontal: Spacing.md, gap: 8, marginBottom: 4 },
  weekTab: {
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.card,
    minWidth: 60,
    gap: 2,
  },
  weekTabSelected: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  weekTabActive: { borderColor: Colors.primary + '66' },
  weekTabNum: { ...Font.small, color: Colors.text, fontWeight: '700' },
  weekTabNumSelected: { color: '#fff' },
  weekTabKm: { ...Font.tiny, color: Colors.textMuted },
  weekTabKmSelected: { color: 'rgba(255,255,255,0.8)' },
  weekTabActiveDot: { width: 4, height: 4, borderRadius: 2, backgroundColor: Colors.primary, marginTop: 2 },

  planCard: { gap: 12 },
  planWeekHeader: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 4 },
  planFocus: { ...Font.small, color: Colors.textSecondary, marginTop: 2 },
  planKmBadge: { alignItems: 'center' },
  planKmNum: { ...Font.h3, color: Colors.gold },
  planKmLabel: { ...Font.tiny, color: Colors.textMuted },

  emptyText: { ...Font.small, color: Colors.textMuted, fontStyle: 'italic', marginVertical: 8 },

  raceResultRow: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 12,
    paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  raceResultLeft: { flex: 1, gap: 2 },
  raceResultName: { ...Font.label, color: Colors.text },
  raceResultDate: { ...Font.tiny, color: Colors.textMuted },
  raceResultNotes: { ...Font.tiny, color: Colors.textMuted, fontStyle: 'italic', marginTop: 2 },
  raceResultRight: { alignItems: 'flex-end', gap: 2 },
  raceResultTime: { ...Font.h4, color: Colors.gold },
  raceResultPlace: { ...Font.small, color: Colors.textSecondary },
  raceResultOverall: { ...Font.tiny, color: Colors.textMuted },

  planDay: { borderBottomWidth: 1, borderBottomColor: Colors.border, paddingVertical: 8, gap: 4 },
  planDayLabelRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 },
  planDayLabel: { ...Font.label, color: Colors.textMuted },
  planDayTitleDone: { color: Colors.textMuted },
  planDayContent: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  planDayTag: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  planDayType: { ...Font.tiny, fontWeight: '700' },
  planDayInfo: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  planDayTitle: { ...Font.small, color: Colors.text },
  planDayKm: { ...Font.small, color: Colors.textSecondary },
  planDayNotes: { ...Font.tiny, color: Colors.textMuted, fontStyle: 'italic', paddingLeft: 0 },

  intervalRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 6, marginTop: 5 },
  intervalChip: { borderRadius: 4, borderWidth: 1, paddingHorizontal: 8, paddingVertical: 3 },
  intervalChipText: { fontSize: 12, fontWeight: '700', letterSpacing: 0.3 },
  intervalPace: { ...Font.tiny, color: Colors.textSecondary },
  intervalRec: { ...Font.tiny, color: Colors.textMuted },

  planCompleteBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    backgroundColor: Colors.gold + '18',
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.gold + '44',
    padding: 14,
  },
  planCompleteText: { flex: 1, gap: 3 },
  planCompleteTitle: { ...Font.body, color: Colors.gold, fontWeight: '700' },
  planCompleteSub: { ...Font.small, color: Colors.textSecondary, lineHeight: 18 },

  planActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    marginTop: 4,
  },
  changePlanBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  changePlanBtnText: { ...Font.tiny, color: Colors.textMuted },

  assignBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: Colors.primaryFade,
    borderRadius: Radius.sm,
    padding: 12,
    borderWidth: 1,
    borderColor: Colors.primary + '44',
    marginTop: 4,
  },
  assignBtnText: { ...Font.small, color: Colors.primary, fontWeight: '600' },

  noPlanCard: { alignItems: 'center', gap: 8 },
  noPlanTitle: { ...Font.h4, color: Colors.text, marginTop: 4 },
  noPlanSub: { ...Font.small, color: Colors.textSecondary, textAlign: 'center', marginBottom: 8 },

  noteCard: {},
  existingNote: { ...Font.body, color: Colors.textSecondary, lineHeight: 24, marginBottom: 12 },
  noteMeta: {},
  noteMetaText: { ...Font.tiny, color: Colors.textMuted },

  addNoteCard: { gap: 12 },
  fieldLabel: { ...Font.label, color: Colors.textMuted },
  noteInput: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 12,
    color: Colors.text,
    fontSize: 15,
    minHeight: 100,
    textAlignVertical: 'top',
  },
  saveNoteBtn: {
    backgroundColor: Colors.primary,
    borderRadius: Radius.sm,
    padding: 12,
    alignItems: 'center',
  },
  saveNoteBtnDisabled: { opacity: 0.4 },
  saveNoteBtnText: { ...Font.small, color: '#fff', fontWeight: '700' },

  templatesTitle: { ...Font.label, color: Colors.textMuted, paddingHorizontal: 0, marginTop: 4 },
  templateBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.card,
    borderRadius: Radius.sm,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  templateText: { ...Font.small, color: Colors.textSecondary, flex: 1 },
});
