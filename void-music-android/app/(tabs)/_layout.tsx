import React from 'react';
import { Tabs } from 'expo-router';
import { View, StyleSheet, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { BottomTabBar, BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MiniPlayer } from '../../src/components/MiniPlayer';
import { useTheme } from '../../src/store/useThemeStore';

export default function TabLayout() {
  const { theme, themeId, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const isLuminous = themeId === 'luminous';
  const bottomInset = insets.bottom;
  const tabContentHeight = 56;
  const totalTabBarHeight = tabContentHeight + bottomInset;

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>

      <Tabs
        tabBar={(props: BottomTabBarProps) => (
          <View
            style={[
              styles.bottomAreaContainer,
              {
                backgroundColor: isLuminous
                  ? 'rgba(255, 255, 255, 0.45)'
                  : isDark
                  ? 'rgba(13, 15, 20, 0.88)'
                  : 'rgba(255, 255, 255, 0.88)',
                borderTopColor: isLuminous
                  ? 'rgba(255, 255, 255, 0.75)'
                  : theme.colors.border,
                borderTopWidth: 1,
              },
              isLuminous && styles.luminousFloatingDock,
            ]}
          >
            {isLuminous && (
              <BlurView
                intensity={24}
                tint="default"
                style={StyleSheet.absoluteFillObject}
              />
            )}
            <MiniPlayer />
            <BottomTabBar {...props} />
          </View>
        )}
        screenOptions={{
          headerShown: false,
          tabBarBackground: () => <View style={styles.transparentBg} />,
          tabBarStyle: {
            backgroundColor: 'transparent',
            borderTopWidth: 0,
            elevation: 0,
            shadowOpacity: 0,
            height: totalTabBarHeight,
            paddingBottom: bottomInset,
            paddingTop: 6,
          },
          tabBarActiveTintColor: theme.colors.accent,
          tabBarInactiveTintColor: theme.colors.textDim,
          tabBarLabelStyle: [styles.tabLabel, { fontFamily: theme.typography.mono }],
        }}
      >
        <Tabs.Screen
          name="index"
          options={{
            title: 'DISCOVER',
            tabBarIcon: ({ color, focused }) => (
              <Ionicons
                name={focused ? 'disc' : 'disc-outline'}
                size={22}
                color={color}
              />
            ),
          }}
        />
        <Tabs.Screen
          name="search"
          options={{
            title: 'SEARCH',
            tabBarIcon: ({ color, focused }) => (
              <Ionicons
                name={focused ? 'search' : 'search-outline'}
                size={22}
                color={color}
              />
            ),
          }}
        />
        <Tabs.Screen
          name="library"
          options={{
            title: 'VAULT',
            tabBarIcon: ({ color, focused }) => (
              <Ionicons
                name={focused ? 'library' : 'library-outline'}
                size={22}
                color={color}
              />
            ),
          }}
        />
      </Tabs>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  bottomAreaContainer: {
    overflow: 'hidden',
  },
  transparentBg: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  tabLabel: {
    fontSize: 10,
    letterSpacing: 1,
  },
  luminousFloatingDock: {
    ...Platform.select({
      ios: {
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: -8 },
        shadowOpacity: 0.06,
        shadowRadius: 16,
      },
      android: {
        elevation: 0,
      },
    }),
  },
});
