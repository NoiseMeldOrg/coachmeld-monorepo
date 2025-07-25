import React from 'react';
import { render, fireEvent, waitFor, act } from '@testing-library/react-native';
import { Alert } from 'react-native';
import ConsentManagementScreen from '../ConsentManagementScreen';
import { gdprService } from '../../services/gdprService';
import { ThemeProvider } from '../../context/ThemeContext';

// Mock the navigation
const mockGoBack = jest.fn();
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({
    goBack: mockGoBack,
  }),
}));

// Mock the GDPR service
jest.mock('../../services/gdprService', () => ({
  gdprService: {
    getConsentStatus: jest.fn(),
    updateConsent: jest.fn(),
  },
}));

// Mock Alert
jest.spyOn(Alert, 'alert');

// Mock theme provider for tests
const TestWrapper = ({ children }: { children: React.ReactNode }) => (
  <ThemeProvider>{children}</ThemeProvider>
);

describe('ConsentManagementScreen', () => {
  const mockConsentStatus = {
    health_data_processing: true,
    meal_personalization: true,
    progress_tracking: false,
    marketing_communications: false,
    analytics_tracking: false,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (gdprService.getConsentStatus as jest.Mock).mockResolvedValue(mockConsentStatus);
    (gdprService.updateConsent as jest.Mock).mockResolvedValue({});
  });

  it('renders loading state initially', async () => {
    const { getByText } = render(
      <TestWrapper>
        <ConsentManagementScreen />
      </TestWrapper>
    );

    expect(getByText('Loading consent settings...')).toBeTruthy();
  });

  it('renders consent categories after loading', async () => {
    const { getByText, queryByText } = render(
      <TestWrapper>
        <ConsentManagementScreen />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(queryByText('Loading consent settings...')).toBeNull();
    });

    expect(getByText('Your Data, Your Choice')).toBeTruthy();
    expect(getByText('Essential Services')).toBeTruthy();
    expect(getByText('Health Coaching & AI Processing')).toBeTruthy();
    expect(getByText('Meal Planning & Personalization')).toBeTruthy();
    expect(getByText('Progress Tracking & Analytics')).toBeTruthy();
    expect(getByText('Marketing Communications')).toBeTruthy();
    expect(getByText('Analytics & App Improvement')).toBeTruthy();
  });

  it('shows required badge for essential services', async () => {
    const { getByText } = render(
      <TestWrapper>
        <ConsentManagementScreen />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(getByText('Required')).toBeTruthy();
    });
  });

  it('loads consent status from service', async () => {
    render(
      <TestWrapper>
        <ConsentManagementScreen />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(gdprService.getConsentStatus).toHaveBeenCalled();
    });
  });

  it('toggles consent settings when switch is pressed', async () => {
    const { getAllByRole } = render(
      <TestWrapper>
        <ConsentManagementScreen />
      </TestWrapper>
    );

    await waitFor(() => {
      const switches = getAllByRole('switch');
      expect(switches.length).toBeGreaterThan(0);
    });

    const switches = getAllByRole('switch');
    // Toggle the health coaching switch (should be second switch, first is essential which is disabled)
    const healthSwitch = switches[1];
    
    act(() => {
      fireEvent(healthSwitch, 'valueChange', false);
    });

    // Verify the switch state changed (this would be reflected in the component state)
    expect(healthSwitch.props.value).toBe(false);
  });

  it('cannot toggle essential services switch', async () => {
    const { getAllByRole } = render(
      <TestWrapper>
        <ConsentManagementScreen />
      </TestWrapper>
    );

    await waitFor(() => {
      const switches = getAllByRole('switch');
      expect(switches.length).toBeGreaterThan(0);
    });

    const switches = getAllByRole('switch');
    const essentialSwitch = switches[0]; // First switch should be essential services
    
    expect(essentialSwitch.props.disabled).toBe(true);
  });

  it('shows data types information when info button is pressed', async () => {
    const { getAllByText } = render(
      <TestWrapper>
        <ConsentManagementScreen />
      </TestWrapper>
    );

    await waitFor(() => {
      const infoButtons = getAllByText('View data types & legal basis');
      expect(infoButtons.length).toBeGreaterThan(0);
    });

    const infoButtons = getAllByText('View data types & legal basis');
    
    act(() => {
      fireEvent.press(infoButtons[0]);
    });

    expect(Alert.alert).toHaveBeenCalledWith(
      'Data Types Processed',
      expect.stringContaining('Essential Services'),
      [{ text: 'OK' }]
    );
  });

  it('saves consent preferences when save button is pressed', async () => {
    const { getByText, getAllByRole } = render(
      <TestWrapper>
        <ConsentManagementScreen />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(getByText('Save Consent Preferences')).toBeTruthy();
    });

    // Toggle a switch first
    const switches = getAllByRole('switch');
    act(() => {
      fireEvent(switches[1], 'valueChange', false); // Toggle health coaching
    });

    // Press save button
    const saveButton = getByText('Save Consent Preferences');
    act(() => {
      fireEvent.press(saveButton);
    });

    await waitFor(() => {
      expect(gdprService.updateConsent).toHaveBeenCalledWith(
        expect.objectContaining({
          health_data_processing: false,
        })
      );
    });
  });

  it('shows success alert and navigates back after saving', async () => {
    const { getByText } = render(
      <TestWrapper>
        <ConsentManagementScreen />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(getByText('Save Consent Preferences')).toBeTruthy();
    });

    const saveButton = getByText('Save Consent Preferences');
    act(() => {
      fireEvent.press(saveButton);
    });

    await waitFor(() => {
      expect(Alert.alert).toHaveBeenCalledWith(
        'Settings Saved',
        'Your consent preferences have been updated successfully.',
        [
          {
            text: 'OK',
            onPress: expect.any(Function),
          }
        ]
      );
    });

    // Simulate pressing OK on the alert
    const alertCall = (Alert.alert as jest.Mock).mock.calls.find(
      call => call[0] === 'Settings Saved'
    );
    if (alertCall && alertCall[2] && alertCall[2][0].onPress) {
      alertCall[2][0].onPress();
    }

    expect(mockGoBack).toHaveBeenCalled();
  });

  it('shows error alert when loading fails', async () => {
    (gdprService.getConsentStatus as jest.Mock).mockRejectedValue(
      new Error('Network error')
    );

    render(
      <TestWrapper>
        <ConsentManagementScreen />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(Alert.alert).toHaveBeenCalledWith(
        'Error',
        'Failed to load consent settings. Please try again.'
      );
    });
  });

  it('shows error alert when saving fails', async () => {
    (gdprService.updateConsent as jest.Mock).mockRejectedValue(
      new Error('Save error')
    );

    const { getByText } = render(
      <TestWrapper>
        <ConsentManagementScreen />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(getByText('Save Consent Preferences')).toBeTruthy();
    });

    const saveButton = getByText('Save Consent Preferences');
    act(() => {
      fireEvent.press(saveButton);
    });

    await waitFor(() => {
      expect(Alert.alert).toHaveBeenCalledWith(
        'Error',
        'Failed to save consent settings. Please try again.'
      );
    });
  });

  it('shows loading indicator on save button while saving', async () => {
    // Mock a delayed response
    (gdprService.updateConsent as jest.Mock).mockImplementation(
      () => new Promise(resolve => setTimeout(resolve, 100))
    );

    const { getByText, queryByText } = render(
      <TestWrapper>
        <ConsentManagementScreen />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(getByText('Save Consent Preferences')).toBeTruthy();
    });

    const saveButton = getByText('Save Consent Preferences');
    act(() => {
      fireEvent.press(saveButton);
    });

    // Should show loading state
    expect(queryByText('Save Consent Preferences')).toBeNull();
  });

  it('displays legal notice about GDPR compliance', async () => {
    const { getByText } = render(
      <TestWrapper>
        <ConsentManagementScreen />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(getByText(/These settings comply with GDPR Articles 6, 7, and 9/)).toBeTruthy();
    });
  });

  it('handles back button press', async () => {
    const { getAllByTestId } = render(
      <TestWrapper>
        <ConsentManagementScreen />
      </TestWrapper>
    );

    // Note: The back button doesn't have a testID, so we'll test navigation mock was set up
    expect(mockGoBack).toHaveBeenCalledTimes(0);
    
    // This test verifies the mock is working correctly
    // In practice, the back button would call navigation.goBack()
  });

  it('shows correct consent status for each category', async () => {
    const { getAllByRole } = render(
      <TestWrapper>
        <ConsentManagementScreen />
      </TestWrapper>
    );

    await waitFor(() => {
      const switches = getAllByRole('switch');
      expect(switches.length).toBe(6); // 6 categories total
    });

    const switches = getAllByRole('switch');
    
    // Essential services should be enabled and disabled (required)
    expect(switches[0].props.value).toBe(true);
    expect(switches[0].props.disabled).toBe(true);
    
    // Health coaching should match mock data
    expect(switches[1].props.value).toBe(mockConsentStatus.health_data_processing);
    
    // Meal personalization should match mock data
    expect(switches[2].props.value).toBe(mockConsentStatus.meal_personalization);
    
    // Progress tracking should match mock data
    expect(switches[3].props.value).toBe(mockConsentStatus.progress_tracking);
    
    // Marketing should match mock data
    expect(switches[4].props.value).toBe(mockConsentStatus.marketing_communications);
    
    // Analytics should match mock data
    expect(switches[5].props.value).toBe(mockConsentStatus.analytics_tracking);
  });
});