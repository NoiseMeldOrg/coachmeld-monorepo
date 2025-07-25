import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Linking,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { useNavigation } from '@react-navigation/native';
import { gdprService } from '../services/gdprService';

export function DataExportScreen() {
  const { theme } = useTheme();
  const navigation = useNavigation();
  const [loading, setLoading] = useState(false);
  const [exportRequestId, setExportRequestId] = useState<string | null>(null);
  const [exportStatus, setExportStatus] = useState<string | null>(null);
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);

  const requestDataExport = async () => {
    Alert.alert(
      'Request Data Export',
      'This will prepare a downloadable file containing all your personal data. The process may take a few minutes.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Request Export',
          onPress: async () => {
            setLoading(true);
            try {
              const { requestId } = await gdprService.requestDataExport();
              setExportRequestId(requestId);
              setExportStatus('pending');
              
              Alert.alert(
                'Export Requested',
                'Your data export has been requested. You will receive an email when it\'s ready to download.',
                [{ text: 'OK' }]
              );
              
              // Start checking status
              checkExportStatus(requestId);
            } catch (error) {
              console.error('Error requesting data export:', error);
              Alert.alert(
                'Error',
                'Failed to request data export. Please try again later.',
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

  const checkExportStatus = async (requestId: string) => {
    try {
      const status = await gdprService.getExportStatus(requestId);
      setExportStatus(status.status);
      
      if (status.downloadUrl) {
        setDownloadUrl(status.downloadUrl);
      }
      
      // Continue checking if still processing
      if (status.status === 'pending' || status.status === 'processing') {
        setTimeout(() => checkExportStatus(requestId), 5000); // Check every 5 seconds
      }
    } catch (error) {
      console.error('Error checking export status:', error);
    }
  };

  const downloadExport = () => {
    if (downloadUrl) {
      Linking.openURL(downloadUrl);
    }
  };

  const renderExportInfo = () => (
    <View style={styles.infoSection}>
      <Text style={[styles.infoTitle, { color: theme.text }]}>
        What's Included in Your Data Export
      </Text>
      
      <View style={styles.infoItem}>
        <Ionicons name="person-outline" size={20} color={theme.primary} />
        <View style={styles.infoTextContainer}>
          <Text style={[styles.infoItemTitle, { color: theme.text }]}>
            Profile Information
          </Text>
          <Text style={[styles.infoItemDescription, { color: theme.textSecondary }]}>
            Name, email, health metrics, goals, and preferences
          </Text>
        </View>
      </View>

      <View style={styles.infoItem}>
        <Ionicons name="chatbubbles-outline" size={20} color={theme.primary} />
        <View style={styles.infoTextContainer}>
          <Text style={[styles.infoItemTitle, { color: theme.text }]}>
            Chat History
          </Text>
          <Text style={[styles.infoItemDescription, { color: theme.textSecondary }]}>
            All conversations with your AI coaches
          </Text>
        </View>
      </View>

      <View style={styles.infoItem}>
        <Ionicons name="restaurant-outline" size={20} color={theme.primary} />
        <View style={styles.infoTextContainer}>
          <Text style={[styles.infoItemTitle, { color: theme.text }]}>
            Meal Plans & Recipes
          </Text>
          <Text style={[styles.infoItemDescription, { color: theme.textSecondary }]}>
            Your saved recipes and generated meal plans
          </Text>
        </View>
      </View>

      <View style={styles.infoItem}>
        <Ionicons name="settings-outline" size={20} color={theme.primary} />
        <View style={styles.infoTextContainer}>
          <Text style={[styles.infoItemTitle, { color: theme.text }]}>
            Settings & Preferences
          </Text>
          <Text style={[styles.infoItemDescription, { color: theme.textSecondary }]}>
            App settings, privacy preferences, and consent records
          </Text>
        </View>
      </View>
    </View>
  );

  const renderExportStatus = () => {
    if (!exportRequestId) return null;

    return (
      <View style={[styles.statusSection, { backgroundColor: theme.card }]}>
        <Text style={[styles.statusTitle, { color: theme.text }]}>
          Export Status
        </Text>
        
        <View style={styles.statusContent}>
          {exportStatus === 'pending' && (
            <>
              <ActivityIndicator size="small" color={theme.primary} />
              <Text style={[styles.statusText, { color: theme.textSecondary }]}>
                Preparing your data export...
              </Text>
            </>
          )}
          
          {exportStatus === 'processing' && (
            <>
              <ActivityIndicator size="small" color={theme.primary} />
              <Text style={[styles.statusText, { color: theme.textSecondary }]}>
                Processing your data...
              </Text>
            </>
          )}
          
          {exportStatus === 'completed' && downloadUrl && (
            <>
              <Ionicons name="checkmark-circle" size={24} color={theme.success || '#4CAF50'} />
              <Text style={[styles.statusText, { color: theme.text }]}>
                Your data export is ready!
              </Text>
              <TouchableOpacity
                style={[styles.downloadButton, { backgroundColor: theme.primary }]}
                onPress={downloadExport}
              >
                <Ionicons name="download" size={20} color="white" />
                <Text style={styles.downloadButtonText}>Download Export</Text>
              </TouchableOpacity>
            </>
          )}
          
          {exportStatus === 'failed' && (
            <>
              <Ionicons name="alert-circle" size={24} color={theme.error || '#ff3333'} />
              <Text style={[styles.statusText, { color: theme.error || '#ff3333' }]}>
                Export failed. Please try again.
              </Text>
            </>
          )}
        </View>
      </View>
    );
  };

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: theme.background }]}
      contentContainerStyle={styles.content}
    >
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}
        >
          <Ionicons name="arrow-back" size={24} color={theme.text} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: theme.text }]}>Export My Data</Text>
      </View>

      <Text style={[styles.description, { color: theme.textSecondary }]}>
        Download a copy of all your personal data stored in CoachMeld. This includes your profile, chat history, meal plans, and settings.
      </Text>

      {renderExportInfo()}
      {renderExportStatus()}

      <View style={styles.exportSection}>
        <Text style={[styles.exportNote, { color: theme.textSecondary }]}>
          Your data will be exported in JSON format, which is machine-readable and can be imported into other applications.
        </Text>

        <TouchableOpacity
          style={[
            styles.exportButton,
            { 
              backgroundColor: theme.primary,
              opacity: loading ? 0.6 : 1,
            }
          ]}
          onPress={requestDataExport}
          disabled={loading || !!exportRequestId}
        >
          {loading ? (
            <ActivityIndicator color="white" />
          ) : (
            <>
              <Ionicons name="download-outline" size={24} color="white" />
              <Text style={styles.exportButtonText}>
                {exportRequestId ? 'Export Requested' : 'Request Data Export'}
              </Text>
            </>
          )}
        </TouchableOpacity>
      </View>

      <View style={styles.privacyNote}>
        <Ionicons name="information-circle-outline" size={20} color={theme.info || '#2196F3'} />
        <Text style={[styles.privacyNoteText, { color: theme.textSecondary }]}>
          Your data export request is processed securely. The download link will expire after 24 hours for your protection.
        </Text>
      </View>
    </ScrollView>
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
    marginBottom: 24,
  },
  infoSection: {
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  infoTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  infoTextContainer: {
    flex: 1,
    marginLeft: 12,
  },
  infoItemTitle: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 4,
  },
  infoItemDescription: {
    fontSize: 14,
    lineHeight: 20,
  },
  statusSection: {
    marginHorizontal: 20,
    marginBottom: 24,
    padding: 16,
    borderRadius: 12,
  },
  statusTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  statusContent: {
    alignItems: 'center',
  },
  statusText: {
    fontSize: 14,
    marginTop: 8,
    textAlign: 'center',
  },
  downloadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
    marginTop: 12,
  },
  downloadButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  exportSection: {
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  exportNote: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 16,
  },
  exportButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 8,
  },
  exportButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: '600',
    marginLeft: 8,
  },
  privacyNote: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: 'rgba(33, 150, 243, 0.1)',
  },
  privacyNoteText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
    marginLeft: 12,
  },
});