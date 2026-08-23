/**
 * Shared shape for the Home -> Breathing "circle expansion" transition.
 * Captured via View.measureInWindow() on the CTA circle at the moment it's
 * tapped, so the transition overlay can start exactly where the real
 * button was instead of a generic screen-center guess.
 */
export type ButtonOrigin = {
  x: number;
  y: number;
  width: number;
  height: number;
};
