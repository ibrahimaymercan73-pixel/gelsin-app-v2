import { useEffect } from 'react';
import { useRouter } from 'expo-router';
import { useAuthStore } from '@/lib/store';
import { supabase } from '@/lib/supabase';

export default function Index() {
  const router = useRouter();
  const { user, role } = useAuthStore();

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    const { data: { session } } = await supabase.auth.getSession();

    if (!session) {
      // İlk defa mı? Onboarding göster
      router.replace('/onboarding');
      return;
    }

    if (!role) {
      router.replace('/role-select');
      return;
    }

    router.replace('/(tabs)');
  };

  return null;
}
