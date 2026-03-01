import React from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuthStore } from '@/lib/store';
import { UserRole } from '@/types';
import { Colors, Fonts, Spacing, Radius, Shadow } from '@/constants';

export default function RoleSelectScreen() {
  const router = useRouter();
  const setRole = useAuthStore((s) => s.setRole);

  const pick = (role: UserRole) => {
    setRole(role);
    router.push({ pathname: '/login', params: { role } });
  };

  return (
    <View style={styles.container}>
      {/* Top gradient hero */}
      <LinearGradient
        colors={[Colors.navy, Colors.blue]}
        style={styles.hero}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <SafeAreaView>
          <Text style={styles.logo}>
            Gelsin
          </Text>
          <Text style={styles.heroTag}>
            Mahallenin güvenilir{'\n'}elden iş platformu
          </Text>
        </SafeAreaView>
      </LinearGradient>

      {/* Bottom sheet */}
      <View style={styles.sheet}>
        <Text style={styles.heading}>Nasıl devam etmek istersin?</Text>
        <Text style={styles.sub}>Hesabın yoksa otomatik oluşturulur.</Text>

        {/* Ev Sahibi */}
        <TouchableOpacity
          style={[styles.roleCard, styles.evCard]}
          onPress={() => pick('ev_sahibi')}
          activeOpacity={0.85}
        >
          <Text style={styles.roleEmoji}>🏠</Text>
          <View style={styles.roleInfo}>
            <Text style={styles.roleTitle}>Ev Sahibiyim</Text>
            <Text style={styles.roleDesc}>İşim var, hızlıca halledelim</Text>
          </View>
          <Text style={styles.roleArrow}>›</Text>
        </TouchableOpacity>

        {/* Gelsin */}
        <TouchableOpacity
          style={[styles.roleCard, styles.gelsinCard]}
          onPress={() => pick('gelsin')}
          activeOpacity={0.85}
        >
          <Text style={styles.roleEmoji}>🔧</Text>
          <View style={styles.roleInfo}>
            <Text style={styles.roleTitle}>Ben Gelsin'ım</Text>
            <Text style={styles.roleDesc}>Yakındaki işleri gör, para kazan</Text>
          </View>
          <Text style={styles.roleArrow}>›</Text>
        </TouchableOpacity>

        <Text style={styles.legal}>
          Devam ederek{' '}
          <Text style={styles.legalLink}>Gizlilik Politikası</Text>'nı kabul edersiniz
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.white },

  hero: {
    paddingHorizontal: Spacing.xxl,
    paddingBottom: 48,
    paddingTop: 16,
  },
  logo: {
    fontSize: 48,
    fontFamily: Fonts.black,
    letterSpacing: -2,
    color: Colors.white,
    marginBottom: 8,
  },
  logoAccent: { color: '#93C5FD' },
  heroTag: {
    fontSize: 16,
    fontFamily: Fonts.medium,
    color: 'rgba(255,255,255,0.7)',
    lineHeight: 24,
  },

  sheet: {
    flex: 1,
    backgroundColor: Colors.white,
    borderTopLeftRadius: Radius.xxl,
    borderTopRightRadius: Radius.xxl,
    marginTop: -24,
    paddingHorizontal: Spacing.xxl,
    paddingTop: Spacing.xxl,
  },

  heading: {
    fontSize: 20,
    fontFamily: Fonts.extrabold,
    color: Colors.ink,
    marginBottom: 6,
  },
  sub: {
    fontSize: 14,
    fontFamily: Fonts.medium,
    color: Colors.ink3,
    marginBottom: Spacing.xxl,
    lineHeight: 22,
  },

  roleCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    borderWidth: 1.5,
    borderRadius: Radius.xl,
    padding: 18,
    marginBottom: 12,
    ...Shadow.sm,
  },
  evCard: {
    borderColor: 'rgba(29,78,216,0.3)',
    backgroundColor: Colors.blueLt,
  },
  gelsinCard: {
    borderColor: 'rgba(249,115,22,0.3)',
    backgroundColor: Colors.orangeLt,
  },

  roleEmoji: { fontSize: 44 },
  roleInfo: { flex: 1 },
  roleTitle: {
    fontSize: 16,
    fontFamily: Fonts.extrabold,
    color: Colors.ink,
    marginBottom: 3,
  },
  roleDesc: {
    fontSize: 12,
    fontFamily: Fonts.medium,
    color: Colors.ink3,
    lineHeight: 18,
  },
  roleArrow: {
    fontSize: 24,
    color: Colors.ink4,
  },

  legal: {
    fontSize: 11,
    fontFamily: Fonts.medium,
    color: Colors.ink4,
    textAlign: 'center',
    lineHeight: 18,
    marginTop: Spacing.md,
  },
  legalLink: { color: Colors.blue },
});
