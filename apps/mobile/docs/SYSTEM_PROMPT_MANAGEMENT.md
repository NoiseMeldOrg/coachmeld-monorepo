# System Prompt Management Guide

This guide explains how to manage and customize the AI system prompts for each diet coach.

## Database Structure

System prompts are stored in the `coaches` table with the following columns:
- `system_prompt` - The prompt template text
- `prompt_updated_at` - Timestamp of last prompt update

## Template Variables

The system prompt supports the following template variables that are automatically replaced:

- `{{dietName}}` - The coach's display name (e.g., "Carnivore Coach")
- `{{dietType}}` - The diet type identifier (e.g., "carnivore")
- `{{specialties}}` - Comma-separated list of coach specialties/features

## Default System Prompt

```
You are a {{dietName}} Coach, an AI health advisor specializing in the {{dietType}} diet.

Your responses should be:
- Concise and to the point (2-3 short paragraphs max)
- Focused on practical, actionable advice
- Specific to the {{dietType}} approach

Start with a brief acknowledgment of the question, then provide clear, helpful guidance.
Keep your response conversational and friendly, like texting with a knowledgeable friend.
Base your responses on the knowledge provided from the RAG system and your training.
```

## Updating System Prompts

### Via Supabase Dashboard

1. Go to your Supabase dashboard
2. Navigate to Table Editor → `coaches`
3. Find the coach you want to update
4. Edit the `system_prompt` field
5. Save changes

### Via SQL

```sql
-- Update system prompt for a specific coach
UPDATE coaches 
SET system_prompt = 'Your new prompt here with {{dietName}} variables...'
WHERE coach_type = 'carnivore';

-- View current prompts
SELECT name, coach_type, system_prompt 
FROM coaches 
ORDER BY name;
```

### Via Admin Interface

If using the coach-meld-admin web app:
1. Navigate to Coaches section
2. Select the coach to edit
3. Update the "System Prompt" field
4. Save changes

## Best Practices

1. **Keep prompts concise** - Shorter prompts leave more tokens for context and responses
2. **Be specific** - Include diet-specific guidance and principles
3. **Use template variables** - This allows dynamic content while keeping prompts editable
4. **Test changes** - Always test prompt changes with sample questions
5. **Version control** - Consider keeping a backup of prompts before major changes

## Examples

### Carnivore Coach Enhanced Prompt
```
You are {{dietName}}, specializing in the carnivore way of eating.

Guidelines:
- Prioritize ruminant meats (beef, lamb, bison)
- Emphasize adequate fat intake for energy
- Address common adaptation symptoms
- Keep advice practical and actionable

Respond concisely (2-3 paragraphs max) with a friendly, supportive tone.
Use the RAG knowledge base to provide accurate, evidence-based guidance.
```

### Keto Coach Technical Prompt
```
You are {{dietName}}, an expert in ketogenic nutrition and metabolic health.

Focus on:
- Achieving and maintaining ketosis (0.5-3.0 mmol/L)
- Proper macro calculations (70-80% fat, 15-25% protein, 5-10% carbs)
- Electrolyte management and supplementation
- Troubleshooting common keto challenges

Provide clear, actionable advice backed by the knowledge base.
Keep responses conversational yet informative.
```

## Troubleshooting

If prompts aren't updating:
1. Check for database connection issues
2. Verify the coach ID exists
3. Look for console errors in the application
4. The system will fall back to default prompts if database fetch fails

## Security Notes

- Only admin users should have write access to system prompts
- Prompts are sanitized before use to prevent injection attacks
- Template variables are replaced safely without eval()