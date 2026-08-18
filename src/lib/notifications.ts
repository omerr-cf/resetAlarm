import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

/**
 * IMPORTANT — read this before treating this as a "real" alarm:
 *
 * This uses expo-notifications, which schedules a standard local notification.
 * That is enough to validate the product idea (does the breathing-task loop
 * feel good, is it shareable) but it is NOT a reliable "alarm that rings
 * through silent mode / Do Not Disturb and keeps sounding until dismissed."
 *
 * For a real alarm-clock-grade experience you will eventually need:
 *  - iOS: Apple's AlarmKit framework (iOS 26+), which is built specifically
 *    for this (critical alerts, ignores the silent switch, custom UI on the
 *    lock screen). This requires native/Swift work beyond Expo's managed
 *    JS APIs — plan for an Expo config plugin or a dev client build.
 *  - Android: AlarmManager + a foreground service with a full-screen intent
 *    (the same mechanism Alarmy/Google Clock use), also native work.
 *
 * Treat everything in this file as the "reminder" layer for prototype
 * testing, not the final alarm engine.
 */

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

const ANDROID_CHANNEL_ID = 'reset-reminders';

/**
 * Android 8+ silently drops notifications that aren't posted to a channel.
 * This is a common reason "nothing happens" when testing on Android —
 * call this once at app startup (done in App.tsx).
 */
export async function ensureAndroidChannel(): Promise<void> {
  if (Platform.OS !== 'android') return;
  await Notifications.setNotificationChannelAsync(ANDROID_CHANNEL_ID, {
    name: 'Daily reset reminders',
    importance: Notifications.AndroidImportance.HIGH,
    sound: 'default',
    vibrationPattern: [0, 250, 250, 250],
  });
}

export async function ensureNotificationPermission(): Promise<boolean> {
  const current = await Notifications.getPermissionsAsync();
  if (current.granted) return true;

  const requested = await Notifications.requestPermissionsAsync();
  return requested.granted;
}

/**
 * Schedules a daily reminder at the given hour/minute that deep-links
 * into the breathing-reset flow when tapped (handled in App.tsx via
 * addNotificationResponseReceivedListener).
 *
 * If that hour/minute has already passed today, iOS/Android will
 * correctly schedule it for tomorrow instead — this is expected, not a
 * bug. Use `describeNextFire` below to show the user exactly when that is,
 * and `sendTestNotification` to verify permissions/delivery without
 * waiting for the real scheduled time.
 */
export async function scheduleDailyReset(hour: number, minute: number): Promise<string> {
  await cancelDailyReset();

  const id = await Notifications.scheduleNotificationAsync({
    content: {
      title: 'Time for your 90-second reset',
      body: 'Your nervous system doesn’t know the difference between a deadline and a tiger. Let’s reset.',
      data: { screen: 'breathing' },
      sound: Platform.OS === 'ios' ? 'default' : undefined,
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DAILY,
      hour,
      minute,
      channelId: ANDROID_CHANNEL_ID,
    },
  });

  return id;
}

export async function cancelDailyReset(): Promise<void> {
  await Notifications.cancelAllScheduledNotificationsAsync();
}

/**
 * Fires a one-off notification a few seconds from now, bypassing the
 * hour/minute schedule entirely. Use this to sanity-check that permissions
 * are granted and delivery actually works on this device, instead of
 * waiting up to 24 hours for a real daily reminder to land.
 */
export async function sendTestNotification(secondsFromNow: number = 10): Promise<void> {
  await Notifications.scheduleNotificationAsync({
    content: {
      title: 'Test notification',
      body: 'If you can see this, reminders are working on this device 🎉',
      data: { screen: 'breathing' },
      sound: Platform.OS === 'ios' ? 'default' : undefined,
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
      seconds: secondsFromNow,
      repeats: false,
      channelId: ANDROID_CHANNEL_ID,
    },
  });
}

/**
 * Human-readable description of when the next daily reset notification
 * will actually fire, given the current time — so the UI never leaves the
 * user guessing ("today at 07:30" vs "tomorrow at 07:30").
 */
export function describeNextFire(hour: number, minute: number): string {
  const now = new Date();
  const target = new Date();
  target.setHours(hour, minute, 0, 0);

  const isToday = target.getTime() > now.getTime();
  const timeLabel = `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
  return isToday ? `Today at ${timeLabel}` : `Tomorrow at ${timeLabel}`;
}
