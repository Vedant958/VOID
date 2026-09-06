# VOID Music (Android)

Dedicated music streaming app for VOID with a cyberpunk HUD interface, native background playback, and Last.fm smart recommendations.

## Prerequisites & Installation

```bash
cd void-music-android
npm install
```

## Running the App

Because `react-native-track-player` and `react-native-mmkv` contain custom native Android code, building a development build or APK is recommended:

```bash
# To build development APK with EAS:
npx eas-cli build --platform android --profile development

# Or locally with Android Studio / Android SDK installed:
npx expo run:android
```
