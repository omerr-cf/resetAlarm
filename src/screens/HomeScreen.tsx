import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, StyleSheet, Pressable, Alert, Platform } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as Haptics from 'expo-haptics';
import { colors, spacing, radius } from '../theme';
import {
  getStreak,
  getRecentCompletionDays,
  getReminderSettings,
  saveReminderSettings,
  ReminderSettings,
} from '../lib/storage';
import {
  ensureNotificationPermission,
  scheduleDailyReset,
  cancelDailyReset,
  sendTestNotification,
  describeNextFire,
} from '../lib/notifications';

type Props = {
  onStartReset: () => void;
};

// Quick presets for common "reset moments" — this is a tool for any point in
// the day, not just waking up, so the reminder section offers a few common
// anchors rather than only a wake-up time.
const PRESETS: { label: string; hour: number; minute: number }[] = [
  { label: 'Morning', hour: 7, minute: 30 },
  { label: 'Midday slump', hour: 13, minute: 0 },
  { label: 'Wind-down', hour: 20, minute: 0 },
];

function timeFor(hour: number, minute: number): Date {
  const d = new Date();
  d.setHours(hour, minute, 0, 0);
  return d;
}

export default function HomeScreen({ onStartReset }: Props) {
  const [streak, setStreak] = useState(0);
  const [recentDays, setRecentDays] = useState<{ date: string; completed: boolean; isToday: boolean }[]>([]);
  const [time, setTime] = useState<Date>(() => timeFor(7, 30));
  // The reminder as it actually exists right now (persisted + scheduled) —
  // separate from `time`, which is just what's currently selected in the
  // picker. Comparing the two is what lets us show "you have unsaved
  // changes" instead of leaving the user guessing whether a time they
  // scrolled to is actually in effect.
  const [savedReminder, setSavedReminder] = useState<ReminderSettings | null>(null);
  const [showAndroidPicker, setShowAndroidPicker] = useState(false);
  const [busy, setBusy] = useState(false);

  const refresh = useCallback(() => {
    getStreak().then(setStreak);
    getRecentCompletionDays(7).then(setRecentDays);
  }, []);

  useEffect(() => {
    refresh();
    getReminderSettings().then((settings) => {
      if (settings) {
        setSavedReminder(settings);
        if (settings.enabled) setTime(timeFor(settings.hour, settings.minute));
      }
    });
  }, [refresh]);

  function applyPreset(preset: { hour: number; minute: number }) {
    setTime(timeFor(preset.hour, preset.minute));
  }

  const hasUnsavedChange =
    !!savedReminder?.enabled &&
    (savedReminder.hour !== time.getHours() || savedReminder.minute !== time.getMinutes());
  const isSaved = !!savedReminder?.enabled && !hasUnsavedChange;

  async function handleSaveReminder() {
    setBusy(true);
    try {
      const granted = await ensureNotificationPermission();
      if (!granted) {
        Alert.alert(
          'Notifications are off',
          'Turn on notifications in Settings so your daily reset can reach you.'
        );
        return;
      }
      const hour = time.getHours();
      const minute = time.getMinutes();
      await scheduleDailyReset(hour, minute);
      const settings: ReminderSettings = { enabled: true, hour, minute };
      await saveReminderSettings(settings);
      setSavedReminder(settings);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      Alert.alert('Reminder saved ✓', `We'll remind you ${describeNextFire(hour, minute)}.`);
    } finally {
      setBusy(false);
    }
  }

  async function handleCancelAlarm() {
    setBusy(true);
    try {
      await cancelDailyReset();
      const settings: ReminderSettings = { enabled: false, hour: time.getHours(), minute: time.getMinutes() };
      await saveReminderSettings(settings);
      setSavedReminder(settings);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
      Alert.alert('Reminder turned off', "You won't get a daily notification until you save one again.");
    } finally {
      setBusy(false);
    }
  }

  async function handleTestNotification() {
    const granted = await ensureNotificationPermission();
    if (!granted) {
      Alert.alert('Notifications are off', 'Turn on notifications in Settings, then try again.');
      return;
    }
    await sendTestNotification(10);
    Alert.alert(
      'Test scheduled',
      'A test notification will arrive in about 10 seconds — you can lock your phone and wait.'
    );
  }

  const nextFireLabel = describeNextFire(time.getHours(), time.getMinutes());

  return (
    <View style={styles.container}>
      <Text style={styles.eyebrow}>90-SECOND RESET</Text>
      <Text style={styles.title}>
        Your nervous system doesn't know{'\n'}a deadline from a tiger.
      </Text>

      {streak > 0 && (
        <View style={styles.streakPill}>
          <Text style={styles.streakText}>🔥 {streak} day streak</Text>
        </View>
      )}

      <View style={styles.historyRow}>
        {recentDays.map((day) => (
          <View
            key={day.date}
            style={[
              styles.historyDot,
              day.completed && styles.historyDotFilled,
              day.isToday && styles.historyDotToday,
            ]}
          />
        ))}
      </View>

      <Pressable style={styles.primaryBtn} onPress={onStartReset}>
        <Text style={styles.primaryBtnText}>Reset now</Text>
      </Pressable>
      <Text style={styles.primaryBtnCaption}>Works any time of day — not just mornings.</Text>

      <View style={styles.divider} />

      <Text style={styles.sectionLabel}>Reminder — a gentle notification (not a loud alarm yet)</Text>

      {/* Always-visible status — this is the single source of truth for "is
          something actually scheduled right now," independent of whatever
          time happens to be selected in the picker below. */}
      <View style={[styles.statusPill, isSaved ? styles.statusPillOn : styles.statusPillOff]}>
        <Text style={[styles.statusPillText, isSaved ? styles.statusPillTextOn : styles.statusPillTextOff]}>
          {isSaved
            ? `✓ Reminder on — ${describeNextFire(savedReminder!.hour, savedReminder!.minute)}`
            : 'No reminder set'}
        </Text>
      </View>

      <View style={styles.presetRow}>
        {PRESETS.map((preset) => (
          <Pressable key={preset.label} style={styles.presetChip} onPress={() => applyPreset(preset)}>
            <Text style={styles.presetChipText}>{preset.label}</Text>
          </Pressable>
        ))}
      </View>

      {Platform.OS === 'ios' ? (
        <DateTimePicker
          value={time}
          mode="time"
          display="spinner"
          minuteInterval={1}
          onChange={(_, selected) => selected && setTime(selected)}
          style={styles.wheelPicker}
        />
      ) : (
        <>
          <Pressable style={styles.androidTimeBtn} onPress={() => setShowAndroidPicker(true)}>
            <Text style={styles.androidTimeBtnText}>
              {String(time.getHours()).padStart(2, '0')}:{String(time.getMinutes()).padStart(2, '0')}
            </Text>
          </Pressable>
          {showAndroidPicker && (
            <DateTimePicker
              value={time}
              mode="time"
              display="clock"
              minuteInterval={1}
              onChange={(_, selected) => {
                setShowAndroidPicker(false);
                if (selected) setTime(selected);
              }}
            />
          )}
        </>
      )}

      {!isSaved && <Text style={styles.nextFire}>Will remind you {nextFireLabel}</Text>}
      {hasUnsavedChange && (
        <Text style={styles.unsavedNote}>You changed the time — tap Save to update your reminder.</Text>
      )}

      {!isSaved ? (
        <Pressable style={[styles.saveBtn, busy && styles.btnDisabled]} onPress={handleSaveReminder} disabled={busy}>
          <Text style={styles.saveBtnText}>{hasUnsavedChange ? 'Update reminder' : 'Save reminder'}</Text>
        </Pressable>
      ) : (
        <Pressable style={styles.turnOffLink} onPress={handleCancelAlarm} disabled={busy} hitSlop={8}>
          <Text style={styles.turnOffLinkText}>Turn off reminder</Text>
        </Pressable>
      )}

      <Pressable onPress={handleTestNotification} hitSlop={8}>
        <Text style={styles.testLink}>Send a test notification (10s) →</Text>
      </Pressable>

      <Text style={styles.note}>
        This plays your phone's normal notification sound — it can still be missed in Silent Mode.
        A true alarm-style ring that breaks through silence is on the roadmap; see the docs folder.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.sand,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  eyebrow: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.sage,
    letterSpacing: 1,
    marginBottom: spacing.sm,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.ink,
    textAlign: 'center',
    marginBottom: spacing.md,
  },
  streakPill: {
    backgroundColor: colors.card,
    paddingVertical: 6,
    paddingHorizontal: spacing.md,
    borderRadius: radius.pill,
    marginBottom: spacing.sm,
  },
  streakText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.ink,
  },
  historyRow: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: spacing.lg,
  },
  historyDot: {
    width: 10,
    height: 10,
    borderRadius: radius.pill,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: '#dfe6e1',
  },
  historyDotFilled: {
    backgroundColor: colors.sage,
    borderColor: colors.sage,
  },
  historyDotToday: {
    borderColor: colors.warm,
    borderWidth: 2,
  },
  primaryBtn: {
    backgroundColor: colors.sage,
    paddingVertical: 16,
    paddingHorizontal: spacing.xxl,
    borderRadius: radius.md,
  },
  primaryBtnText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 18,
  },
  primaryBtnCaption: {
    fontSize: 11,
    color: colors.inkSoft,
    marginTop: spacing.xs,
    marginBottom: spacing.xl,
  },
  divider: {
    width: '100%',
    height: 1,
    backgroundColor: '#dfe6e1',
    marginBottom: spacing.lg,
  },
  sectionLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.inkSoft,
    marginBottom: spacing.sm,
    textAlign: 'center',
  },
  statusPill: {
    paddingVertical: 6,
    paddingHorizontal: spacing.md,
    borderRadius: radius.pill,
    marginBottom: spacing.md,
    borderWidth: 1,
  },
  statusPillOn: {
    backgroundColor: colors.successLight,
    borderColor: colors.success,
  },
  statusPillOff: {
    backgroundColor: colors.card,
    borderColor: '#dfe6e1',
  },
  statusPillText: {
    fontSize: 12,
    fontWeight: '700',
  },
  statusPillTextOn: {
    color: colors.success,
  },
  statusPillTextOff: {
    color: colors.inkSoft,
  },
  presetRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  presetChip: {
    paddingVertical: 6,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.card,
    borderRadius: radius.pill,
  },
  presetChipText: {
    fontSize: 12,
    color: colors.ink,
    fontWeight: '600',
  },
  wheelPicker: {
    height: 140,
    width: 220,
  },
  androidTimeBtn: {
    paddingVertical: 10,
    paddingHorizontal: spacing.lg,
    backgroundColor: colors.card,
    borderRadius: radius.md,
    marginBottom: spacing.sm,
  },
  androidTimeBtnText: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.ink,
  },
  nextFire: {
    fontSize: 12,
    color: colors.inkSoft,
    marginBottom: spacing.md,
  },
  unsavedNote: {
    fontSize: 12,
    color: colors.warm,
    fontWeight: '600',
    marginBottom: spacing.md,
    textAlign: 'center',
  },
  saveBtn: {
    backgroundColor: colors.sage,
    paddingVertical: 12,
    paddingHorizontal: spacing.xl,
    borderRadius: radius.md,
    marginTop: spacing.xs,
  },
  saveBtnText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 15,
  },
  btnDisabled: {
    opacity: 0.6,
  },
  turnOffLink: {
    marginTop: spacing.xs,
    paddingVertical: 10,
    paddingHorizontal: spacing.lg,
  },
  turnOffLinkText: {
    color: colors.inkSoft,
    fontWeight: '600',
    fontSize: 13,
    textDecorationLine: 'underline',
  },
  testLink: {
    fontSize: 12,
    color: colors.inkSoft,
    textDecorationLine: 'underline',
    marginTop: spacing.md,
  },
  note: {
    marginTop: spacing.md,
    fontSize: 11,
    color: colors.inkSoft,
    textAlign: 'center',
    paddingHorizontal: spacing.lg,
  },
});
