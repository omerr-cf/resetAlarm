import React, { useRef, useState } from 'react';
import { View, Text, StyleSheet, Pressable, Share } from 'react-native';
import ViewShot from 'react-native-view-shot';
import * as Sharing from 'expo-sharing';
import { colors, spacing, radius } from '../theme';
import BreathingCompanion from '../components/BreathingCompanion';

type Props = {
  streak: number;
  onDone: () => void;
};

export default function ResultScreen({ streak, onDone }: Props) {
  const shotRef = useRef<ViewShot>(null);
  const [sharing, setSharing] = useState(false);

  async function handleShare() {
    try {
      setSharing(true);
      const uri = await shotRef.current?.capture?.();
      if (!uri) return;

      const canShareFile = await Sharing.isAvailableAsync();
      if (canShareFile) {
        await Sharing.shareAsync(uri);
      } else {
        // Fallback for platforms without the native share sheet available
        await Share.share({ message: 'I just did a 90-second nervous system reset 🌿' });
      }
    } catch (err) {
      console.warn('Share failed', err);
    } finally {
      setSharing(false);
    }
  }

  return (
    <View style={styles.container}>
      <ViewShot ref={shotRef} options={{ format: 'png', quality: 1 }} style={styles.cardWrap}>
        <View style={styles.card}>
          <View style={styles.companionWrap}>
            <BreathingCompanion phase="hold" size={72} />
          </View>
          <Text style={styles.badge}>90-SECOND RESET · COMPLETE</Text>
          <Text style={styles.title}>Nervous system: calmer ✓</Text>
          <View style={styles.metricsRow}>
            <View style={styles.metric}>
              <Text style={styles.metricValue}>{streak}</Text>
              <Text style={styles.metricLabel}>day streak</Text>
            </View>
            <View style={styles.metric}>
              <Text style={styles.metricValue}>90s</Text>
              <Text style={styles.metricLabel}>total time</Text>
            </View>
          </View>
          <Text style={styles.footer}>reset-alarm</Text>
        </View>
      </ViewShot>

      <Pressable style={styles.shareBtn} onPress={handleShare} disabled={sharing}>
        <Text style={styles.shareBtnText}>{sharing ? 'Preparing…' : 'Share this'}</Text>
      </Pressable>

      <Pressable onPress={onDone} hitSlop={12}>
        <Text style={styles.done}>Done</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.sand,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  cardWrap: {
    marginBottom: spacing.xl,
  },
  companionWrap: {
    marginBottom: spacing.sm,
  },
  card: {
    width: 280,
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    padding: spacing.xl,
    alignItems: 'center',
    shadowColor: colors.ink,
    shadowOpacity: 0.1,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 4 },
  },
  badge: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.sage,
    letterSpacing: 0.6,
    marginBottom: spacing.sm,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.ink,
    marginBottom: spacing.lg,
    textAlign: 'center',
  },
  metricsRow: {
    flexDirection: 'row',
    gap: spacing.xl,
    marginBottom: spacing.md,
  },
  metric: {
    alignItems: 'center',
  },
  metricValue: {
    fontSize: 26,
    fontWeight: '700',
    color: colors.ink,
  },
  metricLabel: {
    fontSize: 11,
    color: colors.inkSoft,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  footer: {
    fontSize: 10,
    color: colors.inkSoft,
    marginTop: spacing.sm,
  },
  shareBtn: {
    backgroundColor: colors.sage,
    paddingVertical: 14,
    paddingHorizontal: spacing.xl,
    borderRadius: radius.md,
    marginBottom: spacing.lg,
  },
  shareBtnText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 16,
  },
  done: {
    fontSize: 14,
    color: colors.inkSoft,
    textDecorationLine: 'underline',
  },
});
