import {
  Home,
  Car,
  Scissors,
  GraduationCap,
  Dog,
  MonitorSmartphone,
  Building,
  type LucideIcon,
} from 'lucide-react'

export interface ServiceCategory {
  id: string
  name: string
  icon: LucideIcon
  emoji: string
  sub: string[]
}

export const SERVICE_CATEGORIES: ServiceCategory[] = [
  {
    id: 'ev_yasam',
    name: 'Ev & Yaşam',
    icon: Home,
    emoji: '🏠',
    sub: ['Tesisat & Elektrik', 'Boya & Tadilat', 'Temizlik', 'Montaj', 'Nakliyat'],
  },
  {
    id: 'arac_yol',
    name: 'Araç & Yol Yardım',
    icon: Car,
    emoji: '🚗',
    sub: ['Çekici & Kurtarıcı', 'Mobil Lastikçi', 'Mobil Oto Yıkama', 'Akü Takviye'],
  },
  {
    id: 'guzellik',
    name: 'Güzellik & Bakım',
    icon: Scissors,
    emoji: '💇',
    sub: ['Eve Gelen Kuaför', 'Makyaj', 'Manikür & Pedikür'],
  },
  {
    id: 'egitim',
    name: 'Eğitim & Özel Ders',
    icon: GraduationCap,
    emoji: '🎓',
    sub: ['Akademik Dersler', 'Yabancı Dil', 'Direksiyon Dersi'],
  },
  {
    id: 'evcil_hayvan',
    name: 'Evcil Hayvan',
    icon: Dog,
    emoji: '🐕',
    sub: ['Köpek Gezdirici', 'Pet Kuaför', 'Evcil Hayvan Bakıcısı'],
  },
  {
    id: 'teknoloji',
    name: 'Teknoloji & Dijital',
    icon: MonitorSmartphone,
    emoji: '📱',
    sub: ['Bilgisayar Tamiri', 'Telefon Tamiri', 'Akıllı Ev Sistemleri'],
  },
  {
    id: 'kurumsal',
    name: 'Kurumsal Hizmetler',
    icon: Building,
    emoji: '🏢',
    sub: ['Profesyonel İlaçlama', 'Endüstriyel Temizlik', 'Personel Tedariği'],
  },
]

export const getCategoryById = (id: string) =>
  SERVICE_CATEGORIES.find((c) => c.id === id)

export const getSubServicesByCategoryId = (id: string) =>
  SERVICE_CATEGORIES.find((c) => c.id === id)?.sub || []

export const getAllSubServices = () =>
  SERVICE_CATEGORIES.flatMap((c) => c.sub.map((s) => ({ category: c.id, categoryName: c.name, service: s })))
