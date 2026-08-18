import React, { useEffect, useRef } from 'react';
import { Animated } from 'react-native';
import Svg, { Circle, Ellipse, Path } from 'react-native-svg';
import { colors } from '../theme';

/**
 * A minimal "breathing companion" — not a mascot with a backstory, just a
 * soft, sophisticated face that visibly breathes with the user. Design
 * rationale (from research on Finch/Duolingo/Yazio-style character design):
 * keep it to one simple shape + a couple of expressions rather than a full
 * illustrated character — the goal is a calm presence, not cuteness.
 *
 * - Eyes: soft ellipses that ease shut on "hold" and reopen on "inhale".
 * - Mouth: cross-fades between a neutral line (inhale) and a gentle closed
 *   smile (hold/exhale) — a small but real emotional cue.
 * - Body: the existing scale animation from the parent still drives the
 *   overall size; this component only owns the face.
 */

const AnimatedEllipse = Animated.createAnimatedComponent(Ellipse);
const AnimatedPath = Animated.createAnimatedComponent(Path);

export type BreathingCompanionPhase = 'inhale' | 'hold' | 'exhale';

type Props = {
  phase: BreathingCompanionPhase;
  size?: number;
};

export default function BreathingCompanion({ phase, size = 180 }: Props) {
  const eyeOpen = useRef(new Animated.Value(1)).current; // 1 = open, 0 = softly closed
  const smile = useRef(new Animated.Value(0)).current; // 0 = neutral mouth, 1 = smiling mouth

  useEffect(() => {
    const closingPhase = phase === 'hold' || phase === 'exhale';
    Animated.timing(eyeOpen, {
      toValue: closingPhase ? 0.15 : 1,
      duration: 900,
      useNativeDriver: false, // animating SVG props, not transforms
    }).start();
    Animated.timing(smile, {
      toValue: closingPhase ? 1 : 0,
      duration: 900,
      useNativeDriver: false,
    }).start();
  }, [phase, eyeOpen, smile]);

  const eyeRy = eyeOpen.interpolate({ inputRange: [0, 1], outputRange: [1.5, 7] });
  const neutralMouthOpacity = smile.interpolate({ inputRange: [0, 1], outputRange: [1, 0] });
  const smileMouthOpacity = smile;

  const cx = size / 2;
  const cy = size / 2;
  const eyeOffsetX = size * 0.16;
  const eyeY = size * 0.44;
  const eyeRx = size * 0.045;
  const mouthY = size * 0.6;
  const mouthHalfWidth = size * 0.11;

  return (
    <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <Circle cx={cx} cy={cy} r={size / 2 - 2} fill={colors.sageLight} stroke={colors.sage} strokeWidth={2} />

      {/* Eyes */}
      <AnimatedEllipse
        cx={cx - eyeOffsetX}
        cy={eyeY}
        rx={eyeRx}
        ry={eyeRy}
        fill={colors.ink}
      />
      <AnimatedEllipse
        cx={cx + eyeOffsetX}
        cy={eyeY}
        rx={eyeRx}
        ry={eyeRy}
        fill={colors.ink}
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
