import React, { useState, useRef, useMemo, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Animated,
  PanResponder,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Font, Radius, Spacing } from '@/constants/theme';

// ── Types ─────────────────────────────────────────────────────────────────

export type ActivityType = 'run' | 'alternative' | 'strength' | 'rest';
export type RunType = 'easy' | 'interval' | 'long';
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
  runType?: RunType;
  name: string;
  steps: WorkoutStep[];
};

// ── Constants ──────────────────────────────────────────────────────────────

const ACTIVITY_TYPES: { value: ActivityType; label: string; icon: string; color: string }[] = [
  { value: 'run',         label: 'Run',         icon: 'walk-outline',    color: Colors.gold },
  { value: 'alternative', label: 'Alternative',  icon: 'bicycle-outline', color: '#4CAF50' },
  { value: 'strength',    label: 'Strength',     icon: 'barbell-outline', color: '#9C27B0' },
  { value: 'rest',        label: 'Rest',         icon: 'moon-outline',    color: Colors.textMuted },
];

const RUN_TYPES: { value: RunType; label: string }[] = [
  { value: 'easy',     label: 'Easy Run' },
  { value: 'interval', label: 'Interval' },
  { value: 'long',     label: 'Long Run' },
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
    'Recovery (< 75%)','Zone 2 (75-84%)','Aerobic (85-90%)',
    'Aerobic Power (91-95%)','Anaerobic Endurance (96-100%)','VO2 Max (> 100%)',
  ],
  pace: ['Recovery pace','Easy pace','Marathon pace','Half Marathon pace','10K pace','5K pace','Mile pace'],
  power: ['Active Recovery (< 55%)','Endurance (56-75%)','Tempo (76-90%)','Threshold (91-105%)','VO2 Max (106-120%)','Anaerobic (> 120%)'],
  open: ['—'],
};

// Heights for drag-to-reorder (must match rendered row heights)
const SUBSTEP_H  = 64; // sub-step row inside an interval block
const MAINSTEP_H = 70; // main step card in strength/alternative

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
  return { id: uid(), stepType: type, targetKind: 'time', targetValue: def.defaultTime, intensityKind: 'open', intensityRange: '—' };
}

function makeIntervalStep(): IntervalStep {
  return {
    id: uid(), stepType: 'interval', repeatCount: 1,
    subSteps: [
      { ...makeBaseStep('training'), targetValue: '04:00' },
      { ...makeBaseStep('rest'),     targetValue: '02:00' },
    ],
  };
}

function minsToTargetValue(raw: string): string {
  const n = parseInt(raw) || 0;
  return `${n}:00`;
}
function targetValueToMins(val: string): string {
  return val.split(':')[0] ?? '';
}

function reorderArr<T>(arr: T[], from: number, to: number): T[] {
  const r = [...arr];
  const [item] = r.splice(from, 1);
  r.splice(to, 0, item);
  return r;
}

// ── Drag-to-reorder (fixed-height items) ──────────────────────────────────
// Uses PanResponder + RN Animated (no react-native-reanimated) to avoid
// Exception in HostFunction when Reanimated initialises on first import.

/** Single draggable row — isActive/shiftAnim/dragPan come from DraggableStepList */
function DraggableRow({
  isActive, shiftAnim, dragPan, onDragStart, onDragMove, onDragEnd, itemHeight, children,
}: {
  isActive: boolean;
  shiftAnim: Animated.Value;
  dragPan: Animated.Value;
  onDragStart: () => void;
  onDragMove: (dy: number) => void;
  onDragEnd: () => void;
  itemHeight: number;
  children: React.ReactNode;
}) {
  // Keep callbacks in a ref so the PanResponder (created once) always sees latest
  const cb = useRef({ onDragStart, onDragMove, onDragEnd });
  cb.current = { onDragStart, onDragMove, onDragEnd };

  const pan = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant:    ()         => cb.current.onDragStart(),
      onPanResponderMove:     (_, gs)    => cb.current.onDragMove(gs.dy),
      onPanResponderRelease:  ()         => cb.current.onDragEnd(),
      onPanResponderTerminate: ()        => cb.current.onDragEnd(),
    })
  ).current;

  const translateY = isActive ? dragPan : shiftAnim;

  return (
    <Animated.View style={[
      s.draggableRow,
      { height: itemHeight, transform: [{ translateY }] },
      isActive && { zIndex: 99, elevation: 10, shadowOpacity: 0.2, shadowRadius: 8 },
    ]}>
      {/* Drag handle — only this area responds to the PanResponder */}
      <View {...pan.panHandlers} style={s.dragHandle}>
        <Ionicons name="menu-outline" size={18} color={Colors.textMuted} />
      </View>
      <View style={s.draggableRowContent}>{children}</View>
    </Animated.View>
  );
}

/** Container that owns shared animation state for a fixed-height draggable list */
function DraggableStepList<T extends { id: string }>({
  items, itemHeight, renderItem, onReorder, setScrollEnabled,
}: {
  items: T[];
  itemHeight: number;
  renderItem: (item: T) => React.ReactNode;
  onReorder: (from: number, to: number) => void;
  setScrollEnabled: (v: boolean) => void;
}) {
  const [activeIdx, setActiveIdx] = useState(-1);

  // One Animated.Value per slot for the spring-shift of non-dragged items
  const shiftAnims = useRef<Animated.Value[]>([]);
  while (shiftAnims.current.length < items.length) {
    shiftAnims.current.push(new Animated.Value(0));
  }

  // The Y-translation of the currently dragged item
  const dragPan = useRef(new Animated.Value(0)).current;

  // Mutable refs so PanResponder callbacks don't capture stale state
  const activeIdxRef  = useRef(-1);
  const targetIdxRef  = useRef(-1);
  const itemsLenRef   = useRef(items.length);
  itemsLenRef.current = items.length;

  // Spring non-active items out of the way
  function updateShifts(fromIdx: number, toIdx: number) {
    shiftAnims.current.forEach((anim, i) => {
      if (i === fromIdx) return;
      let shift = 0;
      if (fromIdx < toIdx && i > fromIdx && i <= toIdx) shift = -itemHeight;
      else if (fromIdx > toIdx && i < fromIdx && i >= toIdx) shift = itemHeight;
      Animated.spring(anim, { toValue: shift, useNativeDriver: true, speed: 24, bounciness: 4 }).start();
    });
  }

  function handleDragStart(idx: number) {
    activeIdxRef.current = idx;
    targetIdxRef.current = idx;
    dragPan.setValue(0);
    setActiveIdx(idx);
    setScrollEnabled(false);
  }

  function handleDragMove(idx: number, dy: number) {
    const n = itemsLenRef.current;
    const lo = -idx * itemHeight;
    const hi = (n - 1 - idx) * itemHeight;
    const clamped = dy < lo ? lo : dy > hi ? hi : dy;
    dragPan.setValue(clamped);

    const newTarget = Math.min(n - 1, Math.max(0, idx + Math.round(clamped / itemHeight)));
    if (newTarget !== targetIdxRef.current) {
      targetIdxRef.current = newTarget;
      updateShifts(idx, newTarget);
    }
  }

  function handleDragEnd(idx: number) {
    const from = idx;
    const to   = targetIdxRef.current;
    activeIdxRef.current = -1;
    targetIdxRef.current = -1;

    // Reset all shift animations immediately (React will re-render with new order)
    shiftAnims.current.forEach((a) => a.setValue(0));
    dragPan.setValue(0);

    setActiveIdx(-1);
    setScrollEnabled(true);
    if (to !== from) onReorder(from, to);
  }

  return (
    <View style={{ overflow: 'visible' }}>
      {items.map((item, i) => (
        <DraggableRow
          key={item.id}
          isActive={activeIdx === i}
          itemHeight={itemHeight}
          shiftAnim={shiftAnims.current[i] ?? new Animated.Value(0)}
          dragPan={dragPan}
          onDragStart={() => handleDragStart(i)}
          onDragMove={(dy) => handleDragMove(i, dy)}
          onDragEnd={() => handleDragEnd(i)}
        >
          {renderItem(item)}
        </DraggableRow>
      ))}
    </View>
  );
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
        <Text style={s.headerTitle}>Activity Type</Text>
        <View style={{ width: 32 }} />
      </View>
      <View style={s.activityList}>
        {ACTIVITY_TYPES.map((a) => (
          <TouchableOpacity key={a.value} style={s.activityPickerRow} onPress={() => { onPick(a.value); onBack(); }}>
            <View style={[s.activityIcon, { backgroundColor: a.color + '22' }]}>
              <Ionicons name={a.icon as any} size={22} color={a.color} />
            </View>
            <Text style={s.activityLabel}>{a.label}</Text>
            {selected === a.value
              ? <Ionicons name="checkmark-circle" size={20} color={Colors.primary} />
              : <Ionicons name="chevron-forward" size={18} color={Colors.textMuted} />}
          </TouchableOpacity>
        ))}
      </View>
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
        <Text style={s.headerTitle}>Add Step</Text>
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
  const isSimple = step.stepType === 'warmup' || step.stepType === 'cooldown';

  const [stepType, setStepType]         = useState<Exclude<StepType, 'interval'>>(step.stepType);
  const [targetKind, setTargetKind]     = useState<TargetKind>('time');
  const [targetValue, setTargetValue]   = useState(step.targetValue);
  const [intensityKind, setIntensityKind]   = useState<IntensityKind>(step.intensityKind);
  const [intensityRange, setIntensityRange] = useState(step.intensityRange || INTENSITY_RANGES[step.intensityKind][0]);
  const [openDrop, setOpenDrop]         = useState<string | null>(null);

  function toggle(key: string) { setOpenDrop((p) => (p === key ? null : key)); }

  return (
    <SafeAreaView style={s.screen}>
      <View style={s.header}>
        <TouchableOpacity onPress={onBack} hitSlop={12}><Text style={s.cancelBtn}>Cancel</Text></TouchableOpacity>
        <Text style={s.headerTitle}>Edit Step</Text>
        <TouchableOpacity hitSlop={12} onPress={() =>
          onSave({ ...step, stepType, targetKind: isSimple ? 'time' : targetKind, targetValue, intensityKind, intensityRange })
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
            label="Duration" value={targetValue}
            options={TIME_OPTIONS}
            open={openDrop === 'targetValue'} onToggle={() => toggle('targetValue')}
            onSelect={setTargetValue}
          />
        </View>

        {/* Warmup / cooldown: time only, no target-type or intensity pickers */}
        {!isSimple && (
          <>
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
              {targetKind === 'distance' && (
                <DropdownRow
                  label="Distance" value={targetValue} options={DIST_OPTIONS}
                  open={openDrop === 'distValue'} onToggle={() => toggle('distValue')}
                  onSelect={setTargetValue}
                />
              )}
            </View>
            <View style={s.editorSection}>
              <DropdownRow
                label="Intensity"
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
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

// ── Interval block ────────────────────────────────────────────────────────

function IntervalBlock({
  step, index, total, onChange, onDelete, onMoveUp, onMoveDown,
  onEditSubStep, onAddSubStep, setScrollEnabled,
}: {
  step: IntervalStep;
  index: number;
  total: number;
  onChange: (updated: IntervalStep) => void;
  onDelete: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onEditSubStep: (sub: BaseStep) => void;
  onAddSubStep: () => void;
  setScrollEnabled: (v: boolean) => void;
}) {
  function setRepeat(delta: number) {
    onChange({ ...step, repeatCount: Math.max(1, Math.min(99, step.repeatCount + delta)) });
  }

  function reorderSubSteps(from: number, to: number) {
    onChange({ ...step, subSteps: reorderArr(step.subSteps, from, to) });
  }

  return (
    <View style={s.intervalBlock}>
      {/* Header row */}
      <View style={s.intervalHeader}>
        <TouchableOpacity onPress={() => setRepeat(-1)} style={s.intervalRepeatBtn} hitSlop={10}>
          <Ionicons name="remove" size={18} color={Colors.text} />
        </TouchableOpacity>
        <Text style={s.intervalRepeatLabel}>Repeat  {step.repeatCount}×</Text>
        <TouchableOpacity onPress={() => setRepeat(1)} style={s.intervalRepeatBtn} hitSlop={10}>
          <Ionicons name="add" size={18} color={Colors.text} />
        </TouchableOpacity>

        {/* Reorder arrows for the block itself */}
        <View style={s.blockMoveRow}>
          <TouchableOpacity
            onPress={onMoveUp}
            disabled={index === 0}
            hitSlop={8}
            style={[s.blockMoveBtn, index === 0 && s.blockMoveBtnDisabled]}
          >
            <Ionicons name="chevron-up" size={15} color={index === 0 ? Colors.border : Colors.textSecondary} />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={onMoveDown}
            disabled={index === total - 1}
            hitSlop={8}
            style={[s.blockMoveBtn, index === total - 1 && s.blockMoveBtnDisabled]}
          >
            <Ionicons name="chevron-down" size={15} color={index === total - 1 ? Colors.border : Colors.textSecondary} />
          </TouchableOpacity>
        </View>

        <TouchableOpacity onPress={onDelete} hitSlop={10} style={{ marginLeft: 4 }}>
          <Ionicons name="trash-outline" size={17} color={Colors.textMuted} />
        </TouchableOpacity>
      </View>

      {/* Sub-steps — drag-to-reorder */}
      <DraggableStepList
        items={step.subSteps}
        itemHeight={SUBSTEP_H}
        onReorder={reorderSubSteps}
        setScrollEnabled={setScrollEnabled}
        renderItem={(sub) => (
          <TouchableOpacity style={s.subStepInner} onPress={() => onEditSubStep(sub)} activeOpacity={0.75}>
            <View style={[s.subStepAccent, { backgroundColor: stepColor(sub.stepType) }]} />
            <View style={s.subStepInfo}>
              <Text style={s.subStepTitle}>{stepLabel(sub.stepType)}</Text>
              <Text style={s.subStepMeta}>
                {sub.targetValue}
                {sub.intensityKind !== 'open' ? `  ·  ${sub.intensityRange}` : ''}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={15} color={Colors.textMuted} style={{ marginRight: 12 }} />
          </TouchableOpacity>
        )}
      />

      <TouchableOpacity style={s.subStepAdd} onPress={onAddSubStep}>
        <Ionicons name="add" size={16} color={Colors.primary} />
        <Text style={s.subStepAddText}>Add step</Text>
      </TouchableOpacity>
    </View>
  );
}

// ── Builder screen ────────────────────────────────────────────────────────

function BuilderScreen({
  workout, onChange, onSave, onDismiss, onPickActivity, onAddStep,
  onAddSubStep, onEditStep, onEditSubStep,
}: {
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
  const [scrollEnabled, setScrollEnabled] = useState(true);

  const activity   = ACTIVITY_TYPES.find((a) => a.value === workout.activityType);
  const runType    = workout.runType ?? 'easy';
  const isSimpleRun = workout.activityType === 'run' && (runType === 'easy' || runType === 'long');
  const isIntervalRun = workout.activityType === 'run' && runType === 'interval';
  const isStepBased = workout.activityType === 'strength' || workout.activityType === 'alternative';

  const simpleMinutes = isSimpleRun && workout.steps[0]
    ? targetValueToMins((workout.steps[0] as BaseStep).targetValue)
    : '';

  function setSimpleMinutes(raw: string) {
    if (!raw) { onChange({ ...workout, steps: [] }); return; }
    const step = makeBaseStep('training');
    step.targetValue = minsToTargetValue(raw);
    onChange({ ...workout, steps: [step] });
  }

  function setRunType(rt: RunType) {
    onChange({ ...workout, runType: rt, steps: [] });
  }

  function removeStep(id: string) {
    onChange({ ...workout, steps: workout.steps.filter((s) => s.id !== id) });
  }

  function reorderMainSteps(from: number, to: number) {
    onChange({ ...workout, steps: reorderArr(workout.steps, from, to) });
  }

  function reorderIntervals(from: number, to: number) {
    onChange({ ...workout, steps: reorderArr(workout.steps, from, to) });
  }

  function updateInterval(updated: IntervalStep) {
    onChange({ ...workout, steps: workout.steps.map((s) => s.id === updated.id ? updated : s) });
  }

  const intervalSteps = workout.steps.filter((s) => s.stepType === 'interval') as IntervalStep[];

  return (
    <SafeAreaView style={s.screen}>
      <View style={s.header}>
        <TouchableOpacity onPress={onDismiss} hitSlop={12}><Text style={s.cancelBtn}>Cancel</Text></TouchableOpacity>
        <Text style={s.headerTitle}>
          {workout.activityType === 'rest' ? 'Rest Day' : 'Create Workout'}
        </Text>
        <TouchableOpacity onPress={onSave} hitSlop={12}>
          <Text style={[s.saveActionBtn, !workout.name.trim() && workout.activityType !== 'rest' && s.saveActionBtnDisabled]}>
            Save
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        scrollEnabled={scrollEnabled}
        contentContainerStyle={s.builderScroll}
        keyboardShouldPersistTaps="handled"
      >
        {/* Activity type */}
        <TouchableOpacity style={s.activityRow} onPress={onPickActivity}>
          <View style={[s.activityIcon, { backgroundColor: (activity?.color ?? Colors.primary) + '22' }]}>
            <Ionicons name={(activity?.icon ?? 'walk-outline') as any} size={22} color={activity?.color ?? Colors.primary} />
          </View>
          <Text style={[s.activityLabel, { color: activity?.color ?? Colors.primary }]}>{activity?.label ?? 'Run'}</Text>
          <Ionicons name="chevron-down" size={16} color={Colors.textMuted} style={{ marginLeft: 4 }} />
        </TouchableOpacity>

        {workout.activityType === 'rest' ? (
          <View style={s.restNote}>
            <Ionicons name="moon-outline" size={32} color={Colors.textMuted} />
            <Text style={s.restNoteText}>Rest day — no workout scheduled</Text>
          </View>
        ) : (
          <>
            {/* Workout name */}
            <TextInput
              style={s.nameInput}
              value={workout.name}
              onChangeText={(v) => onChange({ ...workout, name: v })}
              placeholder="Workout name"
              placeholderTextColor={Colors.textMuted}
              autoFocus={workout.name === ''}
            />

            {/* Run type chips */}
            {workout.activityType === 'run' && (
              <View style={s.runTypeRow}>
                {RUN_TYPES.map((rt) => (
                  <TouchableOpacity
                    key={rt.value}
                    style={[s.runTypeChip, runType === rt.value && s.runTypeChipActive]}
                    onPress={() => setRunType(rt.value)}
                  >
                    <Text style={[s.runTypeChipText, runType === rt.value && s.runTypeChipTextActive]}>
                      {rt.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}

            {/* Easy / Long Run: minutes input only */}
            {isSimpleRun && (
              <View style={s.minutesBlock}>
                <Text style={s.minutesLabel}>Duration</Text>
                <View style={s.minutesInputRow}>
                  <TextInput
                    style={s.minutesInput}
                    value={simpleMinutes}
                    onChangeText={setSimpleMinutes}
                    keyboardType="numeric"
                    placeholder="45"
                    placeholderTextColor={Colors.textMuted}
                    maxLength={3}
                  />
                  <Text style={s.minutesSuffix}>min</Text>
                </View>
              </View>
            )}

            {/* Interval run: interval blocks with ↑↓ reorder */}
            {isIntervalRun && (
              <>
                {intervalSteps.map((step, i) => (
                  <IntervalBlock
                    key={step.id}
                    step={step}
                    index={i}
                    total={intervalSteps.length}
                    onChange={updateInterval}
                    onDelete={() => removeStep(step.id)}
                    onMoveUp={() => reorderIntervals(i, i - 1)}
                    onMoveDown={() => reorderIntervals(i, i + 1)}
                    onEditSubStep={(sub) => onEditSubStep(step.id, sub)}
                    onAddSubStep={() => onAddSubStep(step.id)}
                    setScrollEnabled={setScrollEnabled}
                  />
                ))}
                <TouchableOpacity
                  style={s.addExerciseBtn}
                  onPress={() => onChange({ ...workout, steps: [...workout.steps, makeIntervalStep()] })}
                >
                  <Ionicons name="add" size={18} color={Colors.primary} />
                  <Text style={s.addExerciseBtnText}>Add Interval</Text>
                </TouchableOpacity>
              </>
            )}

            {/* Strength / Alternative: draggable step cards */}
            {isStepBased && (
              <>
                {workout.steps.length > 0 && (
                  <View style={s.stepListHint}>
                    <Ionicons name="menu-outline" size={13} color={Colors.textMuted} />
                    <Text style={s.stepListHintText}>Hold & drag to reorder</Text>
                  </View>
                )}
                <DraggableStepList
                  items={workout.steps as BaseStep[]}
                  itemHeight={MAINSTEP_H}
                  onReorder={reorderMainSteps}
                  setScrollEnabled={setScrollEnabled}
                  renderItem={(step) => {
                    const def = STEP_DEFS.find((d) => d.type === (step as BaseStep).stepType);
                    return (
                      <TouchableOpacity
                        style={s.stepCardInner}
                        onPress={() => onEditStep(step as BaseStep)}
                        activeOpacity={0.8}
                      >
                        <View style={[s.stepAccent, { backgroundColor: def?.color ?? Colors.border }]} />
                        <View style={s.stepCardBody}>
                          <View style={{ flex: 1 }}>
                            <Text style={s.stepCardName}>{def?.label ?? step.stepType}</Text>
                            <Text style={s.stepCardMeta}>
                              {(step as BaseStep).targetValue}
                              {(step as BaseStep).intensityKind !== 'open' ? `  ·  ${(step as BaseStep).intensityRange}` : ''}
                            </Text>
                          </View>
                          <TouchableOpacity onPress={() => removeStep(step.id)} hitSlop={12}>
                            <Ionicons name="trash-outline" size={17} color={Colors.textMuted} />
                          </TouchableOpacity>
                        </View>
                      </TouchableOpacity>
                    );
                  }}
                />
                <TouchableOpacity style={s.addExerciseBtn} onPress={onAddStep}>
                  <Ionicons name="add" size={18} color={Colors.primary} />
                  <Text style={s.addExerciseBtnText}>Add Step</Text>
                </TouchableOpacity>
              </>
            )}
          </>
        )}
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
  const [screen, setScreen]           = useState<Screen>('builder');
  const [workout, setWorkout]         = useState<StructuredWorkout>(
    initial ?? { activityType: 'run', runType: 'easy', name: '', steps: [] }
  );
  const [editTarget, setEditTarget]   = useState<EditTarget | null>(null);
  const [addingSubId, setAddingSubId] = useState<string | null>(null);

  React.useEffect(() => {
    if (visible) {
      setWorkout(initial ?? { activityType: 'run', runType: 'easy', name: '', steps: [] });
      setScreen('builder');
      setEditTarget(null);
      setAddingSubId(null);
    }
  }, [visible]);

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

  function handlePickMainStep(type: StepType) {
    if (type === 'interval') {
      setWorkout((w) => ({ ...w, steps: [...w.steps, makeIntervalStep()] }));
      setScreen('builder');
    } else {
      const step = makeBaseStep(type as Exclude<StepType, 'interval'>);
      setWorkout((w) => ({ ...w, steps: [...w.steps, step] }));
      setEditTarget({ kind: 'step', stepId: step.id });
      setScreen('step_editor');
    }
  }

  function handleSave() {
    if (workout.activityType === 'rest') {
      onSave({ ...workout, name: workout.name || 'Rest', steps: [] });
      return;
    }
    if (!workout.name.trim()) return;
    onSave(workout);
  }

  const editingStep = resolveEditingStep();

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      {screen === 'builder' && (
        <BuilderScreen
          workout={workout}
          onChange={setWorkout}
          onSave={handleSave}
          onDismiss={onDismiss}
          onPickActivity={() => setScreen('activity')}
          onAddStep={() => setScreen('exercise_picker')}
          onAddSubStep={(id) => { setAddingSubId(id); setScreen('substep_picker'); }}
          onEditStep={handleEditStep}
          onEditSubStep={handleEditSubStep}
        />
      )}
      {screen === 'activity' && (
        <ActivityPickerScreen
          selected={workout.activityType}
          onPick={(a) => setWorkout((w) => ({ ...w, activityType: a, runType: a === 'run' ? (w.runType ?? 'easy') : undefined, steps: [] }))}
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
  saveActionBtn: { ...Font.label, color: Colors.primary, fontWeight: '700' },
  saveActionBtnDisabled: { opacity: 0.35 },

  // Activity row
  activityRow: {
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: Spacing.md,
    paddingVertical: 14, gap: 12, borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  activityIcon: { width: 40, height: 40, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  activityLabel: { ...Font.body, color: Colors.text, flex: 1 },

  activityList: { paddingVertical: 8 },
  activityPickerRow: {
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: Spacing.md,
    paddingVertical: 14, gap: 14, borderBottomWidth: 1, borderBottomColor: Colors.border,
  },

  builderScroll: { paddingBottom: 60 },
  nameInput: {
    ...Font.h4, color: Colors.text,
    paddingHorizontal: Spacing.md, paddingVertical: 16,
    borderBottomWidth: 1, borderBottomColor: Colors.border,
  },

  // Run type chips
  runTypeRow: {
    flexDirection: 'row', gap: 10,
    paddingHorizontal: Spacing.md, paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  runTypeChip: {
    flex: 1, paddingVertical: 10, alignItems: 'center',
    borderRadius: Radius.md, borderWidth: 1, borderColor: Colors.border, backgroundColor: Colors.card,
  },
  runTypeChipActive: { backgroundColor: Colors.primaryFade, borderColor: Colors.primary },
  runTypeChipText: { ...Font.small, color: Colors.textSecondary, fontWeight: '600' },
  runTypeChipTextActive: { color: Colors.primary },

  // Minutes input
  minutesBlock: {
    paddingHorizontal: Spacing.md, paddingVertical: 20, gap: 12,
    borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  minutesLabel: { ...Font.label, color: Colors.textSecondary },
  minutesInputRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  minutesInput: {
    ...Font.h2, color: Colors.text, backgroundColor: Colors.card,
    borderRadius: Radius.md, borderWidth: 1, borderColor: Colors.border,
    paddingHorizontal: 20, paddingVertical: 14,
    minWidth: 100, textAlign: 'center',
  },
  minutesSuffix: { ...Font.h4, color: Colors.textSecondary },

  // Rest day
  restNote: { alignItems: 'center', paddingVertical: 48, gap: 12 },
  restNoteText: { ...Font.body, color: Colors.textMuted },

  // ── Drag-to-reorder ────────────────────────────────────────────────────

  draggableRow: {
    flexDirection: 'row',
    alignItems: 'stretch',
    backgroundColor: Colors.surface,
    // Shadow for when lifted (iOS) — shadow is animated via animated style
    shadowColor: '#000',
  },
  dragHandle: {
    width: 40, alignItems: 'center', justifyContent: 'center',
    borderRightWidth: 1, borderRightColor: Colors.border + '66',
  },
  draggableRowContent: { flex: 1 },

  // Hint text above draggable list
  stepListHint: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: Spacing.md, paddingTop: 14, paddingBottom: 2,
  },
  stepListHintText: { ...Font.tiny, color: Colors.textMuted },

  // ── Step cards (Strength / Alternative) ───────────────────────────────

  stepCardInner: {
    flexDirection: 'row', flex: 1,
    height: MAINSTEP_H, overflow: 'hidden',
  },
  stepAccent: { width: 4 },
  stepCardBody: {
    flex: 1, flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 14, gap: 10,
  },
  stepCardName: { ...Font.label, color: Colors.text },
  stepCardMeta: { ...Font.small, color: Colors.textSecondary, marginTop: 2 },

  // ── Add buttons ────────────────────────────────────────────────────────

  addExerciseBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    marginHorizontal: Spacing.md, marginTop: 12, paddingVertical: 16,
    borderRadius: Radius.md, borderWidth: 1,
    borderColor: Colors.primary + '55', borderStyle: 'dashed', gap: 8,
  },
  addExerciseBtnText: { ...Font.label, color: Colors.primary },

  // ── Interval block ─────────────────────────────────────────────────────

  intervalBlock: {
    marginHorizontal: Spacing.md, marginTop: 12,
    backgroundColor: Colors.surface, borderRadius: Radius.md,
    borderWidth: 1, borderColor: Colors.border, overflow: 'hidden',
  },
  intervalHeader: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 14, paddingVertical: 11,
    borderBottomWidth: 1, borderBottomColor: Colors.border, gap: 8,
  },
  intervalRepeatBtn: {
    width: 28, height: 28, borderRadius: 7,
    backgroundColor: Colors.border, alignItems: 'center', justifyContent: 'center',
  },
  intervalRepeatLabel: { ...Font.label, color: Colors.text, flex: 1, textAlign: 'center' },

  // Block-level up/down arrows
  blockMoveRow: { flexDirection: 'row', gap: 2 },
  blockMoveBtn: {
    width: 26, height: 26, borderRadius: 6,
    backgroundColor: Colors.card, alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: Colors.border,
  },
  blockMoveBtnDisabled: { opacity: 0.35 },

  // Sub-steps
  subStepInner: {
    flexDirection: 'row', alignItems: 'center',
    height: SUBSTEP_H, overflow: 'hidden',
  },
  subStepAccent: { width: 4, height: 36, marginLeft: 8 },
  subStepInfo: { flex: 1, paddingHorizontal: 10 },
  subStepTitle: { ...Font.label, color: Colors.text },
  subStepMeta: { ...Font.tiny, color: Colors.textSecondary, marginTop: 3 },
  subStepAdd: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    paddingVertical: 10, gap: 6, borderTopWidth: 1, borderTopColor: Colors.border + '88',
  },
  subStepAddText: { ...Font.small, color: Colors.primary },

  // ── Exercise picker grid ───────────────────────────────────────────────

  exerciseGrid: { flexDirection: 'row', flexWrap: 'wrap', padding: Spacing.md, gap: 12 },
  exerciseCard: {
    width: '47%', backgroundColor: Colors.surface, borderRadius: Radius.md, padding: 14, gap: 6,
  },
  exerciseCardName: { ...Font.label, color: Colors.text },
  exerciseCardTime: { ...Font.small, color: Colors.textSecondary },
  exerciseBarTrack: { height: 4, backgroundColor: Colors.border, borderRadius: 2, marginTop: 4 },
  exerciseBarFill: { height: 4, borderRadius: 2 },

  // ── Step editor ────────────────────────────────────────────────────────

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
