# CoachMeld Coach Roster

## Current Coaches (Implemented)
1. **Carnivore Coach Pro** 🥩
   - Focus: Carnivore diet guidance
   - Status: ✅ Implemented
   - Icon: restaurant
   - Color: Red theme

2. **Fitness Coach** 💪
   - Focus: Exercise and training
   - Status: ✅ Implemented (basic)
   - Icon: fitness
   - Color: Green theme

3. **Mindfulness Coach** 🧘
   - Focus: Meditation and mental wellness
   - Status: ✅ Implemented (basic)
   - Icon: leaf
   - Color: Purple theme

## Planned Coaches

### Health & Wellness
4. **Keto Coach** 🥑
   - Focus: Ketogenic diet guidance
   - Features: Macro tracking, ketone optimization
   - Target audience: Low-carb dieters

5. **Fasting Coach** ⏱️
   - Focus: Intermittent fasting, extended fasting
   - Features: Fasting timers, protocol guidance
   - Target audience: People interested in fasting

6. **Sleep Coach** 😴
   - Focus: Sleep optimization
   - Features: Sleep hygiene, circadian rhythm
   - Target audience: People with sleep issues

7. **Longevity Coach** 🧬
   - Focus: Anti-aging, healthspan
   - Features: Supplement guidance, lifestyle optimization
   - Target audience: Biohackers, health optimizers

### Mental & Spiritual
8. **Discipleship Coach** ✝️
   - Focus: Christian discipleship and spiritual growth
   - Features: Bible study guidance, prayer support, spiritual disciplines
   - Knowledge Base: Scripture references, theological resources
   - Target audience: Christians seeking spiritual growth

9. **Life Coach** 🎯
   - Focus: Goal setting, personal development
   - Features: Goal tracking, habit formation
   - Target audience: Personal growth enthusiasts

10. **Therapy Coach** 💭
    - Focus: Mental health support (not replacement for therapy)
    - Features: CBT techniques, emotional regulation
    - Target audience: Mental wellness seekers

### Specialized Diets
11. **Paleo Coach** 🦴
    - Focus: Paleolithic diet
    - Features: Approved foods, recipes
    - Target audience: Paleo dieters

12. **Vegan Coach** 🌱
    - Focus: Plant-based nutrition
    - Features: Nutrient optimization, meal planning
    - Target audience: Vegans and vegetarians

13. **GAPS Diet Coach** 🦠
    - Focus: Gut and Psychology Syndrome diet
    - Features: Healing protocols, stage progression
    - Target audience: People with gut issues

### Performance & Skills
14. **Business Coach** 💼
    - Focus: Entrepreneurship, business strategy
    - Features: Business planning, marketing advice
    - Target audience: Entrepreneurs

15. **Study Coach** 📚
    - Focus: Learning optimization
    - Features: Study techniques, memory improvement
    - Target audience: Students and lifelong learners

16. **Productivity Coach** ⚡
    - Focus: Time management, efficiency
    - Features: GTD, time blocking, focus techniques
    - Target audience: Professionals

### Specialty Coaches
17. **Autoimmune Coach** 🛡️
    - Focus: Autoimmune protocol (AIP)
    - Features: Elimination diets, symptom tracking
    - Target audience: People with autoimmune conditions

18. **Hormone Coach** ⚖️
    - Focus: Hormonal balance
    - Features: Cycle tracking, optimization strategies
    - Target audience: Women's health, men's health

19. **Recovery Coach** 🔄
    - Focus: Addiction recovery support
    - Features: Daily check-ins, coping strategies
    - Target audience: People in recovery

20. **Parent Coach** 👨‍👩‍👧‍👦
    - Focus: Parenting strategies
    - Features: Age-specific guidance, behavior management
    - Target audience: Parents

## Implementation Priority

### Phase 1 (Core Health)
- ✅ Carnivore Coach
- ⏳ Keto Coach
- ⏳ Fasting Coach
- ⏳ Fitness Coach (enhance)

### Phase 2 (Wellness Expansion)
- ⏳ Sleep Coach
- ⏳ Mindfulness Coach (enhance)
- ⏳ Discipleship Coach
- ⏳ Life Coach

### Phase 3 (Specialized)
- ⏳ Autoimmune Coach
- ⏳ Hormone Coach
- ⏳ Business Coach
- ⏳ Other specialty coaches

## Coach Configuration Template

```typescript
{
  id: 'discipleship',
  name: 'Discipleship Coach',
  description: 'Your personal guide for spiritual growth and Christian discipleship',
  coachType: 'spiritual',
  isFree: false,
  monthlyPrice: 9.99,
  colorTheme: {
    primary: '#6B46C1',  // Purple
    secondary: '#9333EA', // Light purple
    accent: '#C084FC'    // Accent purple
  },
  iconName: 'book',  // Or 'cross' if available
  features: [
    'Daily devotional guidance',
    'Scripture study plans',
    'Prayer support',
    'Spiritual disciplines coaching',
    'Accountability partnership'
  ],
  systemPrompt: `You are a compassionate Christian discipleship coach. 
    Help users grow in their faith through biblical wisdom, prayer, 
    and practical spiritual disciplines. Always ground advice in Scripture 
    and orthodox Christian theology.`,
  knowledgeBase: [
    'Bible (multiple translations)',
    'Classic Christian texts',
    'Spiritual disciplines resources',
    'Prayer guides',
    'Theological resources'
  ]
}
```

## Notes

- Each coach should have a distinct personality and expertise
- Coaches can share some knowledge base resources
- Premium coaches can access more advanced features
- Consider coach bundles (e.g., "Health Bundle" with Carnivore + Keto + Fasting)