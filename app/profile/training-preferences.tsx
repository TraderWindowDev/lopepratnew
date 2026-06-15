import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useStore } from '@/hooks/useStore';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { Colors, Font, Spacing, Radius } from '@/constants/theme';
import { Card } from '@/components/ui/Card';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import type { GoalType } from '@/constants/mock-data';

const GOALS: { value: GoalType; label: string; sub: string }[] = [
  { value: 'first_5k', label: 'First 5K', sub: 'Complete your first 5K race' },
  { value: 'first_10k', label: 'First 10K', sub: 'Step up to 10 kilometres' },
  { value: 'first_half', label: 'First Half Marathon', sub: '21.1 km endurance goal' },
  { value: 'first_marathon', label: 'First Marathon', sub: 'The full 42.2 km challenge' },
  { value: 'pb_half', label: 'Half Marathon PB', sub: 'Chase a new personal best' },
  { value: 'pb_marathon', label: 'Marathon PB', sub: 'Beat your marathon record' },
];

const FITNESS_LEVELS = [
  { value: 'beginner', label: 'Beginner', icon: 'leaf-outline', color: Colors.easy },
  { value: 'intermediate', label: 'Intermediate', icon: 'trending-up-outline', color: Colors.gold },
  { value: 'advanced', label: 'Advanced', icon: 'flash-outline', color: Colors.primary },
] as const;

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

const KM_OPTIONS = [20, 30, 40, 50, 60, 70, 80, 100];

export default function TrainingPreferencesScreen() {
  const { athlete, session, refreshAthleteState } = useStore();

  const [goal, setGoal] = useState<GoalType>(athlete.goal);
  const [fitnessLevel, setFitnessLevel] = useState(athlete.fitnessLevel);
  const [weeklyTarget, setWeeklyTarget] = useState(athlete.weeklyMileageTarget);
  const [preferredDays, setPreferredDays] = useState<boolean[]>([true, false, true, false, true, true, false]);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  function toggleDay(i: number) {
    setPreferredDays(prev => prev.map((v, idx) => idx === i ? !v : v));
    setSaved(false);
  }

  async function handleSave() {
    if (!session?.user) return;
    setSaving(true);
    setSaved(false);
    try {
      if (isSupabaseConfigured) {
        const { error } = await supabase
          .from('athletes')
          .update({ goal, fitness_level: fitnessLevel, weekly_mileage_target: weeklyTarget })
          .eq('id', session.user.id);
        if (error) throw error;
        await refreshAthleteState();
      }
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (e: any) {
      Alert.alert('Error', e.message ?? 'Failed to save preferences');
    } finally {
      setSaving(false);
    }
  }

  const hasChanges =
    goal !== athlete.goal ||
    fitnessLevel !== athlete.fitnessLevel ||
    weeklyTarget !== athlete.weeklyMileageTarget;

  return (
    <View style={styles.container}>
      <ScreenHeader title="Training Preferences" />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>

        {/* Goal */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>TRAINING GOAL</Text>
          <View style={styles.goalGrid}>
            {GOALS.map(g => (
              <TouchableOpacity
                key={g.value}
                style={[styles.goalCard, goal === g.value && styles.goalCardActive]}
                onPress={() => { setGoal(g.value); setSaved(false); }}
              >
                <Text style={[styles.goalLabel, goal === g.value && styles.goalLabelActive]}>
                  {g.label}
                </Text>
                <Text style={styles.goalSub}>{g.sub}</Text>
                {goal === g.value && (
                  <View style={styles.goalCheck}>
                    <Ionicons name="checkmark-circle" size={16} color={Colors.primary} />
                  </View>
                )}
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Fitness level */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>FITNESS LEVEL</Text>
          <View style={styles.levelRow}>
            {FITNESS_LEVELS.map(l => (
              <TouchableOpacity
                key={l.value}
                style={[styles.levelCard, fitnessLevel === l.value && { borderColor: l.color, backgroundColor: l.color + '15' }]}
                onPress={() => { setFitnessLevel(l.value); setSaved(false); }}
              >
                <Ionicons name={l.icon as any} size={22} color={fitnessLevel === l.value ? l.color : Colors.textMuted} />
                <Text style={[styles.levelLabel, fitnessLevel === l.value && { color: l.color }]}>
                  {l.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Weekly mileage target */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>WEEKLY MILEAGE TARGET</Text>
          <Card padding={16}>
            <View style={styles.kmDisplay}>
              <Text style={styles.kmValue}>{weeklyTarget}</Text>
              <Text style={styles.kmUnit}>km / week</Text>
            </View>
            <View style={styles.kmOptions}>
              {KM_OPTIONS.map(km => (
                <TouchableOpacity
                  key={km}
                  style={[styles.kmChip, weeklyTarget === km && styles.kmChipActive]}
                  onPress={() => { setWeeklyTarget(km); setSaved(false); }}
                >
                  <Text style={[styles.kmChipText, weeklyTarget === km && styles.kmChipTextActive]}>
                    {km}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </Card>
        </View>

        {/* Preferred training days */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>PREFERRED TRAINING DAYS</Text>
          <Card padding={16}>
            <Text style={styles.dayHint}>Select the days you prefer to train</Text>
            <View style={styles.daysRow}>
              {DAYS.map((day, i) => (
                <TouchableOpacity
                  key={day}
                  style={[styles.dayChip, preferredDays[i] && styles.dayChipActive]}
                  onPress={() => toggleDay(i)}
                >
                  <Text style={[styles.dayChipText, preferredDays[i] && styles.dayChipTextActive]}>
                    {day[0]}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            <Text style={styles.dayCount}>
              {preferredDays.filter(Boolean).length} days selected
            </Text>
          </Card>
        </View>

        {/* Save */}
        <TouchableOpacity
          style={[styles.saveBtn, !hasChanges && styles.saveBtnIdle, saving && styles.saveBtnDisabled]}
          onPress={handleSave}
          disabled={saving || !hasChanges}
        >
          {saved ? (
            <>
              <Ionicons name="checkmark-circle" size={18} color="#fff" />
              <Text style={styles.saveBtnText}>Saved!</Text>
            </>
          ) : (
            <Text style={styles.saveBtnText}>{saving ? 'Saving…' : 'Save Preferences'}</Text>
          )}
        </TouchableOpacity>

      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  scroll: { paddingBottom: 40 },

  section: { marginHorizontal: Spacing.md, marginTop: 24, gap: 10 },
  sectionTitle: { ...Font.label, color: Colors.textMuted },

  goalGrid: { gap: 8 },
  goalCard: {
    backgroundColor: Colors.card,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 14,
    flexDirection: 'column',
    gap: 2,
  },
  goalCardActive: { borderColor: Colors.primary, backgroundColor: Colors.primaryFade },
  goalLabel: { ...Font.h4, color: Colors.textSecondary },
  goalLabelActive: { color: Colors.primary },
  goalSub: { ...Font.small, color: Colors.textMuted },
  goalCheck: { position: 'absolute', top: 12, right: 12 },

  levelRow: { flexDirection: 'row', gap: 10 },
  levelCard: {
    flex: 1,
    backgroundColor: Colors.card,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 14,
    alignItems: 'center',
    gap: 6,
  },
  levelLabel: { ...Font.small, color: Colors.textMuted, fontWeight: '600' },

  kmDisplay: { flexDirection: 'row', alignItems: 'baseline', gap: 6, marginBottom: 14 },
  kmValue: { ...Font.h1, color: Colors.primary },
  kmUnit: { ...Font.body, color: Colors.textSecondary },
  kmOptions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  kmChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: Radius.full,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  kmChipActive: { backgroundColor: Colors.primaryFade, borderColor: Colors.primary },
  kmChipText: { ...Font.small, color: Colors.textSecondary, fontWeight: '600' },
  kmChipTextActive: { color: Colors.primary },

  dayHint: { ...Font.small, color: Colors.textMuted, marginBottom: 12 },
  daysRow: { flexDirection: 'row', gap: 8 },
  dayChip: {
    flex: 1,
    aspectRatio: 1,
    borderRadius: Radius.sm,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayChipActive: { backgroundColor: Colors.primaryFade, borderColor: Colors.primary },
  dayChipText: { ...Font.label, color: Colors.textMuted },
  dayChipTextActive: { color: Colors.primary },
  dayCount: { ...Font.tiny, color: Colors.textMuted, marginTop: 10, textAlign: 'right' },

  saveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginHorizontal: Spacing.md,
    marginTop: 28,
    padding: 16,
    backgroundColor: Colors.primary,
    borderRadius: Radius.md,
  },
  saveBtnIdle: { backgroundColor: Colors.card, borderWidth: 1, borderColor: Colors.border },
  saveBtnDisabled: { opacity: 0.5 },
  saveBtnText: { ...Font.h4, color: '#fff' },
});
