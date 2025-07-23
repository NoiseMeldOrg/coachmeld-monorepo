import { supabase } from '../lib/supabase';
import { checkAndEnrollTestUser } from './testUserUtils';
import { isTestEmail } from '../config/testUsers';

/**
 * Debug helper to test the test user enrollment process
 */
export async function debugTestUserEnrollment(email: string, userId: string) {
  console.log('\n=== TEST USER ENROLLMENT DEBUG ===');
  console.log('Email:', email);
  console.log('User ID:', userId);
  
  // Step 1: Check if email is a test domain
  const testStatus = isTestEmail(email);
  console.log('Test Email Check:', testStatus);
  
  if (!testStatus.isTest) {
    console.log('Email is not from a test domain');
    return;
  }
  
  // Step 2: Check current profile state
  try {
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();
      
    if (profileError) {
      console.error('Error fetching profile:', profileError);
    } else {
      console.log('Current profile:', {
        id: profile.id,
        email: profile.email,
        is_test_user: profile.is_test_user,
        test_user_type: profile.test_user_type,
        test_expires_at: profile.test_expires_at,
      });
    }
  } catch (error) {
    console.error('Unexpected error fetching profile:', error);
  }
  
  // Step 3: Try to enroll as test user
  console.log('Attempting to enroll as test user...');
  try {
    const result = await checkAndEnrollTestUser(email, userId);
    console.log('Enrollment result:', result);
  } catch (error) {
    console.error('Error during enrollment:', error);
  }
  
  // Step 4: Check profile after enrollment
  try {
    const { data: updatedProfile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();
      
    if (profileError) {
      console.error('Error fetching updated profile:', profileError);
    } else {
      console.log('Updated profile:', {
        id: updatedProfile.id,
        email: updatedProfile.email,
        is_test_user: updatedProfile.is_test_user,
        test_user_type: updatedProfile.test_user_type,
        test_expires_at: updatedProfile.test_expires_at,
        test_user_metadata: updatedProfile.test_user_metadata,
      });
    }
  } catch (error) {
    console.error('Unexpected error fetching updated profile:', error);
  }
  
  console.log('=== END DEBUG ===\n');
}

/**
 * Check if all required columns exist in the profiles table
 */
export async function checkProfilesTableSchema() {
  console.log('\n=== CHECKING PROFILES TABLE SCHEMA ===');
  
  try {
    // Try to select all test user related columns
    const { data, error } = await supabase
      .from('profiles')
      .select('id, is_test_user, test_subscriptions, test_user_type, test_expires_at, test_user_metadata')
      .limit(1);
      
    if (error) {
      console.error('Error checking schema:', error);
      
      // Check which specific column is missing
      const columnsToCheck = [
        'is_test_user',
        'test_subscriptions',
        'test_user_type',
        'test_expires_at',
        'test_user_metadata'
      ];
      
      for (const column of columnsToCheck) {
        try {
          const { error: colError } = await supabase
            .from('profiles')
            .select(`id, ${column}`)
            .limit(1);
            
          if (colError) {
            console.error(`Column '${column}' is missing or inaccessible:`, colError.message);
          } else {
            console.log(`Column '${column}' exists ✓`);
          }
        } catch (e) {
          console.error(`Error checking column '${column}':`, e);
        }
      }
    } else {
      console.log('All test user columns exist in profiles table ✓');
      if (data && data.length > 0) {
        console.log('Sample row:', data[0]);
      }
    }
  } catch (error) {
    console.error('Unexpected error checking schema:', error);
  }
  
  console.log('=== END SCHEMA CHECK ===\n');
}