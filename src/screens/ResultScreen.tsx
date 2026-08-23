import React, { useEffect, useRef, useState } from 'react';
import { Animated, Easing, View, Text, StyleSheet, Pressable, Share } from 'react-native';
import ViewShot from 'react-native-view-shot';
import * as Sharing from 'expo-sharing';
import Svg, { Circle, Defs, RadialGradient, Stop } from 'react-native-svg';
import { colors, spacing, radius, typography } from '../theme';
import LottieCompanion from '../components/LottieCompanion';
import { getCompanionOption, CompanionStyleId } from '../lib/companions';
import { getCompanionStyle, incrementUsageStat } from '../lib/storage';

type Props = {
  streak: number;
  /** Streak value before this session's completion — lets the badge count
   * up (e.g. 3 -> 4) instead of just appearing at its final value. Pass the
   * same as `streak` (or omit) when there's nothing to animate. */
  previousStreak?: number;
  onDone: () => void;
};

const GLOW_SIZE = 320;

export default function ResultScreen({ streak, previousStreak, onDone }: Props) {
  const shotRef = useRef<ViewShot>(null);
  const [sharing, setSharing] = useState(false);
  const [companionId, setCompanionId] = useState<CompanionStyleId>('flower');
  const [displayedStreak, setDisplayedStreak] = useState(previousStreak ?? streak);

  const entrance = useRef(new Animated.Value(0)).current;
  const glowOpacity = useRef(new Animated.Value(0)).current;
  const glowScale = useRef(new Animated.Value(1)).current;
  const countAnim = useRef(new Animated.Value(previousStreak ?? streak)).current;

  useEffect(() => {
    getCompanionStyle().then(setCompanionId);
  }, []);

  // Whole card + button arrives with a single gentle fade/scale — not a
  // celebratory bounce, just enough motion to feel considered rather than
  // instant/flat.
  useEffect(() => {
    Animated.timing(entrance, {
      toValue: 1,
      duration: 500,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [entrance]);

  // A soft glow behind the card — the "delight" moment the brief asked for,
  // done as a quiet bloom rather than confetti/particles, which would break
  // the "quiet completion, no achievement framing" tone the rest of this
  // screen is built around.
  useEffect(() => {
    Animated.timing(glowOpacity, {
      toValue: 1,
      duration: 900,
      delay: 150,
      easing: Easing.out(Easing.quad),
      useNativeDriver: true,
    }).start();
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(glowScale, {
          toValue: 1.06,
          duration: 2400,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(glowScale, {
          toValue: 1,
          duration: 2400,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [glowOpacity, glowScale]);

  // Count the streak up from its previous value to the new one, once, on
  // arrival — skipped if nothing actually changed (e.g. a second session
  // the same day, where the streak doesn't increment again).
  useEffect(() => {
    const from = previousStreak ?? streak;
    if (from === streak) {
      setDisplayedStreak(streak);
      return;
    }
    countAnim.setValue(from);
    const listenerId = countAnim.addListener(({ value }) => setDisplayedStreak(Math.round(value)));
    Animated.timing(countAnim, {
      toValue: streak,
      duration: 700,
      delay: 300,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false, // reading via listener, not a native transform
    }).start();
    return () => countAnim.removeListener(listenerId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [streak, previousStreak]);

  const companionOption = getCompanionOption(companionId);
  const dateLabel = new Date().toLocaleDateString(undefined, {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });

  async function handleShare() {
    // Count the tap itself, not whether the OS share sheet was completed —
    // "wanted to share" is the signal the MVP plan cares about (≥30% target).
    incrementUsageStat('shareTapped').catch(() => {});
    try {
      setSharing(true);
      const uri = await shotRef.current?.capture?.();
      if (!uri) return;

      const canShareFile = await Sharing.isAvailableAsync();
      if (canShareFile) {
        await Sharing.shareAsync(uri);
      } else {
        // Fallback for platforms without the native share sheet available
        await Share.share({ message: '90 seconds for myself. 🌿' });
      }
    } catch (err) {
      console.warn('Share failed', err);
    } finally {
      setSharing(false);
    }
  }

  const entranceStyle = {
    alignItems: 'center' as const,
    opacity: entrance,
    transform: [{ scale: entrance.interpolate({ inputRange: [0, 1], outputRange: [0.94, 1] }) }],
  };

  return (
    <View style={styles.container}>
      {/* Quiet completion — no "Congratulations!", no achievement framing.
          Just a small, still moment, then the artifact. */}
      <Animated.View style={entranceStyle}>
        <View style={styles.glowWrap} pointerEvents="none">
          <Animated.View style={{ opacity: glowOpacity, transform: [{ scale: glowScale }] }}>
            <Svg width={GLOW_SIZE} height={GLOW_SIZE} viewBox={`0 0 ${GLOW_SIZE} ${GLOW_SIZE}`}>
              <Defs>
                <RadialGradient id="resultGlow" cx="50%" cy="50%" r="55%">
                  <Stop offset="0%" stopColor={colors.sageLight} stopOpacity={0.9} />
                  <Stop offset="100%" stopColor={colors.sageLight} stopOpacity={0} />
                </RadialGradient>
              </Defs>
              <Circle cx={GLOW_SIZE / 2} cy={GLOW_SIZE / 2} r={GLOW_SIZE / 2} fill="url(#resultGlow)" />
            </Svg>
          </Animated.View>
        </View>

        <ViewShot ref={shotRef} options={{ format: 'png', quality: 1 }} style={styles.cardWrap}>
          <View style={styles.card}>
            <LottieCompanion source={companionOption.source} speed={companionOption.speed} size={80} />
            <Text style={styles.eyebrow}>RESET</Text>
            <Text style={styles.date}>{dateLabel}</Text>
            <Text style={styles.title}>90 seconds{'\n'}for yourself.</Text>
            {displayedStreak > 0 && <Text style={styles.streak}>🔥 {displayedStreak}</Text>}
          </View>
        </ViewShot>

        <Pressable style={styles.shareBtn} onPress={handleShare} disabled={sharing}>
          <Text style={styles.shareBtnText}>{sharing ? 'Preparing…' : 'Share this'}</Text>
        </Pressable>

        <Pressable onPress={onDone} hitSlop={12} style={styles.doneWrap}>
          <Text style={styles.done}>Done</Text>
        </Pressable>
      </Animated.View>
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
  glowWrap: {
    position: 'absolute',
    top: -70,
    left: '50%',
    marginLeft: -GLOW_SIZE / 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardWrap: {
    marginBottom: spacing.xl,
  },
  card: {
    width: 280,
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    paddingVertical: spacing.xxl,
    paddingHorizontal: spacing.xl,
    alignItems: 'center',
    shadowColor: colors.ink,
    shadowOpacity: 0.08,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 6 },
  },
  eyebrow: {
    ...typography.eyebrow,
    marginTop: spacing.lg,
    marginBottom: spacing.xs,
  },
  date: {
    fontSize: 11,
    fontWeight: '300',
    color: colors.inkSoft,
    opacity: 0.6,
    marginBottom: spacing.sm,
    fontFamily: typography.fontFamily,
    fontVariant: ['tabular-nums'],
  },
  title: {
    ...typography.heroHeadline,
    textAlign: 'center',
  },
  streak: {
    fontSize: 13,
    fontWeight: '300',
    color: colors.inkSoft,
    marginTop: spacing.lg,
    fontVariant: ['tabular-nums'],
    fontFamily: typography.fontFamily,
  },
  shareBtn: {
    backgroundColor: colors.sage,
    paddingVertical: 14,
    paddingHorizontal: spacing.xl,
    borderRadius: radius.md,
    marginBottom: spacing.lg,
  },
  shareBtnText: {
    // Filled colored button — kept at 500 rather than the 300/400 used for
    // plain text elsewhere. White text at 300-400 on a solid sage
    // background started to feel weak/hard to read; 500 is the lightest
    // that still holds up against a solid fill.
    color: '#fff',
    fontWeight: '500',
    fontSize: 16,
    fontFamily: typography.fontFamily,
  },
  doneWrap: {
    alignItems: 'center',
  },
  done: {
    fontSize: 14,
    fontWeight: '300',
    color: colors.inkSoft,
    textDecorationLine: 'underline',
    fontFamily: typography.fontFamily,
  },
});
