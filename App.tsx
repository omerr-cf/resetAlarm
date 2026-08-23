import React, { useEffect, useRef, useState } from 'react';
import { Animated, Dimensions, Easing, StyleSheet, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import * as Haptics from 'expo-haptics';
import * as Notifications from 'expo-notifications';
import HomeScreen from './src/screens/HomeScreen';
import BreathingScreen from './src/screens/BreathingScreen';
import ResultScreen from './src/screens/ResultScreen';
import OnboardingScreen from './src/screens/OnboardingScreen';
import { recordCompletion, getStreak, getHasSeenOnboarding, setHasSeenOnboarding, incrementUsageStat } from './src/lib/storage';
import { ensureAndroidChannel } from './src/lib/notifications';
import { ButtonOrigin } from './src/lib/transition';
import { colors } from './src/theme';

type Screen = 'onboarding' | 'home' | 'breathing' | 'result';

export default function App() {
  // Starts null (not yet decided) while we check whether onboarding has
  // already been shown on this device, so we never flash "home" for a
  // frame before redirecting to "onboarding" on a first-ever launch.
  const [screen, setScreen] = useState<Screen | null>(null);
  const [streak, setStreak] = useState(0);
  const [previousStreak, setPreviousStreak] = useState(0);
  const responseListener = useRef<ReturnType<
    typeof Notifications.addNotificationResponseReceivedListener
  > | null>(null);

  // "Circle expansion" transition, Home -> Breathing: a full-screen overlay,
  // shaped and positioned via transforms only (no layout animation, so it
  // stays on the native driver / 60fps), that starts exactly where the
  // PulseCircleButton was tapped and grows to cover the screen — then the
  // real screen swap happens underneath it, and it fades away to reveal the
  // BreathingScreen's own full-bleed companion. Not a true cross-component
  // "shared element" (this app has no navigation library to hook one into),
  // but it reads the same way: the button becomes the next screen.
  const [transitionVisible, setTransitionVisible] = useState(false);
  const [transitionOrigin, setTransitionOrigin] = useState<ButtonOrigin | null>(null);
  const transitionProgress = useRef(new Animated.Value(0)).current;
  const transitionOpacity = useRef(new Animated.Value(0)).current;

  // Android 8+ needs a notification channel to exist before anything can be
  // posted to it — do this once, up front, regardless of whether the user
  // ever sets a reminder.
  useEffect(() => {
    ensureAndroidChannel();
  }, []);

  useEffect(() => {
    getHasSeenOnboarding().then((seen) => setScreen(seen ? 'home' : 'onboarding'));
  }, []);

  // Deep-link: tapping the scheduled reminder notification jumps straight
  // into the breathing flow, same as tapping "Reset now" would. No circle
  // origin to animate from here, so it's a plain instant swap.
  useEffect(() => {
    responseListener.current = Notifications.addNotificationResponseReceivedListener((response) => {
      const targetScreen = response.notification.request.content.data?.screen;
      if (targetScreen === 'breathing') {
        incrementUsageStat('sessionsStarted').catch(() => {});
        setScreen('breathing');
      }
    });
    return () => {
      responseListener.current?.remove();
    };
  }, []);

  function handleOnboardingContinue() {
    setHasSeenOnboarding().catch(() => {});
    setScreen('home');
  }

  function handleStartReset(origin?: ButtonOrigin) {
    incrementUsageStat('sessionsStarted').catch(() => {});

    const { width: screenW, height: screenH } = Dimensions.get('window');
    const fallbackSize = 152;
    const resolvedOrigin: ButtonOrigin = origin ?? {
      x: screenW / 2 - fallbackSize / 2,
      y: screenH / 2 - fallbackSize / 2,
      width: fallbackSize,
      height: fallbackSize,
    };

    setTransitionOrigin(resolvedOrigin);
    setTransitionVisible(true);
    transitionProgress.setValue(0);
    transitionOpacity.setValue(1);

    Animated.timing(transitionProgress, {
      toValue: 1,
      duration: 520,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start(() => {
      setScreen('breathing');
      // Small pause so BreathingScreen's own companion has a frame to
      // mount underneath before the overlay reveals it.
      Animated.timing(transitionOpacity, {
        toValue: 0,
        duration: 260,
        delay: 60,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }).start(() => {
        setTransitionVisible(false);
      });
    });
  }

  function handleBreathingExit() {
    incrementUsageStat('sessionsExitedEarly').catch(() => {});
    setScreen('home');
  }

  async function handleBreathingComplete() {
    incrementUsageStat('sessionsCompleted').catch(() => {});
    const priorStreak = await getStreak();
    const newStreak = await recordCompletion();
    setPreviousStreak(priorStreak);
    setStreak(newStreak);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    setScreen('result');
  }

  if (screen === null) {
    // Still checking onboarding status — a blank themed frame is less
    // jarring than a flash of the wrong screen.
    return <View style={{ flex: 1, backgroundColor: colors.sand }} />;
  }

  // Transform-only expansion: the overlay's own box is a large fixed circle
  // centered on the screen; translate + scale make it *look* like it starts
  // as a small circle at the button's position, then grows to its natural
  // (screen-covering) size and position. Keeps everything on the native
  // driver — no width/height/layout animation involved.
  let transitionStyle: any = null;
  if (transitionOrigin) {
    const { width: screenW, height: screenH } = Dimensions.get('window');
    const baseSize = Math.sqrt(screenW * screenW + screenH * screenH) * 1.05;
    const originCenterX = transitionOrigin.x + transitionOrigin.width / 2;
    const originCenterY = transitionOrigin.y + transitionOrigin.height / 2;
    const screenCenterX = screenW / 2;
    const screenCenterY = screenH / 2;
    const initialScale = transitionOrigin.width / baseSize;

    transitionStyle = {
      width: baseSize,
      height: baseSize,
      borderRadius: baseSize / 2,
      left: screenCenterX - baseSize / 2,
      top: screenCenterY - baseSize / 2,
      opacity: transitionOpacity,
      transform: [
        {
          translateX: transitionProgress.interpolate({
            inputRange: [0, 1],
            outputRange: [originCenterX - screenCenterX, 0],
          }),
        },
        {
          translateY: transitionProgress.interpolate({
            inputRange: [0, 1],
            outputRange: [originCenterY - screenCenterY, 0],
          }),
        },
        {
          scale: transitionProgress.interpolate({
            inputRange: [0, 1],
            outputRange: [initialScale, 1],
          }),
        },
      ],
    };
  }

  return (
    <>
      {screen === 'onboarding' && <OnboardingScreen onContinue={handleOnboardingContinue} />}
      {screen === 'home' && <HomeScreen onStartReset={handleStartReset} />}
      {screen === 'breathing' && (
        <BreathingScreen onComplete={handleBreathingComplete} onExit={handleBreathingExit} />
      )}
      {screen === 'result' && (
        <ResultScreen streak={streak} previousStreak={previousStreak} onDone={() => setScreen('home')} />
      )}

      {transitionVisible && transitionStyle && (
        <Animated.View pointerEvents="none" style={[styles.transitionCircle, transitionStyle]} />
      )}

      <StatusBar style="dark" />
    </>
  );
}

const styles = StyleSheet.create({
  transitionCircle: {
    position: 'absolute',
    backgroundColor: colors.sage,
  },
});
