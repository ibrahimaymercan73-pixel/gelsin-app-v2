import React, { useRef, useState } from 'react';
import {
  View, Text, StyleSheet, Dimensions,
  TouchableOpacity, FlatList, Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Colors, Fonts, Spacing, Radius } from '@/constants';

const { width } = Dimensions.get('window');

const SLIDES = [
  {
    id: '1',
    emoji: '🔧',
    title: 'Mahallenin en iyi\nustası kapında',
    subtitle:
      'Tesisat, elektrik, boya, montaj… Etrafındaki kimlik doğrulamalı Gelsin\'lar dakikalar içinde teklif gönderir.',
    bg: ['#0F1F4E', '#1D4ED8'],
  },
  {
    id: '2',
    emoji: '🔒',
    title: 'Güvenli, şeffaf,\nkanıtlanmış',
    subtitle:
      'Gelsin kapıya gelince QR okutulur, iş başlar. Biter bitmez tekrar okutulur. Paran iş bitene kadar güvende.',
    bg: ['#065F46', '#10B981'],
  },
];

export default function OnboardingScreen() {
  const router = useRouter();
  const [currentIndex, setCurrentIndex] = useState(0);
  const flatListRef = useRef<FlatList>(null);
  const scrollX = useRef(new Animated.Value(0)).current;

  const goNext = () => {
    if (currentIndex < SLIDES.length - 1) {
      flatListRef.current?.scrollToIndex({ index: currentIndex + 1 });
      setCurrentIndex(currentIndex + 1);
    } else {
      router.push('/role-select');
    }
  };

  const goPrev = () => {
    if (currentIndex > 0) {
      flatListRef.current?.scrollToIndex({ index: currentIndex - 1 });
      setCurrentIndex(currentIndex - 1);
    }
  };

  return (
    <View style={styles.container}>
      <FlatList
        ref={flatListRef}
        data={SLIDES}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        scrollEnabled={false}
        keyExtractor={(item) => item.id}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { x: scrollX } } }],
          { useNativeDriver: false }
        )}
        renderItem={({ item }) => (
          <View style={[styles.slide, { width }]}>
            {/* Visual */}
            <View style={[styles.visual, { backgroundColor: item.bg[1] }]}>
              <Text style={styles.slideEmoji}>{item.emoji}</Text>
            </View>

            {/* Content */}
            <SafeAreaView edges={['bottom']} style={styles.content}>
              {/* Dots */}
              <View style={styles.dots}>
                {SLIDES.map((_, i) => (
                  <View
                    key={i}
                    style={[
                      styles.dot,
                      i === currentIndex ? styles.dotActive : styles.dotInactive,
                    ]}
                  />
                ))}
              </View>

              <Text style={styles.title}>{item.title}</Text>
              <Text style={styles.subtitle}>{item.subtitle}</Text>

              {/* Buttons */}
              <View style={styles.actions}>
                {currentIndex > 0 && (
                  <TouchableOpacity style={styles.btnGhost} onPress={goPrev}>
                    <Text style={styles.btnGhostText}>← Geri</Text>
                  </TouchableOpacity>
                )}
                <TouchableOpacity
                  style={[styles.btnPrimary, currentIndex === 0 && { flex: 1 }]}
                  onPress={goNext}
                >
                  <Text style={styles.btnPrimaryText}>
                    {currentIndex < SLIDES.length - 1 ? 'Devam Et →' : 'Başlayalım'}
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Skip */}
              {currentIndex < SLIDES.length - 1 && (
                <TouchableOpacity onPress={() => router.push('/role-select')}>
                  <Text style={styles.skip}>Atla</Text>
                </TouchableOpacity>
              )}
            </SafeAreaView>
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.white },

  slide: { flex: 1 },

  visual: {
    height: '52%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  slideEmoji: { fontSize: 96 },

  content: {
    flex: 1,
    backgroundColor: Colors.white,
    borderTopLeftRadius: Radius.xxl,
    borderTopRightRadius: Radius.xxl,
    marginTop: -24,
    paddingHorizontal: Spacing.xxl,
    paddingTop: Spacing.xxl,
  },

  dots: { flexDirection: 'row', gap: 6, marginBottom: Spacing.xl },
  dot: { height: 5, borderRadius: 3 },
  dotActive: { width: 24, backgroundColor: Colors.blue },
  dotInactive: { width: 8, backgroundColor: Colors.border },

  title: {
    fontSize: 28,
    fontFamily: Fonts.black,
    color: Colors.ink,
    letterSpacing: -0.5,
    marginBottom: Spacing.md,
    lineHeight: 34,
  },
  subtitle: {
    fontSize: 15,
    fontFamily: Fonts.medium,
    color: Colors.ink3,
    lineHeight: 24,
    flex: 1,
  },

  actions: { flexDirection: 'row', gap: 10, marginTop: Spacing.xl, marginBottom: Spacing.md },

  btnPrimary: {
    flex: 1,
    backgroundColor: Colors.blue,
    borderRadius: Radius.lg,
    paddingVertical: 16,
    alignItems: 'center',
  },
  btnPrimaryText: {
    fontFamily: Fonts.extrabold,
    fontSize: 16,
    color: Colors.white,
  },

  btnGhost: {
    borderWidth: 1.5,
    borderColor: Colors.border,
    borderRadius: Radius.lg,
    paddingVertical: 16,
    paddingHorizontal: Spacing.xl,
    alignItems: 'center',
  },
  btnGhostText: {
    fontFamily: Fonts.bold,
    fontSize: 15,
    color: Colors.ink3,
  },

  skip: {
    textAlign: 'center',
    fontFamily: Fonts.semibold,
    fontSize: 13,
    color: Colors.ink4,
    paddingVertical: Spacing.md,
  },
});
