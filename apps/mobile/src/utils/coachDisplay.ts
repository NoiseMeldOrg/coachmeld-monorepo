import { Coach } from '../types';

/**
 * Get the display name for a coach based on subscription status
 * For coaches with free tier, shows simplified name without "Pro"
 */
export const getCoachDisplayName = (coach: Coach): string => {
  // If user has subscription or coach is free, show full name
  if (coach.hasActiveSubscription || coach.isFree) {
    return coach.customName || coach.name;
  }
  
  // If coach has free tier enabled and user doesn't have subscription
  if (coach.freeTierEnabled && !coach.hasActiveSubscription) {
    // Remove "Pro" from the name for free tier display
    const baseName = coach.name.replace(' Pro', '');
    return coach.customName || baseName;
  }
  
  // Default to full name
  return coach.customName || coach.name;
};

/**
 * Get the features to display based on subscription status
 */
export const getCoachFeatures = (coach: Coach): string[] => {
  // If user has subscription or coach is free, show all features
  if (coach.hasActiveSubscription || coach.isFree) {
    return coach.features;
  }
  
  // If coach has free tier enabled and user doesn't have subscription
  if (coach.freeTierEnabled && !coach.hasActiveSubscription) {
    return coach.freeTierFeatures || coach.features;
  }
  
  // Default to all features
  return coach.features;
};

/**
 * Get the daily message limit for a coach
 */
export const getCoachMessageLimit = (coach: Coach): number | null => {
  // No limit for subscribed users
  if (coach.hasActiveSubscription) {
    return null;
  }
  
  // Use free tier limit if available
  if (coach.freeTierEnabled && !coach.hasActiveSubscription) {
    return coach.freeTierDailyLimit || null;
  }
  
  // Use coach's daily limit if set
  return coach.dailyMessageLimit || null;
};

/**
 * Check if a coach should be shown in the free section
 */
export const isCoachFreeAccess = (coach: Coach): boolean => {
  return coach.isFree || (!!coach.freeTierEnabled && !coach.hasActiveSubscription);
};

/**
 * Get badge text for a coach card
 */
export const getCoachBadgeText = (coach: Coach, hasGlobalSubscription?: boolean): string | null => {
  if (coach.isFree) {
    return 'FREE';
  }
  
  if (coach.hasActiveSubscription) {
    return 'ACTIVE';
  }
  
  if (coach.freeTierEnabled && !coach.hasActiveSubscription) {
    // For the actual coach card, if the name includes "Pro", show PRO badge
    if (coach.name.includes('Pro')) {
      return 'PRO';
    }
    return 'LIMITED';
  }
  
  return 'PRO';
};

/**
 * Get badge color for a coach card
 */
export const getCoachBadgeColor = (coach: Coach, theme: any): string => {
  if (coach.isFree) {
    return theme.success;
  }
  
  if (coach.hasActiveSubscription) {
    return coach.colorTheme.primary; // Use coach's color for ACTIVE badge
  }
  
  if (coach.freeTierEnabled && !coach.hasActiveSubscription) {
    // For LIMITED badge, use warning color, for PRO use coach color
    if (coach.name.includes('Pro')) {
      return coach.colorTheme.primary;
    }
    return theme.warning;
  }
  
  return coach.colorTheme.primary;
};

/**
 * Check if a coach is available to the user
 */
export const isCoachAvailable = (coach: Coach, hasGlobalSubscription: boolean): boolean => {
  // Free coaches are always available
  if (coach.isFree) {
    return true;
  }
  
  // Coach with free tier is available
  if (coach.freeTierEnabled) {
    return true;
  }
  
  // Available if user has subscription to this coach
  if (coach.hasActiveSubscription) {
    return true;
  }
  
  // Available if user has global subscription
  if (hasGlobalSubscription) {
    return true;
  }
  
  return false;
};