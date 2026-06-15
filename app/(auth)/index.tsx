import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useStore } from '@/hooks/useStore';
import { Colors, Font, Spacing, Radius } from '@/constants/theme';
import { isSupabaseConfigured } from '@/lib/supabase';
import { signIn } from '@/lib/api/auth';

const { width } = Dimensions.get('window');

export default function LoginScreen() {
  const router = useRouter();
  const { setUserMode, setOnboarded } = useStore();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // ─── Mock mode (no Supabase configured) ───────────────────────
  const handleMockAthlete = () => {
    setUserMode('athlete');
    setOnboarded(true);
    router.replace('/(tabs)');
  };
  const handleMockNewAthlete = () => {
    setUserMode('athlete');
    router.push('/(auth)/onboarding');
  };
  const handleMockCoach = () => {
    setUserMode('coach');
    router.replace('/coach');
  };

  // ─── Real Supabase auth ────────────────────────────────────────
  const handleSignIn = async () => {
    if (!email.trim() || !password) {
      setError('Please enter your email and password.');
      return;
    }
    setError('');
    setLoading(true);
    try {
      const { user } = await signIn(email.trim(), password);
      if (!user) throw new Error('Sign in failed');
      // Profile fetch + mode set handled by the auth listener in the store
    } catch (e: any) {
      setError(e.message ?? 'Sign in failed. Please check your credentials.');
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
        <LinearGradient colors={['#1A0F00', '#0B0E1C', '#0B0E1C']} style={StyleSheet.absoluteFill} />

        <SafeAreaView style={styles.safe}>
          {/* Logo */}
          <View style={styles.header}>
            <View style={styles.logoMark}>
              <Ionicons name="footsteps" size={28} color={Colors.primary} />
            </View>
            <Text style={styles.wordmark}>LOPEPRAT</Text>
            <Text style={styles.tagline}>COACHING</Text>
          </View>

          {/* Hero */}
          <View style={styles.hero}>
            <Text style={styles.heroSubtitle}>
              Expert coaching from the Lopeprat team.{'\n'}Personalised plans. Real progress.
            </Text>
          </View>

          {/* Stats strip */}
          <View style={styles.statsRow}>
            {[
              { value: '240+', label: 'Athletes' },
              { value: '6', label: 'Coaches' },
              { value: '38', label: 'PRs this month' },
            ].map((s) => (
              <View key={s.label} style={styles.stat}>
                <Text style={styles.statValue}>{s.value}</Text>
                <Text style={styles.statLabel}>{s.label}</Text>
              </View>
            ))}
          </View>

          {/* ── Auth section ── */}
          {isSupabaseConfigured ? (
            <View style={styles.actions}>
              {/* Email */}
              <View style={styles.inputWrapper}>
                <Ionicons name="mail-outline" size={18} color={Colors.textMuted} style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  value={email}
                  onChangeText={(t) => { setEmail(t); setError(''); }}
                  placeholder="Email address"
                  placeholderTextColor={Colors.textMuted}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                />
              </View>

              {/* Password */}
              <View style={styles.inputWrapper}>
                <Ionicons name="lock-closed-outline" size={18} color={Colors.textMuted} style={styles.inputIcon} />
                <TextInput
                  style={[styles.input, { flex: 1 }]}
                  value={password}
                  onChangeText={(t) => { setPassword(t); setError(''); }}
                  placeholder="Password"
                  placeholderTextColor={Colors.textMuted}
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                />
                <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={{ padding: 4 }}>
                  <Ionicons
                    name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                    size={18}
                    color={Colors.textMuted}
                  />
                </TouchableOpacity>
              </View>

              {error ? <Text style={styles.errorText}>{error}</Text> : null}

              {/* Sign in */}
              <TouchableOpacity
                style={styles.primaryBtn}
                onPress={handleSignIn}
                disabled={loading}
                activeOpacity={0.8}
              >
                <LinearGradient
                  colors={[Colors.primaryLight, Colors.primary]}
                  style={styles.btnGradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                >
                  {loading ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <>
                      <Ionicons name="log-in-outline" size={20} color="#fff" />
                      <Text style={styles.primaryBtnText}>Sign In</Text>
                    </>
                  )}
                </LinearGradient>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.secondaryBtn}
                onPress={() => router.push('/(auth)/onboarding')}
                activeOpacity={0.8}
              >
                <Text style={styles.secondaryBtnText}>New athlete? Create an account →</Text>
              </TouchableOpacity>

              <View style={styles.coachHint}>
                <Ionicons name="shield-checkmark-outline" size={13} color={Colors.gold} />
                <Text style={styles.coachHintText}>
                  Lopeprat coaches — sign in above with your team account
                </Text>
              </View>
            </View>
          ) : (
            // ── Mock / dev mode ──────────────────────────────────
            <View style={styles.actions}>
              <View style={styles.devBanner}>
                <Ionicons name="code-slash-outline" size={14} color={Colors.textMuted} />
                <Text style={styles.devBannerText}>Dev mode — Supabase not configured</Text>
              </View>

              <TouchableOpacity style={styles.primaryBtn} onPress={handleMockAthlete} activeOpacity={0.8}>
                <LinearGradient
                  colors={[Colors.primaryLight, Colors.primary]}
                  style={styles.btnGradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                >
                  <Ionicons name="person-outline" size={20} color="#fff" />
                  <Text style={styles.primaryBtnText}>Sign In as Athlete</Text>
                </LinearGradient>
              </TouchableOpacity>

              <TouchableOpacity style={styles.secondaryBtn} onPress={handleMockNewAthlete} activeOpacity={0.8}>
                <Text style={styles.secondaryBtnText}>New athlete? Start here →</Text>
              </TouchableOpacity>

              <View style={styles.divider}>
                <View style={styles.dividerLine} />
                <Text style={styles.dividerText}>Lopeprat team?</Text>
                <View style={styles.dividerLine} />
              </View>

              <TouchableOpacity style={styles.coachBtn} onPress={handleMockCoach} activeOpacity={0.8}>
                <Ionicons name="shield-checkmark-outline" size={18} color={Colors.gold} />
                <Text style={styles.coachBtnText}>Coach Sign In</Text>
              </TouchableOpacity>
            </View>
          )}

          <Text style={styles.footer}>
            By continuing you agree to our Terms of Service and Privacy Policy
          </Text>
        </SafeAreaView>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  safe: { flex: 1, paddingHorizontal: Spacing.lg },

  header: { alignItems: 'center', paddingTop: 48 },
  logoMark: {
    width: 56, height: 56, borderRadius: 16,
    backgroundColor: Colors.primaryFade,
    borderWidth: 1, borderColor: Colors.primary + '44',
    alignItems: 'center', justifyContent: 'center', marginBottom: 12,
  },
  wordmark: { ...Font.h2, color: Colors.text, letterSpacing: 6 },
  tagline: { ...Font.label, color: Colors.primary, letterSpacing: 4, marginTop: 2 },

  hero: { flex: 1, justifyContent: 'center', paddingBottom: 16, paddingRight: 50, paddingLeft: 50},
  heroTitle: { ...Font.h1, color: Colors.text, lineHeight: 40, marginBottom: 16 },
  heroSubtitle: { ...Font.body, color: Colors.textSecondary, lineHeight: 24 },

  statsRow: {
    flexDirection: 'row',
    backgroundColor: Colors.card,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.md,
    margin: 10,
    marginBottom: Spacing.xl,
    justifyContent: 'space-around',
  },
  stat: { alignItems: 'center' },
  statValue: { ...Font.h3, color: Colors.primary },
  statLabel: { ...Font.small, color: Colors.textSecondary, marginTop: 2 },

  actions: { gap: 12, marginBottom: Spacing.md, padding: 10 },

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
  input: { flex: 1, color: Colors.text, fontSize: 15 },

  errorText: { ...Font.small, color: Colors.error, textAlign: 'center' },

  primaryBtn: { borderRadius: Radius.md, overflow: 'hidden' },
  btnGradient: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, height: 56,
  },
  primaryBtnText: { ...Font.h4, color: '#fff' },

  secondaryBtn: {
    height: 48, alignItems: 'center', justifyContent: 'center',
    backgroundColor: Colors.card, borderRadius: Radius.md,
    borderWidth: 1, borderColor: Colors.border,
  },
  secondaryBtnText: { ...Font.body, color: Colors.textSecondary },

  divider: { flexDirection: 'row', alignItems: 'center', gap: 10, marginVertical: 4 },
  dividerLine: { flex: 1, height: 1, backgroundColor: Colors.border },
  dividerText: { ...Font.small, color: Colors.textMuted },

  coachBtn: {
    height: 48, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: Colors.goldFade, borderRadius: Radius.md,
    borderWidth: 1, borderColor: Colors.gold + '44',
  },
  coachBtnText: { ...Font.h4, color: Colors.gold },

  devBanner: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    backgroundColor: Colors.surface, borderRadius: Radius.sm,
    borderWidth: 1, borderColor: Colors.border,
    paddingVertical: 8,
  },
  devBannerText: { ...Font.small, color: Colors.textMuted },

  coachHint: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 4,
  },
  coachHintText: { ...Font.small, color: Colors.textMuted },

  footer: { ...Font.small, color: Colors.textMuted, textAlign: 'center', marginBottom: 16, lineHeight: 18 },
});
