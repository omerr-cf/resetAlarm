import React, { useRef } from 'react';
import { Animated, Dimensions, Pressable, StyleSheet, Text, View } from 'react-native';
import * as Haptics from 'expo-haptics';
import { colors, typography } from '../theme';
import { ButtonOrigin } from '../lib/transition';
import LottieCompanion from './LottieCompanion';

// The source file shipped with its own root in/out points (ip:180, op:211) —
// an unrelated ~0.5s sliver near the tail of one ring's fade, not the full
// animation. Its 8 layers are staggered copies of one ring (each: fade in
// over 15 frames, hold, fade out, one ring starting every 30 frames) that
// only reads as a continuous ripple across frames 0-390 — confirmed by
// reading every layer's opacity keyframes directly. That root ip/op is
// patched to 0/390 in the .json file itself so plain declarative
// autoPlay+loop just works — no ref/imperative play() call needed (an
// earlier version relied on one, which turned out to be the actual bug
// behind "the ripple never shows up": LottieView's play/pause/resume are
// native Commands, and those are far more likely than plain declarative
// props to silently no-op under Expo Go's prebuilt native module if there's
// any version skew).
const rippleSource = require('../../assets/lottie/breathing_ripple.json');
const RIPPLE_COLOR_FILTERS = Array.from({ length: 8 }, (_, i) => ({ keypath: String(i + 1), color: colors.sage }));

// Ambient ripple scaled to most of the screen width (this is the third
// round trip on this exact number — full-bleed, then a contained 240px
// hub, now full-bleed again per the latest brief — implemented as asked,
// flagged here so it's visible in the diff if it needs to settle one way).
const { width: SCREEN_WIDTH } = Dimensions.get('window');
const RIPPLE_SIZE = SCREEN_WIDTH * 0.92;

// The actual touch target is smaller than the ripple's visual bleed on
// purpose. "Entire central zone touchable" is honored generously (280px,
// up from the previous 240px) without stretching the tap area all the way
// out to the ripple's full width — hitSlop/box that big would start
// overlapping the header and CTA text's own touch areas above/below it.
const HUB_SIZE = 280;

type Props = {
  /** Called the instant the button is tapped, with the hub's on-screen
   * position/size (when measurable) so the caller can animate a "this
   * button becomes the next screen" transition from the right spot. */
  onPress: (origin?: ButtonOrigin) => void;
  label?: string;
  subtitle?: string;
};

/**
 * The central "breathing hub". The ripple Lottie is absolutely positioned
 * and sized well beyond the touch target itself (pointerEvents "none" so it
 * never blocks the tap), so it reads as a soft ambient wash bleeding toward
 * the screen edges rather than a shape confined to the button. No border,
 * outline, or icon layered on top — the rings themselves, plus the label/
 * subtitle directly below, are the only visuals here.
 */
export default function PulseCircleButton({
  onPress,
  label = 'Take 90 seconds',
  subtitle = 'Tap to begin',
}: Props) {
  const pressScale = useRef(new Animated.Value(1)).current;
  const hubRef = useRef<View>(null);

  function handlePressIn() {
    // Immediate, crisp feedback the instant a finger lands — not on
    // release — so the tap feels answered right away.
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    Animated.spring(pressScale, { toValue: 0.97, useNativeDriver: true, speed: 40, bounciness: 4 }).start();
  }
  function handlePressOut() {
    Animated.spring(pressScale, { toValue: 1, useNativeDriver: true, speed: 40, bounciness: 4 }).start();
  }

  function handlePress() {
    // Measure where the hub actually is on screen so the Home->Breathing
    // transition can start from the real button instead of guessing. Falls
    // back to no origin (caller uses a sane default) if measurement fails.
    hubRef.current?.measureInWindow((x, y, width, height) => {
      if (width > 0 && height > 0) {
        onPress({ x, y, width, height });
      } else {
        onPress(undefined);
      }
    });
  }

  return (
    <View style={styles.wrap}>
      <View pointerEvents="none" style={styles.rippleWrap}>
        <LottieCompanion
          source={rippleSource}
          speed={0.65}
          style={{ width: RIPPLE_SIZE, height: RIPPLE_SIZE }}
          resizeMode="contain"
          colorFilters={RIPPLE_COLOR_FILTERS}
        />
      </View>

      <Pressable onPress={handlePress} onPressIn={handlePressIn} onPressOut={handlePressOut} hitSlop={16}>
        <Animated.View ref={hubRef} style={[styles.hub, { transform: [{ scale: pressScale }] }]} />
      </Pressable>

      <Text style={styles.label}>{label}</Text>
      {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
  },
  rippleWrap: {
    position: 'absolute',
    top: (HUB_SIZE - RIPPLE_SIZE) / 2,
    left: '50%',
    marginLeft: -RIPPLE_SIZE / 2,
    width: RIPPLE_SIZE,
    height: RIPPLE_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  hub: {
    width: HUB_SIZE,
    height: HUB_SIZE,
  },
  label: {
    fontFamily: typography.fontFamily,
    fontSize: 17,
    fontWeight: '400',
    color: colors.ink,
    marginTop: 12,
  },
  subtitle: {
    fontFamily: typography.fontFamily,
    fontSize: 12,
    fontWeight: '300',
    color: colors.mist,
    marginTop: 4,
  },
});
