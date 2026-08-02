import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  SafeAreaView,
  Dimensions,
} from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useStore } from '@/hooks/useStore';
import { Colors, Font, Spacing, Radius } from '@/constants/theme';
import { WORKOUT_TYPE_LABELS, WorkoutType } from '@/constants/mock-data';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { ProgressRing } from '@/components/ui/ProgressRing';
import { Avatar } from '@/components/ui/Avatar';

const { width } = Dimensions.get('window');
const DAYS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

const WORKOUT_COLORS: Record<WorkoutType, string> = {
  easy: Colors.easy,
  tempo: Colors.tempo,
  interval: Colors.interval,
  long: Colors.long,
  rest: Colors.rest,
  race: Colors.race,
  strength: Colors.teal,
};

export default function HomeScreen() {
  const router = useRouter();
  const { athlete, weekPlan, refreshAthleteState } = useStore();
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refreshAthleteState();
    setRefreshing(false);
  }, [refreshAthleteState]);

  const today = new Date();
  const dayOfWeek = today.getDay(); // 0=Sun
  const adjustedDay = (dayOfWeek + 6) % 7; // 0=Mon

  const hasPlan = weekPlan.workouts.length > 0;
  const todayWorkout = weekPlan.workouts[adjustedDay] ?? weekPlan.workouts[0] ?? null;
  const completedCount = weekPlan.workouts.filter((w) => w.completed).length;
  const weekProgress = hasPlan ? completedCount / weekPlan.workouts.length : 0;

  const weekKmDone = weekPlan.workouts
    .filter((w) => w.completed && w.actual)
    .reduce((sum, w) => sum + (w.actual?.distance ?? 0), 0);

  const daysUntilRace = athlete.targetRace.date
    ? Math.ceil((new Date(athlete.targetRace.date).getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
    : null;

  const greeting = () => {
    const h = today.getHours();
    if (h < 12) return 'Good morning';
    if (h < 17) return 'Good afternoon';
    return 'Good evening';
  };

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.safe}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scroll}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />}
        >
          {/* Header */}
          <View style={styles.header}>
            <View>
              <Text style={styles.greeting}>{greeting()},</Text>
              <Text style={styles.name}>{athlete.name.split(' ')[0]} 👋</Text>
            </View>
            <Avatar initials={athlete.initials} color={athlete.avatarColor} size={44} />
          </View>

          {/* Today's workout hero */}
          {!hasPlan || !todayWorkout ? (
            <View style={styles.workoutHero}>
              <LinearGradient colors={[Colors.card, Colors.cardElevated]} style={styles.heroGrad}>
                <View style={[styles.accentLine, { backgroundColor: Colors.border }]} />
                <View style={[styles.heroContent, { alignItems: 'center', justifyContent: 'center', paddingVertical: 24 }]}>
                  <Ionicons name="calendar-outline" size={36} color={Colors.textMuted} />
                  <Text style={[styles.heroTitle, { textAlign: 'center', marginTop: 12 }]}>No plan yet</Text>
                  <Text style={[styles.heroSub, { textAlign: 'center' }]}>
                    Your coach will assign a training plan shortly.
                  </Text>
                </View>
              </LinearGradient>
            </View>
          ) : (
            <TouchableOpacity
              activeOpacity={0.9}
              onPress={() => router.push(`/workout/${todayWorkout.id}`)}
              style={styles.workoutHero}
            >
              <LinearGradient colors={[Colors.card, Colors.cardElevated]} style={styles.heroGrad}>
                <View style={[styles.accentLine, { backgroundColor: WORKOUT_COLORS[todayWorkout.type] }]} />
                <View style={styles.heroContent}>
                  <View style={styles.heroTop}>
                    <Badge label={WORKOUT_TYPE_LABELS[todayWorkout.type]} workoutType={todayWorkout.type} />
                    {todayWorkout.completed && (
                      <View style={styles.doneTag}>
                        <Ionicons name="checkmark-circle" size={14} color={Colors.success} />
                        <Text style={styles.doneTagText}>Done</Text>
                      </View>
                    )}
                  </View>
                  <Text style={styles.heroTitle}>{todayWorkout.title}</Text>
                  <Text style={styles.heroSub}>{todayWorkout.subtitle}</Text>
                  <View style={styles.heroMeta}>
                    {todayWorkout.targetDistance && (
                      <View style={styles.metaItem}>
                        <Ionicons name="map-outline" size={14} color={Colors.textMuted} />
                        <Text style={styles.metaText}>{todayWorkout.targetDistance} km</Text>
                      </View>
                    )}
                    {todayWorkout.targetPace && (
                      <View style={styles.metaItem}>
                        <Ionicons name="speedometer-outline" size={14} color={Colors.textMuted} />
                        <Text style={styles.metaText}>{todayWorkout.targetPace}</Text>
                      </View>
                    )}
                    {todayWorkout.steps.length > 0 && (
                      <View style={styles.metaItem}>
                        <Ionicons name="list-outline" size={14} color={Colors.textMuted} />
                        <Text style={styles.metaText}>{todayWorkout.steps.length} steps</Text>
                      </View>
                    )}
                  </View>
                  {todayWorkout.coachNote && (
                    <View style={styles.coachNoteRow}>
                      <Ionicons name="chatbubble-outline" size={12} color={Colors.primary} />
                      <Text style={styles.coachNoteText} numberOfLines={2}>
                        {todayWorkout.coachNote}
                      </Text>
                    </View>
                  )}
                </View>
                <View style={styles.heroArrow}>
                  <Ionicons name="chevron-forward" size={20} color={Colors.textMuted} />
                </View>
              </LinearGradient>
            </TouchableOpacity>
          )}

          {/* Week strip */}
          <Card style={styles.weekCard} padding={16}>
            <View style={styles.weekHeader}>
              <Text style={styles.sectionTitle}>This Week</Text>
              <Text style={styles.weekPhase}>{weekPlan.phase}</Text>
            </View>
            <View style={styles.weekDays}>
              {weekPlan.workouts.map((w, i) => {
                const isToday = i === adjustedDay;
                const color = WORKOUT_COLORS[w.type];
                return (
                  <TouchableOpacity
                    key={w.id}
                    onPress={() => router.push(`/workout/${w.id}`)}
                    activeOpacity={0.8}
                    style={styles.dayCol}
                  >
                    <Text style={[styles.dayLetter, isToday && { color: Colors.primary }]}>
                      {DAYS[i]}
                    </Text>
                    <View
                      style={[
                        styles.dayDot,
                        { borderColor: color },
                        w.completed && { backgroundColor: color },
                        isToday && styles.dayDotToday,
                        w.type === 'rest' && styles.dayDotRest,
                      ]}
                    >
                      {w.type === 'rest' && (
                        <Ionicons name="moon" size={8} color={Colors.rest} />
                      )}
                      {w.completed && w.type !== 'rest' && (
                        <Ionicons name="checkmark" size={8} color="#fff" />
                      )}
                    </View>
                    <Text style={[styles.dayType, { color }]} numberOfLines={1}>
                      {w.type === 'rest'
                        ? 'Rest'
                        : w.targetDistance
                          ? `${w.targetDistance}km`
                          : w.targetDuration
                            ? `~${w.targetDuration}m`
                            : '—'}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
            <View style={styles.weekFooter}>
              <Text style={styles.weekKm}>
                <Text style={styles.weekKmBig}>{weekKmDone.toFixed(0)}</Text>
                <Text style={styles.weekKmTarget}> / {weekPlan.totalKm} km</Text>
              </Text>
              <View style={styles.weekProgressBar}>
                <View style={[styles.weekProgressFill, { width: `${(weekKmDone / weekPlan.totalKm) * 100}%` }]} />
              </View>
            </View>
          </Card>

          {/* Stats row */}
          <View style={styles.statsRow}>
            <Card style={styles.statCard} padding={16}>
              <ProgressRing
                size={72}
                strokeWidth={6}
                progress={weekProgress}
                color={Colors.success}
                label={`${completedCount}/${weekPlan.workouts.length}`}
                sublabel="sessions"
              />
              <Text style={styles.statLabel}>Compliance</Text>
            </Card>

            <Card style={styles.statCard} padding={16}>
              <View style={styles.streakDisplay}>
                <Ionicons name="flame" size={24} color={Colors.primary} />
                <Text style={styles.streakNum}>{athlete.streak}</Text>
              </View>
              <Text style={styles.statLabel}>Day streak</Text>
            </Card>

            <Card style={styles.statCard} padding={16}>
              <View style={styles.streakDisplay}>
                <Ionicons name="calendar-outline" size={20} color={Colors.gold} />
                <Text style={[styles.streakNum, { color: Colors.gold }]}>
                  {daysUntilRace !== null ? daysUntilRace : '—'}
                </Text>
              </View>
              <Text style={styles.statLabel}>Days to race</Text>
            </Card>
          </View>

          {/* Race countdown — only shown when a race is set */}
          {athlete.targetRace.name && daysUntilRace !== null && (
            <Card style={styles.raceCard} padding={16}>
              <View style={styles.raceHeader}>
                <Ionicons name="flag" size={18} color={Colors.gold} />
                <Text style={styles.raceTitle}>{athlete.targetRace.name}</Text>
              </View>
              <View style={styles.raceMeta}>
                <Text style={styles.raceDate}>
                  {new Date(athlete.targetRace.date).toLocaleDateString('en-US', {
                    month: 'long',
                    day: 'numeric',
                    year: 'numeric',
                  })}
                </Text>
                <Text style={styles.raceLocation}>{athlete.targetRace.location}</Text>
              </View>
              <View style={styles.raceCountdown}>
                {[
                  { val: Math.floor(daysUntilRace / 7), label: 'weeks' },
                  { val: daysUntilRace % 7, label: 'days' },
                ].map((item) => (
                  <View key={item.label} style={styles.raceCountdownItem}>
                    <Text style={styles.raceCountNum}>{item.val}</Text>
                    <Text style={styles.raceCountLabel}>{item.label}</Text>
                  </View>
                ))}
              </View>
            </Card>
          )}

          {/* Quick links */}
          <View style={styles.quickLinks}>
            {[
              { icon: 'videocam-outline', label: 'Latest Video', color: Colors.purple },
              { icon: 'mic-outline', label: 'New Podcast', color: Colors.primary },
              { icon: 'document-text-outline', label: 'Training Tips', color: Colors.teal },
            ].map((item) => (
              <TouchableOpacity key={item.label} style={styles.quickLink} activeOpacity={0.8}>
                <View style={[styles.quickIcon, { backgroundColor: item.color + '22' }]}>
                  <Ionicons name={item.icon as any} size={20} color={item.color} />
                </View>
                <Text style={styles.quickLabel}>{item.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  safe: { flex: 1 },
  scroll: { paddingHorizontal: Spacing.md, paddingTop: 16, paddingBottom: 100 },

  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  greeting: { ...Font.body, color: Colors.textSecondary },
  name: { ...Font.h2, color: Colors.text, marginTop: 2 },

  workoutHero: {
    borderRadius: Radius.xl,
    overflow: 'hidden',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  heroGrad: {
    flexDirection: 'row',
    alignItems: 'stretch',
  },
  accentLine: { width: 4, borderTopLeftRadius: Radius.xl, borderBottomLeftRadius: Radius.xl },
  heroContent: { flex: 1, padding: 18 },
  heroTop: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 },
  doneTag: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  doneTagText: { ...Font.small, color: Colors.success },
  heroTitle: { ...Font.h3, color: Colors.text, marginBottom: 4 },
  heroSub: { ...Font.body, color: Colors.textSecondary, marginBottom: 12 },
  heroMeta: { flexDirection: 'row', gap: 14, marginBottom: 10, flexWrap: 'wrap' },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  metaText: { ...Font.small, color: Colors.textSecondary },
  coachNoteRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
    backgroundColor: Colors.primaryFade,
    borderRadius: Radius.sm,
    padding: 8,
  },
  coachNoteText: { ...Font.small, color: Colors.textSecondary, flex: 1, lineHeight: 18 },
  heroArrow: { padding: 18, justifyContent: 'center' },

  weekCard: { marginBottom: 16 },
  weekHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  sectionTitle: { ...Font.h4, color: Colors.text },
  weekPhase: { ...Font.label, color: Colors.primary },
  weekDays: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 14 },
  dayCol: { alignItems: 'center', gap: 6, flex: 1 },
  dayLetter: { ...Font.label, color: Colors.textMuted },
  dayDot: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayDotToday: { borderWidth: 2 },
  dayDotRest: { borderColor: Colors.border, backgroundColor: Colors.surface },
  dayType: { ...Font.tiny, textAlign: 'center' },
  weekFooter: {},
  weekKm: {},
  weekKmBig: { ...Font.h3, color: Colors.text },
  weekKmTarget: { ...Font.body, color: Colors.textMuted },
  weekProgressBar: {
    height: 4,
    backgroundColor: Colors.border,
    borderRadius: 2,
    overflow: 'hidden',
    marginTop: 8,
  },
  weekProgressFill: { height: 4, backgroundColor: Colors.primary, borderRadius: 2 },

  statsRow: { flexDirection: 'row', gap: 10, marginBottom: 16},
  statCard: { flex: 1, alignItems: 'center', gap: 8 },
  streakDisplay: { flexDirection: 'row', alignItems: 'center', gap: 4, height: 72, justifyContent: 'center' },
  streakNum: { ...Font.h1, color: Colors.primary },
  statLabel: { ...Font.label, color: Colors.textMuted },

  raceCard: { marginBottom: 16 },
  raceHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  raceTitle: { ...Font.h4, color: Colors.text },
  raceMeta: { marginBottom: 16 },
  raceDate: { ...Font.body, color: Colors.textSecondary },
  raceLocation: { ...Font.small, color: Colors.textMuted, marginTop: 2 },
  raceCountdown: { flexDirection: 'row', gap: 24 },
  raceCountdownItem: { alignItems: 'center' },
  raceCountNum: { ...Font.h1, color: Colors.gold },
  raceCountLabel: { ...Font.label, color: Colors.textMuted, marginTop: 2 },

  quickLinks: { flexDirection: 'row', gap: 10, marginBottom: 16 },
  quickLink: { flex: 1, alignItems: 'center', gap: 8 },
  quickIcon: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  quickLabel: { ...Font.tiny, color: Colors.textSecondary, textAlign: 'center' },
});
