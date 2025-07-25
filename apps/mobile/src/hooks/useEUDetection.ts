import { useState, useEffect } from 'react';
import { gdprService } from '../services/gdprService';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface EUDetectionState {
  isEUUser: boolean | null;
  isLoading: boolean;
  error: Error | null;
}

/**
 * Hook to detect if the user is in the EU and needs GDPR compliance
 */
export const useEUDetection = () => {
  const [state, setState] = useState<EUDetectionState>({
    isEUUser: null,
    isLoading: true,
    error: null,
  });

  useEffect(() => {
    let mounted = true;

    const detectEUUser = async () => {
      try {
        // First check if we have a cached value
        const cachedValue = await AsyncStorage.getItem('gdpr_is_eu_user');
        
        if (cachedValue !== null && mounted) {
          const isEUFromCache = cachedValue === 'true';
          setState({
            isEUUser: isEUFromCache,
            isLoading: false,
            error: null,
          });
          return;
        }

        // If no cached value, perform detection
        const isEU = await gdprService.detectEUUser();
        
        if (mounted) {
          setState({
            isEUUser: isEU,
            isLoading: false,
            error: null,
          });
        }
      } catch (error) {
        console.error('Error detecting EU user:', error);
        if (mounted) {
          setState({
            isEUUser: true, // Default to true for safety
            isLoading: false,
            error: error as Error,
          });
        }
      }
    };

    detectEUUser();

    return () => {
      mounted = false;
    };
  }, []);

  // Function to manually refresh EU detection
  const refreshEUDetection = async () => {
    setState(prev => ({ ...prev, isLoading: true, error: null }));
    
    try {
      // Clear cache
      await AsyncStorage.removeItem('gdpr_is_eu_user');
      
      // Re-detect
      const isEU = await gdprService.detectEUUser();
      
      setState({
        isEUUser: isEU,
        isLoading: false,
        error: null,
      });
    } catch (error) {
      console.error('Error refreshing EU detection:', error);
      setState({
        isEUUser: true, // Default to true for safety
        isLoading: false,
        error: error as Error,
      });
    }
  };

  return {
    ...state,
    refreshEUDetection,
  };
};