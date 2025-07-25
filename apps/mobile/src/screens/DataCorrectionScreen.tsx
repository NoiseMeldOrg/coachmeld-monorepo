import React, { useState, useEffect } from 'react';
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
import { gdprService } from '../services/gdprService';

interface CorrectionField {
  field: string;
  label: string;
  currentValue: string;
  newValue: string;
  type: 'text' | 'email' | 'number';
}

export function DataCorrectionScreen() {
  const { theme } = useTheme();
  const navigation = useNavigation();
  const [loading, setLoading] = useState(false);
  const [corrections, setCorrections] = useState<CorrectionField[]>([
    { field: 'full_name', label: 'Full Name', currentValue: '', newValue: '', type: 'text' },
    { field: 'email', label: 'Email', currentValue: '', newValue: '', type: 'email' },
    { field: 'height_cm', label: 'Height (cm)', currentValue: '', newValue: '', type: 'number' },
    { field: 'weight_kg', label: 'Weight (kg)', currentValue: '', newValue: '', type: 'number' },
    { field: 'goal_weight_kg', label: 'Goal Weight (kg)', currentValue: '', newValue: '', type: 'number' },
  ]);

  const updateCorrectionValue = (index: number, newValue: string) => {
    const updated = [...corrections];
    updated[index].newValue = newValue;
    setCorrections(updated);
  };

  const hasChanges = corrections.some(c => c.newValue.trim() !== '');

  const submitCorrections = async () => {
    if (!hasChanges) {
      Alert.alert('No Changes', 'Please make at least one correction before submitting.');
      return;
    }

    const correctionData: Record<string, any> = {};
    corrections.forEach(c => {
      if (c.newValue.trim() !== '') {
        correctionData[c.field] = c.type === 'number' 
          ? parseFloat(c.newValue) || 0 
          : c.newValue.trim();
      }
    });

    Alert.alert(
      'Submit Corrections',
      'Your correction request will be reviewed and processed within 30 days as required by GDPR.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Submit',
          onPress: async () => {
            setLoading(true);
            try {
              const { requestId } = await gdprService.requestDataCorrection(correctionData);
              
              Alert.alert(
                'Corrections Submitted',
                `Your data correction request has been submitted successfully.\n\nRequest ID: ${requestId}\n\nYou will receive an email confirmation and updates on the progress.`,
                [
                  {
                    text: 'OK',
                    onPress: () => navigation.goBack(),
                  },
                ]
              );
            } catch (error) {
              console.error('Error submitting corrections:', error);
              Alert.alert(
                'Error',
                'Failed to submit corrections. Please try again later.',
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
          <Text style={[styles.title, { color: theme.text }]}>Correct My Data</Text>
        </View>

        <Text style={[styles.description, { color: theme.textSecondary }]}>
          Request corrections to your personal information. Under GDPR Article 16, you have the right to have inaccurate personal data corrected.
        </Text>

        <View style={styles.instructionsSection}>
          <Ionicons name="information-circle-outline" size={20} color={theme.info || '#2196F3'} />
          <Text style={[styles.instructionsText, { color: theme.textSecondary }]}>
            Only fill in the fields you want to correct. Leave other fields empty.
          </Text>
        </View>

        <View style={styles.formSection}>
          {corrections.map((correction, index) => (
            <View key={correction.field} style={styles.fieldContainer}>
              <Text style={[styles.fieldLabel, { color: theme.text }]}>
                {correction.label}
              </Text>
              {correction.currentValue && (
                <Text style={[styles.currentValue, { color: theme.textSecondary }]}>
                  Current: {correction.currentValue}
                </Text>
              )}
              <TextInput
                style={[
                  styles.fieldInput,
                  {
                    backgroundColor: theme.inputBackground,
                    color: theme.text,
                    borderColor: correction.newValue.trim() !== '' ? theme.primary : theme.border,
                  },
                ]}
                placeholder={`Enter new ${correction.label.toLowerCase()}`}
                placeholderTextColor={theme.textSecondary}
                value={correction.newValue}
                onChangeText={(text) => updateCorrectionValue(index, text)}
                keyboardType={correction.type === 'email' ? 'email-address' : 
                             correction.type === 'number' ? 'numeric' : 'default'}
                autoCapitalize={correction.type === 'email' ? 'none' : 'words'}
              />
            </View>
          ))}
        </View>

        <View style={styles.gdprInfo}>
          <Ionicons name="shield-checkmark" size={20} color={theme.primary} />
          <Text style={[styles.gdprText, { color: theme.textSecondary }]}>
            Your correction request will be processed within 30 days as required by GDPR Article 16. You will receive email updates on the progress.
          </Text>
        </View>

        <TouchableOpacity
          style={[
            styles.submitButton,
            {
              backgroundColor: hasChanges ? theme.primary : theme.border,
              opacity: loading || !hasChanges ? 0.6 : 1,
            },
          ]}
          onPress={submitCorrections}
          disabled={loading || !hasChanges}
        >
          {loading ? (
            <ActivityIndicator color="white" />
          ) : (
            <>
              <Ionicons name="checkmark" size={24} color="white" />
              <Text style={styles.submitButtonText}>Submit Corrections</Text>
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
  description: {
    fontSize: 16,
    lineHeight: 22,
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  instructionsSection: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingHorizontal: 20,
    marginBottom: 24,
    padding: 16,
    backgroundColor: 'rgba(33, 150, 243, 0.1)',
  },
  instructionsText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
    marginLeft: 12,
  },
  formSection: {
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  fieldContainer: {
    marginBottom: 20,
  },
  fieldLabel: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 4,
  },
  currentValue: {
    fontSize: 14,
    marginBottom: 8,
  },
  fieldInput: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
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
  submitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 20,
    paddingVertical: 16,
    borderRadius: 8,
    marginBottom: 12,
  },
  submitButtonText: {
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