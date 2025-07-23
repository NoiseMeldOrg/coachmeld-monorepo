import { supabase } from '../lib/supabase';
import { UserProfile } from '../types';
import { GeminiChatService } from './geminiChatService';

interface AICoachResponse {
  success: boolean;
  message?: any;
  error?: string;
  processingTime?: number;
}

export async function sendMessageToAICoach(
  userId: string,
  message: string,
  userProfile: UserProfile | null,
  conversationHistory: Array<{ content: string; isUser: boolean; timestamp: string }>,
  coachId?: string
): Promise<string> {
  try {
    // Build user context string
    let userContext = '';
    if (userProfile) {
      userContext = `User Profile:
- Name: ${userProfile.name}
- Age: ${userProfile.age}
- Gender: ${userProfile.gender}
- Height: ${userProfile.height 
    ? (userProfile.units === 'imperial' 
      ? `${Math.floor(userProfile.height / 12)}'${userProfile.height % 12}"` 
      : `${userProfile.height}cm`)
    : 'not provided'}
- Weight: ${userProfile.units === 'imperial' ? 
    `${userProfile.weight}lbs` : 
    `${userProfile.weight}kg`}
- Goals: ${userProfile.healthGoals.join(', ')}
${userProfile.healthConditions.length > 0 ? `- Health Conditions: ${userProfile.healthConditions.join(', ')}` : ''}`;
    }

    // Build conversation context
    let conversationContext = '';
    if (conversationHistory.length > 0) {
      conversationContext = 'Recent conversation:\n';
      conversationHistory.slice(-5).forEach(msg => {
        conversationContext += `${msg.isUser ? 'User' : 'Assistant'}: ${msg.content}\n`;
      });
    }

    // Use GeminiChatService directly instead of ai-coach-webhook
    const response = await GeminiChatService.generateResponse(
      message,
      {
        systemPrompt: `You are a helpful AI health coach. Provide personalized advice based on the user's profile and goals. Be supportive, encouraging, and evidence-based in your responses.`,
        userContext,
        conversationContext,
        coachId
      },
      {
        temperature: 0.7,
        maxOutputTokens: 2048
      }
    );

    return response;
  } catch (error) {
    console.error('Error calling AI coach:', error);
    throw error;
  }
}