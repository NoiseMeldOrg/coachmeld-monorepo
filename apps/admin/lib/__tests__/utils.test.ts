import { cn, formatDistanceToNow } from '../utils';

describe('utils', () => {
  describe('cn (className merger)', () => {
    it('should merge class names correctly', () => {
      expect(cn('px-2 py-1', 'text-sm')).toBe('px-2 py-1 text-sm');
    });

    it('should handle conditional classes', () => {
      expect(cn('base-class', true && 'conditional-class')).toBe('base-class conditional-class');
      expect(cn('base-class', false && 'conditional-class')).toBe('base-class');
    });

    it('should resolve Tailwind conflicts', () => {
      // twMerge should resolve conflicting Tailwind classes
      expect(cn('px-2 px-4')).toBe('px-4');
      expect(cn('text-sm text-lg')).toBe('text-lg');
    });

    it('should handle empty inputs', () => {
      expect(cn()).toBe('');
      expect(cn('')).toBe('');
      expect(cn(null, undefined)).toBe('');
    });
  });

  describe('formatDistanceToNow', () => {
    beforeAll(() => {
      // Mock the current time to ensure consistent tests
      jest.useFakeTimers();
      jest.setSystemTime(new Date('2024-01-01T12:00:00Z'));
    });

    afterAll(() => {
      jest.useRealTimers();
    });

    it('should return "just now" for very recent dates', () => {
      const now = new Date('2024-01-01T12:00:00Z');
      expect(formatDistanceToNow(now)).toBe('just now');
    });

    it('should format seconds correctly', () => {
      const thirtySecondsAgo = new Date('2024-01-01T11:59:30Z');
      expect(formatDistanceToNow(thirtySecondsAgo)).toBe('30 seconds ago');

      const oneSecondAgo = new Date('2024-01-01T11:59:59Z');
      expect(formatDistanceToNow(oneSecondAgo)).toBe('1 second ago');
    });

    it('should format minutes correctly', () => {
      const twoMinutesAgo = new Date('2024-01-01T11:58:00Z');
      expect(formatDistanceToNow(twoMinutesAgo)).toBe('2 minutes ago');

      const oneMinuteAgo = new Date('2024-01-01T11:59:00Z');
      expect(formatDistanceToNow(oneMinuteAgo)).toBe('1 minute ago');
    });

    it('should format hours correctly', () => {
      const twoHoursAgo = new Date('2024-01-01T10:00:00Z');
      expect(formatDistanceToNow(twoHoursAgo)).toBe('2 hours ago');

      const oneHourAgo = new Date('2024-01-01T11:00:00Z');
      expect(formatDistanceToNow(oneHourAgo)).toBe('1 hour ago');
    });

    it('should format days correctly', () => {
      const twoDaysAgo = new Date('2023-12-30T12:00:00Z');
      expect(formatDistanceToNow(twoDaysAgo)).toBe('2 days ago');

      const oneDayAgo = new Date('2023-12-31T12:00:00Z');
      expect(formatDistanceToNow(oneDayAgo)).toBe('1 day ago');
    });

    it('should format months correctly', () => {
      const twoMonthsAgo = new Date('2023-11-01T12:00:00Z');
      expect(formatDistanceToNow(twoMonthsAgo)).toBe('2 months ago');
    });

    it('should format years correctly', () => {
      const twoYearsAgo = new Date('2022-01-01T12:00:00Z');
      expect(formatDistanceToNow(twoYearsAgo)).toBe('2 years ago');

      const oneYearAgo = new Date('2023-01-01T12:00:00Z');
      expect(formatDistanceToNow(oneYearAgo)).toBe('1 year ago');
    });

    it('should handle edge cases', () => {
      // Test boundary conditions
      const exactlyOneMinute = new Date('2024-01-01T11:59:00Z'); // exactly 60 seconds ago
      expect(formatDistanceToNow(exactlyOneMinute)).toBe('1 minute ago');

      const almostOneMinute = new Date('2024-01-01T11:59:01Z'); // 59 seconds ago
      expect(formatDistanceToNow(almostOneMinute)).toBe('59 seconds ago');
    });
  });
});