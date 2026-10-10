import React from 'react';
import { TouchableOpacity, Text, StyleSheet } from 'react-native';
import { useTheme } from '../store/useThemeStore';

interface CategoryChipProps {
  label: string;
  isSelected: boolean;
  onPress: () => void;
}

export const CategoryChip: React.FC<CategoryChipProps> = ({
  label,
  isSelected,
  onPress,
}) => {
  const { theme, themeId } = useTheme();

  const getChipStyle = () => {
    if (themeId === 'luminous') {
      if (isSelected) {
        return {
          backgroundColor: 'rgba(255, 255, 255, 0.88)',
          borderColor: '#00E575',
          borderWidth: 1.5,
          shadowColor: 'rgba(0, 229, 117, 0.35)',
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.25,
          shadowRadius: 10,
          elevation: 3,
        };
      }
      return {
        backgroundColor: 'rgba(255, 255, 255, 0.58)',
        borderColor: 'rgba(255, 255, 255, 0.85)',
        borderWidth: 1,
        shadowColor: 'rgba(15, 23, 42, 0.06)',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.12,
        shadowRadius: 8,
        elevation: 1,
      };
    }

    return {
      backgroundColor: isSelected ? theme.colors.accentDim : theme.colors.surface,
      borderColor: isSelected ? theme.colors.accent : theme.colors.border,
      borderWidth: 1,
    };
  };

  return (
    <TouchableOpacity
      style={[styles.chip, getChipStyle()]}
      onPress={onPress}
      activeOpacity={0.8}
    >
      <Text
        style={[
          styles.label,
          {
            color: isSelected
              ? (themeId === 'luminous' ? '#00A854' : theme.colors.accentBright)
              : theme.colors.textMuted,
            fontFamily: theme.typography.mono,
          },
          isSelected && styles.selectedLabel,
        ]}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    marginRight: 8,
  },
  label: {
    fontSize: 11,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  selectedLabel: {
    fontWeight: '700',
  },
});
