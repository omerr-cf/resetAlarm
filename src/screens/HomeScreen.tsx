import React, { useCallback, useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, Pressable, Alert, Platform, Modal, Animated, Easing } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as Haptics from 'expo-haptics';
import { colors, spacing, radius } from '../theme';
import {
  getStreak,
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
// the day, not just waking up, so the reminder sheet offers a few common
// anchors rather than only a wake-up time.
const PRESETS: { label: string; hour: number; minute: number }[] = [
  { label: 'Morning', hour: 7, minute: 30 },
  { label: 'Midday slump', hour: 13, minute: 0 },
  { label: 'Wind-down', hour: 20, minute: 0 },
];

// Rotates in the headline slot so the screen doesn't feel static on repeat
// visits — short and quiet on purpose. This is the one emotional line on
// the screen; everything else stays out of its way.
const TAGLINES = [
  'Everything else can wait.',
  '90 seconds, whenever you need them.',
  'Not a deadline. Not a tiger.',
  'One breath at a time.',
  'A quiet place to land.',
  "You don't have to do anything else right now.",
];
const TAGLINE_ROTATE_MS = 30000; // every 30s — enough to read it, still feels alive

function timeFor(hour: number, minute: number): Date {
  const d = new Date();
  d.setHours(hour, minute, 0, 0);
  return d;
}

function formatTime(hour: number, minute: number): string {
  return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
}

export default function HomeScreen({ onStartReset }: Props) {
  const [streak, setStreak] = useState(0);
  const [time, setTime] = useState<Date>(() => timeFor(7, 30));
  // The reminder as it actually exists right now (persisted + scheduled) —
  // separate from `time`, which is just what's currently selected in the
  // sheet's picker. Comparing the two is what lets us show "you have
  // unsaved changes" instead of leaving the user guessing.
  const [savedReminder, setSavedReminder] = useState<ReminderSettings | null>(null);
  const [showAndroidPicker, setShowAndroidPicker] = useState(false);
  const [busy, setBusy] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);

  const [taglineIndex, setTaglineIndex] = useState(() => Math.floor(Math.random() * TAGLINES.length));
  const taglineOpacity = useRef(new Animated.Value(1)).current;
  const taglineTranslateY = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    getStreak().then(setStreak);
    getReminderSettings().then((settings) => {
      if (settings) {
        setSavedReminder(settings);
        if (settings.enabled) setTime(timeFor(settings.hour, settings.minute));
      }
    });
  }, []);

  useEffect(() => {
    // A soft "slide up while fading" crossfade — out, swap, in — rather than
    // a flat opacity blink. Small (8px) and slow enough to read as premium,
    // not flashy.
    const interval = setInterval(() => {
      Animated.parallel([
        Animated.timing(taglineOpacity, {
          toValue: 0,
          duration: 320,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(taglineTranslateY, {
          toValue: -8,
          duration: 320,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
      ]).start(() => {
        setTaglineIndex((i) => (i + 1) % TAGLINES.length);
        taglineTranslateY.setValue(8);
        Animated.parallel([
          Animated.timing(taglineOpacity, {
            toValue: 1,
            duration: 380,
            easing: Easing.out(Easing.quad),
            useNativeDriver: true,
          }),
          Animated.timing(taglineTranslateY, {
            toValue: 0,
            duration: 380,
            easing: Easing.out(Easing.quad),
            useNativeDriver: true,
          }),
        ]).start();
      });
    }, TAGLINE_ROTATE_MS);
    return () => clearInterval(interval);
  }, [taglineOpacity, taglineTranslateY]);

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
      setSheetOpen(false);
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
      setSheetOpen(false);
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
    Alert.alert('Test scheduled', 'A test notification will arrive in about 10 seconds.');
  }

  const nextFireLabel = describeNextFire(time.getHours(), time.getMinutes());

  return (
    <View style={styles.container}>
      <Text style={styles.eyebrow}>90-SECOND RESET</Text>
      <View style={styles.titleWrap}>
        <Animated.Text
          style={[styles.title, { opacity: taglineOpacity, transform: [{ translateY: taglineTranslateY }] }]}
        >
          {TAGLINES[taglineIndex]}
        </Animated.Text>
      </View>

      <Pressable style={styles.primaryBtn} onPress={onStartReset}>
        <Text style={styles.primaryBtnText}>Take 90 seconds</Text>
      </Pressable>

      {streak > 0 && <Text style={styles.streakText}>🔥 {streak}</Text>}

      <Pressable style={styles.reminderRow} onPress={() => setSheetOpen(true)}>
        <Text style={styles.reminderRowLabel}>Daily reminder</Text>
        <Text style={styles.reminderRowValue}>
          {isSaved ? formatTime(savedReminder!.hour, savedReminder!.minute) : 'Off'} ›
        </Text>
      </Pressable>

      <Modal visible={sheetOpen} transparent animationType="slide" onRequestClose={() => setSheetOpen(false)}>
        <Pressable style={styles.backdrop} onPress={() => setSheetOpen(false)} />
        <View style={styles.sheet}>
          <View style={styles.sheetHandle} />
          <Text style={styles.sheetTitle}>Daily reminder</Text>
          <Text style={styles.sheetSubtitle}>A gentle nudge to reset.</Text>

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
                  {formatTime(time.getHours(), time.getMinutes())}
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
          {hasUnsavedChange && <Text style={styles.unsavedNote}>Tap Save to update your reminder.</Text>}

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
            Uses your phone's normal notification sound — can still be missed in Silent Mode.
          </Text>

          <Pressable onPress={() => setSheetOpen(false)} hitSlop={8} style={styles.closeLink}>
            <Text style={styles.closeLinkText}>Close</Text>
          </Pressable>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.sand,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
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
    marginBottom: spacing.xl,
    paddingHorizontal: spacing.md,
  },
  title: {
    fontSize: 21,
    fontWeight: '600',
    color: colors.ink,
    textAlign: 'center',
    lineHeight: 28,
  },
  primaryBtn: {
    backgroundColor: colors.sage,
    paddingVertical: 18,
    paddingHorizontal: spacing.xxl,
    borderRadius: radius.md,
    marginBottom: spacing.md,
  },
  primaryBtnText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 18,
  },
  streakText: {
    fontSize: 14,
    color: colors.inkSoft,
    marginBottom: spacing.xxl,
  },
  reminderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    maxWidth: 320,
    backgroundColor: colors.card,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.hairline,
  },
  reminderRowLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.ink,
  },
  reminderRowValue: {
    fontSize: 14,
    color: colors.inkSoft,
  },
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(47,58,51,0.35)',
  },
  sheet: {
    backgroundColor: colors.sand,
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.sm,
    paddingBottom: spacing.xxl,
    alignItems: 'center',
  },
  sheetHandle: {
    width: 36,
    height: 4,
    borderRadius: radius.pill,
    backgroundColor: colors.hairline,
    marginBottom: spacing.md,
  },
  sheetTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.ink,
    marginBottom: spacing.xs,
  },
  sheetSubtitle: {
    fontSize: 13,
    color: colors.inkSoft,
    marginBottom: spacing.lg,
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
    borderWidth: 1,
    borderColor: colors.hairline,
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
    marginTop: spacing.sm,
  },
  note: {
    marginTop: spacing.sm,
    fontSize: 11,
    color: colors.inkSoft,
    textAlign: 'center',
    paddingHorizontal: spacing.md,
  },
  closeLink: {
    marginTop: spacing.md,
  },
  closeLinkText: {
    fontSize: 13,
    color: colors.inkSoft,
    opacity: 0.7,
  },
});
