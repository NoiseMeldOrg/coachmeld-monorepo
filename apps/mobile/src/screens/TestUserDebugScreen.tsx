import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Platform,
} from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { checkProfilesTableSchema, debugTestUserEnrollment } from '../utils/debugTestUser';
import { isTestEmail } from '../config/testUsers';

export default function TestUserDebugScreen() {
  const { theme } = useTheme();
  const { user } = useAuth();
  const [debugInfo, setDebugInfo] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  const addDebugLine = (line: string) => {
    setDebugInfo(prev => [...prev, `${new Date().toLocaleTimeString()}: ${line}`]);
  };

  const checkEmailDomain = () => {
    if (!user?.email) {
      addDebugLine('No user email found');
      return;
    }
    
    const testStatus = isTestEmail(user.email);
    addDebugLine(`Email: ${user.email}`);
    addDebugLine(`Is test email: ${testStatus.isTest}`);
    addDebugLine(`Test type: ${testStatus.type || 'N/A'}`);
  };

  const checkProfileSchema = async () => {
    setLoading(true);
    addDebugLine('Checking profile schema...');
    
    try {
      // Check if columns exist
      const columnsToCheck = [
        'is_test_user',
        'test_subscriptions',
        'test_user_type',
        'test_expires_at',
        'test_user_metadata'
      ];
      
      for (const column of columnsToCheck) {
        try {
          const { data, error } = await supabase
            .from('profiles')
            .select(`id, ${column}`)
            .eq('id', user?.id || '')
            .single();
            
          if (error) {
            addDebugLine(`❌ Column '${column}' error: ${error.message}`);
          } else {
            addDebugLine(`✅ Column '${column}' exists`);
            if (data && data[column as keyof typeof data] !== undefined) {
              addDebugLine(`   Value: ${JSON.stringify(data[column as keyof typeof data])}`);
            }
          }
        } catch (e) {
          addDebugLine(`❌ Column '${column}' check failed: ${e}`);
        }
      }
    } catch (error) {
      addDebugLine(`Error checking schema: ${error}`);
    } finally {
      setLoading(false);
    }
  };

  const checkCurrentProfile = async () => {
    setLoading(true);
    addDebugLine('Fetching current profile...');
    
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user?.id || '')
        .single();
        
      if (error) {
        addDebugLine(`Error fetching profile: ${error.message}`);
      } else {
        addDebugLine('Profile data:');
        addDebugLine(`- ID: ${data.id}`);
        addDebugLine(`- Email: ${data.email}`);
        addDebugLine(`- Is test user: ${data.is_test_user}`);
        addDebugLine(`- Test type: ${data.test_user_type}`);
        addDebugLine(`- Test expires: ${data.test_expires_at || 'Never'}`);
        addDebugLine(`- Test subscriptions: ${JSON.stringify(data.test_subscriptions)}`);
        addDebugLine(`- Test metadata: ${JSON.stringify(data.test_user_metadata)}`);
      }
    } catch (error) {
      addDebugLine(`Unexpected error: ${error}`);
    } finally {
      setLoading(false);
    }
  };

  const runFullDebug = async () => {
    if (!user) {
      Alert.alert('Error', 'No user logged in');
      return;
    }
    
    setLoading(true);
    setDebugInfo([]);
    addDebugLine('Starting full debug...');
    
    try {
      await debugTestUserEnrollment(user.email || '', user.id);
      addDebugLine('Debug complete - check console logs');
    } catch (error) {
      addDebugLine(`Debug error: ${error}`);
    } finally {
      setLoading(false);
    }
  };

  const clearDebugInfo = () => {
    setDebugInfo([]);
  };

  return (
    <ScrollView style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={styles.content}>
        <Text style={[styles.title, { color: theme.text }]}>
          Test User Debug Panel
        </Text>
        
        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={[styles.button, { backgroundColor: theme.primary }]}
            onPress={checkEmailDomain}
            disabled={loading}
          >
            <Text style={styles.buttonText}>Check Email Domain</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.button, { backgroundColor: theme.primary }]}
            onPress={checkProfileSchema}
            disabled={loading}
          >
            <Text style={styles.buttonText}>Check Schema</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.button, { backgroundColor: theme.primary }]}
            onPress={checkCurrentProfile}
            disabled={loading}
          >
            <Text style={styles.buttonText}>Check Profile</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.button, { backgroundColor: theme.primary }]}
            onPress={runFullDebug}
            disabled={loading}
          >
            <Text style={styles.buttonText}>Run Full Debug</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.button, { backgroundColor: theme.error }]}
            onPress={clearDebugInfo}
          >
            <Text style={styles.buttonText}>Clear</Text>
          </TouchableOpacity>
        </View>
        
        <View style={[styles.debugOutput, { backgroundColor: theme.surface }]}>
          <Text style={[styles.debugTitle, { color: theme.text }]}>Debug Output:</Text>
          {debugInfo.map((line, index) => (
            <Text key={index} style={[styles.debugLine, { color: theme.textSecondary }]}>
              {line}
            </Text>
          ))}
          {debugInfo.length === 0 && (
            <Text style={[styles.debugLine, { color: theme.textSecondary }]}>
              No debug info yet. Click a button above to start.
            </Text>
          )}
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  buttonContainer: {
    marginBottom: 20,
  },
  button: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    marginBottom: 10,
    alignItems: 'center',
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  debugOutput: {
    padding: 15,
    borderRadius: 8,
    minHeight: 300,
  },
  debugTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 10,
  },
  debugLine: {
    fontSize: 14,
    marginBottom: 5,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
});