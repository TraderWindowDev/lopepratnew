import { create } from 'zustand';
import type { Session, RealtimeChannel } from '@supabase/supabase-js';
import {
  currentAthlete,
  currentWeek,
  messages as initialMessages,
  milestones as mockMilestones,
  trainingPlans,
  allAthletes,
  Message,
  Milestone,
  TrainingPlan,
  WeekPlan,
  Athlete,
} from '@/constants/mock-data';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { getProfile, type UserProfile } from '@/lib/api/auth';
import {
  fetchProfile,
  fetchAthleteRow,
  fetchPlan,
  fetchAllWorkoutLogs,
  fetchMilestones,
  fetchPersonalBests,
  buildAthleteFromParts,
  buildPlanFromRow,
  buildWeekPlanFromPlan,
  computeAthleteStats,
  parsePaceToNum,
  emptyWeekPlan,
} from '@/lib/api/athletes';
import { fetchAllAthletes } from '@/lib/api/coach';
import { fetchAllPlans, advancePlanWeek } from '@/lib/api/plans';
import { fetchMessages, sendMessage as sendMessageApi, subscribeToMessages } from '@/lib/api/messages';
import { logWorkout as logWorkoutApi } from '@/lib/api/workouts';
import type { MessageRow } from '@/lib/api/messages';

type UserMode = 'athlete' | 'coach' | null;
type Workout = (typeof currentWeek.workouts)[0];

interface AppState {
  session: Session | null;
  profile: UserProfile | null;
  isInitializing: boolean;
  userMode: UserMode;
  isOnboarded: boolean;
  // Athlete state
  athlete: Athlete;
  weekPlan: WeekPlan;
  assignedPlan: TrainingPlan | null;
  viewingWeekIndex: number;
  messages: Message[];
  athleteMilestones: Milestone[];
  unreadMessageCount: number;
  inAppNotification: { id: string; senderName: string; text: string; athleteId?: string } | null;
  // Coach state
  coachAthletes: Athlete[];
  coachPlans: TrainingPlan[];
  coachMessagesByAthlete: Record<string, Message[]>;
  // Actions
  initialize: () => Promise<void>;
  refreshAthleteState: () => Promise<void>;
  refreshCoachPlans: () => Promise<void>;
  refreshCoachAthletes: () => Promise<void>;
  setUserMode: (mode: UserMode) => void;
  setOnboarded: (v: boolean) => void;
  setViewingWeek: (index: number) => void;
  sendMessage: (text: string) => void;
  markMessagesRead: () => void;
  clearNotification: () => void;
  loadCoachChat: (athleteId: string) => Promise<void>;
  sendCoachMessage: (athleteId: string, text: string) => void;
  subscribeCoachChat: (athleteId: string) => void;
  unsubscribeCoachChat: () => void;
  logWorkout: (workoutId: string, data: NonNullable<Workout['actual']>) => void;
  setTargetRace: (name: string, date: string, location: string) => void;
  logout: () => Promise<void>;
}

function mapMessageRow(row: MessageRow): Message {
  const sender = Array.isArray(row.sender) ? row.sender[0] : row.sender;
  return {
    id: row.id,
    senderId: row.sender_id,
    senderName: sender?.name ?? (row.is_coach ? 'Coach' : 'Athlete'),
    senderInitials: sender?.initials ?? (row.is_coach ? 'CO' : 'AT'),
    senderColor: sender?.avatar_color ?? '#818CF8',
    text: row.text,
    timestamp: row.created_at,
    isCoach: row.is_coach,
  };
}

async function loadAthleteState(userId: string): Promise<Partial<AppState>> {
  console.log('[store] loading athlete state for', userId);
  const [profile, athleteRow] = await Promise.all([
    fetchProfile(userId),
    fetchAthleteRow(userId),
  ]);
  console.log('[store] profile:', profile?.name, '| athleteRow assigned_plan:', athleteRow?.assigned_plan_id);

  const [milestoneRows, pbRows, messageRows] = await Promise.all([
    fetchMilestones(userId),
    fetchPersonalBests(userId),
    fetchMessages(userId).catch((e) => { console.warn('[store] fetchMessages:', e.message); return [] as MessageRow[]; }),
  ]);

  const personalBests = pbRows;
  const athleteMilestones = milestoneRows;
  const messages = messageRows.map(mapMessageRow);

  const weekIndex = athleteRow?.current_plan_week_index ?? 0;

  // Fetch ALL logs — mileage counts every run, plan filter only applies to completion ticks
  const allLogs = await fetchAllWorkoutLogs(userId);
  const { currentWeekMileage, weeklyMileageHistory, paceHistory } = computeAthleteStats(allLogs, weekIndex);

  const athlete: Athlete = {
    ...buildAthleteFromParts(userId, profile, athleteRow),
    personalBests,
    currentWeekMileage,
    weeklyMileageHistory,
    paceHistory,
  };

  let assignedPlan: TrainingPlan | null = null;
  let weekPlan = emptyWeekPlan;

  if (athleteRow?.assigned_plan_id) {
    const planRow = await fetchPlan(athleteRow.assigned_plan_id);
    assignedPlan = buildPlanFromRow(planRow);
    if (assignedPlan) {
      // Only logs tagged to this plan count as "completed" on a specific day.
      // All logs still count toward mileage (computed above with allLogs).
      const planId = athleteRow.assigned_plan_id;
      const weekLogs = allLogs.filter(
        l => l.week_index === weekIndex && (l as any).plan_id === planId
      );
      weekPlan = buildWeekPlanFromPlan(assignedPlan, weekIndex, weekLogs);
    }
  }
  return { athlete, assignedPlan, viewingWeekIndex: weekIndex, weekPlan, messages, athleteMilestones };
}

async function loadCoachState(): Promise<Partial<AppState>> {
  console.log('[store] loading coach state');
  const [athletes, planRows] = await Promise.all([
    fetchAllAthletes(),
    fetchAllPlans().catch((e) => { console.warn('[store] fetchAllPlans:', e.message); return []; }),
  ]);
  const plans = planRows.map(buildPlanFromRow).filter(Boolean) as TrainingPlan[];
  console.log('[store] coach sees', athletes.length, 'athletes,', plans.length, 'plans');
  return { coachAthletes: athletes, coachPlans: plans };
}

const mockReset = {
  athlete: currentAthlete,
  weekPlan: currentWeek,
  assignedPlan: trainingPlans.find((p) => p.id === currentAthlete.assignedPlanId) ?? null,
  messages: initialMessages,
  athleteMilestones: mockMilestones,
  unreadMessageCount: 0,
  inAppNotification: null,
  coachAthletes: allAthletes,
  coachPlans: trainingPlans,
  coachMessagesByAthlete: {},
};

// Realtime channels — held outside Zustand so they don't serialize
let athleteChannel: RealtimeChannel | null = null;
let messageChannel: RealtimeChannel | null = null;
let coachChatChannel: RealtimeChannel | null = null;
let coachNotificationChannel: RealtimeChannel | null = null;
let athleteChannelUserId: string | null = null;
let messageChannelUserId: string | null = null;
let coachChatChannelAthleteId: string | null = null;
let coachNotificationActive = false;

function subscribeToAthleteRow(userId: string, onUpdate: () => void) {
  if (athleteChannelUserId === userId && athleteChannel) return;
  if (athleteChannel) { supabase.removeChannel(athleteChannel); athleteChannel = null; }
  athleteChannelUserId = userId;
  athleteChannel = supabase
    .channel(`athlete-row:${userId}:${Date.now()}`)
    .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'athletes', filter: `id=eq.${userId}` }, () => {
      console.log('[store] athlete row updated — reloading');
      onUpdate();
    })
    .subscribe((status) => {
      console.log('[store] athlete realtime:', status);
      if ((status === 'CLOSED' || status === 'CHANNEL_ERROR') && athleteChannelUserId === userId) {
        // Connection dropped — reset the guard and reconnect after a short delay
        athleteChannelUserId = null;
        athleteChannel = null;
        setTimeout(() => subscribeToAthleteRow(userId, onUpdate), 3000);
      }
    });
}

function subscribeToAthleteMessages(userId: string, onNew: (msg: Message) => void) {
  if (messageChannelUserId === userId && messageChannel) return;
  if (messageChannel) { supabase.removeChannel(messageChannel); messageChannel = null; }
  messageChannelUserId = userId;

  // subscribeToMessages returns the channel; wrap so we can attach reconnect logic
  const channel = supabase
    .channel(`messages:athlete:${userId}:${Date.now()}`)
    .on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'messages', filter: `athlete_id=eq.${userId}` },
      (payload) => onNew(mapMessageRow(payload.new as MessageRow))
    )
    .subscribe((status) => {
      console.log('[store] messages realtime:', status);
      if ((status === 'CLOSED' || status === 'CHANNEL_ERROR') && messageChannelUserId === userId) {
        messageChannelUserId = null;
        messageChannel = null;
        setTimeout(() => subscribeToAthleteMessages(userId, onNew), 3000);
      }
    });
  messageChannel = channel;
}

function subscribeCoachIncoming(onNew: (row: MessageRow) => void) {
  if (coachNotificationActive && coachNotificationChannel) return;
  if (coachNotificationChannel) { supabase.removeChannel(coachNotificationChannel); coachNotificationChannel = null; }
  coachNotificationActive = true;
  coachNotificationChannel = supabase
    .channel(`coach-notifications:${Date.now()}`)
    .on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'messages' },
      (payload) => {
        const row = payload.new as MessageRow;
        // Only notify for athlete-sent messages, not the coach's own sends
        if (!row.is_coach) onNew(row);
      }
    )
    .subscribe((status) => console.log('[store] coach notifications:', status));
}

function cleanupChannels() {
  athleteChannelUserId = null;
  messageChannelUserId = null;
  coachChatChannelAthleteId = null;
  coachNotificationActive = false;
  if (athleteChannel) { supabase.removeChannel(athleteChannel); athleteChannel = null; }
  if (messageChannel) { supabase.removeChannel(messageChannel); messageChannel = null; }
  if (coachChatChannel) { supabase.removeChannel(coachChatChannel); coachChatChannel = null; }
  if (coachNotificationChannel) { supabase.removeChannel(coachNotificationChannel); coachNotificationChannel = null; }
}

export const useStore = create<AppState>((set, get) => ({
  session: null,
  profile: null,
  isInitializing: true,
  userMode: null,
  isOnboarded: false,
  ...mockReset,
  viewingWeekIndex: currentAthlete.currentPlanWeekIndex ?? 0,

  initialize: async () => {
    if (!isSupabaseConfigured) {
      set({ isInitializing: false });
      return;
    }

    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user) {
      const profile = await getProfile(session.user.id);
      if (profile) {
        const roleState = profile.role === 'athlete'
          ? await loadAthleteState(session.user.id)
          : await loadCoachState();
        set({ session, profile, userMode: profile.role as UserMode, isOnboarded: true, ...roleState });

        if (profile.role === 'athlete') {
          subscribeToAthleteRow(session.user.id, async () => {
            const newState = await loadAthleteState(session.user.id);
            set(newState);
          });
          subscribeToAthleteMessages(session.user.id, (msg) => {
            set((state) => {
              if (state.messages.some((m) => m.id === msg.id)) return state;
              return {
                messages: [...state.messages, msg],
                unreadMessageCount: state.unreadMessageCount + 1,
                inAppNotification: { id: msg.id, senderName: msg.senderName, text: msg.text },
              };
            });
          });
        } else if (profile.role === 'coach') {
          subscribeCoachIncoming((row) => {
            const msg = mapMessageRow(row);
            set((state) => ({
              unreadMessageCount: state.unreadMessageCount + 1,
              inAppNotification: { id: msg.id, senderName: msg.senderName, text: msg.text, athleteId: row.athlete_id },
            }));
          });
        }
      }
    }
    set({ isInitializing: false });

    supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' && session?.user) {
        const profile = await getProfile(session.user.id);
        if (profile) {
          const roleState = profile.role === 'athlete'
            ? await loadAthleteState(session.user.id)
            : await loadCoachState();
          set({ session, profile, userMode: profile.role as UserMode, isOnboarded: true, ...roleState });

          if (profile.role === 'athlete') {
            subscribeToAthleteRow(session.user.id, async () => {
              const newState = await loadAthleteState(session.user.id);
              set(newState);
            });
            subscribeToAthleteMessages(session.user.id, (msg) => {
              set((state) => {
                if (state.messages.some((m) => m.id === msg.id)) return state;
                return {
                  messages: [...state.messages, msg],
                  unreadMessageCount: state.unreadMessageCount + 1,
                  inAppNotification: { id: msg.id, senderName: msg.senderName, text: msg.text },
                };
              });
            });
          } else if (profile.role === 'coach') {
            subscribeCoachIncoming((row) => {
              const msg = mapMessageRow(row);
              set((state) => ({
                unreadMessageCount: state.unreadMessageCount + 1,
                inAppNotification: { id: msg.id, senderName: msg.senderName, text: msg.text, athleteId: row.athlete_id },
              }));
            });
          }
        }
      } else if (event === 'SIGNED_OUT') {
        // Supabase can fire SIGNED_OUT transiently during token refresh or WebSocket
        // reconnection. Re-check the session before clearing state so we don't kick
        // the user out when the connection just dropped momentarily.
        const { data: { session: recheck } } = await supabase.auth.getSession();
        if (!recheck) {
          cleanupChannels();
          set({ session: null, profile: null, userMode: null, isOnboarded: false, ...mockReset });
        } else {
          console.log('[store] SIGNED_OUT event but session still valid — ignoring');
        }
      }
    });
  },

  refreshAthleteState: async () => {
    const { session } = get();
    if (!session?.user) return;
    const newState = await loadAthleteState(session.user.id);
    set(newState);
  },

  refreshCoachPlans: async () => {
    try {
      const planRows = await fetchAllPlans();
      const plans = planRows.map(buildPlanFromRow).filter(Boolean) as TrainingPlan[];
      set({ coachPlans: plans });
    } catch (e: any) {
      console.warn('[store] refreshCoachPlans:', e.message);
    }
  },

  refreshCoachAthletes: async () => {
    const athletes = await fetchAllAthletes();
    set({ coachAthletes: athletes });
  },

  setUserMode: (mode) => set({ userMode: mode }),
  setOnboarded: (v) => set({ isOnboarded: v }),
  setViewingWeek: (index) => set({ viewingWeekIndex: index }),

  sendMessage: (text) => {
    const { session, athlete, messages } = get();
    if (isSupabaseConfigured && session?.user) {
      // Write to Supabase; Realtime subscription will add to state (dedup by id)
      sendMessageApi({
        senderId: session.user.id,
        athleteId: session.user.id,
        text,
        isCoach: false,
      }).then((row) => {
        // Add immediately without waiting for realtime
        if (row) {
          const msg: Message = {
            id: row.id,
            senderId: session.user.id,
            senderName: athlete.name,
            senderInitials: athlete.initials,
            senderColor: athlete.avatarColor,
            text,
            timestamp: row.created_at,
            isCoach: false,
          };
          set((state) => {
            if (state.messages.some((m) => m.id === msg.id)) return state;
            return { messages: [...state.messages, msg] };
          });
        }
      }).catch((e) => console.warn('[store] sendMessage:', e.message));
    } else {
      // Mock mode: add locally
      set({
        messages: [
          ...messages,
          {
            id: `msg-${Date.now()}`,
            senderId: session?.user.id ?? 'athlete',
            senderName: athlete.name,
            senderInitials: athlete.initials,
            senderColor: athlete.avatarColor,
            text,
            timestamp: new Date().toISOString(),
            isCoach: false,
          } as Message,
        ],
      });
    }
  },

  markMessagesRead: () => set({ unreadMessageCount: 0, inAppNotification: null }),
  clearNotification: () => set({ inAppNotification: null }),

  loadCoachChat: async (athleteId) => {
    try {
      const rows = await fetchMessages(athleteId);
      const msgs = rows.map(mapMessageRow);
      set((state) => ({
        coachMessagesByAthlete: { ...state.coachMessagesByAthlete, [athleteId]: msgs },
      }));
    } catch (e: any) {
      console.warn('[store] loadCoachChat:', e.message);
    }
  },

  sendCoachMessage: (athleteId, text) => {
    const { session, profile } = get();
    if (!isSupabaseConfigured || !session?.user) return;
    sendMessageApi({
      senderId: session.user.id,
      athleteId,
      text,
      isCoach: true,
    }).then((row) => {
      if (row) {
        const msg: Message = {
          id: row.id,
          senderId: session.user.id,
          senderName: profile?.name ?? 'Coach',
          senderInitials: profile?.initials ?? 'CO',
          senderColor: profile?.avatar_color ?? '#818CF8',
          text,
          timestamp: row.created_at,
          isCoach: true,
        };
        set((state) => {
          const existing = state.coachMessagesByAthlete[athleteId] ?? [];
          if (existing.some((m) => m.id === msg.id)) return state;
          return { coachMessagesByAthlete: { ...state.coachMessagesByAthlete, [athleteId]: [...existing, msg] } };
        });
      }
    }).catch((e) => console.warn('[store] sendCoachMessage:', e.message));
  },

  subscribeCoachChat: (athleteId) => {
    if (coachChatChannelAthleteId === athleteId && coachChatChannel) return;
    if (coachChatChannel) { supabase.removeChannel(coachChatChannel); coachChatChannel = null; }
    coachChatChannelAthleteId = athleteId;
    coachChatChannel = subscribeToMessages(athleteId, (row) => {
      const msg = mapMessageRow(row);
      set((state) => {
        const existing = state.coachMessagesByAthlete[athleteId] ?? [];
        if (existing.some((m) => m.id === msg.id)) return state;
        return { coachMessagesByAthlete: { ...state.coachMessagesByAthlete, [athleteId]: [...existing, msg] } };
      });
    });
  },

  unsubscribeCoachChat: () => {
    coachChatChannelAthleteId = null;
    if (coachChatChannel) { supabase.removeChannel(coachChatChannel); coachChatChannel = null; }
  },

  logWorkout: (workoutId, data) => {
    let advanceToWeek: number | null = null;

    set((state) => {
      const wasAlreadyCompleted = state.weekPlan.workouts.find(w => w.id === workoutId)?.completed ?? false;
      const newWorkouts = state.weekPlan.workouts.map((w) =>
        w.id === workoutId ? { ...w, completed: true, actual: data } : w
      );

      // Recompute current week mileage from all logged workouts
      const newCurrentWeekMileage = Math.round(
        newWorkouts.reduce((sum, w) => sum + (w.actual?.distance ?? 0), 0) * 10
      ) / 10;

      // Update the weekly mileage history for the viewing week slot
      const wIdx = state.viewingWeekIndex;
      const history = [...state.athlete.weeklyMileageHistory];
      while (history.length <= wIdx) history.push(0);
      history[wIdx] = newCurrentWeekMileage;

      // Update pace history if a pace was recorded
      let paceNum = data.avgPace && data.avgPace !== '—' ? parsePaceToNum(data.avgPace) : 0;
      if (paceNum <= 0 && data.duration > 0 && data.distance > 0) {
        paceNum = data.duration / data.distance;
      }
      const paceHistory = [...state.athlete.paceHistory];
      if (paceNum > 0) {
        const label = `W${wIdx + 1}`;
        const existingIdx = paceHistory.findIndex(p => p.date === label);
        if (existingIdx >= 0) {
          const prev = paceHistory[existingIdx].pace;
          paceHistory[existingIdx] = {
            date: label,
            pace: Math.round(((prev + paceNum) / 2) * 100) / 100,
          };
        } else {
          paceHistory.push({ date: label, pace: Math.round(paceNum * 100) / 100 });
          paceHistory.sort((a, b) => parseInt(a.date.slice(1)) - parseInt(b.date.slice(1)));
        }
      }

      // Increment streak for first-time completion (not re-logging)
      const newStreak = wasAlreadyCompleted ? state.athlete.streak : state.athlete.streak + 1;

      // Advance to next week if all non-rest workouts are now complete
      const allDone = newWorkouts.every(w => w.completed || w.type === 'rest');
      let nextWeekPlan = { ...state.weekPlan, workouts: newWorkouts };
      let nextViewingWeek = wIdx;
      if (allDone && state.assignedPlan && wIdx + 1 < state.assignedPlan.totalWeeks) {
        advanceToWeek = wIdx + 1;
        nextWeekPlan = buildWeekPlanFromPlan(state.assignedPlan, wIdx + 1, []);
        nextViewingWeek = wIdx + 1;
      }

      return {
        weekPlan: nextWeekPlan,
        viewingWeekIndex: nextViewingWeek,
        athlete: {
          ...state.athlete,
          currentWeekMileage: newCurrentWeekMileage,
          weeklyMileageHistory: history,
          paceHistory,
          streak: newStreak,
        },
      };
    });

    // Persist to Supabase in background
    const { session, viewingWeekIndex, athlete } = get();
    if (isSupabaseConfigured && session?.user) {
      const parts = workoutId.match(/plan-w(\d+)-d(\d+)/);
      const weekIndex = parts ? parseInt(parts[1]) : viewingWeekIndex;
      const dayIndex = parts ? parseInt(parts[2]) : 0;

      logWorkoutApi({
        athleteId: session.user.id,
        planId: get().assignedPlan?.id,
        weekIndex,
        dayIndex,
        distance: data.distance,
        durationMinutes: data.duration,
        avgPace: data.avgPace,
        avgHr: data.avgHR,
        elevGain: data.elevGain,
        effortRating: data.effortRating,
        notes: data.notes,
      }).catch((e) => console.warn('[store] logWorkout:', e.message));

      // Sync streak, mileage, and week index to DB
      Promise.resolve(
        supabase
          .from('athletes')
          .update({
            current_week_mileage: athlete.currentWeekMileage,
            streak: athlete.streak,
            ...(advanceToWeek !== null ? { current_plan_week_index: advanceToWeek } : {}),
          })
          .eq('id', session.user.id)
      ).then(() => {
        if (advanceToWeek !== null) {
          advancePlanWeek(session.user.id, advanceToWeek!).catch(() => {});
        }
      }).catch(() => {});
    }
  },

  setTargetRace: (name, date, location) => {
    set((state) => ({
      athlete: { ...state.athlete, targetRace: { name, date, location } },
    }));
    const { session } = get();
    if (isSupabaseConfigured && session?.user) {
      Promise.resolve(
        supabase
          .from('athletes')
          .update({ target_race_name: name, target_race_date: date, target_race_location: location })
          .eq('id', session.user.id)
      ).catch(() => {});
    }
  },

  logout: async () => {
    cleanupChannels();
    if (isSupabaseConfigured) {
      await supabase.auth.signOut();
    } else {
      set({ userMode: null, isOnboarded: false, session: null, profile: null, ...mockReset });
    }
  },
}));
