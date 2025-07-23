import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { supabase } from '../lib/supabase';

export const AuthDebug: React.FC = () => {
  const { user, session } = useAuth();
  const { theme } = useTheme();

  const checkSession = async () => {
    const { data: { session: currentSession }, error } = await supabase.auth.getSession();
    console.log('Current session check:', {
      hasSession: !!currentSession,
      sessionUser: currentSession?.user?.email,
      sessionExpiry: currentSession?.expires_at,
      error: error?.message
    });
    
    if (currentSession) {
      const expiryDate = new Date(currentSession.expires_at! * 1000);
      const now = new Date();
      const isExpired = expiryDate < now;
      console.log('Session expiry:', {
        expiresAt: expiryDate.toLocaleString(),
        now: now.toLocaleString(),
        isExpired
      });
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.surface }]}>
      <Text style={[styles.title, { color: theme.text }]}>Auth Status Debug</Text>
      
      <View style={styles.info}>
        <Text style={[styles.label, { color: theme.textSecondary }]}>Logged In:</Text>
        <Text style={[styles.value, { color: user ? theme.success : theme.error }]}>
          {user ? 'YES' : 'NO'}
        </Text>
      </View>

      {user && (
        <>
          <View style={styles.info}>
            <Text style={[styles.label, { color: theme.textSecondary }]}>User ID:</Text>
            <Text style={[styles.value, { color: theme.text }]} numberOfLines={1}>
              {user.id.substring(0, 8)}...
            </Text>
          </View>

          <View style={styles.info}>
            <Text style={[styles.label, { color: theme.textSecondary }]}>Email:</Text>
            <Text style={[styles.value, { color: theme.text }]}>
              {user.email || 'No email'}
            </Text>
          </View>

          <View style={styles.info}>
            <Text style={[styles.label, { color: theme.textSecondary }]}>Session:</Text>
            <Text style={[styles.value, { color: session ? theme.success : theme.error }]}>
              {session ? 'ACTIVE' : 'NONE'}
            </Text>
          </View>
        </>
      )}

      <TouchableOpacity 
        style={[styles.button, { backgroundColor: theme.primary }]}
        onPress={checkSession}
      >
        <Text style={styles.buttonText}>Check Session Details</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 16,
    margin: 16,
    borderRadius: 8,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  info: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
  },
  value: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  button: {
    marginTop: 12,
    padding: 12,
    borderRadius: 6,
    alignItems: 'center',
  },
  buttonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
});