import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, FlatList,
  TouchableOpacity, RefreshControl, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useAuthStore, useTaskStore } from '@/lib/store';
import { getMyTasks, getNearbyTasks } from '@/lib/api';
import { Task, TaskCategory, CATEGORIES } from '@/types';
import { Colors, Fonts, Spacing, Radius, Shadow } from '@/constants';
import * as Location from 'expo-location';

const CATS: Array<{ id: string; label: string; emoji: string }> = [
  { id: 'all', label: 'Tümü', emoji: '🔍' },
  { id: 'tesisat', label: 'Tesisat', emoji: '🔧' },
  { id: 'elektrik', label: 'Elektrik', emoji: '⚡' },
  { id: 'boya', label: 'Boya', emoji: '🎨' },
  { id: 'montaj', label: 'Montaj', emoji: '🛠' },
  { id: 'marangoz', label: 'Marangoz', emoji: '🪚' },
];

export default function TasksScreen() {
  const router = useRouter();
  const { user, role } = useAuthStore();
  const { myTasks, nearbyTasks, setMyTasks, setNearbyTasks } = useTaskStore();
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [activeCat, setActiveCat] = useState('all');

  const isEv = role === 'ev_sahibi';
  const tasks = isEv ? myTasks : nearbyTasks;

  useEffect(() => { load(); }, []);

  const load = async (refresh = false) => {
    if (!user) return;
    refresh ? setRefreshing(true) : setLoading(true);
    try {
      if (isEv) {
        const data = await getMyTasks(user.id);
        setMyTasks(data);
      } else {
        const loc = await Location.getCurrentPositionAsync({});
        const data = await getNearbyTasks({
          latitude: loc.coords.latitude,
          longitude: loc.coords.longitude,
        }, activeCat === 'all' ? undefined : activeCat as TaskCategory);
        setNearbyTasks(data);
      }
    } catch (e) { console.log(e); }
    refresh ? setRefreshing(false) : setLoading(false);
  };

  const filtered = activeCat === 'all'
    ? tasks
    : tasks.filter(t => t.category === activeCat);

  const renderTask = ({ item }: { item: Task }) => (
    <TouchableOpacity
      style={styles.card}
      onPress={() => router.push({ pathname: '/task/[id]', params: { id: item.id } })}
      activeOpacity={0.85}
    >
      <View style={styles.cardTop}>
        <View style={styles.catBadge}>
          <Text style={styles.catEmoji}>{CATEGORIES[item.category]?.emoji || '🔧'}</Text>
          <Text style={styles.catLabel}>{CATEGORIES[item.category]?.label}</Text>
        </View>
        <View style={styles.statusRow}>
          {item.is_urgent && (
            <View style={styles.urgentBadge}>
              <Text style={styles.urgentT}>🚨 ACİL</Text>
            </View>
          )}
          <View style={[styles.statusBadge, getStatusStyle(item.status)]}>
            <Text style={[styles.statusT, getStatusTextStyle(item.status)]}>
              {getStatusLabel(item.status)}
            </Text>
          </View>
        </View>
      </View>

      <Text style={styles.title} numberOfLines={2}>{item.title}</Text>
      {item.description ? (
        <Text style={styles.desc} numberOfLines={2}>{item.description}</Text>
      ) : null}

      <View style={styles.cardBot}>
        <View style={styles.infoRow}>
          <Text style={styles.infoIc}>📍</Text>
          <Text style={styles.infoT}>{item.address || 'Konum belirlendi'}</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.infoIc}>🕐</Text>
          <Text style={styles.infoT}>{formatTime(item.created_at)}</Text>
        </View>
      </View>

      <View style={styles.cardFoot}>
        {item.price ? (
          <Text style={styles.price}>{item.price}₺</Text>
        ) : (
          <Text style={styles.pricePh}>Fiyat belirlenmedi</Text>
        )}
        {item.offers && item.offers.length > 0 && (
          <View style={styles.offerBadge}>
            <Text style={styles.offerT}>{item.offers.length} teklif</Text>
          </View>
        )}
        {role === 'fixer' && item.status === 'open' && (
          <TouchableOpacity
            style={styles.offerBtn}
            onPress={() => router.push({ pathname: '/task/[id]', params: { id: item.id } })}
          >
            <Text style={styles.offerBtnT}>Teklif Ver →</Text>
          </TouchableOpacity>
        )}
        {isEv && item.status === 'active' && (
          <TouchableOpacity
            style={styles.trackBtn}
            onPress={() => router.push({ pathname: '/tracking', params: { taskId: item.id } })}
          >
            <Text style={styles.trackBtnT}>📍 Takip Et</Text>
          </TouchableOpacity>
        )}
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <View>
          <Text style={styles.headerT}>{isEv ? 'Taleplerim' : 'Yakındaki İşler'}</Text>
          <Text style={styles.headerS}>
            {isEv ? `${tasks.length} talep` : `${tasks.length} iş bulundu`}
          </Text>
        </View>
        {isEv && (
          <TouchableOpacity style={styles.newBtn} onPress={() => router.push('/new-task')}>
            <Text style={styles.newBtnT}>+ Yeni</Text>
          </TouchableOpacity>
        )}
      </View>

      {!isEv && (
        <FlatList
          data={CATS}
          horizontal
          showsHorizontalScrollIndicator={false}
          keyExtractor={c => c.id}
          contentContainerStyle={styles.catList}
          renderItem={({ item: cat }) => (
            <TouchableOpacity
              style={[styles.catFilter, activeCat === cat.id && styles.catFilterOn]}
              onPress={() => { setActiveCat(cat.id); load(); }}
            >
              <Text>{cat.emoji}</Text>
              <Text style={[styles.catFilterT, activeCat === cat.id && styles.catFilterTOn]}>
                {cat.label}
              </Text>
            </TouchableOpacity>
          )}
        />
      )}

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={Colors.blue} size="large" />
        </View>
      ) : filtered.length === 0 ? (
        <View style={styles.center}>
          <Text style={styles.emptyIc}>{isEv ? '📋' : '🔍'}</Text>
          <Text style={styles.emptyT}>
            {isEv ? 'Henüz talep oluşturmadın' : 'Yakında açık iş yok'}
          </Text>
          <Text style={styles.emptyS}>
            {isEv ? 'İlk iş talebini oluştur' : 'Birkaç dakikada bir kontrol et'}
          </Text>
          {isEv && (
            <TouchableOpacity style={styles.emptyBtn} onPress={() => router.push('/new-task')}>
              <Text style={styles.emptyBtnT}>Talep Oluştur</Text>
            </TouchableOpacity>
          )}
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={t => t.id}
          renderItem={renderTask}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={() => load(true)} tintColor={Colors.blue} />
          }
        />
      )}
    </SafeAreaView>
  );
}

function getStatusLabel(s: string) {
  return ({ open: 'Açık', active: 'Devam Ediyor', done: 'Tamamlandı', cancelled: 'İptal' } as any)[s] || s;
}
function getStatusStyle(s: string) {
  return ({ open: { backgroundColor: Colors.blueMid }, active: { backgroundColor: Colors.greenLt }, done: { backgroundColor: Colors.border }, cancelled: { backgroundColor: Colors.redLt } } as any)[s] || {};
}
function getStatusTextStyle(s: string) {
  return ({ open: { color: Colors.blue }, active: { color: Colors.green }, done: { color: Colors.ink3 }, cancelled: { color: Colors.red } } as any)[s] || {};
}
function formatTime(iso: string) {
  const m = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (m < 1) return 'Az önce';
  if (m < 60) return `${m} dk önce`;
  if (m < 1440) return `${Math.floor(m / 60)} sa önce`;
  return `${Math.floor(m / 1440)} gün önce`;
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.off },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: Spacing.xl, paddingVertical: Spacing.lg, backgroundColor: Colors.white, borderBottomWidth: 1, borderColor: Colors.border },
  headerT: { fontSize: 22, fontFamily: Fonts.black, color: Colors.ink, letterSpacing: -0.5 },
  headerS: { fontSize: 12, color: Colors.ink3, fontFamily: Fonts.semibold, marginTop: 2 },
  newBtn: { backgroundColor: Colors.blue, borderRadius: Radius.md, paddingHorizontal: Spacing.lg, paddingVertical: 9 },
  newBtnT: { fontSize: 14, fontFamily: Fonts.extrabold, color: Colors.white },
  catList: { paddingHorizontal: Spacing.xl, paddingVertical: 12, gap: 8 },
  catFilter: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 14, paddingVertical: 8, borderRadius: Radius.full, borderWidth: 1.5, borderColor: Colors.border, backgroundColor: Colors.white },
  catFilterOn: { borderColor: Colors.blue, backgroundColor: Colors.blueMid },
  catFilterT: { fontSize: 12, fontFamily: Fonts.bold, color: Colors.ink3 },
  catFilterTOn: { color: Colors.blue },
  list: { padding: Spacing.xl, gap: 12 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40 },
  card: { backgroundColor: Colors.white, borderRadius: Radius.xl, padding: Spacing.xl, ...Shadow.md, borderWidth: 1, borderColor: Colors.border },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  catBadge: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: Colors.blueLt, borderRadius: Radius.sm, paddingHorizontal: 10, paddingVertical: 4 },
  catEmoji: { fontSize: 14 },
  catLabel: { fontSize: 12, fontFamily: Fonts.bold, color: Colors.blue },
  statusRow: { flexDirection: 'row', gap: 6 },
  urgentBadge: { backgroundColor: Colors.redLt, borderRadius: Radius.sm, paddingHorizontal: 8, paddingVertical: 4 },
  urgentT: { fontSize: 11, fontFamily: Fonts.extrabold, color: Colors.red },
  statusBadge: { borderRadius: Radius.sm, paddingHorizontal: 8, paddingVertical: 4 },
  statusT: { fontSize: 11, fontFamily: Fonts.bold },
  title: { fontSize: 16, fontFamily: Fonts.extrabold, color: Colors.ink, marginBottom: 6, lineHeight: 22 },
  desc: { fontSize: 13, color: Colors.ink3, lineHeight: 20, marginBottom: 10 },
  cardBot: { gap: 4, marginBottom: 12 },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  infoIc: { fontSize: 13 },
  infoT: { fontSize: 12, color: Colors.ink3, fontFamily: Fonts.medium },
  cardFoot: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: 12, borderTopWidth: 1, borderColor: Colors.border },
  price: { fontSize: 18, fontFamily: Fonts.black, color: Colors.green },
  pricePh: { fontSize: 13, fontFamily: Fonts.medium, color: Colors.ink4 },
  offerBadge: { backgroundColor: Colors.orangeLt, borderRadius: Radius.sm, paddingHorizontal: 10, paddingVertical: 4 },
  offerT: { fontSize: 12, fontFamily: Fonts.bold, color: Colors.amber },
  offerBtn: { backgroundColor: Colors.blue, borderRadius: Radius.md, paddingHorizontal: 16, paddingVertical: 8 },
  offerBtnT: { fontSize: 13, fontFamily: Fonts.extrabold, color: Colors.white },
  trackBtn: { backgroundColor: Colors.green, borderRadius: Radius.md, paddingHorizontal: 14, paddingVertical: 8 },
  trackBtnT: { fontSize: 13, fontFamily: Fonts.bold, color: Colors.white },
  emptyIc: { fontSize: 56, marginBottom: 16 },
  emptyT: { fontSize: 18, fontFamily: Fonts.extrabold, color: Colors.ink, marginBottom: 8 },
  emptyS: { fontSize: 14, color: Colors.ink3, textAlign: 'center', lineHeight: 22 },
  emptyBtn: { marginTop: 20, backgroundColor: Colors.blue, borderRadius: Radius.lg, paddingHorizontal: 28, paddingVertical: 14 },
  emptyBtnT: { fontSize: 15, fontFamily: Fonts.extrabold, color: Colors.white },
});
