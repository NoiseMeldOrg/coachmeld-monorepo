import {
  validateAge,
  validateWeight,
  validateHeight,
  validateFeetInches,
  VALIDATION_LIMITS
} from '../validation';

describe('validation utilities', () => {
  describe('validateAge', () => {
    it('should validate valid ages', () => {
      expect(validateAge(25)).toEqual({ isValid: true });
      expect(validateAge(1)).toEqual({ isValid: true });
      expect(validateAge(120)).toEqual({ isValid: true });
    });

    it('should reject ages below minimum', () => {
      const result = validateAge(0);
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Age must be at least 1');
    });

    it('should reject ages above maximum', () => {
      const result = validateAge(121);
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Age must be no more than 120');
    });
  });

  describe('validateWeight', () => {
    describe('imperial units', () => {
      it('should validate valid weights', () => {
        expect(validateWeight(150, 'imperial')).toEqual({ isValid: true });
        expect(validateWeight(1, 'imperial')).toEqual({ isValid: true });
        expect(validateWeight(800, 'imperial')).toEqual({ isValid: true });
      });

      it('should reject weights below minimum', () => {
        const result = validateWeight(0.5, 'imperial');
        expect(result.isValid).toBe(false);
        expect(result.error).toBe('Weight must be at least 1 lbs');
      });

      it('should reject weights above maximum', () => {
        const result = validateWeight(801, 'imperial');
        expect(result.isValid).toBe(false);
        expect(result.error).toBe('Weight must be no more than 800 lbs');
      });
    });

    describe('metric units', () => {
      it('should validate valid weights', () => {
        expect(validateWeight(70, 'metric')).toEqual({ isValid: true });
        expect(validateWeight(0.5, 'metric')).toEqual({ isValid: true });
        expect(validateWeight(363, 'metric')).toEqual({ isValid: true });
      });

      it('should reject weights below minimum', () => {
        const result = validateWeight(0.4, 'metric');
        expect(result.isValid).toBe(false);
        expect(result.error).toBe('Weight must be at least 0.5 kg');
      });

      it('should reject weights above maximum', () => {
        const result = validateWeight(364, 'metric');
        expect(result.isValid).toBe(false);
        expect(result.error).toBe('Weight must be no more than 363 kg');
      });
    });
  });

  describe('validateHeight', () => {
    describe('imperial units', () => {
      it('should validate valid heights', () => {
        expect(validateHeight(72, 'imperial')).toEqual({ isValid: true }); // 6'0"
        expect(validateHeight(12, 'imperial')).toEqual({ isValid: true }); // 1'0"
        expect(validateHeight(107, 'imperial')).toEqual({ isValid: true }); // 8'11"
      });

      it('should reject heights below minimum', () => {
        const result = validateHeight(11, 'imperial');
        expect(result.isValid).toBe(false);
        expect(result.error).toBe("Height must be at least 1'0\"");
      });

      it('should reject heights above maximum', () => {
        const result = validateHeight(108, 'imperial');
        expect(result.isValid).toBe(false);
        expect(result.error).toBe("Height must be no more than 8'11\"");
      });
    });

    describe('metric units', () => {
      it('should validate valid heights', () => {
        expect(validateHeight(180, 'metric')).toEqual({ isValid: true });
        expect(validateHeight(30, 'metric')).toEqual({ isValid: true });
        expect(validateHeight(272, 'metric')).toEqual({ isValid: true });
      });

      it('should reject heights below minimum', () => {
        const result = validateHeight(29, 'metric');
        expect(result.isValid).toBe(false);
        expect(result.error).toBe('Height must be at least 30 cm');
      });

      it('should reject heights above maximum', () => {
        const result = validateHeight(273, 'metric');
        expect(result.isValid).toBe(false);
        expect(result.error).toBe('Height must be no more than 272 cm');
      });
    });
  });

  describe('validateFeetInches', () => {
    it('should validate valid feet and inches combinations', () => {
      expect(validateFeetInches(6, 0)).toEqual({ isValid: true });
      expect(validateFeetInches(5, 11)).toEqual({ isValid: true });
      expect(validateFeetInches(1, 0)).toEqual({ isValid: true });
      expect(validateFeetInches(8, 11)).toEqual({ isValid: true });
    });

    it('should reject invalid feet values', () => {
      const result = validateFeetInches(-1, 0);
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Feet must be between 0 and 8');

      const result2 = validateFeetInches(9, 0);
      expect(result2.isValid).toBe(false);
      expect(result2.error).toBe('Feet must be between 0 and 8');
    });

    it('should reject invalid inches values', () => {
      const result = validateFeetInches(5, -1);
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Inches must be between 0 and 11');

      const result2 = validateFeetInches(5, 12);
      expect(result2.isValid).toBe(false);
      expect(result2.error).toBe('Inches must be between 0 and 11');
    });

    it('should reject heights too short overall', () => {
      const result = validateFeetInches(0, 11); // 11 inches total
      expect(result.isValid).toBe(false);
      expect(result.error).toBe("Height must be at least 1'0\"");
    });

    it('should reject heights too tall overall', () => {
      const result = validateFeetInches(9, 0); // This would be 108 inches, over the limit
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Feet must be between 0 and 8');
    });
  });
});