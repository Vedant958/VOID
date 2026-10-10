import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  Switch,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme, ArtworkAura } from '../store/useThemeStore';
import { ThemeId, THEME_REGISTRY } from '../constants/theme';

interface AppearanceModalProps {
  visible: boolean;
  onClose: () => void;
}

interface ThemeCardData {
  id: ThemeId;
  title: string;
  badge: string;
  description: string;
  bgPreview: string;
  cardPreview: string;
  accentPreview: string;
  textPreview: string;
  borderPreview: string;
  isGlass?: boolean;
}

const THEME_OPTIONS: ThemeCardData[] = [
  {
    id: 'original',
    title: 'VOID ORIGINAL',
    badge: 'CYBER-TERMINAL // DARK',
    description: 'Deep obsidian OLED void with surgical synthetic emerald optics and high telemetry density.',
    bgPreview: '#050508',
    cardPreview: '#0d0f14',
    accentPreview: '#10b981',
    textPreview: '#f3f4f6',
    borderPreview: '#1f293d',
  },
  {
    id: 'light',
    title: 'VOID LIGHT',
    badge: 'CLINICAL LAB // DAYLIGHT',
    description: 'Crisp off-white workstation substrate with dark charcoal data and laboratory emerald triggers.',
    bgPreview: '#F8FAFC',
    cardPreview: '#FFFFFF',
    accentPreview: '#006C49',
    textPreview: '#0F172A',
    borderPreview: '#E2E8F0',
  },
  {
    id: 'luminous',
    title: 'VOID LUMINOUS',
    badge: 'WHITE GLASS // ADAPTIVE',
    description: 'Frosted white glassmorphism with album-art-adaptive ambient illumination and high-contrast telemetry.',
    bgPreview: '#EEF2F6',
    cardPreview: 'rgba(255, 255, 255, 0.88)',
    accentPreview: '#0D9488',
    textPreview: '#0F172A',
    borderPreview: 'rgba(255, 255, 255, 0.95)',
    isGlass: true,
  },
];

export const AppearanceModal: React.FC<AppearanceModalProps> = ({
  visible,
  onClose,
}) => {
  const {
    theme,
    themeId,
    setTheme,
    adaptiveLightingEnabled,
    setAdaptiveLightingEnabled,
    artworkAura,
  } = useTheme();

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <SafeAreaView
        style={[styles.container, { backgroundColor: theme.colors.background }]}
        edges={['top', 'bottom']}
      >
        {/* Header Bar */}
        <View style={[styles.header, { borderBottomColor: theme.colors.border }]}>
          <TouchableOpacity
            style={styles.closeBtn}
            onPress={onClose}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          >
            <Ionicons name="close" size={24} color={theme.colors.text} />
          </TouchableOpacity>
          <View style={styles.headerTitleContainer}>
            <Text style={[styles.terminalSlug, { color: theme.colors.accent }]}>
              SYSTEM CONFIG // APPEARANCE
            </Text>
            <Text style={[styles.headerTitle, { color: theme.colors.text }]}>
              THEME MATRIX
            </Text>
          </View>
          <View style={styles.headerRightSpacer} />
        </View>

        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <Text style={[styles.sectionSubtitle, { color: theme.colors.textMuted }]}>
            SELECT OPERATING PERSONALITY
          </Text>

          {/* Theme Selector Cards */}
          <View style={styles.cardsContainer}>
            {THEME_OPTIONS.map((item) => {
              const isSelected = themeId === item.id;
              return (
                <TouchableOpacity
                  key={item.id}
                  style={[
                    styles.themeCard,
                    {
                      backgroundColor: theme.colors.card,
                      borderColor: isSelected
                        ? theme.colors.accent
                        : theme.colors.border,
                    },
                    isSelected && styles.selectedCardGlow,
                  ]}
                  activeOpacity={0.8}
                  onPress={() => setTheme(item.id)}
                >
                  {/* Card Mini Preview Mockup */}
                  <View
                    style={[
                      styles.previewMockup,
                      {
                        backgroundColor: item.bgPreview,
                        borderColor: item.borderPreview,
                      },
                    ]}
                  >
                    {/* Simulated Miniature Header */}
                    <View
                      style={[
                        styles.mockupHeader,
                        { borderBottomColor: item.borderPreview },
                      ]}
                    >
                      <View
                        style={[
                          styles.mockupDot,
                          { backgroundColor: item.accentPreview },
                        ]}
                      />
                      <View
                        style={[
                          styles.mockupBar,
                          { backgroundColor: item.textPreview, width: 36 },
                        ]}
                      />
                    </View>

                    {/* Simulated Mini Card */}
                    <View
                      style={[
                        styles.mockupCard,
                        {
                          backgroundColor: item.cardPreview,
                          borderColor: item.borderPreview,
                        },
                      ]}
                    >
                      <View
                        style={[
                          styles.mockupThumb,
                          { backgroundColor: item.accentPreview },
                        ]}
                      />
                      <View style={styles.mockupTextLines}>
                        <View
                          style={[
                            styles.mockupBar,
                            { backgroundColor: item.textPreview, width: 48 },
                          ]}
                        />
                        <View
                          style={[
                            styles.mockupBar,
                            {
                              backgroundColor: item.accentPreview,
                              width: 28,
                              marginTop: 4,
                            },
                          ]}
                        />
                      </View>
                    </View>

                    {/* Luminous Glow Mockup Accent */}
                    {item.isGlass && (
                      <View
                        style={[
                          styles.glassGlowAccent,
                          {
                            backgroundColor:
                              artworkAura?.dominant || item.accentPreview,
                          },
                        ]}
                      />
                    )}
                  </View>

                  {/* Card Description & Info */}
                  <View style={styles.cardInfo}>
                    <View style={styles.cardHeaderRow}>
                      <Text
                        style={[
                          styles.cardBadge,
                          { color: isSelected ? theme.colors.accent : theme.colors.textMuted },
                        ]}
                      >
                        {item.badge}
                      </Text>
                      {isSelected ? (
                        <View
                          style={[
                            styles.activeBadge,
                            { backgroundColor: theme.colors.accentDim, borderColor: theme.colors.accent },
                          ]}
                        >
                          <Ionicons
                            name="checkmark-circle"
                            size={14}
                            color={theme.colors.accent}
                          />
                          <Text
                            style={[
                              styles.activeBadgeText,
                              { color: theme.colors.accent },
                            ]}
                          >
                            ACTIVE
                          </Text>
                        </View>
                      ) : (
                        <View
                          style={[
                            styles.inactiveRadio,
                            { borderColor: theme.colors.border },
                          ]}
                        />
                      )}
                    </View>

                    <Text
                      style={[
                        styles.cardTitle,
                        { color: isSelected ? theme.colors.accent : theme.colors.text },
                      ]}
                    >
                      {item.title}
                    </Text>

                    <Text
                      style={[
                        styles.cardDesc,
                        { color: theme.colors.textMuted },
                      ]}
                    >
                      {item.description}
                    </Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Luminous Adaptive Lighting Configuration */}
          <View
            style={[
              styles.settingsGroup,
              {
                backgroundColor: theme.colors.surface,
                borderColor: theme.colors.border,
              },
            ]}
          >
            <View style={styles.settingsRow}>
              <View style={styles.settingsTextCol}>
                <Text style={[styles.settingTitle, { color: theme.colors.text }]}>
                  ADAPTIVE ARTWORK LIGHTING
                </Text>
                <Text
                  style={[
                    styles.settingDesc,
                    { color: theme.colors.textMuted },
                  ]}
                >
                  Dynamically tint ambient illumination behind artwork and surfaces using colors derived from current track artwork across all themes.
                </Text>
              </View>
              <Switch
                value={adaptiveLightingEnabled}
                onValueChange={setAdaptiveLightingEnabled}
                trackColor={{
                  false: theme.colors.border,
                  true: theme.colors.accentDim,
                }}
                thumbColor={
                  adaptiveLightingEnabled
                    ? theme.colors.accent
                    : theme.colors.textDim
                }
              />
            </View>

            {/* Live Palette Feedback Indicator */}
            {adaptiveLightingEnabled && (
              <View
                style={[
                  styles.palettePreviewRow,
                  { borderTopColor: theme.colors.borderSubtle },
                ]}
              >
                <Text style={[styles.paletteLabel, { color: theme.colors.textMuted }]}>
                  ACTIVE AURA:
                </Text>
                <View style={styles.swatchRow}>
                  <View
                    style={[
                      styles.colorSwatch,
                      { backgroundColor: artworkAura.dominant },
                    ]}
                  />
                  <Text style={[styles.swatchText, { color: theme.colors.text }]}>
                    {artworkAura.dominant.toUpperCase()}
                  </Text>
                  <View
                    style={[
                      styles.colorSwatch,
                      { backgroundColor: artworkAura.secondary, marginLeft: 12 },
                    ]}
                  />
                  <Text style={[styles.swatchText, { color: theme.colors.text }]}>
                    {artworkAura.secondary.toUpperCase()}
                  </Text>
                </View>
              </View>
            )}
          </View>

          {/* System Telemetry Footer */}
          <View style={styles.footerTelemetry}>
            <Text style={[styles.telemetryText, { color: theme.colors.textDim }]}>
              VOID ARCHITECTURE // PERSISTENT STATE SAVED TO MMKV
            </Text>
          </View>
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  closeBtn: {
    padding: 6,
  },
  headerTitleContainer: {
    alignItems: 'center',
  },
  terminalSlug: {
    fontFamily: 'monospace',
    fontSize: 10,
    letterSpacing: 1.5,
    fontWeight: '700',
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginTop: 2,
  },
  headerRightSpacer: {
    width: 36,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  sectionSubtitle: {
    fontFamily: 'monospace',
    fontSize: 11,
    letterSpacing: 1.2,
    marginBottom: 16,
  },
  cardsContainer: {
    gap: 16,
  },
  themeCard: {
    borderRadius: 12,
    borderWidth: 1.5,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
  },
  selectedCardGlow: {
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 4,
  },
  previewMockup: {
    width: 90,
    height: 90,
    borderRadius: 8,
    borderWidth: 1,
    padding: 6,
    justifyContent: 'space-between',
    overflow: 'hidden',
    position: 'relative',
  },
  mockupHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingBottom: 4,
    borderBottomWidth: 0.5,
    gap: 4,
  },
  mockupDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  mockupCard: {
    borderRadius: 4,
    borderWidth: 0.5,
    padding: 4,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  mockupThumb: {
    width: 16,
    height: 16,
    borderRadius: 2,
  },
  mockupTextLines: {
    flex: 1,
  },
  mockupBar: {
    height: 4,
    borderRadius: 2,
  },
  glassGlowAccent: {
    position: 'absolute',
    bottom: -15,
    right: -15,
    width: 45,
    height: 45,
    borderRadius: 25,
    opacity: 0.45,
  },
  cardInfo: {
    flex: 1,
    marginLeft: 14,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  cardBadge: {
    fontFamily: 'monospace',
    fontSize: 9,
    letterSpacing: 0.8,
    fontWeight: '700',
  },
  activeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 1,
  },
  activeBadgeText: {
    fontFamily: 'monospace',
    fontSize: 9,
    fontWeight: '700',
  },
  inactiveRadio: {
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 1.5,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 4,
  },
  cardDesc: {
    fontSize: 12,
    lineHeight: 16,
  },
  settingsGroup: {
    marginTop: 24,
    borderRadius: 12,
    borderWidth: 1,
    padding: 16,
  },
  settingsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  settingsTextCol: {
    flex: 1,
    marginRight: 16,
  },
  settingTitle: {
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 4,
  },
  settingDesc: {
    fontSize: 11,
    lineHeight: 15,
  },
  palettePreviewRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    gap: 8,
  },
  paletteLabel: {
    fontFamily: 'monospace',
    fontSize: 10,
    fontWeight: '700',
  },
  swatchRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  colorSwatch: {
    width: 14,
    height: 14,
    borderRadius: 3,
    marginRight: 4,
  },
  swatchText: {
    fontFamily: 'monospace',
    fontSize: 10,
  },
  footerTelemetry: {
    marginTop: 24,
    alignItems: 'center',
  },
  telemetryText: {
    fontFamily: 'monospace',
    fontSize: 9,
    letterSpacing: 1,
  },
});
