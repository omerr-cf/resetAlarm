import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, Pressable, Share } from 'react-native';
import ViewShot from 'react-native-view-shot';
import * as Sharing from 'expo-sharing';
import { colors, spacing, radius } from '../theme';
import LottieCompanion from '../components/LottieCompanion';
import { getCompanionOption, CompanionStyleId } from '../lib/companions';
import { getCompanionStyle, incrementUsageStat } from '../lib/storage';

type Props = {
  streak: number;
  onDone: () => void;
};

export default function ResultScreen({ streak, onDone }: Props) {
  const shotRef = useRef<ViewShot>(null);
  const [sharing, setSharing] = useState(false);
  const [companionId, setCompanionId] = useState<CompanionStyleId>('flower');

  useEffect(() => {
    getCompanionStyle().then(setCompanionId);
  }, []);

  const companionOption = getCompanionOption(companionId);

  async function handleShare() {
    // Count the tap itself, not whether the OS share sheet was completed —
    // "wanted to share" is the signal the MVP plan cares about (≥30% target).
    incrementUsageStat('shareTapped').catch(() => {});
    try {
      setSharing(true);
      const uri = await shotRef.current?.capture?.();
      if (!uri) return;

      const canShareFile = await Sharing.isAvailableAsync();
      if (canShareFile) {
        await Sharing.shareAsync(uri);
      } else {
        // Fallback for platforms without the native share sheet available
        await Share.share({ message: '90 seconds for myself. 🌿' });
      }
    } catch (err) {
      console.warn('Share failed', err);
    } finally {
      setSharing(false);
    }
  }

  return (
    <View style={styles.container}>
      {/* Quiet completion — no "Congratulations!", no achievement framing.
          Just a small, still moment, then the artifact. */}
      <ViewShot ref={shotRef} options={{ format: 'png', quality: 1 }} style={styles.cardWrap}>
        <View style={styles.card}>
          <LottieCompanion source={companionOption.source} speed={companionOption.speed} size={80} />
          <Text style={styles.eyebrow}>RESET</Text>
          <Text style={styles.title}>90 seconds{'\n'}for yourself.</Text>
          {streak > 0 && <Text style={styles.streak}>🔥 {streak}</Text>}
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
  card: {
    width: 280,
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    paddingVertical: spacing.xxl,
    paddingHorizontal: spacing.xl,
    alignItems: 'center',
    shadowColor: colors.ink,
    shadowOpacity: 0.08,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 6 },
  },
  eyebrow: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.sage,
    letterSpacing: 2,
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
  },
  title: {
    fontSize: 24,
    fontWeight: '600',
    color: colors.ink,
    textAlign: 'center',
    lineHeight: 32,
  },
  streak: {
    fontSize: 13,
    color: colors.inkSoft,
    marginTop: spacing.lg,
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
