import { supabase } from '../lib/supabase';
import { UserProfile, Message } from '../types';
import { embeddingService } from './embeddingService';

interface UserContextDocument {
  userId: string;
  profile: UserProfile;
  recentMessages: Message[];
  lastUpdated: Date;
}

export class UserContextService {
  constructor() {
    // No initialization needed, we use the singleton embeddingService
  }

  /**
   * Generate a comprehensive user context document
   */
  async generateUserContext(
    userId: string,
    profile: UserProfile,
    recentMessages: Message[] = [],
    limit: number = 20
  ): Promise<string> {
    const sortedMessages = recentMessages
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, limit);

    // Build a comprehensive context document
    const contextParts = [
      '# User Profile Information',
      '',
      `Name: ${profile.name || 'Not provided'}`,
      `Age: ${profile.age || 'Not provided'}`,
      `Gender: ${profile.gender || 'Not provided'}`,
      `Current Weight: ${profile.weight} ${profile.units === 'imperial' ? 'lbs' : 'kg'}`,
      `Goal Weight: ${profile.goalWeight} ${profile.units === 'imperial' ? 'lbs' : 'kg'}`,
      `Height: ${profile.height ? this.formatHeight(profile.height, profile.units) : 'Not provided'}`,
      `Activity Level: ${this.formatActivityLevel(profile.activityLevel)}`,
      `Diet Type: ${this.formatDietType(profile.dietType)}`,
      '',
      '## Health Goals',
      profile.healthGoals.length > 0 
        ? profile.healthGoals.map(goal => `- ${goal}`).join('\n')
        : '- No specific goals mentioned',
      '',
      '## Dietary Preferences',
      profile.dietaryPreferences.length > 0
        ? profile.dietaryPreferences.map(pref => `- ${pref}`).join('\n')
        : '- No specific preferences mentioned',
      '',
      '## Health Conditions',
      profile.healthConditions.length > 0
        ? profile.healthConditions.map(condition => `- ${condition}`).join('\n')
        : '- No health conditions mentioned',
      '',
    ];

    // Add recent conversation history if available
    if (sortedMessages.length > 0) {
      contextParts.push(
        '# Recent Conversation History',
        `(Last ${sortedMessages.length} messages)`,
        ''
      );

      sortedMessages.forEach((msg, index) => {
        const role = msg.sender === 'user' ? 'User' : 'Coach';
        const timeAgo = this.getTimeAgo(msg.timestamp);
        contextParts.push(
          `${role} (${timeAgo}): ${msg.text}`,
          ''
        );
      });
    }

    return contextParts.join('\n');
  }

  /**
   * Store or update user context document in the database
   */
  async updateUserContextDocument(
    userId: string,
    profile: UserProfile,
    recentMessages: Message[] = []
  ): Promise<void> {
    try {
      const contextContent = await this.generateUserContext(userId, profile, recentMessages);
      const embedding = await embeddingService.embedQuery(contextContent);

      // Check if user context document exists
      const { data: existingDocs } = await supabase
        .from('document_sources')
        .select('id')
        .eq('source_type', 'user_context')
        .eq('metadata->userId', userId)
        .single();

      const metadata = {
        userId,
        documentType: 'user_context',
        lastUpdated: new Date().toISOString(),
        profileSummary: {
          dietType: profile.dietType,
          goals: profile.healthGoals,
          activityLevel: profile.activityLevel
        }
      };

      if (existingDocs) {
        // Update existing document
        const { error: updateError } = await supabase
          .from('document_sources')
          .update({
            title: `User Context: ${profile.name}`,
            content: contextContent,
            metadata,
            updated_at: new Date().toISOString()
          })
          .eq('id', existingDocs.id);

        if (updateError) throw updateError;

        // Update the embedding in coach_documents
        const { error: embeddingError } = await supabase
          .from('coach_documents')
          .update({
            content: contextContent,
            embedding: embedding as any,
            metadata,
            updated_at: new Date().toISOString()
          })
          .eq('source_id', existingDocs.id);

        if (embeddingError) throw embeddingError;
      } else {
        // Create new document source
        const { data: newSource, error: sourceError } = await supabase
          .from('document_sources')
          .insert({
            source_type: 'user_context',
            title: `User Context: ${profile.name}`,
            content: contextContent,
            metadata
          })
          .select()
          .single();

        if (sourceError) throw sourceError;

        // Create document with embedding
        const { data: newDoc, error: docError } = await supabase
          .from('coach_documents')
          .insert({
            source_id: newSource.id,
            title: `User Context: ${profile.name}`,
            content: contextContent,
            chunk_index: 0,
            metadata,
            embedding: embedding as any
          })
          .select()
          .single();

        if (docError) throw docError;

        // Grant access to all coaches for this user's context
        const coachIds = ['carnivore', 'carnivore-pro', 'keto', 'keto-pro', 'paleo', 'lowcarb', 'ketovore', 'lion'];
        
        const accessEntries = coachIds.map(coachId => ({
          coach_id: coachId,
          document_id: newDoc.id,
          access_tier: 'free' // User's own context is always accessible
        }));

        const { error: accessError } = await supabase
          .from('coach_document_access')
          .insert(accessEntries);

        if (accessError) throw accessError;
      }
    } catch (error) {
      console.error('Error updating user context document:', error);
      throw error;
    }
  }

  /**
   * Get user context for RAG queries
   */
  async getUserContext(userId: string): Promise<string | null> {
    try {
      const { data, error } = await supabase
        .from('document_sources')
        .select('content')
        .eq('source_type', 'user_context')
        .eq('metadata->userId', userId)
        .single();

      if (error || !data) return null;
      return data.content;
    } catch (error) {
      console.error('Error fetching user context:', error);
      return null;
    }
  }

  // Helper methods
  private formatHeight(height: number, units: 'imperial' | 'metric'): string {
    if (units === 'imperial') {
      const feet = Math.floor(height / 12);
      const inches = height % 12;
      return `${feet}'${inches}"`;
    }
    return `${height} cm`;
  }

  private formatActivityLevel(level: string): string {
    const levelMap: Record<string, string> = {
      sedentary: 'Sedentary (little to no exercise)',
      lightly_active: 'Lightly Active (1-3 days/week)',
      moderately_active: 'Moderately Active (3-5 days/week)',
      very_active: 'Very Active (6-7 days/week)',
      extra_active: 'Extra Active (physical job or training twice/day)'
    };
    return levelMap[level] || level;
  }

  private formatDietType(dietType?: string): string {
    if (!dietType) return 'No specific diet';
    
    const dietMap: Record<string, string> = {
      paleo: 'Paleo',
      lowcarb: 'Low Carb',
      keto: 'Ketogenic',
      ketovore: 'Ketovore',
      carnivore: 'Carnivore',
      lion: 'Lion Diet'
    };
    return dietMap[dietType] || dietType;
  }

  private getTimeAgo(date: Date): string {
    const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000);
    const intervals = [
      { label: 'year', seconds: 31536000 },
      { label: 'month', seconds: 2592000 },
      { label: 'day', seconds: 86400 },
      { label: 'hour', seconds: 3600 },
      { label: 'minute', seconds: 60 }
    ];

    for (const interval of intervals) {
      const count = Math.floor(seconds / interval.seconds);
      if (count >= 1) {
        return `${count} ${interval.label}${count > 1 ? 's' : ''} ago`;
      }
    }
    return 'just now';
  }
}