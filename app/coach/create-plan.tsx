import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  TextInput,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Font, Spacing, Radius } from '@/constants/theme';
import { GOAL_LABELS, type GoalType, type WorkoutType } from '@/constants/mock-data';
import { createPlan, updatePlan, assignPlan } from '@/lib/api/plans';
import { useStore } from '@/hooks/useStore';
import { Card } from '@/components/ui/Card';
import { WorkoutBuilderModal, type StructuredWorkout, type ActivityType } from '@/components/workout/WorkoutBuilderModal';

const GOALS: { value: GoalType; label: string }[] = [
  { value: 'first_5k', label: 'First 5K' },
  { value: 'first_10k', label: 'First 10K' },
  { value: 'first_half', label: 'First Half Marathon' },
  { value: 'first_marathon', label: 'First Marathon' },
  { value: 'pb_half', label: 'Half Marathon PB' },
  { value: 'pb_marathon', label: 'Marathon PB' },
];

const WORKOUT_TYPES: { value: WorkoutType; label: string; color: string }[] = [
  { value: 'rest', label: 'Rest', color: Colors.rest },
  { value: 'easy', label: 'Easy', color: Colors.easy },
  { value: 'long', label: 'Long', color: Colors.long },
  { value: 'tempo', label: 'Tempo', color: Colors.tempo },
  { value: 'interval', label: 'Interval', color: Colors.interval },
  { value: 'strength', label: 'Strength', color: Colors.teal },
];

const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

type DayState = {
  type: WorkoutType;
  title: string;
  km: string;
  notes: string;
  targetPace: string;
  coachNote: string;
  structuredWorkout?: StructuredWorkout;
};

type WeekState = {
  phase: string;
  focus: string;
  days: DayState[];
};

function makeDefaultDay(_i: number): DayState {
  return {
    type: 'rest',
    title: 'Rest',
    km: '',
    notes: '',
    targetPace: '',
    coachNote: '',
  };
}

function makeDefaultWeek(i: number): WeekState {
  return {
    phase: i === 0 ? 'Base Building' : i === 1 ? 'Development' : i === 2 ? 'Peak' : 'Taper',
    focus: '',
    days: DAY_LABELS.map((_, di) => makeDefaultDay(di)),
  };
}

export default function CreatePlanScreen() {
  const router = useRouter();
  const { assignTo, planId: editPlanId } = useLocalSearchParams<{ assignTo?: string; planId?: string }>();
  const { refreshCoachPlans, coachAthletes, coachPlans } = useStore();
  const athlete = assignTo ? coachAthletes.find((a) => a.id === assignTo) : null;
  const editPlan = editPlanId ? coachPlans.find((p) => p.id === editPlanId) ?? null : null;

  // Step 0 = meta, 1..numWeeks = week editor, last = saving
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  // Plan meta — pre-populate from existing plan when editing
  const [name, setName] = useState(editPlan?.name ?? '');
  const [description, setDescription] = useState(editPlan?.description ?? '');
  const [goal, setGoal] = useState<GoalType | null>((editPlan?.targetGoal as GoalType) ?? null);
  const [numWeeks, setNumWeeks] = useState(editPlan?.totalWeeks ?? 4);

  // Week data — pre-populated from existing plan when editing
  const [weeks, setWeeks] = useState<WeekState[]>(() => {
    if (!editPlan) return [];
    return editPlan.weeks.map((w) => ({
      phase: w.phase,
      focus: w.focus ?? '',
      days: w.days.map((d) => ({
        type: d.type,
        title: d.title,
        km: d.km != null ? String(d.km) : '',
        notes: d.notes ?? '',
        targetPace: d.targetPace ?? '',
        coachNote: d.coachNote ?? '',
        structuredWorkout: d.structuredWorkout,
      })),
    }));
  });

  const totalSteps = numWeeks + 1; // 0 = meta, 1..N = weeks

  function getWeek(i: number): WeekState {
    return weeks[i] ?? makeDefaultWeek(i);
  }

  function updateWeek(i: number, patch: Partial<WeekState>) {
    setWeeks((prev) => {
      const next = [...prev];
      next[i] = { ...getWeek(i), ...patch };
      return next;
    });
  }

  function updateDay(weekI: number, dayI: number, patch: Partial<DayState>) {
    const week = getWeek(weekI);
    const newDays = [...week.days];
    newDays[dayI] = { ...newDays[dayI], ...patch };
    updateWeek(weekI, { days: newDays });
  }

  function weekTotalKm(weekI: number): number {
    return getWeek(weekI).days.reduce((sum, d) => sum + (parseFloat(d.km) || 0), 0);
  }

  async function handleSave() {
    setSaving(true);
    setError('');
    try {
      const planInput = {
        name: name.trim(),
        description: description.trim(),
        totalWeeks: numWeeks,
        targetGoal: goal,
        weeks: Array.from({ length: numWeeks }, (_, wi) => {
          const w = getWeek(wi);
          return {
            weekIndex: wi,
            phase: w.phase || `Week ${wi + 1}`,
            focus: w.focus,
            totalKm: weekTotalKm(wi),
            days: w.days.map((d, di) => ({
              dayIndex: di,
              dayLabel: DAY_LABELS[di],
              workoutType: d.type,
              title: d.title || DAY_LABELS[di],
              km: parseFloat(d.km) || undefined,
              notes: d.structuredWorkout
                ? `__sw__${JSON.stringify(d.structuredWorkout)}`
                : (d.notes || undefined),
              targetPace: d.targetPace || undefined,
              coachNote: d.coachNote || undefined,
            })),
          };
        }),
      };

      if (editPlanId) {
        await updatePlan(editPlanId, planInput);
      } else {
        const planId = await createPlan(planInput);
        if (assignTo) {
          await assignPlan(assignTo, planId);
        }
      }

      await refreshCoachPlans();
      router.back();
      if (assignTo) router.back(); // pop plans screen too
    } catch (e: any) {
      setError(e.message ?? 'Failed to save plan');
      setSaving(false);
    }
  }

  // ── Render ────────────────────────────────────────────────────────────

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <SafeAreaView style={styles.safe}>
        {/* Navbar */}
        <View style={styles.navbar}>
          <TouchableOpacity
            onPress={() => (step === 0 ? router.back() : setStep(step - 1))}
            style={styles.backBtn}
          >
            <Ionicons name="chevron-back" size={24} color={Colors.text} />
            <Text style={styles.backText}>{step === 0 ? 'Cancel' : 'Back'}</Text>
          </TouchableOpacity>
          <Text style={styles.navTitle}>
            {step === 0 ? (editPlanId ? 'Edit Plan' : 'New Plan') : `Week ${step} of ${numWeeks}`}
          </Text>
          <View style={styles.navRight}>
            {step < totalSteps - 1 ? (
              <TouchableOpacity
                style={[styles.nextBtn, step === 0 && !name.trim() && styles.nextBtnDisabled]}
                disabled={step === 0 && !name.trim()}
                onPress={() => setStep(step + 1)}
              >
                <Text style={styles.nextBtnText}>
                  {step === totalSteps - 2 ? 'Review' : 'Next'}
                </Text>
                <Ionicons name="chevron-forward" size={16} color={Colors.primary} />
              </TouchableOpacity>
            ) : (
              <View style={{ width: 70 }} />
            )}
          </View>
        </View>

        {/* Step indicator */}
        <View style={styles.stepRow}>
          {Array.from({ length: totalSteps }, (_, i) => (
            <View
              key={i}
              style={[
                styles.stepDot,
                i < step && styles.stepDone,
                i === step && styles.stepCurrent,
              ]}
            />
          ))}
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
        >
          {step === 0 && (
            <MetaStep
              name={name}
              description={description}
              goal={goal}
              numWeeks={numWeeks}
              athlete={athlete?.name}
              onName={setName}
              onDescription={setDescription}
              onGoal={setGoal}
              onNumWeeks={setNumWeeks}
            />
          )}

          {step > 0 && step <= numWeeks && (
            <WeekStep
              weekIndex={step - 1}
              week={getWeek(step - 1)}
              totalKm={weekTotalKm(step - 1)}
              onUpdate={(patch) => updateWeek(step - 1, patch)}
              onDayUpdate={(di, patch) => updateDay(step - 1, di, patch)}
            />
          )}

          {step === totalSteps - 1 && step > numWeeks && (
            // shouldn't reach here, but just in case
            null
          )}

          {/* Review & save (after last week step) */}
          {step === numWeeks && (
            <View style={styles.reviewSection}>
              <Card style={styles.reviewCard} padding={16}>
                <Text style={styles.reviewTitle}>Plan Summary</Text>
                <Text style={styles.reviewName}>{name}</Text>
                {description ? <Text style={styles.reviewDesc}>{description}</Text> : null}
                <View style={styles.reviewMeta}>
                  <Text style={styles.reviewMetaText}>{numWeeks} weeks{goal ? ` · ${GOAL_LABELS[goal]}` : ''}</Text>
                  <Text style={styles.reviewMetaText}>
                    {Array.from({ length: numWeeks }, (_, i) => weekTotalKm(i))
                      .reduce((a, b) => a + b, 0)
                      .toFixed(0)} km total
                  </Text>
                </View>
              </Card>

              {assignTo && athlete && (
                <View style={styles.assignNote}>
                  <Ionicons name="person-circle-outline" size={16} color={Colors.primary} />
                  <Text style={styles.assignNoteText}>
                    Will be assigned to {athlete.name}
                  </Text>
                </View>
              )}

              {error ? (
                <View style={styles.errorBox}>
                  <Ionicons name="alert-circle-outline" size={16} color={Colors.error} />
                  <Text style={styles.errorText}>{error}</Text>
                </View>
              ) : null}

              <TouchableOpacity
                style={[styles.saveBtn, saving && styles.saveBtnLoading]}
                onPress={handleSave}
                disabled={saving}
              >
                {saving ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <>
                    <Ionicons name="checkmark-circle" size={18} color="#fff" />
                    <Text style={styles.saveBtnText}>
                      {editPlanId ? 'Update Plan' : assignTo ? 'Save & Assign' : 'Save Plan'}
                    </Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          )}
        </ScrollView>
      </SafeAreaView>
    </KeyboardAvoidingView>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────

function MetaStep({
  name, description, goal, numWeeks, athlete,
  onName, onDescription, onGoal, onNumWeeks,
}: {
  name: string; description: string; goal: GoalType | null; numWeeks: number; athlete?: string;
  onName: (v: string) => void; onDescription: (v: string) => void;
  onGoal: (v: GoalType | null) => void; onNumWeeks: (v: number) => void;
}) {
  return (
    <View style={styles.metaContainer}>
      <Text style={styles.stepTitle}>Plan Details</Text>
      {athlete && (
        <View style={styles.forAthleteTag}>
          <Ionicons name="person-outline" size={13} color={Colors.primary} />
          <Text style={styles.forAthleteText}>For {athlete}</Text>
        </View>
      )}

      <View style={styles.field}>
        <Text style={styles.fieldLabel}>Plan Name</Text>
        <TextInput
          style={styles.input}
          value={name}
          onChangeText={onName}
          placeholder="e.g. Chicago Marathon 16-Week"
          placeholderTextColor={Colors.textMuted}
          autoFocus
        />
      </View>

      <View style={styles.field}>
        <Text style={styles.fieldLabel}>Description (optional)</Text>
        <TextInput
          style={[styles.input, styles.inputMulti]}
          value={description}
          onChangeText={onDescription}
          placeholder="What's this plan designed to achieve?"
          placeholderTextColor={Colors.textMuted}
          multiline
          numberOfLines={3}
        />
      </View>

      <View style={styles.field}>
        <Text style={styles.fieldLabel}>Target Goal <Text style={{ color: Colors.textMuted, fontWeight: '400' }}>(optional)</Text></Text>
        <View style={styles.goalGrid}>
          {GOALS.map((g) => (
            <TouchableOpacity
              key={g.value}
              style={[styles.goalChip, goal === g.value && styles.goalChipActive]}
              onPress={() => onGoal(goal === g.value ? null : g.value)}
            >
              <Text style={[styles.goalChipText, goal === g.value && styles.goalChipTextActive]}>
                {g.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <View style={styles.field}>
        <Text style={styles.fieldLabel}>Number of Weeks</Text>
        <View style={styles.weekStepper}>
          <TouchableOpacity
            style={styles.stepperBtn}
            onPress={() => onNumWeeks(Math.max(1, numWeeks - 1))}
            disabled={numWeeks <= 1}
          >
            <Ionicons name="remove" size={20} color={numWeeks <= 1 ? Colors.textMuted : Colors.text} />
          </TouchableOpacity>
          <View style={styles.stepperVal}>
            <Text style={styles.stepperNum}>{numWeeks}</Text>
            <Text style={styles.stepperLabel}>weeks</Text>
          </View>
          <TouchableOpacity
            style={styles.stepperBtn}
            onPress={() => onNumWeeks(Math.min(20, numWeeks + 1))}
            disabled={numWeeks >= 20}
          >
            <Ionicons name="add" size={20} color={numWeeks >= 20 ? Colors.textMuted : Colors.text} />
          </TouchableOpacity>
        </View>
        <Text style={styles.weekHint}>
          {numWeeks <= 4 ? 'Good for a focused block' : numWeeks <= 8 ? 'Standard training block' : numWeeks <= 16 ? 'Full marathon build' : 'Extended multi-cycle'}
        </Text>
      </View>
    </View>
  );
}

function WeekStep({
  weekIndex, week, totalKm, onUpdate, onDayUpdate,
}: {
  weekIndex: number;
  week: WeekState;
  totalKm: number;
  onUpdate: (patch: Partial<WeekState>) => void;
  onDayUpdate: (dayI: number, patch: Partial<DayState>) => void;
}) {
  return (
    <View style={styles.weekContainer}>
      <View style={styles.weekHeader}>
        <Text style={styles.stepTitle}>Week {weekIndex + 1}</Text>
        <View style={styles.kmBadge}>
          <Text style={styles.kmBadgeNum}>{totalKm.toFixed(0)}</Text>
          <Text style={styles.kmBadgeLabel}>km</Text>
        </View>
      </View>

      <View style={styles.field}>
        <Text style={styles.fieldLabel}>Phase</Text>
        <TextInput
          style={styles.input}
          value={week.phase}
          onChangeText={(v) => onUpdate({ phase: v })}
          placeholder="e.g. Base Building, Peak, Taper..."
          placeholderTextColor={Colors.textMuted}
        />
      </View>

      <View style={styles.field}>
        <Text style={styles.fieldLabel}>Focus (optional)</Text>
        <TextInput
          style={styles.input}
          value={week.focus}
          onChangeText={(v) => onUpdate({ focus: v })}
          placeholder="e.g. Aerobic base, long run confidence..."
          placeholderTextColor={Colors.textMuted}
        />
      </View>

      <Text style={styles.fieldLabel}>Daily Workouts</Text>
      <View style={styles.dayList}>
        {DAY_LABELS.map((label, i) => (
          <DayRow
            key={label}
            label={label}
            day={week.days[i] ?? makeDefaultDay(i)}
            onUpdate={(patch) => onDayUpdate(i, patch)}
          />
        ))}
      </View>
    </View>
  );
}


const ACTIVITY_COLORS: Partial<Record<ActivityType, string>> = {
  run: Colors.gold, trail_run: '#C8A843', bike: '#4CAF50',
  swim: '#2196F3', strength: '#9C27B0', hybrid: '#FF5722',
  climb: '#00BCD4', boulder: '#FF9800', xc_ski: '#64B5F6',
};

const ACTIVITY_ICONS: Partial<Record<ActivityType, string>> = {
  run: 'walk-outline', trail_run: 'walk-outline', bike: 'bicycle-outline',
  swim: 'water-outline', strength: 'barbell-outline', hybrid: 'pulse-outline',
  climb: 'trending-up-outline', boulder: 'cube-outline', xc_ski: 'snow-outline',
};

function workoutTypeFromActivity(w: StructuredWorkout): WorkoutType {
  if (w.activityType === 'strength') return 'strength';
  if (w.steps.some((s) => s.stepType === 'interval')) return 'interval';
  if (w.steps.some((s) => s.stepType !== 'interval' && s.intensityRange?.toLowerCase().includes('threshold'))) return 'tempo';
  return 'easy';
}

function notesFromWorkout(w: StructuredWorkout): string {
  if (w.steps.length === 0) return '';
  return w.steps
    .map((s) => {
      const label = s.stepType.charAt(0).toUpperCase() + s.stepType.slice(1);
      if (s.stepType === 'interval') {
        const sub = s.subSteps.map((ss) => ss.targetValue).join('+');
        return `${label} x${s.repeatCount} (${sub})`;
      }
      return `${label} ${s.targetValue}`;
    })
    .join(' · ');
}

function DayRow({
  label, day, onUpdate,
}: {
  label: string;
  day: DayState;
  onUpdate: (patch: Partial<DayState>) => void;
}) {
  const [showBuilder, setShowBuilder] = useState(false);
  const sw = day.structuredWorkout;
  const accentColor = sw ? (ACTIVITY_COLORS[sw.activityType] ?? Colors.primary) : Colors.textMuted;

  return (
    <>
      <TouchableOpacity
        style={styles.dayRow}
        onPress={() => setShowBuilder(true)}
        activeOpacity={0.75}
      >
        <Text style={styles.dayRowLabel}>{label}</Text>

        {sw ? (
          <View style={styles.dayRowWorkout}>
            <View style={[styles.dayRowAccent, { backgroundColor: accentColor }]} />
            <View style={styles.dayRowInfo}>
              <Text style={styles.dayRowTitle} numberOfLines={1}>{sw.name}</Text>
              <Text style={styles.dayRowMeta} numberOfLines={1}>
                {sw.steps.length} {sw.steps.length === 1 ? 'step' : 'steps'}
                {sw.steps.length > 0 ? '  ·  ' + sw.steps.map(s => s.stepType === 'interval' ? `x${s.repeatCount}` : s.targetValue).join(' + ') : ''}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color={Colors.textMuted} />
          </View>
        ) : (
          <View style={styles.dayRowEmpty}>
            <Ionicons name="add" size={20} color={Colors.textMuted} />
          </View>
        )}
      </TouchableOpacity>

      {showBuilder && (
        <WorkoutBuilderModal
          visible={true}
          initial={sw}
          onDismiss={() => setShowBuilder(false)}
          onSave={(w) => {
            setShowBuilder(false);
            onUpdate({
              structuredWorkout: w,
              type: workoutTypeFromActivity(w),
              title: w.name,
              notes: notesFromWorkout(w),
              km: '',
            });
          }}
        />
      )}
    </>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  safe: { flex: 1 },
  scroll: { padding: Spacing.md, paddingBottom: 120 },

  navbar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    paddingVertical: 12,
  },
  backBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, minWidth: 70 },
  backText: { ...Font.body, color: Colors.text },
  navTitle: { ...Font.h4, color: Colors.text },
  navRight: { minWidth: 70, alignItems: 'flex-end' },
  nextBtn: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  nextBtnDisabled: { opacity: 0.3 },
  nextBtnText: { ...Font.body, color: Colors.primary, fontWeight: '700' },

  stepRow: {
    flexDirection: 'row',
    gap: 4,
    paddingHorizontal: Spacing.md,
    marginBottom: 20,
    flexWrap: 'wrap',
  },
  stepDot: {
    height: 4,
    flex: 1,
    minWidth: 8,
    backgroundColor: Colors.border,
    borderRadius: 2,
  },
  stepDone: { backgroundColor: Colors.primary + '66' },
  stepCurrent: { backgroundColor: Colors.primary },

  stepTitle: { ...Font.h3, color: Colors.text, marginBottom: 16 },

  // Meta step
  metaContainer: { gap: 20 },
  forAthleteTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Colors.primaryFade,
    borderRadius: Radius.full,
    paddingHorizontal: 12,
    paddingVertical: 6,
    alignSelf: 'flex-start',
    marginBottom: 4,
  },
  forAthleteText: { ...Font.small, color: Colors.primary },

  field: { gap: 8 },
  fieldLabel: { ...Font.label, color: Colors.textSecondary },
  input: {
    backgroundColor: Colors.card,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.md,
    padding: 14,
    color: Colors.text,
    fontSize: 15,
  },
  inputMulti: { height: 88, textAlignVertical: 'top' },

  goalGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  goalChip: {
    borderRadius: Radius.full,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: 14,
    paddingVertical: 8,
    backgroundColor: Colors.card,
  },
  goalChipActive: { backgroundColor: Colors.primaryFade, borderColor: Colors.primary },
  goalChipText: { ...Font.small, color: Colors.textSecondary },
  goalChipTextActive: { color: Colors.primary, fontWeight: '700' },

  weekStepper: { flexDirection: 'row', alignItems: 'center', gap: 0 },
  stepperBtn: {
    width: 48,
    height: 48,
    backgroundColor: Colors.card,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepperVal: { flex: 1, alignItems: 'center' },
  stepperNum: { ...Font.h2, color: Colors.primary },
  stepperLabel: { ...Font.tiny, color: Colors.textMuted },
  weekHint: { ...Font.tiny, color: Colors.textMuted, textAlign: 'center' },

  // Week step
  weekContainer: { gap: 16 },
  weekHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  kmBadge: { alignItems: 'center', backgroundColor: Colors.primaryFade, borderRadius: Radius.md, padding: 10, minWidth: 56 },
  kmBadgeNum: { ...Font.h3, color: Colors.primary },
  kmBadgeLabel: { ...Font.tiny, color: Colors.primary },

  dayList: { gap: 2 },

  // COROS-style day rows
  dayRow: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 52,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    gap: 12,
  },
  dayRowLabel: { ...Font.label, color: Colors.textSecondary, width: 34 },
  dayRowEmpty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    height: 40,
    borderRadius: Radius.sm,
    borderWidth: 1,
    borderColor: Colors.border,
    borderStyle: 'dashed',
  },
  dayRowWorkout: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  dayRowAccent: {
    width: 3,
    height: 36,
    borderRadius: 2,
  },
  dayRowInfo: { flex: 1 },
  dayRowTitle: { ...Font.label, color: Colors.text },
  dayRowMeta: { ...Font.tiny, color: Colors.textMuted, marginTop: 2 },

  // Review
  reviewSection: { gap: 16 },
  reviewCard: { gap: 8 },
  reviewTitle: { ...Font.label, color: Colors.textMuted },
  reviewName: { ...Font.h3, color: Colors.text },
  reviewDesc: { ...Font.small, color: Colors.textSecondary },
  reviewMeta: { gap: 4, marginTop: 4 },
  reviewMetaText: { ...Font.small, color: Colors.textMuted },

  assignNote: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: Colors.primaryFade,
    borderRadius: Radius.md,
    padding: 12,
    borderWidth: 1,
    borderColor: Colors.primary + '33',
  },
  assignNoteText: { ...Font.small, color: Colors.primary },

  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: Colors.error + '18',
    borderRadius: Radius.md,
    padding: 12,
  },
  errorText: { ...Font.small, color: Colors.error, flex: 1 },

  saveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: Colors.primary,
    borderRadius: Radius.full,
    paddingVertical: 16,
  },
  saveBtnLoading: { opacity: 0.6 },
  saveBtnText: { ...Font.body, color: '#fff', fontWeight: '700', fontSize: 16 },

});
