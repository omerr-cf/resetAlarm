import React, { useCallback, useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, Pressable, Alert, Platform, Modal, Animated, Easing } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as Haptics from 'expo-haptics';
import { colors, spacing, radius, typography } from '../theme';
import {
  getReminderSettings,
  saveReminderSettings,
  ReminderSettings,
  getCompanionStyle,
  saveCompanionStyle,
  getUsageStats,
} from '../lib/storage';
import {
  ensureNotificationPermission,
  scheduleDailyReset,
  cancelDailyReset,
  sendTestNotification,
  describeNextFire,
} from '../lib/notifications';
import { COMPANION_OPTIONS, CompanionStyleId } from '../lib/companions';
import CompanionPicker from '../components/CompanionPicker';
import PulseCircleButton from '../components/PulseCircleButton';
import HomeActionTiles from '../components/HomeActionTiles';
import { ButtonOrigin } from '../lib/transition';

type Props = {
  onStartReset: (origin?: ButtonOrigin) => void;
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
  'Give yourself 90 seconds.',
];
const TAGLINE_ROTATE_MS = 9000; // every 9s, per the latest pacing brief
const TAGLINE_FADE_OUT_MS = 800;
const TAGLINE_FADE_IN_MS = 1200;

function timeFor(hour: number, minute: number): Date {
  const d = new Date();
  d.setHours(hour, minute, 0, 0);
  return d;
}

function formatTime(hour: number, minute: number): string {
  return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
}

export default function HomeScreen({ onStartReset }: Props) {
  const [time, setTime] = useState<Date>(() => timeFor(7, 30));
  // The reminder as it actually exists right now (persisted + scheduled) —
  // separate from `time`, which is just what's currently selected in the
  // sheet's picker. Comparing the two is what lets us show "you have
  // unsaved changes" instead of leaving the user guessing.
  const [savedReminder, setSavedReminder] = useState<ReminderSettings | null>(null);
  const [showAndroidPicker, setShowAndroidPicker] = useState(false);
  const [busy, setBusy] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [companionId, setCompanionId] = useState<CompanionStyleId>('flower');
  const [companionPickerOpen, setCompanionPickerOpen] = useState(false);

  const [taglineIndex, setTaglineIndex] = useState(() => Math.floor(Math.random() * TAGLINES.length));
  const taglineOpacity = useRef(new Animated.Value(1)).current;
  const taglineTranslateY = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    getReminderSettings().then((settings) => {
      if (settings) {
        setSavedReminder(settings);
        if (settings.enabled) setTime(timeFor(settings.hour, settings.minute));
      }
    });
    getCompanionStyle().then(setCompanionId);
  }, []);

  async function handleSelectCompanion(id: CompanionStyleId) {
    setCompanionId(id);
    await saveCompanionStyle(id);
    Haptics.selectionAsync().catch(() => {});
    setCompanionPickerOpen(false);
  }

  const companionLabel = COMPANION_OPTIONS.find((o) => o.id === companionId)?.label ?? 'Bloom';

  async function handleShowDebugStats() {
    const stats = await getUsageStats();
    const completionRate =
      stats.sessionsStarted > 0
        ? Math.round((stats.sessionsCompleted / stats.sessionsStarted) * 100)
        : 0;
    const shareRate =
      stats.sessionsCompleted > 0
        ? Math.round((stats.shareTapped / stats.sessionsCompleted) * 100)
        : 0;
    Alert.alert(
      'Local usage stats (this device)',
      `Started: ${stats.sessionsStarted}\nCompleted: ${stats.sessionsCompleted}\nExited early: ${stats.sessionsExitedEarly}\nShare tapped: ${stats.shareTapped}\n\nCompletion rate: ${completionRate}% (target ≥70%)\nShare rate: ${shareRate}% (target ≥30%)`
    );
  }

  useEffect(() => {
    // A soft "slide up while fading" crossfade — out, swap, in — rather than
    // a flat opacity blink. Small (8px) and slow enough to read as premium,
    // not flashy. Durations (800ms out / 1200ms in) match the latest pacing
    // brief's fade-out/fade-in split; implemented with the existing
    // Animated API rather than adding react-native-reanimated for it — this
    // project has deliberately stuck to Animated throughout so far
    // specifically to avoid a new native dependency, and the same visual
    // result (a slow, smooth crossfade) doesn't need reanimated's FadeIn/
    // FadeOut presets to achieve.
    const interval = setInterval(() => {
      Animated.parallel([
        Animated.timing(taglineOpacity, {
          toValue: 0,
          duration: TAGLINE_FADE_OUT_MS,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(taglineTranslateY, {
          toValue: -8,
          duration: TAGLINE_FADE_OUT_MS,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
      ]).start(() => {
        setTaglineIndex((i) => (i + 1) % TAGLINES.length);
        taglineTranslateY.setValue(8);
        Animated.parallel([
          Animated.timing(taglineOpacity, {
            toValue: 1,
            duration: TAGLINE_FADE_IN_MS,
            easing: Easing.out(Easing.quad),
            useNativeDriver: true,
          }),
          Animated.timing(taglineTranslateY, {
            toValue: 0,
            duration: TAGLINE_FADE_IN_MS,
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
      {/* Top header group: eyebrow + rotating headline. */}
      <View style={styles.topGroup}>
        {/* Hidden debug hook, not a UI affordance: long-press to peek at the
            local usage counters (session starts/completions/exits, share
            taps) while self-testing. No visible hint that this exists —
            it's a dev tool, not a feature, so it stays completely invisible
            to real users per the "no dev-facing copy" rule. */}
        <Pressable onLongPress={handleShowDebugStats} delayLongPress={1200}>
          <Text style={styles.eyebrow}>90-SECOND RESET</Text>
        </Pressable>
        <View style={styles.titleWrap}>
          <Animated.Text
            style={[styles.title, { opacity: taglineOpacity, transform: [{ translateY: taglineTranslateY }] }]}
          >
            {TAGLINES[taglineIndex]}
          </Animated.Text>
        </View>
      </View>

      {/* Central breathing hub — the only graphic in this area is the
          ripple Lottie inside PulseCircleButton itself; no extra wrapper
          shapes here. */}
      <View style={styles.ctaWrap}>
        <PulseCircleButton onPress={onStartReset} />
      </View>

      {/* Streak is deliberately not shown here anymore — Home stays purely
          about entering a session, no gamification pressure. It's still
          shown (and now animates a count-up) on ResultScreen after a
          session completes, which is the only place it lives now. */}

      {/* Flexible spacer — pushes the action cards down toward the bottom
          instead of letting the whole screen sit centered as one block. */}
      <View style={styles.spacer} />

      <View style={styles.bottomGroup}>
        <HomeActionTiles
          reminderValueLabel={isSaved ? formatTime(savedReminder!.hour, savedReminder!.minute) : 'Off'}
          reminderIsSet={isSaved}
          onPressReminder={() => setSheetOpen(true)}
          companionLabel={companionLabel}
          onPressCompanion={() => setCompanionPickerOpen(true)}
        />
      </View>

      <CompanionPicker
        visible={companionPickerOpen}
        selected={companionId}
        onSelect={handleSelectCompanion}
        onClose={() => setCompanionPickerOpen(false)}
      />

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
    paddingHorizontal: spacing.xl,
    // Was a single vertically-centered block; now a top-to-bottom stack
    // (header -> hub -> CTA text -> streak -> flexible spacer -> cards) so
    // the action cards can sit pinned near the bottom instead of the whole
    // screen floating as one centered clump.
    paddingTop: spacing.xxl + spacing.lg,
    // Stand-in for a real safe-area bottom inset — this project doesn't
    // pull in react-native-safe-area-context yet (it's Expo-Go-bundled, so
    // adding it is low-risk, but it does need an `npm install` on-device
    // since I can't reach the network from here). A generous static value
    // clears the home indicator on every current iPhone; happy to wire up
    // the real thing if the fixed value ever looks off on a specific device.
    paddingBottom: spacing.xl,
  },
  topGroup: {
    alignItems: 'center',
    marginBottom: 24,
  },
  eyebrow: {
    ...typography.eyebrow,
    marginBottom: spacing.sm,
  },
  titleWrap: {
    minHeight: 72,
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
  },
  title: {
    ...typography.heroHeadline,
    textAlign: 'center',
    maxWidth: 300,
    alignSelf: 'center',
  },
  ctaWrap: {
    marginBottom: 16,
  },
  spacer: {
    flex: 1,
  },
  bottomGroup: {
    width: '100%',
    alignItems: 'center',
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
    ...typography.cardTitle,
    marginBottom: spacing.xs,
  },
  sheetSubtitle: {
    fontSize: 13,
    fontWeight: '300',
    color: colors.inkSoft,
    marginBottom: spacing.lg,
    fontFamily: typography.fontFamily,
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
    fontWeight: '400',
    fontFamily: typography.fontFamily,
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
    fontWeight: '300',
    color: colors.ink,
    fontFamily: typography.fontFamily,
    fontVariant: ['tabular-nums'],
  },
  nextFire: {
    fontSize: 12,
    fontWeight: '300',
    color: colors.inkSoft,
    marginBottom: spacing.sm,
    fontFamily: typography.fontFamily,
  },
  unsavedNote: {
    // Kept at 500 (not the 300/400 used elsewhere) — this is a warning-ish
    // note in the accent `warm` color, and it needs to actually be noticed;
    // still lighter than the original 600.
    fontSize: 12,
    color: colors.warm,
    fontWeight: '500',
    marginBottom: spacing.sm,
    textAlign: 'center',
    fontFamily: typography.fontFamily,
  },
  saveBtn: {
    backgroundColor: colors.sage,
    paddingVertical: 12,
    paddingHorizontal: spacing.xl,
    borderRadius: radius.md,
    marginTop: spacing.xs,
  },
  saveBtnText: {
    // Filled button — see the note on other screens' shareBtn/buttonText;
    // 500 is the floor for white-on-sage before it starts looking washed
    // out.
    color: '#fff',
    fontWeight: '500',
    fontSize: 15,
    fontFamily: typography.fontFamily,
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
    fontWeight: '400',
    fontSize: 13,
    textDecorationLine: 'underline',
    fontFamily: typography.fontFamily,
  },
  testLink: {
    fontSize: 12,
    fontWeight: '300',
    color: colors.inkSoft,
    textDecorationLine: 'underline',
    marginTop: spacing.sm,
    fontFamily: typography.fontFamily,
  },
  note: {
    marginTop: spacing.sm,
    fontSize: 11,
    fontWeight: '300',
    color: colors.inkSoft,
    textAlign: 'center',
    paddingHorizontal: spacing.md,
    fontFamily: typography.fontFamily,
  },
  closeLink: {
    marginTop: spacing.md,
  },
  closeLinkText: {
    fontSize: 13,
    fontWeight: '300',
    color: colors.inkSoft,
    opacity: 0.7,
    fontFamily: typography.fontFamily,
  },
});
