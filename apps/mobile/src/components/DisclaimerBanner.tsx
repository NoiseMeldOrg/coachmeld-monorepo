import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';

interface DisclaimerBannerProps {
  type?: 'minimal' | 'full';
  onPress?: () => void;
}

export const DisclaimerBanner: React.FC<DisclaimerBannerProps> = ({ 
  type = 'minimal',
  onPress 
}) => {
  const { theme } = useTheme();

  if (type === 'minimal') {
    return (
      <TouchableOpacity 
        style={[styles.minimalBanner, { backgroundColor: theme.surface }]}
        onPress={onPress}
        activeOpacity={0.8}
      >
        <Ionicons name="information-circle-outline" size={16} color={theme.textSecondary} />
        <Text style={[styles.minimalText, { color: theme.textSecondary }]}>
          Not medical advice. Tap for info.
        </Text>
      </TouchableOpacity>
    );
  }

  return (
    <View style={[styles.fullBanner, { backgroundColor: theme.warning + '15' }]}>
      <View style={styles.iconContainer}>
        <Ionicons name="medical-outline" size={20} color={theme.warning} />
      </View>
      <View style={styles.textContainer}>
        <Text style={[styles.fullTitle, { color: theme.text }]}>
          Health Information Disclaimer
        </Text>
        <Text style={[styles.fullText, { color: theme.textSecondary }]}>
          This app provides educational information only. Always consult healthcare 
          professionals before making health decisions.
        </Text>
        {onPress && (
          <TouchableOpacity onPress={onPress}>
            <Text style={[styles.linkText, { color: theme.primary }]}>
              Read full disclaimer →
            </Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  minimalBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 20,
    margin: 8,
  },
  minimalText: {
    fontSize: 12,
    marginLeft: 6,
  },
  fullBanner: {
    flexDirection: 'row',
    padding: 16,
    margin: 16,
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: 'transparent',
  },
  iconContainer: {
    marginRight: 12,
    paddingTop: 2,
  },
  textContainer: {
    flex: 1,
  },
  fullTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  fullText: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 8,
  },
  linkText: {
    fontSize: 14,
    fontWeight: '500',
  },
});