import React from 'react';
import { View, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { PlayerModal } from '../src/components/FullPlayer/PlayerModal';
import { useTheme } from '../src/store/useThemeStore';

export default function FullPlayerScreen() {
  const router = useRouter();
  const { theme } = useTheme();

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <PlayerModal onDismiss={() => router.back()} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
