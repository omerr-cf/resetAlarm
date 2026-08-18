# reset-alarm — starter prototype

A minimal Expo (React Native + TypeScript) app implementing the core loop we designed:
**Reset now → 90-second guided breathing → shareable result card**, plus a basic daily
reminder. This is a *prototype for validating the idea*, not a production alarm app — see
"What's intentionally NOT built yet" below before you show this to anyone as a finished product.

## What changed in v2

- Native wheel time picker (`@react-native-community/datetimepicker`, iOS spinner / Android
  clock dialog) with 1-minute granularity, replacing the +/- steppers.
- Fixed the "notification never arrives" issue: added an Android notification channel (missing
  before — Android silently drops unchanneled notifications), a "Next reminder: Today/Tomorrow
  at HH:MM" label so it's clear when it'll actually fire, and a "send a test notification in
  10s" button so you can verify delivery without waiting.
- New `BreathingCompanion` component — a simple SVG face (eyes + mouth) that opens on inhale and
  softly closes/smiles on hold+exhale, reused on the result card for visual consistency.
- Reframed as an anytime tool: quick presets (Morning / Midday slump / Wind-down) instead of a
  single "wake-up" time, plus a 7-day dot tracker on Home.
- See `product-roadmap-and-launch.md` (sent alongside this zip) for the full reasoning, the
  App Store publishing roadmap, and engagement/monetization thinking.

## ⚠️ Why this is pinned to Expo SDK 54

The first version of this starter used the newest SDK (57) — but Apple's App Store review for
the Expo Go client app has been running months behind Expo's SDK releases. As of this update,
the Expo Go app actually published on the App Store only supports **SDK 54** (v54.0.2, last
updated Sep 2025); SDK 55/56/57 all show "waiting on approval" with no committed date
([Expo's own changelog confirms this](https://expo.dev/changelog/expo-go-and-app-store-may-2026)).
That's exactly why you saw "Project is incompatible with this version of Expo Go" — the starter
code was newer than what your phone's Expo Go app (installed from the App Store) can run.

This version pins `expo` and every native-facing package to the exact versions Expo bundles
with SDK 54, so it matches the Expo Go app you can install normally from the App Store today.
If Apple approves a newer Expo Go version later and you want to move up, run
`npx expo install --fix` to re-align everything — just expect this same class of mismatch to
resurface occasionally as long as Apple's review queue lags Expo's release cadence.

## Run it

```bash
npm install
npx expo start
```

Scan the QR code with Expo Go on your phone (iOS/Android). No native build step needed —
everything here runs inside the standard Expo Go sandbox.

## What's in this prototype

- **`App.tsx`** — screen switcher (home → breathing → result). No navigation library on purpose;
  keep this simple until the flow is more than 3 screens.
- **`src/screens/HomeScreen.tsx`** — "Reset now" button (the fastest way to test the core loop
  yourself), a streak display, and a daily reminder time-picker (hour/±5min steppers, no extra
  date-picker dependency).
- **`src/screens/BreathingScreen.tsx`** — the 90-second guided cycle (4s inhale / 2s hold / 6s
  exhale, repeating), animated with the built-in `Animated` API (no Reanimated dependency needed
  for this). A skip button only appears after 15 seconds — soft commitment, not a hard trap.
- **`src/screens/ResultScreen.tsx`** — the completion card (streak + "90s" stat) rendered via
  `react-native-view-shot` so it can be captured as an image and shared through the native share
  sheet (`expo-sharing`). **This is the growth mechanism** — get this feeling good before anything
  else.
- **`src/lib/notifications.ts`** — schedules a daily local notification via `expo-notifications`
  that deep-links into the breathing screen when tapped.
- **`src/lib/storage.ts`** — a simple day-based streak counter in `AsyncStorage`.
- **`src/theme.ts`** — the sage/sand color palette carried over from the landing page.

## What's intentionally NOT built yet (read this before demoing to anyone)

1. **This is not an unmissable alarm.** `expo-notifications` gives you a normal notification —
   useful for testing whether people *want* the daily reset, but it won't ring through silent
   mode/Do Not Disturb or loop until dismissed the way Alarmy/a real alarm clock does. Getting
   that requires native work:
   - **iOS:** Apple's `AlarmKit` framework (iOS 26+), built exactly for this use case (critical
     alerts, ignores the silent switch, custom lock-screen UI). Needs an Expo config plugin or a
     dev client build — not available through Expo Go.
   - **Android:** `AlarmManager` + a foreground service with a full-screen intent (the same
     mechanism Google Clock/Alarmy use). Also native work, not pure JS.
   - Recommendation: don't build this yet. Validate the loop feels good and is shareable first
     (that's what this prototype is for), *then* invest in the real alarm engine once you know
     people want it.
2. **No accounts, no backend, no paywall.** Everything is local/on-device. Add these only after
   the core loop tests well.
3. **No App Store/Play Store submission setup.** This runs via Expo Go for now. Shipping to the
   stores needs `eas build` and store listings — a later step. Note that a store-shipped app
   would use a **development build**, not Expo Go, so the SDK-mismatch issue above only matters
   for this local-testing phase.

## Suggested next steps

1. Run this on your own phone for a week. Does the breathing screen feel calming or annoying?
   Is the share card something you'd actually post?
2. Show it to 5-10 people from the communities we identified in the market research (anxious/
   burned-out knowledge workers). Watch them use it once, unprompted — don't explain it first.
3. Only once that feels right: start the native alarm-engine work (AlarmKit / AlarmManager) and
   revisit the MVP scope doc for the paywall/store-launch phase.
