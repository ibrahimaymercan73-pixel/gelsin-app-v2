import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, Switch, Alert, ActivityIndicator, Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import { useAuthStore, useTaskStore } from '@/lib/store';
import { createTask, uploadTaskPhoto } from '@/lib/api';
import { TaskCategory, CATEGORIES } from '@/types';
import { Colors, Fonts, Spacing, Radius, Shadow } from '@/constants';

const CATS = Object.entries(CATEGORIES) as Array<[TaskCategory, { label: string; emoji: string }]>;

export default function NewTaskScreen() {
  const router = useRouter();
  const { user } = useAuthStore();
  const { addTask } = useTaskStore();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<TaskCategory>('tesisat');
  const [isUrgent, setIsUrgent] = useState(false);
  const [photos, setPhotos] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<1 | 2 | 3>(1);

  const pickPhoto = async () => {
    if (photos.length >= 4) {
      Alert.alert('Limit', 'En fazla 4 fotoğraf ekleyebilirsin');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,
      allowsEditing: true,
      aspect: [4, 3],
    });
    if (!result.canceled && result.assets[0]) {
      setPhotos(p => [...p, result.assets[0].uri]);
    }
  };

  const takePhoto = async () => {
    if (photos.length >= 4) return;
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('İzin gerekli', 'Kamera izni ver');
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      quality: 0.8, allowsEditing: true, aspect: [4, 3],
    });
    if (!result.canceled && result.assets[0]) {
      setPhotos(p => [...p, result.assets[0].uri]);
    }
  };

  const submit = async () => {
    if (!title.trim()) {
      Alert.alert('Eksik', 'Başlık zorunlu');
      return;
    }
    if (!user) return;
    setLoading(true);
    try {
      // Konum al
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Konum gerekli', 'Konumunu paylaşman gerekiyor');
        setLoading(false);
        return;
      }
      const loc = await Location.getCurrentPositionAsync({});
      const address = await Location.reverseGeocodeAsync(loc.coords);
      const addrStr = address[0]
        ? `${address[0].street || ''} ${address[0].district || ''} ${address[0].city || ''}`.trim()
        : 'Konum belirlendi';

      // İş oluştur
      const task = await createTask({
        title: title.trim(),
        description: description.trim(),
        category,
        is_urgent: isUrgent,
        location: { latitude: loc.coords.latitude, longitude: loc.coords.longitude },
        address: addrStr,
        photo_urls: [],
        customer_id: user.id,
      });

      // Fotoğrafları yükle
      const uploadedUrls: string[] = [];
      for (const uri of photos) {
        try {
          const url = await uploadTaskPhoto(uri, task.id);
          uploadedUrls.push(url);
        } catch { /* devam et */ }
      }

      addTask({ ...task, photo_urls: uploadedUrls });
      Alert.alert(
        '🎉 Talebiniz Yayınlandı!',
        'Yakındaki ustalar bildirim aldı. Teklifler gelmeye başlıyor.',
        [{ text: 'Tamam', onPress: () => router.replace('/(tabs)/tasks') }]
      );
    } catch (e: any) {
      Alert.alert('Hata', e.message || 'Bir sorun oluştu');
    }
    setLoading(false);
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backIc}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerT}>Yeni İş Talebi</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Adım göstergesi */}
      <View style={styles.steps}>
        {[1, 2, 3].map(s => (
          <View key={s} style={styles.stepRow}>
            <View style={[styles.stepDot, step >= s && styles.stepDotOn]}>
              <Text style={[styles.stepNum, step >= s && styles.stepNumOn]}>{s}</Text>
            </View>
            {s < 3 && <View style={[styles.stepLine, step > s && styles.stepLineOn]} />}
          </View>
        ))}
      </View>

      <ScrollView style={styles.body} showsVerticalScrollIndicator={false}>

        {/* ADIM 1 — Detaylar */}
        {step === 1 && (
          <View style={styles.section}>
            <Text style={styles.sectionT}>İş Detayları</Text>

            <Text style={styles.label}>Başlık *</Text>
            <TextInput
              style={styles.input}
              placeholder="Örn: Mutfak musluğu akıyor"
              placeholderTextColor={Colors.ink4}
              value={title}
              onChangeText={setTitle}
              maxLength={100}
            />

            <Text style={styles.label}>Açıklama</Text>
            <TextInput
              style={[styles.input, styles.textarea]}
              placeholder="Sorunu detaylı anlat, usta daha iyi teklif versin..."
              placeholderTextColor={Colors.ink4}
              value={description}
              onChangeText={setDescription}
              multiline
              numberOfLines={4}
              maxLength={500}
            />

            {/* ACİL */}
            <View style={styles.urgentRow}>
              <View>
                <Text style={styles.urgentT}>🚨 Acil İş</Text>
                <Text style={styles.urgentS}>Yakındaki tüm ustalar anında bildirim alır</Text>
              </View>
              <Switch
                value={isUrgent}
                onValueChange={setIsUrgent}
                trackColor={{ false: Colors.border, true: Colors.red + '88' }}
                thumbColor={isUrgent ? Colors.red : Colors.ink4}
              />
            </View>

            <TouchableOpacity style={styles.nextBtn} onPress={() => setStep(2)}>
              <Text style={styles.nextBtnT}>Devam →</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* ADIM 2 — Kategori */}
        {step === 2 && (
          <View style={styles.section}>
            <Text style={styles.sectionT}>Kategori Seç</Text>
            <Text style={styles.sectionS}>İşin hangi alanda? Doğru ustalar teklif versin.</Text>

            <View style={styles.catGrid}>
              {CATS.map(([id, { label, emoji }]) => (
                <TouchableOpacity
                  key={id}
                  style={[styles.catCard, category === id && styles.catCardOn]}
                  onPress={() => setCategory(id)}
                >
                  <Text style={styles.catEmoji}>{emoji}</Text>
                  <Text style={[styles.catLabel, category === id && styles.catLabelOn]}>{label}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.navRow}>
              <TouchableOpacity style={styles.prevBtn} onPress={() => setStep(1)}>
                <Text style={styles.prevBtnT}>← Geri</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.nextBtn2} onPress={() => setStep(3)}>
                <Text style={styles.nextBtnT}>Devam →</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* ADIM 3 — Fotoğraflar */}
        {step === 3 && (
          <View style={styles.section}>
            <Text style={styles.sectionT}>Fotoğraf Ekle</Text>
            <Text style={styles.sectionS}>Sorunu gösteren fotoğraf ekle — usta daha doğru fiyat verir.</Text>

            {/* Fotoğraf ızgarası */}
            <View style={styles.photoGrid}>
              {photos.map((uri, i) => (
                <View key={i} style={styles.photoWrap}>
                  <Image source={{ uri }} style={styles.photo} />
                  <TouchableOpacity
                    style={styles.photoDel}
                    onPress={() => setPhotos(p => p.filter((_, j) => j !== i))}
                  >
                    <Text style={styles.photoDelT}>✕</Text>
                  </TouchableOpacity>
                </View>
              ))}
              {photos.length < 4 && (
                <View style={styles.photoActions}>
                  <TouchableOpacity style={styles.photoAdd} onPress={takePhoto}>
                    <Text style={styles.photoAddIc}>📷</Text>
                    <Text style={styles.photoAddT}>Çek</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.photoAdd} onPress={pickPhoto}>
                    <Text style={styles.photoAddIc}>🖼</Text>
                    <Text style={styles.photoAddT}>Seç</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>

            {/* Özet */}
            <View style={styles.summary}>
              <Text style={styles.summaryT}>📋 Özet</Text>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryL}>Başlık</Text>
                <Text style={styles.summaryV}>{title}</Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryL}>Kategori</Text>
                <Text style={styles.summaryV}>{CATEGORIES[category]?.emoji} {CATEGORIES[category]?.label}</Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryL}>Öncelik</Text>
                <Text style={[styles.summaryV, isUrgent && { color: Colors.red }]}>
                  {isUrgent ? '🚨 Acil' : 'Normal'}
                </Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryL}>Fotoğraf</Text>
                <Text style={styles.summaryV}>{photos.length} adet</Text>
              </View>
            </View>

            <View style={styles.navRow}>
              <TouchableOpacity style={styles.prevBtn} onPress={() => setStep(2)}>
                <Text style={styles.prevBtnT}>← Geri</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.submitBtn, loading && { opacity: 0.7 }]}
                onPress={submit}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color={Colors.white} />
                ) : (
                  <Text style={styles.submitBtnT}>🚀 Yayınla</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.white },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: Spacing.xl, paddingVertical: Spacing.lg, borderBottomWidth: 1, borderColor: Colors.border },
  backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  backIc: { fontSize: 22, color: Colors.ink },
  headerT: { fontSize: 17, fontFamily: Fonts.extrabold, color: Colors.ink },

  steps: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 20, gap: 0 },
  stepRow: { flexDirection: 'row', alignItems: 'center' },
  stepDot: { width: 32, height: 32, borderRadius: 16, backgroundColor: Colors.border, alignItems: 'center', justifyContent: 'center' },
  stepDotOn: { backgroundColor: Colors.blue },
  stepNum: { fontSize: 14, fontFamily: Fonts.extrabold, color: Colors.ink3 },
  stepNumOn: { color: Colors.white },
  stepLine: { width: 48, height: 2, backgroundColor: Colors.border },
  stepLineOn: { backgroundColor: Colors.blue },

  body: { flex: 1 },
  section: { padding: Spacing.xl },
  sectionT: { fontSize: 20, fontFamily: Fonts.black, color: Colors.ink, marginBottom: 6, letterSpacing: -0.5 },
  sectionS: { fontSize: 13, color: Colors.ink3, marginBottom: 20, lineHeight: 20 },

  label: { fontSize: 11, fontFamily: Fonts.extrabold, color: Colors.ink3, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8, marginTop: 16 },
  input: { backgroundColor: Colors.off, borderWidth: 1.5, borderColor: Colors.border, borderRadius: Radius.md, padding: 14, fontSize: 15, fontFamily: Fonts.semibold, color: Colors.ink },
  textarea: { height: 110, textAlignVertical: 'top' },

  urgentRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 20, backgroundColor: Colors.redLt, borderRadius: Radius.lg, padding: 16 },
  urgentT: { fontSize: 15, fontFamily: Fonts.extrabold, color: Colors.red },
  urgentS: { fontSize: 12, color: Colors.red + 'aa', marginTop: 3 },

  catGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 24 },
  catCard: { width: '47%', borderRadius: Radius.lg, borderWidth: 1.5, borderColor: Colors.border, backgroundColor: Colors.off, padding: 16, alignItems: 'center', gap: 8 },
  catCardOn: { borderColor: Colors.blue, backgroundColor: Colors.blueLt },
  catEmoji: { fontSize: 32 },
  catLabel: { fontSize: 13, fontFamily: Fonts.bold, color: Colors.ink3 },
  catLabelOn: { color: Colors.blue },

  photoGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 20 },
  photoWrap: { width: 100, height: 100, borderRadius: Radius.md, overflow: 'hidden', position: 'relative' },
  photo: { width: '100%', height: '100%' },
  photoDel: { position: 'absolute', top: 4, right: 4, backgroundColor: Colors.red, borderRadius: 10, width: 20, height: 20, alignItems: 'center', justifyContent: 'center' },
  photoDelT: { color: Colors.white, fontSize: 11, fontFamily: Fonts.bold },
  photoActions: { flexDirection: 'row', gap: 10 },
  photoAdd: { width: 100, height: 100, borderRadius: Radius.md, borderWidth: 1.5, borderColor: Colors.border, borderStyle: 'dashed', alignItems: 'center', justifyContent: 'center', gap: 4 },
  photoAddIc: { fontSize: 28 },
  photoAddT: { fontSize: 12, fontFamily: Fonts.bold, color: Colors.ink3 },

  summary: { backgroundColor: Colors.off, borderRadius: Radius.lg, padding: 16, marginBottom: 24, borderWidth: 1, borderColor: Colors.border },
  summaryT: { fontSize: 14, fontFamily: Fonts.extrabold, color: Colors.ink, marginBottom: 12 },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 6, borderBottomWidth: 1, borderColor: Colors.border },
  summaryL: { fontSize: 13, color: Colors.ink3, fontFamily: Fonts.medium },
  summaryV: { fontSize: 13, fontFamily: Fonts.bold, color: Colors.ink },

  navRow: { flexDirection: 'row', gap: 10 },
  prevBtn: { flex: 1, borderWidth: 1.5, borderColor: Colors.border, borderRadius: Radius.lg, padding: 16, alignItems: 'center' },
  prevBtnT: { fontSize: 15, fontFamily: Fonts.bold, color: Colors.ink3 },
  nextBtn: { backgroundColor: Colors.blue, borderRadius: Radius.lg, padding: 16, alignItems: 'center', marginTop: 24, ...Shadow.md },
  nextBtn2: { flex: 1, backgroundColor: Colors.blue, borderRadius: Radius.lg, padding: 16, alignItems: 'center', ...Shadow.sm },
  nextBtnT: { fontSize: 15, fontFamily: Fonts.extrabold, color: Colors.white },
  submitBtn: { flex: 1, backgroundColor: Colors.green, borderRadius: Radius.lg, padding: 16, alignItems: 'center', ...Shadow.md },
  submitBtnT: { fontSize: 15, fontFamily: Fonts.extrabold, color: Colors.white },
});
