import { Coach } from '../types';

export const dietCoaches: Coach[] = [
  {
    id: 'carnivore-pro',
    name: 'Carnivore Coach Pro',
    description: 'Expert carnivore diet guidance',
    coachType: 'carnivore',
    isFree: false,
    monthlyPrice: 9.99,
    colorTheme: {
      primary: '#FF6B6B',
      secondary: '#FFE0E0',
      accent: '#FF4444',
    },
    iconName: 'food-steak',
    iconLibrary: 'MaterialCommunityIcons',
    iconRotation: -90,
    features: [
      'Unlimited personalized guidance',
      'Advanced meal planning',
      'Nutrient tracking & optimization',
      'Direct meat sourcing tips',
      'Adaptation troubleshooting',
      'Priority support',
    ],
    isActive: true,
    hasActiveSubscription: false,
    // Free tier configuration
    freeTierEnabled: true,
    freeTierDailyLimit: 5,
    freeTierFeatures: [
      'Basic carnivore principles',
      'Limited to 5 messages/day',
      'General meal ideas',
      'Community support',
    ],
  },
  {
    id: 'paleo',
    name: 'Paleo Coach',
    description: 'Your ancestral health guide',
    coachType: 'paleo',
    isFree: false,
    monthlyPrice: 9.99,
    colorTheme: {
      primary: '#8B4513',
      secondary: '#F5DEB3',
      accent: '#654321',
    },
    iconName: 'leaf',
    iconLibrary: 'Ionicons',
    iconRotation: 0,
    features: [
      'Paleo principles & philosophy',
      'Whole food recipes',
      'Ancestral lifestyle tips',
      'Modern paleo adaptations',
    ],
    isActive: true,
    hasActiveSubscription: false,
  },
  {
    id: 'lowcarb',
    name: 'Low Carb Coach',
    description: 'Your low-carb lifestyle mentor',
    coachType: 'lowcarb',
    isFree: false,
    monthlyPrice: 9.99,
    colorTheme: {
      primary: '#4169E1',
      secondary: '#E6F2FF',
      accent: '#1E90FF',
    },
    iconName: 'nutrition',
    iconLibrary: 'Ionicons',
    iconRotation: 0,
    features: [
      'Carb counting & tracking',
      'Low-carb meal planning',
      'Blood sugar management',
      'Sustainable weight loss',
    ],
    isActive: true,
    hasActiveSubscription: false,
  },
  {
    id: 'keto',
    name: 'Keto Coach',
    description: 'Your ketogenic diet specialist',
    coachType: 'keto',
    isFree: false,
    monthlyPrice: 9.99,
    colorTheme: {
      primary: '#9370DB',
      secondary: '#F3E8FF',
      accent: '#8A2BE2',
    },
    iconName: 'water',
    iconLibrary: 'Ionicons',
    iconRotation: 0,
    features: [
      'Ketosis optimization',
      'Macro calculations',
      'Keto flu prevention',
      'Fat adaptation strategies',
    ],
    isActive: true,
    hasActiveSubscription: false,
  },
  {
    id: 'ketovore',
    name: 'Ketovore Coach',
    description: 'Your keto-carnivore hybrid guide',
    coachType: 'ketovore',
    isFree: false,
    monthlyPrice: 9.99,
    colorTheme: {
      primary: '#FF8C00',
      secondary: '#FFF4E6',
      accent: '#FF6347',
    },
    iconName: 'food-drumstick',
    iconLibrary: 'MaterialCommunityIcons',
    iconRotation: 0,
    features: [
      'Ketovore meal balance',
      'Plant food selection',
      'Transition guidance',
      'Flexibility strategies',
    ],
    isActive: true,
    hasActiveSubscription: false,
  },
  {
    id: 'lion',
    name: 'Lion Diet Coach',
    description: 'Your elimination diet expert',
    coachType: 'lion',
    isFree: false,
    monthlyPrice: 9.99,
    colorTheme: {
      primary: '#DAA520',
      secondary: '#FFFACD',
      accent: '#B8860B',
    },
    iconName: 'paw',
    iconLibrary: 'MaterialCommunityIcons',
    iconRotation: 0,
    features: [
      'Ruminant meat focus',
      'Elimination protocol',
      'Reintroduction guidance',
      'Healing optimization',
    ],
    isActive: true,
    hasActiveSubscription: false,
  },
];

export const getDietCoachById = (id: string): Coach | undefined => {
  return dietCoaches.find(coach => coach.id === id);
};

export const getFreeDietCoaches = (): Coach[] => {
  return dietCoaches.filter(coach => coach.isFree);
};

export const getPremiumDietCoaches = (): Coach[] => {
  return dietCoaches.filter(coach => !coach.isFree);
};