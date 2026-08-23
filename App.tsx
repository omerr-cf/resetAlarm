import React, { useEffect, useRef, useState } from 'react';
import { View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import * as Notifications from 'expo-notifications';
import HomeScreen from './src/screens/HomeScreen';
import BreathingScreen from './src/screens/BreathingScreen';
import ResultScreen from './src/screens/ResultScreen';
import OnboardingScreen from './src/screens/OnboardingScreen';
import { recordCompletion, getHasSeenOnboarding, setHasSeenOnboarding, incrementUsageStat } from './src/lib/storage';
import { ensureAndroidChannel } from './src/lib/notifications';
import { colors } from './src/theme';

type Screen = 'onboarding' | 'home' | 'breathing' | 'result';

export default function App() {
  // Starts null (not yet decided) while we check whether onboarding has
  // already been shown on this device, so we never flash "home" for a
  // frame before redirecting to "onboarding" on a first-ever launch.
  const [screen, setScreen] = useState<Screen | null>(null);
  const [streak, setStreak] = useState(0);
  const responseListener = useRef<ReturnType<
    typeof Notifications.addNotificationResponseReceivedListener
  > | null>(null);

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
  // into the breathing flow, same as tapping "Reset now" would.
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

  function handleStartReset() {
    incrementUsageStat('sessionsStarted').catch(() => {});
    setScreen('breathing');
  }

  function handleBreathingExit() {
    incrementUsageStat('sessionsExitedEarly').catch(() => {});
    setScreen('home');
  }

  async function handleBreathingComplete() {
    incrementUsageStat('sessionsCompleted').catch(() => {});
    const newStreak = await recordCompletion();
    setStreak(newStreak);
    setScreen('result');
  }

  if (screen === null) {
    // Still checking onboarding status — a blank themed frame is less
    // jarring than a flash of the wrong screen.
    return <View style={{ flex: 1, backgroundColor: colors.sand }} />;
  }

  return (
    <>
      {screen === 'onboarding' && <OnboardingScreen onContinue={handleOnboardingContinue} />}
      {screen === 'home' && <HomeScreen onStartReset={handleStartReset} />}
      {screen === 'breathing' && (
        <BreathingScreen onComplete={handleBreathingComplete} onExit={handleBreathingExit} />
      )}
      {screen === 'result' && <ResultScreen streak={streak} onDone={() => setScreen('home')} />}
      <StatusBar style="dark" />
    </>
  );
}
