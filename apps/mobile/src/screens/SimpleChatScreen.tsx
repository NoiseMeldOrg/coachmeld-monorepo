import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { useUser } from '../context/UserContext';
import { useAuth } from '../context/AuthContext';
import { useCoach } from '../context/SimpleCoachContext';
import { useNavigation } from '@react-navigation/native';
import { 
  canSendMessage, 
  getRemainingMessages, 
  incrementMessageCount 
} from '../utils/messageTracking';

interface Message {
  id: string;
  text: string;
  sender: 'user' | 'coach';
  timestamp: Date;
}

export const SimpleChatScreen: React.FC = () => {
  const { theme, isDark, toggleTheme } = useTheme();
  const { userProfile } = useUser();
  const { user } = useAuth();
  const { activeCoach } = useCoach();
  const navigation = useNavigation<any>();
  const [remainingMessages, setRemainingMessages] = useState<number | null>(null);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      text: `Hello! I'm your ${activeCoach?.name || 'Coach'}. How can I help you today?`,
      sender: 'coach',
      timestamp: new Date(),
    },
  ]);
  const [inputText, setInputText] = useState('');

  // Helper function to render coach icon
  const renderCoachIcon = (size: number, color: string) => {
    if (!activeCoach) return null;
    
    if (activeCoach.iconLibrary === 'MaterialCommunityIcons') {
      return (
        <MaterialCommunityIcons
          name={activeCoach.iconName as any}
          size={size}
          color={color}
        />
      );
    }
    
    return (
      <Ionicons
        name={activeCoach.iconName as any}
        size={size}
        color={color}
      />
    );
  };

  // Update remaining messages when coach changes
  useEffect(() => {
    const updateRemaining = async () => {
      if (activeCoach) {
        const remaining = await getRemainingMessages(activeCoach);
        setRemainingMessages(remaining);
      }
    };
    updateRemaining();
  }, [activeCoach, messages]);

  const sendMessage = async () => {
    if (!inputText.trim()) return;

    // Check message limit
    if (activeCoach) {
      const canSend = await canSendMessage(activeCoach);
      if (!canSend) {
        Alert.alert(
          'Daily Limit Reached',
          `You've reached your daily limit of ${activeCoach.dailyMessageLimit} messages with the free ${activeCoach.name}. Upgrade to ${activeCoach.name} Pro for unlimited messages!`,
          [
            { text: 'Cancel', style: 'cancel' },
            { 
              text: 'Upgrade Now', 
              onPress: () => navigation.navigate('DietSelection')
            },
          ]
        );
        return;
      }
    }

    // Add user message
    const userMessage: Message = {
      id: Date.now().toString(),
      text: inputText,
      sender: 'user',
      timestamp: new Date(),
    };
    setMessages(prev => [...prev, userMessage]);

    // Clear input
    setInputText('');

    // Increment message count for free coaches
    if (activeCoach && activeCoach.dailyMessageLimit) {
      await incrementMessageCount(activeCoach.id);
    }

    // Simulate coach response
    setTimeout(() => {
      const coachMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: `I understand you're asking about "${inputText}". As your ${activeCoach?.name}, I would recommend focusing on high-quality animal proteins and staying consistent with your carnivore lifestyle.`,
        sender: 'coach',
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, coachMessage]);
    }, 1000);
  };

  if (!activeCoach) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
        <View style={styles.noCoachContainer}>
          <Text style={[styles.noCoachText, { color: theme.textSecondary }]}>
            Please select a coach from the home screen
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={[styles.header, { backgroundColor: theme.background, borderBottomColor: theme.border }]}>
        <View style={styles.headerLeft}>
          <View
            style={[styles.coachAvatar, { backgroundColor: activeCoach.colorTheme?.primary + '20' }]}
          >
            {renderCoachIcon(24, activeCoach.colorTheme?.primary || theme.primary)}
          </View>
          <View style={styles.headerTitleContainer}>
            <Text style={[styles.headerTitle, { color: theme.text }]}>
              {activeCoach.name}
            </Text>
            {!activeCoach.isFree && (
              <Text style={[styles.headerSubtitle, { color: theme.textSecondary }]}>
                Pro Coach
              </Text>
            )}
            {remainingMessages !== null && (
              <Text style={[styles.headerSubtitle, { color: theme.warning }]}>
                {remainingMessages} messages left today
              </Text>
            )}
          </View>
        </View>
        <TouchableOpacity onPress={toggleTheme} style={styles.headerButton}>
          <Ionicons
            name={isDark ? 'sunny' : 'moon'}
            size={24}
            color={theme.text}
          />
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView
        style={styles.chatContainer}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          style={styles.messagesArea}
          contentContainerStyle={styles.messagesContent}
        >
          {messages.map((message) => (
            <View
              key={message.id}
              style={[
                styles.messageBubble,
                message.sender === 'user' ? styles.userMessage : styles.coachMessage,
                {
                  backgroundColor:
                    message.sender === 'user'
                      ? theme.primary
                      : theme.surface,
                },
              ]}
            >
              <Text
                style={[
                  styles.messageText,
                  {
                    color: message.sender === 'user' ? '#fff' : theme.text,
                  },
                ]}
              >
                {message.text}
              </Text>
            </View>
          ))}
        </ScrollView>

        {remainingMessages !== null && remainingMessages <= 2 && remainingMessages > 0 && (
          <TouchableOpacity 
            style={[styles.upgradeBanner, { backgroundColor: theme.warning + '20' }]}
            onPress={() => navigation.navigate('DietSelection')}
          >
            <View style={styles.upgradeBannerContent}>
              <Ionicons name="alert-circle" size={20} color={theme.warning} />
              <Text style={[styles.upgradeBannerText, { color: theme.text }]}>
                Only {remainingMessages} messages left today!
              </Text>
              <Text style={[styles.upgradeLink, { color: theme.primary }]}>
                Upgrade to Pro
              </Text>
            </View>
          </TouchableOpacity>
        )}

        <View style={[styles.inputContainer, { backgroundColor: theme.surface }]}>
          <TextInput
            style={[styles.textInput, { color: theme.text }]}
            value={inputText}
            onChangeText={setInputText}
            placeholder="Type a message..."
            placeholderTextColor={theme.textSecondary}
            multiline
            maxLength={1000}
            numberOfLines={undefined}
            textAlignVertical="top"
          />
          <TouchableOpacity 
            onPress={sendMessage} 
            style={[styles.sendButton, { opacity: inputText.trim() ? 1 : 0.5 }]}
            disabled={!inputText.trim()}
          >
            <Ionicons name="send" size={24} color={theme.primary} />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
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
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  coachAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  headerTitleContainer: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  headerSubtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  headerButton: {
    padding: 8,
    marginLeft: 8,
  },
  noCoachContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  noCoachText: {
    fontSize: 16,
  },
  chatContainer: {
    flex: 1,
  },
  messagesArea: {
    flex: 1,
  },
  messagesContent: {
    padding: 16,
  },
  messageBubble: {
    padding: 12,
    borderRadius: 16,
    maxWidth: '80%',
    marginBottom: 12,
  },
  userMessage: {
    alignSelf: 'flex-end',
  },
  coachMessage: {
    alignSelf: 'flex-start',
  },
  messageText: {
    fontSize: 16,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  textInput: {
    flex: 1,
    fontSize: 16,
    paddingVertical: 8,
    paddingHorizontal: 12,
    maxHeight: 100,
    minHeight: 40,
  },
  sendButton: {
    padding: 8,
    marginLeft: 8,
  },
  upgradeBanner: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  upgradeBannerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  upgradeBannerText: {
    fontSize: 14,
    marginHorizontal: 8,
  },
  upgradeLink: {
    fontSize: 14,
    fontWeight: '600',
  },
});