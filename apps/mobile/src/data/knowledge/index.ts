import { carnivoreKnowledge } from './carnivore';
import { carnivoreProKnowledge } from './carnivorePro';
import { ketoKnowledge } from './keto';
import { paleoKnowledge } from './paleo';
import { lowcarbKnowledge } from './lowcarb';
import { ketovoreKnowledge } from './ketovore';
import { lionKnowledge } from './lion';

export interface DietKnowledge {
  dietType: string;
  coachId: string;
  knowledgeBase: Array<{
    category: string;
    content: string;
  }>;
  commonQuestions: Array<{
    question: string;
    answer: string;
  }>;
}

// Map of coach ID to their knowledge base
export const dietKnowledgeMap: Record<string, DietKnowledge> = {
  'carnivore': carnivoreKnowledge,
  'carnivore-pro': carnivoreProKnowledge,
  'keto': ketoKnowledge,
  'paleo': paleoKnowledge,
  'lowcarb': lowcarbKnowledge,
  'ketovore': ketovoreKnowledge,
  'lion': lionKnowledge,
};

// Helper function to get knowledge by coach ID
export const getCoachKnowledge = (coachId: string): DietKnowledge | null => {
  return dietKnowledgeMap[coachId] || null;
};

// Helper function to search knowledge base
export const searchKnowledge = (coachId: string, query: string): Array<{
  category: string;
  content: string;
  relevance: number;
}> => {
  const knowledge = dietKnowledgeMap[coachId];
  if (!knowledge) return [];

  const searchTerms = query.toLowerCase().split(' ');
  const results = knowledge.knowledgeBase.map(item => {
    const text = `${item.category} ${item.content}`.toLowerCase();
    const relevance = searchTerms.reduce((score, term) => {
      return score + (text.includes(term) ? 1 : 0);
    }, 0);
    
    return { ...item, relevance };
  });

  return results
    .filter(r => r.relevance > 0)
    .sort((a, b) => b.relevance - a.relevance);
};

// Get all FAQ questions for a coach
export const getCoachFAQs = (coachId: string) => {
  const knowledge = dietKnowledgeMap[coachId];
  return knowledge?.commonQuestions || [];
};

// Export all diet types for reference
export const dietTypes = [
  'carnivore',
  'keto',
  'paleo',
  'lowcarb',
  'ketovore',
  'lion'
] as const;

export type DietType = typeof dietTypes[number];