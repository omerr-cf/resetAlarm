import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Modal,
  ScrollView,
  Dimensions,
  NativeSyntheticEvent,
  NativeScrollEvent,
} from 'react-native';
import { colors, spacing, radius } from '../theme';
import LottieCompanion from './LottieCompanion';
import { COMPANION_OPTIONS, CompanionStyleId } from '../lib/companions';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

type Props = {
  visible: boolean;
  selected: CompanionStyleId;
  onSelect: (id: CompanionStyleId) => void;
  onClose: () => void;
};

export default function CompanionPicker({ visible, selected, onSelect, onClose }: Props) {
  const initialIndex = Math.max(
    0,
    COMPANION_OPTIONS.findIndex((o) => o.id === selected)
  );
  const [pageIndex, setPageIndex] = useState(initialIndex);
  const scrollRef = useRef<ScrollView>(null);

  useEffect(() => {
    if (!visible) return;
    const idx = Math.max(
      0,
      COMPANION_OPTIONS.findIndex((o) => o.id === selected)
    );
    setPageIndex(idx);
    const frame = requestAnimationFrame(() => {
      scrollRef.current?.scrollTo({ x: idx * SCREEN_WIDTH, animated: false });
    });
    return () => cancelAnimationFrame(frame);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  function handleMomentumEnd(e: NativeSyntheticEvent<NativeScrollEvent>) {
    const idx = Math.round(e.nativeEvent.contentOffset.x / SCREEN_WIDTH);
    setPageIndex(idx);
  }

  const current = COMPANION_OPTIONS[pageIndex];
  const isCurrentSelected = current.id === selected;

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={styles.container}>
        <Pressable onPress={onClose} hitSlop={12} style={styles.closeBtn}>
          <Text style={styles.closeBtnText}>Close</Text>
        </Pressable>

        <Text style={styles.eyebrow}>CHOOSE YOUR COMPANION</Text>

        <ScrollView
          ref={scrollRef}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onMomentumScrollEnd={handleMomentumEnd}
          style={styles.pager}
        >
          {COMPANION_OPTIONS.map((option) => (
            <View key={option.id} style={[styles.page, { width: SCREEN_WIDTH }]}>
              <View style={styles.previewWrap}>
                <LottieCompanion source={option.source} speed={option.speed} size={220} />
              </View>
              <Text style={styles.optionLabel}>{option.label}</Text>
            </View>
          ))}
        </ScrollView>

        <View style={styles.dots}>
          {COMPANION_OPTIONS.map((option, i) => (
            <View key={option.id} style={[styles.dot, i === pageIndex && styles.dotActive]} />
          ))}
        </View>

        <Pressable
          style={[styles.selectBtn, isCurrentSelected && styles.selectBtnCurrent]}
          onPress={() => onSelect(current.id)}
          disabled={isCurrentSelected}
        >
          <Text style={styles.selectBtnText}>
            {isCurrentSelected ? 'Currently selected' : `Use ${current.label}`}
          </Text>
        </Pressable>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.sand,
    alignItems: 'center',
    paddingTop: 64,
    paddingBottom: spacing.xl,
  },
  closeBtn: {
    position: 'absolute',
    top: 56,
    right: spacing.lg,
    zIndex: 1,
    padding: spacing.xs,
  },
  closeBtnText: {
    fontSize: 14,
    color: colors.inkSoft,
    opacity: 0.8,
  },
  eyebrow: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.sage,
    letterSpacing: 2,
    marginBottom: spacing.xl,
  },
  pager: {
    flexGrow: 0,
  },
  page: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
  },
  previewWrap: {
    width: 240,
    height: 240,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
  },
  optionLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.ink,
  },
  dots: {
    flexDirection: 'row',
    gap: 6,
    marginTop: spacing.xl,
    marginBottom: spacing.xl,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.hairline,
  },
  dotActive: {
    backgroundColor: colors.sage,
    width: 16,
  },
  selectBtn: {
    backgroundColor: colors.sage,
    paddingVertical: 14,
    paddingHorizontal: spacing.xxl,
    borderRadius: radius.md,
  },
  selectBtnCurrent: {
    backgroundColor: colors.sageDark,
    opacity: 0.6,
  },
  selectBtnText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 15,
  },
});
