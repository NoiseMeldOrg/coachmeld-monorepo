import { Alert } from 'react-native';

export interface ErrorContext {
  operation: string;
  coachId?: string;
  userId?: string;
  details?: Record<string, any>;
}

export class ErrorHandlingService {
  static readonly ERROR_MESSAGES = {
    NETWORK_ERROR: 'Connection issue. Please check your internet and try again.',
    AUTH_ERROR: 'Please sign in to continue.',
    RATE_LIMIT: 'Too many requests. Please wait a moment and try again.',
    QUOTA_EXCEEDED: 'Daily limit reached. Please try again tomorrow.',
    INVALID_RESPONSE: 'Received an invalid response. Please try again.',
    GENERAL_ERROR: 'Something went wrong. Please try again.',
    COACH_NOT_AVAILABLE: 'This coach is temporarily unavailable.',
    MESSAGE_SEND_FAILED: 'Failed to send message. Please try again.',
    EXPORT_FAILED: 'Failed to export chat. Please try again.',
  };

  static readonly FALLBACK_RESPONSES = [
    "I apologize, but I'm having trouble processing your request right now. Could you please try rephrasing your question?",
    "I'm experiencing a temporary issue. While I work on getting back to full functionality, is there something specific about your diet I can help clarify?",
    "I'm having difficulty accessing my full knowledge base at the moment. Let me provide some general guidance based on what you've asked.",
  ];

  static handleError(error: unknown, context: ErrorContext): string {
    console.error(`[${context.operation}] Error:`, error);
    
    const errorObj = error as Error;
    const errorMessage = errorObj?.message?.toLowerCase() || '';
    
    // Determine user-friendly error message
    let userMessage = this.ERROR_MESSAGES.GENERAL_ERROR;
    
    if (errorMessage.includes('network') || errorMessage.includes('fetch')) {
      userMessage = this.ERROR_MESSAGES.NETWORK_ERROR;
    } else if (errorMessage.includes('auth') || errorMessage.includes('unauthorized')) {
      userMessage = this.ERROR_MESSAGES.AUTH_ERROR;
    } else if (errorMessage.includes('rate limit') || errorMessage.includes('too many')) {
      userMessage = this.ERROR_MESSAGES.RATE_LIMIT;
    } else if (errorMessage.includes('quota')) {
      userMessage = this.ERROR_MESSAGES.QUOTA_EXCEEDED;
    } else if (errorMessage.includes('invalid response')) {
      userMessage = this.ERROR_MESSAGES.INVALID_RESPONSE;
    }
    
    // Log detailed error for debugging
    console.error(`[${context.operation}] Details:`, {
      message: errorObj?.message,
      stack: errorObj?.stack?.split('\n').slice(0, 3).join('\n'),
      context,
    });
    
    return userMessage;
  }
  
  static getRandomFallbackResponse(): string {
    return this.FALLBACK_RESPONSES[Math.floor(Math.random() * this.FALLBACK_RESPONSES.length)];
  }
  
  static showErrorAlert(error: unknown, context: ErrorContext): void {
    const message = this.handleError(error, context);
    Alert.alert('Error', message, [{ text: 'OK' }], { cancelable: true });
  }
  
  static async withErrorHandling<T>(
    operation: () => Promise<T>,
    context: ErrorContext,
    fallback?: T
  ): Promise<T | undefined> {
    try {
      return await operation();
    } catch (error) {
      this.showErrorAlert(error, context);
      return fallback;
    }
  }
  
  static isRetryableError(error: unknown): boolean {
    const errorObj = error as Error;
    const errorMessage = errorObj?.message?.toLowerCase() || '';
    
    return (
      errorMessage.includes('network') ||
      errorMessage.includes('timeout') ||
      errorMessage.includes('rate limit') ||
      errorMessage.includes('temporary')
    );
  }
}