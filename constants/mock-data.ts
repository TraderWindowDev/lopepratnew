export type GoalType = 'first_5k' | 'first_10k' | 'first_half' | 'first_marathon' | 'pb_half' | 'pb_marathon';
export type FitnessLevel = 'beginner' | 'intermediate' | 'advanced';
export type WorkoutType = 'easy' | 'tempo' | 'interval' | 'long' | 'rest' | 'race' | 'strength';
export type AthleteStatus = 'excellent' | 'on_track' | 'needs_attention' | 'injured';

export interface WorkoutStep {
  id: string;
  type: 'warmup' | 'main' | 'cooldown' | 'repeat';
  description: string;
  distance?: number;
  duration?: number;
  pace?: string;
  heartRateZone?: number;
  repeats?: number;
  steps?: WorkoutStep[];
}

export interface Workout {
  id: string;
  date: string;
  type: WorkoutType;
  title: string;
  subtitle: string;
  targetDistance?: number;
  targetDuration?: number;
  targetPace?: string;
  steps: WorkoutStep[];
  completed: boolean;
  coachNote?: string;
  actual?: {
    distance: number;
    duration: number;
    avgPace: string;
    avgHR: number;
    elevGain: number;
    effortRating: number;
    notes: string;
  };
}

export interface WeekPlan {
  weekNumber: number;
  phase: string;
  totalKm: number;
  workouts: Workout[];
}

export interface PlanDay {
  day: string;
  type: WorkoutType;
  title: string;
  km?: number;
  notes?: string;
  targetPace?: string;
  coachNote?: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  structuredWorkout?: any;
}

export interface PlanWeek {
  weekIndex: number;
  phase: string;
  focus: string;
  totalKm: number;
  days: PlanDay[];
}

export interface TrainingPlan {
  id: string;
  name: string;
  description: string;
  totalWeeks: number;
  targetGoal: GoalType;
  createdBy: string;
  createdAt: string;
  weeks: PlanWeek[];
}

export interface Milestone {
  id: string;
  title: string;
  description: string;
  achieved: boolean;
  achievedDate?: string;
  icon: string;
}

export interface Athlete {
  id: string;
  name: string;
  initials: string;
  avatarColor: string;
  age: number;
  goal: GoalType;
  targetRace: { name: string; date: string; location: string };
  fitnessLevel: FitnessLevel;
  weeklyMileageTarget: number;
  currentWeekMileage: number;
  status: AthleteStatus;
  lastActive: string;
  streak: number;
  complianceRate: number;
  personalBests: { distance: string; time: string; date: string }[];
  coachNote: string;
  joinDate: string;
  alerts: string[];
  assignedPlanId?: string;
  currentPlanWeekIndex?: number;
  weeklyMileageHistory: number[];
  paceHistory: { date: string; pace: number }[];
}

export interface Message {
  id: string;
  senderId: string;
  senderName: string;
  senderInitials: string;
  senderColor: string;
  text: string;
  timestamp: string;
  isCoach: boolean;
}

export interface ContentItem {
  id: string;
  type: 'video' | 'article' | 'podcast';
  title: string;
  description: string;
  duration: string;
  thumbnail: string;
  tag: string;
  date: string;
}

// ─── Athlete (Logged-in user) ─────────────────────────────────────
export const currentAthlete: Athlete = {
  id: 'athlete-1',
  name: 'Sarah Chen',
  initials: 'SC',
  avatarColor: '#818CF8',
  age: 32,
  goal: 'pb_marathon',
  targetRace: {
    name: 'Chicago Marathon',
    date: '2026-10-11',
    location: 'Chicago, IL',
  },
  fitnessLevel: 'intermediate',
  weeklyMileageTarget: 65,
  currentWeekMileage: 38,
  status: 'on_track',
  lastActive: 'Today',
  streak: 14,
  complianceRate: 88,
  joinDate: '2026-01-15',
  personalBests: [
    { distance: '5K', time: '24:12', date: '2025-03-15' },
    { distance: '10K', time: '50:34', date: '2025-06-22' },
    { distance: 'Half Marathon', time: '1:52:18', date: '2025-09-14' },
    { distance: 'Marathon', time: '4:05:44', date: '2024-10-13' },
  ],
  coachNote: 'Sarah is progressing well through the build phase. Watch HR on tempo runs — keep Z3. Add 10 min strength twice/week.',
  alerts: [],
  assignedPlanId: 'plan-sarah-chicago',
  currentPlanWeekIndex: 2,
  weeklyMileageHistory: [42, 48, 50, 44, 55, 58, 60, 62, 58, 65, 68, 38],
  paceHistory: [
    { date: 'Jan', pace: 6.2 },
    { date: 'Feb', pace: 6.1 },
    { date: 'Mar', pace: 5.9 },
    { date: 'Apr', pace: 5.85 },
    { date: 'May', pace: 5.7 },
    { date: 'Jun', pace: 5.6 },
  ],
};

// ─── This week's training plan ────────────────────────────────────
export const currentWeek: WeekPlan = {
  weekNumber: 24,
  phase: 'Build Phase',
  totalKm: 65,
  workouts: [
    {
      id: 'w-mon',
      date: '2026-06-08',
      type: 'rest',
      title: 'Rest & Recovery',
      subtitle: 'Full rest or light stretching',
      steps: [],
      completed: true,
    },
    {
      id: 'w-tue',
      date: '2026-06-09',
      type: 'easy',
      title: 'Easy Run',
      subtitle: '10 km at conversational pace',
      targetDistance: 10,
      targetPace: '6:30–7:00/km',
      coachNote: 'Keep it truly easy. This is recovery from Sunday\'s long run.',
      steps: [
        { id: 's1', type: 'warmup', description: '5 min walk', duration: 5 },
        { id: 's2', type: 'main', description: '10 km easy', distance: 10, pace: '6:30–7:00/km', heartRateZone: 2 },
        { id: 's3', type: 'cooldown', description: '5 min walk + stretch', duration: 10 },
      ],
      completed: true,
      actual: {
        distance: 10.2,
        duration: 67,
        avgPace: '6:34/km',
        avgHR: 142,
        elevGain: 48,
        effortRating: 3,
        notes: 'Felt good. Legs a bit tired from weekend.',
      },
    },
    {
      id: 'w-wed',
      date: '2026-06-10',
      type: 'tempo',
      title: 'Tempo Run',
      subtitle: '14 km with 8 km at marathon pace',
      targetDistance: 14,
      targetPace: '5:20/km',
      coachNote: 'This is your key session this week. Marathon pace should feel controlled-hard. If HR goes above 170, back off slightly.',
      steps: [
        { id: 's1', type: 'warmup', description: '3 km easy warmup', distance: 3, pace: '6:30/km', heartRateZone: 2 },
        { id: 's2', type: 'main', description: '8 km at marathon pace', distance: 8, pace: '5:20/km', heartRateZone: 4 },
        { id: 's3', type: 'cooldown', description: '3 km easy cooldown', distance: 3, pace: '6:30/km', heartRateZone: 2 },
      ],
      completed: true,
      actual: {
        distance: 14.1,
        duration: 80,
        avgPace: '5:41/km',
        avgHR: 158,
        elevGain: 62,
        effortRating: 7,
        notes: 'Pace felt hard but controlled. Hit target for 6 of 8km.',
      },
    },
    {
      id: 'w-thu',
      date: '2026-06-11',
      type: 'easy',
      title: 'Recovery Run',
      subtitle: '8 km easy + drills',
      targetDistance: 8,
      targetPace: '6:45–7:15/km',
      steps: [
        { id: 's1', type: 'main', description: '8 km very easy', distance: 8, pace: '6:45–7:15/km', heartRateZone: 1 },
        { id: 's2', type: 'cooldown', description: '10 min running drills', duration: 10 },
      ],
      completed: true,
      actual: {
        distance: 8.0,
        duration: 57,
        avgPace: '7:08/km',
        avgHR: 135,
        elevGain: 22,
        effortRating: 2,
        notes: 'Easy shakeout. Hamstrings a bit tight.',
      },
    },
    {
      id: 'w-fri',
      date: '2026-06-12',
      type: 'interval',
      title: 'Track Intervals',
      subtitle: '6 × 1 km at 10K pace',
      targetDistance: 12,
      targetPace: '4:55/km',
      coachNote: 'Aim for consistency across all 6 reps. First rep often feels easiest — hold back. 90 sec jog between reps.',
      steps: [
        { id: 's1', type: 'warmup', description: '2 km warmup + strides', distance: 2, pace: '6:30/km' },
        {
          id: 's2', type: 'repeat', description: '6 × 1 km @ 10K pace', repeats: 6,
          steps: [
            { id: 'r1', type: 'main', description: '1 km hard', distance: 1, pace: '4:55/km', heartRateZone: 5 },
            { id: 'r2', type: 'main', description: '90 sec recovery jog', duration: 1.5, pace: '7:00/km' },
          ],
        },
        { id: 's3', type: 'cooldown', description: '2 km cooldown', distance: 2, pace: '6:30/km' },
      ],
      completed: false,
    },
    {
      id: 'w-sat',
      date: '2026-06-13',
      type: 'easy',
      title: 'Easy Run',
      subtitle: '10 km easy shakeout',
      targetDistance: 10,
      targetPace: '6:30–7:00/km',
      steps: [
        { id: 's1', type: 'main', description: '10 km easy', distance: 10, pace: '6:30–7:00/km', heartRateZone: 2 },
      ],
      completed: false,
    },
    {
      id: 'w-sun',
      date: '2026-06-14',
      type: 'long',
      title: 'Long Run',
      subtitle: '28 km progressive — finish at marathon pace',
      targetDistance: 28,
      targetPace: '6:00/km avg',
      coachNote: 'Start conservatively (6:30/km) and progress to marathon pace (5:20/km) for the final 8 km. Fuel every 45 min. This is your biggest session of the block.',
      steps: [
        { id: 's1', type: 'main', description: '12 km easy', distance: 12, pace: '6:30/km', heartRateZone: 2 },
        { id: 's2', type: 'main', description: '8 km moderate', distance: 8, pace: '5:50/km', heartRateZone: 3 },
        { id: 's3', type: 'main', description: '8 km at marathon pace', distance: 8, pace: '5:20/km', heartRateZone: 4 },
      ],
      completed: false,
    },
  ],
};

// ─── Milestones ───────────────────────────────────────────────────
export const milestones: Milestone[] = [
  { id: 'm1', title: 'First Run Logged', description: 'You started your journey', achieved: true, achievedDate: '2026-01-15', icon: 'flag' },
  { id: 'm2', title: '50 km Week', description: 'First week over 50 km', achieved: true, achievedDate: '2026-02-14', icon: 'trending-up' },
  { id: 'm3', title: '2-Week Streak', description: '14 consecutive training days', achieved: true, achievedDate: '2026-06-13', icon: 'flash-outline' },
  { id: 'm4', title: 'Tempo Master', description: 'Complete 10 tempo sessions', achieved: false, icon: 'time-outline' },
  { id: 'm5', title: '60 km Week', description: 'First week over 60 km', achieved: false, icon: 'pulse-outline' },
  { id: 'm6', title: 'Sub-3:55 Marathon', description: 'Your goal race target', achieved: false, icon: 'trophy-outline' },
];

// ─── Messages ─────────────────────────────────────────────────────
export const messages: Message[] = [
  {
    id: 'msg-1',
    senderId: 'coach-1',
    senderName: 'Coach Arnaud',
    senderInitials: 'CA',
    senderColor: '#E84B1A',
    text: 'Great session Wednesday! Your pace control in the middle miles was really solid. How did the legs feel after?',
    timestamp: '2026-06-11T09:14:00',
    isCoach: true,
  },
  {
    id: 'msg-2',
    senderId: 'athlete-1',
    senderName: 'Sarah Chen',
    senderInitials: 'SC',
    senderColor: '#818CF8',
    text: 'Thanks! Legs felt okay — a bit heavy for the last 2km but I held the pace. The hamstring tightness I mentioned is still there a little.',
    timestamp: '2026-06-11T09:22:00',
    isCoach: false,
  },
  {
    id: 'msg-3',
    senderId: 'coach-1',
    senderName: 'Coach Arnaud',
    senderInitials: 'CA',
    senderColor: '#E84B1A',
    text: 'Keep an eye on that. If it\'s still there after Friday\'s intervals, let me know and we\'ll swap Sunday\'s long run for a flatter route.',
    timestamp: '2026-06-11T09:31:00',
    isCoach: true,
  },
  {
    id: 'msg-4',
    senderId: 'coach-2',
    senderName: 'Coach Léa',
    senderInitials: 'CL',
    senderColor: '#2DD4BF',
    text: 'I reviewed your Strava data from the past 3 weeks. Your easy pace has improved by ~8 sec/km at the same HR — the aerobic base is building really well 💪',
    timestamp: '2026-06-12T08:05:00',
    isCoach: true,
  },
  {
    id: 'msg-5',
    senderId: 'athlete-1',
    senderName: 'Sarah Chen',
    senderInitials: 'SC',
    senderColor: '#818CF8',
    text: 'That\'s really encouraging to hear! Feeling more confident about Chicago.',
    timestamp: '2026-06-12T12:30:00',
    isCoach: false,
  },
  {
    id: 'msg-6',
    senderId: 'coach-1',
    senderName: 'Coach Arnaud',
    senderInitials: 'CA',
    senderColor: '#E84B1A',
    text: 'Big week ahead! Track session tomorrow — focus on consistent splits, not the first rep. See you on the other side 🏃',
    timestamp: '2026-06-12T20:45:00',
    isCoach: true,
  },
];

// ─── Content Library ─────────────────────────────────────────────
export const contentItems: ContentItem[] = [
  {
    id: 'c1',
    type: 'podcast',
    title: 'Fueling the Long Run — What to Eat and When',
    description: 'Arnaud and Léa break down marathon nutrition strategy: how many gels, when to take them, and what works for slower vs faster runners.',
    duration: '48 min',
    thumbnail: '#E84B1A',
    tag: 'Nutrition',
    date: '2026-06-10',
  },
  {
    id: 'c2',
    type: 'video',
    title: 'Running Form: The Hip Drive Fix',
    description: 'A common form flaw that costs energy and pace. Léa demonstrates drills to improve hip extension and cadence.',
    duration: '12 min',
    thumbnail: '#818CF8',
    tag: 'Form',
    date: '2026-06-06',
  },
  {
    id: 'c3',
    type: 'article',
    title: 'Build vs Race-Specific Training: What Week Are You In?',
    description: 'Understanding the three phases of marathon prep — why you\'re doing what you\'re doing and how the load changes.',
    duration: '5 min read',
    thumbnail: '#2DD4BF',
    tag: 'Training',
    date: '2026-06-03',
  },
  {
    id: 'c4',
    type: 'podcast',
    title: 'Q&A: Heart Rate Training, Overtraining & When to Skip a Run',
    description: 'Listener questions episode. When should you skip? Is HR drift bad? How do you know you\'re overtrained?',
    duration: '61 min',
    thumbnail: '#FBBF24',
    tag: 'Recovery',
    date: '2026-05-27',
  },
  {
    id: 'c5',
    type: 'video',
    title: 'How to Pace Your First Marathon',
    description: 'The number one mistake at Chicago: going out too fast. Arnaud explains the negative split strategy and even splits approach.',
    duration: '18 min',
    thumbnail: '#F472B6',
    tag: 'Race Day',
    date: '2026-05-20',
  },
  {
    id: 'c6',
    type: 'article',
    title: 'Sleep Is Your Secret Weapon',
    description: 'Recovery science: why 8 hours of sleep does more than a massage, and practical tips to improve sleep quality during heavy training.',
    duration: '4 min read',
    thumbnail: '#34D399',
    tag: 'Recovery',
    date: '2026-05-15',
  },
];

// ─── Coach: All Athletes ──────────────────────────────────────────
export const allAthletes: Athlete[] = [
  {
    id: 'athlete-1',
    name: 'Sarah Chen',
    initials: 'SC',
    avatarColor: '#818CF8',
    age: 32,
    goal: 'pb_marathon',
    targetRace: { name: 'Chicago Marathon', date: '2026-10-11', location: 'Chicago, IL' },
    fitnessLevel: 'intermediate',
    weeklyMileageTarget: 65,
    currentWeekMileage: 38,
    status: 'on_track',
    lastActive: 'Today',
    streak: 14,
    complianceRate: 88,
    joinDate: '2026-01-15',
    personalBests: [
      { distance: 'Half Marathon', time: '1:52:18', date: '2025-09-14' },
      { distance: 'Marathon', time: '4:05:44', date: '2024-10-13' },
    ],
    coachNote: 'Sarah is progressing well through the build phase. Watch HR on tempo runs — keep Z3. Add 10 min strength twice/week.',
    alerts: [],
    assignedPlanId: 'plan-sarah-chicago',
    currentPlanWeekIndex: 2,
    weeklyMileageHistory: [42, 48, 50, 44, 55, 58, 60, 62, 58, 65, 68, 38],
    paceHistory: [{ date: 'Jan', pace: 6.2 }, { date: 'Feb', pace: 6.1 }, { date: 'Mar', pace: 5.9 }, { date: 'Apr', pace: 5.85 }, { date: 'May', pace: 5.7 }, { date: 'Jun', pace: 5.6 }],
  },
  {
    id: 'athlete-2',
    name: 'Marcus Rivera',
    initials: 'MR',
    avatarColor: '#E84B1A',
    age: 28,
    goal: 'first_marathon',
    targetRace: { name: 'Paris Marathon', date: '2027-04-12', location: 'Paris, France' },
    fitnessLevel: 'beginner',
    weeklyMileageTarget: 40,
    currentWeekMileage: 28,
    status: 'excellent',
    lastActive: 'Today',
    streak: 21,
    complianceRate: 96,
    joinDate: '2026-02-01',
    personalBests: [
      { distance: '5K', time: '28:44', date: '2026-03-10' },
      { distance: '10K', time: '58:30', date: '2026-05-01' },
    ],
    coachNote: 'Marcus is exceeding expectations. Could be ready for a half in September. Very coachable, responds well to feedback.',
    alerts: [],
    assignedPlanId: 'plan-marcus-base',
    currentPlanWeekIndex: 3,
    weeklyMileageHistory: [15, 20, 22, 25, 28, 30, 32, 35, 33, 38, 40, 28],
    paceHistory: [{ date: 'Jan', pace: 7.2 }, { date: 'Feb', pace: 7.0 }, { date: 'Mar', pace: 6.8 }, { date: 'Apr', pace: 6.6 }, { date: 'May', pace: 6.5 }, { date: 'Jun', pace: 6.3 }],
  },
  {
    id: 'athlete-3',
    name: 'Emma Dubois',
    initials: 'ED',
    avatarColor: '#2DD4BF',
    age: 41,
    goal: 'pb_half',
    targetRace: { name: 'Lyon Half Marathon', date: '2026-09-20', location: 'Lyon, France' },
    fitnessLevel: 'advanced',
    weeklyMileageTarget: 70,
    currentWeekMileage: 18,
    status: 'needs_attention',
    lastActive: '3 days ago',
    streak: 0,
    complianceRate: 61,
    joinDate: '2025-11-10',
    personalBests: [
      { distance: 'Half Marathon', time: '1:38:55', date: '2025-09-21' },
      { distance: '10K', time: '44:12', date: '2025-06-15' },
    ],
    coachNote: 'Emma has gone quiet. Missed 3 sessions this week. Possible work stress or early injury. Needs check-in call.',
    alerts: ['3 sessions missed this week', 'No activity in 3 days'],
    weeklyMileageHistory: [65, 70, 68, 72, 60, 55, 70, 65, 68, 40, 55, 18],
    paceHistory: [{ date: 'Jan', pace: 5.0 }, { date: 'Feb', pace: 4.95 }, { date: 'Mar', pace: 4.9 }, { date: 'Apr', pace: 4.85 }, { date: 'May', pace: 5.1 }, { date: 'Jun', pace: 5.0 }],
  },
  {
    id: 'athlete-4',
    name: 'Thomas Nguyen',
    initials: 'TN',
    avatarColor: '#FBBF24',
    age: 35,
    goal: 'first_half',
    targetRace: { name: 'Berlin Half Marathon', date: '2026-09-27', location: 'Berlin, Germany' },
    fitnessLevel: 'beginner',
    weeklyMileageTarget: 35,
    currentWeekMileage: 22,
    status: 'on_track',
    lastActive: 'Yesterday',
    streak: 7,
    complianceRate: 79,
    joinDate: '2026-03-15',
    personalBests: [
      { distance: '5K', time: '32:10', date: '2026-04-20' },
    ],
    coachNote: 'Thomas is consistent but plays it safe. Need to push pace on tempo runs. Great attitude.',
    alerts: [],
    weeklyMileageHistory: [10, 15, 18, 20, 22, 25, 28, 30, 25, 32, 35, 22],
    paceHistory: [{ date: 'Jan', pace: 7.5 }, { date: 'Feb', pace: 7.3 }, { date: 'Mar', pace: 7.1 }, { date: 'Apr', pace: 6.9 }, { date: 'May', pace: 6.8 }, { date: 'Jun', pace: 6.7 }],
  },
  {
    id: 'athlete-5',
    name: 'Priya Sharma',
    initials: 'PS',
    avatarColor: '#F472B6',
    age: 29,
    goal: 'first_marathon',
    targetRace: { name: 'Amsterdam Marathon', date: '2026-10-18', location: 'Amsterdam, Netherlands' },
    fitnessLevel: 'intermediate',
    weeklyMileageTarget: 55,
    currentWeekMileage: 48,
    status: 'excellent',
    lastActive: 'Today',
    streak: 30,
    complianceRate: 94,
    joinDate: '2026-01-20',
    personalBests: [
      { distance: 'Half Marathon', time: '1:58:44', date: '2026-04-05' },
      { distance: '10K', time: '53:22', date: '2026-02-28' },
    ],
    coachNote: 'Priya is our star. 30-day streak! Responding really well to the plan. Consider a fitness test this month.',
    alerts: [],
    weeklyMileageHistory: [30, 35, 38, 40, 42, 45, 48, 50, 52, 50, 55, 48],
    paceHistory: [{ date: 'Jan', pace: 6.5 }, { date: 'Feb', pace: 6.3 }, { date: 'Mar', pace: 6.1 }, { date: 'Apr', pace: 5.9 }, { date: 'May', pace: 5.8 }, { date: 'Jun', pace: 5.7 }],
  },
  {
    id: 'athlete-6',
    name: 'James Okoye',
    initials: 'JO',
    avatarColor: '#34D399',
    age: 44,
    goal: 'pb_marathon',
    targetRace: { name: 'New York Marathon', date: '2026-11-01', location: 'New York, NY' },
    fitnessLevel: 'advanced',
    weeklyMileageTarget: 80,
    currentWeekMileage: 61,
    status: 'on_track',
    lastActive: 'Today',
    streak: 9,
    complianceRate: 83,
    joinDate: '2025-10-05',
    personalBests: [
      { distance: 'Marathon', time: '3:28:15', date: '2025-04-27' },
      { distance: 'Half Marathon', time: '1:34:50', date: '2025-09-28' },
    ],
    coachNote: 'James is targeting sub-3:20 at NYC. Heart rate data shows strong aerobic fitness. Managing a historic calf issue.',
    alerts: [],
    weeklyMileageHistory: [75, 80, 78, 82, 75, 80, 78, 80, 82, 78, 80, 61],
    paceHistory: [{ date: 'Jan', pace: 4.8 }, { date: 'Feb', pace: 4.75 }, { date: 'Mar', pace: 4.7 }, { date: 'Apr', pace: 4.65 }, { date: 'May', pace: 4.6 }, { date: 'Jun', pace: 4.55 }],
  },
];

// ─── Training Plans ───────────────────────────────────────────────
export const trainingPlans: TrainingPlan[] = [
  {
    id: 'plan-sarah-chicago',
    name: 'Chicago Marathon — Build & Peak',
    description: '4-week block targeting sub-3:55 at Chicago. Progresses from 55 km to 65 km before a taper week.',
    totalWeeks: 4,
    targetGoal: 'pb_marathon',
    createdBy: 'Coach Arnaud',
    createdAt: '2026-05-25',
    weeks: [
      {
        weekIndex: 0,
        phase: 'Build Phase',
        focus: 'Aerobic base, introduce tempo',
        totalKm: 55,
        days: [
          { day: 'Mon', type: 'rest', title: 'Rest & Recovery' },
          { day: 'Tue', type: 'easy', title: 'Easy Run', km: 8, notes: 'Zone 2 — conversational pace', targetPace: '6:30–7:00/km' },
          { day: 'Wed', type: 'tempo', title: 'Tempo Run', km: 12, notes: '3km warm-up + 6km @MP + 3km cool-down', targetPace: '5:20/km', coachNote: 'Keep the middle 6km controlled-hard. HR should stay under 170.' },
          { day: 'Thu', type: 'easy', title: 'Recovery Run', km: 6, targetPace: '6:45–7:15/km' },
          { day: 'Fri', type: 'interval', title: 'Track Intervals', km: 10, notes: '5 × 1km @ 10K pace · 90 sec jog', targetPace: '4:55/km', coachNote: 'Aim for consistent splits. First rep often feels easiest — hold back.' },
          { day: 'Sat', type: 'easy', title: 'Easy Run', km: 8, targetPace: '6:30–7:00/km' },
          { day: 'Sun', type: 'long', title: 'Long Run', km: 22, notes: 'Easy effort — no pace targets', targetPace: '6:00–6:30/km', coachNote: 'Purely aerobic today. If you feel good in the last 5km you can pick up slightly, but no pressure.' },
        ],
      },
      {
        weekIndex: 1,
        phase: 'Build Phase',
        focus: 'Volume increase, longer tempo',
        totalKm: 60,
        days: [
          { day: 'Mon', type: 'rest', title: 'Rest & Recovery' },
          { day: 'Tue', type: 'easy', title: 'Easy Run', km: 10 },
          { day: 'Wed', type: 'tempo', title: 'Tempo Run', km: 14, notes: '3km warm-up + 8km @MP + 3km cool-down' },
          { day: 'Thu', type: 'easy', title: 'Recovery Run', km: 6 },
          { day: 'Fri', type: 'interval', title: 'Track Intervals', km: 12, notes: '6 × 1km @ 10K pace' },
          { day: 'Sat', type: 'easy', title: 'Easy Run', km: 8 },
          { day: 'Sun', type: 'long', title: 'Long Run', km: 25, notes: 'First 15km easy, last 10km @MP' },
        ],
      },
      {
        weekIndex: 2,
        phase: 'Peak Week',
        focus: 'Race-specific fitness — biggest week',
        totalKm: 65,
        days: [
          { day: 'Mon', type: 'rest', title: 'Rest & Recovery' },
          { day: 'Tue', type: 'easy', title: 'Easy Run', km: 10 },
          { day: 'Wed', type: 'tempo', title: 'Tempo Run', km: 14, notes: '3km warm-up + 8km @MP + 3km cool-down' },
          { day: 'Thu', type: 'easy', title: 'Recovery Run', km: 8 },
          { day: 'Fri', type: 'interval', title: 'Track Intervals', km: 12, notes: '6 × 1km @ 10K pace' },
          { day: 'Sat', type: 'easy', title: 'Easy Run', km: 10 },
          { day: 'Sun', type: 'long', title: 'Long Run', km: 28, notes: '12km easy + 8km moderate + 8km @MP' },
        ],
      },
      {
        weekIndex: 3,
        phase: 'Taper Week',
        focus: 'Freshen legs, sharpen race readiness',
        totalKm: 45,
        days: [
          { day: 'Mon', type: 'rest', title: 'Rest & Recovery' },
          { day: 'Tue', type: 'easy', title: 'Easy Run', km: 8 },
          { day: 'Wed', type: 'tempo', title: 'Sharpener', km: 10, notes: '2km warm-up + 5km @MP + 2km cool-down' },
          { day: 'Thu', type: 'easy', title: 'Recovery Run', km: 6 },
          { day: 'Fri', type: 'easy', title: 'Strides', km: 5, notes: '4km easy + 6 × 20 sec strides' },
          { day: 'Sat', type: 'easy', title: 'Easy Run', km: 6 },
          { day: 'Sun', type: 'long', title: 'Long Run', km: 20, notes: 'Easy + 5km @MP. Dress rehearsal.' },
        ],
      },
    ],
  },
  {
    id: 'plan-marcus-base',
    name: 'First Marathon — Base Building',
    description: '4-week aerobic foundation block for a first-time marathoner. Consistency over intensity.',
    totalWeeks: 4,
    targetGoal: 'first_marathon',
    createdBy: 'Coach Léa',
    createdAt: '2026-05-20',
    weeks: [
      {
        weekIndex: 0,
        phase: 'Base Building',
        focus: 'Establish routine, easy miles only',
        totalKm: 30,
        days: [
          { day: 'Mon', type: 'rest', title: 'Rest' },
          { day: 'Tue', type: 'easy', title: 'Easy Run', km: 6 },
          { day: 'Wed', type: 'easy', title: 'Easy Run', km: 5 },
          { day: 'Thu', type: 'rest', title: 'Rest or Walk' },
          { day: 'Fri', type: 'easy', title: 'Easy Run', km: 6 },
          { day: 'Sat', type: 'strength', title: 'Strength & Core', notes: '30 min cross-training' },
          { day: 'Sun', type: 'long', title: 'Long Run', km: 14, notes: 'Conversational pace only' },
        ],
      },
      {
        weekIndex: 1,
        phase: 'Base Building',
        focus: 'Add tempo awareness',
        totalKm: 33,
        days: [
          { day: 'Mon', type: 'rest', title: 'Rest' },
          { day: 'Tue', type: 'easy', title: 'Easy Run', km: 7 },
          { day: 'Wed', type: 'tempo', title: 'Tempo Intro', km: 6, notes: '2km easy + 2km slightly faster + 2km easy' },
          { day: 'Thu', type: 'rest', title: 'Rest or Walk' },
          { day: 'Fri', type: 'easy', title: 'Easy Run', km: 6 },
          { day: 'Sat', type: 'strength', title: 'Strength & Core' },
          { day: 'Sun', type: 'long', title: 'Long Run', km: 16 },
        ],
      },
      {
        weekIndex: 2,
        phase: 'Base Building',
        focus: 'Build long run, add 4th run day',
        totalKm: 37,
        days: [
          { day: 'Mon', type: 'rest', title: 'Rest' },
          { day: 'Tue', type: 'easy', title: 'Easy Run', km: 7 },
          { day: 'Wed', type: 'tempo', title: 'Tempo Run', km: 8, notes: '2km easy + 4km moderate + 2km easy' },
          { day: 'Thu', type: 'easy', title: 'Easy Run', km: 5 },
          { day: 'Fri', type: 'easy', title: 'Easy Run', km: 6 },
          { day: 'Sat', type: 'rest', title: 'Rest or Walk' },
          { day: 'Sun', type: 'long', title: 'Long Run', km: 18 },
        ],
      },
      {
        weekIndex: 3,
        phase: 'Base Building',
        focus: 'Biggest week — first 20km long run',
        totalKm: 40,
        days: [
          { day: 'Mon', type: 'rest', title: 'Rest' },
          { day: 'Tue', type: 'easy', title: 'Easy Run', km: 8 },
          { day: 'Wed', type: 'tempo', title: 'Tempo Run', km: 9, notes: '2km easy + 5km moderate + 2km easy' },
          { day: 'Thu', type: 'easy', title: 'Easy Run', km: 5 },
          { day: 'Fri', type: 'easy', title: 'Easy Run', km: 6 },
          { day: 'Sat', type: 'rest', title: 'Rest — important before long run' },
          { day: 'Sun', type: 'long', title: 'Long Run', km: 20, notes: 'Your first 20km! Take it easy.' },
        ],
      },
    ],
  },
];

export const GOAL_LABELS: Record<GoalType, string> = {
  first_5k: 'First 5K',
  first_10k: 'First 10K',
  first_half: 'First Half Marathon',
  first_marathon: 'First Marathon',
  pb_half: 'Half Marathon PB',
  pb_marathon: 'Marathon PB',
};

export const WORKOUT_TYPE_LABELS: Record<WorkoutType, string> = {
  easy: 'Easy',
  tempo: 'Tempo',
  interval: 'Intervals',
  long: 'Long Run',
  rest: 'Rest',
  race: 'Race',
  strength: 'Strength',
};
