import React, { forwardRef } from 'react';
import { StyleProp, ViewStyle } from 'react-native';
import LottieView from 'lottie-react-native';

type ColorFilter = { keypath: string; color: string };

type Props = {
  source: any;
  speed: number;
  /** Square size in px — ignored if `style` is provided. */
  size?: number;
  /** Custom style, e.g. `{ width: '100%', height: '100%' }` for full-bleed. */
  style?: StyleProp<ViewStyle>;
  resizeMode?: 'cover' | 'contain' | 'center';
  /** Default true. Set false when the caller wants to drive playback itself
   * via a ref (e.g. to override a source file's own — sometimes wrong —
   * in/out points with an explicit play(start, end) call). */
  autoPlay?: boolean;
  loop?: boolean;
  /** Recolor layers by keypath (layer/group name in the source file) — a
   * post-render tint, not a semantic fill/stroke swap, so double-check it
   * visually on both platforms after wiring up a new source file. */
  colorFilters?: ColorFilter[];
  renderMode?: 'AUTOMATIC' | 'HARDWARE' | 'SOFTWARE';
};

/**
 * Thin wrapper around lottie-react-native for the companion candidates and
 * other one-off Lottie assets (e.g. the CTA button's ripple). These are
 * pre-baked loops with no phase awareness — `speed` is the main lever to
 * make them feel in sync with the app's breathing rhythm. See
 * lib/companions.ts for how `speed` is computed per companion file.
 *
 * Forwards a ref to the underlying LottieView so a caller can drive
 * playback imperatively (play/pause/reset) when the declarative
 * autoPlay/loop props aren't enough — see PulseCircleButton for why.
 */
const LottieCompanion = forwardRef<LottieView, Props>(function LottieCompanion(
  { source, speed, size, style, resizeMode = 'contain', autoPlay = true, loop = true, colorFilters, renderMode },
  ref
) {
  return (
    <LottieView
      ref={ref}
      source={source}
      autoPlay={autoPlay}
      loop={loop}
      speed={speed}
      style={style ?? { width: size ?? 180, height: size ?? 180 }}
      resizeMode={resizeMode}
      colorFilters={colorFilters}
      renderMode={renderMode}
    />
  );
});

export default LottieCompanion;
