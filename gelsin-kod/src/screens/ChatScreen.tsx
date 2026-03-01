import React, { useEffect, useState, useRef } from 'react';
import {
  View, Text, StyleSheet, FlatList, TextInput,
  TouchableOpacity, KeyboardAvoidingView, Platform, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/lib/store';
import { Colors, Fonts, Spacing, Radius, Shadow } from '@/constants';

interface Message {
  id: string;
  sender_id: string;
  body: string;
  created_at: string;
  read: boolean;
}

export default function ChatScreen() {
  const { id: taskId } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { user, role } = useAuthStore();

  const [messages, setMessages] = useState<Message[]>([]);
  const [otherUser, setOtherUser] = useState<any>(null);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const flatRef = useRef<FlatList>(null);

  useEffect(() => {
    loadData();
    const channel = supabase
      .channel(`chat-${taskId}`)
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'messages',
        filter: `task_id=eq.${taskId}`,
      }, (payload: any) => {
        setMessages(prev => [...prev, payload.new as Message]);
        setTimeout(() => flatRef.current?.scrollToEnd({ animated: true }), 100);
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [taskId]);

  const loadData = async () => {
    // Mesajları yükle
    const { data: msgs } = await supabase
      .from('messages')
      .select('*')
      .eq('task_id', taskId)
      .order('created_at', { ascending: true });
    if (msgs) setMessages(msgs);

    // Diğer kullanıcıyı bul
    const { data: task } = await supabase
      .from('tasks')
      .select('*, customer:users!customer_id(*), fixer:users!fixer_id(*)')
      .eq('id', taskId)
      .single();
    if (task) {
      const other = role === 'ev_sahibi' ? task.fixer : task.customer;
      setOtherUser(other);
    }
    setLoading(false);
    setTimeout(() => flatRef.current?.scrollToEnd({ animated: false }), 100);
  };

  const send = async () => {
    if (!text.trim() || !user || sending) return;
    const body = text.trim();
    setText('');
    setSending(true);

    await supabase.from('messages').insert({
      task_id: taskId,
      sender_id: user.id,
      receiver_id: otherUser?.id,
      body,
    });
    setSending(false);
  };

  const renderMsg = ({ item }: { item: Message }) => {
    const isMe = item.sender_id === user?.id;
    return (
      <View style={[styles.msgRow, isMe ? styles.msgRowMe : styles.msgRowOther]}>
        {!isMe && <Text style={styles.msgAv}>👨‍🔧</Text>}
        <View style={[styles.msgBubble, isMe ? styles.bubbleMe : styles.bubbleOther]}>
          <Text style={[styles.msgText, isMe ? styles.msgTextMe : styles.msgTextOther]}>
            {item.body}
          </Text>
          <Text style={[styles.msgTime, isMe ? styles.msgTimeMe : styles.msgTimeOther]}>
            {formatTime(item.created_at)}
            {isMe && <Text> {item.read ? ' ✓✓' : ' ✓'}</Text>}
          </Text>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
      >

        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Text style={styles.backT}>←</Text>
          </TouchableOpacity>
          <View style={styles.headerInfo}>
            <Text style={styles.headerAv}>{role === 'ev_sahibi' ? '👨‍🔧' : '🏠'}</Text>
            <View>
              <Text style={styles.headerName}>{otherUser?.name || 'Kullanıcı'}</Text>
              <Text style={styles.headerStatus}>🟢 Aktif</Text>
            </View>
          </View>
          <TouchableOpacity style={styles.callBtn}>
            <Text style={styles.callBtnT}>📞</Text>
          </TouchableOpacity>
        </View>

        {loading ? (
          <View style={styles.center}><ActivityIndicator color={Colors.blue} /></View>
        ) : (
          <>
            <FlatList
              ref={flatRef}
              data={messages}
              keyExtractor={m => m.id}
              contentContainerStyle={styles.msgList}
              ListEmptyComponent={
                <View style={styles.emptyWrap}>
                  <Text style={styles.emptyIc}>💬</Text>
                  <Text style={styles.emptyT}>Konuşma başlat</Text>
                  <Text style={styles.emptyS}>İş hakkında soru sorabilirsin</Text>
                </View>
              }
              renderItem={renderMsg}
            />

            {/* Hızlı mesajlar */}
            {messages.length === 0 && (
              <View style={styles.quickMsgs}>
                {['Merhaba, yoldayım 👋', 'Tahminen 15 dakikada gelirim', 'İş ne kadar sürer?'].map(q => (
                  <TouchableOpacity
                    key={q}
                    style={styles.quickMsg}
                    onPress={() => setText(q)}
                  >
                    <Text style={styles.quickMsgT}>{q}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}

            {/* Input */}
            <View style={styles.inputBar}>
              <TextInput
                style={styles.input}
                placeholder="Mesaj yaz..."
                placeholderTextColor={Colors.ink4}
                value={text}
                onChangeText={setText}
                multiline
                maxLength={500}
                onSubmitEditing={send}
                returnKeyType="send"
              />
              <TouchableOpacity
                style={[styles.sendBtn, (!text.trim() || sending) && styles.sendBtnDisabled]}
                onPress={send}
                disabled={!text.trim() || sending}
              >
                {sending
                  ? <ActivityIndicator color={Colors.white} size="small" />
                  : <Text style={styles.sendBtnIc}>➤</Text>
                }
              </TouchableOpacity>
            </View>
          </>
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },

  header: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingHorizontal: Spacing.xl, paddingVertical: 12,
    backgroundColor: Colors.white, borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  backBtn: { width: 36, height: 36, borderRadius: 10, backgroundColor: Colors.bg, alignItems: 'center', justifyContent: 'center' },
  backT: { fontSize: 18, color: Colors.ink },
  headerInfo: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10 },
  headerAv: { fontSize: 36 },
  headerName: { fontSize: 15, fontFamily: Fonts.extrabold, color: Colors.ink },
  headerStatus: { fontSize: 12, color: Colors.green, marginTop: 1 },
  callBtn: { width: 38, height: 38, borderRadius: 11, backgroundColor: Colors.greenLt, alignItems: 'center', justifyContent: 'center' },
  callBtnT: { fontSize: 18 },

  msgList: { padding: Spacing.lg, gap: 8, flexGrow: 1 },
  emptyWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 80 },
  emptyIc: { fontSize: 48, marginBottom: 12 },
  emptyT: { fontSize: 18, fontFamily: Fonts.extrabold, color: Colors.ink, marginBottom: 6 },
  emptyS: { fontSize: 13, color: Colors.ink3 },

  msgRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 8 },
  msgRowMe: { justifyContent: 'flex-end' },
  msgRowOther: { justifyContent: 'flex-start' },
  msgAv: { fontSize: 28 },
  msgBubble: { maxWidth: '72%', borderRadius: 18, padding: 12 },
  bubbleMe: { backgroundColor: Colors.blue, borderBottomRightRadius: 4 },
  bubbleOther: { backgroundColor: Colors.white, borderBottomLeftRadius: 4, ...Shadow.sm },
  msgText: { fontSize: 14, lineHeight: 20 },
  msgTextMe: { color: Colors.white, fontFamily: Fonts.medium },
  msgTextOther: { color: Colors.ink, fontFamily: Fonts.medium },
  msgTime: { fontSize: 10, marginTop: 4 },
  msgTimeMe: { color: 'rgba(255,255,255,0.6)', textAlign: 'right' },
  msgTimeOther: { color: Colors.ink4 },

  quickMsgs: { paddingHorizontal: Spacing.lg, gap: 6, marginBottom: 8 },
  quickMsg: {
    backgroundColor: Colors.white, borderRadius: Radius.md,
    paddingHorizontal: 14, paddingVertical: 9,
    borderWidth: 1, borderColor: Colors.border,
    alignSelf: 'flex-start',
  },
  quickMsgT: { fontSize: 13, color: Colors.blue, fontFamily: Fonts.semibold },

  inputBar: {
    flexDirection: 'row', alignItems: 'flex-end', gap: 10,
    padding: Spacing.md, paddingHorizontal: Spacing.lg,
    backgroundColor: Colors.white, borderTopWidth: 1, borderTopColor: Colors.border,
  },
  input: {
    flex: 1, backgroundColor: Colors.bg, borderRadius: 20,
    paddingHorizontal: 16, paddingVertical: 10,
    fontSize: 14, fontFamily: Fonts.medium, color: Colors.ink,
    maxHeight: 120, borderWidth: 1, borderColor: Colors.border,
  },
  sendBtn: {
    width: 42, height: 42, borderRadius: 21,
    backgroundColor: Colors.blue, alignItems: 'center', justifyContent: 'center', ...Shadow.sm,
  },
  sendBtnDisabled: { backgroundColor: Colors.border },
  sendBtnIc: { fontSize: 18, color: Colors.white },
});
