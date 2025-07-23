import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { useCoach } from '../context/CoachContext';
import { useNavigation } from '@react-navigation/native';

export const CoachTabButton: React.FC = () => {
  const { theme } = useTheme();
  const { activeCoach } = useCoach();
  const navigation = useNavigation<any>();
  
  // Determine icon and color based on active coach
  const iconName = activeCoach?.iconName || 'chatbubbles-outline';
  const iconLibrary = activeCoach?.iconLibrary || 'Ionicons';
  const coachColor = activeCoach?.colorTheme?.primary || theme.primary;
  
  // Create prominent center button style
  const iconSize = 34; // Large icon
  const containerSize = iconSize + 24; // Container with padding
  
  const IconComponent = iconLibrary === 'MaterialCommunityIcons' ? MaterialCommunityIcons : Ionicons;
  
  const handlePress = () => {
    navigation.navigate('Chat');
  };
  
  return (
    <TouchableOpacity onPress={handlePress} style={styles.container}>
      <View style={[
        styles.iconContainer,
        {
          width: containerSize,
          height: containerSize,
          backgroundColor: coachColor,
        }
      ]}>
        <IconComponent 
          name={iconName as any} 
          size={iconSize} 
          color="#ffffff"
          style={{ marginTop: -2 }}
        />
      </View>
      <Text style={[
        styles.label,
        { color: coachColor }
      ]} numberOfLines={2}>
        {activeCoach?.name || 'Coach'}
      </Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconContainer: {
    borderRadius: 50,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: -25,
    marginBottom: 8,
    // Shadow for iOS
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.25,
    shadowRadius: 5,
    // Shadow for Android
    elevation: 8,
  },
  label: {
    fontSize: 10,
    fontWeight: '600',
    textAlign: 'center',
    width: 80,
  },
});