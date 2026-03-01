import React, { useEffect, useState } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useAuthStore } from '@/lib/store';
import { supabase } from '@/lib/supabase';

export default function RootLayout() {
  const { setUser, setRole } = useAuthStore();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    initAuth();
  }, []);

  const initAuth = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        const { data: profile } = await supabase
          .from('users').select('*').eq('id', session.user.id).single();
        if (profile) {
          setUser(profile);
          setRole(profile.role);
        }
      }
    } catch (e) {}
    setReady(true);
  };

  if (!ready) return null;

  return (
    <>
      <StatusBar style="dark" />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="onboarding" />
        <Stack.Screen name="role-select" />
        <Stack.Screen name="login" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="new-task" options={{ presentation: 'modal' }} />
        <Stack.Screen name="task/[id]" />
        <Stack.Screen name="tracking" />
        <Stack.Screen name="qr-show" options={{ presentation: 'modal' }} />
        <Stack.Screen name="qr-scan" options={{ presentation: 'fullScreenModal' }} />
        <Stack.Screen name="chat" />
      </Stack>
    </>
  );
}
