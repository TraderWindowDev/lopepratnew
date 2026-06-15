import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
  RefreshControl,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useStore } from '@/hooks/useStore';
import { Colors, Font, Spacing, Radius } from '@/constants/theme';
import { Avatar } from '@/components/ui/Avatar';

export default function MessagesScreen() {
  const { messages, sendMessage, markMessagesRead, refreshAthleteState } = useStore();
  const [text, setText] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const listRef = useRef<FlatList>(null);

  const isFocused = useRef(false);

  useFocusEffect(
    useCallback(() => {
      isFocused.current = true;
      markMessagesRead();
      return () => { isFocused.current = false; };
    }, [])
  );

  // Auto-scroll and clear badge when new messages arrive while screen is visible
  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 80);
      if (isFocused.current) markMessagesRead();
    }
  }, [messages.length]);

  async function handleRefresh() {
    setRefreshing(true);
    await refreshAthleteState();
    setRefreshing(false);
    markMessagesRead();
  }

  const handleSend = () => {
    const trimmed = text.trim();
    if (!trimmed) return;
    sendMessage(trimmed);
    setText('');
    setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 100);
  };

  const formatTime = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  };

  const formatDate = (iso: string) => {
    const d = new Date(iso);
    const today = new Date();
    const diff = Math.floor((today.getTime() - d.getTime()) / (1000 * 60 * 60 * 24));
    if (diff === 0) return 'Today';
    if (diff === 1) return 'Yesterday';
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const renderItem = ({ item, index }: { item: typeof messages[0]; index: number }) => {
    const prevItem = index > 0 ? messages[index - 1] : null;
    const showDate = !prevItem || formatDate(prevItem.timestamp) !== formatDate(item.timestamp);
    const isMe = !item.isCoach;

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
            <Avatar
              initials={item.senderInitials}
              color={item.senderColor}
              size={34}
            />
          )}
          <View style={[styles.bubble, isMe ? styles.bubbleMe : styles.bubbleCoach]}>
            {!isMe && (
              <Text style={[styles.senderName, { color: item.senderColor }]}>{item.senderName}</Text>
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
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
    >
      <SafeAreaView style={styles.safe}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <View style={styles.coachAvatars}>
              {['LA', 'ML'].map((init, i) => (
                <View key={init} style={[styles.avatarOverlap, { left: i * 22, zIndex: 2 - i }]}>
                  <Avatar
                    initials={init}
                    color={i === 0 ? Colors.primary : Colors.teal}
                    size={36}
                  />
                </View>
              ))}
            </View>
            <View style={{ marginLeft: 60 }}>
              <Text style={styles.headerTitle}>Lopeprat Coaches</Text>
            </View>
          </View>
          <Ionicons name="ellipsis-horizontal" size={20} color={Colors.textSecondary} />
        </View>

        {/* Messages */}
        <FlatList
          ref={listRef}
          data={messages}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          onLayout={() => listRef.current?.scrollToEnd({ animated: false })}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor={Colors.primary}
            />
          }
        />

        {/* Input */}
        <View style={styles.inputRow}>
          <TouchableOpacity style={styles.attachBtn}>
            <Ionicons name="add-circle-outline" size={26} color={Colors.textSecondary} />
          </TouchableOpacity>
          <TextInput
            style={styles.input}
            value={text}
            onChangeText={setText}
            placeholder="Message your coaches..."
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
            <Ionicons
              name="send"
              size={18}
              color={text.trim() ? '#fff' : Colors.textMuted}
            />
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  safe: { flex: 1 },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center' },
  coachAvatars: { width: 60, height: 36, position: 'relative' },
  avatarOverlap: { position: 'absolute', top: 0 },
  headerTitle: { ...Font.h4, color: Colors.text },
  headerSub: { ...Font.small, color: Colors.success, marginTop: 2 },

  list: { padding: Spacing.md, gap: 12, paddingBottom: 8 },

  dateDivider: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginVertical: 8,
  },
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
  bubbleCoach: {
    borderBottomLeftRadius: 4,
  },
  bubbleMe: {
    backgroundColor: Colors.primaryDark,
    borderColor: Colors.primary + '44',
    borderBottomRightRadius: 4,
  },

  senderName: { ...Font.tiny, fontWeight: '700', marginBottom: 4, letterSpacing: 0.3 },
  msgText: { ...Font.body, color: Colors.text, lineHeight: 22 },
  msgTextMe: { color: '#fff' },
  msgTime: { ...Font.tiny, color: Colors.textMuted, marginTop: 4, textAlign: 'left' },
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
    paddingBottom: Platform.OS === 'ios' ? 24 : 12,
  },
  attachBtn: { paddingBottom: 4 },
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
  sendBtnActive: {
    backgroundColor: Colors.primary,
  },
});
