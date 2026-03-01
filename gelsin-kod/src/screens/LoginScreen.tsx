import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  TextInput, ActivityIndicator, Alert, KeyboardAvoidingView, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/lib/store';
import { UserRole } from '@/types';
import { Colors, Fonts, Spacing, Radius, Shadow } from '@/constants';

export default function LoginScreen() {
  const router = useRouter();
  const { role } = useLocalSearchParams<{ role: UserRole }>();
  const { setRole, fetchProfile } = useAuthStore();

  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [step, setStep] = useState<'phone' | 'otp'>('phone');
  const [loading, setLoading] = useState(false);

  const isEv = role === 'ev_sahibi';

  // 1. SMS gönder
  const sendOTP = async () => {
    if (phone.length < 10) {
      Alert.alert('Hata', 'Geçerli bir telefon numarası gir');
      return;
    }
    setLoading(true);
    const fullPhone = `+90${phone.replace(/\s/g, '')}`;
    const { error } = await supabase.auth.signInWithOtp({ phone: fullPhone });
    setLoading(false);

    if (error) {
      Alert.alert('Hata', error.message);
      return;
    }
    setStep('otp');
  };

  // 2. OTP doğrula
  const verifyOTP = async () => {
    if (otp.length < 6) {
      Alert.alert('Hata', '6 haneli kodu gir');
      return;
    }
    setLoading(true);
    const fullPhone = `+90${phone.replace(/\s/g, '')}`;
    const { data, error } = await supabase.auth.verifyOtp({
      phone: fullPhone,
      token: otp,
      type: 'sms',
    });
    setLoading(false);

    if (error || !data.user) {
      Alert.alert('Hata', 'Kod hatalı, tekrar dene');
      return;
    }

    // Profili çek veya yeni kullanıcı oluştur
    await handleUserProfile(data.user.id, fullPhone);
  };

  const handleUserProfile = async (userId: string, phone: string) => {
    // Kullanıcı var mı kontrol et
    const { data: existing } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single();

    if (!existing) {
      // Yeni kullanıcı oluştur
      await supabase.from('users').insert({
        id: userId,
        phone,
        role: role || 'ev_sahibi',
        name: '',
        is_verified: false,
        avg_rating: 0,
        total_jobs: 0,
      });
      // Cüzdan oluştur
      await supabase.from('wallets').insert({
        user_id: userId,
        balance: 0,
        escrow_held: 0,
        total_earned: 0,
      });
    }

    setRole(role || 'ev_sahibi');
    await fetchProfile(userId);
    router.replace('/(tabs)');
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      {/* Hero */}
      <LinearGradient
        colors={[Colors.navy, Colors.blue]}
        style={styles.hero}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <SafeAreaView>
          <TouchableOpacity onPress={() => router.back()} style={styles.back}>
            <Text style={styles.backText}>← Geri</Text>
          </TouchableOpacity>
          <Text style={styles.title}>
            {isEv ? 'Ev Sahibi Girişi' : 'Gelsin Girişi'}
          </Text>
          <Text style={styles.subtitle}>
            SMS doğrulaması yapılacak.{'\n'}Veriler Türkiye'de saklanır.
          </Text>
        </SafeAreaView>
      </LinearGradient>

      {/* Form */}
      <View style={styles.form}>
        {step === 'phone' ? (
          <>
            <Text style={styles.label}>Telefon Numarası</Text>
            <View style={styles.phoneWrap}>
              <View style={styles.phonePre}>
                <Text style={styles.phonePreText}>🇹🇷 +90</Text>
              </View>
              <TextInput
                style={styles.phoneInput}
                placeholder="5XX XXX XX XX"
                placeholderTextColor={Colors.ink4}
                keyboardType="phone-pad"
                value={phone}
                onChangeText={setPhone}
                maxLength={11}
              />
            </View>

            <TouchableOpacity
              style={styles.btnPrimary}
              onPress={sendOTP}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color={Colors.white} />
              ) : (
                <Text style={styles.btnPrimaryText}>Doğrulama Kodu Gönder →</Text>
              )}
            </TouchableOpacity>

            <View style={styles.divider}>
              <View style={styles.divLine} />
              <Text style={styles.divText}>veya</Text>
              <View style={styles.divLine} />
            </View>

            <TouchableOpacity style={styles.btnGoogle}>
              <Text style={styles.googleG}>G</Text>
              <Text style={styles.btnGoogleText}>Google ile devam et</Text>
            </TouchableOpacity>
          </>
        ) : (
          <>
            <Text style={styles.label}>Doğrulama Kodu</Text>
            <Text style={styles.otpSub}>
              +90 {phone} numarasına gönderildi
            </Text>
            <TextInput
              style={[styles.phoneInput, styles.otpInput]}
              placeholder="• • • • • •"
              placeholderTextColor={Colors.ink4}
              keyboardType="number-pad"
              value={otp}
              onChangeText={setOtp}
              maxLength={6}
              autoFocus
            />
            <TouchableOpacity
              style={styles.btnPrimary}
              onPress={verifyOTP}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color={Colors.white} />
              ) : (
                <Text style={styles.btnPrimaryText}>Giriş Yap ✓</Text>
              )}
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setStep('phone')} style={styles.resend}>
              <Text style={styles.resendText}>Tekrar kod gönder</Text>
            </TouchableOpacity>
          </>
        )}

        <Text style={styles.privacy}>
          Kimliğin güvende. Veriler şifrelidir. KVKK uyumlu.
        </Text>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.white },

  hero: { paddingHorizontal: Spacing.xxl, paddingBottom: 36, paddingTop: 16 },
  back: { marginBottom: 20 },
  backText: { fontSize: 14, fontFamily: Fonts.bold, color: 'rgba(255,255,255,0.65)' },
  title: { fontSize: 28, fontFamily: Fonts.black, color: Colors.white, letterSpacing: -0.5, marginBottom: 8 },
  subtitle: { fontSize: 14, fontFamily: Fonts.medium, color: 'rgba(255,255,255,0.65)', lineHeight: 22 },

  form: {
    flex: 1,
    backgroundColor: Colors.white,
    borderTopLeftRadius: Radius.xxl,
    borderTopRightRadius: Radius.xxl,
    marginTop: -24,
    padding: Spacing.xxl,
  },

  label: {
    fontSize: 11, fontFamily: Fonts.extrabold, color: Colors.ink4,
    textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8,
  },
  otpSub: {
    fontSize: 13, fontFamily: Fonts.medium, color: Colors.ink3,
    marginBottom: 12, marginTop: -4,
  },

  phoneWrap: { flexDirection: 'row', gap: 0, marginBottom: 12 },
  phonePre: {
    backgroundColor: Colors.surface2, borderWidth: 1.5, borderColor: Colors.border,
    borderRightWidth: 0, borderTopLeftRadius: Radius.md, borderBottomLeftRadius: Radius.md,
    paddingHorizontal: 14, justifyContent: 'center',
  },
  phonePreText: { fontSize: 14, fontFamily: Fonts.bold, color: Colors.ink3 },
  phoneInput: {
    flex: 1, backgroundColor: Colors.surface2,
    borderWidth: 1.5, borderColor: Colors.border,
    borderTopRightRadius: Radius.md, borderBottomRightRadius: Radius.md,
    padding: 14, fontSize: 15, fontFamily: Fonts.semibold, color: Colors.ink,
  },

  otpInput: {
    borderRadius: Radius.md, textAlign: 'center',
    fontSize: 24, letterSpacing: 8, marginBottom: 12,
  },

  btnPrimary: {
    backgroundColor: Colors.blue, borderRadius: Radius.lg,
    padding: 16, alignItems: 'center', marginBottom: 8,
    ...Shadow.md,
  },
  btnPrimaryText: { fontFamily: Fonts.extrabold, fontSize: 16, color: Colors.white },

  divider: { flexDirection: 'row', alignItems: 'center', gap: 10, marginVertical: 16 },
  divLine: { flex: 1, height: 1, backgroundColor: Colors.border },
  divText: { fontSize: 12, fontFamily: Fonts.bold, color: Colors.ink4 },

  btnGoogle: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10,
    borderWidth: 1.5, borderColor: Colors.border, borderRadius: Radius.lg,
    padding: 15, backgroundColor: Colors.white, marginBottom: 8,
  },
  googleG: { fontSize: 20, fontFamily: Fonts.black, color: '#4285F4' },
  btnGoogleText: { fontFamily: Fonts.bold, fontSize: 15, color: Colors.ink2 },

  resend: { alignItems: 'center', paddingVertical: 12 },
  resendText: { fontFamily: Fonts.semibold, fontSize: 13, color: Colors.blue },

  privacy: {
    fontSize: 11, fontFamily: Fonts.medium, color: Colors.ink4,
    textAlign: 'center', lineHeight: 18, marginTop: Spacing.lg,
  },
});
