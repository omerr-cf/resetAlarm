import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { colors, spacing, radius, typography } from '../theme';

type Props = {
  reminderValueLabel: string; // e.g. "13:00" or "Off"
  reminderIsSet: boolean; // true -> render the value as a tinted time pill
  onPressReminder: () => void;
  companionLabel: string; // e.g. "Bloom"
  onPressCompanion: () => void;
};

/**
 * "Daily reminder" and "Companion" grouped into one rounded card with a
 * hairline divider, iOS-Settings-style, instead of two separate bordered
 * rows with a gap between them.
 */
export default function HomeActionTiles({
  reminderValueLabel,
  reminderIsSet,
  onPressReminder,
  companionLabel,
  onPressCompanion,
}: Props) {
  return (
    <View style={styles.card}>
      <Pressable style={styles.row} onPress={onPressReminder}>
        <Text style={styles.rowLabel}>Daily reminder</Text>
        <View style={styles.rowRight}>
          {reminderIsSet ? (
            <View style={styles.timePill}>
              <Text style={styles.timePillText}>{reminderValueLabel}</Text>
            </View>
          ) : (
            <Text style={styles.rowValue}>{reminderValueLabel}</Text>
          )}
          <Text style={styles.chevron}>›</Text>
        </View>
      </Pressable>

      <View style={styles.divider} />

      <Pressable style={styles.row} onPress={onPressCompanion}>
        <Text style={styles.rowLabel}>Companion</Text>
        <View style={styles.rowRight}>
          <Text style={styles.rowValue}>{companionLabel}</Text>
          <Text style={styles.chevron}>›</Text>
        </View>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    width: '100%',
    maxWidth: 320,
    backgroundColor: colors.card,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.hairline,
    overflow: 'hidden',
    marginTop: spacing.sm,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.md,
    paddingHorizontal: 18,
  },
  rowLabel: {
    fontSize: 15,
    fontWeight: '400',
    color: colors.ink,
    fontFamily: typography.fontFamily,
  },
  rowRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  rowValue: {
    fontSize: 15,
    fontWeight: '300',
    color: colors.inkSoft,
    fontFamily: typography.fontFamily,
  },
  timePill: {
    backgroundColor: colors.sageLight,
    paddingVertical: 3,
    paddingHorizontal: 10,
    borderRadius: radius.pill,
  },
  timePillText: {
    // Kept a bit heavier (500, not the 300/400 used elsewhere) — this is a
    // small colored pill, and tabular digits at low weight on a light-tint
    // background start to lose contrast/legibility. Everywhere else follows
    // the light direction; this one spot keeps just enough weight to stay
    // readable.
    fontSize: 13,
    fontWeight: '500',
    color: colors.sageDark,
    fontVariant: ['tabular-nums'],
    fontFamily: typography.fontFamily,
  },
  chevron: {
    fontSize: 15,
    color: colors.inkSoft,
    opacity: 0.55,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.hairline,
    marginHorizontal: 18,
  },
});
