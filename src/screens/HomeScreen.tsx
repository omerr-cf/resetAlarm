import React, { useCallback, useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, Pressable, Alert, Platform, ScrollView, Animated } from 'react-native';
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

// Rotates in the headline slot so the screen doesn't feel static on repeat
// visits. Same voice/energy as the rest of the copy (and reuses phrasing we
// already validated in the smoke-test ad hooks) rather than introducing a
// new tone.
const TAGLINES = [
  "Your nervous system doesn't know a deadline from a tiger.",
  "Dysregulated again? There's a 90-second fix for that.",
  "Your urgency is not your body's emergency.",
  'No 20-minute meditation. Just 90 seconds and a breath.',
  'Reset your system before it resets you.',
  'Regulate first. Everything else can wait 90 seconds.',
];
const TAGLINE_ROTATE_MS = 60000; // once a minute — enough time to actually read it

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

  const [taglineIndex, setTaglineIndex] = useState(() => Math.floor(Math.random() * TAGLINES.length));
  const taglineOpacity = useRef(new Animated.Value(1)).current;

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

  useEffect(() => {
    const interval = setInterval(() => {
      Animated.timing(taglineOpacity, { toValue: 0, duration: 300, useNativeDriver: true }).start(() => {
        setTaglineIndex((i) => (i + 1) % TAGLINES.length);
        Animated.timing(taglineOpacity, { toValue: 1, duration: 300, useNativeDriver: true }).start();
      });
    }, TAGLINE_ROTATE_MS);
    return () => clearInterval(interval);
  }, [taglineOpacity]);

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
    <ScrollView style={styles.scroll} contentContainerStyle={styles.container}>
      <Text style={styles.eyebrow}>90-SECOND RESET</Text>
      <View style={styles.titleWrap}>
        <Animated.Text style={[styles.title, { opacity: taglineOpacity }]}>
          {TAGLINES[taglineIndex]}
        </Animated.Text>
      </View>

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

      <Text style={styles.sectionLabel}>Reminder — a gentle notification, not a loud alarm yet</Text>

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
        Uses your phone's normal notification sound — can still be missed in Silent Mode. A true
        alarm-style ring is on the roadmap.
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: {
    flex: 1,
    backgroundColor: colors.sand,
  },
  container: {
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
  },
  eyebrow: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.sage,
    letterSpacing: 1,
    marginBottom: spacing.xs,
  },
  titleWrap: {
    minHeight: 56,
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.ink,
    textAlign: 'center',
    lineHeight: 26,
  },
  streakPill: {
    backgroundColor: colors.card,
    paddingVertical: 5,
    paddingHorizontal: spacing.md,
    borderRadius: radius.pill,
    marginBottom: spacing.xs,
  },
  streakText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.ink,
  },
  historyRow: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: spacing.md,
  },
  historyDot: {
    width: 9,
    height: 9,
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
    paddingVertical: 14,
    paddingHorizontal: spacing.xxl,
    borderRadius: radius.md,
  },
  primaryBtnText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 17,
  },
  primaryBtnCaption: {
    fontSize: 11,
    color: colors.inkSoft,
    marginTop: spacing.xs,
    marginBottom: spacing.md,
  },
  divider: {
    width: '100%',
    height: 1,
    backgroundColor: '#dfe6e1',
    marginBottom: spacing.md,
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.inkSoft,
    marginBottom: spacing.sm,
    textAlign: 'center',
  },
  statusPill: {
    paddingVertical: 5,
    paddingHorizontal: spacing.md,
    borderRadius: radius.pill,
    marginBottom: spacing.sm,
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
    marginBottom: spacing.xs,
  },
  presetChip: {
    paddingVertical: 5,
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
    height: 110,
    width: 210,
  },
  androidTimeBtn: {
    paddingVertical: 8,
    paddingHorizontal: spacing.lg,
    backgroundColor: colors.card,
    borderRadius: radius.md,
    marginBottom: spacing.xs,
  },
  androidTimeBtnText: {
    fontSize: 26,
    fontWeight: '700',
    color: colors.ink,
  },
  nextFire: {
    fontSize: 12,
    color: colors.inkSoft,
    marginBottom: spacing.sm,
  },
  unsavedNote: {
    fontSize: 12,
    color: colors.warm,
    fontWeight: '600',
    marginBottom: spacing.sm,
    textAlign: 'center',
  },
  saveBtn: {
    backgroundColor: colors.sage,
    paddingVertical: 11,
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
    paddingVertical: 8,
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
    marginTop: spacing.sm,
  },
  note: {
    marginTop: spacing.sm,
    fontSize: 11,
    color: colors.inkSoft,
    textAlign: 'center',
    paddingHorizontal: spacing.lg,
  },
});
