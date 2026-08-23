import React from 'react';
import { StyleProp, ViewStyle } from 'react-native';
import LottieView from 'lottie-react-native';

type Props = {
  source: any;
  speed: number;
  /** Square size in px — ignored if `style` is provided. */
  size?: number;
  /** Custom style, e.g. `{ width: '100%', height: '100%' }` for full-bleed. */
  style?: StyleProp<ViewStyle>;
  resizeMode?: 'cover' | 'contain' | 'center';
};

/**
 * Thin wrapper around lottie-react-native for the companion candidates.
 * These are pre-baked loops with no phase awareness — `speed` is the only
 * lever we have to make them feel in sync with the app's breathing rhythm.
 * See lib/companions.ts for how `speed` is computed per file.
 */
export default function LottieCompanion({ source, speed, size, style, resizeMode = 'contain' }: Props) {
  return (
    <LottieView
      source={source}
      autoPlay
      loop
      speed={speed}
      style={style ?? { width: size ?? 180, height: size ?? 180 }}
      resizeMode={resizeMode}
    />
  );
}
