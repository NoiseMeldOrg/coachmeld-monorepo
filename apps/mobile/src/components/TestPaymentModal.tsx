import React, { useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  Modal, 
  TouchableOpacity, 
  ActivityIndicator,
  Alert 
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { simulateTestPayment } from '../utils/testUserUtils';
import { TEST_USER_CONFIG } from '../config/testUsers';

interface TestPaymentModalProps {
  visible: boolean;
  onClose: () => void;
  onSuccess: (subscriptionId: string) => void;
  planId: string;
  planName: string;
  price: string;
  coachId?: string;
}

export const TestPaymentModal: React.FC<TestPaymentModalProps> = ({
  visible,
  onClose,
  onSuccess,
  planId,
  planName,
  price,
  coachId,
}) => {
  const { theme } = useTheme();
  const { user } = useAuth();
  const [processing, setProcessing] = useState(false);
  const [selectedCard, setSelectedCard] = useState('SUCCESS');

  const handleTestPayment = async () => {
    if (!user) return;

    setProcessing(true);

    try {
      // Simulate processing delay
      await new Promise(resolve => setTimeout(resolve, 2000));

      if (selectedCard === 'DECLINE') {
        throw new Error('Your card was declined');
      }

      if (selectedCard === 'INSUFFICIENT_FUNDS') {
        throw new Error('Insufficient funds');
      }

      const result = await simulateTestPayment(user.id, planId, coachId);

      if (result.success && result.subscriptionId) {
        Alert.alert(
          '✅ Test Payment Successful',
          `Your test subscription for ${planName} has been activated!`,
          [
            {
              text: 'OK',
              onPress: () => {
                onSuccess(result.subscriptionId!);
                onClose();
              },
            },
          ]
        );
      } else {
        throw new Error(result.error?.message || 'Payment failed');
      }
    } catch (error: any) {
      Alert.alert(
        '❌ Payment Failed',
        error.message || 'An error occurred during payment',
        [{ text: 'OK' }]
      );
    } finally {
      setProcessing(false);
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={[styles.container, { backgroundColor: theme.surface }]}>
          <View style={styles.header}>
            <Text style={[styles.title, { color: theme.text }]}>
              Test Payment Mode
            </Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close" size={24} color={theme.text} />
            </TouchableOpacity>
          </View>

          <View style={[styles.testBanner, { backgroundColor: theme.warning + '20' }]}>
            <Ionicons name="flask" size={20} color={theme.warning} />
            <Text style={[styles.testText, { color: theme.text }]}>
              This is a simulated payment for testing
            </Text>
          </View>

          <View style={styles.planInfo}>
            <Text style={[styles.planName, { color: theme.text }]}>
              {planName}
            </Text>
            <Text style={[styles.planPrice, { color: theme.primary }]}>
              {price}
            </Text>
          </View>

          <View style={styles.cardSection}>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>
              Select Test Card
            </Text>
            
            {Object.entries(TEST_USER_CONFIG.TEST_CARDS).map(([key, number]) => (
              <TouchableOpacity
                key={key}
                style={[
                  styles.cardOption,
                  { 
                    backgroundColor: selectedCard === key 
                      ? theme.primary + '20' 
                      : theme.background,
                    borderColor: selectedCard === key 
                      ? theme.primary 
                      : theme.border,
                  },
                ]}
                onPress={() => setSelectedCard(key)}
              >
                <View style={styles.cardInfo}>
                  <Text style={[styles.cardNumber, { color: theme.text }]}>
                    •••• •••• •••• {number.slice(-4)}
                  </Text>
                  <Text style={[styles.cardLabel, { color: theme.textSecondary }]}>
                    {key.replace(/_/g, ' ')}
                  </Text>
                </View>
                {selectedCard === key && (
                  <Ionicons 
                    name="checkmark-circle" 
                    size={24} 
                    color={theme.primary} 
                  />
                )}
              </TouchableOpacity>
            ))}
          </View>

          <TouchableOpacity
            style={[
              styles.payButton,
              { 
                backgroundColor: processing ? theme.surface : theme.primary,
                borderWidth: processing ? 1 : 0,
                borderColor: theme.border,
              },
            ]}
            onPress={handleTestPayment}
            disabled={processing}
          >
            {processing ? (
              <ActivityIndicator color={theme.primary} />
            ) : (
              <>
                <Ionicons name="card" size={20} color="#FFFFFF" />
                <Text style={styles.payButtonText}>
                  Complete Test Payment
                </Text>
              </>
            )}
          </TouchableOpacity>

          <Text style={[styles.disclaimer, { color: theme.textSecondary }]}>
            No real charges will be made. This is for testing purposes only.
          </Text>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  container: {
    width: '90%',
    maxWidth: 400,
    borderRadius: 16,
    padding: 20,
    maxHeight: '80%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
  },
  closeButton: {
    padding: 4,
  },
  testBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    marginBottom: 20,
  },
  testText: {
    marginLeft: 8,
    fontSize: 14,
    fontWeight: '500',
  },
  planInfo: {
    alignItems: 'center',
    marginBottom: 24,
  },
  planName: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 4,
  },
  planPrice: {
    fontSize: 24,
    fontWeight: '700',
  },
  cardSection: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  cardOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 12,
  },
  cardInfo: {
    flex: 1,
  },
  cardNumber: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 4,
  },
  cardLabel: {
    fontSize: 12,
    textTransform: 'capitalize',
  },
  payButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
  },
  payButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  disclaimer: {
    fontSize: 12,
    textAlign: 'center',
    fontStyle: 'italic',
  },
});