import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { formatMessageTimestamp } from '../utils/dateFormatting';

interface TimestampSeparatorProps {
  timestamp: Date;
}

export const TimestampSeparator: React.FC<TimestampSeparatorProps> = ({ timestamp }) => {
  const { theme, isDark } = useTheme();
  
  return (
    <View style={styles.container}>
      <Text style={[
        styles.text, 
        { color: isDark ? '#B0B0B0' : '#606060' }
      ]}>
        {formatMessageTimestamp(timestamp)}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    marginVertical: 16,
    paddingHorizontal: 20,
  },
  text: {
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
});