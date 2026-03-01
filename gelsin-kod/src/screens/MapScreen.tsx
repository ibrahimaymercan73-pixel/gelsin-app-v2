import React, { useEffect, useRef, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  ScrollView, Animated, Dimensions,
} from 'react-native';
import MapView, { Marker, Circle, PROVIDER_GOOGLE } from 'react-native-maps';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Location from 'expo-location';
import { useRouter } from 'expo-router';
import { useAuthStore, useTaskStore } from '@/lib/store';
import { getNearbyTasks } from '@/lib/api';
import { Colors, Fonts, Spacing, Radius, Shadow, RADAR_RADIUS_METERS } from '@/constants';
import { Task } from '@/types';

const { width } = Dimensions.get('window');

export default function MapScreen() {
  const router = useRouter();
  const { user, role } = useAuthStore();
  const { nearbyTasks, setNearbyTasks } = useTaskStore();

  const mapRef = useRef<MapView>(null);
  const [location, setLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [notifAnim] = useState(new Animated.Value(-100));
  const [notifVisible, setNotifVisible] = useState(false);

  useEffect(() => {
    getLocation();
  }, []);

  const getLocation = async () => {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') return;
    const loc = await Location.getCurrentPositionAsync({});
    const coords = {
      latitude: loc.coords.latitude,
      longitude: loc.coords.longitude,
    };
    setLocation(coords);
    loadNearbyTasks(coords);
  };

  const loadNearbyTasks = async (coords: { latitude: number; longitude: number }) => {
    try {
      const tasks = await getNearbyTasks(coords);
      setNearbyTasks(tasks);
      // Acil iş varsa bildirim göster
      const urgent = tasks.find(t => t.is_urgent);
      if (urgent && role === 'fixer') showNotif(urgent);
    } catch (e) {
      console.log('Task load error:', e);
    }
  };

  const showNotif = (task: Task) => {
    setSelectedTask(task);
    setNotifVisible(true);
    Animated.spring(notifAnim, {
      toValue: 0, useNativeDriver: true,
      tension: 80, friction: 8,
    }).start();
    setTimeout(() => {
      Animated.timing(notifAnim, {
        toValue: -120, useNativeDriver: true, duration: 300,
      }).start(() => setNotifVisible(false));
    }, 5000);
  };

  const isEv = role === 'ev_sahibi';

  return (
    <View style={styles.container}>
      {/* MAP */}
      <MapView
        ref={mapRef}
        style={styles.map}
        provider={PROVIDER_GOOGLE}
        showsUserLocation
        showsMyLocationButton={false}
        initialRegion={location ? {
          ...location,
          latitudeDelta: 0.02,
          longitudeDelta: 0.02,
        } : {
          latitude: 41.0082, longitude: 28.9784,
          latitudeDelta: 0.02, longitudeDelta: 0.02,
        }}
        customMapStyle={darkMapStyle}
      >
        {/* Radar çemberi (Fixer için) */}
        {location && role === 'fixer' && (
          <Circle
            center={location}
            radius={RADAR_RADIUS_METERS}
            strokeColor="rgba(59,130,246,0.3)"
            fillColor="rgba(59,130,246,0.05)"
          />
        )}

        {/* Açık iş pinleri */}
        {nearbyTasks.map(task => (
          <Marker
            key={task.id}
            coordinate={task.location}
            onPress={() => setSelectedTask(task)}
          >
            <View style={[
              styles.pin,
              task.is_urgent ? styles.pinUrgent : styles.pinNormal
            ]}>
              <Text style={styles.pinText}>
                {task.is_urgent ? '🚨' : getCategoryEmoji(task.category)}
              </Text>
            </View>
          </Marker>
        ))}
      </MapView>

      {/* HEADER */}
      <SafeAreaView style={styles.headerWrap} edges={['top']}>
        <View style={styles.header}>
          <View>
            <Text style={styles.logo}>Gelsin</Text>
            <Text style={styles.loc}>📍 Konumun algılandı</Text>
          </View>
          <TouchableOpacity
            style={styles.bellBtn}
            onPress={() => router.push('/notifications')}
          >
            <Text style={styles.bellIc}>🔔</Text>
            <View style={styles.bellDot} />
          </TouchableOpacity>
        </View>

        {/* Arama */}
        <TouchableOpacity style={styles.searchBar} onPress={() => router.push('/search')}>
          <Text style={styles.searchIc}>🔍</Text>
          <Text style={styles.searchPh}>Usta veya iş ara...</Text>
        </TouchableOpacity>
      </SafeAreaView>

      {/* FIXER: RADAR KART */}
      {role === 'fixer' && (
        <View style={styles.radarCard}>
          <View>
            <Text style={styles.radarT}>📡 Radar Aktif</Text>
            <Text style={styles.radarS}>{nearbyTasks.length} iş 2km çapında</Text>
          </View>
          <TouchableOpacity
            style={styles.radarBtn}
            onPress={() => router.push('/(tabs)/tasks')}
          >
            <Text style={styles.radarBtnT}>Görüntüle</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* ACİL BİLDİRİM (Fixer) */}
      {notifVisible && selectedTask && (
        <Animated.View style={[styles.urgentNotif, { transform: [{ translateY: notifAnim }] }]}>
          <Text style={styles.urgIc}>🚨</Text>
          <View style={styles.urgInfo}>
            <Text style={styles.urgT}>{selectedTask.title}</Text>
            <Text style={styles.urgS}>Hemen teklif ver!</Text>
          </View>
          <TouchableOpacity
            style={styles.urgBtn}
            onPress={() => {
              setNotifVisible(false);
              router.push({ pathname: '/task/[id]', params: { id: selectedTask.id } });
            }}
          >
            <Text style={styles.urgBtnT}>Gör</Text>
          </TouchableOpacity>
        </Animated.View>
      )}

      {/* YAKINDAKI USTALAR (Ev Sahibi) */}
      {isEv && (
        <View style={styles.nearbySection}>
          <Text style={styles.sectionT}>Yakındaki Ustalar</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.nearbyScroll}>
            {MOCK_FIXERS.map(f => (
              <TouchableOpacity
                key={f.id}
                style={styles.fixerCard}
                onPress={() => router.push({ pathname: '/fixer/[id]', params: { id: f.id } })}
              >
                <Text style={styles.fcAv}>{f.emoji}</Text>
                <Text style={styles.fcName}>{f.name}</Text>
                <Text style={styles.fcSkill}>{f.skill}</Text>
                <View style={styles.fcRow}>
                  <Text style={styles.fcRating}>⭐ {f.rating}</Text>
                  <Text style={styles.fcDist}>{f.dist}</Text>
                </View>
                <Text style={styles.fcPrice}>{f.price}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}

      {/* CTA BUTON */}
      <View style={styles.ctaWrap}>
        {isEv ? (
          <TouchableOpacity
            style={[styles.ctaBtn, styles.ctaBlue]}
            onPress={() => router.push('/new-task')}
          >
            <View>
              <Text style={styles.ctaT}>İş Talebi Oluştur</Text>
              <Text style={styles.ctaS}>Ustalar 5 dk'da teklif versin</Text>
            </View>
            <Text style={styles.ctaIc}>📤</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={[styles.ctaBtn, styles.ctaOrange]}
            onPress={() => router.push('/(tabs)/tasks')}
          >
            <View>
              <Text style={styles.ctaT}>Açık İşleri Gör</Text>
              <Text style={styles.ctaS}>Teklif ver, para kazan</Text>
            </View>
            <Text style={styles.ctaIc}>💰</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

function getCategoryEmoji(cat: string) {
  const map: Record<string, string> = {
    tesisat: '🔧', elektrik: '⚡', boya: '🎨',
    montaj: '🛠', marangoz: '🪚', temizlik: '🧹', diger: '📦',
  };
  return map[cat] || '🔧';
}

const MOCK_FIXERS = [
  { id: '1', emoji: '👨‍🔧', name: 'Mehmet A.', skill: 'Tesisatçı', rating: '4.9', dist: '180m', price: '150₺/sa' },
  { id: '2', emoji: '👩‍🔧', name: 'Zeynep K.', skill: 'Elektrikçi', rating: '4.8', dist: '340m', price: '180₺/sa' },
  { id: '3', emoji: '👷',   name: 'Ali R.',    skill: 'Genel Tamir', rating: '4.7', dist: '620m', price: '120₺/sa' },
  { id: '4', emoji: '🧑‍🎨', name: 'Selin M.', skill: 'Boyacı',     rating: '4.9', dist: '810m', price: '130₺/sa' },
];

const darkMapStyle = [
  { elementType: 'geometry', stylers: [{ color: '#1a2744' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#8BA3CC' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#0c1527' }] },
  { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#253a6a' }] },
  { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#0c1b3a' }] },
  { featureType: 'poi', stylers: [{ visibility: 'off' }] },
  { featureType: 'transit', stylers: [{ visibility: 'off' }] },
];

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },
  map: { ...StyleSheet.absoluteFillObject },

  headerWrap: {
    position: 'absolute', top: 0, left: 0, right: 0,
    backgroundColor: 'transparent',
  },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: Spacing.xl, paddingBottom: 8, paddingTop: 4,
  },
  logo: { fontSize: 22, fontFamily: Fonts.black, color: Colors.white, letterSpacing: -1 },
  loc: { fontSize: 12, color: 'rgba(255,255,255,0.65)', fontFamily: Fonts.medium, marginTop: 1 },
  bellBtn: {
    width: 42, height: 42, borderRadius: 13,
    backgroundColor: 'rgba(255,255,255,0.12)',
    alignItems: 'center', justifyContent: 'center', position: 'relative',
  },
  bellIc: { fontSize: 18 },
  bellDot: {
    position: 'absolute', top: 8, right: 8, width: 9, height: 9,
    borderRadius: 5, backgroundColor: Colors.red, borderWidth: 2, borderColor: Colors.bg,
  },
  searchBar: {
    marginHorizontal: Spacing.xl, marginBottom: 12,
    backgroundColor: 'rgba(255,255,255,0.92)',
    borderRadius: 14, padding: 13,
    flexDirection: 'row', alignItems: 'center', gap: 10,
    ...Shadow.md,
  },
  searchIc: { fontSize: 16 },
  searchPh: { fontSize: 14, color: Colors.ink3, fontFamily: Fonts.semibold },

  radarCard: {
    position: 'absolute', top: 140, left: Spacing.xl, right: Spacing.xl,
    backgroundColor: Colors.white, borderRadius: Radius.lg,
    padding: 14, flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between', ...Shadow.md,
    borderWidth: 1.5, borderColor: Colors.blueMid,
  },
  radarT: { fontSize: 14, fontFamily: Fonts.extrabold, color: Colors.navy },
  radarS: { fontSize: 12, color: Colors.blue, fontFamily: Fonts.semibold, marginTop: 2 },
  radarBtn: {
    backgroundColor: Colors.blue, borderRadius: 10,
    paddingHorizontal: 16, paddingVertical: 8,
  },
  radarBtnT: { fontSize: 13, fontFamily: Fonts.extrabold, color: Colors.white },

  urgentNotif: {
    position: 'absolute', top: 60, left: Spacing.xl, right: Spacing.xl,
    backgroundColor: Colors.red, borderRadius: Radius.lg,
    padding: 14, flexDirection: 'row', alignItems: 'center', gap: 12,
    ...Shadow.lg,
  },
  urgIc: { fontSize: 24 },
  urgInfo: { flex: 1 },
  urgT: { fontSize: 14, fontFamily: Fonts.extrabold, color: Colors.white },
  urgS: { fontSize: 12, color: 'rgba(255,255,255,0.75)', marginTop: 2 },
  urgBtn: {
    backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 8,
    paddingHorizontal: 14, paddingVertical: 7,
  },
  urgBtnT: { fontSize: 13, fontFamily: Fonts.bold, color: Colors.white },

  nearbySection: {
    position: 'absolute', bottom: 100, left: 0, right: 0,
  },
  sectionT: {
    fontSize: 16, fontFamily: Fonts.extrabold, color: Colors.white,
    marginLeft: Spacing.xl, marginBottom: 10,
    textShadowColor: 'rgba(0,0,0,0.5)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 4,
  },
  nearbyScroll: { paddingLeft: Spacing.xl },
  fixerCard: {
    backgroundColor: Colors.white, borderRadius: Radius.lg,
    padding: 14, width: 148, marginRight: 10, ...Shadow.md,
  },
  fcAv: { fontSize: 36, marginBottom: 8 },
  fcName: { fontSize: 14, fontFamily: Fonts.extrabold, color: Colors.ink, marginBottom: 2 },
  fcSkill: { fontSize: 11, color: Colors.blue, fontFamily: Fonts.bold, marginBottom: 6 },
  fcRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  fcRating: { fontSize: 12, color: Colors.ink3, fontFamily: Fonts.semibold },
  fcDist: { fontSize: 11, color: Colors.ink4, fontFamily: Fonts.semibold },
  fcPrice: { fontSize: 13, fontFamily: Fonts.extrabold, color: Colors.orange, marginTop: 6 },

  ctaWrap: { position: 'absolute', bottom: 24, left: Spacing.xl, right: Spacing.xl },
  ctaBtn: {
    borderRadius: Radius.xl, padding: 18,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', ...Shadow.lg,
  },
  ctaBlue: { backgroundColor: Colors.blue },
  ctaOrange: { backgroundColor: Colors.orange },
  ctaT: { fontSize: 17, fontFamily: Fonts.black, color: Colors.white },
  ctaS: { fontSize: 12, color: 'rgba(255,255,255,0.7)', marginTop: 2 },
  ctaIc: { fontSize: 30 },

  pin: {
    width: 44, height: 44, borderRadius: 14,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, ...Shadow.md,
  },
  pinNormal: { backgroundColor: Colors.white, borderColor: Colors.blue },
  pinUrgent: { backgroundColor: Colors.red, borderColor: '#FF6B6B' },
  pinText: { fontSize: 20 },
});
