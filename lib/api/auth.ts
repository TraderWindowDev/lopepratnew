import { supabase } from '../supabase';

export type UserProfile = {
  id: string;
  name: string;
  role: 'athlete' | 'coach';
  avatar_color: string;
  initials: string;
};

export async function signIn(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return data;
}

export async function signUp(
  email: string,
  password: string,
  meta: { name: string; role: 'athlete' | 'coach'; initials: string; avatar_color?: string }
) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: meta },
  });
  if (error) throw error;
  return data;
}

export async function signOut() {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

export async function getProfile(userId: string): Promise<UserProfile | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, name, role, avatar_color, initials')
    .eq('id', userId)
    .single();
  if (error) return null;
  return data as UserProfile;
}

export async function getSession() {
  const { data } = await supabase.auth.getSession();
  return data.session;
}
