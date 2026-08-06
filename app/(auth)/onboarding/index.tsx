import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Dimensions,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useStore } from '@/hooks/useStore';
import { Colors, Font, Spacing, Radius } from '@/constants/theme';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { signUp } from '@/lib/api/auth';
import { seedDefaultMilestones } from '@/lib/api/athletes';

const { width } = Dimensions.get('window');

// When Supabase is configured, include the credentials step (step 1).
// Without it, the mock flow works exactly as before.
const MOCK_STEPS = [
  { id: 'name',  title: 'Velkommen!\nHva heter du?',        subtitle: '' },
  { id: 'goal',  title: 'Hva er ditt\nhovedmål?',           subtitle: '' },
  { id: 'level', title: 'Hvor mye løper\ndu nå?',           subtitle: 'Vær ærlig — det hjelper oss å lage riktig plan.' },
  { id: 'race',  title: 'Har du et\nmålløp?',               subtitle: '' },
  { id: 'days',  title: 'Hvor mange dager\nkan du trene?',  subtitle: 'De fleste løpere trener 4–6 dager/uke.' },
  { id: 'done',  title: 'Du er klar!',                      subtitle: '' },
];

const REAL_STEPS = [
  { id: 'name',  title: 'Velkommen!\nHva heter du?',        subtitle: '' },
  { id: 'creds', title: 'Opprett din\nkonto',               subtitle: 'Dine innloggingsdetaljer — ta vare på dem.' },
  { id: 'goal',  title: 'Hva er ditt\nhovedmål?',           subtitle: '' },
  { id: 'level', title: 'Hvor mye løper\ndu nå?',           subtitle: 'Vær ærlig — det hjelper oss å lage riktig plan.' },
  { id: 'race',  title: 'Har du et\nmålløp?',               subtitle: '' },
  { id: 'days',  title: 'Hvor mange dager\nkan du trene?',  subtitle: 'De fleste løpere trener 4–6 dager/uke.' },
  { id: 'done',  title: 'Du er klar!',                      subtitle: '' },
];

const STEPS = isSupabaseConfigured ? REAL_STEPS : MOCK_STEPS;

const GOALS = [
  { id: 'first_5k',       label: 'Fullfør min første 5 km',  icon: 'flag-outline' },
  { id: 'first_10k',      label: 'Fullfør min første 10 km', icon: 'trending-up-outline' },
  { id: 'first_half',     label: 'Løp et halvmaraton',        icon: 'medal-outline' },
  { id: 'first_marathon', label: 'Fullfør et maraton',        icon: 'star-outline' },
  { id: 'pb_half',        label: 'Halvmaraton PR',            icon: 'flash-outline' },
  { id: 'pb_marathon',    label: 'Maraton PR',                icon: 'trophy-outline' },
];

const LEVELS = [
  { id: 'beginner',     label: 'Nybegynner',       sub: '0–15 km/uke',   icon: 'leaf-outline' },
  { id: 'intermediate', label: 'Regelmessig løper', sub: '20–50 km/uke',  icon: 'bicycle-outline' },
  { id: 'advanced',     label: 'Erfaren',           sub: '50+ km/uke',    icon: 'rocket-outline' },
];

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

export default function OnboardingScreen() {
  const router = useRouter();
  const { setUserMode, setOnboarded } = useStore();

  const [step, setStep]         = useState(0);
  const [name, setName]         = useState('');
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw]     = useState(false);
  const [goal, setGoal]         = useState('');
  const [level, setLevel]       = useState('');
  const [raceName, setRaceName] = useState('');
  const [raceDate, setRaceDate] = useState('');
  const [days, setDays]         = useState(4);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState('');

  const currentId = STEPS[step].id;
  const progress  = (step + 1) / STEPS.length;

  const canProgress = () => {
    if (currentId === 'name')  return name.trim().length > 0;
    if (currentId === 'creds') return isValidEmail(email) && password.length >= 6;
    if (currentId === 'goal')  return goal !== '';
    if (currentId === 'level') return level !== '';
    return true;
  };

  const next = () => {
    setError('');
    if (step < STEPS.length - 1) setStep(step + 1);
    else finish();
  };

  const finish = async () => {
    if (!isSupabaseConfigured) {
      setUserMode('athlete');
      setOnboarded(true);
      router.replace('/(tabs)');
      return;
    }

    setLoading(true);
    setError('');
    try {
      const initials = name.trim().split(' ').map((w) => w[0].toUpperCase()).join('').slice(0, 2);
      const { session } = await signUp(email.trim(), password, {
        name: name.trim(),
        role: 'athlete',
        initials,
      });

      if (session) {
        // Save athlete-specific profile data and seed milestones in parallel
        await Promise.all([
          supabase.from('athletes').update({
            goal: goal || null,
            fitness_level: level || null,
            ...(raceName.trim() ? { target_race_name: raceName.trim() } : {}),
            ...(raceDate.trim() ? { target_race_date: raceDate.trim() } : {}),
          }).eq('id', session.user.id),
          seedDefaultMilestones(session.user.id),
        ]);
        router.replace('/(tabs)');
      } else {
        // Email confirmation required — show a message
        setError('Konto opprettet! Sjekk e-posten for å bekrefte, og logg deretter inn.');
        setTimeout(() => router.replace('/(auth)'), 4000);
      }
    } catch (e: any) {
      setError(e.message ?? 'Registrering feilet. Prøv igjen.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={styles.container}>
        <LinearGradient colors={['#1A0F00', '#0B0E1C']} style={StyleSheet.absoluteFill} />
        <SafeAreaView style={styles.safe}>

          {/* Progress bar */}
          <View style={styles.topBar}>
            {step > 0 && (
              <TouchableOpacity onPress={() => { setStep(step - 1); setError(''); }} style={styles.backBtn}>
                <Ionicons name="chevron-back" size={24} color={Colors.textSecondary} />
              </TouchableOpacity>
            )}
            <View style={styles.progressTrack}>
              <View style={[styles.progressFill, { width: `${progress * 100}%` }]} />
            </View>
            <Text style={styles.stepCount}>{step + 1}/{STEPS.length}</Text>
          </View>

          <ScrollView style={styles.scroll} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
            <Text style={styles.title}>{STEPS[step].title}</Text>
            {STEPS[step].subtitle ? <Text style={styles.subtitle}>{STEPS[step].subtitle}</Text> : null}

            {/* ── Step: Name ── */}
            {currentId === 'name' && (
              <TextInput
                style={styles.input}
                value={name}
                onChangeText={setName}
                placeholder="Fornavn"
                placeholderTextColor={Colors.textMuted}
                autoFocus
                returnKeyType="next"
                onSubmitEditing={() => canProgress() && next()}
              />
            )}

            {/* ── Step: Credentials ── */}
            {currentId === 'creds' && (
              <View style={styles.credFields}>
                <View style={styles.inputWrapper}>
                  <Ionicons name="mail-outline" size={18} color={Colors.textMuted} style={styles.inputIcon} />
                  <TextInput
                    style={styles.inputInline}
                    value={email}
                    onChangeText={(t) => { setEmail(t); setError(''); }}
                    placeholder="E-postadresse"
                    placeholderTextColor={Colors.textMuted}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoCorrect={false}
                    autoFocus
                  />
                </View>

                <View style={styles.inputWrapper}>
                  <Ionicons name="lock-closed-outline" size={18} color={Colors.textMuted} style={styles.inputIcon} />
                  <TextInput
                    style={[styles.inputInline, { flex: 1 }]}
                    value={password}
                    onChangeText={(t) => { setPassword(t); setError(''); }}
                    placeholder="Passord (min. 6 tegn)"
                    placeholderTextColor={Colors.textMuted}
                    secureTextEntry={!showPw}
                    autoCapitalize="none"
                    returnKeyType="next"
                    onSubmitEditing={() => canProgress() && next()}
                  />
                  <TouchableOpacity onPress={() => setShowPw(!showPw)} style={{ padding: 4 }}>
                    <Ionicons name={showPw ? 'eye-off-outline' : 'eye-outline'} size={18} color={Colors.textMuted} />
                  </TouchableOpacity>
                </View>

                {!isValidEmail(email) && email.length > 0 && (
                  <Text style={styles.fieldHint}>Skriv inn en gyldig e-postadresse</Text>
                )}
                {password.length > 0 && password.length < 6 && (
                  <Text style={styles.fieldHint}>Passordet må ha minst 6 tegn</Text>
                )}
              </View>
            )}

            {/* ── Step: Goal ── */}
            {currentId === 'goal' && (
              <View style={styles.optionList}>
                {GOALS.map((g) => (
                  <TouchableOpacity
                    key={g.id}
                    style={[styles.option, goal === g.id && styles.optionSelected]}
                    onPress={() => setGoal(g.id)}
                    activeOpacity={0.8}
                  >
                    <Ionicons name={g.icon as any} size={22} color={goal === g.id ? Colors.primary : Colors.textSecondary} />
                    <Text style={[styles.optionLabel, goal === g.id && styles.optionLabelSelected]}>{g.label}</Text>
                    {goal === g.id && <Ionicons name="checkmark-circle" size={20} color={Colors.primary} style={{ marginLeft: 'auto' }} />}
                  </TouchableOpacity>
                ))}
              </View>
            )}

            {/* ── Step: Level ── */}
            {currentId === 'level' && (
              <View style={styles.optionList}>
                {LEVELS.map((l) => (
                  <TouchableOpacity
                    key={l.id}
                    style={[styles.option, level === l.id && styles.optionSelected]}
                    onPress={() => setLevel(l.id)}
                    activeOpacity={0.8}
                  >
                    <Ionicons name={l.icon as any} size={22} color={level === l.id ? Colors.primary : Colors.textSecondary} />
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.optionLabel, level === l.id && styles.optionLabelSelected]}>{l.label}</Text>
                      <Text style={styles.optionSub}>{l.sub}</Text>
                    </View>
                    {level === l.id && <Ionicons name="checkmark-circle" size={20} color={Colors.primary} />}
                  </TouchableOpacity>
                ))}
              </View>
            )}

            {/* ── Step: Race ── */}
            {currentId === 'race' && (
              <View style={styles.raceInputs}>
                <View style={styles.inputWrapper}>
                  <Ionicons name="flag-outline" size={18} color={Colors.textMuted} style={styles.inputIcon} />
                  <TextInput
                    style={styles.inputInline}
                    value={raceName}
                    onChangeText={setRaceName}
                    placeholder="Løpsnavn (f.eks. Berlin maraton)"
                    placeholderTextColor={Colors.textMuted}
                    autoFocus
                    returnKeyType="next"
                  />
                </View>
                <View style={styles.inputWrapper}>
                  <Ionicons name="calendar-outline" size={18} color={Colors.textMuted} style={styles.inputIcon} />
                  <TextInput
                    style={styles.inputInline}
                    value={raceDate}
                    onChangeText={setRaceDate}
                    placeholder="Date (YYYY-MM-DD)"
                    placeholderTextColor={Colors.textMuted}
                    keyboardType="numbers-and-punctuation"
                    returnKeyType="done"
                  />
                </View>
                <Text style={styles.raceHint}>Du kan oppdatere dette når som helst fra profilen din.</Text>
              </View>
            )}

            {/* ── Step: Days ── */}
            {currentId === 'days' && (
              <View style={styles.daysRow}>
                {[3, 4, 5, 6, 7].map((d) => (
                  <TouchableOpacity
                    key={d}
                    style={[styles.dayBtn, days === d && styles.dayBtnSelected]}
                    onPress={() => setDays(d)}
                    activeOpacity={0.8}
                  >
                    <Text style={[styles.dayNum, days === d && styles.dayNumSelected]}>{d}</Text>
                    <Text style={[styles.dayLabel, days === d && styles.dayLabelSelected]}>dager</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}

            {/* ── Step: Done ── */}
            {currentId === 'done' && (
              <View style={styles.doneCard}>
                <View style={styles.doneIcon}>
                  <Ionicons name="checkmark-circle" size={56} color={Colors.success} />
                </View>
                <Text style={styles.doneText}>
                  Velkommen{name ? `, ${name}` : ''}! Lopeprat-treneren din vil ha en personlig plan klar til deg snart.
                </Text>
                {error ? (
                  <View style={[styles.errorBanner, error.startsWith('Account created') && styles.successBanner]}>
                    <Ionicons
                      name={error.startsWith('Account created') ? 'mail-outline' : 'alert-circle-outline'}
                      size={16}
                      color={error.startsWith('Account created') ? Colors.success : Colors.error}
                    />
                    <Text style={[styles.errorText, error.startsWith('Account created') && { color: Colors.success }]}>
                      {error}
                    </Text>
                  </View>
                ) : null}
                <View style={styles.doneFeatures}>
                  {[
                    { icon: 'calendar', text: 'Tilpasset treningsplan' },
                    { icon: 'chatbubble-ellipses', text: 'Direkte meldinger med trener' },
                    { icon: 'bar-chart', text: 'Fremgangsregistrering' },
                    { icon: 'play-circle', text: 'Eksklusivt innhold' },
                  ].map((f) => (
                    <View key={f.text} style={styles.doneFeat}>
                      <Ionicons name={f.icon as any} size={16} color={Colors.primary} />
                      <Text style={styles.doneFeatText}>{f.text}</Text>
                    </View>
                  ))}
                </View>
              </View>
            )}
          </ScrollView>

          {/* CTA */}
          <View style={styles.footer}>
            <TouchableOpacity
              style={[styles.nextBtn, (!canProgress() || loading) && styles.nextBtnDisabled]}
              onPress={next}
              disabled={!canProgress() || loading}
              activeOpacity={0.8}
            >
              <LinearGradient
                colors={[Colors.primaryLight, Colors.primary]}
                style={styles.nextGrad}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
              >
                {loading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <>
                    <Text style={styles.nextBtnText}>
                      {currentId === 'done' ? 'Gå til min plan →' : 'Fortsett'}
                    </Text>
                    {currentId !== 'done' && <Ionicons name="arrow-forward" size={18} color="#fff" />}
                  </>
                )}
              </LinearGradient>
            </TouchableOpacity>
          </View>

        </SafeAreaView>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  safe: { flex: 1 },

  topBar: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingTop: 16, gap: 12 },
  backBtn: { padding: 4 },
  progressTrack: { flex: 1, height: 3, backgroundColor: Colors.border, borderRadius: 2, overflow: 'hidden' },
  progressFill: { height: 3, backgroundColor: Colors.primary, borderRadius: 2 },
  stepCount: { ...Font.small, color: Colors.textMuted },

  scroll: { flex: 1 },
  content: { paddingHorizontal: Spacing.lg, paddingTop: 40, paddingBottom: 24 },

  title: { ...Font.h1, color: Colors.text, lineHeight: 42, marginBottom: 12 },
  subtitle: { ...Font.body, color: Colors.textSecondary, marginBottom: 32 },

  input: {
    backgroundColor: Colors.card,
    borderRadius: Radius.md,
    borderWidth: 1.5,
    borderColor: Colors.primary,
    padding: 16,
    color: Colors.text,
    fontSize: 20,
    fontWeight: '500',
    marginTop: 24,
  },

  credFields: { gap: 12, marginTop: 24 },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.card,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: 14,
    height: 52,
  },
  inputIcon: { marginRight: 10 },
  inputInline: { flex: 1, color: Colors.text, fontSize: 15 },
  fieldHint: { ...Font.small, color: Colors.warning, paddingHorizontal: 4 },

  optionList: { gap: 10, marginTop: 24 },
  option: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    backgroundColor: Colors.card, borderRadius: Radius.md,
    borderWidth: 1, borderColor: Colors.border, padding: 16,
  },
  optionSelected: { borderColor: Colors.primary, backgroundColor: Colors.primaryFade },
  optionLabel: { ...Font.h4, color: Colors.textSecondary, flex: 1 },
  optionLabelSelected: { color: Colors.text },
  optionSub: { ...Font.small, color: Colors.textMuted, marginTop: 2 },

  raceInputs: { gap: 12, marginTop: 24 },
  raceHint: { ...Font.small, color: Colors.textMuted, paddingHorizontal: 4, marginTop: 4 },

  daysRow: { flexDirection: 'row', gap: 10, marginTop: 24, justifyContent: 'center' },
  dayBtn: {
    flex: 1, alignItems: 'center', padding: 16,
    backgroundColor: Colors.card, borderRadius: Radius.md,
    borderWidth: 1, borderColor: Colors.border,
  },
  dayBtnSelected: { borderColor: Colors.primary, backgroundColor: Colors.primaryFade },
  dayNum: { ...Font.h2, color: Colors.textSecondary },
  dayNumSelected: { color: Colors.primary },
  dayLabel: { ...Font.tiny, color: Colors.textMuted, marginTop: 4 },
  dayLabelSelected: { color: Colors.primary },

  doneCard: { alignItems: 'center', paddingTop: 24 },
  doneIcon: { marginBottom: 20 },
  doneText: { ...Font.h4, color: Colors.text, textAlign: 'center', lineHeight: 26, marginBottom: 20 },

  errorBanner: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 8,
    backgroundColor: 'rgba(239,68,68,0.1)',
    borderRadius: Radius.sm, borderWidth: 1, borderColor: Colors.error + '44',
    padding: 12, marginBottom: 16, width: '100%',
  },
  successBanner: { backgroundColor: Colors.successFade, borderColor: Colors.success + '44' },
  errorText: { ...Font.small, color: Colors.error, flex: 1, lineHeight: 18 },

  doneFeatures: {
    width: '100%', gap: 12,
    backgroundColor: Colors.card, borderRadius: Radius.lg,
    borderWidth: 1, borderColor: Colors.border, padding: 20,
  },
  doneFeat: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  doneFeatText: { ...Font.body, color: Colors.textSecondary },

  footer: { padding: Spacing.lg, paddingBottom: 32 },
  nextBtn: { borderRadius: Radius.md, overflow: 'hidden' },
  nextBtnDisabled: { opacity: 0.4 },
  nextGrad: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', height: 56, gap: 8 },
  nextBtnText: { ...Font.h4, color: '#fff' },
});
