/**
 * Coach configuration for document access
 * IMPORTANT: diet_type is now informational only and not used for business logic
 * All coach access is managed through the coach_document_access table
 */

// Coach IDs from CoachMeld mobile app
export const COACH_IDS = {
  CARNIVORE_PRO: 'carnivore-pro',
  PALEO: 'paleo',
  LOWCARB: 'lowcarb',
  KETO: 'keto',
  KETOVORE: 'ketovore',
  LION: 'lion',
} as const

export type CoachId = typeof COACH_IDS[keyof typeof COACH_IDS]
export type AccessTier = 'free' | 'premium' | 'pro'

// Get all available coaches
export function getAllCoaches(): Array<{ id: CoachId; name: string; coachType: string }> {
  return [
    { id: COACH_IDS.CARNIVORE_PRO, name: 'Carnivore Coach Pro', coachType: 'carnivore' },
    { id: COACH_IDS.PALEO, name: 'Paleo Coach', coachType: 'paleo' },
    { id: COACH_IDS.LOWCARB, name: 'Low Carb Coach', coachType: 'lowcarb' },
    { id: COACH_IDS.KETO, name: 'Keto Coach', coachType: 'keto' },
    { id: COACH_IDS.KETOVORE, name: 'Ketovore Coach', coachType: 'ketovore' },
    { id: COACH_IDS.LION, name: 'Lion Diet Coach', coachType: 'lion' },
  ]
}

// Check if a coach ID is valid
export function isValidCoachId(coachId: string): coachId is CoachId {
  return Object.values(COACH_IDS).includes(coachId as CoachId)
}

// Coach access configuration for UI
export interface CoachAccessConfig {
  coachId: CoachId
  accessTier: AccessTier
  selected: boolean
}

// Generate default coach access (all coaches at pro tier)
export function getDefaultCoachAccess(): CoachAccessConfig[] {
  const allCoaches = getAllCoaches()
  
  return allCoaches.map(coach => ({
    coachId: coach.id,
    accessTier: 'pro' as AccessTier,
    selected: true, // All coaches selected by default
  }))
}