import { UserProfile } from '@coachmeld/shared-types';

// Export logger utilities
export * from './logger';
export { default as logger } from './logger';

// Date formatting utilities
export const formatDate = (date: Date | string): string => {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString();
};

export const formatDateTime = (date: Date | string): string => {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleString();
};

export const formatTimeAgo = (date: Date | string): string => {
  const d = typeof date === 'string' ? new Date(date) : date;
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return formatDate(d);
};

export const isToday = (date: Date | string): boolean => {
  const d = typeof date === 'string' ? new Date(date) : date;
  const today = new Date();
  return d.toDateString() === today.toDateString();
};

export const isYesterday = (date: Date | string): boolean => {
  const d = typeof date === 'string' ? new Date(date) : date;
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  return d.toDateString() === yesterday.toDateString();
};

// Validation utilities
export const validateEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

export const validatePassword = (password: string): { isValid: boolean; errors: string[] } => {
  const errors: string[] = [];
  
  if (password.length < 8) {
    errors.push('Password must be at least 8 characters long');
  }
  
  if (!/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter');
  }
  
  if (!/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter');
  }
  
  if (!/\d/.test(password)) {
    errors.push('Password must contain at least one number');
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
};

export const validateAge = (age: number): boolean => {
  return age >= 13 && age <= 120;
};

export const validateWeight = (weight: number, units: 'imperial' | 'metric'): boolean => {
  if (units === 'imperial') {
    return weight >= 50 && weight <= 1000; // pounds
  } else {
    return weight >= 20 && weight <= 500; // kilograms
  }
};

export const validateHeight = (height: number, units: 'imperial' | 'metric'): boolean => {
  if (units === 'imperial') {
    return height >= 36 && height <= 108; // inches (3ft to 9ft)
  } else {
    return height >= 90 && height <= 275; // centimeters
  }
};

// Unit conversion utilities
export const convertWeight = (weight: number, fromUnits: 'imperial' | 'metric', toUnits: 'imperial' | 'metric'): number => {
  if (fromUnits === toUnits) return weight;
  
  if (fromUnits === 'imperial' && toUnits === 'metric') {
    return weight * 0.453592; // pounds to kg
  } else {
    return weight * 2.20462; // kg to pounds
  }
};

export const convertHeight = (height: number, fromUnits: 'imperial' | 'metric', toUnits: 'imperial' | 'metric'): number => {
  if (fromUnits === toUnits) return height;
  
  if (fromUnits === 'imperial' && toUnits === 'metric') {
    return height * 2.54; // inches to cm
  } else {
    return height * 0.393701; // cm to inches
  }
};

export const formatHeight = (height: number, units: 'imperial' | 'metric'): string => {
  if (units === 'imperial') {
    const feet = Math.floor(height / 12);
    const inches = height % 12;
    return `${feet}'${inches}"`;
  } else {
    return `${height} cm`;
  }
};

export const formatWeight = (weight: number, units: 'imperial' | 'metric'): string => {
  const rounded = Math.round(weight * 10) / 10;
  return units === 'imperial' ? `${rounded} lbs` : `${rounded} kg`;
};

// BMI calculations
export const calculateBMI = (weight: number, height: number, units: 'imperial' | 'metric'): number => {
  let weightKg = weight;
  let heightM = height;
  
  if (units === 'imperial') {
    weightKg = convertWeight(weight, 'imperial', 'metric');
    heightM = convertHeight(height, 'imperial', 'metric') / 100; // cm to meters
  } else {
    heightM = height / 100; // cm to meters
  }
  
  return weightKg / (heightM * heightM);
};

export const getBMICategory = (bmi: number): string => {
  if (bmi < 18.5) return 'Underweight';
  if (bmi < 25) return 'Normal weight';
  if (bmi < 30) return 'Overweight';
  return 'Obese';
};

// Age calculation utilities
export const calculateAge = (dateOfBirth: string): number => {
  const birthDate = new Date(dateOfBirth);
  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  
  return age;
};

export const formatDateOfBirth = (dateOfBirth: string): string => {
  return new Date(dateOfBirth).toLocaleDateString();
};

// Profile completeness utilities
export const calculateProfileCompleteness = (profile: UserProfile): number => {
  const fields = [
    'name',
    'dateOfBirth',
    'gender',
    'height',
    'weight',
    'goalWeight',
    'healthGoals',
    'dietaryPreferences',
    'activityLevel'
  ];
  
  let completedFields = 0;
  
  fields.forEach(field => {
    const value = profile[field as keyof UserProfile];
    if (value !== undefined && value !== null && value !== '' && 
        (!Array.isArray(value) || value.length > 0)) {
      completedFields++;
    }
  });
  
  return Math.round((completedFields / fields.length) * 100);
};

export const getIncompleteProfileFields = (profile: UserProfile): string[] => {
  const fieldLabels: Record<string, string> = {
    name: 'Name',
    dateOfBirth: 'Date of Birth',
    gender: 'Gender',
    height: 'Height',
    weight: 'Current Weight',
    goalWeight: 'Goal Weight',
    healthGoals: 'Health Goals',
    dietaryPreferences: 'Dietary Preferences',
    activityLevel: 'Activity Level'
  };
  
  const incompleteFields: string[] = [];
  
  Object.entries(fieldLabels).forEach(([field, label]) => {
    const value = profile[field as keyof UserProfile];
    if (value === undefined || value === null || value === '' || 
        (Array.isArray(value) && value.length === 0)) {
      incompleteFields.push(label);
    }
  });
  
  return incompleteFields;
};

// String utilities
export const truncate = (text: string, maxLength: number): string => {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength - 3) + '...';
};

export const capitalize = (text: string): string => {
  return text.charAt(0).toUpperCase() + text.slice(1).toLowerCase();
};

export const titleCase = (text: string): string => {
  return text
    .split(' ')
    .map(word => capitalize(word))
    .join(' ');
};

export const generateId = (): string => {
  return Math.random().toString(36).substring(2, 15) + 
         Math.random().toString(36).substring(2, 15);
};

// Array utilities
export const shuffle = <T>(array: T[]): T[] => {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
};

export const unique = <T>(array: T[]): T[] => {
  return [...new Set(array)];
};

export const groupBy = <T, K extends keyof any>(
  array: T[],
  key: (item: T) => K
): Record<K, T[]> => {
  return array.reduce((result, item) => {
    const group = key(item);
    if (!result[group]) {
      result[group] = [];
    }
    result[group].push(item);
    return result;
  }, {} as Record<K, T[]>);
};

// Number utilities
export const clamp = (value: number, min: number, max: number): number => {
  return Math.min(Math.max(value, min), max);
};

export const round = (value: number, decimals: number = 0): number => {
  const factor = Math.pow(10, decimals);
  return Math.round(value * factor) / factor;
};

export const formatNumber = (value: number, decimals: number = 0): string => {
  return round(value, decimals).toLocaleString();
};

// Color utilities
export const hexToRgb = (hex: string): { r: number; g: number; b: number } | null => {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16)
  } : null;
};

export const rgbToHex = (r: number, g: number, b: number): string => {
  return "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
};

export const adjustBrightness = (hex: string, factor: number): string => {
  const rgb = hexToRgb(hex);
  if (!rgb) return hex;
  
  const { r, g, b } = rgb;
  const newR = Math.round(clamp(r * factor, 0, 255));
  const newG = Math.round(clamp(g * factor, 0, 255));
  const newB = Math.round(clamp(b * factor, 0, 255));
  
  return rgbToHex(newR, newG, newB);
};