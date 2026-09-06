import React, { useEffect, useState } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { StyleSheet, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { setupTrackPlayer } from '../src/services/TrackPlayerService';
import { THEME } from '../src/constants/theme';
import { BootAnimation } from '../src/components/BootAnimation';

export default function RootLayout() {
  const [isBooting, setIsBooting] = useState(true);

  useEffect(() => {
    setupTrackPlayer().catch((err) => {
      console.warn('Initial TrackPlayer setup error:', err);
    });
  }, []);

  return (
    <SafeAreaProvider>
      <GestureHandlerRootView style={styles.container}>
        <StatusBar style="light" backgroundColor={THEME.colors.background} translucent={true} />
        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: THEME.colors.background },
            animation: 'fade',
          }}
        >
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen
            name="player"
            options={{
              presentation: 'modal',
              animation: 'slide_from_bottom',
              headerShown: false,
            }}
          />
        </Stack>
        {isBooting && <BootAnimation onFinish={() => setIsBooting(false)} />}
      </GestureHandlerRootView>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: THEME.colors.background,
  },
});
