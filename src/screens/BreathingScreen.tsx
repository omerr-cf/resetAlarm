import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import * as Haptics from 'expo-haptics';
import { colors, spacing, typography } from '../theme';
import LottieCompanion from '../components/LottieCompanion';
import { getCompanionOption, CompanionStyleId } from '../lib/companions';
import { getCompanionStyle } from '../lib/storage';

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
  const [phase, setPhase] = useState<Phase>('inhale');
  const [secondsLeft, setSecondsLeft] = useState(Math.ceil(TOTAL_DURATION_MS / 1000));
  const [canSkip, setCanSkip] = useState(false);
  const [companionId, setCompanionId] = useState<CompanionStyleId>('flower');
  const startRef = useRef<number>(Date.now());
  const doneRef = useRef(false);

  useEffect(() => {
    getCompanionStyle().then(setCompanionId);
  }, []);

  // Track elapsed time -> current phase label, countdown, skip-unlock, completion.
  // The companion's own Lottie loop (speed-matched to our 12s cycle in
  // lib/companions.ts) carries all the visual breathing motion now — this
  // timer just drives the phase label text, haptics, and the countdown.
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
          if (prev === 'inhale' && currentPhase === 'hold') {
            // Inhale peak — the top of the breath.
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
          } else if (prev === 'exhale' && currentPhase === 'inhale') {
            // Exhale end / cycle wrap — a soft completion notch, not a tick.
            Haptics.selectionAsync().catch(() => {});
          }
          // hold -> exhale is left silent on purpose — not every transition
          // needs its own buzz.
        }
        return currentPhase;
      });

      if (!canSkip && elapsed >= SKIP_UNLOCKS_AFTER_MS) setCanSkip(true);

      if (remaining <= 0 && !doneRef.current) {
        doneRef.current = true;
        clearInterval(interval);
        // Completion haptic fires once, from App.tsx's onComplete handler —
        // not here too, to avoid a double buzz.
        onComplete();
      }
    }, 200);

    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const companionOption = getCompanionOption(companionId);

  return (
    <View style={styles.container}>
      {/* Full-bleed companion — fills the entire screen edge to edge above
          the text block below, so it reads as the whole screen rather than
          a small centered icon. */}
      <View style={styles.companionWrap}>
        <LottieCompanion
          source={companionOption.source}
          speed={companionOption.speed}
          style={styles.companionFill}
          resizeMode="cover"
        />
      </View>

      <View style={styles.bottomBlock}>
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
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.sand,
  },
  companionWrap: {
    flex: 1,
    width: '100%',
    overflow: 'hidden',
  },
  companionFill: {
    width: '100%',
    height: '100%',
  },
  bottomBlock: {
    alignItems: 'center',
    paddingTop: spacing.lg,
    paddingBottom: spacing.xl,
    paddingHorizontal: spacing.xl,
    backgroundColor: colors.sand,
  },
  phaseLabel: {
    fontSize: 19,
    fontWeight: '400',
    color: colors.ink,
    marginBottom: spacing.xs,
    fontFamily: typography.fontFamily,
  },
  timer: {
    fontSize: 13,
    fontWeight: '300',
    color: colors.inkSoft,
    opacity: 0.55,
    marginBottom: spacing.xl,
    fontFamily: typography.fontFamily,
    fontVariant: ['tabular-nums'],
  },
  skipWrap: {
    height: 32,
    justifyContent: 'center',
  },
  skip: {
    fontSize: 12,
    fontWeight: '300',
    color: colors.inkSoft,
    opacity: 0.7,
    textDecorationLine: 'underline',
    fontFamily: typography.fontFamily,
  },
});
