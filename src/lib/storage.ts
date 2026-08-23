import AsyncStorage from '@react-native-async-storage/async-storage';
import { CompanionStyleId, COMPANION_OPTIONS } from './companions';

const STREAK_KEY = 'reset_alarm.streak';
const LAST_COMPLETED_KEY = 'reset_alarm.last_completed_date';
const HISTORY_KEY = 'reset_alarm.history_dates'; // JSON array of "YYYY-MM-DD", most recent last
const REMINDER_KEY = 'reset_alarm.reminder_settings'; // JSON: ReminderSettings
const COMPANION_KEY = 'reset_alarm.companion_style'; // a CompanionStyleId string
const ONBOARDING_SEEN_KEY = 'reset_alarm.onboarding_seen';

// Simple local usage counters — see incrementUsageStat() below.
const STAT_SESSIONS_STARTED_KEY = 'reset_alarm.stat_sessions_started';
const STAT_SESSIONS_COMPLETED_KEY = 'reset_alarm.stat_sessions_completed';
const STAT_SESSIONS_EXITED_EARLY_KEY = 'reset_alarm.stat_sessions_exited_early';
const STAT_SHARE_TAPPED_KEY = 'reset_alarm.stat_share_tapped';

const HISTORY_DAYS_TO_KEEP = 30;

function todayString(): string {
  return new Date().toISOString().slice(0, 10); // YYYY-MM-DD
}

function dateStringDaysAgo(daysAgo: number): string {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  return d.toISOString().slice(0, 10);
}

function yesterdayString(): string {
  return dateStringDaysAgo(1);
}

export async function getStreak(): Promise<number> {
  const raw = await AsyncStorage.getItem(STREAK_KEY);
  return raw ? parseInt(raw, 10) : 0;
}

async function getHistorySet(): Promise<Set<string>> {
  const raw = await AsyncStorage.getItem(HISTORY_KEY);
  if (!raw) return new Set();
  try {
    const arr: string[] = JSON.parse(raw);
    return new Set(arr);
  } catch {
    return new Set();
  }
}

/**
 * Call this when a breathing-reset session completes.
 * Increments the streak once per calendar day, resets it if a day was missed.
 * Also records today into the rolling history used for the "last 7 days" dots.
 * Returns the new streak count.
 */
export async function recordCompletion(): Promise<number> {
  const today = todayString();
  const lastCompleted = await AsyncStorage.getItem(LAST_COMPLETED_KEY);
  let streak = await getStreak();

  if (lastCompleted !== today) {
    if (lastCompleted === yesterdayString()) {
      streak += 1;
    } else {
      streak = 1; // missed a day (or first ever session) — restart streak
    }
    await AsyncStorage.setItem(STREAK_KEY, String(streak));
    await AsyncStorage.setItem(LAST_COMPLETED_KEY, today);
  }

  const history = await getHistorySet();
  history.add(today);
  const cutoff = dateStringDaysAgo(HISTORY_DAYS_TO_KEEP);
  const pruned = Array.from(history).filter((d) => d >= cutoff);
  await AsyncStorage.setItem(HISTORY_KEY, JSON.stringify(pruned));

  return streak;
}

/**
 * Returns the last `days` calendar days (oldest first, today last) with whether
 * a reset was completed on each — used for the simple dot-row progress tracker.
 */
export async function getRecentCompletionDays(
  days: number = 7
): Promise<{ date: string; completed: boolean; isToday: boolean }[]> {
  const history = await getHistorySet();
  const today = todayString();
  const result: { date: string; completed: boolean; isToday: boolean }[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const date = dateStringDaysAgo(i);
    result.push({ date, completed: history.has(date), isToday: date === today });
  }
  return result;
}

export type ReminderSettings = {
  enabled: boolean;
  hour: number;
  minute: number;
};

/**
 * Whether a daily reminder is currently on, and at what time — persisted so the
 * Home screen can show "reminder is on" correctly even after the app was fully
 * closed and reopened. Without this, the UI had no memory of what was actually
 * scheduled on the OS side, which is exactly why it felt like nothing "stuck."
 */
export async function getReminderSettings(): Promise<ReminderSettings | null> {
  const raw = await AsyncStorage.getItem(REMINDER_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as ReminderSettings;
  } catch {
    return null;
  }
}

export async function saveReminderSettings(settings: ReminderSettings): Promise<void> {
  await AsyncStorage.setItem(REMINDER_KEY, JSON.stringify(settings));
}

/**
 * Which breathing companion (one of the Lottie candidates) the user picked
 * in the swipeable CompanionPicker. Defaults to 'flower' (the one that
 * tested best) when nothing has been chosen yet, or if a previously-saved
 * id no longer matches a known option (e.g. the old 'custom' SVG face,
 * since retired).
 */
export async function getCompanionStyle(): Promise<CompanionStyleId> {
  const raw = await AsyncStorage.getItem(COMPANION_KEY);
  const isValid = raw && COMPANION_OPTIONS.some((o) => o.id === raw);
  return isValid ? (raw as CompanionStyleId) : 'flower';
}

export async function saveCompanionStyle(id: CompanionStyleId): Promise<void> {
  await AsyncStorage.setItem(COMPANION_KEY, id);
}

/**
 * Whether the one-time "meet your companion" intro screen has already been
 * shown on this device. Kept intentionally separate from onboarding *logic*
 * (App.tsx) — this file only stores the flag.
 */
export async function getHasSeenOnboarding(): Promise<boolean> {
  const raw = await AsyncStorage.getItem(ONBOARDING_SEEN_KEY);
  return raw === '1';
}

export async function setHasSeenOnboarding(): Promise<void> {
  await AsyncStorage.setItem(ONBOARDING_SEEN_KEY, '1');
}

/**
 * Lightweight local usage counters, tracking the exact success metrics
 * defined in the original MVP plan (≥70% completion, ≥30% share-tap) so
 * they can be checked directly on-device instead of only inferred from
 * conversation with testers. This is intentionally NOT a remote analytics
 * pipeline — there's no backend — each device only ever sees its own
 * counts. Good enough for self-testing and for asking a handful of testers
 * to read their own numbers back to you (see getUsageStats + the hidden
 * long-press debug view on the Home screen eyebrow).
 */
export type UsageStatKey = 'sessionsStarted' | 'sessionsCompleted' | 'sessionsExitedEarly' | 'shareTapped';

const STAT_KEYS: Record<UsageStatKey, string> = {
  sessionsStarted: STAT_SESSIONS_STARTED_KEY,
  sessionsCompleted: STAT_SESSIONS_COMPLETED_KEY,
  sessionsExitedEarly: STAT_SESSIONS_EXITED_EARLY_KEY,
  shareTapped: STAT_SHARE_TAPPED_KEY,
};

export async function incrementUsageStat(stat: UsageStatKey): Promise<void> {
  const key = STAT_KEYS[stat];
  const raw = await AsyncStorage.getItem(key);
  const next = (raw ? parseInt(raw, 10) : 0) + 1;
  await AsyncStorage.setItem(key, String(next));
}

export async function getUsageStats(): Promise<Record<UsageStatKey, number>> {
  const entries = await Promise.all(
    (Object.keys(STAT_KEYS) as UsageStatKey[]).map(async (stat) => {
      const raw = await AsyncStorage.getItem(STAT_KEYS[stat]);
      return [stat, raw ? parseInt(raw, 10) : 0] as const;
    })
  );
  return Object.fromEntries(entries) as Record<UsageStatKey, number>;
}
