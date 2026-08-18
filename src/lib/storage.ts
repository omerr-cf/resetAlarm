import AsyncStorage from '@react-native-async-storage/async-storage';

const STREAK_KEY = 'reset_alarm.streak';
const LAST_COMPLETED_KEY = 'reset_alarm.last_completed_date';
const HISTORY_KEY = 'reset_alarm.history_dates'; // JSON array of "YYYY-MM-DD", most recent last
const REMINDER_KEY = 'reset_alarm.reminder_settings'; // JSON: ReminderSettings

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
