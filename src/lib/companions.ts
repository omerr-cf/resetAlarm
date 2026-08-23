/**
 * Registry of selectable "breathing companions" — three free Lottie
 * templates the user found and compared side by side via the swipe picker
 * (see components/CompanionPicker.tsx). The original hand-built SVG face
 * (BreathingCompanion.tsx) has been retired per user feedback — after
 * comparing all four live, the Lottie options (especially "Bloom") read as
 * more calming, so we standardized on Lottie-only going forward.
 *
 * The app's breathing cycle is a fixed 4s inhale + 2s hold + 6s exhale =
 * 12s loop (see BreathingScreen.tsx). Each Lottie file has its own native
 * frame rate / duration, so `speed` rescales its native loop to also take
 * ~12s — every companion breathes at the same real-world pace no matter
 * which one is picked. (`speed` on lottie-react-native's player means
 * "play the native-length animation `speed`x faster", so
 * speed = nativeDurationSeconds / targetDurationSeconds.)
 */

export type CompanionStyleId = 'flower' | 'pacer' | 'sloth';

export type CompanionOption = {
  id: CompanionStyleId;
  label: string;
  source: any;
  speed: number;
};

const CYCLE_SEC = 12;

// Durations below are computed from each file's own `fr` (frame rate) and
// `op` (out point, in frames): durationSeconds = op / fr. Confirmed via
// direct inspection of each JSON's root fields.
const FLOWER_DURATION_SEC = 1199 / 90; // ~13.32s
const PACER_DURATION_SEC = 421.000017147681 / 29.9700012207031; // ~14.05s
const SLOTH_DURATION_SEC = 184 / 60; // exactly ~3.0667s

export const COMPANION_OPTIONS: CompanionOption[] = [
  {
    id: 'flower',
    label: 'Bloom',
    source: require('../../assets/lottie/breathing_flower.json'),
    speed: FLOWER_DURATION_SEC / CYCLE_SEC, // ~1.11x
  },
  {
    id: 'pacer',
    label: 'Pacer',
    source: require('../../assets/lottie/pacer_breathe.json'),
    speed: PACER_DURATION_SEC / CYCLE_SEC, // ~1.17x
  },
  {
    id: 'sloth',
    label: 'Sloth',
    source: require('../../assets/lottie/sloth_meditate.json'),
    speed: SLOTH_DURATION_SEC / CYCLE_SEC, // ~0.2556x — its native ~3.07s loop stretched to 12s
  },
];

export function getCompanionOption(id: CompanionStyleId): CompanionOption {
  return COMPANION_OPTIONS.find((o) => o.id === id) ?? COMPANION_OPTIONS[0];
}
