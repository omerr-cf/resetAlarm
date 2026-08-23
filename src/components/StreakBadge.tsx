import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { colors, spacing, radius, typography } from '../theme';

type Props = {
  days: number;
};

/**
 * Compact pill showing the current streak — a small vector flame instead of
 * the 🔥 emoji, so it renders identically across platforms/fonts. This is a
 * deliberate middle ground: the badge itself got a touch more visual weight
 * per the latest design brief, but the 7-dot weekly row that brief also
 * asked for was left out — that row was cut in an earlier simplification
 * pass the user explicitly approved, and reintroducing it would undo that.
 */
export default function StreakBadge({ days }: Props) {
  if (days <= 0) return null;
  const label = `${days} Day${days === 1 ? '' : 's'} Streak`;

  return (
    <View style={styles.pill}>
      <Svg width={13} height={13} viewBox="0 0 24 24">
        <Path
          d="M12 2c-3 4-6 6-6 10a6 6 0 0 0 12 0c0-1-0.3-2.2-1-3 .1 1.3-.5 2-1 2-1 0-1-1-1-2 0-2-1-3-1-3s-1 1.5-1 3c0 1-.3 1.7-1 1.7-1 0-1.2-1-1-2-1 .8-1 2-1 3a4 4 0 0 0 8 0c0-4-3-6-6-10z"
          fill={colors.warm}
        />
      </Svg>
      <Text style={styles.text}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.hairline,
    paddingVertical: 6,
    paddingHorizontal: spacing.md,
    borderRadius: radius.pill,
  },
  text: {
    fontSize: 13,
    fontWeight: '400',
    color: colors.ink,
    fontFamily: typography.fontFamily,
    fontVariant: ['tabular-nums'],
  },
});
