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
 * v4: each of the three breathing phases now has its own distinct
 * expression, driven by a single `phaseValue` (0 = inhale, 1 = hold,
 * 2 = exhale) so every property — eyes, mouth, blush size/opacity, aura —
 * eases smoothly between three real keyframes instead of one on/off state:
 * - **Inhale**: calm open eyes, mouth rounds into a soft "O" as if drawing
 *   breath in. No blush yet.
 * - **Hold**: eyes ease shut into a friendly "ᴗ" curve, mouth settles into
 *   a slight smile, blush blooms to its fullest.
 * - **Exhale**: same relaxed eyes/smile as hold, but blush recedes a little
 *   — reads as a soft release rather than a flat repeat of "hold."
 *
 * Why SVG + Animated instead of Lottie: our 4s/2s/6s cycle is actually a
 * fixed 12s loop (not variable), so a well-made Lottie file would sync
 * here too — that's not the blocker. The real trade-offs are cost (a good
 * custom Lottie means either a paid AI generator or hand-editing a free
 * library template that won't have this exact expression logic) and
 * control (this component is free, fully bespoke to the brief, and every
 * tweak is a code change + `tsc` check away — no external tool round-trip).
 * Worth revisiting if/when there's a real design budget for it.
 */

const AnimatedEllipse = Animated.createAnimatedComponent(Ellipse);
const AnimatedPath = Animated.createAnimatedComponent(Path);
const AnimatedCircle = Animated.createAnimatedComponent(Circle);

export type BreathingCompanionPhase = 'inhale' | 'hold' | 'exhale';

const PHASE_INDEX: Record<BreathingCompanionPhase, number> = { inhale: 0, hold: 1, exhale: 2 };

type Props = {
  phase: BreathingCompanionPhase;
  size?: number;
};

export default function BreathingCompanion({ phase, size = 180 }: Props) {
  const phaseValue = useRef(new Animated.Value(PHASE_INDEX[phase])).current;

  useEffect(() => {
    Animated.timing(phaseValue, {
      toValue: PHASE_INDEX[phase],
      duration: 700,
      easing: Easing.inOut(Easing.quad),
      useNativeDriver: false, // animating SVG props, not transforms
    }).start();
  }, [phase, phaseValue]);

  const inputRange = [0, 1, 2];

  // Eyes: open + calm on inhale, closed "ᴗ" curve on hold and exhale.
  const openEyeOpacity = phaseValue.interpolate({ inputRange, outputRange: [1, 0, 0] });
  const closedEyeOpacity = phaseValue.interpolate({ inputRange, outputRange: [0, 1, 1] });

  // Mouth: rounded "O" (drawing breath in) on inhale, gentle smile on hold + exhale.
  const mouthOOpacity = phaseValue.interpolate({ inputRange, outputRange: [1, 0, 0] });
  const smileOpacity = phaseValue.interpolate({ inputRange, outputRange: [0, 1, 1] });

  // Blush: absent on inhale, blooms fullest on hold, recedes a little on exhale.
  const blushOpacity = phaseValue.interpolate({ inputRange, outputRange: [0, 0.6, 0.38] });
  const blushScale = phaseValue.interpolate({ inputRange, outputRange: [0.55, 1.15, 0.85] });

  // Aura glow follows the same "bloom on hold" shape as the blush.
  const auraRadius = phaseValue.interpolate({
    inputRange,
    outputRange: [size * 0.42, size * 0.5, size * 0.46],
  });
  const auraOpacity = phaseValue.interpolate({ inputRange, outputRange: [0.5, 0.85, 0.68] });

  // A quiet "release" ring — sits close to the face through inhale/hold,
  // then eases outward and fades during exhale, like a slow ripple. Reads
  // as a physical release rather than a decorative loop.
  // Kept within the canvas edge (no viewBox overflow/clipping risk) — the
  // motion is meant to be a quiet nudge, not a dramatic expansion anyway.
  const ringRadius = phaseValue.interpolate({
    inputRange,
    outputRange: [size * 0.42, size * 0.42, size * 0.48],
  });
  const ringOpacity = phaseValue.interpolate({ inputRange, outputRange: [0.35, 0.35, 0] });

  const cx = size / 2;
  const cy = size / 2;
  const eyeOffsetX = size * 0.16;
  const eyeY = size * 0.44;
  const eyeRx = size * 0.045;
  const eyeOpenRy = size * 0.045;
  const mouthY = size * 0.6;
  const mouthHalfWidth = size * 0.11;
  const mouthORx = size * 0.045;
  const mouthORy = size * 0.055;
  const blushY = size * 0.53;
  const blushOffsetX = size * 0.27;
  const blushBaseRx = size * 0.07;
  const blushBaseRy = size * 0.045;

  // blushScale is an Animated.Value — build rx/ry as animated interpolations
  // multiplying the base size, so blush grows/shrinks instead of just fading.
  const blushRx = blushScale.interpolate({ inputRange: [0, 1.15], outputRange: [0, blushBaseRx * 1.15] });
  const blushRy = blushScale.interpolate({ inputRange: [0, 1.15], outputRange: [0, blushBaseRy * 1.15] });

  return (
    <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <Defs>
        <RadialGradient id="companionAura" cx="50%" cy="45%" r="60%">
          <Stop offset="0%" stopColor={colors.sageLight} stopOpacity={1} />
          <Stop offset="100%" stopColor={colors.sageWhisper} stopOpacity={0.35} />
        </RadialGradient>
      </Defs>

      {/* Soft glowing aura — breathes in size + intensity along with the face */}
      <AnimatedCircle cx={cx} cy={cy} r={auraRadius} fill="url(#companionAura)" opacity={auraOpacity} />

      {/* Release ring — a quiet outward ripple during exhale */}
      <AnimatedCircle cx={cx} cy={cy} r={ringRadius} fill="none" stroke={colors.sageWhisper} strokeWidth={1.5} opacity={ringOpacity} />

      <Circle cx={cx} cy={cy} r={size / 2 - 2} fill="none" stroke={colors.sageWhisper} strokeWidth={1.5} opacity={0.7} />

      {/* Blush — grows on hold, eases back a touch on exhale */}
      <AnimatedEllipse cx={cx - blushOffsetX} cy={blushY} rx={blushRx} ry={blushRy} fill={colors.blush} opacity={blushOpacity} />
      <AnimatedEllipse cx={cx + blushOffsetX} cy={blushY} rx={blushRx} ry={blushRy} fill={colors.blush} opacity={blushOpacity} />

      {/* Eyes — calm & open on inhale, friendly closed ᴗ curve on hold/exhale */}
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

      {/* Mouth — rounded "O" while inhaling */}
      <AnimatedEllipse cx={cx} cy={mouthY} rx={mouthORx} ry={mouthORy} fill={colors.ink} opacity={mouthOOpacity} />

      {/* Mouth — gentle closed smile on hold / exhale */}
      <AnimatedPath
        d={`M ${cx - mouthHalfWidth} ${mouthY} Q ${cx} ${mouthY + 16} ${cx + mouthHalfWidth} ${mouthY}`}
        stroke={colors.ink}
        strokeWidth={3}
        strokeLinecap="round"
        fill="none"
        opacity={smileOpacity}
      />
    </Svg>
  );
}
