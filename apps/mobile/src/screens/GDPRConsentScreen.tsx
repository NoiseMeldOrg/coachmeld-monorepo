import React from 'react';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../types/navigation';
import { GDPRConsentFlow } from '../components/GDPRConsentFlow';
import { useEUDetection } from '../hooks/useEUDetection';
import { View, ActivityIndicator } from 'react-native';
import { useTheme } from '../context/ThemeContext';

type GDPRConsentScreenNavigationProp = StackNavigationProp<RootStackParamList, 'GDPRConsent'>;

interface Props {
  navigation: GDPRConsentScreenNavigationProp;
}

export function GDPRConsentScreen({ navigation }: Props) {
  const { theme } = useTheme();
  const { isEUUser, isLoading } = useEUDetection();

  const handleComplete = () => {
    // Navigate back or to appropriate screen after consent completion
    navigation.goBack();
  };

  const handleSkip = () => {
    // Navigate back if user skips (for non-EU users)
    navigation.goBack();
  };

  if (isLoading || isEUUser === null) {
    return (
      <View style={{ 
        flex: 1, 
        justifyContent: 'center', 
        alignItems: 'center',
        backgroundColor: theme.colors.background 
      }}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  return (
    <GDPRConsentFlow
      isEUUser={isEUUser}
      onComplete={handleComplete}
      onSkip={handleSkip}
    />
  );
}