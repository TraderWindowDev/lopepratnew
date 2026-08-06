import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors, Font, Spacing, Radius } from '@/constants/theme';
import { GOAL_LABELS, type GoalType, type WorkoutType } from '@/constants/mock-data';
import { createPlan, updatePlan, assignPlan } from '@/lib/api/plans';
import { useStore } from '@/hooks/useStore';
import { supabase } from '@/lib/supabase';
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

function uid() { return Math.random().toString(36).slice(2, 9); }

function makeStep(stepType: 'warmup' | 'training' | 'rest' | 'cooldown', km?: string, pace?: string): any {
  const hasKm = km && parseFloat(km) > 0;
  return {
    id: uid(),
    stepType,
    targetKind: hasKm ? 'distance' : 'time',
    targetValue: hasKm ? `${km} km` : stepType === 'warmup' || stepType === 'cooldown' ? '10:00' : '20:00',
    intensityKind: pace ? 'pace' : 'open',
    intensityRange: pace || '—',
  };
}

// Converts an AI-generated plain day into a StructuredWorkout so the builder pre-populates
function dayToStructuredWorkout(day: DayState): StructuredWorkout | undefined {
  if (!day.title || day.type === 'rest') return undefined;
  const activityType: ActivityType = day.type === 'strength' ? 'strength' : 'run';
  const runType = day.type === 'interval' ? 'interval' : day.type === 'long' ? 'long' : 'easy';
  const km = day.km && parseFloat(day.km) > 0 ? day.km : undefined;
  const pace = day.targetPace || undefined;

  let steps: any[] = [];
  if (day.type === 'tempo') {
    const warmKm = km ? String(Math.max(1, Math.round(parseFloat(km) * 0.2))) : undefined;
    const mainKm = km ? String(Math.round(parseFloat(km) * 0.6)) : undefined;
    steps = [makeStep('warmup', warmKm), makeStep('training', mainKm, pace), makeStep('cooldown', warmKm)];
  } else if (activityType === 'run' && (runType === 'easy' || runType === 'long')) {
    // Simple run: convert km to approximate minutes (assume ~6 min/km)
    const mins = km ? String(Math.round(parseFloat(km) * 6)) : '';
    steps = mins ? [{ ...makeStep('training', undefined, pace), targetKind: 'time', targetValue: `${mins}:00` }] : [];
  } else if (day.type !== 'strength') {
    steps = [makeStep('training', km, pace)];
  }

  return { activityType, runType: activityType === 'run' ? (runType as any) : undefined, name: day.title, steps };
}

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

  // AI generation
  const [showAIModal, setShowAIModal] = useState(false);
  const [aiNotes, setAiNotes] = useState('');
  const [generating, setGenerating] = useState(false);
  const [aiError, setAiError] = useState('');

  async function handleGenerate() {
    setGenerating(true);
    setAiError('');
    try {
      const { data, error: fnErr } = await supabase.functions.invoke('generate-plan', {
        body: { goal, numWeeks, planName: name.trim(), athleteNotes: aiNotes.trim() },
      });
      if (fnErr) throw fnErr;
      if (data?.error) throw new Error(data.error);

      const generated: WeekState[] = (data.plan.weeks as any[]).map((w: any) => ({
        phase: w.phase ?? '',
        focus: w.focus ?? '',
        days: (w.days as any[]).map((d: any) => ({
          type: (d.type as WorkoutType) ?? 'rest',
          title: d.title ?? '',
          km: d.km != null ? String(d.km) : '',
          notes: d.notes ?? '',
          targetPace: d.targetPace ?? '',
          coachNote: '',
        })),
      }));

      setWeeks(generated);
      setShowAIModal(false);
      setStep(1);
    } catch (e: any) {
      setAiError(e.message ?? 'Generation failed — try again.');
    } finally {
      setGenerating(false);
    }
  }

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
              onGenerateAI={() => setShowAIModal(true)}
            />
          )}

          <GenerateAIModal
            visible={showAIModal}
            goal={goal}
            numWeeks={numWeeks}
            notes={aiNotes}
            onNotesChange={setAiNotes}
            generating={generating}
            error={aiError}
            onGenerate={handleGenerate}
            onClose={() => { setShowAIModal(false); setAiError(''); }}
          />

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
  onName, onDescription, onGoal, onNumWeeks, onGenerateAI,
}: {
  name: string; description: string; goal: GoalType | null; numWeeks: number; athlete?: string;
  onName: (v: string) => void; onDescription: (v: string) => void;
  onGoal: (v: GoalType | null) => void; onNumWeeks: (v: number) => void;
  onGenerateAI: () => void;
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

      <TouchableOpacity style={styles.aiBtn} onPress={onGenerateAI} activeOpacity={0.8}>
        <Ionicons name="sparkles" size={16} color={Colors.primary} />
        <Text style={styles.aiBtnText}>Generate with AI</Text>
      </TouchableOpacity>
    </View>
  );
}

function GenerateAIModal({
  visible, goal, numWeeks, notes, onNotesChange, generating, error, onGenerate, onClose,
}: {
  visible: boolean; goal: GoalType | null; numWeeks: number;
  notes: string; onNotesChange: (v: string) => void;
  generating: boolean; error: string;
  onGenerate: () => void; onClose: () => void;
}) {
  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.aiModal}>
          <LinearGradient colors={['#0D1117', Colors.background]} style={StyleSheet.absoluteFill} />

          <View style={styles.aiModalHeader}>
            <View style={styles.aiModalTitle}>
              <Ionicons name="sparkles" size={20} color={Colors.primary} />
              <Text style={styles.aiModalTitleText}>AI Plan Generator</Text>
            </View>
            <TouchableOpacity onPress={onClose} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
              <Ionicons name="close" size={22} color={Colors.textSecondary} />
            </TouchableOpacity>
          </View>

          <View style={styles.aiModalSummary}>
            <View style={styles.aiModalChip}>
              <Text style={styles.aiModalChipText}>{numWeeks} weeks</Text>
            </View>
            {goal && (
              <View style={styles.aiModalChip}>
                <Text style={styles.aiModalChipText}>{GOAL_LABELS[goal]}</Text>
              </View>
            )}
          </View>

          <Text style={styles.aiModalLabel}>Tell me about the athlete</Text>
          <Text style={styles.aiModalHint}>
            Injury history, available training days, current fitness, any specific requirements…
          </Text>
          <TextInput
            style={styles.aiModalInput}
            value={notes}
            onChangeText={onNotesChange}
            placeholder="e.g. Intermediate runner, 5 days/week, recovering from knee injury, targeting sub-4hr marathon"
            placeholderTextColor={Colors.textMuted}
            multiline
            numberOfLines={5}
            textAlignVertical="top"
            autoFocus
          />

          {error ? (
            <View style={styles.aiModalError}>
              <Ionicons name="alert-circle-outline" size={15} color={Colors.error} />
              <Text style={styles.aiModalErrorText}>{error}</Text>
            </View>
          ) : null}

          <TouchableOpacity
            style={[styles.aiGenerateBtn, generating && styles.aiGenerateBtnLoading]}
            onPress={onGenerate}
            disabled={generating}
            activeOpacity={0.85}
          >
            {generating ? (
              <>
                <ActivityIndicator color="#fff" size="small" />
                <Text style={styles.aiGenerateBtnText}>Generating…</Text>
              </>
            ) : (
              <>
                <Ionicons name="sparkles" size={18} color="#fff" />
                <Text style={styles.aiGenerateBtnText}>Generate Plan</Text>
              </>
            )}
          </TouchableOpacity>

          {generating && (
            <Text style={styles.aiGeneratingNote}>
              This takes 10–20 seconds. The AI will build all {numWeeks} weeks — you can edit anything after.
            </Text>
          )}
        </View>
      </KeyboardAvoidingView>
    </Modal>
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
  run:         Colors.gold,
  alternative: '#4CAF50',
  strength:    '#9C27B0',
  rest:        Colors.textMuted,
};

const ACTIVITY_ICONS: Partial<Record<ActivityType, string>> = {
  run:         'walk-outline',
  alternative: 'bicycle-outline',
  strength:    'barbell-outline',
  rest:        'moon-outline',
};

function workoutTypeFromActivity(w: StructuredWorkout): WorkoutType {
  if (w.activityType === 'rest') return 'rest';
  if (w.activityType === 'strength') return 'strength';
  if (w.runType === 'interval' || w.steps.some((s) => s.stepType === 'interval')) return 'interval';
  if (w.runType === 'long') return 'long';
  if (w.steps.some((s) => s.stepType !== 'interval' && (s as any).intensityRange?.toLowerCase().includes('threshold'))) return 'tempo';
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
  const typeColor = WORKOUT_TYPES.find((t) => t.value === day.type)?.color ?? Colors.textMuted;
  const accentColor = sw ? (ACTIVITY_COLORS[sw.activityType] ?? Colors.primary) : typeColor;
  const hasContent = sw || day.title;

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
        ) : hasContent ? (
          <View style={styles.dayRowWorkout}>
            <View style={[styles.dayRowAccent, { backgroundColor: accentColor }]} />
            <View style={styles.dayRowInfo}>
              <Text style={styles.dayRowTitle} numberOfLines={1}>{day.title}</Text>
              <Text style={styles.dayRowMeta} numberOfLines={1}>
                {day.km ? `${day.km} km` : ''}
                {day.km && day.targetPace ? '  ·  ' : ''}
                {day.targetPace || ''}
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
          initial={sw ?? dayToStructuredWorkout(day)}
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

  // AI button on meta step
  aiBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: Colors.primary + '66',
    borderRadius: Radius.md,
    paddingVertical: 14,
    backgroundColor: Colors.primaryFade,
  },
  aiBtnText: { ...Font.body, color: Colors.primary, fontWeight: '600' },

  // AI generation modal
  aiModal: {
    flex: 1,
    backgroundColor: Colors.background,
    padding: Spacing.lg,
    paddingTop: 24,
    gap: 14,
  },
  aiModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  aiModalTitle: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  aiModalTitleText: { ...Font.h3, color: Colors.text },
  aiModalSummary: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  aiModalChip: {
    backgroundColor: Colors.card,
    borderRadius: Radius.full,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: 12,
    paddingVertical: 5,
  },
  aiModalChipText: { ...Font.small, color: Colors.textSecondary },
  aiModalLabel: { ...Font.label, color: Colors.text },
  aiModalHint: { ...Font.small, color: Colors.textMuted, marginTop: -8 },
  aiModalInput: {
    backgroundColor: Colors.card,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.md,
    padding: 14,
    color: Colors.text,
    fontSize: 15,
    minHeight: 120,
    textAlignVertical: 'top',
  },
  aiModalError: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: Colors.error + '18',
    borderRadius: Radius.sm,
    padding: 10,
  },
  aiModalErrorText: { ...Font.small, color: Colors.error, flex: 1 },
  aiGenerateBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: Colors.primary,
    borderRadius: Radius.md,
    paddingVertical: 16,
    marginTop: 4,
  },
  aiGenerateBtnLoading: { opacity: 0.7 },
  aiGenerateBtnText: { ...Font.body, color: '#fff', fontWeight: '700' },
  aiGeneratingNote: {
    ...Font.small,
    color: Colors.textMuted,
    textAlign: 'center',
    lineHeight: 18,
  },

});
