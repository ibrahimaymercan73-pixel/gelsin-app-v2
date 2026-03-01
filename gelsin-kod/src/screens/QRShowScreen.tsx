import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import QRCode from 'react-native-qrcode-svg';
import { supabase } from '@/lib/supabase';
import { Colors, Fonts, Spacing, Radius, Shadow } from '@/constants';

export default function QRShowScreen() {
  const router = useRouter();
  const { taskId } = useLocalSearchParams<{ taskId: string }>();
  const [token, setToken] = useState('');
  const [checkedIn, setCheckedIn] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadToken();
    const interval = setInterval(checkStatus, 3000);
    return () => clearInterval(interval);
  }, []);

  const loadToken = async () => {
    const { data } = await supabase
      .from('tasks').select('qr_token, checkin_at, status').eq('id', taskId).single();
    if (data) {
      setToken(data.qr_token);
      setCheckedIn(!!data.checkin_at);
    }
    setLoading(false);
  };

  const checkStatus = async () => {
    const { data } = await supabase
      .from('tasks').select('checkin_at, checkout_at, status').eq('id', taskId).single();
    if (data?.checkin_at && !checkedIn) {
      setCheckedIn(true);
      Alert.alert('✅ Usta Geldi!', 'Usta check-in yaptı. İş başladı.');
    }
    if (data?.checkout_at) {
      Alert.alert('🎉 İş Bitti!', 'Usta check-out yaptı. Ödeme işleniyor.',
        [{ text: 'Tamam', onPress: () => router.replace('/(tabs)/tasks') }]
      );
    }
  };

  if (loading) return <View style={s.center}><ActivityIndicator color={Colors.blue} /></View>;

  return (
    <SafeAreaView style={s.container} edges={['top','bottom']}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()}><Text style={s.backT}>← Geri</Text></TouchableOpacity>
        <Text style={s.headerT}>QR Kodu</Text>
        <View style={{width:60}} />
      </View>

      <View style={s.body}>
        {!checkedIn ? (
          <>
            <Text style={s.title}>Ustaya Göster</Text>
            <Text style={s.sub}>Usta kapıya gelince bu kodu okusun, iş başlasın.</Text>

            <View style={s.qrWrap}>
              {token ? (
                <QRCode
                  value={token}
                  size={220}
                  color={Colors.navy}
                  backgroundColor="white"
                />
              ) : null}
            </View>

            <View style={s.tokenWrap}>
              <Text style={s.tokenL}>Manuel kod</Text>
              <Text style={s.tokenV}>{token}</Text>
            </View>

            <View style={s.waitRow}>
              <ActivityIndicator color={Colors.blue} size="small" />
              <Text style={s.waitT}>Usta bekleniyor...</Text>
            </View>
          </>
        ) : (
          <>
            <Text style={s.checkinIc}>✅</Text>
            <Text style={s.checkinT}>Usta Check-in Yaptı!</Text>
            <Text style={s.checkinS}>İş başladı. Usta bittikten sonra tekrar okutacak.</Text>

            <View style={s.infoCard}>
              <Text style={s.infoT}>💡 İş bitince ne olur?</Text>
              <Text style={s.infoS}>Usta check-out QR'ını okutunca escrow otomatik serbest kalır ve ödeme ustanın hesabına geçer. Bir şey yapman gerekmiyor.</Text>
            </View>
          </>
        )}
      </View>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container:{flex:1,backgroundColor:Colors.white},
  center:{flex:1,alignItems:'center',justifyContent:'center'},
  header:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',paddingHorizontal:20,paddingVertical:14,borderBottomWidth:1,borderColor:Colors.border},
  backT:{fontSize:15,fontFamily:Fonts.semibold,color:Colors.blue},
  headerT:{fontSize:17,fontFamily:Fonts.extrabold,color:Colors.ink},
  body:{flex:1,alignItems:'center',padding:28,paddingTop:36},
  title:{fontSize:26,fontFamily:Fonts.black,color:Colors.ink,textAlign:'center',marginBottom:10},
  sub:{fontSize:14,color:Colors.ink3,textAlign:'center',lineHeight:22,marginBottom:36},
  qrWrap:{backgroundColor:Colors.white,borderRadius:24,padding:24,...Shadow.lg,borderWidth:2,borderColor:Colors.blueMid,marginBottom:24},
  tokenWrap:{backgroundColor:Colors.off,borderRadius:12,padding:14,alignItems:'center',marginBottom:24,width:'100%'},
  tokenL:{fontSize:11,fontFamily:Fonts.extrabold,color:Colors.ink4,textTransform:'uppercase',letterSpacing:1,marginBottom:6},
  tokenV:{fontSize:18,fontFamily:Fonts.black,color:Colors.navy,letterSpacing:2},
  waitRow:{flexDirection:'row',alignItems:'center',gap:10},
  waitT:{fontSize:14,fontFamily:Fonts.semibold,color:Colors.ink3},
  checkinIc:{fontSize:80,marginBottom:16},
  checkinT:{fontSize:26,fontFamily:Fonts.black,color:Colors.green,marginBottom:10},
  checkinS:{fontSize:14,color:Colors.ink3,textAlign:'center',lineHeight:22,marginBottom:28},
  infoCard:{backgroundColor:Colors.blueLt,borderRadius:16,padding:18,width:'100%'},
  infoT:{fontSize:14,fontFamily:Fonts.extrabold,color:Colors.navy,marginBottom:8},
  infoS:{fontSize:13,color:Colors.ink2,lineHeight:20},
});
