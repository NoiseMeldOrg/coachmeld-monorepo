import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { Message } from '../types';
import { useTheme } from '../context/ThemeContext';

interface MessageBubbleProps {
  message: Message;
}

export const MessageBubble: React.FC<MessageBubbleProps> = ({ message }) => {
  const { theme } = useTheme();
  const isUser = message.sender === 'user';

  const copyToClipboard = async () => {
    await Clipboard.setStringAsync(message.text);
    Alert.alert('Copied', 'Message copied to clipboard', [{ text: 'OK' }], {
      cancelable: true,
    });
  };

  return (
    <View style={[
      styles.container,
      isUser ? styles.userContainer : styles.coachContainer
    ]}>
      <TouchableOpacity 
        onLongPress={copyToClipboard}
        activeOpacity={0.7}
        style={[
          styles.bubble,
          {
            backgroundColor: isUser ? theme.messageUser : theme.messageCoach,
            alignSelf: isUser ? 'flex-end' : 'flex-start',
          }
        ]}
      >
        <Text 
          style={[
            styles.text,
            { color: isUser ? theme.messageUserText : theme.messageCoachText }
          ]}
          selectable={true}
        >
          {message.text}
        </Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: 4,
    marginHorizontal: 12,
  },
  userContainer: {
    alignItems: 'flex-end',
  },
  coachContainer: {
    alignItems: 'flex-start',
  },
  bubble: {
    maxWidth: '80%',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 18,
  },
  text: {
    fontSize: 16,
    lineHeight: 20,
  },
});