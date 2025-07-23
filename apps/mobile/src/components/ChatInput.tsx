import React, { useState } from 'react';
import { View, TextInput, TouchableOpacity, StyleSheet, Platform, Text, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';

interface ChatInputProps {
  onSend: (text: string) => void;
}

const MAX_MESSAGE_LENGTH = 500;

export const ChatInput: React.FC<ChatInputProps> = ({ onSend }) => {
  const { theme } = useTheme();
  const [text, setText] = useState('');

  const handleSend = () => {
    if (text.trim()) {
      if (text.length > MAX_MESSAGE_LENGTH) {
        Alert.alert(
          'Message Too Long',
          `Please keep your message under ${MAX_MESSAGE_LENGTH} characters. Current length: ${text.length}`,
          [{ text: 'OK' }]
        );
        return;
      }
      onSend(text.trim());
      setText('');
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background, borderTopColor: theme.border }]}>
      <View style={[styles.inputContainer, { backgroundColor: theme.inputBackground }]}>
        <TextInput
          style={[styles.input, { color: theme.text }]}
          value={text}
          onChangeText={setText}
          placeholder="Ask your coach..."
          placeholderTextColor={theme.textSecondary}
          multiline
          maxLength={MAX_MESSAGE_LENGTH}
          numberOfLines={undefined}
        />
        <TouchableOpacity 
          style={[styles.sendButton, { opacity: text.trim() ? 1 : 0.5 }]}
          onPress={handleSend}
          disabled={!text.trim()}
        >
          <Ionicons name="send" size={24} color={theme.primary} />
        </TouchableOpacity>
      </View>
      {text.length > 0 && (
        <Text style={[styles.charCounter, { color: text.length > MAX_MESSAGE_LENGTH * 0.9 ? theme.error : theme.textSecondary }]}>
          {text.length}/{MAX_MESSAGE_LENGTH}
        </Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    borderTopWidth: 1,
    paddingHorizontal: 12,
    paddingTop: 8,
    paddingBottom: Platform.OS === 'ios' ? 34 : 56,
    backgroundColor: 'transparent',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: Platform.OS === 'ios' ? 8 : 4,
    minHeight: 44,
  },
  input: {
    flex: 1,
    fontSize: 16,
    lineHeight: 20,
    maxHeight: 100,
    paddingTop: Platform.OS === 'ios' ? 4 : 8,
    paddingBottom: Platform.OS === 'ios' ? 4 : 8,
    marginVertical: Platform.OS === 'ios' ? 0 : 4,
  },
  sendButton: {
    marginLeft: 8,
    padding: 4,
  },
  charCounter: {
    fontSize: 12,
    textAlign: 'right',
    marginTop: 4,
    marginRight: 16,
  },
});