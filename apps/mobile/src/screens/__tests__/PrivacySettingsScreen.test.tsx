import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { PrivacySettingsScreen } from '../PrivacySettingsScreen';
import { gdprService } from '../../services/gdprService';
import { useNavigation } from '@react-navigation/native';

// Mock dependencies
jest.mock('../../services/gdprService');
jest.mock('@react-navigation/native', () => ({
  useNavigation: jest.fn(),
}));

describe('PrivacySettingsScreen', () => {
  const mockNavigation = {
    navigate: jest.fn(),
    goBack: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (useNavigation as jest.Mock).mockReturnValue(mockNavigation);
    
    // Default mock implementation
    (gdprService.getPrivacySettings as jest.Mock).mockResolvedValue({
      shareDataForImprovements: true,
      allowAnalytics: false,
      marketingEmails: true,
    });
    
    (gdprService.getActiveRequests as jest.Mock).mockResolvedValue([]);
  });

  it('should render all privacy settings sections', async () => {
    const { getByText } = render(<PrivacySettingsScreen />);

    await waitFor(() => {
      expect(getByText(/privacy settings/i)).toBeTruthy();
      expect(getByText(/data collection/i)).toBeTruthy();
      expect(getByText(/your rights/i)).toBeTruthy();
      expect(getByText(/active requests/i)).toBeTruthy();
    });
  });

  it('should load and display current privacy settings', async () => {
    const { getAllByRole } = render(<PrivacySettingsScreen />);

    await waitFor(() => {
      const switches = getAllByRole('switch');
      expect(switches[0].props.value).toBe(true); // shareDataForImprovements
      expect(switches[1].props.value).toBe(false); // allowAnalytics
      expect(switches[2].props.value).toBe(true); // marketingEmails
    });
  });

  it('should update privacy settings when toggled', async () => {
    (gdprService.updatePrivacySettings as jest.Mock).mockResolvedValue(undefined);

    const { getAllByRole } = render(<PrivacySettingsScreen />);

    await waitFor(() => {
      const switches = getAllByRole('switch');
      fireEvent(switches[0], 'onValueChange', false);
    });

    await waitFor(() => {
      expect(gdprService.updatePrivacySettings).toHaveBeenCalledWith({
        shareDataForImprovements: false,
        allowAnalytics: false,
        marketingEmails: true,
      });
    });
  });

  it('should navigate to data export when export button is pressed', async () => {
    const { getByText } = render(<PrivacySettingsScreen />);

    await waitFor(() => {
      const exportButton = getByText(/export my data/i);
      fireEvent.press(exportButton);
    });

    expect(mockNavigation.navigate).toHaveBeenCalledWith('DataExport');
  });

  it('should navigate to delete account when delete button is pressed', async () => {
    const { getByText } = render(<PrivacySettingsScreen />);

    await waitFor(() => {
      const deleteButton = getByText(/delete account/i);
      fireEvent.press(deleteButton);
    });

    expect(mockNavigation.navigate).toHaveBeenCalledWith('DeleteAccount');
  });

  it('should show active GDPR requests', async () => {
    (gdprService.getActiveRequests as jest.Mock).mockResolvedValue([
      {
        id: '1',
        request_type: 'export',
        status: 'pending',
        created_at: '2025-01-01T00:00:00Z',
      },
      {
        id: '2',
        request_type: 'deletion',
        status: 'processing',
        created_at: '2025-01-02T00:00:00Z',
      },
    ]);

    const { getByText } = render(<PrivacySettingsScreen />);

    await waitFor(() => {
      expect(getByText(/data export - pending/i)).toBeTruthy();
      expect(getByText(/account deletion - processing/i)).toBeTruthy();
    });
  });

  it('should navigate to privacy policy when policy link is pressed', async () => {
    const { getByText } = render(<PrivacySettingsScreen />);

    await waitFor(() => {
      const policyLink = getByText(/view privacy policy/i);
      fireEvent.press(policyLink);
    });

    expect(mockNavigation.navigate).toHaveBeenCalledWith('PrivacyPolicy');
  });

  it('should show consent management section', async () => {
    const { getByText } = render(<PrivacySettingsScreen />);

    await waitFor(() => {
      expect(getByText(/consent preferences/i)).toBeTruthy();
      expect(getByText(/manage consent/i)).toBeTruthy();
    });

    const manageButton = getByText(/manage consent/i);
    fireEvent.press(manageButton);

    expect(mockNavigation.navigate).toHaveBeenCalledWith('ConsentManagement');
  });

  it('should handle errors gracefully', async () => {
    (gdprService.getPrivacySettings as jest.Mock).mockRejectedValue(new Error('Network error'));

    const { getByText } = render(<PrivacySettingsScreen />);

    await waitFor(() => {
      expect(getByText(/error loading settings/i)).toBeTruthy();
    });
  });

  it('should show data correction option', async () => {
    const { getByText } = render(<PrivacySettingsScreen />);

    await waitFor(() => {
      const correctionButton = getByText(/correct my data/i);
      fireEvent.press(correctionButton);
    });

    expect(mockNavigation.navigate).toHaveBeenCalledWith('DataCorrection');
  });

  it('should refresh settings on pull-to-refresh', async () => {
    const { getByTestId } = render(<PrivacySettingsScreen />);

    await waitFor(() => {
      const scrollView = getByTestId('privacy-settings-scroll');
      fireEvent(scrollView, 'onRefresh');
    });

    expect(gdprService.getPrivacySettings).toHaveBeenCalledTimes(2); // Initial + refresh
    expect(gdprService.getActiveRequests).toHaveBeenCalledTimes(2);
  });
});