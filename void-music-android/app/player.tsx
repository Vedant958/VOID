import React from 'react';
import { useRouter } from 'expo-router';
import { PlayerModal } from '../src/components/FullPlayer/PlayerModal';

export default function FullPlayerScreen() {
  const router = useRouter();

  return <PlayerModal onDismiss={() => router.back()} />;
}
