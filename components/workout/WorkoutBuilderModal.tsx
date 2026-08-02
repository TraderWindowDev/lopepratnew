import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  TextInput,
  SafeAreaView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Font, Radius, Spacing } from '@/constants/theme';

// ── Types ─────────────────────────────────────────────────────────────────

export type ActivityType =
  | 'run' | 'trail_run' | 'bike' | 'swim' | 'strength'
  | 'hybrid' | 'climb' | 'boulder' | 'xc_ski';

export type StepType = 'warmup' | 'training' | 'rest' | 'cooldown' | 'interval';
export type TargetKind = 'time' | 'distance';
export type IntensityKind = 'pace' | 'threshold_hr' | 'power' | 'open';

export type BaseStep = {
  id: string;
  stepType: Exclude<StepType, 'interval'>;
  targetKind: TargetKind;
  targetValue: string;
  intensityKind: IntensityKind;
  intensityRange: string;
};

export type IntervalStep = {
  id: string;
  stepType: 'interval';
  repeatCount: number;
  subSteps: BaseStep[];
};

export type WorkoutStep = BaseStep | IntervalStep;

export type StructuredWorkout = {
  activityType: ActivityType;
  name: string;
  steps: WorkoutStep[];
};

// ── Constants ──────────────────────────────────────────────────────────────

const ACTIVITY_TYPES: { value: ActivityType; label: string; icon: string; color: string }[] = [
  { value: 'run',       label: 'Run',           icon: 'walk-outline',        color: Colors.gold },
  { value: 'trail_run', label: 'Trail Run',      icon: 'walk-outline',        color: '#C8A843' },
  { value: 'bike',      label: 'Bike',           icon: 'bicycle-outline',     color: '#4CAF50' },
  { value: 'swim',      label: 'Swim',           icon: 'water-outline',       color: '#2196F3' },
  { value: 'strength',  label: 'Strength',       icon: 'barbell-outline',     color: '#9C27B0' },
  { value: 'hybrid',    label: 'Hybrid Fitness', icon: 'pulse-outline',       color: '#FF5722' },
  { value: 'climb',     label: 'Indoor Climb',   icon: 'trending-up-outline', color: '#00BCD4' },
  { value: 'boulder',   label: 'Bouldering',     icon: 'cube-outline',        color: '#FF9800' },
  { value: 'xc_ski',   label: 'XC Ski',         icon: 'snow-outline',        color: '#64B5F6' },
];

const STEP_DEFS: { type: Exclude<StepType, 'interval'>; label: string; defaultTime: string; color: string; barFill: number }[] = [
  { type: 'warmup',   label: 'Warm Up',   defaultTime: '10:00', color: '#7D6534', barFill: 0.4 },
  { type: 'training', label: 'Training',  defaultTime: '20:00', color: '#1B5E20', barFill: 1.0 },
  { type: 'rest',     label: 'Rest',      defaultTime: '02:00', color: '#424242', barFill: 0.15 },
  { type: 'cooldown', label: 'Cool Down', defaultTime: '10:00', color: '#004D40', barFill: 0.4 },
];

const ALL_STEP_DEFS: { type: StepType; label: string; defaultTime: string; color: string; barFill: number }[] = [
  ...STEP_DEFS,
  { type: 'interval', label: 'Interval', defaultTime: '', color: '#1B5E20', barFill: 0.6 },
];

const TIME_OPTIONS = [
  '00:30','01:00','01:30','02:00','03:00','04:00','05:00','08:00',
  '10:00','12:00','15:00','20:00','25:00','30:00','40:00','45:00','60:00','90:00',
];

const DIST_OPTIONS = ['0.5 km','1 km','2 km','3 km','4 km','5 km','8 km','10 km','15 km','20 km','21 km','42 km'];

const INTENSITY_KINDS: { value: IntensityKind; label: string }[] = [
  { value: 'pace',         label: 'Pace' },
  { value: 'threshold_hr', label: '% Threshold HR' },
  { value: 'power',        label: 'Power' },
  { value: 'open',         label: 'Open (no target)' },
];

const INTENSITY_RANGES: Record<IntensityKind, string[]> = {
  threshold_hr: [
    'Recovery (< 75%)',
    'Zone 2 (75-84%)',
    'Aerobic (85-90%)',
    'Aerobic Power (91-95%)',
    'Anaerobic Endurance (96-100%)',
    'VO2 Max (> 100%)',
  ],
  pace: ['Recovery pace','Easy pace','Marathon pace','Half Marathon pace','10K pace','5K pace','Mile pace'],
  power: ['Active Recovery (< 55%)','Endurance (56-75%)','Tempo (76-90%)','Threshold (91-105%)','VO2 Max (106-120%)','Anaerobic (> 120%)'],
  open: ['—'],
};

// ── Helpers ────────────────────────────────────────────────────────────────

function stepLabel(t: Exclude<StepType, 'interval'>) {
  return STEP_DEFS.find((d) => d.type === t)?.label ?? t;
}
function stepColor(t: Exclude<StepType, 'interval'>) {
  return STEP_DEFS.find((d) => d.type === t)?.color ?? Colors.border;
}
function uid() { return Math.random().toString(36).slice(2, 9); }

function makeBaseStep(type: Exclude<StepType, 'interval'>): BaseStep {
  const def = STEP_DEFS.find((d) => d.type === type)!;
  return {
    id: uid(),
    stepType: type,
    targetKind: 'time',
    targetValue: def.defaultTime,
    intensityKind: 'open',
    intensityRange: '—',
  };
}

function makeIntervalStep(): IntervalStep {
  return {
    id: uid(),
    stepType: 'interval',
    repeatCount: 1,
    subSteps: [
      { ...makeBaseStep('training'), targetValue: '04:00' },
      { ...makeBaseStep('rest'),     targetValue: '02:00', intensityKind: 'open', intensityRange: '—' },
    ],
  };
}

// ── Activity picker ───────────────────────────────────────────────────────

function ActivityPickerScreen({ selected, onPick, onBack }: {
  selected: ActivityType; onPick: (a: ActivityType) => void; onBack: () => void;
}) {
  return (
    <SafeAreaView style={s.screen}>
      <View style={s.header}>
        <TouchableOpacity onPress={onBack} hitSlop={12}>
          <Ionicons name="chevron-back" size={24} color={Colors.text} />
        </TouchableOpacity>
        <Text style={s.headerTitle}>Select Activity Type</Text>
        <View style={{ width: 32 }} />
      </View>
      <ScrollView contentContainerStyle={{ paddingVertical: Spacing.sm }}>
        {ACTIVITY_TYPES.map((a) => (
          <TouchableOpacity key={a.value} style={s.activityRow} onPress={() => { onPick(a.value); onBack(); }}>
            <View style={[s.activityIcon, { backgroundColor: a.color + '22' }]}>
              <Ionicons name={a.icon as any} size={22} color={a.color} />
            </View>
            <Text style={s.activityLabel}>{a.label}</Text>
            {selected === a.value
              ? <Ionicons name="checkmark" size={20} color={Colors.primary} />
              : <Ionicons name="chevron-forward" size={18} color={Colors.textMuted} />}
          </TouchableOpacity>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

// ── Exercise picker ───────────────────────────────────────────────────────

function ExercisePickerScreen({ onPick, onBack, allowInterval = true }: {
  onPick: (type: StepType) => void; onBack: () => void; allowInterval?: boolean;
}) {
  const defs = allowInterval ? ALL_STEP_DEFS : STEP_DEFS;
  return (
    <SafeAreaView style={s.screen}>
      <View style={s.header}>
        <TouchableOpacity onPress={onBack} hitSlop={12}>
          <Text style={s.cancelBtn}>Cancel</Text>
        </TouchableOpacity>
        <Text style={s.headerTitle}>Select exercise</Text>
        <View style={{ width: 60 }} />
      </View>
      <View style={s.exerciseGrid}>
        {defs.map((def) => (
          <TouchableOpacity key={def.type} style={s.exerciseCard} onPress={() => onPick(def.type)}>
            <Text style={s.exerciseCardName}>{def.label}</Text>
            {def.defaultTime ? <Text style={s.exerciseCardTime}>{def.defaultTime}</Text> : null}
            <View style={s.exerciseBarTrack}>
              <View style={[s.exerciseBarFill, { width: `${def.barFill * 100}%` as any, backgroundColor: def.color }]} />
            </View>
          </TouchableOpacity>
        ))}
      </View>
    </SafeAreaView>
  );
}

// ── Dropdown row ──────────────────────────────────────────────────────────

function DropdownRow({ label, value, options, open, onToggle, onSelect }: {
  label: string; value: string; options: string[]; open: boolean;
  onToggle: () => void; onSelect: (v: string) => void;
}) {
  return (
    <View>
      <TouchableOpacity style={s.dropRow} onPress={onToggle}>
        <Text style={s.dropLabel}>{label}</Text>
        <View style={s.dropValue}>
          <Text style={s.dropValueText}>{value}</Text>
          <Ionicons name={open ? 'chevron-up' : 'chevron-down'} size={16} color={Colors.textSecondary} />
        </View>
      </TouchableOpacity>
      {open && (
        <View style={s.dropMenu}>
          {options.map((o) => (
            <TouchableOpacity
              key={o}
              style={[s.dropMenuItem, o === value && s.dropMenuItemActive]}
              onPress={() => { onSelect(o); onToggle(); }}
            >
              <Text style={[s.dropMenuText, o === value && s.dropMenuTextActive]}>{o}</Text>
              {o === value && <Ionicons name="checkmark" size={16} color={Colors.primary} />}
            </TouchableOpacity>
          ))}
        </View>
      )}
    </View>
  );
}

// ── Step editor ───────────────────────────────────────────────────────────

function StepEditorScreen({ step, onSave, onBack }: {
  step: BaseStep; onSave: (updated: BaseStep) => void; onBack: () => void;
}) {
  const [stepType, setStepType]         = useState<Exclude<StepType, 'interval'>>(step.stepType);
  const [targetKind, setTargetKind]     = useState<TargetKind>(step.targetKind);
  const [targetValue, setTargetValue]   = useState(step.targetValue);
  const [intensityKind, setIntensityKind] = useState<IntensityKind>(step.intensityKind);
  const [intensityRange, setIntensityRange] = useState(step.intensityRange || INTENSITY_RANGES[step.intensityKind][0]);
  const [openDrop, setOpenDrop]         = useState<string | null>(null);

  function toggle(key: string) { setOpenDrop((p) => (p === key ? null : key)); }

  return (
    <SafeAreaView style={s.screen}>
      <View style={s.header}>
        <TouchableOpacity onPress={onBack} hitSlop={12}><Text style={s.cancelBtn}>Cancel</Text></TouchableOpacity>
        <Text style={s.headerTitle}>Edit Workout</Text>
        <TouchableOpacity hitSlop={12} onPress={() =>
          onSave({ ...step, stepType, targetKind, targetValue, intensityKind, intensityRange })
        }>
          <Text style={s.saveActionBtn}>Save</Text>
        </TouchableOpacity>
      </View>
      <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
        <View style={s.editorSection}>
          <DropdownRow
            label="Type" value={STEP_DEFS.find((d) => d.type === stepType)?.label ?? stepType}
            options={STEP_DEFS.map((d) => d.label)} open={openDrop === 'type'} onToggle={() => toggle('type')}
            onSelect={(v) => { const f = STEP_DEFS.find((d) => d.label === v); if (f) setStepType(f.type); }}
          />
        </View>
        <View style={s.editorSection}>
          <DropdownRow
            label="Target type" value={targetKind === 'time' ? 'Time' : 'Distance'}
            options={['Time', 'Distance']} open={openDrop === 'targetKind'} onToggle={() => toggle('targetKind')}
            onSelect={(v) => {
              const kind: TargetKind = v === 'Time' ? 'time' : 'distance';
              setTargetKind(kind);
              setTargetValue(kind === 'time' ? '20:00' : '5 km');
            }}
          />
          <DropdownRow
            label="Target" value={targetValue}
            options={targetKind === 'time' ? TIME_OPTIONS : DIST_OPTIONS}
            open={openDrop === 'targetValue'} onToggle={() => toggle('targetValue')}
            onSelect={setTargetValue}
          />
        </View>
        <View style={s.editorSection}>
          <DropdownRow
            label="Intensity type"
            value={INTENSITY_KINDS.find((k) => k.value === intensityKind)?.label ?? intensityKind}
            options={INTENSITY_KINDS.map((k) => k.label)} open={openDrop === 'intensityKind'} onToggle={() => toggle('intensityKind')}
            onSelect={(v) => {
              const f = INTENSITY_KINDS.find((k) => k.label === v);
              if (f) { setIntensityKind(f.value); setIntensityRange(INTENSITY_RANGES[f.value][0]); }
            }}
          />
          {intensityKind !== 'open' && (
            <DropdownRow
              label="Range" value={intensityRange} options={INTENSITY_RANGES[intensityKind]}
              open={openDrop === 'intensityRange'} onToggle={() => toggle('intensityRange')}
              onSelect={setIntensityRange}
            />
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

// ── Interval block ────────────────────────────────────────────────────────

function IntervalBlock({ step, onChange, onDelete, onEditSubStep, onAddSubStep }: {
  step: IntervalStep;
  onChange: (updated: IntervalStep) => void;
  onDelete: () => void;
  onEditSubStep: (sub: BaseStep) => void;
  onAddSubStep: () => void;
}) {
  function setRepeat(delta: number) {
    onChange({ ...step, repeatCount: Math.max(1, Math.min(99, step.repeatCount + delta)) });
  }

  function duplicate() {
    onChange({ ...step, id: uid(), subSteps: step.subSteps.map((s) => ({ ...s, id: uid() })) });
  }

  return (
    <View style={s.intervalBlock}>
      {/* Repeat header */}
      <View style={s.intervalHeader}>
        <TouchableOpacity onPress={() => setRepeat(-1)} style={s.intervalRepeatBtn} hitSlop={10}>
          <Ionicons name="remove" size={18} color={Colors.text} />
        </TouchableOpacity>
        <Text style={s.intervalRepeatLabel}>Repeat  {step.repeatCount}  times</Text>
        <TouchableOpacity onPress={() => setRepeat(1)} style={s.intervalRepeatBtn} hitSlop={10}>
          <Ionicons name="add" size={18} color={Colors.text} />
        </TouchableOpacity>

        <View style={s.intervalActions}>
          <TouchableOpacity onPress={duplicate} hitSlop={10}>
            <Ionicons name="copy-outline" size={18} color={Colors.textMuted} />
          </TouchableOpacity>
          <TouchableOpacity onPress={onDelete} hitSlop={10}>
            <Ionicons name="trash-outline" size={18} color={Colors.textMuted} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Sub-steps */}
      {step.subSteps.map((sub, idx) => (
        <TouchableOpacity key={sub.id} style={s.subStepRow} onPress={() => onEditSubStep(sub)} activeOpacity={0.75}>
          <View style={[s.subStepAccent, { backgroundColor: stepColor(sub.stepType) }]} />
          <View style={s.subStepInfo}>
            <Text style={s.subStepTitle}>{idx + 1}  {stepLabel(sub.stepType)}</Text>
            <Text style={s.subStepMeta}>
              <Ionicons name="time-outline" size={11} color={Colors.textMuted} />
              {'  '}{sub.targetValue}
              {sub.intensityKind !== 'open'
                ? `  |  ${INTENSITY_KINDS.find((k) => k.value === sub.intensityKind)?.label}  |  ${sub.intensityRange}`
                : ''}
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={16} color={Colors.textMuted} />
        </TouchableOpacity>
      ))}

      {/* Add sub-step */}
      <TouchableOpacity style={s.subStepAdd} onPress={onAddSubStep}>
        <Ionicons name="add" size={16} color={Colors.primary} />
        <Text style={s.subStepAddText}>Add step</Text>
      </TouchableOpacity>
    </View>
  );
}

// ── Builder screen ────────────────────────────────────────────────────────

function BuilderScreen({ workout, onChange, onSave, onDismiss, onPickActivity, onAddStep, onAddSubStep, onEditStep, onEditSubStep }: {
  workout: StructuredWorkout;
  onChange: (w: StructuredWorkout) => void;
  onSave: () => void;
  onDismiss: () => void;
  onPickActivity: () => void;
  onAddStep: () => void;
  onAddSubStep: (intervalId: string) => void;
  onEditStep: (step: BaseStep) => void;
  onEditSubStep: (intervalId: string, sub: BaseStep) => void;
}) {
  const activity = ACTIVITY_TYPES.find((a) => a.value === workout.activityType);

  function removeStep(id: string) {
    onChange({ ...workout, steps: workout.steps.filter((s) => s.id !== id) });
  }

  function updateInterval(updated: IntervalStep) {
    onChange({ ...workout, steps: workout.steps.map((s) => s.id === updated.id ? updated : s) });
  }

  // Duplicate interval → insert right after original
  function duplicateInterval(updated: IntervalStep) {
    const idx = workout.steps.findIndex((s) => s.id === updated.id);
    const copy = { ...updated, id: uid(), subSteps: updated.subSteps.map((ss) => ({ ...ss, id: uid() })) };
    const next = [...workout.steps];
    next.splice(idx + 1, 0, copy);
    onChange({ ...workout, steps: next });
  }

  return (
    <SafeAreaView style={s.screen}>
      <View style={s.header}>
        <TouchableOpacity onPress={onDismiss} hitSlop={12}><Text style={s.cancelBtn}>Cancel</Text></TouchableOpacity>
        <Text style={s.headerTitle}>Create Workout</Text>
        <TouchableOpacity onPress={onSave} hitSlop={12}>
          <Text style={[s.saveActionBtn, !workout.name.trim() && s.saveActionBtnDisabled]}>Save</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={s.builderScroll} keyboardShouldPersistTaps="handled">
        {/* Activity type */}
        <TouchableOpacity style={s.activityRow} onPress={onPickActivity}>
          <View style={[s.activityIcon, { backgroundColor: (activity?.color ?? Colors.primary) + '22' }]}>
            <Ionicons name={(activity?.icon ?? 'walk-outline') as any} size={22} color={activity?.color ?? Colors.primary} />
          </View>
          <Text style={[s.activityLabel, { color: activity?.color ?? Colors.primary }]}>{activity?.label ?? 'Run'}</Text>
          <Ionicons name="chevron-down" size={16} color={Colors.textMuted} style={{ marginLeft: 4 }} />
        </TouchableOpacity>

        {/* Name */}
        <TextInput
          style={s.nameInput}
          value={workout.name}
          onChangeText={(v) => onChange({ ...workout, name: v })}
          placeholder="Workout name"
          placeholderTextColor={Colors.textMuted}
          autoFocus={workout.name === ''}
        />

        {/* Steps */}
        {workout.steps.map((step) => {
          if (step.stepType === 'interval') {
            return (
              <IntervalBlock
                key={step.id}
                step={step}
                onChange={(updated) => {
                  // check if it was duplicated
                  if (updated.id !== step.id) duplicateInterval(updated);
                  else updateInterval(updated);
                }}
                onDelete={() => removeStep(step.id)}
                onEditSubStep={(sub) => onEditSubStep(step.id, sub)}
                onAddSubStep={() => onAddSubStep(step.id)}
              />
            );
          }
          const def = STEP_DEFS.find((d) => d.type === (step as BaseStep).stepType);
          return (
            <TouchableOpacity key={step.id} style={s.stepCard} onPress={() => onEditStep(step as BaseStep)} activeOpacity={0.8}>
              <View style={[s.stepAccent, { backgroundColor: def?.color ?? Colors.border }]} />
              <View style={s.stepCardBody}>
                <View style={{ flex: 1 }}>
                  <Text style={s.stepCardName}>{def?.label ?? step.stepType}</Text>
                  <Text style={s.stepCardMeta}>
                    {(step as BaseStep).targetValue}
                    {(step as BaseStep).intensityKind !== 'open'
                      ? `  ·  ${(step as BaseStep).intensityRange}`
                      : ''}
                  </Text>
                </View>
                <TouchableOpacity onPress={() => removeStep(step.id)} hitSlop={12}>
                  <Ionicons name="trash-outline" size={17} color={Colors.textMuted} />
                </TouchableOpacity>
              </View>
            </TouchableOpacity>
          );
        })}

        {/* Add exercise */}
        <TouchableOpacity style={s.addExerciseBtn} onPress={onAddStep}>
          <Ionicons name="add" size={18} color={Colors.primary} />
          <Text style={s.addExerciseBtnText}>Add Exercise</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

// ── Root modal ─────────────────────────────────────────────────────────────

type Screen = 'builder' | 'activity' | 'exercise_picker' | 'substep_picker' | 'step_editor';

type EditTarget =
  | { kind: 'step'; stepId: string }
  | { kind: 'substep'; intervalId: string; stepId: string };

export function WorkoutBuilderModal({ visible, initial, onSave, onDismiss }: {
  visible: boolean;
  initial?: StructuredWorkout;
  onSave: (w: StructuredWorkout) => void;
  onDismiss: () => void;
}) {
  const [screen, setScreen]         = useState<Screen>('builder');
  const [workout, setWorkout]       = useState<StructuredWorkout>(initial ?? { activityType: 'run', name: '', steps: [] });
  const [editTarget, setEditTarget] = useState<EditTarget | null>(null);
  const [addingSubId, setAddingSubId] = useState<string | null>(null); // intervalId when picking sub-step

  React.useEffect(() => {
    if (visible) {
      setWorkout(initial ?? { activityType: 'run', name: '', steps: [] });
      setScreen('builder');
      setEditTarget(null);
      setAddingSubId(null);
    }
  }, [visible]);

  // ── step editing ───────────────────────────────────────────────────────

  function handleEditStep(step: BaseStep) {
    setEditTarget({ kind: 'step', stepId: step.id });
    setScreen('step_editor');
  }

  function handleEditSubStep(intervalId: string, step: BaseStep) {
    setEditTarget({ kind: 'substep', intervalId, stepId: step.id });
    setScreen('step_editor');
  }

  function resolveEditingStep(): BaseStep | null {
    if (!editTarget) return null;
    if (editTarget.kind === 'step') {
      const s = workout.steps.find((s) => s.id === editTarget.stepId);
      return s && s.stepType !== 'interval' ? (s as BaseStep) : null;
    }
    const interval = workout.steps.find((s) => s.id === editTarget.intervalId) as IntervalStep | undefined;
    return interval?.subSteps.find((s) => s.id === editTarget.stepId) ?? null;
  }

  function handleStepSave(updated: BaseStep) {
    if (!editTarget) return;
    if (editTarget.kind === 'step') {
      setWorkout((w) => ({ ...w, steps: w.steps.map((s) => s.id === updated.id ? updated : s) }));
    } else {
      setWorkout((w) => ({
        ...w,
        steps: w.steps.map((s) =>
          s.id === editTarget.intervalId
            ? { ...(s as IntervalStep), subSteps: (s as IntervalStep).subSteps.map((ss) => ss.id === updated.id ? updated : ss) }
            : s
        ),
      }));
    }
    setScreen('builder');
    setEditTarget(null);
  }

  // ── adding steps ───────────────────────────────────────────────────────

  function handlePickMainStep(type: StepType) {
    if (type === 'interval') {
      const step = makeIntervalStep();
      setWorkout((w) => ({ ...w, steps: [...w.steps, step] }));
      setScreen('builder');
    } else {
      const step = makeBaseStep(type as Exclude<StepType, 'interval'>);
      setWorkout((w) => ({ ...w, steps: [...w.steps, step] }));
      setEditTarget({ kind: 'step', stepId: step.id });
      setScreen('step_editor');
    }
  }

  function handlePickSubStep(type: Exclude<StepType, 'interval'>) {
    if (!addingSubId) return;
    const step = makeBaseStep(type);
    setWorkout((w) => ({
      ...w,
      steps: w.steps.map((s) =>
        s.id === addingSubId
          ? { ...(s as IntervalStep), subSteps: [...(s as IntervalStep).subSteps, step] }
          : s
      ),
    }));
    setEditTarget({ kind: 'substep', intervalId: addingSubId, stepId: step.id });
    setAddingSubId(null);
    setScreen('step_editor');
  }

  // ── render ─────────────────────────────────────────────────────────────

  const editingStep = resolveEditingStep();

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      {screen === 'builder' && (
        <BuilderScreen
          workout={workout}
          onChange={setWorkout}
          onSave={() => { if (workout.name.trim()) onSave(workout); }}
          onDismiss={onDismiss}
          onPickActivity={() => setScreen('activity')}
          onAddStep={() => setScreen('exercise_picker')}
          onAddSubStep={(intervalId) => { setAddingSubId(intervalId); setScreen('substep_picker'); }}
          onEditStep={handleEditStep}
          onEditSubStep={handleEditSubStep}
        />
      )}
      {screen === 'activity' && (
        <ActivityPickerScreen
          selected={workout.activityType}
          onPick={(a) => setWorkout((w) => ({ ...w, activityType: a }))}
          onBack={() => setScreen('builder')}
        />
      )}
      {screen === 'exercise_picker' && (
        <ExercisePickerScreen
          allowInterval
          onPick={handlePickMainStep}
          onBack={() => setScreen('builder')}
        />
      )}
      {screen === 'substep_picker' && (
        <ExercisePickerScreen
          allowInterval={false}
          onPick={(t) => handlePickSubStep(t as Exclude<StepType, 'interval'>)}
          onBack={() => { setAddingSubId(null); setScreen('builder'); }}
        />
      )}
      {screen === 'step_editor' && editingStep && (
        <StepEditorScreen
          step={editingStep}
          onSave={handleStepSave}
          onBack={() => { setScreen('builder'); setEditTarget(null); }}
        />
      )}
    </Modal>
  );
}

// ── Styles ─────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.background },

  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: Spacing.md, paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  headerTitle: { ...Font.h4, color: Colors.text },
  cancelBtn: { ...Font.body, color: Colors.textSecondary },
  saveActionBtn: { ...Font.label, color: Colors.error, fontWeight: '700' },
  saveActionBtnDisabled: { opacity: 0.35 },

  activityRow: {
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: Spacing.md,
    paddingVertical: 14, gap: 12, borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  activityIcon: { width: 40, height: 40, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  activityLabel: { ...Font.body, color: Colors.text, flex: 1 },

  builderScroll: { paddingBottom: 60 },
  nameInput: {
    ...Font.h4, color: Colors.text,
    paddingHorizontal: Spacing.md, paddingVertical: 16,
    borderBottomWidth: 1, borderBottomColor: Colors.border,
  },

  // Regular step card
  stepCard: {
    flexDirection: 'row',
    marginHorizontal: Spacing.md, marginTop: 10,
    backgroundColor: Colors.surface, borderRadius: Radius.md, overflow: 'hidden',
  },
  stepAccent: { width: 4 },
  stepCardBody: { flex: 1, flexDirection: 'row', alignItems: 'center', padding: 14, gap: 10 },
  stepCardName: { ...Font.label, color: Colors.text },
  stepCardMeta: { ...Font.small, color: Colors.textSecondary, marginTop: 2 },

  // Add exercise
  addExerciseBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    marginHorizontal: Spacing.md, marginTop: 14, paddingVertical: 16,
    borderRadius: Radius.md, borderWidth: 1, borderColor: Colors.primary + '55', borderStyle: 'dashed',
    gap: 8,
  },
  addExerciseBtnText: { ...Font.label, color: Colors.primary },

  // Interval block
  intervalBlock: {
    marginHorizontal: Spacing.md, marginTop: 10,
    backgroundColor: Colors.surface, borderRadius: Radius.md, overflow: 'hidden',
    borderWidth: 1, borderColor: Colors.border,
  },
  intervalHeader: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 14, paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: Colors.border,
    gap: 8,
  },
  intervalRepeatBtn: {
    width: 30, height: 30, borderRadius: 8,
    backgroundColor: Colors.border, alignItems: 'center', justifyContent: 'center',
  },
  intervalRepeatLabel: { ...Font.label, color: Colors.text, flex: 1, textAlign: 'center' },
  intervalActions: { flexDirection: 'row', gap: 16, marginLeft: 8 },

  // Sub-steps
  subStepRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: 12, paddingRight: 14,
    borderBottomWidth: 1, borderBottomColor: Colors.border + '88',
    gap: 12,
  },
  subStepAccent: { width: 4, height: 40, marginLeft: 4 },
  subStepInfo: { flex: 1 },
  subStepTitle: { ...Font.label, color: Colors.text },
  subStepMeta: { ...Font.tiny, color: Colors.textSecondary, marginTop: 3 },

  subStepAdd: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    paddingVertical: 10, gap: 6,
  },
  subStepAddText: { ...Font.small, color: Colors.primary },

  // Exercise picker grid
  exerciseGrid: { flexDirection: 'row', flexWrap: 'wrap', padding: Spacing.md, gap: 12 },
  exerciseCard: {
    width: '47%', backgroundColor: Colors.surface, borderRadius: Radius.md, padding: 14,
    overflow: 'hidden', gap: 6,
  },
  exerciseCardName: { ...Font.label, color: Colors.text },
  exerciseCardTime: { ...Font.small, color: Colors.textSecondary },
  exerciseBarTrack: { height: 4, backgroundColor: Colors.border, borderRadius: 2, marginTop: 4 },
  exerciseBarFill: { height: 4, borderRadius: 2 },

  // Step editor
  editorSection: {
    marginHorizontal: Spacing.md, marginTop: 20,
    backgroundColor: Colors.surface, borderRadius: Radius.md, overflow: 'hidden',
  },
  dropRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  dropLabel: { ...Font.body, color: Colors.text },
  dropValue: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  dropValueText: { ...Font.body, color: Colors.textSecondary },
  dropMenu: { borderTopWidth: 1, borderTopColor: Colors.border },
  dropMenuItem: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: Colors.border + '55',
  },
  dropMenuItemActive: { backgroundColor: Colors.primaryFade },
  dropMenuText: { ...Font.body, color: Colors.textSecondary },
  dropMenuTextActive: { color: Colors.primary },
});
