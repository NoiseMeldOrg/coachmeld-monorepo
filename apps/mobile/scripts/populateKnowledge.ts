import { KnowledgeEmbeddingService } from '../src/services/knowledgeEmbeddingService';

async function populateKnowledgeBase() {
  console.log('Starting knowledge base population...');
  
  try {
    await KnowledgeEmbeddingService.embedAllCoachKnowledge();
    console.log('✅ Knowledge base population completed successfully!');
  } catch (error) {
    console.error('❌ Failed to populate knowledge base:', error);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  populateKnowledgeBase()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}

export { populateKnowledgeBase };