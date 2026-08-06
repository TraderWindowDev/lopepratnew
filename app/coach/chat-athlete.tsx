import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useStore } from '@/hooks/useStore';
import { Colors, Font, Spacing, Radius } from '@/constants/theme';
import { Avatar } from '@/components/ui/Avatar';

export default function CoachChatScreen() {
  // athleteId comes as a query param: /coach/chat-athlete?athleteId=xxx
  const { athleteId } = useLocalSearchParams<{ athleteId: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const {
    coachAthletes,
    coachMessagesByAthlete,
    loadCoachChat,
    sendCoachMessage,
    subscribeCoachChat,
    unsubscribeCoachChat,
    markMessagesRead,
    profile,
  } = useStore();

  const athlete = coachAthletes.find((a) => a.id === athleteId);
  const messages = coachMessagesByAthlete[athleteId ?? ''] ?? [];
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const listRef = useRef<FlatList>(null);
  const isFocused = useRef(false);

  useFocusEffect(
    useCallback(() => {
      isFocused.current = true;
      markMessagesRead();
      if (!athleteId) return;
      setLoading(true);
      loadCoachChat(athleteId).finally(() => setLoading(false));
      subscribeCoachChat(athleteId);
      return () => {
        isFocused.current = false;
        unsubscribeCoachChat();
      };
    }, [athleteId])
  );

  // Auto-scroll and clear badge when new messages arrive while screen is visible
  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 80);
      if (isFocused.current) markMessagesRead();
    }
  }, [messages.length]);

  async function handleRefresh() {
    if (!athleteId) return;
    setRefreshing(true);
    await loadCoachChat(athleteId);
    setRefreshing(false);
  }

  const handleSend = () => {
    const trimmed = text.trim();
    if (!trimmed || !athleteId) return;
    sendCoachMessage(athleteId, trimmed);
    setText('');
    setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 100);
  };

  const formatTime = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleTimeString('nb-NO', { hour: '2-digit', minute: '2-digit' });
  };

  const formatDate = (iso: string) => {
    const d = new Date(iso);
    const today = new Date();
    const diff = Math.floor((today.getTime() - d.getTime()) / (1000 * 60 * 60 * 24));
    if (diff === 0) return 'I dag';
    if (diff === 1) return 'I går';
    return d.toLocaleDateString('nb-NO', { month: 'short', day: 'numeric' });
  };

  const renderItem = ({ item, index }: { item: typeof messages[0]; index: number }) => {
    const prevItem = index > 0 ? messages[index - 1] : null;
    const showDate = !prevItem || formatDate(prevItem.timestamp) !== formatDate(item.timestamp);
    const isMe = item.isCoach;

    return (
      <>
        {showDate && (
          <View style={styles.dateDivider}>
            <View style={styles.dateLine} />
            <Text style={styles.dateText}>{formatDate(item.timestamp)}</Text>
            <View style={styles.dateLine} />
          </View>
        )}
        <View style={[styles.msgRow, isMe && styles.msgRowMe]}>
          {!isMe && (
            <Avatar initials={athlete?.initials ?? '?'} color={athlete?.avatarColor ?? Colors.primary} size={32} />
          )}
          <View style={[styles.bubble, isMe ? styles.bubbleMe : styles.bubbleAthlete]}>
            {!isMe && (
              <Text style={[styles.senderName, { color: athlete?.avatarColor ?? Colors.primary }]}>
                {item.senderName}
              </Text>
            )}
            <Text style={[styles.msgText, isMe && styles.msgTextMe]}>{item.text}</Text>
            <Text style={[styles.msgTime, isMe && styles.msgTimeMe]}>{formatTime(item.timestamp)}</Text>
          </View>
        </View>
      </>
    );
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={24} color={Colors.text} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          {athlete && (
            <Avatar initials={athlete.initials} color={athlete.avatarColor} size={34} />
          )}
          <View>
            <Text style={styles.headerName}>{athlete?.name ?? 'Athlete'}</Text>
            <Text style={styles.headerSub}>Utøver · Direktemelding</Text>
          </View>
        </View>
        <View style={{ width: 40 }} />
      </View>

      {loading ? (
        <View style={styles.loadingWrap}>
          <ActivityIndicator color={Colors.primary} />
        </View>
      ) : (
        <FlatList
          ref={listRef}
          data={messages}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + 80 }]}
          onLayout={() => listRef.current?.scrollToEnd({ animated: false })}
          onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: false })}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor={Colors.primary}
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyWrap}>
              <Ionicons name="chatbubble-outline" size={40} color={Colors.textMuted} />
              <Text style={styles.emptyText}>Ingen meldinger ennå. Start samtalen!</Text>
            </View>
          }
        />
      )}

      {/* Input */}
      <View style={[styles.inputRow, { paddingBottom: insets.bottom + 8 }]}>
        <View style={styles.coachTag}>
          <Text style={styles.coachTagText}>
            {profile?.initials ?? 'CO'}
          </Text>
        </View>
        <TextInput
          style={styles.input}
          value={text}
          onChangeText={setText}
          placeholder={`Melding til ${athlete?.name ?? 'utøver'}...`}
          placeholderTextColor={Colors.textMuted}
          multiline
          maxLength={500}
          returnKeyType="default"
        />
        <TouchableOpacity
          style={[styles.sendBtn, text.trim() ? styles.sendBtnActive : {}]}
          onPress={handleSend}
          disabled={!text.trim()}
        >
          <Ionicons name="send" size={18} color={text.trim() ? '#fff' : Colors.textMuted} />
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    backgroundColor: Colors.surface,
  },
  backBtn: { padding: 4 },
  headerCenter: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  headerName: { ...Font.h4, color: Colors.text },
  headerSub: { ...Font.tiny, color: Colors.teal, marginTop: 1 },

  loadingWrap: { flex: 1, alignItems: 'center', justifyContent: 'center' },

  list: { padding: Spacing.md, gap: 10 },

  emptyWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, paddingTop: 80 },
  emptyText: { ...Font.small, color: Colors.textMuted, textAlign: 'center', maxWidth: 240 },

  dateDivider: { flexDirection: 'row', alignItems: 'center', gap: 10, marginVertical: 6 },
  dateLine: { flex: 1, height: 1, backgroundColor: Colors.border },
  dateText: { ...Font.tiny, color: Colors.textMuted },

  msgRow: { flexDirection: 'row', gap: 8, alignItems: 'flex-end', maxWidth: '90%' },
  msgRowMe: { alignSelf: 'flex-end', flexDirection: 'row-reverse' },

  bubble: {
    flex: 1,
    borderRadius: Radius.lg,
    padding: 12,
    backgroundColor: Colors.card,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  bubbleAthlete: { borderBottomLeftRadius: 4 },
  bubbleMe: {
    backgroundColor: Colors.primaryDark,
    borderColor: Colors.primary + '44',
    borderBottomRightRadius: 4,
  },

  senderName: { ...Font.tiny, fontWeight: '700', marginBottom: 4, letterSpacing: 0.3 },
  msgText: { ...Font.body, color: Colors.text, lineHeight: 22 },
  msgTextMe: { color: '#fff' },
  msgTime: { ...Font.tiny, color: Colors.textMuted, marginTop: 4 },
  msgTimeMe: { textAlign: 'right', color: Colors.primary + 'AA' },

  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    padding: 10,
    paddingHorizontal: 14,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    gap: 8,
    backgroundColor: Colors.surface,
  },
  coachTag: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: Colors.primaryFade,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 3,
  },
  coachTagText: { ...Font.tiny, color: Colors.primary, fontWeight: '700' },
  input: {
    flex: 1,
    backgroundColor: Colors.card,
    borderRadius: Radius.full,
    paddingHorizontal: 16,
    paddingVertical: 10,
    color: Colors.text,
    fontSize: 15,
    maxHeight: 120,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  sendBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: Colors.card,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendBtnActive: { backgroundColor: Colors.primary },
});
