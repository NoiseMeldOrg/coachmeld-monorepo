import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { GDPRConsentFlow } from '../GDPRConsentFlow';
import { gdprService } from '../../services/gdprService';

// Mock the GDPR service
jest.mock('../../services/gdprService');

describe('GDPRConsentFlow', () => {
  const mockOnComplete = jest.fn();
  const mockOnSkip = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render consent options for EU users', () => {
    const { getByText, getAllByRole } = render(
      <GDPRConsentFlow
        isEUUser={true}
        onComplete={mockOnComplete}
        onSkip={mockOnSkip}
      />
    );

    expect(getByText(/privacy matters/i)).toBeTruthy();
    expect(getByText(/data processing/i)).toBeTruthy();
    expect(getByText(/analytics/i)).toBeTruthy();
    expect(getByText(/marketing/i)).toBeTruthy();
    expect(getAllByRole('switch')).toHaveLength(3);
  });

  it('should show simplified consent for non-EU users', () => {
    const { getByText, queryByText } = render(
      <GDPRConsentFlow
        isEUUser={false}
        onComplete={mockOnComplete}
        onSkip={mockOnSkip}
      />
    );

    expect(getByText(/privacy policy/i)).toBeTruthy();
    expect(queryByText(/marketing/i)).toBeFalsy();
  });

  it('should require data processing consent', async () => {
    const { getByText, getAllByRole } = render(
      <GDPRConsentFlow
        isEUUser={true}
        onComplete={mockOnComplete}
        onSkip={mockOnSkip}
      />
    );

    // Try to continue without accepting data processing
    const continueButton = getByText(/continue/i);
    fireEvent.press(continueButton);

    await waitFor(() => {
      expect(getByText(/must accept data processing/i)).toBeTruthy();
    });
    expect(mockOnComplete).not.toHaveBeenCalled();
  });

  it('should save consent preferences on continue', async () => {
    (gdprService.saveConsent as jest.Mock).mockResolvedValue(undefined);

    const { getByText, getAllByRole } = render(
      <GDPRConsentFlow
        isEUUser={true}
        onComplete={mockOnComplete}
        onSkip={mockOnSkip}
      />
    );

    // Enable data processing
    const switches = getAllByRole('switch');
    fireEvent(switches[0], 'onValueChange', true);

    // Continue
    const continueButton = getByText(/continue/i);
    fireEvent.press(continueButton);

    await waitFor(() => {
      expect(gdprService.saveConsent).toHaveBeenCalledWith({
        dataProcessing: true,
        analytics: false,
        marketing: false,
        version: expect.any(String),
      });
      expect(mockOnComplete).toHaveBeenCalled();
    });
  });

  it('should show privacy policy modal when link is pressed', async () => {
    const { getByText, queryByTestId } = render(
      <GDPRConsentFlow
        isEUUser={true}
        onComplete={mockOnComplete}
        onSkip={mockOnSkip}
      />
    );

    const privacyLink = getByText(/privacy policy/i);
    fireEvent.press(privacyLink);

    await waitFor(() => {
      expect(queryByTestId('privacy-policy-modal')).toBeTruthy();
    });
  });

  it('should handle consent error gracefully', async () => {
    (gdprService.saveConsent as jest.Mock).mockRejectedValue(new Error('Network error'));

    const { getByText, getAllByRole } = render(
      <GDPRConsentFlow
        isEUUser={true}
        onComplete={mockOnComplete}
        onSkip={mockOnSkip}
      />
    );

    // Enable data processing
    const switches = getAllByRole('switch');
    fireEvent(switches[0], 'onValueChange', true);

    // Continue
    const continueButton = getByText(/continue/i);
    fireEvent.press(continueButton);

    await waitFor(() => {
      expect(getByText(/error saving preferences/i)).toBeTruthy();
    });
    expect(mockOnComplete).not.toHaveBeenCalled();
  });

  it('should show legal basis explanations', () => {
    const { getByText } = render(
      <GDPRConsentFlow
        isEUUser={true}
        onComplete={mockOnComplete}
        onSkip={mockOnSkip}
      />
    );

    expect(getByText(/legal basis/i)).toBeTruthy();
    expect(getByText(/legitimate interest/i)).toBeTruthy();
    expect(getByText(/consent/i)).toBeTruthy();
  });

  it('should allow toggling individual consent options', () => {
    const { getAllByRole } = render(
      <GDPRConsentFlow
        isEUUser={true}
        onComplete={mockOnComplete}
        onSkip={mockOnSkip}
      />
    );

    const switches = getAllByRole('switch');
    
    // Toggle analytics
    fireEvent(switches[1], 'onValueChange', true);
    expect(switches[1].props.value).toBe(true);
    
    // Toggle marketing
    fireEvent(switches[2], 'onValueChange', true);
    expect(switches[2].props.value).toBe(true);
  });
});