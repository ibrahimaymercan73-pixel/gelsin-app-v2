import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Alert, ActivityIndicator, Image, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useAuthStore, useTaskStore } from '@/lib/store';
import { supabase } from '@/lib/supabase';
import { createOffer, acceptOffer } from '@/lib/api';
import { Task, Offer } from '@/types';
import { Colors, Fonts, Spacing, Radius, Shadow } from '@/constants';

export default function TaskDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user, role } = useAuthStore();
  const { updateTask } = useTaskStore();
  const [task, setTask] = useState<Task | null>(null);
  const [loading, setLoading] = useState(true);
  const [offerModal, setOfferModal] = useState(false);
  const [offerPrice, setOfferPrice] = useState('');
  const [offerEta, setOfferEta] = useState('');
  const [offerNote, setOfferNote] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const isEv = role === 'ev_sahibi';
  const myOffer = task?.offers?.find(o => o.fixer_id === user?.id);

  useEffect(() => { load(); }, [id]);

  const load = async () => {
    const { data } = await supabase
      .from('tasks')
      .select('*, customer:users!customer_id(*), fixer:users!fixer_id(*), offers(*, fixer:users!fixer_id(*))')
      .eq('id', id).single();
    if (data) setTask(data as Task);
    setLoading(false);
  };

  const sendOffer = async () => {
    if (!offerPrice || !offerEta) { Alert.alert('Eksik', 'Fiyat ve süre zorunlu'); return; }
    if (!user || !task) return;
    setSubmitting(true);
    try {
      await createOffer({ task_id: task.id, fixer_id: user.id, price: parseFloat(offerPrice), eta_minutes: parseInt(offerEta), note: offerNote || undefined });
      setOfferModal(false);
      Alert.alert('✅ Teklif Gönderildi!', 'Ev sahibi teklifini görecek.');
      load();
    } catch (e: any) { Alert.alert('Hata', e.message); }
    setSubmitting(false);
  };

  const handleAccept = async (offer: Offer) => {
    Alert.alert('Teklifi Kabul Et', `${offer.fixer?.name} — ${offer.price}₺, ${offer.eta_minutes} dk`, [
      { text: 'İptal', style: 'cancel' },
      { text: 'Kabul Et ✅', onPress: async () => {
        try {
          await acceptOffer(offer.id, task!.id, offer.fixer_id, offer.price);
          updateTask(task!.id, { status: 'active', fixer_id: offer.fixer_id, price: offer.price });
          load();
          Alert.alert('🎉 Usta Seçildi!', `${offer.fixer?.name} yola çıkıyor.`,
            [{ text: 'Takip Et', onPress: () => router.push({ pathname: '/tracking', params: { taskId: task!.id } }) }]
          );
        } catch (e: any) { Alert.alert('Hata', e.message); }
      }}
    ]);
  };

  if (loading) return <View style={s.center}><ActivityIndicator color={Colors.blue} size="large" /></View>;
  if (!task) return <View style={s.center}><Text>Bulunamadı</Text></View>;

  return (
    <SafeAreaView style={s.container} edges={['top','bottom']}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.back}><Text style={s.backT}>←</Text></TouchableOpacity>
        <Text style={s.headerT} numberOfLines={1}>{task.title}</Text>
        <TouchableOpacity style={s.chatBtn} onPress={() => router.push({ pathname: '/chat', params: { taskId: task.id, otherUserId: isEv ? task.fixer_id! : task.customer_id } })}>
          <Text>💬</Text>
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {task.photo_urls?.length > 0 && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ paddingLeft: 20, paddingVertical: 16 }}>
            {task.photo_urls.map((url, i) => <Image key={i} source={{ uri: url }} style={s.photo} />)}
          </ScrollView>
        )}

        <View style={s.body}>
          <View style={s.badges}>
            {task.is_urgent && <View style={s.urgBadge}><Text style={s.urgT}>🚨 ACİL</Text></View>}
            <View style={[s.statusBadge, stBg(task.status)]}><Text style={[s.statusT, stColor(task.status)]}>{stLabel(task.status)}</Text></View>
          </View>

          <Text style={s.title}>{task.title}</Text>
          {task.description ? <Text style={s.desc}>{task.description}</Text> : null}

          <View style={s.meta}>
            <View style={s.metaRow}><Text>🗂</Text><Text style={s.metaT}>{task.category}</Text></View>
            <View style={s.metaRow}><Text>📍</Text><Text style={s.metaT}>{task.address || 'Konum belirlendi'}</Text></View>
            {task.price && <View style={s.metaRow}><Text>💰</Text><Text style={[s.metaT,{color:Colors.green,fontFamily:Fonts.extrabold}]}>{task.price}₺</Text></View>}
          </View>

          {task.customer && (
            <View style={s.userCard}>
              <Text style={s.userCardL}>Ev Sahibi</Text>
              <View style={s.userRow}><Text style={s.userAv}>👤</Text><View><Text style={s.userName}>{task.customer.name || 'Kullanıcı'}</Text><Text style={s.userSub}>⭐ {task.customer.avg_rating} · {task.customer.total_jobs} iş</Text></View></View>
            </View>
          )}

          {task.fixer && (
            <View style={s.userCard}>
              <Text style={s.userCardL}>Usta</Text>
              <View style={s.userRow}>
                <Text style={s.userAv}>👨‍🔧</Text>
                <View style={{flex:1}}><Text style={s.userName}>{task.fixer.name}</Text><Text style={s.userSub}>⭐ {task.fixer.avg_rating} · {task.fixer.total_jobs} iş</Text></View>
                {isEv && task.status === 'active' && (
                  <TouchableOpacity style={s.trkBtn} onPress={() => router.push({ pathname: '/tracking', params: { taskId: task.id } })}>
                    <Text style={s.trkBtnT}>📍 Takip</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          )}

          {task.status === 'active' && (
            <TouchableOpacity
              style={[s.qrBtn, !isEv && {borderColor: Colors.green}]}
              onPress={() => router.push({ pathname: isEv ? '/qr-show' : '/qr-scan', params: { taskId: task.id } })}
            >
              <Text style={s.qrIc}>{isEv ? '📱' : '🔍'}</Text>
              <Text style={s.qrT}>{isEv ? 'QR Kodunu Göster' : 'QR Tara'}</Text>
              <Text style={s.qrS}>{isEv ? 'Ustaya okut, iş başlasın' : 'Check-in / Check-out yap'}</Text>
            </TouchableOpacity>
          )}

          {isEv && task.offers && task.offers.length > 0 && task.status === 'open' && (
            <View style={{marginTop: 20}}>
              <Text style={s.offersT}>Teklifler ({task.offers.length})</Text>
              {task.offers.map(offer => (
                <View key={offer.id} style={s.offerCard}>
                  <View style={s.offerTop}>
                    <View style={s.userRow}><Text style={{fontSize:28}}>👨‍🔧</Text><View><Text style={s.userName}>{offer.fixer?.name}</Text><Text style={s.userSub}>⭐ {offer.fixer?.avg_rating}</Text></View></View>
                    <View style={{alignItems:'flex-end'}}><Text style={s.offerPrice}>{offer.price}₺</Text><Text style={s.userSub}>{offer.eta_minutes} dk</Text></View>
                  </View>
                  {offer.note && <Text style={s.offerNote}>"{offer.note}"</Text>}
                  {offer.status === 'pending' && (
                    <TouchableOpacity style={s.acceptBtn} onPress={() => handleAccept(offer)}>
                      <Text style={s.acceptBtnT}>✅ Bu Ustayı Seç</Text>
                    </TouchableOpacity>
                  )}
                  {offer.status === 'accepted' && <View style={s.acceptedBadge}><Text style={{color:Colors.green,fontFamily:Fonts.bold}}>✅ Kabul Edildi</Text></View>}
                </View>
              ))}
            </View>
          )}
        </View>
      </ScrollView>

      {role === 'fixer' && task.status === 'open' && (
        <View style={s.footer}>
          {myOffer ? (
            <View style={s.alreadyBadge}><Text style={s.alreadyT}>✅ Teklif verildi — {myOffer.price}₺</Text></View>
          ) : (
            <TouchableOpacity style={s.offerBtn} onPress={() => setOfferModal(true)}>
              <Text style={s.offerBtnT}>💰 Teklif Ver</Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      <Modal visible={offerModal} transparent animationType="slide">
        <View style={s.modalOv}>
          <View style={s.modal}>
            <Text style={s.modalT}>Teklif Ver</Text>
            <Text style={s.modalSub}>{task.title}</Text>
            <Text style={s.label}>Fiyatın (₺)</Text>
            <TextInput style={s.input} placeholder="200" keyboardType="numeric" value={offerPrice} onChangeText={setOfferPrice} />
            <Text style={s.label}>Kaç dakikada gelirsin?</Text>
            <TextInput style={s.input} placeholder="30" keyboardType="numeric" value={offerEta} onChangeText={setOfferEta} />
            <Text style={s.label}>Not (opsiyonel)</Text>
            <TextInput style={[s.input,{height:80,textAlignVertical:'top'}]} placeholder="Deneyimini anlat..." value={offerNote} onChangeText={setOfferNote} multiline />
            <View style={s.modalBtns}>
              <TouchableOpacity style={s.cancelBtn} onPress={() => setOfferModal(false)}><Text style={s.cancelBtnT}>İptal</Text></TouchableOpacity>
              <TouchableOpacity style={s.sendBtn} onPress={sendOffer} disabled={submitting}>
                {submitting ? <ActivityIndicator color="white" /> : <Text style={s.sendBtnT}>Gönder →</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

function stLabel(v: string) { return ({open:'Açık',active:'Devam Ediyor',done:'Tamamlandı',cancelled:'İptal'} as any)[v] || v; }
function stBg(v: string) { return ({open:{backgroundColor:Colors.blueMid},active:{backgroundColor:Colors.greenLt},done:{backgroundColor:Colors.border},cancelled:{backgroundColor:Colors.redLt}} as any)[v] || {}; }
function stColor(v: string) { return ({open:{color:Colors.blue},active:{color:Colors.green},done:{color:Colors.ink3},cancelled:{color:Colors.red}} as any)[v] || {}; }

const s = StyleSheet.create({
  container:{flex:1,backgroundColor:Colors.white},
  center:{flex:1,alignItems:'center',justifyContent:'center'},
  header:{flexDirection:'row',alignItems:'center',paddingHorizontal:20,paddingVertical:14,borderBottomWidth:1,borderColor:Colors.border,gap:12},
  back:{width:40,height:40,alignItems:'center',justifyContent:'center'},
  backT:{fontSize:22,color:Colors.ink},
  headerT:{flex:1,fontSize:16,fontFamily:Fonts.extrabold,color:Colors.ink},
  chatBtn:{width:40,height:40,backgroundColor:Colors.blueLt,borderRadius:12,alignItems:'center',justifyContent:'center'},
  photo:{width:200,height:140,borderRadius:14,marginRight:10},
  body:{padding:20},
  badges:{flexDirection:'row',gap:8,marginBottom:12},
  urgBadge:{backgroundColor:Colors.redLt,borderRadius:8,paddingHorizontal:10,paddingVertical:4},
  urgT:{fontSize:11,fontFamily:Fonts.extrabold,color:Colors.red},
  statusBadge:{borderRadius:8,paddingHorizontal:10,paddingVertical:4},
  statusT:{fontSize:11,fontFamily:Fonts.bold},
  title:{fontSize:22,fontFamily:Fonts.black,color:Colors.ink,letterSpacing:-0.5,marginBottom:10,lineHeight:28},
  desc:{fontSize:14,color:Colors.ink2,lineHeight:22,marginBottom:16},
  meta:{backgroundColor:Colors.off,borderRadius:14,padding:14,gap:10,marginBottom:20},
  metaRow:{flexDirection:'row',alignItems:'center',gap:10},
  metaT:{fontSize:14,color:Colors.ink2,fontFamily:Fonts.semibold},
  userCard:{borderWidth:1,borderColor:Colors.border,borderRadius:14,padding:14,marginBottom:14},
  userCardL:{fontSize:10,fontFamily:Fonts.extrabold,color:Colors.ink4,textTransform:'uppercase',letterSpacing:1,marginBottom:10},
  userRow:{flexDirection:'row',alignItems:'center',gap:12},
  userAv:{fontSize:36},
  userName:{fontSize:15,fontFamily:Fonts.extrabold,color:Colors.ink},
  userSub:{fontSize:12,color:Colors.ink3,marginTop:2},
  trkBtn:{backgroundColor:Colors.green,borderRadius:10,paddingHorizontal:14,paddingVertical:8,marginLeft:'auto'},
  trkBtnT:{fontSize:12,fontFamily:Fonts.bold,color:Colors.white},
  qrBtn:{borderWidth:2,borderColor:Colors.blue,borderRadius:20,padding:18,alignItems:'center',gap:4,marginTop:16},
  qrIc:{fontSize:36,marginBottom:4},
  qrT:{fontSize:16,fontFamily:Fonts.extrabold,color:Colors.ink},
  qrS:{fontSize:12,color:Colors.ink3},
  offersT:{fontSize:16,fontFamily:Fonts.extrabold,color:Colors.ink,marginBottom:12},
  offerCard:{borderWidth:1,borderColor:Colors.border,borderRadius:14,padding:14,marginBottom:10},
  offerTop:{flexDirection:'row',justifyContent:'space-between',alignItems:'center',marginBottom:10},
  offerPrice:{fontSize:20,fontFamily:Fonts.black,color:Colors.green},
  offerNote:{fontSize:13,color:Colors.ink2,fontStyle:'italic',marginBottom:12},
  acceptBtn:{backgroundColor:Colors.blue,borderRadius:12,padding:12,alignItems:'center'},
  acceptBtnT:{fontSize:14,fontFamily:Fonts.extrabold,color:Colors.white},
  acceptedBadge:{backgroundColor:Colors.greenLt,borderRadius:12,padding:10,alignItems:'center'},
  footer:{padding:20,borderTopWidth:1,borderColor:Colors.border},
  offerBtn:{backgroundColor:Colors.orange,borderRadius:20,padding:18,alignItems:'center',...Shadow.lg},
  offerBtnT:{fontSize:17,fontFamily:Fonts.black,color:Colors.white},
  alreadyBadge:{backgroundColor:Colors.greenLt,borderRadius:20,padding:18,alignItems:'center'},
  alreadyT:{fontSize:15,fontFamily:Fonts.bold,color:Colors.green},
  modalOv:{flex:1,backgroundColor:'rgba(0,0,0,0.5)',justifyContent:'flex-end'},
  modal:{backgroundColor:Colors.white,borderTopLeftRadius:24,borderTopRightRadius:24,padding:28,paddingBottom:40},
  modalT:{fontSize:20,fontFamily:Fonts.black,color:Colors.ink,marginBottom:4},
  modalSub:{fontSize:13,color:Colors.ink3,marginBottom:20},
  label:{fontSize:11,fontFamily:Fonts.extrabold,color:Colors.ink3,textTransform:'uppercase',letterSpacing:1,marginBottom:8,marginTop:14},
  input:{backgroundColor:Colors.off,borderWidth:1.5,borderColor:Colors.border,borderRadius:12,padding:14,fontSize:15,fontFamily:Fonts.semibold,color:Colors.ink},
  modalBtns:{flexDirection:'row',gap:10,marginTop:20},
  cancelBtn:{flex:1,borderWidth:1.5,borderColor:Colors.border,borderRadius:14,padding:15,alignItems:'center'},
  cancelBtnT:{fontSize:15,fontFamily:Fonts.bold,color:Colors.ink3},
  sendBtn:{flex:2,backgroundColor:Colors.blue,borderRadius:14,padding:15,alignItems:'center',...Shadow.md},
  sendBtnT:{fontSize:15,fontFamily:Fonts.extrabold,color:Colors.white},
});
