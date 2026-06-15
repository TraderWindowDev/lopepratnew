/**
 * Create a Lopeprat coach account.
 *
 * Requires your SERVICE ROLE key (not the anon key).
 * Find it in: Supabase Dashboard → Settings → API → service_role
 *
 * Usage:
 *   node scripts/create_coach.js
 */

const { createClient } = require('@supabase/supabase-js');

// ─── Config ──────────────────────────────────────────────────────
const SUPABASE_URL         = process.env.EXPO_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY; // add to .env

const coaches = [
  {
    email:    'arnaud@lopeprat.com',
    password: 'ChangeMe123!',
    name:     'Coach Arnaud',
    initials: 'CA',
    color:    '#E84B1A',
  },
  {
    email:    'lea@lopeprat.com',
    password: 'ChangeMe123!',
    name:     'Coach Léa',
    initials: 'CL',
    color:    '#2DD4BF',
  },
];
// ─────────────────────────────────────────────────────────────────

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error(
    'Missing env vars. Make sure EXPO_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set in .env'
  );
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function createCoach({ email, password, name, initials, color }) {
  console.log(`\nCreating coach: ${name} <${email}>`);

  // 1. Create the auth user (bypasses email confirmation)
  const { data, error } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { name, role: 'coach', initials, avatar_color: color },
  });

  if (error) {
    if (error.message.includes('already been registered')) {
      console.log('  ⚠ User already exists, skipping auth creation.');
      const { data: existing } = await supabase.auth.admin.listUsers();
      const user = existing?.users?.find((u) => u.email === email);
      if (user) await ensureCoachRows(user.id, name, initials, color);
    } else {
      console.error('  ✗ Auth error:', error.message);
    }
    return;
  }

  const userId = data.user.id;
  console.log(`  ✓ Auth user created: ${userId}`);

  // 2. The trigger should create profile + coach rows automatically.
  //    If for any reason it didn't, this ensures they exist.
  await ensureCoachRows(userId, name, initials, color);
}

async function ensureCoachRows(userId, name, initials, color) {
  const { error: profileErr } = await supabase.from('profiles').upsert({
    id:           userId,
    name,
    role:         'coach',
    initials,
    avatar_color: color,
  });
  if (profileErr) console.error('  ✗ Profile error:', profileErr.message);
  else console.log('  ✓ Profile row ready');

  const { error: coachErr } = await supabase
    .from('coaches')
    .upsert({ id: userId });
  if (coachErr) console.error('  ✗ Coach row error:', coachErr.message);
  else console.log('  ✓ Coach row ready');
}

(async () => {
  for (const coach of coaches) {
    await createCoach(coach);
  }
  console.log('\nDone.');
})();
