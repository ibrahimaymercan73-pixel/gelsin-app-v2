import { supabase } from './supabase';
import { Task, Offer, Review, TaskCategory, Coordinate } from '@/types';
import { RADAR_RADIUS_METERS, PLATFORM_COMMISSION } from '@/constants';

// ══════════════════════════════════════
// TASK QUERIES
// ══════════════════════════════════════

// Yakındaki açık işleri getir (Usta için)
export async function getNearbyTasks(
  userLocation: Coordinate,
  category?: TaskCategory
) {
  // PostGIS ST_DWithin kullanıyoruz
  // Supabase RPC (stored procedure) ile çağırıyoruz
  const { data, error } = await supabase.rpc('get_nearby_tasks', {
    user_lat: userLocation.latitude,
    user_lng: userLocation.longitude,
    radius_meters: RADAR_RADIUS_METERS,
    category_filter: category || null,
  });

  if (error) throw error;
  return data as Task[];
}

// Ev sahibinin kendi taleplerini getir
export async function getMyTasks(customerId: string) {
  const { data, error } = await supabase
    .from('tasks')
    .select(`
      *,
      fixer:users!fixer_id(*),
      offers(*, fixer:users!fixer_id(*))
    `)
    .eq('customer_id', customerId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data as Task[];
}

// Yeni iş talebi oluştur (Ev Sahibi)
export async function createTask(payload: {
  title: string;
  description: string;
  category: TaskCategory;
  location: Coordinate;
  address: string;
  is_urgent: boolean;
  photo_urls: string[];
  customer_id: string;
}) {
  const qr_token = `TX-${Date.now()}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;

  const { data, error } = await supabase
    .from('tasks')
    .insert({
      ...payload,
      status: 'open',
      qr_token,
      // PostGIS point formatı
      location: `POINT(${payload.location.longitude} ${payload.location.latitude})`,
    })
    .select()
    .single();

  if (error) throw error;
  return data as Task;
}

// İş durumunu güncelle
export async function updateTaskStatus(
  taskId: string,
  status: Task['status'],
  extras?: { fixer_id?: string; checkin_at?: string; checkout_at?: string; price?: number }
) {
  const { data, error } = await supabase
    .from('tasks')
    .update({ status, ...extras })
    .eq('id', taskId)
    .select()
    .single();

  if (error) throw error;
  return data as Task;
}

// ══════════════════════════════════════
// OFFER QUERIES
// ══════════════════════════════════════

// Teklif ver (Usta)
export async function createOffer(payload: {
  task_id: string;
  fixer_id: string;
  price: number;
  eta_minutes: number;
  note?: string;
}) {
  const { data, error } = await supabase
    .from('offers')
    .insert({ ...payload, status: 'pending' })
    .select()
    .single();

  if (error) throw error;
  return data as Offer;
}

// Teklif kabul et (Ev Sahibi)
export async function acceptOffer(offerId: string, taskId: string, fixerId: string, price: number) {
  // 1. Teklifi kabul et
  await supabase.from('offers').update({ status: 'accepted' }).eq('id', offerId);

  // 2. Diğer teklifleri reddet
  await supabase
    .from('offers')
    .update({ status: 'rejected' })
    .eq('task_id', taskId)
    .neq('id', offerId);

  // 3. İşi aktif yap ve fixer ata
  return updateTaskStatus(taskId, 'active', { fixer_id: fixerId, price });
}

// ══════════════════════════════════════
// QR QUERIES
// ══════════════════════════════════════

// QR Check-in (Usta kapıya geldi)
export async function qrCheckIn(taskId: string, qrToken: string) {
  // Token doğrula
  const { data: task } = await supabase
    .from('tasks')
    .select('qr_token, status')
    .eq('id', taskId)
    .single();

  if (!task || task.qr_token !== qrToken) throw new Error('Geçersiz QR kodu');
  if (task.status !== 'active') throw new Error('İş aktif değil');

  return updateTaskStatus(taskId, 'active', {
    checkin_at: new Date().toISOString(),
  });
}

// QR Check-out (İş bitti, ödeme tetikle)
export async function qrCheckOut(taskId: string, qrToken: string) {
  const { data: task } = await supabase
    .from('tasks')
    .select('qr_token, status, price, customer_id, fixer_id')
    .eq('id', taskId)
    .single();

  if (!task || task.qr_token !== qrToken) throw new Error('Geçersiz QR kodu');
  if (!task.checkin_at) throw new Error('Önce check-in yapılmalı');

  // İşi bitir
  await updateTaskStatus(taskId, 'done', {
    checkout_at: new Date().toISOString(),
  });

  // Escrow release — Supabase Edge Function tetiklenir
  await supabase.functions.invoke('release-escrow', {
    body: {
      task_id: taskId,
      fixer_id: task.fixer_id,
      amount: task.price,
      commission: task.price * PLATFORM_COMMISSION,
    },
  });

  return true;
}

// ══════════════════════════════════════
// PHOTO UPLOAD
// ══════════════════════════════════════

export async function uploadTaskPhoto(
  localUri: string,
  taskId: string
): Promise<string> {
  const filename = `tasks/${taskId}/${Date.now()}.jpg`;

  const response = await fetch(localUri);
  const blob = await response.blob();

  const { error } = await supabase.storage
    .from('task-photos')
    .upload(filename, blob, { contentType: 'image/jpeg' });

  if (error) throw error;

  const { data } = supabase.storage.from('task-photos').getPublicUrl(filename);
  return data.publicUrl;
}

// ══════════════════════════════════════
// REVIEW
// ══════════════════════════════════════

export async function createReview(payload: {
  task_id: string;
  fixer_id: string;
  customer_id: string;
  rating: number;
  comment: string;
}) {
  const { data, error } = await supabase
    .from('reviews')
    .insert(payload)
    .select()
    .single();

  if (error) throw error;
  return data as Review;
}
