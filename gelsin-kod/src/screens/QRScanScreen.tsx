import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, Vibration } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { supabase } from '@/lib/supabase';
import { qrCheckIn, qrCheckOut } from '@/lib/api';
import { Colors, Fonts, Shadow, Radius } from '@/constants';

export default function QRScanScreen() {
  const router = useRouter();
  const { taskId } = useLocalSearchParams<{ taskId: string }>();
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);
  const [isCheckedIn, setIsCheckedIn] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => { checkTaskStatus(); }, []);

  const checkTaskStatus = async () => {
    const { data } = await supabase
      .from('tasks').select('checkin_at').eq('id', taskId).single();
    setIsCheckedIn(!!data?.checkin_at);
  };

  const handleScan = async ({ data: qrData }: { data: string }) => {
    if (scanned || loading) return;
    setScanned(true);
    setLoading(true);
    Vibration.vibrate(100);

    try {
      if (!isCheckedIn) {
        await qrCheckIn(taskId, qrData);
        Alert.alert('✅ Check-in Başarılı!', 'İş başladı. Bitince tekrar okut.',
          [{ text: 'Tamam', onPress: () => router.back() }]
        );
      } else {
        await qrCheckOut(taskId, qrData);
        Alert.alert('🎉 İş Tamamlandı!', 'Check-out yapıldı. Ödeme hesabına geçiyor.',
          [{ text: 'Harika!', onPress: () => router.replace('/(tabs)') }]
        );
      }
    } catch (e: any) {
      Alert.alert('❌ Hata', e.message || 'QR geçersiz', [
        { text: 'Tekrar Dene', onPress: () => setScanned(false) }
      ]);
    }
    setLoading(false);
  };

  if (!permission) return <View style={s.center}><Text>Kamera izni kontrol ediliyor...</Text></View>;

  if (!permission.granted) {
    return (
      <SafeAreaView style={s.container}>
        <View style={s.center}>
          <Text style={s.permIc}>📷</Text>
          <Text style={s.permT}>Kamera izni gerekli</Text>
          <Text style={s.permS}>QR kod okumak için kamera izni ver</Text>
          <TouchableOpacity style={s.permBtn} onPress={requestPermission}>
            <Text style={s.permBtnT}>İzin Ver</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <View style={s.container}>
      <CameraView
        style={StyleSheet.absoluteFillObject}
        onBarcodeScanned={scanned ? undefined : handleScan}
        barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
      />

      {/* Overlay */}
      <View style={s.overlay}>
        <SafeAreaView style={s.topBar} edges={['top']}>
          <TouchableOpacity onPress={() => router.back()} style={s.closeBtn}>
            <Text style={s.closeT}>✕</Text>
          </TouchableOpacity>
          <Text style={s.topT}>{isCheckedIn ? 'Check-out QR Tara' : 'Check-in QR Tara'}</Text>
          <View style={{width:40}} />
        </SafeAreaView>

        <View style={s.scanArea}>
          <View style={s.corner1} />
          <View style={s.corner2} />
          <View style={s.corner3} />
          <View style={s.corner4} />
          {loading && (
            <View style={s.loadingOv}>
              <Text style={s.loadingT}>⏳</Text>
            </View>
          )}
        </View>

        <View style={s.bottom}>
          <View style={s.infoCard}>
            <Text style={s.infoIc}>{isCheckedIn ? '🏁' : '🚀'}</Text>
            <View>
              <Text style={s.infoT}>{isCheckedIn ? 'İş bitti mi?' : 'İşe başlıyor musun?'}</Text>
              <Text style={s.infoS}>{isCheckedIn ? 'Ev sahibinin telefonundaki QR\'ı okut' : 'Ev sahibinin QR kodunu okut'}</Text>
            </View>
          </View>
          {scanned && !loading && (
            <TouchableOpacity style={s.retryBtn} onPress={() => setScanned(false)}>
              <Text style={s.retryBtnT}>Tekrar Tara</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </View>
  );
}

const SCAN_SIZE = 240;
const CORNER = 24;
const CORNER_T = 4;

const s = StyleSheet.create({
  container:{flex:1,backgroundColor:'#000'},
  center:{flex:1,alignItems:'center',justifyContent:'center',backgroundColor:Colors.white,padding:32},
  permIc:{fontSize:64,marginBottom:16},
  permT:{fontSize:20,fontFamily:Fonts.extrabold,color:Colors.ink,marginBottom:8},
  permS:{fontSize:14,color:Colors.ink3,textAlign:'center',marginBottom:24},
  permBtn:{backgroundColor:Colors.blue,borderRadius:14,paddingHorizontal:28,paddingVertical:14},
  permBtnT:{fontSize:15,fontFamily:Fonts.extrabold,color:Colors.white},

  overlay:{flex:1,justifyContent:'space-between'},
  topBar:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',paddingHorizontal:20,paddingTop:8},
  closeBtn:{width:40,height:40,backgroundColor:'rgba(0,0,0,0.4)',borderRadius:20,alignItems:'center',justifyContent:'center'},
  closeT:{color:'white',fontSize:18,fontFamily:Fonts.bold},
  topT:{fontSize:16,fontFamily:Fonts.extrabold,color:'white'},

  scanArea:{
    width:SCAN_SIZE,height:SCAN_SIZE,alignSelf:'center',
    position:'relative',
  },
  corner1:{position:'absolute',top:0,left:0,width:CORNER,height:CORNER,borderTopWidth:CORNER_T,borderLeftWidth:CORNER_T,borderColor:'white',borderTopLeftRadius:4},
  corner2:{position:'absolute',top:0,right:0,width:CORNER,height:CORNER,borderTopWidth:CORNER_T,borderRightWidth:CORNER_T,borderColor:'white',borderTopRightRadius:4},
  corner3:{position:'absolute',bottom:0,left:0,width:CORNER,height:CORNER,borderBottomWidth:CORNER_T,borderLeftWidth:CORNER_T,borderColor:'white',borderBottomLeftRadius:4},
  corner4:{position:'absolute',bottom:0,right:0,width:CORNER,height:CORNER,borderBottomWidth:CORNER_T,borderRightWidth:CORNER_T,borderColor:'white',borderBottomRightRadius:4},
  loadingOv:{...StyleSheet.absoluteFillObject,backgroundColor:'rgba(0,0,0,0.6)',alignItems:'center',justifyContent:'center',borderRadius:8},
  loadingT:{fontSize:48},

  bottom:{padding:28,gap:12},
  infoCard:{backgroundColor:'rgba(0,0,0,0.6)',borderRadius:16,padding:16,flexDirection:'row',alignItems:'center',gap:14},
  infoIc:{fontSize:32},
  infoT:{fontSize:15,fontFamily:Fonts.extrabold,color:'white',marginBottom:3},
  infoS:{fontSize:12,color:'rgba(255,255,255,0.7)'},
  retryBtn:{backgroundColor:'white',borderRadius:14,padding:16,alignItems:'center',...Shadow.md},
  retryBtnT:{fontSize:15,fontFamily:Fonts.extrabold,color:Colors.ink},
});
