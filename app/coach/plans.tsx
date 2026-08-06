import React, { useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useStore } from '@/hooks/useStore';
import { Colors, Font, Spacing, Radius } from '@/constants/theme';
import { GOAL_LABELS, type TrainingPlan, type GoalType } from '@/constants/mock-data';
import { Card } from '@/components/ui/Card';
import { copyAndAssignPlan } from '@/lib/api/plans';

const GOAL_COLORS: Record<GoalType, string> = {
  first_5k: Colors.easy,
  first_10k: Colors.teal,
  first_half: Colors.tempo,
  first_marathon: Colors.primary,
  pb_half: Colors.interval,
  pb_marathon: Colors.gold,
};

export default function PlansScreen() {
  const router = useRouter();
  const { assignTo } = useLocalSearchParams<{ assignTo?: string }>();
  const { coachPlans, refreshCoachPlans, refreshCoachAthletes, coachAthletes } = useStore();
  const [assigning, setAssigning] = React.useState<string | null>(null);
  const [assignError, setAssignError] = React.useState('');

  useEffect(() => {
    refreshCoachPlans();
  }, []);

  const athlete = assignTo ? coachAthletes.find((a) => a.id === assignTo) : null;

  async function handleAssign(planId: string) {
    if (!assignTo) return;
    setAssigning(planId);
    setAssignError('');
    try {
      await copyAndAssignPlan(assignTo, planId);
      await refreshCoachAthletes();
      router.back();
    } catch (e: any) {
      setAssignError(e.message ?? 'Failed to assign plan');
    } finally {
      setAssigning(null);
    }
  }

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.safe}>
        <View style={styles.navbar}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="chevron-back" size={24} color={Colors.text} />
            <Text style={styles.backText}>{athlete ? athlete.name : 'Coach'}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.createBtn}
            onPress={() =>
              router.push(assignTo ? `/coach/create-plan?assignTo=${assignTo}` : '/coach/create-plan')
            }
          >
            <Ionicons name="add" size={18} color={Colors.primary} />
            <Text style={styles.createBtnText}>Ny plan</Text>
          </TouchableOpacity>
        </View>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
          <Text style={styles.title}>{assignTo ? 'Velg mal' : 'Planmaler'}</Text>

          {assignTo && (
            <View style={styles.assignBanner}>
              <Ionicons name="person-outline" size={14} color={Colors.primary} />
              <Text style={styles.assignBannerText}>
                Trykk på en mal for å tildele til {athlete?.name ?? 'utøver'}
              </Text>
            </View>
          )}
          {assignError ? (
            <View style={styles.errorBanner}>
              <Ionicons name="alert-circle-outline" size={14} color={Colors.error} />
              <Text style={styles.errorBannerText}>{assignError}</Text>
            </View>
          ) : null}

          {coachPlans.length === 0 ? (
            <View style={styles.empty}>
              <Ionicons name="layers-outline" size={48} color={Colors.textMuted} />
              <Text style={styles.emptyTitle}>Ingen maler ennå</Text>
              <Text style={styles.emptySub}>
                Opprett en planmal. Når du tildeler den til en utøver, får de sin egen
                uavhengige kopi — endringer i deres plan påvirker aldri malen.
              </Text>
              <TouchableOpacity
                style={styles.emptyBtn}
                onPress={() =>
                  router.push(assignTo ? `/coach/create-plan?assignTo=${assignTo}` : '/coach/create-plan')
                }
              >
                <Text style={styles.emptyBtnText}>Opprett mal</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.list}>
              {coachPlans.map((plan) => (
                <PlanCard
                  key={plan.id}
                  plan={plan}
                  assignMode={!!assignTo}
                  isAssigning={assigning === plan.id}
                  onAssign={() => handleAssign(plan.id)}
                  onEdit={() => router.push(`/coach/create-plan?planId=${plan.id}`)}
                />
              ))}
            </View>
          )}
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

function PlanCard({
  plan,
  assignMode,
  isAssigning,
  onAssign,
  onEdit,
}: {
  plan: TrainingPlan;
  assignMode: boolean;
  isAssigning: boolean;
  onAssign: () => void;
  onEdit: () => void;
}) {
  const goalColor = plan.targetGoal ? (GOAL_COLORS[plan.targetGoal] ?? Colors.primary) : Colors.primary;
  const totalKm = plan.weeks.reduce((sum, w) => sum + w.totalKm, 0);

  const inner = (
    <View style={styles.planCardInner}>
      <View style={styles.planTop}>
        <View style={styles.planLeft}>
          <Text style={styles.planName}>{plan.name}</Text>
          {plan.description ? (
            <Text style={styles.planDesc} numberOfLines={2}>{plan.description}</Text>
          ) : null}
        </View>
        <View style={styles.planWeekBadge}>
          <Text style={styles.planWeekNum}>{plan.totalWeeks}</Text>
          <Text style={styles.planWeekLabel}>uker</Text>
        </View>
      </View>

      <View style={styles.planMeta}>
        {plan.targetGoal ? (
          <View style={[styles.goalChip, { backgroundColor: goalColor + '22' }]}>
            <Text style={[styles.goalChipText, { color: goalColor }]}>
              {GOAL_LABELS[plan.targetGoal]}
            </Text>
          </View>
        ) : null}
        <Text style={styles.planTotalKm}>{totalKm} km totalt</Text>
      </View>

      <View style={styles.weekRow}>
        {plan.weeks.map((w, i) => (
          <View key={i} style={styles.weekDot}>
            <View
              style={[
                styles.weekBar,
                { height: Math.max(4, Math.min(32, (w.totalKm / 80) * 32)) },
              ]}
            />
            <Text style={styles.weekDotLabel}>W{i + 1}</Text>
          </View>
        ))}
      </View>

      {!assignMode && (
        <TouchableOpacity style={styles.editBtn} onPress={onEdit}>
          <Ionicons name="pencil-outline" size={14} color={Colors.textMuted} />
          <Text style={styles.editBtnText}>Rediger mal</Text>
        </TouchableOpacity>
      )}

      {assignMode && (
        <View style={styles.assignHint}>
          {isAssigning ? (
            <ActivityIndicator size="small" color={Colors.primary} />
          ) : (
            <>
              <Ionicons name="checkmark-circle-outline" size={14} color={Colors.primary} />
              <Text style={styles.assignHintText}>Trykk for å tildele</Text>
            </>
          )}
        </View>
      )}
    </View>
  );

  if (assignMode) {
    return (
      <TouchableOpacity
        activeOpacity={0.75}
        onPress={isAssigning ? undefined : onAssign}
        style={[styles.planCardWrap, isAssigning && { opacity: 0.6 }]}
      >
        {inner}
      </TouchableOpacity>
    );
  }

  return <Card style={styles.planCard} padding={0}>{inner}</Card>;
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  safe: { flex: 1 },
  scroll: { padding: Spacing.md, paddingBottom: 100 },

  navbar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    paddingVertical: 12,
  },
  backBtn: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  backText: { ...Font.body, color: Colors.text },
  createBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Colors.primaryFade,
    borderRadius: Radius.full,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  createBtnText: { ...Font.small, color: Colors.primary, fontWeight: '700' },

  title: { ...Font.h2, color: Colors.text, marginBottom: 12 },

  errorBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: Colors.error + '18', borderRadius: Radius.md,
    padding: 12, marginBottom: 12,
  },
  errorBannerText: { ...Font.small, color: Colors.error, flex: 1 },

  assignBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: Colors.primaryFade,
    borderRadius: Radius.md,
    padding: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: Colors.primary + '33',
  },
  assignBannerText: { ...Font.small, color: Colors.primary },

  empty: { alignItems: 'center', paddingTop: 60, gap: 12 },
  emptyTitle: { ...Font.h3, color: Colors.text },
  emptySub: { ...Font.small, color: Colors.textMuted, textAlign: 'center', maxWidth: 280 },
  emptyBtn: {
    marginTop: 8,
    backgroundColor: Colors.primary,
    borderRadius: Radius.full,
    paddingHorizontal: 24,
    paddingVertical: 12,
  },
  emptyBtnText: { ...Font.body, color: '#fff', fontWeight: '700' },

  list: { gap: 12 },

  planCardWrap: {
    backgroundColor: Colors.card,
    borderRadius: Radius.lg,
    borderWidth: 1.5,
    borderColor: Colors.primary + '55',
  },
  planCard: {},
  planCardInner: { padding: 16, gap: 12 },

  planTop: { flexDirection: 'row', gap: 12, alignItems: 'flex-start' },
  planLeft: { flex: 1, gap: 4 },
  planName: { ...Font.h4, color: Colors.text },
  planDesc: { ...Font.small, color: Colors.textSecondary },
  planWeekBadge: { alignItems: 'center', minWidth: 36 },
  planWeekNum: { ...Font.h3, color: Colors.primary },
  planWeekLabel: { ...Font.tiny, color: Colors.textMuted },

  planMeta: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  goalChip: {
    borderRadius: Radius.full,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  goalChipText: { fontSize: 11, fontWeight: '700' },
  planTotalKm: { ...Font.small, color: Colors.textMuted },

  weekRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 4, height: 44 },
  weekDot: { flex: 1, alignItems: 'center', gap: 3, justifyContent: 'flex-end' },
  weekBar: {
    width: '100%',
    backgroundColor: Colors.primary + '55',
    borderRadius: 2,
  },
  weekDotLabel: { ...Font.tiny, color: Colors.textMuted },

  assignHint: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: Colors.primary + '33',
  },
  assignHintText: { ...Font.small, color: Colors.primary, fontWeight: '600' },

  editBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  editBtnText: { ...Font.small, color: Colors.textMuted },
});
