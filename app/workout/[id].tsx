import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useStore } from '@/hooks/useStore';
import { Colors, Font, Spacing, Radius } from '@/constants/theme';
import { WORKOUT_TYPE_LABELS, WorkoutType, WorkoutStep } from '@/constants/mock-data';
import { buildSubtitle, generateWorkoutSteps } from '@/lib/api/athletes';
import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';

const WORKOUT_COLORS: Record<WorkoutType, string> = {
  easy: Colors.easy,
  tempo: Colors.tempo,
  interval: Colors.interval,
  long: Colors.long,
  rest: Colors.rest,
  race: Colors.race,
  strength: Colors.teal,
};

const HR_ZONE_LABELS = ['', 'S1 Restitusjon', 'S2 Lett', 'S3 Tempo', 'S4 Terskel', 'S5 Maks'];
const HR_ZONE_COLORS = ['', Colors.rest, Colors.easy, Colors.tempo, Colors.interval, Colors.race];

export default function WorkoutDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { weekPlan, assignedPlan, logWorkout } = useStore();
  const [showLogModal, setShowLogModal] = useState(false);

  const [logDistance, setLogDistance] = useState('');
  const [logDuration, setLogDuration] = useState('');
  const [logPace, setLogPace] = useState('');
  const [logHR, setLogHR] = useState('');
  const [logEffort, setLogEffort] = useState(5);
  const [logNotes, setLogNotes] = useState('');

  // Find from current week first, then fall back to any week in assignedPlan
  let workout = weekPlan.workouts.find((w) => w.id === id);
  if (!workout && assignedPlan) {
    const m = id?.match(/^plan-w(\d+)-d(\d+)$/);
    if (m) {
      const weekIdx = parseInt(m[1]);
      const dayIdx = parseInt(m[2]);
      const day = assignedPlan.weeks[weekIdx]?.days[dayIdx];
      if (day) {
        workout = {
          id,
          date: new Date().toISOString(),
          type: day.type,
          title: day.title,
          subtitle: buildSubtitle(day),
          targetDistance: day.km,
          targetDuration: day.structuredWorkout
            ? (generateWorkoutSteps(day).reduce((s, step) => s + (step.duration ?? 0), 0) > 0
                ? Math.round(generateWorkoutSteps(day).reduce((s, step) => s + (step.duration ?? 0) * (step.repeats ?? 1), 0))
                : undefined)
            : undefined,
          targetPace: day.targetPace,
          steps: generateWorkoutSteps(day),
          completed: false,
          coachNote: day.structuredWorkout?.description || day.coachNote,
        };
      }
    }
  }

  if (!workout) {
    return (
      <View style={styles.container}>
        <SafeAreaView>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="chevron-back" size={24} color={Colors.text} />
          </TouchableOpacity>
          <Text style={styles.notFound}>Økt ikke funnet</Text>
        </SafeAreaView>
      </View>
    );
  }

  const accentColor = WORKOUT_COLORS[workout.type];

  const handleLog = () => {
    const dist = parseFloat(logDistance) || (workout.targetDistance ?? 0);
    const dur = parseInt(logDuration) || 60;

    let pace = logPace || workout.targetPace || '';
    if (!pace && dist > 0 && dur > 0) {
      const paceMinKm = dur / dist;
      const mins = Math.floor(paceMinKm);
      const secs = Math.round((paceMinKm - mins) * 60);
      pace = `${mins}:${secs.toString().padStart(2, '0')}`;
    }

    logWorkout(workout.id, {
      distance: dist,
      duration: dur,
      avgPace: pace || '—',
      avgHR: parseInt(logHR) || 150,
      elevGain: 0,
      effortRating: logEffort,
      notes: logNotes,
    });
    setShowLogModal(false);
    router.back();
  };

  function renderStep(step: WorkoutStep, depth = 0) {
    if (step.type === 'repeat' && step.steps) {
      return (
        <View key={step.id} style={[styles.stepGroup, depth > 0 && styles.stepGroupNested]}>
          <View style={styles.repeatHeader}>
            <Ionicons name="repeat" size={14} color={Colors.gold} />
            <Text style={styles.repeatLabel}>{step.repeats} × {step.description}</Text>
          </View>
          {step.steps.map((s) => renderStep(s, depth + 1))}
        </View>
      );
    }

    const stepColor = step.type === 'warmup' ? Colors.easy : step.type === 'cooldown' ? Colors.easy : accentColor;
    const hrZone = step.heartRateZone;

    return (
      <View key={step.id} style={[styles.stepRow, depth > 0 && styles.stepRowNested]}>
        <View style={[styles.stepDot, { backgroundColor: stepColor + '33', borderColor: stepColor }]}>
          <View style={[styles.stepDotInner, { backgroundColor: stepColor }]} />
        </View>
        <View style={styles.stepContent}>
          <View style={styles.stepTop}>
            <Text style={styles.stepTypeTag}>
              {step.type === 'warmup' ? 'Oppvarming' : step.type === 'cooldown' ? 'Nedkjøling' : 'Hoveddrag'}
            </Text>
            {hrZone && (
              <View style={[styles.hrBadge, { backgroundColor: HR_ZONE_COLORS[hrZone] + '22' }]}>
                <Text style={[styles.hrBadgeText, { color: HR_ZONE_COLORS[hrZone] }]}>
                  {HR_ZONE_LABELS[hrZone]}
                </Text>
              </View>
            )}
          </View>
          <Text style={styles.stepDesc}>{step.description}</Text>
          <View style={styles.stepMeta}>
            {step.distance && (
              <Text style={styles.stepMetaText}>{step.distance} km</Text>
            )}
            {step.duration && (
              <Text style={styles.stepMetaText}>{step.duration} min</Text>
            )}
            {step.pace && (
              <Text style={[styles.stepMetaText, { color: stepColor }]}>{step.pace}</Text>
            )}
          </View>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header gradient */}
      <LinearGradient
        colors={[accentColor + '33', Colors.background]}
        style={styles.headerGrad}
      />

      <SafeAreaView style={styles.safe}>
        {/* Nav bar */}
        <View style={styles.navbar}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="chevron-back" size={24} color={Colors.text} />
            <Text style={styles.backText}>Tilbake</Text>
          </TouchableOpacity>
          {!workout.completed && (
            <TouchableOpacity style={[styles.logBtn, { backgroundColor: accentColor }]} onPress={() => setShowLogModal(true)}>
              <Ionicons name="add" size={16} color="#fff" />
              <Text style={styles.logBtnText}>Registrer løp</Text>
            </TouchableOpacity>
          )}
        </View>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
          {/* Title section */}
          <View style={styles.titleSection}>
            <Badge label={WORKOUT_TYPE_LABELS[workout.type]} workoutType={workout.type} />
            <Text style={styles.title}>{workout.title}</Text>
            <Text style={styles.subtitle}>{workout.subtitle}</Text>

            {/* Key metrics */}
            <View style={styles.metricsRow}>
              {workout.targetDistance ? (
                <View style={styles.metric}>
                  <Text style={styles.metricValue}>{workout.targetDistance}</Text>
                  <Text style={styles.metricLabel}>km</Text>
                </View>
              ) : workout.targetDuration ? (
                <View style={styles.metric}>
                  <Text style={styles.metricValue}>{workout.targetDuration}</Text>
                  <Text style={styles.metricLabel}>min</Text>
                </View>
              ) : null}
              {workout.targetPace && (
                <View style={[styles.metric, (workout.targetDistance || workout.targetDuration) ? styles.metricBorder : undefined]}>
                  <Text style={[styles.metricValue, { color: accentColor }]}>{workout.targetPace}</Text>
                  <Text style={styles.metricLabel}>målpace</Text>
                </View>
              )}
              <View style={[styles.metric, (workout.targetDistance || workout.targetDuration || workout.targetPace) ? styles.metricBorder : undefined]}>
                <Text style={styles.metricValue}>{workout.steps.length || '—'}</Text>
                <Text style={styles.metricLabel}>steg</Text>
              </View>
            </View>
          </View>

          {/* Coach note */}
          {workout.coachNote && (
            <Card style={styles.coachNoteCard} padding={16}>
              <View style={styles.coachNoteHeader}>
                <View style={styles.coachIconWrap}>
                  <Ionicons name="chatbubble" size={14} color={Colors.primary} />
                </View>
                <Text style={styles.coachNoteTitle}>Trenerens notat</Text>
              </View>
              <Text style={styles.coachNoteText}>{workout.coachNote}</Text>
            </Card>
          )}

          {/* Steps */}
          {workout.steps.length > 0 && (
            <View style={styles.stepsSection}>
              <Text style={styles.sectionTitle}>Øktstruktur</Text>
              <View style={styles.stepsCard}>
                {workout.steps.map((step) => renderStep(step))}
              </View>
            </View>
          )}

          {/* Completed data */}
          {workout.completed && workout.actual && (
            <Card style={styles.completedCard} padding={16}>
              <View style={styles.completedHeader}>
                <Ionicons name="checkmark-circle" size={20} color={Colors.success} />
                <Text style={styles.completedTitle}>Fullført</Text>
              </View>
              <View style={styles.completedStats}>
                {[
                  { label: 'Distanse', value: `${workout.actual.distance.toFixed(1)} km` },
                  { label: 'Varighet', value: `${workout.actual.duration} min` },
                  { label: 'Snitt-pace', value: workout.actual.avgPace },
                  { label: 'Snitt-puls', value: `${workout.actual.avgHR} bpm` },
                ].map((s) => (
                  <View key={s.label} style={styles.completedStat}>
                    <Text style={styles.completedStatVal}>{s.value}</Text>
                    <Text style={styles.completedStatLabel}>{s.label}</Text>
                  </View>
                ))}
              </View>
              {/* Effort */}
              <View style={styles.effortRow}>
                <Text style={styles.effortLabel}>Opplevd anstrengelse</Text>
                <View style={styles.effortDots}>
                  {Array.from({ length: 10 }).map((_, i) => (
                    <View
                      key={i}
                      style={[
                        styles.effortDot,
                        i < workout.actual!.effortRating && { backgroundColor: accentColor },
                      ]}
                    />
                  ))}
                </View>
                <Text style={[styles.effortNum, { color: accentColor }]}>{workout.actual.effortRating}/10</Text>
              </View>
              {workout.actual.notes && (
                <View style={styles.notesBox}>
                  <Text style={styles.notesText}>"{workout.actual.notes}"</Text>
                </View>
              )}
            </Card>
          )}

          {/* Rest day */}
          {workout.type === 'rest' && (
            <Card style={styles.restCard} padding={24}>
              <Ionicons name="moon" size={40} color={Colors.rest} style={{ marginBottom: 12 }} />
              <Text style={styles.restTitle}>Hvil og restituer</Text>
              <Text style={styles.restSub}>
                Hviledager er når kroppen tilpasser seg. I dag: drikk nok vann, sov 8+ timer, og lett bevegelse som gåturer eller tøying er oppfordret.
              </Text>
            </Card>
          )}
        </ScrollView>
      </SafeAreaView>

      {/* Log Run Modal */}
      <Modal visible={showLogModal} animationType="slide" presentationStyle="pageSheet">
        <View style={styles.modalContainer}>
          <SafeAreaView style={{ flex: 1 }}>
            <View style={styles.modalHeader}>
              <TouchableOpacity onPress={() => setShowLogModal(false)}>
                <Ionicons name="close" size={24} color={Colors.textSecondary} />
              </TouchableOpacity>
              <Text style={styles.modalTitle}>Registrer løp</Text>
              <TouchableOpacity onPress={handleLog} style={styles.saveBtn}>
                <Text style={styles.saveBtnText}>Lagre</Text>
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={styles.modalScroll}>
              <View style={styles.modalFields}>
                {[
                  { label: 'Distanse (km)', placeholder: workout.targetDistance?.toString() ?? '—', value: logDistance, set: setLogDistance, keyboard: 'numeric' as const },
                  { label: 'Varighet (min)', placeholder: '—', value: logDuration, set: setLogDuration, keyboard: 'numeric' as const },
                  { label: 'Snitt-pace (min/km)', placeholder: workout.targetPace ?? '—', value: logPace, set: setLogPace, keyboard: 'default' as const },
                  { label: 'Snitt-puls (bpm)', placeholder: '—', value: logHR, set: setLogHR, keyboard: 'numeric' as const },
                ].map((field) => (
                  <View key={field.label}>
                    <Text style={styles.fieldLabel}>{field.label}</Text>
                    <TextInput
                      style={styles.fieldInput}
                      value={field.value}
                      onChangeText={field.set}
                      placeholder={field.placeholder}
                      placeholderTextColor={Colors.textMuted}
                      keyboardType={field.keyboard}
                    />
                  </View>
                ))}

                <View>
                  <Text style={styles.fieldLabel}>Opplevd anstrengelse (1–10)</Text>
                  <View style={styles.effortSelector}>
                    {Array.from({ length: 10 }).map((_, i) => (
                      <TouchableOpacity
                        key={i}
                        style={[styles.effortSelectorBtn, logEffort >= i + 1 && { backgroundColor: accentColor }]}
                        onPress={() => setLogEffort(i + 1)}
                      >
                        <Text style={[styles.effortSelectorText, logEffort >= i + 1 && { color: '#fff' }]}>{i + 1}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>

                <View>
                  <Text style={styles.fieldLabel}>Notater</Text>
                  <TextInput
                    style={[styles.fieldInput, { height: 80, textAlignVertical: 'top' }]}
                    value={logNotes}
                    onChangeText={setLogNotes}
                    placeholder="Hvordan føltes det?"
                    placeholderTextColor={Colors.textMuted}
                    multiline
                  />
                </View>
              </View>
            </ScrollView>
          </SafeAreaView>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  headerGrad: { position: 'absolute', top: 0, left: 0, right: 0, height: 200 },
  safe: { flex: 1 },
  notFound: { ...Font.body, color: Colors.textSecondary, padding: Spacing.md },

  navbar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  backBtn: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  backText: { ...Font.body, color: Colors.text },
  logBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: Radius.full,
  },
  logBtnText: { ...Font.small, color: '#fff', fontWeight: '600' },

  scroll: { paddingHorizontal: Spacing.md, paddingBottom: 100 },

  titleSection: { paddingVertical: 16, gap: 8 },
  title: { ...Font.h2, color: Colors.text },
  subtitle: { ...Font.body, color: Colors.textSecondary },
  metricsRow: {
    flexDirection: 'row',
    backgroundColor: Colors.card,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: 'hidden',
    marginTop: 8,
  },
  metric: { flex: 1, alignItems: 'center', paddingVertical: 16 },
  metricBorder: { borderLeftWidth: 1, borderLeftColor: Colors.border },
  metricValue: { ...Font.h3, color: Colors.text },
  metricLabel: { ...Font.tiny, color: Colors.textMuted, marginTop: 4 },

  coachNoteCard: { marginBottom: 16 },
  coachNoteHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
  coachIconWrap: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: Colors.primaryFade,
    alignItems: 'center',
    justifyContent: 'center',
  },
  coachNoteTitle: { ...Font.small, color: Colors.primary, fontWeight: '700' },
  coachNoteText: { ...Font.body, color: Colors.textSecondary, lineHeight: 24 },

  stepsSection: { marginBottom: 16 },
  sectionTitle: { ...Font.label, color: Colors.textMuted, marginBottom: 10 },
  stepsCard: {
    backgroundColor: Colors.card,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 16,
    gap: 16,
  },

  stepRow: { flexDirection: 'row', gap: 12 },
  stepRowNested: { marginLeft: 20 },
  stepDot: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
    flexShrink: 0,
  },
  stepDotInner: { width: 8, height: 8, borderRadius: 4 },
  stepContent: { flex: 1 },
  stepTop: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 2 },
  stepTypeTag: { ...Font.tiny, color: Colors.textMuted, fontWeight: '600' },
  hrBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  hrBadgeText: { fontSize: 10, fontWeight: '600' },
  stepDesc: { ...Font.body, color: Colors.text, marginBottom: 4 },
  stepMeta: { flexDirection: 'row', gap: 12 },
  stepMetaText: { ...Font.small, color: Colors.textSecondary },

  stepGroup: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 12,
    gap: 12,
  },
  stepGroupNested: { marginLeft: 20 },
  repeatHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 },
  repeatLabel: { ...Font.small, color: Colors.gold, fontWeight: '600' },

  completedCard: { marginBottom: 16 },
  completedHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 14 },
  completedTitle: { ...Font.h4, color: Colors.success },
  completedStats: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 16 },
  completedStat: { alignItems: 'center' },
  completedStatVal: { ...Font.h4, color: Colors.text },
  completedStatLabel: { ...Font.tiny, color: Colors.textMuted, marginTop: 2 },
  effortRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 },
  effortLabel: { ...Font.small, color: Colors.textSecondary },
  effortDots: { flex: 1, flexDirection: 'row', gap: 3 },
  effortDot: { flex: 1, height: 6, borderRadius: 3, backgroundColor: Colors.border },
  effortNum: { ...Font.small, fontWeight: '700' },
  notesBox: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.sm,
    padding: 12,
    borderLeftWidth: 3,
    borderLeftColor: Colors.primary,
  },
  notesText: { ...Font.body, color: Colors.textSecondary, fontStyle: 'italic' },

  restCard: { alignItems: 'center', marginBottom: 16 },
  restTitle: { ...Font.h3, color: Colors.text, marginBottom: 8 },
  restSub: { ...Font.body, color: Colors.textSecondary, textAlign: 'center', lineHeight: 24 },

  // Modal
  modalContainer: { flex: 1, backgroundColor: Colors.surface },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  modalTitle: { ...Font.h4, color: Colors.text },
  saveBtn: { paddingHorizontal: 14, paddingVertical: 6, backgroundColor: Colors.primary, borderRadius: Radius.sm },
  saveBtnText: { ...Font.small, color: '#fff', fontWeight: '700' },
  modalScroll: { padding: Spacing.md },
  modalFields: { gap: 16 },
  fieldLabel: { ...Font.label, color: Colors.textMuted, marginBottom: 6 },
  fieldInput: {
    backgroundColor: Colors.card,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: Colors.text,
    fontSize: 16,
  },
  effortSelector: { flexDirection: 'row', gap: 6 },
  effortSelectorBtn: {
    flex: 1,
    height: 36,
    borderRadius: 6,
    backgroundColor: Colors.card,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  effortSelectorText: { ...Font.small, color: Colors.textSecondary, fontWeight: '600' },
});
