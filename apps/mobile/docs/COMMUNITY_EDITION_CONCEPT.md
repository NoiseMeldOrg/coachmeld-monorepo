# Community Edition Concept (Future Consideration)

## Overview
A potential free/open-source version of CoachMeld with limited features to build community and provide basic carnivore coaching.

## Feature Comparison

| Feature | Premium (Paid) | Community (Free) |
|---------|---------------|------------------|
| AI Model | Gemini 2.5 with RAG | DeepSeek (self-hosted) |
| Response Quality | Advanced, personalized | Basic guidance |
| Chat History | Unlimited, cloud sync | Local only, 30 days |
| Meal Plans | AI-generated, personalized | Template-based |
| Progress Tracking | Full analytics | Basic tracking |
| Export Data | PDF, CSV, JSON | Text only |
| Support | Priority email support | Community forum |
| Updates | Immediate | Delayed by 3-6 months |

## Technical Implementation

### Community Edition Limitations:
1. **AI Integration**: Direct DeepSeek API calls only (no RAG enhancement)
2. **Storage**: Local storage only (no Supabase sync)
3. **Features**: Core chat functionality only
4. **Branding**: "CoachMeld Community Edition" watermark

### Potential Benefits:
- Build user community
- Get feedback for premium features
- Create upgrade path to paid version
- Establish market presence

### Risks to Consider:
- May cannibalize paid version sales
- Support burden for free users
- Need to maintain two codebases

## Implementation Strategy (If Pursued)

1. **Separate Repository**: `coach-meld-community`
2. **License**: MIT or Apache 2.0
3. **Feature Flags**: Use environment variables to toggle premium features
4. **Clear Differentiation**: Make premium benefits obvious

## Decision Criteria

Consider launching Community Edition when:
- Premium version has stable user base
- Need to expand market reach
- Competition offers free alternatives
- Have resources for dual maintenance

## Notes
- Keep premium features truly premium (RAG system, advanced AI)
- Community edition should still provide value
- Clear upgrade path is essential
- Consider time-delayed feature releases