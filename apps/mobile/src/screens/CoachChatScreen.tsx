import React, { useState, useRef, useEffect, useCallback } from 'react';
import { 
  View, 
  StyleSheet, 
  Text, 
  TouchableOpacity,
  Share,
  Alert,
  KeyboardAvoidingView,
  Platform,
  TextInput,
  Pressable,
  Image,
  ActivityIndicator,
  Keyboard
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { Message } from '../types';
import { useTheme } from '../context/ThemeContext';
import { useUser } from '../context/UserContext';
import { useAuth } from '../context/AuthContext';
import { useCoach } from '../context/CoachContext';
import { useSupabaseChatPaginated } from '../hooks/useSupabaseChatPaginated';
import { sendMessageToAICoach } from '../services/aiCoachService';
import { BasicCoachService } from '../services/coaches/basicCoachService';
import { RAGCoachService } from '../services/coaches/ragCoachService';
import { dietCoaches } from '../data/dietCoaches';
import { UserContextService } from '../services/userContextService';
import { ExportService } from '../services/exportService';
import { ConversationMemoryService } from '../services/conversationMemoryService';
import { ErrorHandlingService } from '../services/errorHandlingService';
import { shouldShowTimestamp } from '../utils/dateFormatting';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useSubscription } from '../context/SubscriptionContext';
import { MessageLimitAlert } from '../components/MessageLimitAlert';
import { getCoachDisplayName, getCoachMessageLimit } from '../utils/coachDisplay';
import { CoachSelectorPanel } from '../components/CoachSelectorPanel';
import { LegendList, LegendListRef } from '@legendapp/list';
import { useHeaderHeight } from '@react-navigation/elements';
import { SafeAreaView } from 'react-native-safe-area-context';
import { createLogger } from '@coachmeld/shared-utils';

const logger = createLogger('CoachChatScreen');

export const CoachChatScreen: React.FC = () => {
  const { theme, isDark, toggleTheme } = useTheme();
  const { userProfile } = useUser();
  const { user } = useAuth();
  const { activeCoach, coaches, switchCoach } = useCoach();
  const { 
    messages, 
    loading: messagesLoading, 
    loadingOlder, 
    hasMoreMessages, 
    sendMessage, 
    clearMessages, 
    exportMessages, 
    loadOlderMessages,
    refreshMessages 
  } = useSupabaseChatPaginated({ 
    pageSize: 25, 
    preloadCoachId: activeCoach?.id 
  });
  const [isTyping, setIsTyping] = useState(false);
  const [showCoachSelector, setShowCoachSelector] = useState(false);
  const [showOptionsMenu, setShowOptionsMenu] = useState(false);
  const userContextService = useRef(new UserContextService());
  const navigation = useNavigation();
  const [isLoading, setIsLoading] = useState(false);
  const { checkMessageLimit, incrementMessageCount, remainingFreeMessages, hasActiveSubscription } = useSubscription();
  const insets = useSafeAreaInsets();
  const headerHeight = Platform.OS === 'ios' ? useHeaderHeight() : 0;
  
  // Modern chat input state
  const [messageContent, setMessageContent] = useState('');
  const textInputRef = useRef<TextInput>(null);
  const listRef = useRef<LegendListRef>(null);
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  // Messages are already filtered by coach in the new hook
  const coachMessages = messages;

  // Space-typing hack to fix keyboard layout
  const applyKeyboardHack = useCallback(() => {
    const timeout1 = setTimeout(() => {
      setMessageContent((prev) => prev + ' ');
      const timeout2 = setTimeout(() => {
        setMessageContent((prev) => prev.slice(0, -1));
        // Scroll to end after hack
        const timeout3 = setTimeout(() => {
          listRef.current?.scrollToEnd({ animated: true });
        }, 100);
        // Store timeout for cleanup if needed
        return () => clearTimeout(timeout3);
      }, 50);
      return () => clearTimeout(timeout2);
    }, 50); // Reduced from 200ms to 50ms
    return () => clearTimeout(timeout1);
  }, []);
  
  // Debug logging for messages (can be removed in production)
  logger.debug('CoachChatScreen debug info', {
    messagesLoading,
    activeCoachId: activeCoach?.id || null,
    totalMessages: messages.length,
    coachMessages: coachMessages.length
  });


  // Load messages when coach changes
  useEffect(() => {
    if (activeCoach) {
      refreshMessages(activeCoach.id);
    }
  }, [activeCoach?.id, refreshMessages]);

  // Clean up when screen loses focus
  useFocusEffect(
    useCallback(() => {
      // Cleanup function runs when screen loses focus
      return () => {
        // Dismiss keyboard when leaving screen
        Keyboard.dismiss();
        // Clear any pending operations
        setIsTyping(false);
        setShowOptionsMenu(false);
        setShowCoachSelector(false);
      };
    }, [])
  );

  // Handle keyboard events
  useEffect(() => {
    const keyboardWillShowListener = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      (e) => {
        setKeyboardHeight(e.endCoordinates.height);
        
        // Apply space-typing hack when keyboard shows
        if (textInputRef.current?.isFocused()) {
          applyKeyboardHack();
        }
      }
    );

    const keyboardWillHideListener = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
      () => {
        setKeyboardHeight(0);
      }
    );

    return () => {
      keyboardWillShowListener.remove();
      keyboardWillHideListener.remove();
    };
  }, [applyKeyboardHack]);

  // Let LegendList handle initial scroll with initialScrollIndex
  // Only manually scroll for new messages while already in chat
  useEffect(() => {
    if (!messagesLoading && coachMessages.length > 0) {
      // Only scroll if we're not loading initial messages
      const timeoutId = setTimeout(() => {
        listRef.current?.scrollToEnd({ animated: true });
      }, 100);
      return () => clearTimeout(timeoutId);
    }
  }, [coachMessages.length]);

  // Auto-focus input and apply keyboard hack
  useEffect(() => {
    let mounted = true;
    let timeoutId: NodeJS.Timeout;
    
    const setupScreen = async () => {
      // Wait for screen to be ready
      await new Promise(resolve => {
        timeoutId = setTimeout(resolve, 300);
      });
      
      if (mounted && textInputRef.current) {
        // Focus the input
        textInputRef.current.focus();
        
        // Apply the space-typing hack to fix keyboard layout
        applyKeyboardHack();
      }
    };

    setupScreen();
    
    return () => {
      mounted = false;
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [applyKeyboardHack]);

  const handleSendMessage = async () => {
    if (messageContent.trim() === '' || !activeCoach || isTyping) return;

    // Check message limit for free coaches
    if (activeCoach.isFree && !hasActiveSubscription) {
      const canSend = await checkMessageLimit();
      if (!canSend) {
        Alert.alert(
          'Message Limit Reached',
          `You've reached the ${getCoachMessageLimit(activeCoach)} free messages for ${getCoachDisplayName(activeCoach)}. Upgrade to Pro for unlimited messages!`,
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Upgrade to Pro', onPress: () => {} }
          ]
        );
        return;
      }
    }

    try {
      setIsTyping(true);
      const userMessageText = messageContent.trim();
      setMessageContent('');

      // Save user message
      const userMessage = await sendMessage(userMessageText, activeCoach.id, true);
      
      // Increment message count for free coaches
      if (activeCoach.isFree && !hasActiveSubscription && userMessage) {
        await incrementMessageCount();
      }

      // Get coach response
      let coachResponse = '';
      
      // Use appropriate service based on coach type
      const isDietCoach = dietCoaches.some(coach => coach.id === activeCoach.id);
      
      if (isDietCoach) {
        // Use RAG service for diet coaches
        const ragCoachService = new RAGCoachService(activeCoach.id, {
          name: activeCoach.name,
          coachType: activeCoach.coachType || '',
          features: activeCoach.features
        });
        const recentMessages = messages
          .filter(m => m.coachId === activeCoach.id)
          .slice(-20);
        coachResponse = await ragCoachService.processMessage(userMessageText, { 
          userProfile, 
          userId: user?.id,
          recentMessages 
        });
      } else if (activeCoach.isFree) {
        // Use basic coach service for other free coaches
        const basicCoachService = new BasicCoachService(activeCoach.id);
        coachResponse = await basicCoachService.processMessage(userMessageText, { userProfile });
      } else {
        // Use RAG-enhanced AI service for premium coaches
        const conversationHistory = messages
          .filter(m => m.coachId === activeCoach.id)
          .slice(-10)
          .map(m => ({
            content: m.text,
            isUser: m.sender === 'user',
            timestamp: m.timestamp.toISOString(),
          }));

        coachResponse = await sendMessageToAICoach(
          user?.id || '',
          userMessageText,
          userProfile,
          conversationHistory,
          activeCoach.id
        );
      }
      
      // Save coach response
      const coachMessage = await sendMessage(coachResponse, activeCoach.id, false);
      
      // Update user context document and conversation memory in the background
      if (userProfile && userMessage) {
        const allMessages = [...coachMessages, userMessage];
        if (coachMessage) {
          allMessages.push(coachMessage);
        }
        
        // Temporarily disable in Coach screen only to test if duplicate screens cause issues
        /*
        // Update user context
        userContextService.current.updateUserContextDocument(
          user?.id || '',
          userProfile,
          allMessages
        ).catch(error => {
          console.error('Failed to update user context:', error);
        });
        
        // Update conversation memory
        ConversationMemoryService.updateConversationMemory(
          user?.id || '',
          activeCoach.id,
          allMessages
        ).catch(error => {
          console.error('Failed to update conversation memory:', error);
        });
        */
      }
    } catch (error) {
      ErrorHandlingService.showErrorAlert(error, {
        operation: 'sendMessage',
        coachId: activeCoach?.id,
        userId: user?.id,
      });
    } finally {
      setIsTyping(false);
    }
  };

  const exportChat = async () => {
    if (!activeCoach) return;
    
    Alert.alert(
      'Export Chat',
      'Choose export format:',
      [
        {
          text: 'Text',
          onPress: async () => {
            const chatText = exportMessages(
              getCoachDisplayName(activeCoach),
              activeCoach.id,
              'text'
            );
            try {
              await Share.share({
                message: chatText,
                title: `CoachMeld - ${getCoachDisplayName(activeCoach)} Chat`,
              });
            } catch (error) {
              ErrorHandlingService.showErrorAlert(error, {
                operation: 'exportChat',
                coachId: activeCoach.id,
                userId: user?.id,
              });
            }
          }
        },
        {
          text: 'Cancel',
          style: 'cancel'
        }
      ]
    );
  };

  const clearChat = () => {
    Alert.alert(
      'Clear Chat',
      'Are you sure you want to clear all messages?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Clear', 
          style: 'destructive',
          onPress: clearMessages
        },
      ]
    );
  };

  if (!activeCoach) {
    return (
      <View style={[styles.container, { backgroundColor: theme.background }]}>
        <SafeAreaView edges={['top']} style={{ flex: 1 }}>
          {/* Header with close button */}
          <View style={[styles.header, { backgroundColor: theme.background, borderBottomColor: theme.border }]}>
            <TouchableOpacity 
              onPress={() => navigation.goBack()}
              style={styles.headerButton}
            >
              <Ionicons name="close" size={24} color={theme.text} />
            </TouchableOpacity>
            <Text style={[styles.headerTitle, { color: theme.text }]}>
              Select a Coach
            </Text>
            <View style={styles.headerButton} />
          </View>
          
          <View style={styles.centerContent}>
            <MaterialCommunityIcons 
              name="food-steak" 
              size={64} 
              color={theme.textSecondary} 
              style={{ transform: [{ rotate: '-90deg' }] }}
            />
            <Text style={[styles.noCoachTitle, { color: theme.text }]}>
              Welcome to CoachMeld!
            </Text>
            <Text style={[styles.noCoachText, { color: theme.textSecondary }]}>
              Choose a coach to start your personalized health journey
            </Text>
            
            {/* Free coach option */}
            <TouchableOpacity 
              style={[styles.freeCoachButton, { backgroundColor: theme.primary }]}
              onPress={() => {
                const freeCoach = coaches.find(c => c.freeTierEnabled);
                if (freeCoach) {
                  switchCoach(freeCoach.id);
                }
              }}
            >
              <MaterialCommunityIcons name="food-steak" size={20} color="white" style={{ transform: [{ rotate: '-90deg' }] }} />
              <Text style={styles.freeCoachButtonText}>
                Try Free Carnivore Coach
              </Text>
              <Text style={styles.freeCoachLimitText}>
                5 messages/day
              </Text>
            </TouchableOpacity>
            
            {/* All coaches option */}
            <TouchableOpacity 
              style={[styles.allCoachesButton, { borderColor: theme.border }]}
              onPress={() => navigation.navigate('Marketplace')}
            >
              <Text style={[styles.allCoachesButtonText, { color: theme.text }]}>
                View All Coaches
              </Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      {/* Fixed Header */}
      <SafeAreaView edges={['top']} style={{ backgroundColor: theme.background }}>
        <View style={[styles.header, { backgroundColor: theme.background, borderBottomColor: theme.border }]}>
          <TouchableOpacity 
            onPress={() => {
              // Dismiss keyboard first
              Keyboard.dismiss();
              // Small delay to ensure keyboard is fully dismissed
              setTimeout(() => {
                navigation.goBack();
              }, 100);
            }} 
            style={styles.backButton}
          >
            <Ionicons name="arrow-back" size={28} color={theme.text} />
          </TouchableOpacity>
          
          <TouchableOpacity
            style={styles.headerButton}
            onPress={() => coaches.length > 1 && setShowCoachSelector(true)}
            activeOpacity={coaches.length > 1 ? 0.7 : 1}
          >
            <Text style={[styles.headerTitle, { color: theme.text }]}>
              {getCoachDisplayName(activeCoach)}
            </Text>
            {coaches.length > 1 && (
              <Ionicons 
                name="chevron-down" 
                size={20} 
                color={theme.textSecondary} 
                style={styles.chevronIcon}
              />
            )}
          </TouchableOpacity>
          
          <TouchableOpacity 
            onPress={() => setShowOptionsMenu(!showOptionsMenu)} 
            style={styles.menuButton}
          >
            <Ionicons name="ellipsis-vertical" size={24} color={theme.text} />
          </TouchableOpacity>
        </View>
      </SafeAreaView>

      {/* Main Content Area */}
      <KeyboardAvoidingView
        style={styles.contentArea}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={0}
        enabled={true}
      >
        {/* Messages Area */}
        <View style={styles.messagesWrapper}>
          {messagesLoading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={theme.primary} />
              <Text style={[styles.loadingText, { color: theme.textSecondary }]}>
                Loading messages...
              </Text>
            </View>
          ) : (
            <LegendList
          ref={listRef}
          data={coachMessages}
          extraData={theme}
          style={styles.messagesList}
          renderItem={({ item }) => {
            logger.debug('LegendList rendering message item', { 
              itemId: item.id, 
              textPreview: item.text.substring(0, 20) + '...' 
            });
            
            const isSender = item.sender === 'user';
            
            return (
              <View
                style={[
                  styles.messageContainer,
                  {
                    alignSelf: isSender ? 'flex-end' : 'flex-start',
                  }
                ]}
              >
                {!isSender && (
                  <View style={[styles.avatar, { backgroundColor: activeCoach.colorTheme.primary }]}>
                    {activeCoach.iconLibrary === 'MaterialCommunityIcons' ? (
                      <MaterialCommunityIcons
                        name={activeCoach.iconName as any}
                        size={20}
                        color="white"
                        style={activeCoach.iconRotation ? { transform: [{ rotate: `${activeCoach.iconRotation}deg` }] } : {}}
                      />
                    ) : (
                      <Ionicons
                        name={activeCoach.iconName as any}
                        size={20}
                        color="white"
                      />
                    )}
                  </View>
                )}
                <View
                  style={[
                    styles.messageBubble,
                    {
                      backgroundColor: isSender ? theme.messageUser : theme.messageCoach,
                    }
                  ]}
                >
                  {!isSender && (
                    <Text style={[styles.senderName, { color: theme.text }]}>
                      {activeCoach.name}
                    </Text>
                  )}
                  <Text style={[styles.messageText, { color: isSender ? theme.messageUserText : theme.messageCoachText }]}>
                    {item.text}
                  </Text>
                  <Text
                    style={[
                      styles.messageTime,
                      { color: isSender ? (theme.messageUserText === '#ffffff' ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.5)') : theme.textSecondary }
                    ]}
                  >
                    {item.timestamp.toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </Text>
                </View>
              </View>
            );
          }}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.messagesContent}
          estimatedItemSize={100}
          maintainScrollAtEnd={true}
          maintainScrollAtEndThreshold={1}
          recycleItems={true}
          initialScrollIndex={coachMessages.length > 0 ? coachMessages.length - 1 : 0}
          onStartReached={() => {
            if (hasMoreMessages && !loadingOlder && activeCoach) {
              loadOlderMessages(activeCoach.id);
            }
          }}
          onStartReachedThreshold={0.5}
          ListHeaderComponent={
            <>
              {loadingOlder && (
                <View style={styles.loadingOlderContainer}>
                  <ActivityIndicator size="small" color={theme.textSecondary} />
                  <Text style={[styles.loadingOlderText, { color: theme.textSecondary }]}>
                    Loading older messages...
                  </Text>
                </View>
              )}
              {!hasActiveSubscription && remainingFreeMessages <= 5 && remainingFreeMessages >= 0 && (
                <MessageLimitAlert 
                  remainingMessages={remainingFreeMessages}
                  onUpgrade={() => {}}
                />
              )}
            </>
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              {activeCoach.iconLibrary === 'MaterialCommunityIcons' ? (
                <MaterialCommunityIcons
                  name={activeCoach.iconName as any}
                  size={48}
                  color={activeCoach.colorTheme.primary}
                  style={[styles.emptyIcon, activeCoach.iconRotation ? { transform: [{ rotate: `${activeCoach.iconRotation}deg` }] } : {}]}
                />
              ) : (
                <Ionicons
                  name={activeCoach.iconName as any}
                  size={48}
                  color={activeCoach.colorTheme.primary}
                  style={styles.emptyIcon}
                />
              )}
              <Text style={[styles.emptyText, { color: theme.text }]}>
                How can I help you today?
              </Text>
            </View>
          }
          ListFooterComponent={
            isTyping ? (
              <View style={styles.typingContainer}>
                <View style={[styles.avatar, { backgroundColor: activeCoach.colorTheme.primary }]}>
                  {activeCoach.iconLibrary === 'MaterialCommunityIcons' ? (
                    <MaterialCommunityIcons
                      name={activeCoach.iconName as any}
                      size={20}
                      color="white"
                      style={activeCoach.iconRotation ? { transform: [{ rotate: `${activeCoach.iconRotation}deg` }] } : {}}
                    />
                  ) : (
                    <Ionicons
                      name={activeCoach.iconName as any}
                      size={20}
                      color="white"
                    />
                  )}
                </View>
                <View style={[styles.messageBubble, { backgroundColor: theme.messageCoach }]}>
                  <ActivityIndicator size="small" color={theme.messageCoachText} />
                </View>
              </View>
            ) : null
          }
        />
        )}
        </View>

        {/* Input Container */}
        <View style={styles.inputWrapper}>
          <View
            style={[
              styles.inputContainer,
              { 
                borderColor: theme.border,
                backgroundColor: theme.background,
              }
            ]}
          >
            <TextInput
              ref={textInputRef}
              placeholder="Type a message"
              style={[
                styles.textInput,
                { color: theme.text }
              ]}
              placeholderTextColor={theme.textSecondary}
              multiline
              value={messageContent}
              onChangeText={setMessageContent}
              maxLength={500}
              onFocus={() => {
                // Simple scroll to end without complex timeouts
                listRef.current?.scrollToEnd({ animated: true });
              }}
            />
            <Pressable
              style={styles.sendButton}
              onPress={handleSendMessage}
              disabled={!messageContent.trim() || isTyping}
            >
              <Ionicons
                name="send"
                size={24}
                color={messageContent.trim() && !isTyping ? theme.primary : theme.textSecondary}
              />
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>

      {/* Options Menu Dropdown - Outside main layout */}
      {showOptionsMenu && (
        <TouchableOpacity 
          style={styles.menuOverlay} 
          activeOpacity={1} 
          onPress={() => setShowOptionsMenu(false)}
        >
          <View style={[
            styles.menuDropdown,
            { 
              backgroundColor: theme.surface,
              shadowColor: theme.text,
            }
          ]}>
            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => {
                setShowOptionsMenu(false);
                toggleTheme();
              }}
            >
              <Ionicons 
                name={isDark ? 'sunny' : 'moon'} 
                size={20} 
                color={theme.text} 
              />
              <Text style={[styles.menuItemText, { color: theme.text }]}>
                {isDark ? 'Light Mode' : 'Dark Mode'}
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => {
                setShowOptionsMenu(false);
                exportChat();
              }}
            >
              <Ionicons name="share-outline" size={20} color={theme.text} />
              <Text style={[styles.menuItemText, { color: theme.text }]}>Export Chat</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[styles.menuItem, styles.menuItemLast]}
              onPress={() => {
                setShowOptionsMenu(false);
                clearChat();
              }}
            >
              <Ionicons name="trash-outline" size={20} color={theme.text} />
              <Text style={[styles.menuItemText, { color: theme.text }]}>Clear Chat</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      )}

      {/* Coach Selector Panel */}
      <CoachSelectorPanel
        visible={showCoachSelector}
        onClose={() => setShowCoachSelector(false)}
        coaches={coaches}
        activeCoach={activeCoach}
        onSelectCoach={(coach) => switchCoach(coach.id)}
        hasActiveSubscription={hasActiveSubscription}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  noCoachText: {
    fontSize: 16,
    textAlign: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  backButton: {
    padding: 4,
    marginRight: 8,
  },
  headerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  chevronIcon: {
    marginLeft: 4,
  },
  menuButton: {
    padding: 4,
  },
  menuOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 999,
  },
  menuDropdown: {
    position: 'absolute',
    top: 60,
    right: 16,
    backgroundColor: 'white',
    borderRadius: 12,
    paddingVertical: 8,
    minWidth: 180,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 5,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
  },
  menuItemText: {
    fontSize: 16,
  },
  menuItemLast: {
    borderBottomWidth: 0,
  },
  contentArea: {
    flex: 1,
  },
  messagesWrapper: {
    flex: 1,
  },
  messagesList: {
    flex: 1,
  },
  messagesContent: {
    padding: 10,
  },
  messageContainer: {
    padding: 10,
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 6,
    maxWidth: '80%',
  },
  avatar: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  messageBubble: {
    flex: 1,
    padding: 10,
    borderRadius: 10,
  },
  senderName: {
    fontWeight: '500',
    marginBottom: 4,
  },
  messageText: {
    fontSize: 16,
    lineHeight: 20,
  },
  messageTime: {
    fontSize: 10,
    textAlign: 'right',
    marginTop: 4,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyIcon: {
    marginBottom: 16,
  },
  emptyText: {
    fontSize: 16,
  },
  typingContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 6,
    padding: 10,
  },
  inputWrapper: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    paddingBottom: Platform.OS === 'ios' ? 6 : 10,
  },
  inputContainer: {
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 20,
    paddingHorizontal: 16,
    minHeight: 44,
  },
  textInput: {
    flex: 1,
    fontSize: 16,
    lineHeight: 20,
    maxHeight: 100,
    paddingVertical: 10,
  },
  sendButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
  },
  loadingOlderContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    gap: 8,
  },
  loadingOlderText: {
    fontSize: 14,
  },
  noCoachTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginTop: 16,
    marginBottom: 8,
    textAlign: 'center',
  },
  freeCoachButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FF6B6B',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    marginTop: 24,
    marginHorizontal: 20,
    gap: 8,
  },
  freeCoachButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    flex: 1,
    textAlign: 'center',
  },
  freeCoachLimitText: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 12,
    fontWeight: '500',
  },
  allCoachesButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 12,
    marginTop: 12,
    marginHorizontal: 20,
  },
  allCoachesButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
});