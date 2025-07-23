import { supabase } from '../../lib/supabase';

interface KnowledgeBaseEntry {
  id: string;
  category: string;
  subcategory?: string;
  questionPatterns: string[];
  answerTemplate: string;
  variables?: Record<string, any>;
  minConfidence: number;
}

interface MatchResult {
  answer: string;
  confidence: number;
  category: string;
}

export class BasicCoachService {
  private knowledgeBase: KnowledgeBaseEntry[] = [];
  private coachId: string;

  constructor(coachId: string) {
    this.coachId = coachId;
    this.loadKnowledgeBase();
  }

  private async loadKnowledgeBase() {
    try {
      const { data, error } = await supabase
        .from('coach_knowledge_base')
        .select('*')
        .eq('coach_id', this.coachId)
        .eq('is_active', true)
        .order('priority', { ascending: false });

      if (error) throw error;

      this.knowledgeBase = data.map(entry => ({
        id: entry.id,
        category: entry.category,
        subcategory: entry.subcategory,
        questionPatterns: entry.question_patterns,
        answerTemplate: entry.answer_template,
        variables: entry.variables,
        minConfidence: entry.min_confidence,
      }));
    } catch (error) {
      console.error('Error loading knowledge base:', error);
      // Load default fallback responses
      this.loadDefaultResponses();
    }
  }

  private loadDefaultResponses() {
    this.knowledgeBase = [
      {
        id: 'default-greeting',
        category: 'greeting',
        questionPatterns: ['hello', 'hi', 'hey', 'good morning', 'good afternoon'],
        answerTemplate: "Hello! I'm your Basic Health Coach. How can I help you with your health journey today?",
        minConfidence: 0.5,
      },
      {
        id: 'default-help',
        category: 'help',
        questionPatterns: ['help', 'what can you do', 'capabilities', 'features'],
        answerTemplate: "I can provide general health advice on nutrition, fitness, sleep, and wellness. I'm here to support your health goals! What specific area would you like to explore?",
        minConfidence: 0.6,
      },
      {
        id: 'default-nutrition',
        category: 'nutrition',
        questionPatterns: ['diet', 'food', 'eat', 'nutrition', 'meal', 'hungry'],
        answerTemplate: "For optimal health, focus on whole foods including lean proteins, vegetables, fruits, and healthy fats. Stay hydrated and minimize processed foods. Would you like specific meal suggestions?",
        minConfidence: 0.6,
      },
      {
        id: 'default-exercise',
        category: 'exercise',
        questionPatterns: ['exercise', 'workout', 'fitness', 'gym', 'training'],
        answerTemplate: "Regular exercise is crucial for health. Aim for at least 150 minutes of moderate activity weekly, including both cardio and strength training. What's your current fitness level?",
        minConfidence: 0.6,
      },
      {
        id: 'default-sleep',
        category: 'sleep',
        questionPatterns: ['sleep', 'tired', 'rest', 'insomnia', 'fatigue'],
        answerTemplate: "Good sleep is essential. Aim for 7-9 hours nightly. Create a consistent bedtime routine, keep your room cool and dark, and avoid screens before bed. Are you having specific sleep issues?",
        minConfidence: 0.6,
      },
    ];
  }

  async processMessage(message: string, userContext?: any): Promise<string> {
    const normalizedMessage = message.toLowerCase().trim();
    
    // Find best matching response
    const match = this.findBestMatch(normalizedMessage);
    
    if (match.confidence >= 0.5) {
      // Personalize response if user context available
      return this.personalizeResponse(match.answer, userContext);
    }
    
    // Fallback response
    return this.getFallbackResponse(normalizedMessage);
  }

  private findBestMatch(message: string): MatchResult {
    let bestMatch: MatchResult = {
      answer: '',
      confidence: 0,
      category: 'unknown',
    };

    for (const entry of this.knowledgeBase) {
      const confidence = this.calculateConfidence(message, entry.questionPatterns);
      
      if (confidence > bestMatch.confidence && confidence >= entry.minConfidence) {
        bestMatch = {
          answer: entry.answerTemplate,
          confidence,
          category: entry.category,
        };
      }
    }

    return bestMatch;
  }

  private calculateConfidence(message: string, patterns: string[]): number {
    let maxConfidence = 0;

    for (const pattern of patterns) {
      let confidence = 0;
      const patternWords = pattern.toLowerCase().split(' ');
      const messageWords = message.toLowerCase().split(' ');

      // Check for exact phrase match
      if (message.includes(pattern)) {
        confidence = 0.9;
      } else {
        // Check for word matches
        const matchedWords = patternWords.filter(word => 
          messageWords.some(msgWord => msgWord.includes(word) || word.includes(msgWord))
        );
        confidence = matchedWords.length / patternWords.length * 0.7;
      }

      maxConfidence = Math.max(maxConfidence, confidence);
    }

    return maxConfidence;
  }

  private personalizeResponse(template: string, userContext?: any): string {
    let response = template;

    if (userContext?.userProfile) {
      const { name, goal } = userContext.userProfile;
      
      // Simple personalization
      if (name) {
        response = response.replace('[name]', name);
      }
      if (goal && response.includes('[goal]')) {
        response = response.replace('[goal]', goal.toLowerCase());
      }
    }

    return response;
  }

  private getFallbackResponse(message: string): string {
    const fallbacks = [
      "That's an interesting question! While I'm a basic health coach with general knowledge, I'd recommend consulting with a healthcare professional for specific medical advice. Is there something else I can help you with regarding general health and wellness?",
      "I understand you're asking about " + this.extractTopic(message) + ". For the most accurate guidance on this topic, I'd suggest upgrading to one of our specialized Pro coaches who can provide more detailed, personalized advice.",
      "I'm here to help with general health topics! Could you rephrase your question or ask about nutrition, exercise, sleep, or general wellness?",
    ];

    return fallbacks[Math.floor(Math.random() * fallbacks.length)];
  }

  private extractTopic(message: string): string {
    // Simple topic extraction
    const topics = ['nutrition', 'exercise', 'sleep', 'stress', 'diet', 'fitness'];
    const found = topics.find(topic => message.toLowerCase().includes(topic));
    return found || 'health';
  }

  async updateUsageStats(entryId: string) {
    try {
      await supabase.rpc('increment', { 
        table_name: 'coach_knowledge_base',
        column_name: 'usage_count',
        row_id: entryId 
      });
    } catch (error) {
      console.error('Error updating usage stats:', error);
    }
  }
}