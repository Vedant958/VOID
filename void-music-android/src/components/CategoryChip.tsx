import React from 'react';
import { TouchableOpacity, Text, StyleSheet } from 'react-native';
import { THEME } from '../constants/theme';

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
  return (
    <TouchableOpacity
      style={[styles.chip, isSelected && styles.selectedChip]}
      onPress={onPress}
      activeOpacity={0.8}
    >
      <Text style={[styles.label, isSelected && styles.selectedLabel]}>
        {label}
      </Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  chip: {
    paddingHorizontal: THEME.spacing.md,
    paddingVertical: THEME.spacing.xs + 2,
    borderRadius: THEME.borderRadius.full,
    backgroundColor: THEME.colors.surface,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    marginRight: THEME.spacing.sm,
  },
  selectedChip: {
    backgroundColor: THEME.colors.accentDim,
    borderColor: THEME.colors.accent,
  },
  label: {
    fontFamily: THEME.typography.mono,
    fontSize: THEME.typography.sizes.xs,
    color: THEME.colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  selectedLabel: {
    color: THEME.colors.accentBright,
    fontWeight: '700',
  },
});
