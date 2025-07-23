import AsyncStorage from '@react-native-async-storage/async-storage';

const MESSAGE_COUNT_KEY = 'daily_message_counts';
const LAST_RESET_KEY = 'last_message_reset';

export interface DailyMessageCount {
  coachId: string;
  count: number;
  date: string;
}

export const getMessageCount = async (coachId: string): Promise<number> => {
  try {
    const today = new Date().toDateString();
    const lastReset = await AsyncStorage.getItem(LAST_RESET_KEY);
    
    // Reset counts if it's a new day
    if (lastReset !== today) {
      await AsyncStorage.setItem(LAST_RESET_KEY, today);
      await AsyncStorage.setItem(MESSAGE_COUNT_KEY, JSON.stringify({}));
      return 0;
    }
    
    const countsJson = await AsyncStorage.getItem(MESSAGE_COUNT_KEY);
    const counts = countsJson ? JSON.parse(countsJson) : {};
    
    return counts[coachId] || 0;
  } catch (error) {
    console.error('Error getting message count:', error);
    return 0;
  }
};

export const incrementMessageCount = async (coachId: string): Promise<void> => {
  try {
    const today = new Date().toDateString();
    const lastReset = await AsyncStorage.getItem(LAST_RESET_KEY);
    
    // Reset counts if it's a new day
    if (lastReset !== today) {
      await AsyncStorage.setItem(LAST_RESET_KEY, today);
      await AsyncStorage.setItem(MESSAGE_COUNT_KEY, JSON.stringify({ [coachId]: 1 }));
      return;
    }
    
    const countsJson = await AsyncStorage.getItem(MESSAGE_COUNT_KEY);
    const counts = countsJson ? JSON.parse(countsJson) : {};
    
    counts[coachId] = (counts[coachId] || 0) + 1;
    
    await AsyncStorage.setItem(MESSAGE_COUNT_KEY, JSON.stringify(counts));
  } catch (error) {
    console.error('Error incrementing message count:', error);
  }
};

export const canSendMessage = async (coach: any): Promise<boolean> => {
  if (!coach.dailyMessageLimit) {
    return true; // No limit for this coach
  }
  
  const currentCount = await getMessageCount(coach.id);
  return currentCount < coach.dailyMessageLimit;
};

export const getRemainingMessages = async (coach: any): Promise<number | null> => {
  if (!coach.dailyMessageLimit) {
    return null; // No limit
  }
  
  const currentCount = await getMessageCount(coach.id);
  return Math.max(0, coach.dailyMessageLimit - currentCount);
};