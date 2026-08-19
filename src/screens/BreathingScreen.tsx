import React, { useEffect, useRef, useState } from 'react';
import { View, Text, Animated, Easing, StyleSheet, Pressable } from 'react-native';
import * as Haptics from 'expo-haptics';
import { colors, spacing } from '../theme';
import BreathingCompanion from '../components/BreathingCompanion';

type Phase = 'inhale' | 'hold' | 'exhale';

const PHASE_DURATIONS_MS: Record<Phase, number> = {
  inhale: 4000,
  hold: 2000,
  exhale: 6000,
};
const PHASE_LABELS: Record<Phase, string> = {
  inhale: 'Breathe in',
  hold: 'Hold',
  exhale: 'Breathe out',
};
const CYCLE_ORDER: Phase[] = ['inhale', 'hold', 'exhale'];
const CYCLE_MS = PHASE_DURATIONS_MS.inhale + PHASE_DURATIONS_MS.hold + PHASE_DURATIONS_MS.exhale; // 12s
const TOTAL_DURATION_MS = 90 * 1000;
const SKIP_UNLOCKS_AFTER_MS = 15 * 1000; // soft commitment: no skip button for the first 15s

type Props = {
  onComplete: () => void;
  onExit: () => void;
};

export default function BreathingScreen({ onComplete, onExit }: Props) {
  const scale = useRef(new Animated.Value(0.6)).current;
  const [phase, setPhase] = useState<Phase>('inhale');
  const [secondsLeft, setSecondsLeft] = useState(Math.ceil(TOTAL_DURATION_MS / 1000));
  const [canSkip, setCanSkip] = useState(false);
  const startRef = useRef<number>(Date.now());
  const doneRef = useRef(false);

  // Drive the breathing animation in a continuous loop of inhale -> hold -> exhale
  useEffect(() => {
    let cancelled = false;

    function runCycle() {
      if (cancelled) return;
      Animated.sequence([
        Animated.timing(scale, {
          toValue: 1,
          duration: PHASE_DURATIONS_MS.inhale,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(scale, {
          toValue: 1,
          duration: PHASE_DURATIONS_MS.hold,
          easing: Easing.linear,
          useNativeDriver: true,
        }),
        Animated.timing(scale, {
          toValue: 0.6,
          duration: PHASE_DURATIONS_MS.exhale,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ]).start(({ finished }) => {
        if (finished && !cancelled) runCycle();
      });
    }
    runCycle();
    return () => {
      cancelled = true;
    };
  }, [scale]);

  // Track elapsed time -> current phase label, countdown, skip-unlock, completion
  useEffect(() => {
    const interval = setInterval(() => {
      const elapsed = Date.now() - startRef.current;
      const remaining = Math.max(0, TOTAL_DURATION_MS - elapsed);
      setSecondsLeft(Math.ceil(remaining / 1000));

      const posInCycle = elapsed % CYCLE_MS;
      let acc = 0;
      let currentPhase: Phase = 'inhale';
      for (const p of CYCLE_ORDER) {
        acc += PHASE_DURATIONS_MS[p];
        if (posInCycle < acc) {
          currentPhase = p;
          break;
        }
      }
      setPhase((prev) => {
        if (prev !== currentPhase) {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
        }
        return currentPhase;
      });

      if (!canSkip && elapsed >= SKIP_UNLOCKS_AFTER_MS) setCanSkip(true);

      if (remaining <= 0 && !doneRef.current) {
        doneRef.current = true;
        clearInterval(interval);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
        onComplete();
      }
    }, 200);

    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <View style={styles.container}>
      {/* The companion is the screen — everything else is quiet supporting
          text underneath it, not competing for attention. No instructional
          copy: the phase label + the companion's own motion are enough. */}
      <View style={styles.ringWrap}>
        <Animated.View style={{ transform: [{ scale }] }}>
          <BreathingCompanion phase={phase} size={240} />
        </Animated.View>
      </View>

      <Text style={styles.phaseLabel}>{PHASE_LABELS[phase]}</Text>
      <Text style={styles.timer}>{secondsLeft}s</Text>

      {canSkip ? (
        <Pressable onPress={onExit} hitSlop={12} style={styles.skipWrap}>
          <Text style={styles.skip}>End early</Text>
        </Pressable>
      ) : (
        <View style={styles.skipWrap} />
      )}
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
  ringWrap: {
    width: 240,
    height: 240,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
  },
  phaseLabel: {
    fontSize: 19,
    fontWeight: '600',
    color: colors.ink,
    marginBottom: spacing.xs,
  },
  timer: {
    fontSize: 13,
    fontWeight: '500',
    color: colors.inkSoft,
    opacity: 0.55,
    marginBottom: spacing.xl,
  },
  skipWrap: {
    height: 32,
    justifyContent: 'center',
  },
  skip: {
    fontSize: 12,
    color: colors.inkSoft,
    opacity: 0.7,
    textDecorationLine: 'underline',
  },
});
