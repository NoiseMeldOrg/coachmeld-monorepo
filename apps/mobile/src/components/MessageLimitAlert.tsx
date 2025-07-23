import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';

type RootStackParamList = {
  Subscription: undefined;
};

type NavigationProp = StackNavigationProp<RootStackParamList>;

interface MessageLimitAlertProps {
  remainingMessages: number;
  onUpgrade?: () => void;
}

export const MessageLimitAlert: React.FC<MessageLimitAlertProps> = ({ 
  remainingMessages,
  onUpgrade 
}) => {
  const { theme } = useTheme();
  const navigation = useNavigation<NavigationProp>();

  const handleUpgrade = () => {
    if (onUpgrade) {
      onUpgrade();
    } else {
      navigation.navigate('Subscription');
    }
  };

  if (remainingMessages > 5 || remainingMessages < 0) {
    return null;
  }

  const isLastMessage = remainingMessages === 0;
  const alertColor = isLastMessage ? theme.error : theme.warning;

  return (
    <View style={[styles.container, { backgroundColor: alertColor + '20', borderColor: alertColor }]}>
      <View style={styles.content}>
        <Ionicons 
          name={isLastMessage ? 'alert-circle' : 'information-circle'} 
          size={24} 
          color={alertColor} 
        />
        <View style={styles.textContainer}>
          <Text style={[styles.title, { color: theme.text }]}>
            {isLastMessage ? 'Message Limit Reached' : `${remainingMessages} Messages Left`}
          </Text>
          <Text style={[styles.message, { color: theme.textSecondary }]}>
            {isLastMessage 
              ? "You've used all your free messages for today. Upgrade to Pro for unlimited access!"
              : `You have ${remainingMessages} free message${remainingMessages === 1 ? '' : 's'} remaining today.`
            }
          </Text>
        </View>
      </View>
      
      <TouchableOpacity
        style={[styles.upgradeButton, { backgroundColor: alertColor }]}
        onPress={handleUpgrade}
        activeOpacity={0.8}
      >
        <Text style={styles.upgradeButtonText}>
          {isLastMessage ? 'Upgrade Now' : 'View Plans'}
        </Text>
        <Ionicons name="arrow-forward" size={18} color="white" />
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    margin: 16,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
  },
  content: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  textContainer: {
    flex: 1,
    marginLeft: 12,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  message: {
    fontSize: 14,
    lineHeight: 20,
  },
  upgradeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    gap: 8,
  },
  upgradeButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
});