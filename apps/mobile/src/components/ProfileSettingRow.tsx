import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';

interface ProfileSettingRowProps {
  label: string;
  value: string;
  onPress: () => void;
  showArrow?: boolean;
  isLast?: boolean;
}

export const ProfileSettingRow: React.FC<ProfileSettingRowProps> = ({
  label,
  value,
  onPress,
  showArrow = true,
  isLast = false,
}) => {
  const { theme } = useTheme();

  return (
    <TouchableOpacity
      style={[
        styles.container,
        { borderBottomColor: theme.border },
        isLast && styles.lastItem,
      ]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <Text style={[styles.label, { color: theme.text }]}>{label}</Text>
      <View style={styles.valueContainer}>
        <Text style={[styles.value, { color: theme.primary }]}>{value}</Text>
        {showArrow && (
          <Ionicons
            name="chevron-forward"
            size={20}
            color={theme.textSecondary}
            style={styles.arrow}
          />
        )}
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
  },
  lastItem: {
    borderBottomWidth: 0,
  },
  label: {
    fontSize: 16,
    flex: 1,
  },
  valueContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  value: {
    fontSize: 16,
    marginRight: 8,
  },
  arrow: {
    marginLeft: 4,
  },
});