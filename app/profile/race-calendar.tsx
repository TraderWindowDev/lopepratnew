import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useStore } from '@/hooks/useStore';
import { useStoredState } from '@/hooks/useStoredState';
import { Colors, Font, Spacing, Radius } from '@/constants/theme';
import { Card } from '@/components/ui/Card';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { upsertRaceResult } from '@/lib/api/race-results';

interface RaceResult {
  finishTime: string;
  categoryPlace: string;
  overallPlace: string;
  notes: string;
}

interface Race {
  id: string;
  name: string;
  date: string;
  distance: string;
  location: string;
  isTarget?: boolean;
  result?: RaceResult;
}

const DISTANCES = ['5K', '10K', 'Half Marathon', 'Marathon', 'Ultra', 'Other'];

function daysUntil(dateStr: string): number {
  const diff = new Date(dateStr).getTime() - Date.now();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', {
    weekday: 'short', month: 'short', day: 'numeric', year: 'numeric',
  });
}

export default function RaceCalendarScreen() {
  const { athlete, setTargetRace, session } = useStore();

  const defaultRaces: Race[] = [{
    id: 'target',
    name: athlete.targetRace.name !== 'TBD' ? athlete.targetRace.name : 'Target Race',
    date: athlete.targetRace.date,
    distance: 'Marathon',
    location: athlete.targetRace.location || '',
    isTarget: true,
  }];

  const [races, setRaces, loaded] = useStoredState<Race[]>('race_calendar', defaultRaces);

  // ── race add/edit modal ───────────────────────────────────────────────────
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ name: '', date: '', distance: 'Marathon', location: '' });

  // ── result modal ──────────────────────────────────────────────────────────
  const [showResultModal, setShowResultModal] = useState(false);
  const [resultRaceId, setResultRaceId] = useState<string | null>(null);
  const [resultForm, setResultForm] = useState({
    finishTime: '', categoryPlace: '', overallPlace: '', notes: '',
  });
  const [savingResult, setSavingResult] = useState(false);

  const upcomingRaces = races
    .filter(r => daysUntil(r.date) >= 0)
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  const pastRaces = races
    .filter(r => daysUntil(r.date) < 0)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  function openAdd() {
    setEditingId(null);
    setForm({ name: '', date: '', distance: 'Marathon', location: '' });
    setShowModal(true);
  }

  function openEdit(race: Race) {
    setEditingId(race.id);
    setForm({ name: race.name, date: race.date, distance: race.distance, location: race.location });
    setShowModal(true);
  }

  function handleSave() {
    if (!form.name || !form.date) return;
    if (editingId) {
      setRaces(prev => prev.map(r => r.id === editingId ? { ...r, ...form } : r));
      if (editingId === 'target') setTargetRace(form.name, form.date, form.location);
    } else {
      setRaces(prev => [...prev, { id: `race-${Date.now()}`, ...form }]);
    }
    setShowModal(false);
  }

  function handleDelete(id: string) {
    setRaces(prev => prev.filter(r => r.id !== id));
  }

  function openResult(race: Race) {
    setResultRaceId(race.id);
    setResultForm({
      finishTime: race.result?.finishTime ?? '',
      categoryPlace: race.result?.categoryPlace ?? '',
      overallPlace: race.result?.overallPlace ?? '',
      notes: race.result?.notes ?? '',
    });
    setShowResultModal(true);
  }

  async function handleSaveResult() {
    if (!resultRaceId) return;
    const race = races.find(r => r.id === resultRaceId);
    if (!race) return;
    const result: RaceResult = {
      finishTime: resultForm.finishTime.trim(),
      categoryPlace: resultForm.categoryPlace.trim(),
      overallPlace: resultForm.overallPlace.trim(),
      notes: resultForm.notes.trim(),
    };
    setRaces(prev => prev.map(r => r.id === resultRaceId ? { ...r, result } : r));
    setSavingResult(true);
    if (session?.user?.id) {
      await upsertRaceResult(session.user.id, {
        raceName: race.name,
        raceDate: race.date,
        distance: race.distance,
        finishTime: result.finishTime || undefined,
        categoryPlace: result.categoryPlace || undefined,
        overallPlace: result.overallPlace || undefined,
        notes: result.notes || undefined,
      });
    }
    setSavingResult(false);
    setShowResultModal(false);
  }

  if (!loaded) {
    return (
      <View style={styles.container}>
        <ScreenHeader title="Race Calendar" />
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator color={Colors.primary} />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScreenHeader
        title="Race Calendar"
        right={
          <TouchableOpacity onPress={openAdd} hitSlop={8}>
            <Ionicons name="add" size={26} color={Colors.primary} />
          </TouchableOpacity>
        }
      />

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>

        {/* Upcoming */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>UPCOMING</Text>
          {upcomingRaces.length === 0 ? (
            <Card padding={24} style={styles.emptyCard}>
              <Ionicons name="flag-outline" size={32} color={Colors.textMuted} />
              <Text style={styles.emptyText}>No upcoming races. Tap + to add one.</Text>
            </Card>
          ) : (
            upcomingRaces.map((race) => {
              const days = daysUntil(race.date);
              return (
                <Card key={race.id} padding={0} style={[styles.raceCard, race.isTarget && styles.raceCardTarget]}>
                  {race.isTarget && (
                    <View style={styles.targetBanner}>
                      <Ionicons name="trophy" size={12} color={Colors.gold} />
                      <Text style={styles.targetBannerText}>GOAL RACE</Text>
                    </View>
                  )}
                  <View style={styles.raceContent}>
                    <View style={styles.raceCountdown}>
                      <Text style={[styles.countdownDays, race.isTarget && { color: Colors.gold }]}>
                        {days}
                      </Text>
                      <Text style={styles.countdownLabel}>days</Text>
                    </View>
                    <View style={styles.raceInfo}>
                      <Text style={styles.raceName}>{race.name}</Text>
                      <Text style={styles.raceDate}>{formatDate(race.date)}</Text>
                      <View style={styles.raceMeta}>
                        <View style={styles.distanceBadge}>
                          <Text style={styles.distanceText}>{race.distance}</Text>
                        </View>
                        {race.location ? (
                          <Text style={styles.raceLocation} numberOfLines={1}>
                            <Ionicons name="location-outline" size={11} color={Colors.textMuted} /> {race.location}
                          </Text>
                        ) : null}
                      </View>
                    </View>
                    <TouchableOpacity onPress={() => openEdit(race)} hitSlop={8}>
                      <Ionicons name="pencil-outline" size={18} color={Colors.textMuted} />
                    </TouchableOpacity>
                  </View>
                </Card>
              );
            })
          )}
        </View>

        {/* Past */}
        {pastRaces.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>PAST RACES</Text>
            {pastRaces.map((race) => (
              <Card key={race.id} padding={16} style={styles.pastRaceCard}>
                <View style={styles.pastRaceRow}>
                  <View style={styles.pastRaceInfo}>
                    <Text style={styles.pastRaceName}>{race.name}</Text>
                    <Text style={styles.pastRaceDate}>{formatDate(race.date)}</Text>
                  </View>
                  <View style={styles.distanceBadgeMuted}>
                    <Text style={styles.distanceTextMuted}>{race.distance}</Text>
                  </View>
                  <TouchableOpacity onPress={() => openEdit(race)} hitSlop={8}>
                    <Ionicons name="pencil-outline" size={16} color={Colors.textMuted} />
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => handleDelete(race.id)} hitSlop={8}>
                    <Ionicons name="trash-outline" size={16} color={Colors.textMuted} />
                  </TouchableOpacity>
                </View>

                {/* Result row */}
                {race.result?.finishTime ? (
                  <TouchableOpacity style={styles.resultRow} onPress={() => openResult(race)}>
                    <Ionicons name="timer-outline" size={14} color={Colors.gold} />
                    <Text style={styles.resultTime}>{race.result.finishTime}</Text>
                    {race.result.categoryPlace ? (
                      <Text style={styles.resultPlace}>{race.result.categoryPlace}</Text>
                    ) : null}
                    {race.result.overallPlace ? (
                      <Text style={styles.resultOverall}>{race.result.overallPlace}</Text>
                    ) : null}
                    <Ionicons name="pencil-outline" size={12} color={Colors.textMuted} style={{ marginLeft: 'auto' }} />
                  </TouchableOpacity>
                ) : (
                  <TouchableOpacity style={styles.logResultBtn} onPress={() => openResult(race)}>
                    <Ionicons name="add-circle-outline" size={14} color={Colors.primary} />
                    <Text style={styles.logResultBtnText}>Log result</Text>
                  </TouchableOpacity>
                )}

                {race.result?.notes ? (
                  <Text style={styles.resultNotes} numberOfLines={2}>"{race.result.notes}"</Text>
                ) : null}
              </Card>
            ))}
          </View>
        )}

        <TouchableOpacity style={styles.addRaceBtn} onPress={openAdd}>
          <Ionicons name="add-circle-outline" size={20} color={Colors.primary} />
          <Text style={styles.addRaceBtnText}>Add Race</Text>
        </TouchableOpacity>

      </ScrollView>

      {/* Add/Edit Race Modal */}
      <Modal visible={showModal} transparent animationType="slide" onRequestClose={() => setShowModal(false)}>
        <View style={styles.modalOverlay}>
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
            <View style={styles.modalSheet}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>{editingId ? 'Edit Race' : 'Add Race'}</Text>
                <TouchableOpacity onPress={() => setShowModal(false)}>
                  <Ionicons name="close" size={24} color={Colors.textMuted} />
                </TouchableOpacity>
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Race Name</Text>
                <TextInput
                  style={styles.input}
                  value={form.name}
                  onChangeText={t => setForm(f => ({ ...f, name: t }))}
                  placeholder="e.g. Chicago Marathon"
                  placeholderTextColor={Colors.textMuted}
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Date (YYYY-MM-DD)</Text>
                <TextInput
                  style={styles.input}
                  value={form.date}
                  onChangeText={t => setForm(f => ({ ...f, date: t }))}
                  placeholder="2026-10-11"
                  placeholderTextColor={Colors.textMuted}
                  keyboardType="numbers-and-punctuation"
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Distance</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.distancePicker}>
                  {DISTANCES.map(d => (
                    <TouchableOpacity
                      key={d}
                      style={[styles.distanceOption, form.distance === d && styles.distanceOptionActive]}
                      onPress={() => setForm(f => ({ ...f, distance: d }))}
                    >
                      <Text style={[styles.distanceOptionText, form.distance === d && styles.distanceOptionTextActive]}>
                        {d}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Location (optional)</Text>
                <TextInput
                  style={styles.input}
                  value={form.location}
                  onChangeText={t => setForm(f => ({ ...f, location: t }))}
                  placeholder="City, Country"
                  placeholderTextColor={Colors.textMuted}
                />
              </View>

              <View style={styles.modalActions}>
                {editingId && !races.find(r => r.id === editingId)?.isTarget && (
                  <TouchableOpacity
                    style={styles.deleteBtn}
                    onPress={() => { handleDelete(editingId); setShowModal(false); }}
                  >
                    <Ionicons name="trash-outline" size={18} color={Colors.error} />
                  </TouchableOpacity>
                )}
                <TouchableOpacity
                  style={[styles.saveBtn, (!form.name || !form.date) && styles.saveBtnDisabled]}
                  onPress={handleSave}
                  disabled={!form.name || !form.date}
                >
                  <Text style={styles.saveBtnText}>Save Race</Text>
                </TouchableOpacity>
              </View>
            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>

      {/* Log Result Modal */}
      <Modal visible={showResultModal} transparent animationType="slide" onRequestClose={() => setShowResultModal(false)}>
        <View style={styles.modalOverlay}>
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
            <View style={styles.modalSheet}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Race Result</Text>
                <TouchableOpacity onPress={() => setShowResultModal(false)}>
                  <Ionicons name="close" size={24} color={Colors.textMuted} />
                </TouchableOpacity>
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Finish Time</Text>
                <TextInput
                  style={styles.input}
                  value={resultForm.finishTime}
                  onChangeText={t => setResultForm(f => ({ ...f, finishTime: t }))}
                  placeholder="3:42:11"
                  placeholderTextColor={Colors.textMuted}
                  keyboardType="numbers-and-punctuation"
                  autoFocus
                />
              </View>

              <View style={styles.resultRow2}>
                <View style={[styles.formGroup, { flex: 1 }]}>
                  <Text style={styles.formLabel}>Category Place</Text>
                  <TextInput
                    style={styles.input}
                    value={resultForm.categoryPlace}
                    onChangeText={t => setResultForm(f => ({ ...f, categoryPlace: t }))}
                    placeholder="4th M35-39"
                    placeholderTextColor={Colors.textMuted}
                  />
                </View>
                <View style={[styles.formGroup, { flex: 1 }]}>
                  <Text style={styles.formLabel}>Overall Place</Text>
                  <TextInput
                    style={styles.input}
                    value={resultForm.overallPlace}
                    onChangeText={t => setResultForm(f => ({ ...f, overallPlace: t }))}
                    placeholder="127/2450"
                    placeholderTextColor={Colors.textMuted}
                  />
                </View>
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Notes</Text>
                <TextInput
                  style={[styles.input, styles.inputMulti]}
                  value={resultForm.notes}
                  onChangeText={t => setResultForm(f => ({ ...f, notes: t }))}
                  placeholder="How did it feel? What went well?"
                  placeholderTextColor={Colors.textMuted}
                  multiline
                />
              </View>

              <TouchableOpacity
                style={[styles.saveBtn, savingResult && styles.saveBtnDisabled]}
                onPress={handleSaveResult}
                disabled={savingResult}
              >
                {savingResult
                  ? <ActivityIndicator color="#fff" size="small" />
                  : <Text style={styles.saveBtnText}>Save Result</Text>}
              </TouchableOpacity>
            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  scroll: { paddingBottom: 40 },

  section: { marginHorizontal: Spacing.md, marginTop: 24, gap: 10 },
  sectionTitle: { ...Font.label, color: Colors.textMuted },

  emptyCard: { alignItems: 'center', gap: 10 },
  emptyText: { ...Font.small, color: Colors.textMuted, textAlign: 'center' },

  raceCard: { overflow: 'hidden' },
  raceCardTarget: { borderColor: Colors.gold + '44', borderWidth: 1 },
  targetBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: Colors.goldFade, paddingHorizontal: 14, paddingVertical: 5,
  },
  targetBannerText: { ...Font.label, color: Colors.gold },
  raceContent: { flexDirection: 'row', alignItems: 'center', padding: 16, gap: 14 },
  raceCountdown: { alignItems: 'center', width: 52 },
  countdownDays: { ...Font.h2, color: Colors.primary },
  countdownLabel: { ...Font.tiny, color: Colors.textMuted },
  raceInfo: { flex: 1, gap: 4 },
  raceName: { ...Font.h4, color: Colors.text },
  raceDate: { ...Font.small, color: Colors.textSecondary },
  raceMeta: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 2 },
  distanceBadge: {
    backgroundColor: Colors.primaryFade, borderRadius: Radius.full,
    paddingHorizontal: 8, paddingVertical: 2,
  },
  distanceText: { ...Font.label, color: Colors.primary },
  raceLocation: { ...Font.tiny, color: Colors.textMuted, flex: 1 },

  pastRaceCard: { gap: 8 },
  pastRaceRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  pastRaceInfo: { flex: 1, gap: 2 },
  pastRaceName: { ...Font.small, color: Colors.textSecondary, fontWeight: '600' },
  pastRaceDate: { ...Font.tiny, color: Colors.textMuted },
  distanceBadgeMuted: {
    backgroundColor: Colors.surface, borderRadius: Radius.full,
    paddingHorizontal: 8, paddingVertical: 2,
  },
  distanceTextMuted: { ...Font.label, color: Colors.textMuted },

  resultRow: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: Colors.goldFade, borderRadius: Radius.sm,
    paddingHorizontal: 10, paddingVertical: 8,
  },
  resultTime: { ...Font.label, color: Colors.gold },
  resultPlace: { ...Font.small, color: Colors.textSecondary },
  resultOverall: { ...Font.small, color: Colors.textMuted },
  logResultBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingVertical: 6,
  },
  logResultBtnText: { ...Font.small, color: Colors.primary },
  resultNotes: { ...Font.small, color: Colors.textMuted, fontStyle: 'italic', lineHeight: 18 },

  addRaceBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, marginHorizontal: Spacing.md, marginTop: 20, padding: 14,
    backgroundColor: Colors.primaryFade, borderRadius: Radius.md,
    borderWidth: 1, borderColor: Colors.primary + '44', borderStyle: 'dashed',
  },
  addRaceBtnText: { ...Font.h4, color: Colors.primary },

  modalOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: Colors.overlay },
  modalSheet: {
    backgroundColor: Colors.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: 24, paddingBottom: 40, gap: 16,
  },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  modalTitle: { ...Font.h3, color: Colors.text },

  formGroup: { gap: 6 },
  formLabel: { ...Font.label, color: Colors.textMuted },
  input: {
    backgroundColor: Colors.card, borderRadius: Radius.md, borderWidth: 1,
    borderColor: Colors.border, paddingHorizontal: 14, paddingVertical: 12,
    color: Colors.text, ...Font.body,
  },
  inputMulti: { height: 80, textAlignVertical: 'top' },
  distancePicker: { marginTop: 2 },
  distanceOption: {
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: Radius.full,
    backgroundColor: Colors.card, borderWidth: 1, borderColor: Colors.border, marginRight: 8,
  },
  distanceOptionActive: { backgroundColor: Colors.primaryFade, borderColor: Colors.primary },
  distanceOptionText: { ...Font.small, color: Colors.textSecondary },
  distanceOptionTextActive: { color: Colors.primary, fontWeight: '600' },

  resultRow2: { flexDirection: 'row', gap: 10 },

  modalActions: { flexDirection: 'row', gap: 10, marginTop: 4 },
  deleteBtn: {
    width: 48, height: 48, borderRadius: Radius.md, backgroundColor: Colors.errorFade,
    alignItems: 'center', justifyContent: 'center',
  },
  saveBtn: {
    flex: 1, height: 48, backgroundColor: Colors.primary, borderRadius: Radius.md,
    alignItems: 'center', justifyContent: 'center',
  },
  saveBtnDisabled: { opacity: 0.4 },
  saveBtnText: { ...Font.h4, color: '#fff' },
});
