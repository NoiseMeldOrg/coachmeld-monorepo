import { RAGService } from '../ragService';
import { UserProfile, Message } from '../../types';
import { dietCoaches } from '../../data/dietCoaches';
import { ConversationMemoryService } from '../conversationMemoryService';
import { GeminiChatService } from '../geminiChatService';
import { getCoachKnowledge, searchKnowledge, getCoachFAQs } from '../../data/knowledge';
import { supabase } from '../../lib/supabase';

interface CoachContext {
  coachId: string;
  coachName: string;
  coachType: string;
  specialties: string[];
}

export class RAGCoachService {
  private ragService: RAGService;
  private coachContext: CoachContext;

  constructor(coachId: string, coachInfo?: { name: string; coachType: string; features?: string[] }) {
    this.ragService = new RAGService();
    
    // Try to get coach info from dietCoaches data first (for backward compatibility)
    let coach = dietCoaches.find(c => c.id === coachId);
    
    // If not found in hardcoded data, use provided info
    if (!coach && coachInfo) {
      this.coachContext = {
        coachId: coachId,
        coachName: coachInfo.name,
        coachType: coachInfo.coachType,
        specialties: coachInfo.features || []
      };
    } else if (coach) {
      this.coachContext = {
        coachId: coach.id,
        coachName: coach.name,
        coachType: coach.coachType,
        specialties: coach.features || []
      };
    } else {
      // Fallback for unknown coaches
      this.coachContext = {
        coachId: coachId,
        coachName: 'Diet Coach',
        coachType: 'general',
        specialties: []
      };
    }
  }

  async processMessage(
    message: string, 
    userContext?: { 
      userProfile?: UserProfile | null; 
      userId?: string;
      recentMessages?: Message[];
    }
  ): Promise<string> {
    try {
      // 1. Search RAG system for relevant knowledge
      const documents = await this.ragService.searchDocuments(message, {
        coachId: this.coachContext.coachId,
        userId: userContext?.userId,
        limit: 3,
        threshold: 0.5
      });

      // 2. Extract relevant information
      const relevantInfo = this.ragService.extractRelevantInfo(documents, message);
      
      // 3. Get conversation memory context
      let conversationContext = '';
      if (userContext?.userId && userContext?.recentMessages) {
        const memoryContext = await ConversationMemoryService.getConversationContext(
          userContext.userId,
          this.coachContext.coachId,
          userContext.recentMessages
        );
        conversationContext = ConversationMemoryService.formatContextForPrompt(memoryContext);
      }
      
      // 4. Build coach-specific system prompt
      const systemPrompt = await this.buildSystemPrompt();
      
      // 5. Build user context
      const userContextStr = this.buildUserContext(userContext?.userProfile);
      
      // 5. Build knowledge context from RAG
      const knowledgeContext = this.buildKnowledgeContext(documents, relevantInfo);
      
      // 6. Generate response (for now, using template-based approach)
      // In production, this would call Gemini API
      const response = await this.generateResponse(
        message,
        systemPrompt,
        userContextStr,
        knowledgeContext,
        conversationContext,
        userContext
      );
      
      return response;
    } catch (error) {
      console.error('Error in RAG coach service:', error);
      // Fallback to basic response
      return this.generateFallbackResponse(message);
    }
  }

  private async buildSystemPrompt(): Promise<string> {
    try {
      // Try to get system prompt from database first
      const { data: coach, error } = await supabase
        .from('coaches')
        .select('system_prompt')
        .eq('id', this.coachContext.coachId)
        .single();

      if (!error && coach?.system_prompt) {
        // Replace template variables
        return coach.system_prompt
          .replace(/{{dietName}}/g, this.coachContext.coachName)
          .replace(/{{dietType}}/g, this.coachContext.coachType)
          .replace(/{{specialties}}/g, this.coachContext.specialties.join(', '));
      }
    } catch (error) {
      console.error('Error fetching system prompt from database:', error);
    }

    // Fallback to default prompt
    return this.getDefaultSystemPrompt();
  }

  private getDefaultSystemPrompt(): string {
    const dietTypeNames: Record<string, string> = {
      carnivore: 'Carnivore',
      paleo: 'Paleo',
      lowcarb: 'Low Carb',
      keto: 'Ketogenic',
      ketovore: 'Ketovore',
      lion: 'Lion Diet'
    };

    const dietName = dietTypeNames[this.coachContext.coachType] || this.coachContext.coachType;

    return `You are a ${dietName} Coach, an AI health advisor specializing in the ${dietName.toLowerCase()} diet.

Your responses should be:
- Concise and to the point (2-3 short paragraphs max)
- Focused on practical, actionable advice
- Specific to the ${dietName.toLowerCase()} approach

Start with a brief acknowledgment of the question, then provide clear, helpful guidance.
Keep your response conversational and friendly, like texting with a knowledgeable friend.
Base your responses on the knowledge provided from the RAG system and your training.`;
  }

  private buildUserContext(userProfile?: UserProfile | null): string {
    if (!userProfile || !userProfile.name) {
      return '';
    }

    const heightDisplay = userProfile.height
      ? (userProfile.units === 'imperial' 
        ? `${Math.floor(userProfile.height / 12)}' ${userProfile.height % 12}"` 
        : `${userProfile.height}cm`)
      : 'not provided';
    const weightDisplay = userProfile.units === 'imperial' 
      ? `${userProfile.weight} lbs` 
      : `${userProfile.weight}kg`;
    
    return `
User Profile:
- Name: ${userProfile.name}
- Age: ${userProfile.age}
- Gender: ${userProfile.gender}
- Height: ${heightDisplay}
- Weight: ${weightDisplay}
- Activity Level: ${userProfile.activityLevel.replace('_', ' ')}
- Health Goals: ${userProfile.healthGoals.join(', ')}
- Dietary Preferences: ${userProfile.dietaryPreferences.join(', ')}
- Health Conditions: ${userProfile.healthConditions.join(', ')}`;
  }

  private buildKnowledgeContext(documents: any[], relevantInfo: string[]): string {
    let context = '';
    
    // First, check if question matches any FAQs
    const faqs = getCoachFAQs(this.coachContext.coachId);
    const matchingFaq = faqs.find(faq => 
      faq.question.toLowerCase().includes(relevantInfo[0]?.toLowerCase() || '')
    );
    
    if (matchingFaq) {
      context += `Frequently Asked Question:\n${matchingFaq.question}\n${matchingFaq.answer}\n\n`;
    }
    
    // Then add RAG search results
    if (documents.length > 0) {
      context += 'Based on the following knowledge from our database:\n\n';
      
      documents.forEach((doc, index) => {
        const category = doc.metadata?.category || 'General';
        context += `[${category}]\n`;
        // Include first 400 characters of most relevant content
        const preview = doc.content.substring(0, 400);
        context += `${preview}...\n\n`;
      });
    }
    
    if (relevantInfo.length > 0) {
      context += 'Key relevant points:\n';
      relevantInfo.forEach(info => {
        context += `• ${info}\n`;
      });
    }
    
    // Add local knowledge search if RAG is limited
    if (documents.length < 3) {
      const localResults = searchKnowledge(this.coachContext.coachId, relevantInfo[0] || '');
      if (localResults.length > 0) {
        context += '\nAdditional context:\n';
        localResults.slice(0, 2).forEach(result => {
          context += `[${result.category}] ${result.content.substring(0, 200)}...\n`;
        });
      }
    }
    
    return context;
  }

  private async generateResponse(
    userMessage: string,
    systemPrompt: string,
    userContext: string,
    knowledgeContext: string,
    conversationContext: string = '',
    userContextData?: { userProfile?: UserProfile | null; userId?: string; recentMessages?: Message[]; }
  ): Promise<string> {
    try {
      // Try to use Gemini API if available
      console.log('Attempting Gemini API call...');
      
      // Only log for testing user
      if (userContextData?.userId === '18b842cb-f267-40ff-a6c3-50e32f157e89') {
        console.log('=== RAG CONTEXT BEING SENT ===');
        console.log('System Prompt:', systemPrompt?.substring(0, 200) + '...');
        console.log('User Context:', userContext);
        console.log('Knowledge Context Length:', knowledgeContext.length);
        console.log('Knowledge Context:', knowledgeContext);
        console.log('Max Output Tokens:', 256);
        console.log('=============================');
      }
      
      const response = await GeminiChatService.generateResponse(
        userMessage,
        {
          systemPrompt,
          userContext,
          conversationContext,
          knowledgeContext,
          coachId: this.coachContext.coachId
        },
        {
          temperature: 0.7,
          maxOutputTokens: 256
        }
      );
      
      console.log('Gemini API response received successfully');
      return response;
    } catch (error) {
      console.error('Gemini API error:', error);
      const errorObj = error as Error;
      console.error('Error details:', {
        message: errorObj.message,
        name: errorObj.name,
        stack: errorObj.stack?.split('\n').slice(0, 3).join('\n')
      });
      console.log('Falling back to template responses');
      // Fall back to template-based responses
    }
    
    const messageLower = userMessage.toLowerCase();
    let response = `Regarding your question: "${userMessage}"\n\n`;

    // If we have relevant knowledge from RAG, use it
    if (knowledgeContext.trim() || conversationContext.trim()) {
      // Include conversation context if available
      let fullContext = knowledgeContext;
      if (conversationContext.trim()) {
        fullContext = conversationContext + '\n\n' + knowledgeContext;
      }
      
      // Diet-specific responses based on coach type
      switch (this.coachContext.coachType) {
        case 'carnivore':
          response += this.generateCarnivoreResponse(messageLower, fullContext, userContext);
          break;
        case 'paleo':
          response += this.generatePaleoResponse(messageLower, fullContext, userContext);
          break;
        case 'keto':
          response += this.generateKetoResponse(messageLower, fullContext, userContext);
          break;
        case 'ketovore':
          response += this.generateKetovoreResponse(messageLower, fullContext, userContext);
          break;
        case 'lowcarb':
          response += this.generateLowCarbResponse(messageLower, fullContext, userContext);
          break;
        case 'lion':
          response += this.generateLionResponse(messageLower, fullContext, userContext);
          break;
        default:
          response += this.generateGenericResponse(messageLower, fullContext);
      }
    } else {
      // No RAG context found, use fallback
      response += this.generateFallbackResponse(userMessage);
    }

    return response;
  }

  private generateCarnivoreResponse(message: string, knowledge: string, userContext: string): string {
    const coachKnowledge = getCoachKnowledge('carnivore');
    
    if (message.includes('start') || message.includes('begin')) {
      const gettingStarted = coachKnowledge?.knowledgeBase
        .find(item => item.category === 'Getting Started')?.content || '';
      
      return `Based on our carnivore diet guide, here's how to start:

${gettingStarted}

${userContext.includes('Name:') ? 'Based on your profile, I recommend starting with fattier cuts to ensure adequate energy.' : 'Remember to listen to your body and adjust portions based on hunger.'}`;
    }
    
    if (message.includes('food') || message.includes('eat') || message.includes('meal')) {
      const foodList = coachKnowledge?.knowledgeBase
        .find(item => item.category === 'Shopping List' || item.category === 'Food Quality')?.content || '';
      
      return `${foodList}\n\nRemember: ${this.extractRelevantAnswer(knowledge, message)}`;
    }
    
    if (message.includes('fat') || message.includes('ratio')) {
      const fatRatio = coachKnowledge?.knowledgeBase
        .find(item => item.category.includes('Fat to Protein'))?.content || '';
      
      return fatRatio || `Based on the carnivore diet principles, ${this.extractRelevantAnswer(knowledge, message)}`;
    }

    // Check for adaptation/symptom questions
    if (message.includes('adapt') || message.includes('symptom') || message.includes('feel')) {
      const adaptation = coachKnowledge?.knowledgeBase
        .find(item => item.category.includes('Adaptation'))?.content || '';
      
      return adaptation || `Based on the carnivore diet principles, ${this.extractRelevantAnswer(knowledge, message)}`;
    }

    return `Based on the carnivore diet principles and your question about "${message}": ${this.extractRelevantAnswer(knowledge, message)}`;
  }

  private generatePaleoResponse(message: string, knowledge: string, userContext: string): string {
    const coachKnowledge = getCoachKnowledge('paleo');
    
    if (message.includes('start') || message.includes('begin')) {
      const starting = coachKnowledge?.knowledgeBase
        .find(item => item.category === 'Starting Paleo')?.content || '';
      
      return starting || `The Paleo diet mimics our ancestral eating patterns. ${this.extractRelevantAnswer(knowledge, message)}`;
    }
    
    if (message.includes('food') || message.includes('eat')) {
      const guidelines = coachKnowledge?.knowledgeBase
        .find(item => item.category === 'Paleo Food Guidelines')?.content || '';
      
      return guidelines || `Following Paleo principles, ${this.extractRelevantAnswer(knowledge, message)}`;
    }

    return `Following Paleo principles: ${this.extractRelevantAnswer(knowledge, message)}`;
  }

  private generateKetoResponse(message: string, knowledge: string, userContext: string): string {
    const coachKnowledge = getCoachKnowledge('keto');
    
    if (message.includes('start') || message.includes('begin') || message.includes('keto')) {
      const basics = coachKnowledge?.knowledgeBase
        .find(item => item.category === 'Ketogenic Basics' || item.category === 'Getting Into Ketosis')?.content || '';
      
      return basics || `The ketogenic diet induces ketosis through very low carb intake. ${this.extractRelevantAnswer(knowledge, message)}`;
    }
    
    if (message.includes('macro') || message.includes('ratio')) {
      const macros = coachKnowledge?.knowledgeBase
        .find(item => item.category === 'Macro Calculation')?.content || '';
      
      return macros || `For ketogenic success, ${this.extractRelevantAnswer(knowledge, message)}`;
    }

    return `For ketogenic success: ${this.extractRelevantAnswer(knowledge, message)}`;
  }

  private generateKetovoreResponse(message: string, knowledge: string, userContext: string): string {
    const coachKnowledge = getCoachKnowledge('ketovore');
    
    if (message.includes('what') || message.includes('explain')) {
      const philosophy = coachKnowledge?.knowledgeBase
        .find(item => item.category === 'Ketovore Philosophy')?.content || '';
      
      return philosophy || `The Ketovore diet combines carnivore and keto principles. ${this.extractRelevantAnswer(knowledge, message)}`;
    }
    
    const framework = coachKnowledge?.knowledgeBase
      .find(item => item.category === 'Food Framework')?.content || '';

    return `${framework}\n\n${this.extractRelevantAnswer(knowledge, message)}`;
  }

  private generateLowCarbResponse(message: string, knowledge: string, userContext: string): string {
    const coachKnowledge = getCoachKnowledge('lowcarb');
    
    if (message.includes('carb') && message.includes('how')) {
      const ranges = coachKnowledge?.knowledgeBase
        .find(item => item.category === 'Carb Ranges')?.content || '';
      
      return ranges || `Following a low-carb approach, ${this.extractRelevantAnswer(knowledge, message)}`;
    }

    const fundamentals = coachKnowledge?.knowledgeBase
      .find(item => item.category === 'Low-Carb Fundamentals')?.content || '';
      
    return `${fundamentals.substring(0, 200)}... ${this.extractRelevantAnswer(knowledge, message)}`;
  }

  private generateLionResponse(message: string, knowledge: string, userContext: string): string {
    const coachKnowledge = getCoachKnowledge('lion');
    
    if (message.includes('lion') || message.includes('what') || message.includes('explain')) {
      const basics = coachKnowledge?.knowledgeBase
        .find(item => item.category === 'Lion Diet Basics')?.content || '';
      
      return basics || `The Lion Diet is an elimination protocol. ${this.extractRelevantAnswer(knowledge, message)}`;
    }
    
    if (message.includes('start') || message.includes('begin')) {
      const implementation = coachKnowledge?.knowledgeBase
        .find(item => item.category === 'Implementation Guide')?.content || '';
      
      return implementation || `On the Lion Diet protocol, ${this.extractRelevantAnswer(knowledge, message)}`;
    }

    return `On the Lion Diet protocol: ${this.extractRelevantAnswer(knowledge, message)}`;
  }

  private generateGenericResponse(message: string, knowledge: string): string {
    return this.extractRelevantAnswer(knowledge, message);
  }

  private extractRelevantAnswer(knowledge: string, message: string): string {
    // Enhanced extraction with better keyword matching
    const sentences = knowledge.split(/[.!?]+/).filter(s => s.trim());
    const messageWords = message.toLowerCase().split(/\s+/).filter(w => w.length > 2);
    
    // Extract important keywords and their synonyms
    const keywordGroups: Record<string, string[]> = {
      'start': ['start', 'begin', 'beginning', 'first', 'initial'],
      'eat': ['eat', 'food', 'meal', 'diet', 'consume'],
      'benefit': ['benefit', 'help', 'good', 'improve', 'better'],
      'avoid': ['avoid', 'not', 'dont', 'shouldnt', 'cant'],
      'symptom': ['symptom', 'feel', 'feeling', 'side', 'effect'],
      'how': ['how', 'way', 'method', 'approach', 'technique']
    };
    
    // Expand keywords with synonyms
    const expandedKeywords: string[] = [];
    messageWords.forEach(word => {
      expandedKeywords.push(word);
      Object.entries(keywordGroups).forEach(([key, synonyms]) => {
        if (synonyms.includes(word)) {
          expandedKeywords.push(...synonyms);
        }
      });
    });
    
    // Score sentences based on keyword matches
    let bestMatches: { sentence: string; score: number }[] = [];
    
    for (const sentence of sentences) {
      if (sentence.length < 20) continue; // Skip very short sentences
      
      const sentenceLower = sentence.toLowerCase();
      const score = expandedKeywords.filter(keyword => 
        sentenceLower.includes(keyword)
      ).length;
      
      if (score > 0) {
        bestMatches.push({ sentence: sentence.trim(), score });
      }
    }
    
    // Sort by score and take top matches
    bestMatches.sort((a, b) => b.score - a.score);
    const topMatches = bestMatches.slice(0, 2);
    
    if (topMatches.length > 0) {
      return topMatches.map(m => m.sentence).join(' ');
    }
    
    // Fallback to diet-specific guidance
    const dietGuidance: Record<string, string> = {
      carnivore: 'Focus on fatty ruminant meats, salt to taste, and allow time for adaptation.',
      keto: 'Keep carbs under 20-30g, prioritize healthy fats, and monitor your ketone levels.',
      paleo: 'Eat whole foods our ancestors would recognize - meat, vegetables, fruits, nuts.',
      lowcarb: 'Limit carbs to 50-150g daily based on your activity level and goals.',
      ketovore: 'Combine the best of carnivore and keto - mostly meat with select low-carb plants.',
      lion: 'Stick to ruminant meat, salt, and water for the elimination phase.'
    };
    
    return dietGuidance[this.coachContext.coachType] || 
      'I recommend following the core principles of your chosen dietary approach. Would you like specific guidance on any aspect?';
  }

  private generateFallbackResponse(message: string): string {
    return `I understand you're asking about "${message}". While I'm still learning about this specific topic, I can help you with:

• Getting started with the ${this.coachContext.coachType} diet
• Food choices and meal planning
• Common challenges and solutions
• Health benefits and considerations

What specific aspect would you like to explore?`;
  }
}