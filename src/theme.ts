import { Platform } from 'react-native';

// Shared design tokens. v2 palette: lighter, airier background (closer to
// white, still warm — not a stark clinical white) with the green pulled back
// to a more delicate supporting role. `sage` is kept at its original depth
// specifically for buttons/text, where it needs to hold contrast against
// white; `sageWhisper` is the new, much softer green for decorative
// accents (aura, hairlines) where a bold color would fight the "quiet" goal.
export const colors = {
  sage: '#7c9885',
  sageLight: '#f2f6f2',
  sageWhisper: '#c3d4c7',
  sageDark: '#6a8674',
  sand: '#faf8f4',
  ink: '#2f3a33',
  inkSoft: '#5b665f',
  // Three separate pasted design briefs have each independently asked for a
  // lighter, more muted secondary-text tone in this same narrow band
  // (#78867F, #6A7B73, #809088, #65736D, #86948D, #7E8E86) — noticeably
  // softer than `inkSoft`. That's converged enough times to be a real
  // intent rather than one spec's noise, so — unlike the last couple of
  // rounds, where near-duplicate hex codes got mapped back onto the
  // existing palette to avoid drift — this one gets its own token. `mist`
  // is a rough center point of that cluster; `inkSoft` is untouched so
  // nothing that already uses it shifts.
  mist: '#7c8c84',
  warm: '#d98e6b',
  card: '#ffffff',
  blush: '#f2c4b3',
  success: '#5c8a5c',
  successLight: '#e5f0e5',
  hairline: '#e9eee9',
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

export const radius = {
  sm: 12,
  md: 16,
  lg: 20,
  xl: 24,
  pill: 999,
};

// Rounded system font across the app, per an earlier typography brief. Note
// the honest limit: RN's plain `fontFamily: 'System'` on iOS renders regular
// San Francisco, not the SF Pro Rounded design — true rounded glyphs need
// either a bundled font file or an undocumented private Apple font name
// (e.g. ".SFUIRounded-*"), and neither is worth the maintenance risk / font
// licensing question for an MVP. 'sans-serif-rounded' on Android is a real,
// public system family name and does render rounded there. So iOS keeps its
// normal (already fairly soft) system font for now — flagged here rather
// than silently shipping something that doesn't actually look rounded.
const FONT_FAMILY = Platform.select({
  ios: 'System',
  android: 'sans-serif-rounded',
  default: 'System',
});

// A small typed type-scale, per the latest "match top-tier mindfulness
// apps" brief — one object per role (eyebrow / hero headline / card title /
// body / caption / numeric) instead of every screen hand-rolling its own
// fontSize/weight/spacing. Spread a role into a component's own style
// object (`{ ...typography.cardTitle, marginTop: spacing.md }`) rather than
// setting each property by hand. Colors reuse the existing palette tokens
// (see the `mist` note above) instead of the brief's raw hex values, same
// reasoning as before: one palette, not several near-duplicate ones drifting
// apart across specs.
export const typography = {
  fontFamily: FONT_FAMILY,
  // Eyebrow's requested color has landed in the same muted cluster as
  // `mist` in every brief so far (#8A9A92 / #86948D / #8C9B93) — clearly not
  // the same thing as the saturated brand `sage`, so this switched from
  // `sage` to `mist` this round to actually match what's being asked for.
  eyebrow: {
    fontFamily: FONT_FAMILY,
    fontSize: 11,
    fontWeight: '500' as const,
    letterSpacing: 2.2,
    textTransform: 'uppercase' as const,
    color: colors.mist,
  },
  // Weight dropped from 600 -> 300 (Light) this round, per an explicit
  // "thin, light, minimalist, editorial" direction — a real stylistic
  // choice, not hex-drift, so it's followed as given rather than smoothed
  // over like the color duplicates.
  heroHeadline: {
    fontFamily: FONT_FAMILY,
    fontSize: 24,
    fontWeight: '300' as const,
    lineHeight: 34,
    letterSpacing: -0.3,
    color: colors.ink,
  },
  cardTitle: {
    fontFamily: FONT_FAMILY,
    fontSize: 18,
    fontWeight: '400' as const,
    color: colors.ink,
  },
  body: {
    fontFamily: FONT_FAMILY,
    fontSize: 14,
    fontWeight: '400' as const,
    lineHeight: 20,
    color: colors.mist,
  },
  caption: {
    fontFamily: FONT_FAMILY,
    fontSize: 12,
    fontWeight: '500' as const,
    color: colors.mist,
  },
  numeric: {
    fontVariant: ['tabular-nums' as const],
  },
};
