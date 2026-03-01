export type UserRole = 'ev_sahibi' | 'fixer';
export type TaskStatus = 'open' | 'active' | 'done' | 'cancelled';
export type TaskCategory = 'tesisat' | 'elektrik' | 'boya' | 'montaj' | 'marangoz' | 'temizlik' | 'diger';
export type OfferStatus = 'pending' | 'accepted' | 'rejected';

export const CATEGORIES: Record<TaskCategory, { label: string; emoji: string }> = {
  tesisat:  { label: 'Tesisat',   emoji: '🔧' },
  elektrik: { label: 'Elektrik',  emoji: '⚡' },
  boya:     { label: 'Boya',      emoji: '🎨' },
  montaj:   { label: 'Montaj',    emoji: '🛠' },
  marangoz: { label: 'Marangoz',  emoji: '🪚' },
  temizlik: { label: 'Temizlik',  emoji: '🧹' },
  diger:    { label: 'Diğer',     emoji: '📦' },
};

export interface User {
  id: string; phone: string; name: string; role: UserRole;
  avatar_url?: string; location?: { latitude: number; longitude: number };
  skills?: string[]; avg_rating: number; total_jobs: number;
  is_verified: boolean; is_online: boolean; created_at: string;
}

export interface Task {
  id: string; title: string; description?: string;
  category: TaskCategory; status: TaskStatus; is_urgent: boolean;
  location: { latitude: number; longitude: number };
  address?: string; photo_urls: string[]; price?: number;
  qr_token: string; checkin_at?: string; checkout_at?: string;
  customer_id: string; fixer_id?: string;
  customer?: User; fixer?: User; offers?: Offer[]; created_at: string;
}

export interface Offer {
  id: string; task_id: string; fixer_id: string;
  price: number; eta_minutes: number; note?: string;
  status: OfferStatus; fixer?: User; created_at: string;
}

export interface Message {
  id: string; task_id: string; sender_id: string;
  receiver_id: string; body: string; read: boolean; created_at: string;
}

export interface Review {
  id: string; task_id: string; reviewer_id: string;
  fixer_id: string; rating: 1|2|3|4|5; comment?: string; created_at: string;
}

export interface Wallet {
  id: string; user_id: string; balance: number;
  escrow_held: number; total_earned: number;
}

export interface Coordinate {
  latitude: number;
  longitude: number;
}
