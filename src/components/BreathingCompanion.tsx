import React, { useEffect, useRef } from 'react';
import { Animated, Easing } from 'react-native';
import Svg, { Circle, Ellipse, Path, Defs, RadialGradient, Stop } from 'react-native-svg';
import { colors } from '../theme';

/**
 * A minimal "breathing companion" — not a mascot with a backstory, just a
 * soft, sophisticated face that visibly breathes with the user. Design
 * rationale (from research on Finch/Duolingo/Yazio-style character design):
 * keep it to one simple shape + a couple of expressions rather than a full
 * illustrated character — the goal is a calm presence, not cuteness.
 *
 * v2 → v3 refinements (gentler, more "alive"):
 * - A soft radial-gradient "aura" glows and softens on hold/exhale, instead
 *   of a flat-filled circle — reads as warmth, not a static icon.
 * - Eyes cross-fade between an open ellipse and a friendly closed "ᴗ" curve
 *   (rather than squashing one ellipse thin), which reads as a genuine soft
 *   smile-with-the-eyes instead of just "closed."
 * - Faint blush appears on hold/exhale — a small but real warmth cue.
 * - All transitions use an eased curve (not linear), so motion feels organic
 * rather than mechanical.
 *
 * Why SVG + Animated instead of Lottie: a good Lottie file is normally
 * authored visually (After Effects/Bodymovin) — hand-writing the keyframe
 * JSON blind risks a broken or stiff-looking result with no native
 * dependency benefit. This component gets the same "designed motion" feel
 * while staying fully type-checked, dependency-free, and easy to keep
 * tuning by eye.
 */

const AnimatedEllipse = Animated.createAnimatedComponent(Ellipse);
const AnimatedPath = Animated.createAnimatedComponent(Path);
const AnimatedCircle = Animated.createAnimatedComponent(Circle);

export type BreathingCompanionPhase = 'inhale' | 'hold' | 'exhale';

type Props = {
  phase: BreathingCompanionPhase;
  size?: number;
};

export default function BreathingCompanion({ phase, size = 180 }: Props) {
  // 0 = inhale (open, alert, bright) · 1 = hold/exhale (settled, soft, closed)
  const settle = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const isSettled = phase === 'hold' || phase === 'exhale';
    Animated.timing(settle, {
      toValue: isSettled ? 1 : 0,
      duration: 900,
      easing: Easing.inOut(Easing.quad),
      useNativeDriver: false, // animating SVG props, not transforms
    }).start();
  }, [phase, settle]);

  const openEyeOpacity = settle.interpolate({ inputRange: [0, 1], outputRange: [1, 0] });
  const closedEyeOpacity = settle;
  const neutralMouthOpacity = settle.interpolate({ inputRange: [0, 1], outputRange: [1, 0] });
  const smileMouthOpacity = settle;
  const blushOpacity = settle.interpolate({ inputRange: [0, 1], outputRange: [0, 0.55] });
  const auraRadius = settle.interpolate({
    inputRange: [0, 1],
    outputRange: [size * 0.42, size * 0.5],
  });
  const auraOpacity = settle.interpolate({ inputRange: [0, 1], outputRange: [0.5, 0.85] });

  const cx = size / 2;
  const cy = size / 2;
  const eyeOffsetX = size * 0.16;
  const eyeY = size * 0.44;
  const eyeRx = size * 0.045;
  const eyeOpenRy = size * 0.045;
  const mouthY = size * 0.6;
  const mouthHalfWidth = size * 0.11;
  const blushY = size * 0.53;
  const blushOffsetX = size * 0.27;
  const blushRx = size * 0.07;
  const blushRy = size * 0.045;

  return (
    <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <Defs>
        <RadialGradient id="companionAura" cx="50%" cy="45%" r="60%">
          <Stop offset="0%" stopColor={colors.sageLight} stopOpacity={1} />
          <Stop offset="100%" stopColor={colors.sage} stopOpacity={0.25} />
        </RadialGradient>
      </Defs>

      {/* Soft glowing aura — breathes in size + intensity along with the face */}
      <AnimatedCircle cx={cx} cy={cy} r={auraRadius} fill="url(#companionAura)" opacity={auraOpacity} />
      <Circle cx={cx} cy={cy} r={size / 2 - 2} fill="none" stroke={colors.sage} strokeWidth={1.5} opacity={0.5} />

      {/* Blush — a small warmth cue that fades in as the face settles */}
      <AnimatedEllipse cx={cx - blushOffsetX} cy={blushY} rx={blushRx} ry={blushRy} fill={colors.blush} opacity={blushOpacity} />
      <AnimatedEllipse cx={cx + blushOffsetX} cy={blushY} rx={blushRx} ry={blushRy} fill={colors.blush} opacity={blushOpacity} />

      {/* Eyes — cross-fade between "open" (alert) and a friendly closed ᴗ curve (settled) */}
      <AnimatedEllipse cx={cx - eyeOffsetX} cy={eyeY} rx={eyeRx} ry={eyeOpenRy} fill={colors.ink} opacity={openEyeOpacity} />
      <AnimatedEllipse cx={cx + eyeOffsetX} cy={eyeY} rx={eyeRx} ry={eyeOpenRy} fill={colors.ink} opacity={openEyeOpacity} />
      <AnimatedPath
        d={`M ${cx - eyeOffsetX - eyeRx} ${eyeY} Q ${cx - eyeOffsetX} ${eyeY - eyeRx * 1.6} ${cx - eyeOffsetX + eyeRx} ${eyeY}`}
        stroke={colors.ink}
        strokeWidth={2.5}
        strokeLinecap="round"
        fill="none"
        opacity={closedEyeOpacity}
      />
      <AnimatedPath
        d={`M ${cx + eyeOffsetX - eyeRx} ${eyeY} Q ${cx + eyeOffsetX} ${eyeY - eyeRx * 1.6} ${cx + eyeOffsetX + eyeRx} ${eyeY}`}
        stroke={colors.ink}
        strokeWidth={2.5}
        strokeLinecap="round"
        fill="none"
        opacity={closedEyeOpacity}
      />

      {/* Neutral mouth: soft flat line (inhale) */}
      <AnimatedPath
        d={`M ${cx - mouthHalfWidth} ${mouthY} Q ${cx} ${mouthY + 4} ${cx + mouthHalfWidth} ${mouthY}`}
        stroke={colors.ink}
        strokeWidth={3}
        strokeLinecap="round"
        fill="none"
        opacity={neutralMouthOpacity}
      />

      {/* Smiling mouth: gentle closed smile (hold / exhale) */}
      <AnimatedPath
        d={`M ${cx - mouthHalfWidth} ${mouthY} Q ${cx} ${mouthY + 16} ${cx + mouthHalfWidth} ${mouthY}`}
        stroke={colors.ink}
        strokeWidth={3}
        strokeLinecap="round"
        fill="none"
        opacity={smileMouthOpacity}
      />
    </Svg>
  );
}
