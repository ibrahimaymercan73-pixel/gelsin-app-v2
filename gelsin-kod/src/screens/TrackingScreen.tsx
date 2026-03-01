import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated } from 'react-native';
import MapView, { Marker, PROVIDER_GOOGLE, Polyline } from 'react-native-maps';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { Colors, Fonts, Shadow } from '@/constants';

export default function TrackingScreen() {
  const router = useRouter();
  const { taskId } = useLocalSearchParams<{ taskId: string }>();
  const mapRef = useRef<MapView>(null);
  const [fixerLoc, setFixerLoc] = useState({ latitude: 41.0150, longitude: 28.9780 });
  const [homeLoc] = useState({ latitude: 41.0082, longitude: 28.9784 });
  const [status, setStatus] = useState<'yolda'|'calisiyor'>('yolda');
  const pulse = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    loadTask();
    animatePulse();
    // Simüle hareket
    const iv = setInterval(() => {
      setFixerLoc(p => ({
        latitude: p.latitude + (Math.random() - 0.5) * 0.0003,
        longitude: p.longitude + (Math.random() - 0.5) * 0.0003,
      }));
    }, 3000);
    return () => clearInterval(iv);
  }, []);

  const loadTask = async () => {
    const { data } = await supabase.from('tasks').select('checkin_at').eq('id', taskId).single();
    if (data?.checkin_at) setStatus('calisiyor');
  };

  const animatePulse = () => {
    Animated.loop(Animated.sequence([
      Animated.timing(pulse, { toValue: 1.25, duration: 700, useNativeDriver: true }),
      Animated.timing(pulse, { toValue: 1, duration: 700, useNativeDriver: true }),
    ])).start();
  };

  const info = status === 'yolda'
    ? { ic: '🚗', t: 'Usta Yolda', s: '~8 dakika', color: Colors.blue }
    : { ic: '🔧', t: 'Usta Çalışıyor', s: 'İş devam ediyor', color: Colors.green };

  return (
    <View style={{ flex: 1 }}>
      <MapView
        ref={mapRef}
        style={StyleSheet.absoluteFillObject}
        provider={PROVIDER_GOOGLE}
        initialRegion={{ latitude: 41.012, longitude: 28.978, latitudeDelta: 0.015, longitudeDelta: 0.015 }}
      >
        <Marker coordinate={fixerLoc}>
          <Animated.View style={[s.fPin, { transform: [{ scale: pulse }] }]}>
            <Text style={{ fontSize: 22 }}>👨‍🔧</Text>
          </Animated.View>
        </Marker>
        <Marker coordinate={homeLoc}>
          <View style={s.hPin}><Text style={{ fontSize: 20 }}>🏠</Text></View>
        </Marker>
        <Polyline coordinates={[fixerLoc, homeLoc]} strokeColor={Colors.blue} strokeWidth={3} lineDashPattern={[8, 4]} />
      </MapView>

      <SafeAreaView style={s.headerWrap} edges={['top']}>
        <View style={s.header}>
          <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
            <Text style={s.backT}>←</Text>
          </TouchableOpacity>
          <Text style={s.headerT}>Canlı Takip</Text>
          <TouchableOpacity style={s.centerBtn} onPress={() => mapRef.current?.fitToCoordinates([fixerLoc, homeLoc], { edgePadding: { top: 80, right: 60, bottom: 280, left: 60 } })}>
            <Text>🎯</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>

      <View style={s.card}>
        <View style={[s.statusRow, { borderColor: info.color + '44' }]}>
          <Text style={{ fontSize: 28 }}>{info.ic}</Text>
          <View style={{ flex: 1 }}>
            <Text style={[s.statusT, { color: info.color }]}>{info.t}</Text>
            <Text style={s.statusS}>{info.s}</Text>
          </View>
          {status === 'yolda' && (
            <View style={[s.etaBadge, { backgroundColor: info.color }]}>
              <Text style={s.etaT}>~8 dk</Text>
            </View>
          )}
        </View>

        <View style={s.fixerRow}>
          <Text style={{ fontSize: 38 }}>👨‍🔧</Text>
          <View style={{ flex: 1 }}>
            <Text style={s.fixerName}>Mehmet Acar</Text>
            <Text style={s.fixerSub}>⭐ 4.9 · 47 iş</Text>
          </View>
          <TouchableOpacity style={s.callBtn}><Text style={{ fontSize: 20 }}>📞</Text></TouchableOpacity>
        </View>

        <TouchableOpacity
          style={s.qrBtn}
          onPress={() => router.push({ pathname: '/qr-show', params: { taskId } })}
        >
          <Text style={s.qrBtnT}>📱 QR Kodunu Göster</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  headerWrap: { position: 'absolute', top: 0, left: 0, right: 0 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 12, backgroundColor: 'rgba(12,21,39,0.88)' },
  backBtn: { width: 40, height: 40, backgroundColor: 'rgba(255,255,255,0.12)', borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  backT: { fontSize: 20, color: 'white' },
  headerT: { fontSize: 16, fontFamily: Fonts.extrabold, color: 'white' },
  centerBtn: { width: 40, height: 40, backgroundColor: 'rgba(255,255,255,0.12)', borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  card: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: Colors.white, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, paddingBottom: 36, ...Shadow.lg },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: Colors.off, borderRadius: 16, padding: 14, borderWidth: 1, marginBottom: 16 },
  statusT: { fontSize: 16, fontFamily: Fonts.extrabold, marginBottom: 3 },
  statusS: { fontSize: 12, color: Colors.ink3 },
  etaBadge: { borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6 },
  etaT: { fontSize: 12, fontFamily: Fonts.extrabold, color: 'white' },
  fixerRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 16, paddingBottom: 16, borderBottomWidth: 1, borderColor: Colors.border },
  fixerName: { fontSize: 16, fontFamily: Fonts.extrabold, color: Colors.ink },
  fixerSub: { fontSize: 12, color: Colors.ink3, marginTop: 2 },
  callBtn: { width: 44, height: 44, backgroundColor: Colors.greenLt, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  qrBtn: { backgroundColor: Colors.blue, borderRadius: 16, padding: 16, alignItems: 'center', ...Shadow.md },
  qrBtnT: { fontSize: 15, fontFamily: Fonts.extrabold, color: 'white' },
  fPin: { width: 50, height: 50, backgroundColor: Colors.blue, borderRadius: 25, alignItems: 'center', justifyContent: 'center', borderWidth: 3, borderColor: 'white', ...Shadow.lg },
  hPin: { width: 46, height: 46, backgroundColor: Colors.white, borderRadius: 23, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: Colors.blue, ...Shadow.md },
});
