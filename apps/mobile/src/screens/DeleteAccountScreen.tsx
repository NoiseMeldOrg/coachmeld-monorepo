import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../context/AuthContext';
import { gdprService } from '../services/gdprService';

export function DeleteAccountScreen() {
  const { theme } = useTheme();
  const navigation = useNavigation();
  const { signOut } = useAuth();
  const [confirmText, setConfirmText] = useState('');
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);

  const canDelete = confirmText.toLowerCase() === 'delete my account';

  const handleDeleteAccount = async () => {
    if (!canDelete) {
      Alert.alert(
        'Confirmation Required',
        'Please type "DELETE MY ACCOUNT" to confirm.',
        [{ text: 'OK' }]
      );
      return;
    }

    Alert.alert(
      'Final Confirmation',
      'This action cannot be undone. Your account and all associated data will be permanently deleted within 30 days as required by GDPR.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete Account',
          style: 'destructive',
          onPress: async () => {
            setLoading(true);
            try {
              const { requestId } = await gdprService.requestAccountDeletion(
                reason || 'No reason provided'
              );
              
              Alert.alert(
                'Deletion Requested',
                'Your account deletion has been scheduled. You will receive a confirmation email, and your account will be permanently deleted within 30 days.\n\nRequest ID: ' + requestId,
                [
                  {
                    text: 'OK',
                    onPress: async () => {
                      // Sign out the user
                      await signOut();
                    },
                  },
                ]
              );
            } catch (error) {
              console.error('Error requesting account deletion:', error);
              Alert.alert(
                'Error',
                'Failed to request account deletion. Please try again later.',
                [{ text: 'OK' }]
              );
            } finally {
              setLoading(false);
            }
          },
        },
      ]
    );
  };

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: theme.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={styles.backButton}
          >
            <Ionicons name="arrow-back" size={24} color={theme.text} />
          </TouchableOpacity>
          <Text style={[styles.title, { color: theme.error || '#ff3333' }]}>
            Delete Account
          </Text>
        </View>

        <View style={[styles.warningSection, { backgroundColor: theme.error + '20' || '#ff333320' }]}>
          <Ionicons name="warning" size={32} color={theme.error || '#ff3333'} />
          <Text style={[styles.warningTitle, { color: theme.error || '#ff3333' }]}>
            This action is permanent
          </Text>
          <Text style={[styles.warningText, { color: theme.text }]}>
            Deleting your account will permanently remove all your data, including:
          </Text>
        </View>

        <View style={styles.dataList}>
          <View style={styles.dataItem}>
            <Ionicons name="person" size={20} color={theme.textSecondary} />
            <Text style={[styles.dataItemText, { color: theme.text }]}>
              Your profile and personal information
            </Text>
          </View>
          <View style={styles.dataItem}>
            <Ionicons name="chatbubbles" size={20} color={theme.textSecondary} />
            <Text style={[styles.dataItemText, { color: theme.text }]}>
              All chat history with AI coaches
            </Text>
          </View>
          <View style={styles.dataItem}>
            <Ionicons name="restaurant" size={20} color={theme.textSecondary} />
            <Text style={[styles.dataItemText, { color: theme.text }]}>
              Saved recipes and meal plans
            </Text>
          </View>
          <View style={styles.dataItem}>
            <Ionicons name="card" size={20} color={theme.textSecondary} />
            <Text style={[styles.dataItemText, { color: theme.text }]}>
              Subscription and payment history
            </Text>
          </View>
          <View style={styles.dataItem}>
            <Ionicons name="settings" size={20} color={theme.textSecondary} />
            <Text style={[styles.dataItemText, { color: theme.text }]}>
              All preferences and settings
            </Text>
          </View>
        </View>

        <View style={styles.reasonSection}>
          <Text style={[styles.reasonLabel, { color: theme.text }]}>
            Why are you leaving? (Optional)
          </Text>
          <TextInput
            style={[
              styles.reasonInput,
              {
                backgroundColor: theme.inputBackground,
                color: theme.text,
                borderColor: theme.border,
              },
            ]}
            placeholder="Help us improve by sharing your reason..."
            placeholderTextColor={theme.textSecondary}
            value={reason}
            onChangeText={setReason}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
          />
        </View>

        <View style={styles.gdprInfo}>
          <Ionicons name="shield-checkmark" size={20} color={theme.primary} />
          <Text style={[styles.gdprText, { color: theme.textSecondary }]}>
            In compliance with GDPR Article 17 (Right to Erasure), your data will be permanently deleted within 30 days of this request.
          </Text>
        </View>

        <View style={styles.confirmSection}>
          <Text style={[styles.confirmLabel, { color: theme.text }]}>
            Type "DELETE MY ACCOUNT" to confirm:
          </Text>
          <TextInput
            style={[
              styles.confirmInput,
              {
                backgroundColor: theme.inputBackground,
                color: theme.text,
                borderColor: canDelete ? theme.error || '#ff3333' : theme.border,
              },
            ]}
            placeholder="DELETE MY ACCOUNT"
            placeholderTextColor={theme.textSecondary}
            value={confirmText}
            onChangeText={setConfirmText}
            autoCapitalize="characters"
          />
        </View>

        <TouchableOpacity
          style={[
            styles.deleteButton,
            {
              backgroundColor: canDelete ? theme.error || '#ff3333' : theme.border,
              opacity: loading || !canDelete ? 0.6 : 1,
            },
          ]}
          onPress={handleDeleteAccount}
          disabled={loading || !canDelete}
        >
          {loading ? (
            <ActivityIndicator color="white" />
          ) : (
            <>
              <Ionicons name="trash" size={24} color="white" />
              <Text style={styles.deleteButtonText}>Delete My Account</Text>
            </>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.cancelButton}
          onPress={() => navigation.goBack()}
        >
          <Text style={[styles.cancelButtonText, { color: theme.primary }]}>
            Cancel
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    paddingBottom: 40,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    paddingBottom: 10,
  },
  backButton: {
    marginRight: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  warningSection: {
    margin: 20,
    padding: 20,
    borderRadius: 12,
    alignItems: 'center',
  },
  warningTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginTop: 12,
    marginBottom: 8,
  },
  warningText: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
  dataList: {
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  dataItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  dataItemText: {
    fontSize: 14,
    marginLeft: 12,
    flex: 1,
  },
  reasonSection: {
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  reasonLabel: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 8,
  },
  reasonInput: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    minHeight: 100,
  },
  gdprInfo: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  gdprText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
    marginLeft: 12,
  },
  confirmSection: {
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  confirmLabel: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 8,
  },
  confirmInput: {
    borderWidth: 2,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    fontWeight: '600',
  },
  deleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 20,
    paddingVertical: 16,
    borderRadius: 8,
    marginBottom: 12,
  },
  deleteButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: '600',
    marginLeft: 8,
  },
  cancelButton: {
    alignItems: 'center',
    padding: 16,
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '500',
  },
});