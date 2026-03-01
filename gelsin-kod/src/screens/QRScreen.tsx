import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, Vibration } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { CameraView, useCameraPermissions } from 'expo-camera';
import QRCode from 'react-native-qrcode-svg';
import { supabase } from '@/lib/supabase';
import { qrCheckIn, qrCheckOut } from '@/lib/api';
import { useAuthStore } from '@/lib/store';
import { Colors, Fonts, Spacing, Radius, Shadow } from '@/constants';

export default function QRScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { role } = useAuthStore();

  const [task, setTask] = useState<any>(null);
  const [scanned, setScanned] = useState(false);
  const [permission, requestPermission] = useCameraPermissions();
  const [mode, setMode] = useState<'show' | 'scan'>(role === 'ev_sahibi' ? 'show' : 'scan');

  useEffect(() => { loadTask(); }, [id]);

  const loadTask = async () => {
    const { data } = await supabase.from('tasks').select('*').eq('id', id).single();
    if (data) setTask(data);
  };

  const handleScan = async ({ data }: { data: string }) => {
    if (scanned || !task) return;
    setScanned(true);
    Vibration.vibrate(100);

    try {
      const isCheckIn = !task.checkin_at;
      if (isCheckIn) {
        await qrCheckIn(task.id, data);
        Alert.alert('✅ Check-In Başarılı', 'İş başladı! Güvenli çalışmalar.', [
          { text: 'Tamam', onPress: () => router.back() }
        ]);
      } else {
        await qrCheckOut(task.id, data);
        Alert.alert('🎉 İş Tamamlandı!', 'Harika! Ödeme hesabına aktarılıyor.', [
          { text: 'Tamam', onPress: () => router.replace('/(tabs)') }
        ]);
      }
    } catch (e: any) {
      Alert.alert('Hata', e.message, [{ text: 'Tekrar Dene', onPress: () => setScanned(false) }]);
    }
  };

  const isEv = role === 'ev_sahibi';
  const isCheckIn = !task?.checkin_at;

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backT}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerT}>
          {isEv ? 'QR Kodun' : isCheckIn ? 'Check-In' : 'Check-Out'}
        </Text>
        <View style={{ width: 36 }} />
      </View>

      {/* Mode toggle (sadece usta için) */}
      {!isEv && (
        <View style={styles.toggle}>
          <TouchableOpacity
            style={[styles.toggleBtn, mode === 'scan' && styles.toggleBtnActive]}
            onPress={() => setMode('scan')}
          >
            <Text style={[styles.toggleT, mode === 'scan' && styles.toggleTActive]}>📷 Tara</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.toggleBtn, mode === 'show' && styles.toggleBtnActive]}
            onPress={() => setMode('show')}
          >
            <Text style={[styles.toggleT, mode === 'show' && styles.toggleTActive]}>📱 Göster</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* QR GÖSTER (Ev Sahibi) */}
      {(isEv || mode === 'show') && task && (
        <View style={styles.qrWrap}>
          <View style={styles.qrBox}>
            <QRCode
              value={task.qr_token}
              size={240}
              color={Colors.navy}
              backgroundColor={Colors.white}
            />
          </View>

          <View style={styles.infoCard}>
            <Text style={styles.infoTitle}>
              {isCheckIn ? '🚪 Check-In QR Kodu' : '🏁 Check-Out QR Kodu'}
            </Text>
            <Text style={styles.infoSub}>
              {isEv
                ? isCheckIn
                  ? 'Usta gelince bu kodu okutun — iş başlasın'
                  : 'İş bitince bu kodu okutun — ödeme yapılsın'
                : 'Bu kodu ev sahibine okutun'}
            </Text>
            <View style={styles.tokenRow}>
              <Text style={styles.tokenLabel}>Kod:</Text>
              <Text style={styles.tokenVal}>{task.qr_token}</Text>
            </View>
          </View>

          {isEv && (
            <View style={styles.statusSteps}>
              <View style={styles.statusStep}>
                <View style={[styles.statusDot, task.checkin_at && styles.statusDotDone]}>
                  <Text style={styles.statusDotT}>{task.checkin_at ? '✓' : '1'}</Text>
                </View>
                <View>
                  <Text style={styles.statusStepT}>Check-In</Text>
                  <Text style={styles.statusStepS}>
                    {task.checkin_at ? `✅ ${formatTime(task.checkin_at)}` : 'Usta gelince'}
                  </Text>
                </View>
              </View>
              <View style={styles.statusStep}>
                <View style={[styles.statusDot, task.checkout_at && styles.statusDotDone]}>
                  <Text style={styles.statusDotT}>{task.checkout_at ? '✓' : '2'}</Text>
                </View>
                <View>
                  <Text style={styles.statusStepT}>Check-Out & Ödeme</Text>
                  <Text style={styles.statusStepS}>
                    {task.checkout_at ? `✅ ${formatTime(task.checkout_at)}` : 'İş bitince'}
                  </Text>
                </View>
              </View>
            </View>
          )}
        </View>
      )}

      {/* QR TARA (Usta) */}
      {!isEv && mode === 'scan' && (
        <View style={styles.scanWrap}>
          {!permission?.granted ? (
            <View style={styles.permWrap}>
              <Text style={styles.permIc}>📷</Text>
              <Text style={styles.permT}>Kamera İzni Gerekli</Text>
              <Text style={styles.permS}>QR kodu okutmak için kamera iznine ihtiyaç var</Text>
              <TouchableOpacity style={styles.permBtn} onPress={requestPermission}>
                <Text style={styles.permBtnT}>İzin Ver</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <>
              <CameraView
                style={styles.camera}
                facing="back"
                onBarcodeScanned={scanned ? undefined : handleScan}
                barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
              >
                {/* Tarama çerçevesi */}
                <View style={styles.scanOverlay}>
                  <View style={styles.scanFrame}>
                    <View style={[styles.scanCorner, styles.cornerTL]} />
                    <View style={[styles.scanCorner, styles.cornerTR]} />
                    <View style={[styles.scanCorner, styles.cornerBL]} />
                    <View style={[styles.scanCorner, styles.cornerBR]} />
                  </View>
                  <Text style={styles.scanHint}>
                    QR kodu çerçeve içine al
                  </Text>
                </View>
              </CameraView>

              <View style={styles.scanInfo}>
                <Text style={styles.scanInfoT}>
                  {isCheckIn ? '🚪 Check-In için QR tara' : '🏁 Check-Out için QR tara'}
                </Text>
                <Text style={styles.scanInfoS}>
                  {isCheckIn
                    ? 'Ev sahibinin QR kodunu okut, iş başlasın'
                    : 'İş bitti, ev sahibinin QR kodunu okut, paranı al'}
                </Text>
                {scanned && (
                  <TouchableOpacity style={styles.retryBtn} onPress={() => setScanned(false)}>
                    <Text style={styles.retryBtnT}>Tekrar Dene</Text>
                  </TouchableOpacity>
                )}
              </View>
            </>
          )}
        </View>
      )}
    </SafeAreaView>
  );
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },

  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: Spacing.xl },
  backBtn: { width: 36, height: 36, borderRadius: 10, backgroundColor: Colors.white, alignItems: 'center', justifyContent: 'center', ...Shadow.sm },
  backT: { fontSize: 18, color: Colors.ink },
  headerT: { fontSize: 16, fontFamily: Fonts.extrabold, color: Colors.ink },

  toggle: { flexDirection: 'row', marginHorizontal: Spacing.xl, backgroundColor: Colors.white, borderRadius: 12, padding: 4, ...Shadow.sm, marginBottom: 20 },
  toggleBtn: { flex: 1, paddingVertical: 9, borderRadius: 9, alignItems: 'center' },
  toggleBtnActive: { backgroundColor: Colors.navy },
  toggleT: { fontSize: 14, fontFamily: Fonts.bold, color: Colors.ink3 },
  toggleTActive: { color: Colors.white },

  qrWrap: { flex: 1, alignItems: 'center', paddingHorizontal: Spacing.xl },
  qrBox: { backgroundColor: Colors.white, padding: 24, borderRadius: Radius.xl, ...Shadow.lg, marginBottom: 20 },

  infoCard: { width: '100%', backgroundColor: Colors.white, borderRadius: Radius.xl, padding: Spacing.lg, ...Shadow.sm, marginBottom: 16 },
  infoTitle: { fontSize: 16, fontFamily: Fonts.extrabold, color: Colors.ink, marginBottom: 6 },
  infoSub: { fontSize: 13, color: Colors.ink3, lineHeight: 20, marginBottom: 12 },
  tokenRow: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: Colors.bg, padding: 10, borderRadius: 8 },
  tokenLabel: { fontSize: 12, fontFamily: Fonts.bold, color: Colors.ink3 },
  tokenVal: { fontSize: 13, fontFamily: 'JetBrains Mono', color: Colors.navy, fontWeight: '600' },

  statusSteps: { width: '100%', gap: 12 },
  statusStep: { flexDirection: 'row', alignItems: 'center', gap: 14, backgroundColor: Colors.white, padding: 14, borderRadius: Radius.lg, ...Shadow.sm },
  statusDot: { width: 32, height: 32, borderRadius: 16, backgroundColor: Colors.border, alignItems: 'center', justifyContent: 'center' },
  statusDotDone: { backgroundColor: Colors.green },
  statusDotT: { fontSize: 14, fontFamily: Fonts.bold, color: Colors.white },
  statusStepT: { fontSize: 14, fontFamily: Fonts.bold, color: Colors.ink },
  statusStepS: { fontSize: 12, color: Colors.ink3, marginTop: 2 },

  scanWrap: { flex: 1 },
  camera: { flex: 1 },
  scanOverlay: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.5)' },
  scanFrame: { width: 240, height: 240, position: 'relative' },
  scanCorner: { position: 'absolute', width: 36, height: 36, borderColor: Colors.blue, borderWidth: 4 },
  cornerTL: { top: 0, left: 0, borderRightWidth: 0, borderBottomWidth: 0, borderTopLeftRadius: 8 },
  cornerTR: { top: 0, right: 0, borderLeftWidth: 0, borderBottomWidth: 0, borderTopRightRadius: 8 },
  cornerBL: { bottom: 0, left: 0, borderRightWidth: 0, borderTopWidth: 0, borderBottomLeftRadius: 8 },
  cornerBR: { bottom: 0, right: 0, borderLeftWidth: 0, borderTopWidth: 0, borderBottomRightRadius: 8 },
  scanHint: { position: 'absolute', bottom: -50, color: Colors.white, fontFamily: Fonts.semibold, fontSize: 14 },

  scanInfo: { padding: Spacing.xl, backgroundColor: Colors.white },
  scanInfoT: { fontSize: 18, fontFamily: Fonts.extrabold, color: Colors.ink, marginBottom: 8 },
  scanInfoS: { fontSize: 13, color: Colors.ink3, lineHeight: 20 },
  retryBtn: { marginTop: 16, backgroundColor: Colors.blue, borderRadius: Radius.md, padding: 14, alignItems: 'center' },
  retryBtnT: { fontSize: 14, fontFamily: Fonts.extrabold, color: Colors.white },

  permWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: Spacing.xxxl },
  permIc: { fontSize: 56, marginBottom: 16 },
  permT: { fontSize: 20, fontFamily: Fonts.extrabold, color: Colors.ink, marginBottom: 8 },
  permS: { fontSize: 14, color: Colors.ink3, textAlign: 'center', lineHeight: 22, marginBottom: 24 },
  permBtn: { backgroundColor: Colors.blue, borderRadius: Radius.lg, paddingHorizontal: 32, paddingVertical: 14 },
  permBtnT: { fontSize: 16, fontFamily: Fonts.extrabold, color: Colors.white },
});
