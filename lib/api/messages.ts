import { supabase } from '../supabase';
import type { RealtimeChannel } from '@supabase/supabase-js';

export type MessageRow = {
  id: string;
  sender_id: string;
  athlete_id: string;
  text: string;
  is_coach: boolean;
  created_at: string;
  sender?: { name: string; initials: string; avatar_color: string; role: string };
};

export async function fetchMessages(athleteId: string): Promise<MessageRow[]> {
  const { data, error } = await supabase
    .from('messages')
    .select('*, sender:sender_id(name, initials, avatar_color, role)')
    .eq('athlete_id', athleteId)
    .order('created_at', { ascending: true });
  if (error) throw error;
  return (data ?? []) as MessageRow[];
}

export async function sendMessage(input: {
  senderId: string;
  athleteId: string;
  text: string;
  isCoach: boolean;
}) {
  const { data, error } = await supabase
    .from('messages')
    .insert({
      sender_id: input.senderId,
      athlete_id: input.athleteId,
      text: input.text,
      is_coach: input.isCoach,
    })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export function subscribeToMessages(
  athleteId: string,
  onMessage: (msg: MessageRow) => void
): RealtimeChannel {
  return supabase
    .channel(`messages:athlete:${athleteId}:${Date.now()}`)
    .on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'messages', filter: `athlete_id=eq.${athleteId}` },
      (payload) => onMessage(payload.new as MessageRow)
    )
    .subscribe();
}
