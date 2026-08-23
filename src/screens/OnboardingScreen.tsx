import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { colors, spacing, radius } from '../theme';
import LottieCompanion from '../components/LottieCompanion';
import { getCompanionOption, CompanionStyleId } from '../lib/companions';
import { getCompanionStyle } from '../lib/storage';

type Props = {
  onContinue: () => void;
};

/**
 * A single, one-time "meet your companion" screen shown the very first time
 * the app opens (see App.tsx / storage.getHasSeenOnboarding). Deliberately
 * just one screen, not a multi-step tour — the companion is the whole
 * pitch, so it gets the whole screen and one line of copy.
 */
export default function OnboardingScreen({ onContinue }: Props) {
  const [companionId, setCompanionId] = useState<CompanionStyleId>('flower');

  useEffect(() => {
    getCompanionStyle().then(setCompanionId);
  }, []);

  const companionOption = getCompanionOption(companionId);

  return (
    <View style={styles.container}>
      <View style={styles.companionWrap}>
        <LottieCompanion source={companionOption.source} speed={companionOption.speed} size={220} />
      </View>

      <Text style={styles.title}>Meet your companion.</Text>
      <Text style={styles.subtitle}>It breathes with you, every time you reset.</Text>

      <Pressable style={styles.button} onPress={onContinue}>
        <Text style={styles.buttonText}>Get started</Text>
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
    paddingHorizontal: spacing.xl,
  },
  companionWrap: {
    width: 220,
    height: 220,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xl,
  },
  title: {
    fontSize: 22,
    fontWeight: '600',
    color: colors.ink,
    textAlign: 'center',
    marginBottom: spacing.xs,
  },
  subtitle: {
    fontSize: 14,
    color: colors.inkSoft,
    textAlign: 'center',
    marginBottom: spacing.xxl,
  },
  button: {
    backgroundColor: colors.sage,
    paddingVertical: 16,
    paddingHorizontal: spacing.xxl,
    borderRadius: radius.md,
  },
  buttonText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 16,
  },
});
