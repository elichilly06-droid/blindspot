// ─── lib/notifications.ts ────────────────────────────────────────────────────
import * as Notifications from 'expo-notifications'
import * as Device from 'expo-device'
import { supabase } from './supabase'

export async function registerPushToken(userId: string) {
  if (!Device.isDevice) return
  const { status } = await Notifications.requestPermissionsAsync()
  if (status !== 'granted') return

  const token = (await Notifications.getExpoPushTokenAsync()).data
  await supabase.from('profiles').update({ push_token: token }).eq('id', userId)
  return token
}

// Call from your backend (Supabase Edge Function) to push a notification:
// POST https://exp.host/--/api/v2/push/send
// { to: pushToken, title: "New match!", body: "Someone liked you back 💘" }
