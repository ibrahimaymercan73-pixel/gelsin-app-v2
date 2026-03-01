import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView,
  TouchableOpacity, Alert, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/lib/store';
import { Colors, Fonts, Spacing, Radius, Shadow } from '@/constants';

export default function ProfileScreen() {
  const router = useRouter();
  const { user, role, signOut } = useAuthStore();
  const [wallet, setWallet] = useState<any>(null);
  const [reviews, setReviews] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const isEv = role === 'ev_sahibi';

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    if (!user) return;
    const [{ data: w }, { data: r }] = await Promise.all([
      supabase.from('wallets').select('*').eq('user_id', user.id).single(),
      supabase.from('reviews').select('*, customer:users!customer_id(name)').eq('fixer_id', user.id).order('created_at', { ascending: false }).limit(5),
    ]);
    if (w) setWallet(w);
    if (r) setReviews(r);
    setLoading(false);
  };

  const handleSignOut = () => {
    Alert.alert('Çıkış Yap', 'Hesaptan çıkmak istediğine emin misin?', [
      { text: 'Vazgeç', style: 'cancel' },
      { text: 'Çıkış Yap', style: 'destructive', onPress: () => { signOut(); router.replace('/'); } }
    ]);
  };

  if (loading) return <View style={styles.center}><ActivityIndicator color={Colors.blue} /></View>;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Profil</Text>
          <TouchableOpacity style={styles.editBtn} onPress={() => router.push('/edit-profile')}>
            <Text style={styles.editBtnT}>Düzenle</Text>
          </TouchableOpacity>
        </View>

        {/* Avatar & info */}
        <View style={styles.avatarCard}>
          <View style={styles.avatar}>
            <Text style={styles.avatarIc}>{isEv ? '🏠' : '👨‍🔧'}</Text>
          </View>
          <View style={styles.avatarInfo}>
            <Text style={styles.name}>{user?.name || 'Kullanıcı'}</Text>
            <Text style={styles.roleTag}>
              {isEv ? '🏠 Ev Sahibi' : '🔧 Usta'}
            </Text>
            <Text style={styles.phone}>{user?.phone}</Text>
          </View>
          {!isEv && (
            <View style={styles.ratingBadge}>
              <Text style={styles.ratingVal}>⭐ {user?.avg_rating || '4.8'}</Text>
              <Text style={styles.ratingCount}>{user?.total_jobs || 0} iş</Text>
            </View>
          )}
        </View>

        {/* Cüzdan */}
        <View style={styles.walletCard}>
          <View style={styles.walletHeader}>
            <Text style={styles.walletTitle}>💳 Cüzdan</Text>
            {!isEv && (
              <TouchableOpacity style={styles.withdrawBtn}>
                <Text style={styles.withdrawBtnT}>Para Çek</Text>
              </TouchableOpacity>
            )}
          </View>
          <View style={styles.walletStats}>
            <View style={styles.wStat}>
              <Text style={styles.wStatV}>{wallet?.balance?.toFixed(0) || '0'}₺</Text>
              <Text style={styles.wStatL}>Bakiye</Text>
            </View>
            {!isEv && (
              <>
                <View style={styles.wDivider} />
                <View style={styles.wStat}>
                  <Text style={styles.wStatV}>{wallet?.escrow_held?.toFixed(0) || '0'}₺</Text>
                  <Text style={styles.wStatL}>Beklemede</Text>
                </View>
                <View style={styles.wDivider} />
                <View style={styles.wStat}>
                  <Text style={[styles.wStatV, { color: Colors.green }]}>{wallet?.total_earned?.toFixed(0) || '0'}₺</Text>
                  <Text style={styles.wStatL}>Toplam Kazanç</Text>
                </View>
              </>
            )}
          </View>
        </View>

        {/* Usta: Beceriler */}
        {!isEv && user?.skills && user.skills.length > 0 && (
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Text style={styles.cardT}>🛠 Becerilerim</Text>
              <TouchableOpacity><Text style={styles.editLink}>Düzenle</Text></TouchableOpacity>
            </View>
            <View style={styles.skills}>
              {user.skills.map(s => (
                <View key={s} style={styles.skill}>
                  <Text style={styles.skillT}>{s}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Değerlendirmeler */}
        {!isEv && reviews.length > 0 && (
          <View style={styles.card}>
            <Text style={styles.cardT}>⭐ Son Değerlendirmeler</Text>
            {reviews.map(r => (
              <View key={r.id} style={styles.review}>
                <View style={styles.reviewTop}>
                  <Text style={styles.reviewName}>{r.customer?.name || 'Kullanıcı'}</Text>
                  <Text style={styles.reviewRating}>{'⭐'.repeat(r.rating)}</Text>
                </View>
                {r.comment && <Text style={styles.reviewComment}>"{r.comment}"</Text>}
              </View>
            ))}
          </View>
        )}

        {/* Menü */}
        <View style={styles.card}>
          {MENU_ITEMS.map(item => (
            <TouchableOpacity
              key={item.label}
              style={styles.menuItem}
              onPress={() => item.action ? item.action(router) : null}
            >
              <Text style={styles.menuIc}>{item.icon}</Text>
              <Text style={styles.menuLabel}>{item.label}</Text>
              <Text style={styles.menuArrow}>›</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Çıkış */}
        <TouchableOpacity style={styles.signOutBtn} onPress={handleSignOut}>
          <Text style={styles.signOutT}>Çıkış Yap</Text>
        </TouchableOpacity>

        <Text style={styles.version}>Gelsin v1.0.0</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const MENU_ITEMS = [
  { icon: '🔔', label: 'Bildirim Ayarları', action: null },
  { icon: '🔒', label: 'Gizlilik & Güvenlik', action: null },
  { icon: '📋', label: 'Kullanım Koşulları', action: null },
  { icon: '❓', label: 'Yardım & SSS', action: null },
  { icon: '📞', label: 'Bize Ulaş', action: null },
];

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  content: { padding: Spacing.xl, gap: 14, paddingBottom: 40 },

  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 },
  title: { fontSize: 24, fontFamily: Fonts.black, color: Colors.ink, letterSpacing: -0.5 },
  editBtn: { backgroundColor: Colors.blueLt, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 7 },
  editBtnT: { fontSize: 13, fontFamily: Fonts.bold, color: Colors.blue },

  avatarCard: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    backgroundColor: Colors.white, borderRadius: Radius.xl, padding: Spacing.lg, ...Shadow.sm,
  },
  avatar: { width: 64, height: 64, borderRadius: 20, backgroundColor: Colors.blueLt, alignItems: 'center', justifyContent: 'center' },
  avatarIc: { fontSize: 32 },
  avatarInfo: { flex: 1 },
  name: { fontSize: 18, fontFamily: Fonts.extrabold, color: Colors.ink },
  roleTag: { fontSize: 12, color: Colors.blue, fontFamily: Fonts.bold, marginTop: 3, marginBottom: 3 },
  phone: { fontSize: 13, color: Colors.ink3, fontFamily: Fonts.medium },
  ratingBadge: { alignItems: 'center', backgroundColor: Colors.bg, borderRadius: 12, padding: 10 },
  ratingVal: { fontSize: 14, fontFamily: Fonts.extrabold, color: Colors.amber },
  ratingCount: { fontSize: 11, color: Colors.ink3, marginTop: 2 },

  walletCard: { backgroundColor: Colors.navy, borderRadius: Radius.xl, padding: Spacing.lg, ...Shadow.md },
  walletHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 },
  walletTitle: { fontSize: 15, fontFamily: Fonts.extrabold, color: Colors.white },
  withdrawBtn: { backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 8, paddingHorizontal: 14, paddingVertical: 6 },
  withdrawBtnT: { fontSize: 12, fontFamily: Fonts.bold, color: Colors.white },
  walletStats: { flexDirection: 'row', alignItems: 'center' },
  wStat: { flex: 1, alignItems: 'center' },
  wStatV: { fontSize: 22, fontFamily: Fonts.black, color: Colors.white },
  wStatL: { fontSize: 11, color: 'rgba(255,255,255,0.55)', marginTop: 3 },
  wDivider: { width: 1, height: 40, backgroundColor: 'rgba(255,255,255,0.15)' },

  card: { backgroundColor: Colors.white, borderRadius: Radius.xl, padding: Spacing.lg, ...Shadow.sm },
  cardHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  cardT: { fontSize: 15, fontFamily: Fonts.extrabold, color: Colors.ink, marginBottom: 12 },
  editLink: { fontSize: 13, fontFamily: Fonts.bold, color: Colors.blue },

  skills: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  skill: { backgroundColor: Colors.blueLt, borderRadius: 20, paddingHorizontal: 14, paddingVertical: 7 },
  skillT: { fontSize: 13, fontFamily: Fonts.bold, color: Colors.blue },

  review: { paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: Colors.border },
  reviewTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  reviewName: { fontSize: 13, fontFamily: Fonts.bold, color: Colors.ink },
  reviewRating: { fontSize: 12 },
  reviewComment: { fontSize: 13, color: Colors.ink2, fontStyle: 'italic', lineHeight: 20 },

  menuItem: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 13, borderBottomWidth: 1, borderBottomColor: Colors.border },
  menuIc: { fontSize: 20, width: 28, textAlign: 'center' },
  menuLabel: { flex: 1, fontSize: 14, fontFamily: Fonts.semibold, color: Colors.ink },
  menuArrow: { fontSize: 20, color: Colors.ink4 },

  signOutBtn: {
    borderWidth: 1.5, borderColor: Colors.redLt, borderRadius: Radius.lg,
    padding: 14, alignItems: 'center', backgroundColor: Colors.white,
  },
  signOutT: { fontSize: 15, fontFamily: Fonts.bold, color: Colors.red },

  version: { fontSize: 12, color: Colors.ink4, textAlign: 'center', fontFamily: Fonts.medium },
});
