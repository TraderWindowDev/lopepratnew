import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
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
  { value: 'first_5k',      label: '5 km',          sub: 'Fullfør din første 5 km' },
  { value: 'first_10k',     label: '10 km',          sub: 'Øk til 10 kilometer' },
  { value: 'first_half',    label: 'Halvmaraton',    sub: '21,1 km utholdenhetsmål' },
  { value: 'first_marathon',label: 'Maraton',        sub: 'Hele 42,2 km-utfordringen' },
];

// Olympiatoppen-soner — beregnet fra makspuls
const ZONES = [
  { label: 'Sone 1', name: 'Aktiv restitusjon',    lo: 0,    hi: 0.72, color: '#4FC3F7' },
  { label: 'Sone 2', name: 'Grunnkondisjon',        lo: 0.72, hi: 0.82, color: '#66BB6A' },
  { label: 'Sone 3', name: 'Aerob kondisjon',       lo: 0.82, hi: 0.87, color: '#9CCC65' },
  { label: 'Sone 4', name: 'Terskeltrening',        lo: 0.87, hi: 0.92, color: '#FFA726' },
  { label: 'Sone 5', name: 'VO₂maks',              lo: 0.92, hi: 0.97, color: '#FF7043' },
  { label: 'Sone 6', name: 'Fartstrening',          lo: 0.97, hi: 1.10, color: '#E53935' },
];

const DAYS = ['Man', 'Tir', 'Ons', 'Tor', 'Fre', 'Lør', 'Søn'];
const KM_OPTIONS = [20, 30, 40, 50, 60, 70, 80, 100];

export default function TrainingPreferencesScreen() {
  const { athlete, session, refreshAthleteState } = useStore();

  const [goal, setGoal]               = useState<GoalType>(athlete.goal);
  const [weeklyTarget, setWeeklyTarget] = useState(athlete.weeklyMileageTarget);
  const [preferredDays, setPreferredDays] = useState<boolean[]>([true, false, true, false, true, true, false]);
  const [age, setAge]                 = useState('');
  const [saving, setSaving]           = useState(false);
  const [saved, setSaved]             = useState(false);

  // Olympiatoppen makspuls-formel
  const maxHR = useMemo(() => {
    const n = parseInt(age);
    if (!n || n < 10 || n > 100) return null;
    return Math.round(211 - 0.64 * n);
  }, [age]);

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
          .update({ goal, weekly_mileage_target: weeklyTarget })
          .eq('id', session.user.id);
        if (error) throw error;
        await refreshAthleteState();
      }
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (e: any) {
      Alert.alert('Feil', e.message ?? 'Kunne ikke lagre preferanser');
    } finally {
      setSaving(false);
    }
  }

  const hasChanges = goal !== athlete.goal || weeklyTarget !== athlete.weeklyMileageTarget;

  return (
    <View style={styles.container}>
      <ScreenHeader title="Treningspreferanser" />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>

        {/* Treningsmål */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>TRENINGSMÅL</Text>
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

        {/* Olympiatoppen-soner */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>OLYMPIATOPPEN-SONER</Text>
          <Card padding={16}>
            <Text style={styles.zoneHint}>
              Skriv inn alder for å beregne pulssoner (211 − 0,64 × alder)
            </Text>
            <View style={styles.ageRow}>
              <TextInput
                style={styles.ageInput}
                value={age}
                onChangeText={setAge}
                keyboardType="numeric"
                placeholder="F.eks. 32"
                placeholderTextColor={Colors.textMuted}
                maxLength={3}
              />
              <Text style={styles.ageLabel}>år</Text>
              {maxHR && (
                <View style={styles.maxHRBadge}>
                  <Text style={styles.maxHRText}>Maks HR: {maxHR}</Text>
                </View>
              )}
            </View>

            {maxHR && (
              <View style={styles.zonesTable}>
                {ZONES.map((z) => {
                  const loHR = z.lo === 0 ? 0 : Math.round(z.lo * maxHR);
                  const hiHR = z.hi >= 1.05 ? null : Math.round(z.hi * maxHR);
                  const range = loHR === 0
                    ? `< ${Math.round(0.72 * maxHR)} slag/min`
                    : hiHR === null
                      ? `> ${loHR} slag/min`
                      : `${loHR}–${hiHR} slag/min`;
                  return (
                    <View key={z.label} style={styles.zoneRow}>
                      <View style={[styles.zoneDot, { backgroundColor: z.color }]} />
                      <View style={styles.zoneInfo}>
                        <Text style={styles.zoneLabel}>{z.label} — {z.name}</Text>
                        <Text style={styles.zoneRange}>{range}</Text>
                      </View>
                    </View>
                  );
                })}
              </View>
            )}
          </Card>
        </View>

        {/* Ukentlig kilometermål */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>UKENTLIG KILOMETERMÅL</Text>
          <Card padding={16}>
            <View style={styles.kmDisplay}>
              <Text style={styles.kmValue}>{weeklyTarget}</Text>
              <Text style={styles.kmUnit}>km / uke</Text>
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

        {/* Foretrukne treningsdager */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>TRENINGSDAGER</Text>
          <Card padding={16}>
            <Text style={styles.dayHint}>Velg dagene du foretrekker å trene</Text>
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
              {preferredDays.filter(Boolean).length} dager valgt
            </Text>
          </Card>
        </View>

        {/* Lagre */}
        <TouchableOpacity
          style={[styles.saveBtn, !hasChanges && styles.saveBtnIdle, saving && styles.saveBtnDisabled]}
          onPress={handleSave}
          disabled={saving || !hasChanges}
        >
          {saved ? (
            <>
              <Ionicons name="checkmark-circle" size={18} color="#fff" />
              <Text style={styles.saveBtnText}>Lagret!</Text>
            </>
          ) : (
            <Text style={styles.saveBtnText}>{saving ? 'Lagrer…' : 'Lagre preferanser'}</Text>
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
    gap: 2,
  },
  goalCardActive: { borderColor: Colors.primary, backgroundColor: Colors.primaryFade },
  goalLabel: { ...Font.h4, color: Colors.textSecondary },
  goalLabelActive: { color: Colors.primary },
  goalSub: { ...Font.small, color: Colors.textMuted },
  goalCheck: { position: 'absolute', top: 12, right: 12 },

  // Olympiatoppen zones
  zoneHint: { ...Font.small, color: Colors.textMuted, marginBottom: 12, lineHeight: 18 },
  ageRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 16 },
  ageInput: {
    ...Font.h3,
    color: Colors.text,
    backgroundColor: Colors.surface,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: 16,
    paddingVertical: 10,
    minWidth: 80,
    textAlign: 'center',
  },
  ageLabel: { ...Font.body, color: Colors.textSecondary },
  maxHRBadge: {
    marginLeft: 'auto' as any,
    backgroundColor: Colors.primaryFade,
    borderRadius: Radius.full,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderWidth: 1,
    borderColor: Colors.primary + '44',
  },
  maxHRText: { ...Font.label, color: Colors.primary },
  zonesTable: { gap: 8 },
  zoneRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  zoneDot: { width: 10, height: 10, borderRadius: 5, flexShrink: 0 },
  zoneInfo: { flex: 1 },
  zoneLabel: { ...Font.small, color: Colors.text, fontWeight: '600' },
  zoneRange: { ...Font.tiny, color: Colors.textMuted, marginTop: 1 },

  kmDisplay: { flexDirection: 'row', alignItems: 'baseline', gap: 6, marginBottom: 14 },
  kmValue: { ...Font.h1, color: Colors.primary },
  kmUnit: { ...Font.body, color: Colors.textSecondary },
  kmOptions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  kmChip: {
    paddingHorizontal: 14, paddingVertical: 8,
    borderRadius: Radius.full, backgroundColor: Colors.surface,
    borderWidth: 1, borderColor: Colors.border,
  },
  kmChipActive: { backgroundColor: Colors.primaryFade, borderColor: Colors.primary },
  kmChipText: { ...Font.small, color: Colors.textSecondary, fontWeight: '600' },
  kmChipTextActive: { color: Colors.primary },

  dayHint: { ...Font.small, color: Colors.textMuted, marginBottom: 12 },
  daysRow: { flexDirection: 'row', gap: 8 },
  dayChip: {
    flex: 1, aspectRatio: 1, borderRadius: Radius.sm,
    backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border,
    alignItems: 'center', justifyContent: 'center',
  },
  dayChipActive: { backgroundColor: Colors.primaryFade, borderColor: Colors.primary },
  dayChipText: { ...Font.label, color: Colors.textMuted },
  dayChipTextActive: { color: Colors.primary },
  dayCount: { ...Font.tiny, color: Colors.textMuted, marginTop: 10, textAlign: 'right' },

  saveBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    marginHorizontal: Spacing.md, marginTop: 28, padding: 16,
    backgroundColor: Colors.primary, borderRadius: Radius.md,
  },
  saveBtnIdle: { backgroundColor: Colors.card, borderWidth: 1, borderColor: Colors.border },
  saveBtnDisabled: { opacity: 0.5 },
  saveBtnText: { ...Font.h4, color: '#fff' },
});
