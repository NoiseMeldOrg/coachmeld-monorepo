import React from 'react';
import { View, ScrollView, Text, StyleSheet } from 'react-native';
import { useCoach } from '../../context/CoachContext';
import { useTheme } from '../../context/ThemeContext';
import { CoachCard } from './CoachCard';
import { useNavigation } from '@react-navigation/native';

interface CoachSelectorProps {
  horizontal?: boolean;
  showAll?: boolean;
  onCoachSelect?: (coachId: string) => void;
}

export const CoachSelector: React.FC<CoachSelectorProps> = ({ 
  horizontal = false, 
  showAll = false,
  onCoachSelect 
}) => {
  const { coaches, activeCoach, switchCoach, canAccessCoach } = useCoach();
  const { theme } = useTheme();
  const navigation = useNavigation<any>();

  const availableCoaches = showAll 
    ? coaches 
    : coaches.filter(coach => coach.hasActiveSubscription || coach.isFree);

  const handleCoachPress = async (coachId: string) => {
    if (canAccessCoach(coachId)) {
      await switchCoach(coachId);
      if (onCoachSelect) {
        onCoachSelect(coachId);
      } else {
        navigation.navigate('Coach');
      }
    } else {
      // Navigate to subscription screen
      navigation.navigate('Subscription', { coachId });
    }
  };

  if (horizontal) {
    return (
      <View style={styles.horizontalContainer}>
        <Text style={[styles.sectionTitle, { color: theme.text }]}>
          {showAll ? 'Choose Your Coach' : 'Your Coaches'}
        </Text>
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.horizontalScroll}
        >
          {availableCoaches.map(coach => (
            <CoachCard
              key={coach.id}
              coach={coach}
              isActive={activeCoach?.id === coach.id}
              onPress={() => handleCoachPress(coach.id)}
              compact
            />
          ))}
        </ScrollView>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {availableCoaches.length > 0 ? (
        availableCoaches.map(coach => (
          <CoachCard
            key={coach.id}
            coach={coach}
            isActive={activeCoach?.id === coach.id}
            onPress={() => handleCoachPress(coach.id)}
          />
        ))
      ) : (
        <View style={styles.emptyState}>
          <Text style={[styles.emptyText, { color: theme.textSecondary }]}>
            No coaches available
          </Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  horizontalContainer: {
    marginVertical: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 12,
    paddingHorizontal: 20,
  },
  horizontalScroll: {
    paddingHorizontal: 20,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    fontSize: 16,
  },
});