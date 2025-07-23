import { UserProfile } from '../types';

const CARNIVORE_COACH_CONTEXT = `You are a Carnivore Coach, an AI health advisor specializing in the carnivore diet and lifestyle. 
You provide evidence-based advice on meat-based nutrition, focusing on optimal health through animal-based foods.
Your responses should be supportive, informative, and tailored to the user's specific health goals and conditions.
Always start your response by repeating or paraphrasing the user's question.`;

export const generateCoachResponse = async (
  userMessage: string,
  userProfile: UserProfile | null
): Promise<string> => {
  // Simulate AI processing time
  await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 1000));

  // Build user context
  let userContext = '';
  if (userProfile && userProfile.name) {
    const heightDisplay = userProfile.height
      ? (userProfile.units === 'imperial' 
        ? `${Math.floor(userProfile.height / 12)}' ${userProfile.height % 12}"` 
        : `${userProfile.height}cm`)
      : 'not provided';
    const weightDisplay = userProfile.units === 'imperial' 
      ? `${userProfile.weight} lbs` 
      : `${userProfile.weight}kg`;
    
    userContext = `
User Profile:
- Name: ${userProfile.name}
- Age: ${userProfile.age}
- Gender: ${userProfile.gender}
- Height: ${heightDisplay}
- Weight: ${weightDisplay}
- Activity Level: ${userProfile.activityLevel.replace('_', ' ')}
- Health Goals: ${userProfile.healthGoals.join(', ')}
- Dietary Preferences: ${userProfile.dietaryPreferences.join(', ')}
- Health Conditions: ${userProfile.healthConditions.join(', ')}
`;
  }

  // Generate response based on message content
  const messageLower = userMessage.toLowerCase();
  
  // Question repetition
  let response = `Regarding your question: "${userMessage}"\n\n`;

  // Basic response logic (this would be replaced with actual AI API call)
  if (messageLower.includes('start') || messageLower.includes('begin')) {
    response += `I'm excited to help you begin your carnivore journey! The carnivore diet focuses on consuming only animal products - primarily meat, fish, eggs, and some dairy if tolerated. 

Here's how to start:
1. Begin by eliminating all plant foods gradually over 1-2 weeks
2. Focus on fatty cuts of beef, lamb, and pork
3. Include organ meats 1-2 times per week for optimal nutrition
4. Salt your food to taste and stay hydrated
5. Listen to your body during the adaptation phase (2-4 weeks)

${userProfile?.name ? `Based on your profile, ${userProfile.name}, ` : 'I recommend '}${
      userProfile?.gender === 'female' 
        ? 'starting with 1.5-2.5 pounds of meat daily' 
        : 'starting with 2-3 pounds of meat daily'
    }, adjusted based on your hunger and energy levels. ${
      userProfile?.gender === 'female' 
        ? 'Women often need slightly less protein but should prioritize fatty cuts for hormonal health.' 
        : ''
    }`;
  } else if (messageLower.includes('benefit')) {
    response += `The carnivore diet offers numerous potential benefits:

• Improved mental clarity and focus
• Stable energy levels throughout the day
• Reduced inflammation and joint pain
• Better digestion and elimination of bloating
• Weight loss and improved body composition
• Enhanced mood and reduced anxiety
• Clearer skin and improved dental health

${userProfile?.healthGoals.length ? `Given your goals of ${userProfile.healthGoals.join(' and ')}, you may particularly benefit from the anti-inflammatory and metabolic improvements.` : 'Many people report significant improvements within the first month.'}`;
  } else if (messageLower.includes('meat') || messageLower.includes('food')) {
    response += `On the carnivore diet, focus on these nutrient-dense animal foods:

Best choices:
• Beef (ribeye, ground beef, chuck roast)
• Lamb (chops, ground lamb, leg)
• Pork (bacon, pork belly, chops)
• Organ meats (liver, heart, kidney)
• Fish (salmon, sardines, mackerel)
• Eggs and egg yolks
• Bone broth

Optional (if tolerated):
• Heavy cream
• Butter
• Hard cheeses

Aim for fattier cuts to ensure adequate energy and fat-soluble vitamins.`;
  } else if (messageLower.includes('hormone') || messageLower.includes('menstrual') || messageLower.includes('period')) {
    response += `Hormonal health on the carnivore diet:\n\n`;
    
    if (userProfile?.gender === 'female') {
      response += `For women, the carnivore diet can significantly impact hormonal balance:

• Many women report more regular menstrual cycles
• Reduced PMS symptoms and cramping
• Improved fertility markers
• Better mood stability throughout the month

Key recommendations:
1. Prioritize fatty cuts of meat (80/20 ground beef, ribeye, lamb)
2. Include egg yolks daily for cholesterol (hormone precursor)
3. Consider adding organ meats, especially liver, once a week
4. Don't restrict calories - eat to satiety
5. Be patient - hormonal changes can take 3-6 months

Some women may experience temporary cycle irregularities during adaptation. This typically normalizes within 2-3 months.`;
    } else {
      response += `For men, the carnivore diet often supports healthy testosterone levels:

• Increased energy and vitality
• Better muscle recovery and growth
• Improved mood and motivation
• Enhanced libido

Focus on nutrient-dense foods like ribeye, eggs, and organ meats for optimal hormonal support.`;
    }
  } else {
    response += `Thank you for your question about the carnivore lifestyle. While I don't have specific information about that topic in my current knowledge base, I encourage you to:

1. Focus on eating fatty meat to satiety
2. Keep meals simple - meat, salt, water
3. Listen to your body's hunger and satiety signals
4. Stay consistent for at least 30 days to see results

Feel free to ask me about starting the diet, food choices, benefits, or any specific concerns you may have!`;
  }

  return response;
};