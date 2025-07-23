// Profile validation limits
export const VALIDATION_LIMITS = {
  age: {
    min: 1,
    max: 120
  },
  weight: {
    imperial: {
      min: 1,
      max: 800  // pounds
    },
    metric: {
      min: 0.5,
      max: 363  // kg (800 lbs)
    }
  },
  height: {
    imperial: {
      minInches: 12,  // 1'0"
      maxInches: 107, // 8'11"
      minFeet: 1,
      maxFeet: 8,
      maxInchesPerFoot: 11
    },
    metric: {
      min: 30,   // cm (about 1 foot)
      max: 272   // cm (8'11")
    }
  }
};

export const validateAge = (age: number): { isValid: boolean; error?: string } => {
  if (age < VALIDATION_LIMITS.age.min) {
    return { isValid: false, error: `Age must be at least ${VALIDATION_LIMITS.age.min}` };
  }
  if (age > VALIDATION_LIMITS.age.max) {
    return { isValid: false, error: `Age must be no more than ${VALIDATION_LIMITS.age.max}` };
  }
  return { isValid: true };
};

export const validateWeight = (weight: number, units: 'imperial' | 'metric'): { isValid: boolean; error?: string } => {
  const limits = VALIDATION_LIMITS.weight[units];
  const unitLabel = units === 'imperial' ? 'lbs' : 'kg';
  
  if (weight < limits.min) {
    return { isValid: false, error: `Weight must be at least ${limits.min} ${unitLabel}` };
  }
  if (weight > limits.max) {
    return { isValid: false, error: `Weight must be no more than ${limits.max} ${unitLabel}` };
  }
  return { isValid: true };
};

export const validateHeight = (height: number, units: 'imperial' | 'metric'): { isValid: boolean; error?: string } => {
  if (units === 'imperial') {
    const limits = VALIDATION_LIMITS.height.imperial;
    if (height < limits.minInches) {
      return { isValid: false, error: `Height must be at least ${limits.minFeet}'0"` };
    }
    if (height > limits.maxInches) {
      return { isValid: false, error: `Height must be no more than ${limits.maxFeet}'${limits.maxInchesPerFoot}"` };
    }
  } else {
    const limits = VALIDATION_LIMITS.height.metric;
    if (height < limits.min) {
      return { isValid: false, error: `Height must be at least ${limits.min} cm` };
    }
    if (height > limits.max) {
      return { isValid: false, error: `Height must be no more than ${limits.max} cm` };
    }
  }
  return { isValid: true };
};

export const validateFeetInches = (feet: number, inches: number): { isValid: boolean; error?: string } => {
  const limits = VALIDATION_LIMITS.height.imperial;
  
  if (feet < 0 || feet > limits.maxFeet) {
    return { isValid: false, error: `Feet must be between 0 and ${limits.maxFeet}` };
  }
  
  if (inches < 0 || inches > limits.maxInchesPerFoot) {
    return { isValid: false, error: `Inches must be between 0 and ${limits.maxInchesPerFoot}` };
  }
  
  const totalInches = (feet * 12) + inches;
  if (totalInches < limits.minInches) {
    return { isValid: false, error: `Height must be at least ${limits.minFeet}'0"` };
  }
  if (totalInches > limits.maxInches) {
    return { isValid: false, error: `Height must be no more than ${limits.maxFeet}'${limits.maxInchesPerFoot}"` };
  }
  
  return { isValid: true };
};