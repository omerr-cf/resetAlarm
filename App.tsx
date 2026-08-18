import React, { useEffect, useRef, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import * as Notifications from 'expo-notifications';
import HomeScreen from './src/screens/HomeScreen';
import BreathingScreen from './src/screens/BreathingScreen';
import ResultScreen from './src/screens/ResultScreen';
import { recordCompletion } from './src/lib/storage';
import { ensureAndroidChannel } from './src/lib/notifications';

type Screen = 'home' | 'breathing' | 'result';

export default function App() {
  const [screen, setScreen] = useState<Screen>('home');
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

  // Deep-link: tapping the scheduled reminder notification jumps straight
  // into the breathing flow, same as tapping "Reset now" would.
  useEffect(() => {
    responseListener.current = Notifications.addNotificationResponseReceivedListener((response) => {
      const targetScreen = response.notification.request.content.data?.screen;
      if (targetScreen === 'breathing') {
        setScreen('breathing');
      }
    });
    return () => {
      responseListener.current?.remove();
    };
  }, []);

  async function handleBreathingComplete() {
    const newStreak = await recordCompletion();
    setStreak(newStreak);
    setScreen('result');
  }

  return (
    <>
      {screen === 'home' && <HomeScreen onStartReset={() => setScreen('breathing')} />}
      {screen === 'breathing' && (
        <BreathingScreen onComplete={handleBreathingComplete} onExit={() => setScreen('home')} />
      )}
      {screen === 'result' && <ResultScreen streak={streak} onDone={() => setScreen('home')} />}
      <StatusBar style="dark" />
    </>
  );
}
